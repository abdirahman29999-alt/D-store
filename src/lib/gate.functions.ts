import { createServerFn } from "@tanstack/react-start";

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { user: string; password: string }) => ({
    user: String(data.user ?? "").slice(0, 100),
    password: String(data.password ?? "").slice(0, 200),
  }))
  .handler(async ({ data }) => {
    const { useSession } = await import("@tanstack/react-start/server");
    const {
      sessionConfig,
      matches,
      hashSecret,
      readAdminAuth,
      lockRemaining,
      recordLoginFailure,
      clearLoginFailures,
    } = await import("./admin-session.server");
    const expectedUser = process.env["ADMIN_USERNAME"] ?? "admin";
    const envPassword = process.env["ADMIN_PASSWORD"];
    const stored = await readAdminAuth();
    const waiting = lockRemaining(stored);
    if (waiting > 0) {
      return {
        ok: false as const,
        message: `Trop de tentatives. Réessayez dans ${waiting} minute(s).`,
      };
    }
    const userOk = matches(
      data.user.trim().toLowerCase(),
      expectedUser.trim().toLowerCase(),
    );
    let passOk = false;
    if (stored?.password_hash) {
      passOk = matches(hashSecret(data.password), stored.password_hash);
    } else if (envPassword) {
      passOk = matches(data.password, envPassword);
    } else {
      return { ok: false as const, message: "Configuration du mot de passe manquante." };
    }
    const { logAudit } = await import("./audit.server");
    if (!userOk || !passOk) {
      const locked = await recordLoginFailure(stored);
      await logAudit({
        action: "Connexion refusée",
        actor: data.user.slice(0, 60) || "inconnu",
        details: locked ? `Compte bloqué ${locked} minutes` : "Identifiants incorrects",
        success: false,
      });
      return {
        ok: false as const,
        message: locked
          ? `Trop de tentatives. Compte bloqué ${locked} minutes.`
          : "Identifiants incorrects.",
      };
    }
    await clearLoginFailures(stored);
    const session = await useSession<{ role?: "admin" }>(sessionConfig());
    await session.update({ role: "admin" });
    await logAudit({ action: "Connexion réussie", actor: data.user.slice(0, 60) });
    return { ok: true as const, message: "Connecté." };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { useSession } = await import("@tanstack/react-start/server");
  const { sessionConfig } = await import("./admin-session.server");
  const session = await useSession<{ role?: "admin" }>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

export const adminStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { isAdmin, readAdminAuth } = await import("./admin-session.server");
  const admin = await isAdmin();
  const stored = admin ? await readAdminAuth() : null;
  return {
    role: admin ? ("admin" as const) : ("visiteur" as const),
    hasRecovery: Boolean(stored?.recovery_hash),
  };
});

/** L'administrateur connecté change son mot de passe. */
export const changeAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((data: { current: string; next: string }) => ({
    current: String(data.current ?? "").slice(0, 200),
    next: String(data.next ?? "").slice(0, 200),
  }))
  .handler(async ({ data }) => {
    const { isAdmin, matches, hashSecret, readAdminAuth, writeAdminAuth } = await import(
      "./admin-session.server"
    );
    if (!(await isAdmin())) return { ok: false as const, message: "Non autorisé." };
    if (data.next.length < 6) {
      return { ok: false as const, message: "Le nouveau mot de passe doit faire 6 caractères minimum." };
    }
    const stored = await readAdminAuth();
    const envPassword = process.env["ADMIN_PASSWORD"];
    const currentOk = stored?.password_hash
      ? matches(hashSecret(data.current), stored.password_hash)
      : Boolean(envPassword) && matches(data.current, envPassword!);
    if (!currentOk) return { ok: false as const, message: "Mot de passe actuel incorrect." };
    await writeAdminAuth({ password_hash: hashSecret(data.next) });
    const { logAudit } = await import("./audit.server");
    await logAudit({ action: "Mot de passe modifié" });
    return { ok: true as const, message: "Mot de passe modifié." };
  });

/** L'administrateur connecté définit/modifie son code de récupération. */
export const setRecoveryCode = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string }) => ({ code: String(data.code ?? "").slice(0, 200) }))
  .handler(async ({ data }) => {
    const { isAdmin, hashSecret, writeAdminAuth } = await import("./admin-session.server");
    if (!(await isAdmin())) return { ok: false as const, message: "Non autorisé." };
    if (data.code.trim().length < 6) {
      return { ok: false as const, message: "Le code doit faire 6 caractères minimum." };
    }
    await writeAdminAuth({ recovery_hash: hashSecret(data.code.trim()) });
    return { ok: true as const, message: "Code de récupération enregistré." };
  });

/** Mot de passe oublié : réinitialisation avec le code de récupération. */
export const resetAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; next: string }) => ({
    code: String(data.code ?? "").slice(0, 200),
    next: String(data.next ?? "").slice(0, 200),
  }))
  .handler(async ({ data }) => {
    const {
      matches,
      hashSecret,
      readAdminAuth,
      writeAdminAuth,
      lockRemaining,
      recordLoginFailure,
    } = await import("./admin-session.server");
    const stored = await readAdminAuth();
    const waiting = lockRemaining(stored);
    if (waiting > 0) {
      return {
        ok: false as const,
        message: `Trop de tentatives. Réessayez dans ${waiting} minute(s).`,
      };
    }
    if (!stored?.recovery_hash) {
      return {
        ok: false as const,
        message: "Aucun code de récupération n'a encore été défini dans l'espace admin.",
      };
    }
    if (data.next.length < 6) {
      return { ok: false as const, message: "Le nouveau mot de passe doit faire 6 caractères minimum." };
    }
    if (!matches(hashSecret(data.code.trim()), stored.recovery_hash)) {
      const locked = await recordLoginFailure(stored);
      return {
        ok: false as const,
        message: locked
          ? `Trop de tentatives. Réessayez dans ${locked} minutes.`
          : "Code de récupération incorrect.",
      };
    }
    await writeAdminAuth({ password_hash: hashSecret(data.next) });
    const { logAudit } = await import("./audit.server");
    await logAudit({ action: "Mot de passe réinitialisé", details: "Via code de récupération" });
    return { ok: true as const, message: "Mot de passe réinitialisé, connectez-vous." };
  });
