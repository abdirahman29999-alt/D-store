import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import logoDstore from "@/assets/logo-dstore.png";
import {
  categoryList,
  formatFdj,
  paymentList,
  productRef,
  shop,
  useShop,
  type PaymentOption,
  type Product,
  type Settings,
} from "@/lib/shop";

import {
  adminLogin,
  adminLogout,
  adminStatus,
  changeAdminPassword,
  resetAdminPassword,
  setRecoveryCode,
} from "@/lib/gate.functions";
import { analyzeSecurity, listAudit, type AuditRow } from "@/lib/security.functions";
import { listOrders, deleteOrder } from "@/lib/shop.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Espace administrateur — D-Store" },
      {
        name: "description",
        content:
          "Connexion sécurisée : gérez les produits, les prix en FDJ, la livraison 24h/24, le numéro WhatsApp et les avis clients.",
      },
      { property: "og:title", content: "Espace administrateur — D-Store" },
      {
        property: "og:description",
        content: "Gestion protégée des produits, prix en FDJ, livraison et avis de la boutique.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const [role, setRole] = useState<string | null>(null);
  const status = useServerFn(adminStatus);
  const login = useServerFn(adminLogin);
  const logout = useServerFn(adminLogout);
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  useEffect(() => {
    status()
      .then((r) => setRole(r.role))
      .catch(() => setRole("visiteur"));
  }, [status]);

  if (role === null) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground font-sans">
        <p className="text-xs uppercase tracking-widest font-mono">Vérification…</p>
      </div>
    );
  }

  if (role !== "admin" && forgot) {
    return <ForgotPassword onBack={() => setForgot(false)} />;
  }

  if (role !== "admin") {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans grid place-items-center px-5">
        <form
          className="w-full max-w-sm space-y-4 p-6 rounded-2xl border border-border bg-card"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const res = await login({ data: { user, password } });
              if (res.ok) setRole("admin");
              else setError(res.message ?? "Identifiants incorrects.");
            } catch {
              setError("Connexion impossible pour le moment.");
            } finally {
              setBusy(false);
              setPassword("");
            }
          }}
        >
          <div className="flex flex-col items-center gap-2 -mt-1 mb-1">
            <img
              src={logoDstore}
              alt="Logo D-Store"
              width={72}
              height={72}
              className="size-18 rounded-full shadow-lg"
            />
            <p className="font-display text-xl tracking-widest">D-Store Admin</p>
          </div>
          <div>
            <h1 className="font-display text-3xl tracking-wider text-accent">Administration</h1>
            <p className="text-muted-foreground text-xs mt-1">
              Accès réservé au propriétaire de la boutique.
            </p>
          </div>
          <input
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="Identifiant"
            autoComplete="username"
            maxLength={100}
            className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Mot de passe"
            autoComplete="current-password"
            maxLength={200}
            className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-accent text-accent-foreground py-2.5 rounded-lg font-bold disabled:opacity-60"
          >
            {busy ? "Connexion…" : "Se connecter"}
          </button>
          <button
            type="button"
            onClick={() => setForgot(true)}
            className="block w-full text-center text-xs text-accent underline"
          >
            Mot de passe oublié ?
          </button>
          <Link to="/" className="block text-center text-xs text-muted-foreground underline">
            Retour à la boutique
          </Link>
        </form>
      </div>
    );
  }

  return <AdminPanel onLogout={async () => {
    await logout({});
    setRole("visiteur");
  }} />;
}

const TABS = [
  { key: "apparence", label: "Apparence" },
  { key: "boutique", label: "Boutique" },
  { key: "paiements", label: "Paiements" },
  { key: "categories", label: "Catégories" },
  { key: "produits", label: "Produits" },
  { key: "avis", label: "Avis" },
  { key: "commandes", label: "Commandes" },
  { key: "securite", label: "Sécurité" },
] as const;

const field =
  "w-full rounded-xl border border-border bg-card px-3 py-3 text-base text-foreground placeholder:text-muted-foreground outline-none focus:border-accent focus:bg-card transition-colors";
