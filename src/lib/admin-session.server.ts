import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

export type AdminSession = { role?: "admin" };

export function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "boutique-admin",
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

export function matches(input: string, expected: string) {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export function hashSecret(value: string) {
  const pepper = process.env["SESSION_SECRET"] ?? "boutique";
  return createHash("sha256").update(`${pepper}:${value}`, "utf8").digest("hex");
}

export async function isAdmin() {
  if (!process.env["SESSION_SECRET"]) return false;
  try {
    const session = await useSession<AdminSession>(sessionConfig());
    return session.data.role === "admin";
  } catch {
    return false;
  }
}

type AdminAuthRow = {
  password_hash: string | null;
  recovery_hash: string | null;
  failed_count?: number | null;
  locked_until?: string | null;
};

export async function readAdminAuth(): Promise<AdminAuthRow | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("admin_auth")
      .select("password_hash, recovery_hash, failed_count, locked_until")
      .eq("id", "main")
      .maybeSingle();
    return (data as AdminAuthRow | null) ?? null;
  } catch {
    return null;
  }
}

const MAX_ATTEMPTS = 6;
const LOCK_MINUTES = 15;

/** Retourne le nombre de minutes de blocage restantes, 0 si le compte est libre. */
export function lockRemaining(row: AdminAuthRow | null) {
  if (!row?.locked_until) return 0;
  const ms = new Date(row.locked_until).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 60000) : 0;
}

export async function recordLoginFailure(row: AdminAuthRow | null) {
  const failed = (row?.failed_count ?? 0) + 1;
  const locked =
    failed >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("admin_auth")
      .upsert({
        id: "main",
        password_hash: row?.password_hash ?? null,
        recovery_hash: row?.recovery_hash ?? null,
        failed_count: locked ? 0 : failed,
        locked_until: locked,
        updated_at: new Date().toISOString(),
      } as never);
  } catch {
    /* la connexion reste refusée même si le compteur échoue */
  }
  return locked ? LOCK_MINUTES : 0;
}

export async function clearLoginFailures(row: AdminAuthRow | null) {
  if (!row || ((row.failed_count ?? 0) === 0 && !row.locked_until)) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("admin_auth")
      .upsert({
        id: "main",
        password_hash: row.password_hash ?? null,
        recovery_hash: row.recovery_hash ?? null,
        failed_count: 0,
        locked_until: null,
        updated_at: new Date().toISOString(),
      } as never);
  } catch {
    /* sans importance */
  }
}

export async function writeAdminAuth(patch: Partial<AdminAuthRow>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const current = (await readAdminAuth()) ?? { password_hash: null, recovery_hash: null };
  const { error } = await supabaseAdmin.from("admin_auth").upsert({
    id: "main",
    password_hash: patch.password_hash ?? current.password_hash,
    recovery_hash: patch.recovery_hash ?? current.recovery_hash,
    updated_at: new Date().toISOString(),
  } as never);
  if (error) throw new Error(error.message);
}
