import { createServerFn } from "@tanstack/react-start";

export type AuditRow = {
  id: string;
  created_at: string;
  actor: string;
  action: string;
  details: string;
  success: boolean;
};

/** Journal d'audit : réservé à l'administrateur connecté. */
export const listAudit = createServerFn({ method: "GET" }).handler(async () => {
  const { isAdmin } = await import("./admin-session.server");
  if (!(await isAdmin())) return { ok: false as const, entries: [] as AuditRow[] };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("audit_log")
    .select("id, created_at, actor, action, details, success")
    .order("created_at", { ascending: false })
    .limit(200);
  return { ok: true as const, entries: (data ?? []) as AuditRow[] };
});

/** Analyse par IA d'une activité ou alerte de sécurité décrite par l'administrateur. */
export const analyzeSecurity = createServerFn({ method: "POST" })
  .inputValidator((input: { description: string }) => ({
    description: String(input.description ?? "").trim().slice(0, 4000),
  }))
  .handler(async ({ data }) => {
    const { isAdmin } = await import("./admin-session.server");
    if (!(await isAdmin())) return { ok: false as const, message: "Non autorisé." };
    if (data.description.length < 10) {
      return { ok: false as const, message: "Décrivez l'activité en quelques phrases." };
    }
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false as const, message: "Service d'analyse indisponible." };

    const { logAudit } = await import("./audit.server");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        reasoning: { effort: "low", summary: "auto" },
        instructions:
          "Tu es un expert en sécurité qui conseille le gérant d'une petite boutique en ligne à Djibouti. Réponds TOUJOURS en français simple, sans jargon technique. Structure ta réponse ainsi : 1) Niveau de risque (Faible / Moyen / Élevé) et pourquoi, en une phrase. 2) Ce qui s'est probablement passé. 3) Actions à faire tout de suite (liste courte). 4) Prévention pour l'avenir (liste courte). Reste concis.",
        input: data.description,
      }),
    });

    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      console.error(`AI gateway error [${res.status}]: ${body}`);
      await logAudit({
        action: "Analyse de sécurité",
        details: `Échec (${res.status})`,
        success: false,
      });
      if (res.status === 429) {
        return { ok: false as const, message: "Trop de demandes. Réessayez dans un instant." };
      }
      if (res.status === 402) {
        return {
          ok: false as const,
          message: "Crédits d'analyse épuisés. Rechargez vos crédits pour continuer.",
        };
      }
      return { ok: false as const, message: "L'analyse n'a pas pu être réalisée." };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";
      for (const line of parts) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload) as { type?: string; delta?: string };
          if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
            text += evt.delta;
          }
        } catch {
          /* fragment ignoré */
        }
      }
    }

    await logAudit({
      action: "Analyse de sécurité",
      details: data.description.slice(0, 200),
    });

    if (!text.trim()) {
      return { ok: false as const, message: "Aucune analyse n'a pu être générée. Réessayez." };
    }
    return { ok: true as const, analysis: text.trim() };
  });