const labelCls = "block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5";
const cardCls = "space-y-4 p-5 bg-card border border-border rounded-2xl shadow-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const { products, reviews, settings } = useShop();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("apparence");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Accessoires");
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<Settings>(settings);
  const [payments, setPayments] = useState<PaymentOption[]>(paymentList(settings));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm(settings);
    setPayments(paymentList(settings));
  }, [settings]);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function saveAll() {
    shop.saveSettings({
      ...form,
      shopName: form.shopName.trim() || "Ma Boutique",
      whatsapp: form.whatsapp.replace(/\D/g, ""),
      deliveryFee: Number(form.deliveryFee) || 0,
      payments: payments.map((p) => ({ ...p, label: p.label.trim(), number: p.number.trim() })),
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  function readFile(file: File, cb: (dataUrl: string) => void) {
    const reader = new FileReader();
    reader.onload = () => cb(String(reader.result));
    reader.readAsDataURL(file);
  }

  const SaveButton = () => (
    <button
      onClick={saveAll}
      className="w-full bg-accent text-accent-foreground py-3 rounded-xl font-bold active:scale-[0.98] transition-transform"
    >
      {saved ? "Enregistré ✓" : "Enregistrer les modifications"}
    </button>
  );

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-24">
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="mx-auto w-full max-w-4xl px-4 py-3 flex justify-between items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={form.logo || logoDstore}
              alt=""
              width={36}
              height={36}
              className="size-9 rounded-full object-cover border border-accent/40"
            />
            <div className="min-w-0">
              <h1 className="font-display text-xl tracking-wide truncate">Tableau de bord</h1>
              <p className="text-muted-foreground text-[10px] uppercase tracking-widest">
                {products.length} produits · {reviews.length} avis
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              to="/"
              className="px-3 py-1.5 border border-border rounded-lg text-[10px] font-bold"
            >
              BOUTIQUE
            </Link>
            <button
              onClick={onLogout}
              className="px-3 py-1.5 border border-destructive/50 text-destructive rounded-lg text-[10px] font-bold"
            >
              QUITTER
            </button>
          </div>
        </div>
        <div className="mx-auto w-full max-w-4xl flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
                tab === t.key
                  ? "bg-accent text-accent-foreground font-bold"
                  : "border border-border text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {tab === "apparence" && (
        <section className="mx-auto w-full max-w-4xl px-4 py-6 space-y-4">
          <div className={cardCls}>
            <h2 className="font-display text-xl">Identité</h2>
            <div className="flex items-center gap-3">
              {form.logo ? (
                <img
                  src={form.logo}
                  alt="Logo actuel"
                  className="size-16 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="size-16 rounded-full border border-dashed border-border grid place-items-center text-[10px] text-muted-foreground">
                  Aucune
                </div>
              )}
              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) readFile(file, (v) => set("logo", v));
                  }}
                  className="w-full text-xs"
                />
                {form.logo && (
                  <button
                    type="button"
                    onClick={() => set("logo", "")}
                    className="text-[10px] font-bold px-2 py-1 border border-destructive/50 text-destructive rounded"
                  >
                    RETIRER L'IMAGE
                  </button>
                )}
              </div>
            </div>
            <Field label="Nom de la boutique">
              <input
                value={form.shopName}
                onChange={(e) => set("shopName", e.target.value)}
                maxLength={160}
                className={field}
              />
            </Field>
          </div>

          <div className={cardCls}>
            <h2 className="font-display text-xl">Image principale</h2>
            <p className="text-[11px] text-muted-foreground">
              Choisissez la grande photo affichée en haut du site.
            </p>
            {(form.heroImage || "") && (
              <img
                src={form.heroImage}
                alt="Aperçu de l'image principale"
                className="w-full aspect-[4/5] rounded-xl object-cover border border-border"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) readFile(file, (v) => set("heroImage", v));
              }}
              className="w-full text-xs"
            />
            <input
              value={form.heroImage.startsWith("data:") ? "" : form.heroImage}
              onChange={(e) => set("heroImage", e.target.value)}
              placeholder="…ou lien de l'image (https://…)"
              className={field}
            />
            {form.heroImage && (
              <button
                type="button"
                onClick={() => set("heroImage", "")}
                className="text-[10px] font-bold px-2 py-1 border border-destructive/50 text-destructive rounded"
              >
                UTILISER L'IMAGE PAR DÉFAUT
              </button>
            )}
          </div>

          <div className={cardCls}>
            <h2 className="font-display text-xl">Textes de la page d'accueil</h2>
            <Field label="Grand titre (1re ligne)">
              <input
                value={form.heroTitle}
                onChange={(e) => set("heroTitle", e.target.value)}
                maxLength={160}
                className={field}
              />
            </Field>
            <Field label="Grand titre doré (2e ligne)">
              <input
                value={form.heroTitleAccent}
                onChange={(e) => set("heroTitleAccent", e.target.value)}
                maxLength={160}
                className={field}
              />
            </Field>
            <Field label="Texte sous l'image">
              <textarea
                value={form.heroText}
                onChange={(e) => set("heroText", e.target.value)}
                rows={3}
                maxLength={300}
                className={field}
              />
            </Field>
            <Field label="Petit mot à droite">
              <input
                value={form.heroCta}
                onChange={(e) => set("heroCta", e.target.value)}
                maxLength={140}
                className={field}
              />
            </Field>
            <div className="space-y-3">
              <Field label="Bandeau 1 (ex : Ouvert 24h/24)">
                <input
                  value={form.statusOpen}
                  onChange={(e) => set("statusOpen", e.target.value)}
                  maxLength={140}
                  className={field}
                />
              </Field>
              <Field label="Bandeau 2">
                <input
                  value={form.statusDelivery}
                  onChange={(e) => set("statusDelivery", e.target.value)}
                  maxLength={140}
                  className={field}
                />
              </Field>
              <Field label="Bandeau 3">
                <input
                  value={form.statusPayment}
                  onChange={(e) => set("statusPayment", e.target.value)}
                  maxLength={140}
                  className={field}
                />
              </Field>
            </div>
            <Field label="Titre des articles">
              <input
                value={form.productsTitle}
                onChange={(e) => set("productsTitle", e.target.value)}
                maxLength={160}
                className={field}
              />
            </Field>
            <Field label="Titre des avis">
              <input
                value={form.reviewsTitle}
                onChange={(e) => set("reviewsTitle", e.target.value)}
                maxLength={160}
                className={field}
              />
            </Field>
            <Field label="Titre du bas de page">
              <input
                value={form.footerTitle}
                onChange={(e) => set("footerTitle", e.target.value)}
                maxLength={160}
                className={field}
              />
            </Field>
            <SaveButton />
          </div>
        </section>
      )}

      {tab === "boutique" && (
        <section className="mx-auto w-full max-w-4xl px-4 py-6 space-y-4">
          <div className={cardCls}>
            <h2 className="font-display text-xl">Contact & livraison</h2>
            <Field label="Numéro WhatsApp">
              <input
                value={form.whatsapp}
                onChange={(e) => set("whatsapp", e.target.value)}
                maxLength={20}
                className={`${field} font-mono`}
              />
            </Field>
            <Field label="Frais de livraison (FDJ)">
              <input
                value={String(form.deliveryFee)}
                onChange={(e) => set("deliveryFee", Number(e.target.value.replace(/\D/g, "")) || 0)}
                inputMode="numeric"
                className={`${field} font-mono`}
              />
            </Field>
            <Field label="Quartiers livrés">
              <input
                value={form.deliveryZones}
                onChange={(e) => set("deliveryZones", e.target.value)}
                maxLength={200}
                className={field}
              />
            </Field>
            <Field label="Message de livraison">
              <textarea
                value={form.deliveryNote}
                onChange={(e) => set("deliveryNote", e.target.value)}
                rows={2}
                maxLength={200}
                className={field}
              />
            </Field>
            <div className="pt-4 border-t border-border space-y-4">
              <div>
                <h2 className="font-display text-xl">Politiques de la boutique</h2>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Ces textes seront affichés en bas du site. Laissez un champ vide pour le masquer.
                </p>
              </div>
              <Field label="Politique de retour">
                <textarea
                  value={form.returnPolicy}
                  onChange={(e) => set("returnPolicy", e.target.value)}
                  rows={6}
                  maxLength={5000}
                  placeholder="Exemple : les retours sont acceptés sous 7 jours si le produit n’a pas été utilisé…"
                  className={field}
                />
              </Field>
              <Field label="Politique de remboursement">
                <textarea
                  value={form.refundPolicy}
                  onChange={(e) => set("refundPolicy", e.target.value)}
                  rows={6}
                  maxLength={5000}
                  placeholder="Expliquez les conditions et le délai de remboursement…"
                  className={field}
                />
              </Field>
            </div>
            <div className="pt-4 border-t border-border space-y-4">
              <div>
                <h2 className="font-display text-xl">Questions fréquentes</h2>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Exemples : « Qui sommes-nous ? », « Comment nous livrons ? ». Le client touche la
                  question et la réponse se déroule sous « Informations utiles ».
                </p>
              </div>
              {(form.faqs ?? []).map((f, i) => (
                <div key={f.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                  <input
                    value={f.question}
                    onChange={(e) =>
                      set(
                        "faqs",
                        (form.faqs ?? []).map((x, j) =>
                          j === i ? { ...x, question: e.target.value } : x,
                        ),
                      )
                    }
                    maxLength={200}
                    placeholder="Question (ex. Qui sommes-nous ?)"
                    className={`${field} font-bold`}
                  />
                  <textarea
                    value={f.answer}
                    onChange={(e) =>
                      set(
                        "faqs",
                        (form.faqs ?? []).map((x, j) =>
                          j === i ? { ...x, answer: e.target.value } : x,
                        ),
                      )
                    }
                    rows={4}
                    maxLength={5000}
                    placeholder="Réponse affichée au client…"
                    className={field}
                  />
                  <button
                    onClick={() =>
                      set(
                        "faqs",
                        (form.faqs ?? []).filter((_, j) => j !== i),
                      )
                    }
                    className="px-3 py-1.5 border border-destructive/50 text-destructive rounded-lg text-[10px] font-bold"
                  >
                    SUPPRIMER
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  set("faqs", [
                    ...(form.faqs ?? []),
                    { id: crypto.randomUUID(), question: "", answer: "" },
                  ])
                }
                className="w-full border border-accent text-accent py-2.5 rounded-xl text-xs font-bold"
              >
                + AJOUTER UNE QUESTION
              </button>
            </div>
            <SaveButton />
          </div>
        </section>
      )}

      {tab === "paiements" && (
        <section className="mx-auto w-full max-w-4xl px-4 py-6 space-y-4">
          <div className={cardCls}>
            <h2 className="font-display text-xl">Moyens de paiement</h2>
            <p className="text-[11px] text-muted-foreground">
              Ajoutez, modifiez ou supprimez librement les moyens de paiement proposés aux clients.
            </p>
            <div className="space-y-3">
              {payments.map((p, i) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-border bg-card p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      value={p.label}
                      onChange={(e) =>
                        setPayments((list) =>
                          list.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                        )
                      }
                      placeholder="Nom (ex : Waafi)"
                      maxLength={140}
                      className={`${field} font-bold`}
                    />
                    <button
                      onClick={() => setPayments((list) => list.filter((_, j) => j !== i))}
                      className="shrink-0 text-[10px] font-bold px-2 py-2 border border-destructive/50 text-destructive rounded-lg"
                    >
                      SUPPR
                    </button>
                  </div>
                  <input
                    value={p.number}
                    onChange={(e) =>
                      setPayments((list) =>
                        list.map((x, j) => (j === i ? { ...x, number: e.target.value } : x)),
                      )
                    }
                    placeholder="Numéro (laisser vide pour espèces)"
                    maxLength={140}
                    className={`${field} font-mono`}
                  />
                  <input
                    value={p.hint}
                    onChange={(e) =>
                      setPayments((list) =>
                        list.map((x, j) => (j === i ? { ...x, hint: e.target.value } : x)),
                      )
                    }
                    placeholder="Petite description"
                    maxLength={160}
                    className={field}
                  />
                  <label className="flex items-center justify-between text-xs font-bold">
                    <span>{p.enabled ? "Visible sur le site" : "Masqué"}</span>
                    <input
                      type="checkbox"
                      checked={p.enabled}
                      onChange={(e) =>
                        setPayments((list) =>
                          list.map((x, j) => (j === i ? { ...x, enabled: e.target.checked } : x)),
                        )
                      }
                      className="size-5 accent-accent"
                    />
                  </label>
                </div>
              ))}
            </div>
            <button
              onClick={() =>
                setPayments((list) => [
                  ...list,
                  {
                    id: crypto.randomUUID(),
                    label: "",
                    number: "",
                    hint: "",
                    enabled: true,
                  },
                ])
              }
              className="w-full border border-border py-2.5 rounded-xl font-bold text-sm"
            >
              + Ajouter un moyen de paiement
            </button>
            <Field label="Instructions de paiement">
              <textarea
                value={form.paymentNote}
                onChange={(e) => set("paymentNote", e.target.value)}
                rows={2}
                maxLength={200}
                className={field}
              />
            </Field>
            <Field label="Titre de la section paiement">
              <input
                value={form.paymentTitle}
                onChange={(e) => set("paymentTitle", e.target.value)}
                maxLength={160}
                className={field}
              />
            </Field>
            <Field label="Sous-titre de la section paiement">
              <input
                value={form.paymentSubtitle}
                onChange={(e) => set("paymentSubtitle", e.target.value)}
                maxLength={300}
                className={field}
              />
            </Field>
            <SaveButton />
          </div>
        </section>
      )}

      {tab === "categories" && (
        <section className="mx-auto w-full max-w-4xl px-4 py-6 space-y-4">
          <div className={cardCls}>
            <h2 className="font-display text-xl">Catégories du catalogue</h2>
            <p className="text-[11px] text-muted-foreground">
              Ajoutez ou supprimez les catégories affichées aux clients.
            </p>
            <div className="space-y-2">
              {categoryList(form)
                .filter((c) => c !== "Tout")
                .map((c) => (
                  <div
                    key={c}
                    className="flex items-center justify-between gap-3 p-3 bg-card border border-border rounded-xl"
                  >
                    <span className="text-sm break-words min-w-0">{c}</span>
                    <button
                      onClick={() =>
                        set(
                          "categories",
                          categoryList(form).filter((x) => x !== "Tout" && x !== c),
                        )
                      }
                      className="text-[10px] font-bold px-2 py-1 border border-destructive/50 text-destructive rounded shrink-0"
                    >
                      SUPPR
                    </button>
                  </div>
                ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Nouvelle catégorie"
                maxLength={60}
                className={field}
              />
              <button
                onClick={() => {
                  const value = newCategory.trim();
                  if (!value) return;
                  const current = categoryList(form).filter((c) => c !== "Tout");
                  if (!current.includes(value)) set("categories", [...current, value]);
                  setNewCategory("");
                }}
                className="bg-accent text-accent-foreground px-4 rounded-xl font-bold shrink-0"
              >
                Ajouter
              </button>
            </div>
            <SaveButton />
          </div>
        </section>
      )}

      {tab === "produits" && (
        <section className="mx-auto w-full max-w-4xl px-4 py-6 space-y-4">
          <form
            className={cardCls}
            onSubmit={(e) => {
              e.preventDefault();
              const value = Number(price);
              if (!name.trim() || !value) return;
              shop.addProduct({
                name: name.trim().slice(0, 160),
                price: value,
                category,
                description: description.trim().slice(0, 1500),
                image: image.trim() || "https://placehold.co/512x512?text=Produit",
              });
              setName("");
              setPrice("");
              setImage("");
              setDescription("");
            }}
          >
            <h2 className="font-display text-xl">Ajouter un article</h2>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du produit"
              maxLength={160}
              className={field}
            />
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="numeric"
              placeholder="Prix en FDJ (ex : 12500)"
              className={`${field} font-mono`}
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description du produit (visible sur la page produit)"
              rows={3}
              maxLength={1500}
              className={field}
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={field}
            >
              {categoryList(form)
                .filter((c) => c !== "Tout")
                .map((c) => (
                  <option key={c} value={c} className="text-foreground">
                    {c}
                  </option>
                ))}
            </select>

            <Field label="Photo depuis le téléphone">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) readFile(file, setImage);
                }}
                className="w-full text-xs"
              />
            </Field>
            <input
              value={image.startsWith("data:") ? "" : image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="…ou lien de l'image (https://…)"
              className={field}
            />
            {image && (
              <img
                src={image}
                alt="Aperçu du produit"
                className="size-20 rounded-lg object-cover border border-border"
              />
            )}
            <button
              type="submit"
              className="w-full bg-accent text-accent-foreground py-3 rounded-xl font-bold"
            >
              Ajouter le produit
            </button>
          </form>

          <div className="space-y-3">
            <h2 className="font-display text-xl">Mes produits</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par numéro de référence (REF-…) ou par nom"
              maxLength={60}
              className={field}
            />
            {(() => {
              const q = search.trim().toLowerCase();
              const list = q
                ? products.filter(
                    (p) =>
                      productRef(p).toLowerCase().includes(q) ||
                      p.name.toLowerCase().includes(q),
                  )
                : products;
              if (list.length === 0)
                return (
                  <p className="text-xs text-muted-foreground">
                    Aucun produit ne correspond à cette référence.
                  </p>
                );
              return list.map((p) => (
                <ProductEditor key={p.id} product={p} readFile={readFile} />
              ));
            })()}
          </div>
        </section>
      )}

      {tab === "avis" && (
        <section className="mx-auto w-full max-w-4xl px-4 py-6 space-y-3">
          <h2 className="font-display text-xl">Avis des clients</h2>
          {reviews.map((r) => (
            <div key={r.id} className="p-3 bg-card border border-border rounded-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm italic">"{r.text}"</p>
                  <p className="text-[10px] mt-1 uppercase font-bold text-muted-foreground">
                    — {r.author} · {r.rating}/5 · {r.date}
                  </p>
                </div>
                <button
                  onClick={() => shop.removeReview(r.id)}
                  className="shrink-0 text-[10px] font-bold px-2 py-1 border border-destructive/50 text-destructive rounded"
                >
                  SUPPR
                </button>
              </div>
            </div>
          ))}
          {reviews.length === 0 && (
            <p className="text-xs text-muted-foreground">Aucun avis pour le moment.</p>
          )}
        </section>
      )}

      {tab === "commandes" && <OrdersSection />}

      {tab === "securite" && <SecuritySection />}
    </div>
  );
}

type OrderRow = {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  items: unknown;
  total: number;
  payment_label: string;
};

function OrdersSection() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    listOrders({})
      .then((r) => setOrders((r.orders ?? []) as OrderRow[]))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-6 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl">Commandes reçues</h2>
        <button onClick={load} className="text-[10px] font-bold px-3 py-1.5 border border-border rounded-full">
          ACTUALISER
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Ces informations sont privées : elles ne sont visibles que sur cette page, après votre connexion.
      </p>
      {loading && <p className="text-xs text-muted-foreground">Chargement…</p>}
      {!loading && orders.length === 0 && (
        <p className="text-xs text-muted-foreground">Aucune commande enregistrée pour le moment.</p>
      )}
      {orders.map((o) => {
        const items = Array.isArray(o.items)
          ? (o.items as { name: string; qty: number; price: number; ref?: string }[])
          : [];
        return (
          <div key={o.id} className="p-4 bg-card border border-border rounded-2xl space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-sm">{o.customer_name || "Client"}</p>
                <p className="text-xs text-muted-foreground break-words">
                  {o.customer_phone} · {o.customer_address}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                  {new Date(o.created_at).toLocaleString("fr-FR")}
                </p>
              </div>
              <button
                onClick={async () => {
                  await deleteOrder({ data: { id: o.id } });
                  setOrders((prev) => prev.filter((x) => x.id !== o.id));
                }}
                className="shrink-0 text-[10px] font-bold px-2 py-1 border border-destructive/50 text-destructive rounded"
              >
                SUPPR
              </button>
            </div>
            <ul className="text-xs space-y-1">
              {items.map((it, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="truncate">
                    {it.name} {it.ref ? `(${it.ref})` : ""} × {it.qty}
                  </span>
                  <span className="font-semibold whitespace-nowrap">{formatFdj(it.price * it.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between text-sm font-bold border-t border-border pt-2">
              <span>Total {o.payment_label ? `· ${o.payment_label}` : ""}</span>
              <span>{formatFdj(o.total)}</span>
            </div>
          </div>
        );
      })}
    </section>
  );
}


function ProductEditor({
  product,
  readFile,
}: {
  product: Product;
  readFile: (file: File, cb: (dataUrl: string) => void) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.price));
  const [category, setCategory] = useState(product.category);
  const [image, setImage] = useState(product.image);
  const [description, setDescription] = useState(product.description ?? "");
  const { settings } = useShop();
  const [saved, setSaved] = useState(false);

  return (
    <div className="p-3 bg-card border border-border rounded-xl">
      <div className="flex items-center gap-3">
        <img
          src={image}
          alt={product.name}
          loading="lazy"
          width={48}
          height={48}
          className="size-12 rounded-lg object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{product.name}</p>
          <p className="text-[11px] font-mono font-bold text-accent">{productRef(product)}</p>
          <p className="text-[11px] text-muted-foreground font-mono">
            {formatFdj(product.price)} · {product.category}
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-[10px] font-bold px-2 py-1 border border-border rounded"
        >
          {open ? "FERMER" : "MODIFIER"}
        </button>
        <button
          onClick={() => shop.removeProduct(product.id)}
          className="text-[10px] font-bold px-2 py-1 border border-destructive/50 text-destructive rounded"
        >
          SUPPR
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={160}
            placeholder="Nom du produit"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none"
          />
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="numeric"
            placeholder="Prix en FDJ"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none font-mono"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={1500}
            placeholder="Description du produit"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none"
          >
            {categoryList(settings)
              .filter((c) => c !== "Tout")
              .map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </select>

          <label className="block text-[11px] uppercase tracking-widest text-muted-foreground">
            Nouvelle photo depuis le téléphone
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) readFile(file, setImage);
            }}
            className="w-full text-xs"
          />
          <input
            value={image.startsWith("data:") ? "" : image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="…ou lien de l'image (https://…)"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none"
          />
          <button
            onClick={() => {
              const value = Number(price);
              if (!name.trim() || !value) return;
              shop.updateProduct(product.id, {
                name: name.trim().slice(0, 160),
                price: value,
                category,
                description: description.trim().slice(0, 1500),
                image: image.trim() || product.image,
              });
              setSaved(true);
              window.setTimeout(() => setSaved(false), 2000);
            }}
            className="w-full bg-accent text-accent-foreground py-2.5 rounded-lg font-bold"
          >
            {saved ? "Enregistré ✓" : "Enregistrer ce produit"}
          </button>
        </div>
      )}
    </div>
  );
}

