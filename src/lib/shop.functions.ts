import { createServerFn } from "@tanstack/react-start";

export type StoredProduct = {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  description?: string | undefined;
  featured?: boolean | undefined;
  ref?: string | undefined;
};

export type StoredReview = {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  productId?: string | undefined;
};

export type StoredPaymentOption = {
  id: string;
  label: string;
  number: string;
  hint: string;
  enabled: boolean;
};

export type StoredFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type StoredSettings = {
  shopName: string;
  logo?: string;
  heroTitle?: string;
  heroTitleAccent?: string;
  heroText?: string;
  heroImage?: string;
  heroCta?: string;
  statusOpen?: string;
  statusDelivery?: string;
  statusPayment?: string;
  productsTitle?: string;
  paymentTitle?: string;
  paymentSubtitle?: string;
  reviewsTitle?: string;
  footerTitle?: string;
  returnPolicy?: string;
  refundPolicy?: string;
  faqs?: StoredFaqItem[];
  categories?: string[];
  whatsapp: string;
  deliveryFee: number;
  deliveryZones: string;
  deliveryNote: string;
  payments?: StoredPaymentOption[];
  waafi: string;
  waafiEnabled?: boolean;
  dmoney: string;
  dmoneyEnabled?: boolean;
  cac: string;
  cacEnabled?: boolean;
  cash: boolean;
  paymentNote: string;
};


export type PersistedShop = {
  products: StoredProduct[];
  reviews: StoredReview[];
  settings: StoredSettings;
};

export const getShopState = createServerFn({ method: "GET" }).handler(async () => {
  // Lecture publique du catalogue : servie par le serveur (la table est verrouillée
  // côté base, personne ne peut la lire directement depuis l'extérieur).
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("shop_state").select("data").eq("id", "main").maybeSingle();
  return (data?.data ?? null) as Partial<PersistedShop> | null;
});

const txt = (v: unknown, max: number) =>
  String(v ?? "")
    // retire les caractères de contrôle invisibles
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .slice(0, max);

/** N'accepte que des images sûres : lien https ou photo envoyée depuis l'appareil. */
const img = (v: unknown) => {
  const value = String(v ?? "").trim();
  if (value.startsWith("data:image/")) return value.slice(0, 3_000_000);
  if (/^https:\/\//i.test(value)) return value.slice(0, 2000);
  return "";
};

function sanitizeState(state: PersistedShop): PersistedShop {
  const s = state.settings ?? ({} as StoredSettings);
  const text = (k: keyof StoredSettings, max = 400) => txt(s[k], max);
  return {
    products: (state.products ?? []).slice(0, 500).map((p) => ({
      id: txt(p.id, 64),
      name: txt(p.name, 120),
      price: Math.max(0, Math.min(100_000_000, Math.round(Number(p.price) || 0))),
      category: txt(p.category, 60),
      image: img(p.image),
      description: txt(p.description, 1500),
      featured: Boolean(p.featured),
      ref: txt(p.ref, 32),
    })),
    reviews: (state.reviews ?? []).slice(0, 300).map((r) => ({
      id: txt(r.id, 64),
      author: txt(r.author, 60),
      rating: Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5))),
      text: txt(r.text, 500),
      date: txt(r.date, 20),
      productId: txt(r.productId, 64),
    })),
    settings: {
      ...s,
      shopName: text("shopName", 80) || "Ma Boutique",
      logo: img(s.logo),
      heroImage: img(s.heroImage),
      heroTitle: text("heroTitle"),
      heroTitleAccent: text("heroTitleAccent"),
      heroText: text("heroText", 600),
      heroCta: text("heroCta"),
      statusOpen: text("statusOpen"),
      statusDelivery: text("statusDelivery"),
      statusPayment: text("statusPayment"),
      productsTitle: text("productsTitle"),
      paymentTitle: text("paymentTitle"),
      paymentSubtitle: text("paymentSubtitle"),
      reviewsTitle: text("reviewsTitle"),
      footerTitle: text("footerTitle"),
      returnPolicy: text("returnPolicy", 5000),
      refundPolicy: text("refundPolicy", 5000),
      whatsapp: String(s.whatsapp ?? "").replace(/\D/g, "").slice(0, 20),
      deliveryFee: Math.max(0, Math.min(10_000_000, Math.round(Number(s.deliveryFee) || 0))),
      deliveryZones: text("deliveryZones", 600),
      deliveryNote: text("deliveryNote", 600),
      paymentNote: text("paymentNote", 600),
      cash: Boolean(s.cash),
      payments: (s.payments ?? []).slice(0, 20).map((p) => ({
        id: txt(p.id, 64),
        label: txt(p.label, 60),
        number: txt(p.number, 40),
        hint: txt(p.hint, 160),
        enabled: Boolean(p.enabled),
      })),
      categories: (s.categories ?? []).slice(0, 40).map((c) => txt(c, 60)).filter(Boolean),
      faqs: (s.faqs ?? []).slice(0, 30).map((f) => ({
        id: txt(f.id, 64),
        question: txt(f.question, 200),
        answer: txt(f.answer, 5000),
      })),
    },
  };
}

