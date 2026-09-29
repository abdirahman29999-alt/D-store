import { createFileRoute } from "@tanstack/react-router";
import { promises as fs } from "fs";
import path from "path";
import { createHmac, timingSafeEqual } from "crypto";

const OWNER = "abdirahman29999-alt";
const REPO = "D-store";
const BRANCH = "main";

const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".output",
  ".lovable",
  ".wrangler",
  ".tanstack",
]);
const EXCLUDE_FILES = new Set([".env", ".env.local", ".env.production", ".git"]);

async function gh(apiKey: string, connKey: string, method: string, p: string, body?: unknown) {
  const res = await fetch(`https://connector-gateway.lovable.dev/github${p}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${apiKey}`,
      "X-Connection-Api-Key": connKey,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GitHub ${method} ${p} -> ${res.status}: ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : {};
}

async function collectFiles(dir: string, base: string, out: string[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (EXCLUDE_DIRS.has(e.name)) continue;
      await collectFiles(full, rel, out);
    } else if (e.isFile()) {
      if (EXCLUDE_FILES.has(e.name)) continue;
      out.push(rel);
    }
  }
}

export const Route = createFileRoute("/api/public/push-github")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Verify caller with a shared secret
        const secret = process.env["GITHUB_PUSH_SECRET"];
        const token = request.headers.get("x-push-token") ?? "";
        if (!secret) return new Response("Not configured", { status: 500 });
        const a = createHmac("sha256", secret).update(token).digest();
        const b = createHmac("sha256", secret).update(secret).digest();
        if (!timingSafeEqual(a, b)) return new Response("Invalid token", { status: 401 });

        const apiKey = process.env["LOVABLE_API_KEY"];
        const connKey = process.env["GITHUB_API_KEY"];
        if (!apiKey || !connKey) {
          return new Response("Clés GitHub non configurées", { status: 500 });
        }

        try {
          const root = process.cwd();
          const files: string[] = [];
          await collectFiles(root, "", files);

          let parentSha: string | null = null;
          try {
            const ref = await gh(apiKey, connKey, "GET", `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
            parentSha = ref.object?.sha ?? null;
          } catch {
            parentSha = null;
          }

          // Empty repo: seed it with a first file so the git data API works
          if (!parentSha) {
            await gh(apiKey, connKey, "PUT", `/repos/${OWNER}/${REPO}/contents/README.md`, {
              message: "Initialisation du dépôt D-Store",
              content: Buffer.from("# D-Store\n\nBoutique en ligne D-Store.\n").toString("base64"),
              branch: BRANCH,
            });
            const ref = await gh(apiKey, connKey, "GET", `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
            parentSha = ref.object?.sha ?? null;
          }

          const tree: { path: string; mode: string; type: string; sha: string }[] = [];
          for (const rel of files) {
            const content = await fs.readFile(path.join(root, rel));
            const blob = await gh(apiKey, connKey, "POST", `/repos/${OWNER}/${REPO}/git/blobs`, {
              content: content.toString("base64"),
              encoding: "base64",
            });
            tree.push({ path: rel, mode: "100644", type: "blob", sha: blob.sha });
          }

          const treeRes = await gh(apiKey, connKey, "POST", `/repos/${OWNER}/${REPO}/git/trees`, { tree });
          const commit = await gh(apiKey, connKey, "POST", `/repos/${OWNER}/${REPO}/git/commits`, {
            message: "Code complet D-Store (envoyé depuis Lovable)",
            tree: treeRes.sha,
            parents: parentSha ? [parentSha] : [],
          });

          if (parentSha) {
            await gh(apiKey, connKey, "PATCH", `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
              sha: commit.sha,
              force: true,
            });
          } else {
            await gh(apiKey, connKey, "POST", `/repos/${OWNER}/${REPO}/git/refs`, {
              ref: `refs/heads/${BRANCH}`,
              sha: commit.sha,
            });
          }

          return Response.json({ ok: true, files: files.length, commit: commit.sha });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("push-github failed:", msg);
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});