function ForgotPassword({ onBack }: { onBack: () => void }) {
  const reset = useServerFn(resetAdminPassword);
  const [code, setCode] = useState("");
  const [next, setNext] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans grid place-items-center px-5">
      <form
        className="w-full max-w-sm space-y-4 p-6 rounded-2xl border border-border bg-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          try {
            const res = await reset({ data: { code, next } });
            setMessage(res.message);
            if (res.ok) {
              setCode("");
              setNext("");
            }
          } catch {
            setMessage("Réinitialisation impossible pour le moment.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div>
          <h1 className="font-display text-2xl tracking-wider text-accent">
            Mot de passe oublié
          </h1>
          <p className="text-muted-foreground text-xs mt-1">
            Entrez votre code de récupération pour choisir un nouveau mot de passe.
          </p>
        </div>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code de récupération"
          maxLength={200}
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none"
        />
        <input
          value={next}
          onChange={(e) => setNext(e.target.value)}
          type="password"
          placeholder="Nouveau mot de passe"
          autoComplete="new-password"
          maxLength={200}
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none"
        />
        {message && <p className="text-xs text-muted-foreground">{message}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-accent text-accent-foreground py-2.5 rounded-lg font-bold disabled:opacity-60"
        >
          {busy ? "Envoi…" : "Réinitialiser"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="block w-full text-center text-xs text-muted-foreground underline"
        >
          Retour à la connexion
        </button>
      </form>
    </div>
  );
}

function SecuritySection() {
  const change = useServerFn(changeAdminPassword);
  const saveCode = useServerFn(setRecoveryCode);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwdMessage, setPwdMessage] = useState("");
  const [code, setCode] = useState("");
  const [codeMessage, setCodeMessage] = useState("");

  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-8">
      <h2 className="font-display text-xl tracking-wide mb-4">Sécurité du compte</h2>
      <div className="space-y-3 p-4 bg-card border border-border rounded-xl">
        <p className="text-[11px] text-muted-foreground">
          Changez votre mot de passe administrateur quand vous le souhaitez.
        </p>
        <input
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          type="password"
          autoComplete="current-password"
          placeholder="Mot de passe actuel"
          maxLength={200}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none"
        />
        <input
          value={next}
          onChange={(e) => setNext(e.target.value)}
          type="password"
          autoComplete="new-password"
          placeholder="Nouveau mot de passe (6 caractères min.)"
          maxLength={200}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none"
        />
        {pwdMessage && <p className="text-xs text-muted-foreground">{pwdMessage}</p>}
        <button
          onClick={async () => {
            try {
              const res = await change({ data: { current, next } });
              setPwdMessage(res.message);
              if (res.ok) {
                setCurrent("");
                setNext("");
              }
            } catch {
              setPwdMessage("Modification impossible pour le moment.");
            }
          }}
          className="w-full bg-accent text-accent-foreground py-2.5 rounded-lg font-bold"
        >
          Changer le mot de passe
        </button>

        <div className="pt-3 border-t border-border space-y-3">
          <p className="text-[11px] text-muted-foreground">
            Code de récupération : il sert à retrouver l'accès si vous oubliez votre mot de passe.
            Notez-le en lieu sûr.
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code de récupération (6 caractères min.)"
            maxLength={200}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none"
          />
          {codeMessage && <p className="text-xs text-muted-foreground">{codeMessage}</p>}
          <button
            onClick={async () => {
              try {
                const res = await saveCode({ data: { code } });
                setCodeMessage(res.message);
                if (res.ok) setCode("");
              } catch {
                setCodeMessage("Enregistrement impossible pour le moment.");
              }
            }}
            className="w-full border border-border py-2.5 rounded-lg font-bold"
          >
            Enregistrer le code de récupération
          </button>
        </div>
      </div>

      <SecurityAssistant />
      <AuditJournal />
    </section>
  );
}