export const saveShopState = createServerFn({ method: "POST" })
  .inputValidator((input: { state: PersistedShop }) => input)
  .handler(async ({ data }) => {
    const { isAdmin } = await import("./admin-session.server");
    if (!(await isAdmin())) return { ok: false as const, reason: "unauthorized" as const };
    const clean = sanitizeState(data.state);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: before } = await supabaseAdmin
      .from("shop_state")
      .select("data")
      .eq("id", "main")
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("shop_state")
      .upsert({ id: "main", data: clean as never, updated_at: new Date().toISOString() });
    if (error) return { ok: false as const, reason: error.message };
    const prev = (before?.data ?? {}) as Partial<PersistedShop>;
    const changes: string[] = [];
    if (JSON.stringify(prev.products ?? []) !== JSON.stringify(clean.products)) {
      changes.push(
        `Produits modifiés (${(prev.products ?? []).length} → ${clean.products.length})`,
      );
    }
    if (JSON.stringify(prev.settings ?? {}) !== JSON.stringify(clean.settings)) {
      changes.push("Paramètres de la boutique modifiés");
    }
    if (JSON.stringify(prev.reviews ?? []) !== JSON.stringify(clean.reviews)) {
      changes.push("Avis modifiés");
    }
    if (changes.length) {
      const { logAudit } = await import("./audit.server");
      await logAudit({ action: "Modification de la boutique", details: changes.join(" · ") });
    }
    return { ok: true as const };
  });

export const addPublicReview = createServerFn({ method: "POST" })
  .inputValidator((input: { author: string; text: string; rating: number; productId?: string }) => ({
    author: String(input.author ?? "").trim().slice(0, 60),
    text: String(input.text ?? "").trim().slice(0, 400),
    rating: Math.min(5, Math.max(1, Math.round(Number(input.rating) || 5))),
    productId: String(input.productId ?? "").trim().slice(0, 64),
  }))
  .handler(async ({ data }) => {
    if (!data.author || !data.text) throw new Error("Avis incomplet");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("shop_state")
      .select("data")
      .eq("id", "main")
      .maybeSingle();
    const current = (row?.data ?? {}) as Partial<PersistedShop>;
    const review: StoredReview = {
      id: crypto.randomUUID(),
      author: data.author,
      text: data.text,
      rating: data.rating,
      date: new Date().toISOString().slice(0, 10),
      productId: data.productId,
    };
    const reviews = [review, ...(current.reviews ?? [])].slice(0, 200);
    const next = { ...current, reviews };
    const { error } = await supabaseAdmin
      .from("shop_state")
      .upsert({ id: "main", data: next as never, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { review };
  });

export type StoredOrderItem = { name: string; qty: number; price: number; ref?: string };

/** Enregistre la commande du client dans une table privée (lisible par l'administrateur seul). */
export const createOrder = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      name: string;
      phone: string;
      address: string;
      items: StoredOrderItem[];
      total: number;
      paymentLabel?: string;
    }) => ({
      name: txt(input.name, 60),
      phone: String(input.phone ?? "").replace(/[^\d+ ]/g, "").slice(0, 25),
      address: txt(input.address, 300),
      total: Math.max(0, Math.min(100_000_000, Math.round(Number(input.total) || 0))),
      paymentLabel: txt(input.paymentLabel, 60),
      items: (input.items ?? []).slice(0, 100).map((i) => ({
        name: txt(i.name, 120),
        qty: Math.max(1, Math.min(999, Math.round(Number(i.qty) || 1))),
        price: Math.max(0, Math.min(100_000_000, Math.round(Number(i.price) || 0))),
        ref: txt(i.ref, 32),
      })),
    }),
  )
  .handler(async ({ data }) => {
    if (!data.items.length) return { ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("orders").insert({
      customer_name: data.name,
      customer_phone: data.phone,
      customer_address: data.address,
      items: data.items as never,
      total: data.total,
      payment_label: data.paymentLabel,
    });
    if (error) return { ok: false as const };
    return { ok: true as const };
  });

/** Liste des commandes : réservée à l'administrateur connecté. */
export const listOrders = createServerFn({ method: "GET" }).handler(async () => {
  const { isAdmin } = await import("./admin-session.server");
  if (!(await isAdmin())) return { ok: false as const, orders: [] };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("orders")
    .select("id, created_at, customer_name, customer_phone, customer_address, items, total, payment_label, status")
    .order("created_at", { ascending: false })
    .limit(200);
  return { ok: true as const, orders: data ?? [] };
});

export const deleteOrder = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => ({ id: String(input.id ?? "").slice(0, 64) }))
  .handler(async ({ data }) => {
    const { isAdmin } = await import("./admin-session.server");
    if (!(await isAdmin())) return { ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("orders").delete().eq("id", data.id);
    return { ok: true as const };
  });
