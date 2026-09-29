/** Journal d'audit : enregistre les actions sensibles de l'administration. */
export async function logAudit(entry: {
  action: string;
  details?: string;
  actor?: string;
  success?: boolean;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("audit_log").insert({
      action: entry.action.slice(0, 80),
      details: (entry.details ?? "").slice(0, 600),
      actor: (entry.actor ?? "administrateur").slice(0, 80),
      success: entry.success ?? true,
    });
  } catch {
    /* le journal ne doit jamais bloquer une action */
  }
}