function SecurityAssistant() {
  const analyze = useServerFn(analyzeSecurity);
  const [description, setDescription] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="mt-6 space-y-3 p-4 bg-card border border-border rounded-xl">
      <h3 className="font-display text-lg tracking-wide">Analyse de sécurité assistée</h3>
      <p className="text-[11px] text-muted-foreground">
        Décrivez une activité suspecte ou une alerte (tentatives de connexion, message étrange,
        commande douteuse…). Vous recevrez une analyse et les actions à faire.
      </p>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={5}
        maxLength={4000}
        placeholder="Exemple : quelqu'un a essayé de se connecter 10 fois à l'administration cette nuit."
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none"
      />
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage("Analyse en cours…");
          setAnalysis("");
          try {
            const res = await analyze({ data: { description } });
            if (res.ok) {
              setAnalysis(res.analysis);
              setMessage("");
            } else {
              setMessage(res.message);
            }
          } catch {
            setMessage("L'analyse n'a pas pu être réalisée.");
          } finally {
            setBusy(false);
          }
        }}
        className="w-full bg-accent text-accent-foreground py-2.5 rounded-lg font-bold disabled:opacity-60"
      >
        {busy ? "Analyse en cours…" : "Analyser"}
      </button>
      {analysis && (
        <div className="whitespace-pre-wrap text-sm leading-relaxed p-3 bg-background border border-border rounded-lg">
          {analysis}
        </div>
      )}
    </div>
  );
}

function AuditJournal() {
  const load = useServerFn(listAudit);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await load();
      setRows(res.entries);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-6 space-y-3 p-4 bg-card border border-border rounded-xl">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg tracking-wide">Journal d'activité</h3>
        <button
          onClick={() => void refresh()}
          className="text-xs border border-border rounded-lg px-3 py-1.5 font-semibold"
        >
          Actualiser
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Connexions, modifications de produits et changements de réglages, avec la date.
      </p>
      {loading && <p className="text-xs text-muted-foreground">Chargement…</p>}
      {!loading && rows.length === 0 && (
        <p className="text-xs text-muted-foreground">Aucune activité enregistrée pour l'instant.</p>
      )}
      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="p-3 bg-background border border-border rounded-lg text-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{row.action}</span>
              <span
                className={`text-[10px] font-bold uppercase ${row.success ? "text-muted-foreground" : "text-destructive"}`}
              >
                {row.success ? "OK" : "Échec"}
              </span>
            </div>
            {row.details && (
              <p className="text-xs text-muted-foreground mt-1 break-words">{row.details}</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">
              {new Date(row.created_at).toLocaleString("fr-FR")} · {row.actor}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
