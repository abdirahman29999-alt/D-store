import { useSyncExternalStore } from "react";
import { addPublicReview, getShopState, saveShopState } from "@/lib/shop.functions";
import montre from "@/assets/p-montre.jpg";
import casque from "@/assets/p-casque.jpg";
import sac from "@/assets/p-sac.jpg";
import parfum from "@/assets/p-parfum.jpg";

export type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  description?: string;
  featured?: boolean;
  /** Numéro de référence unique affiché à l'administrateur. */
  ref?: string;
};

/** Crée un numéro de référence unique du type REF-8F3K2Q. */
export function makeRef() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return `REF-${out}`;
}

/** Référence d'un produit (repli stable pour les anciens produits). */
export function productRef(product: { id: string; ref?: string }) {
  if (product.ref && product.ref.trim()) return product.ref.trim();
  return `REF-${product.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()}`;
}

export type Review = {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  productId?: string;
};

export type PaymentOption = {
  id: string;
  label: string;
  number: string;
  hint: string;
  enabled: boolean;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type Settings = {
  shopName: string;
  logo: string;
  heroTitle: string;
  heroTitleAccent: string;
  heroText: string;
  heroImage: string;
  heroCta: string;
  statusOpen: string;
  statusDelivery: string;
  statusPayment: string;
  productsTitle: string;
  paymentTitle: string;
  paymentSubtitle: string;
  reviewsTitle: string;
  footerTitle: string;
  returnPolicy: string;
  refundPolicy: string;
  faqs?: FaqItem[];
  categories?: string[];
  whatsapp: string;
  deliveryFee: number;
  deliveryZones: string;
  deliveryNote: string;
  payments?: PaymentOption[];
  waafi: string;
  waafiEnabled: boolean;
  dmoney: string;
  dmoneyEnabled: boolean;
  cac: string;
  cacEnabled: boolean;
  cash: boolean;
  paymentNote: string;
};

export type PaymentMethod = { key: string; label: string; number: string; hint: string };

export function legacyPayments(settings: Settings): PaymentOption[] {
  return [
    {
      id: "waafi",
      label: "Waafi",
      number: settings.waafi,
      hint: "Waafi — Salaam Bank",
      enabled: Boolean(settings.waafiEnabled && settings.waafi.trim()),
    },
    {
      id: "dmoney",
      label: "D-Money",
      number: settings.dmoney,
      hint: "D-Money — Djibouti Telecom",
      enabled: Boolean(settings.dmoneyEnabled && settings.dmoney.trim()),
    },
    {
      id: "cac",
      label: "CAC Pay",
      number: settings.cac,
      hint: "CAC International Bank",
      enabled: Boolean(settings.cacEnabled && settings.cac.trim()),
    },
    {
      id: "cash",
      label: "Espèces",
      number: "",
      hint: "Paiement à la livraison",
      enabled: Boolean(settings.cash),
    },
  ];
}

export function paymentList(settings: Settings): PaymentOption[] {
  return Array.isArray(settings.payments) ? settings.payments : legacyPayments(settings);
}

export function paymentMethods(settings: Settings): PaymentMethod[] {
  return paymentList(settings)
    .filter((p) => p.enabled && p.label.trim())
    .map((p) => ({ key: p.id, label: p.label, number: p.number, hint: p.hint }));
}


export const CATEGORIES = ["Tout", "Électronique", "Mode", "Beauté", "Accessoires"];

/** Questions/réponses rédigées par l'administrateur. */
export function faqList(settings: Settings): FaqItem[] {
  return (Array.isArray(settings.faqs) ? settings.faqs : []).filter(
    (f) => f.question.trim() && f.answer.trim(),
  );
}

const DEFAULT_CATEGORIES = ["Électronique", "Mode", "Beauté", "Accessoires"];

/** Liste des catégories gérées par l'administrateur (avec « Tout » en premier). */
export function categoryList(settings: Settings): string[] {
  const list = (settings.categories ?? DEFAULT_CATEGORIES)
    .map((c) => c.trim())
    .filter(Boolean);
  return ["Tout", ...Array.from(new Set(list))];
}

/** Moyenne des notes clients d'un produit, sur 5. */
export function productStats(reviews: Review[], productId: string) {
  const list = reviews.filter((r) => r.productId === productId);
  if (list.length === 0) return { average: 0, count: 0 };
  const sum = list.reduce((s, r) => s + r.rating, 0);
  return { average: Math.round((sum / list.length) * 10) / 10, count: list.length };
}

const defaultProducts: Product[] = [
  { id: "1", name: "Montre Elégance Dorée", price: 12500, category: "Accessoires", image: montre, featured: true },
  { id: "2", name: "Casque Audio Pro-X", price: 8900, category: "Électronique", image: casque },
  { id: "3", name: "Sac en Cuir Artisanal", price: 15000, category: "Mode", image: sac },
  { id: "4", name: "Parfum Oud Djibouti", price: 22000, category: "Beauté", image: parfum },
];

const defaultReviews: Review[] = [
  {
    id: "r1",
    author: "Ahmed K. de Djibouti-ville",
    rating: 4,
    text: "Livraison très rapide à Balbala, produit conforme à la photo !",
    date: "2026-08-01",
  },
  {
    id: "r2",
    author: "Sarah M.",
    rating: 5,
    text: "Le parfum Oud est incroyable, j'adore commander ici via WhatsApp.",
    date: "2026-08-12",
  },
];

const defaultSettings: Settings = {
  shopName: "D-Store",
  logo: "",
  heroTitle: "L'Exception",
  heroTitleAccent: "Quotidienne",
  heroText: "Sélection exclusive d'accessoires et de produits de qualité, disponible à Djibouti.",
  heroImage: "",
  heroCta: "Découvrir",
  statusOpen: "Ouvert 24h/24",
  statusDelivery: "Livraison partout",
  statusPayment: "Paiement mobile",
  productsTitle: "Nos articles",
  paymentTitle: "Paiement disponible",
  paymentSubtitle: "Choisissez vos articles, puis utilisez le moyen de paiement qui vous convient.",
  reviewsTitle: "Avis des Clients",
  footerTitle: "Livraison Express",
  returnPolicy: "",
  refundPolicy: "",
  faqs: [],
  categories: DEFAULT_CATEGORIES,


  whatsapp: "25377359438",
  deliveryFee: 500,
  deliveryZones: "Djibouti-ville, Balbala, Héron, PK12, Arhiba",
  deliveryNote: "Livraison à domicile 24h/24 et 7j/7 — paiement à la réception.",
  waafi: "25377359438",
  waafiEnabled: true,
  dmoney: "25377359438",
  dmoneyEnabled: true,
  cac: "25377359438",
  cacEnabled: true,
  cash: true,
  paymentNote: "Envoyez le montant total sur le numéro choisi, puis envoyez la capture sur WhatsApp.",
};

type State = {
  products: Product[];
  reviews: Review[];
  cart: Record<string, number>;
  settings: Settings;
};

const CART_KEY = "djibouti-cart-v1";

function loadCart(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(CART_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

const baseState: State = {
  products: defaultProducts,
  reviews: defaultReviews,
  cart: {},
  settings: defaultSettings,
};

let state: State = baseState;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
  }
  listeners.forEach((l) => l());
}

async function pull() {
  try {
    const remote = await getShopState();
    if (!remote) return;
    state = {
      ...state,
      products: remote.products?.length ? (remote.products as Product[]) : state.products,
      reviews: (remote.reviews as Review[] | undefined) ?? state.reviews,
      settings: { ...defaultSettings, ...(remote.settings ?? {}) },
    };
    emit();
  } catch {
    /* garde les valeurs par défaut */
  }
}

async function push() {
  try {
    await saveShopState({
      data: {
        state: {
          products: state.products,
          reviews: state.reviews,
          settings: state.settings,
        },
      },
    });
  } catch {
    /* seul l'administrateur connecté peut enregistrer */
  }
}

function subscribe(cb: () => void) {
  if (!hydrated) {
    hydrated = true;
    state = { ...state, cart: loadCart() };
    void pull();
  }
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const serverState: State = baseState;

export function useShop() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => serverState,
  );
}

export const shop = {
  refresh() {
    void pull();
  },
  addToCart(id: string) {
    state = { ...state, cart: { ...state.cart, [id]: (state.cart[id] ?? 0) + 1 } };
    emit();
  },
  setQty(id: string, qty: number) {
    const cart = { ...state.cart };
    if (qty <= 0) delete cart[id];
    else cart[id] = qty;
    state = { ...state, cart };
    emit();
  },
  clearCart() {
    state = { ...state, cart: {} };
    emit();
  },
  async addReview(review: Omit<Review, "id" | "date">) {
    try {
      const res = await addPublicReview({ data: review });
      state = { ...state, reviews: [res.review as Review, ...state.reviews] };
      emit();
    } catch {
      /* avis non enregistré */
    }
  },
  removeReview(id: string) {
    state = { ...state, reviews: state.reviews.filter((r) => r.id !== id) };
    emit();
    void push();
  },
  addProduct(product: Omit<Product, "id">) {
    const existing = new Set(state.products.map((p) => productRef(p)));
    let ref = product.ref?.trim() || makeRef();
    while (existing.has(ref)) ref = makeRef();
    state = {
      ...state,
      products: [{ ...product, ref, id: crypto.randomUUID() }, ...state.products],
    };
    emit();
    void push();
  },
  updateProduct(id: string, patch: Partial<Product>) {
    state = {
      ...state,
      products: state.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    };
    emit();
    void push();
  },
  removeProduct(id: string) {
    const cart = { ...state.cart };
    delete cart[id];
    state = { ...state, products: state.products.filter((p) => p.id !== id), cart };
    emit();
    void push();
  },
  saveSettings(settings: Settings) {
    state = { ...state, settings };
    emit();
    void push();
  },
};


export function formatFdj(value: number | undefined | null) {
  const n = Number(value ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  return `${safe.toLocaleString("fr-FR").replace(/\u202f|\s/g, ".")} FDJ`;
}

export function paymentPayload(
  settings: Settings,
  method: PaymentMethod | undefined,
  amount: number,
) {
  if (!method) return "";
  if (!method.number) {
    return `${settings.shopName} — Paiement en espèces à la livraison — Montant : ${formatFdj(amount)}`;
  }
  return [
    `${settings.shopName}`,
    `Paiement ${method.label}`,
    `Numéro : ${method.number}`,
    `Montant : ${formatFdj(amount)}`,
  ].join("\n");
}

export type CustomerInfo = { name: string; phone: string; address: string };

export type OrderLine = { name: string; qty: number; price: number; ref?: string };

export function orderSummary(
  settings: Settings,
  lines: OrderLine[],
  total: number,
  paymentKey?: string,
  customer?: CustomerInfo,
) {
  const method = paymentMethods(settings).find((m) => m.key === paymentKey);
  const grand = total + settings.deliveryFee;
  const parts: string[] = [];
  const first = lines[0];
  const lineRef = (l: OrderLine) => (l.ref?.trim() ? ` (${l.ref.trim()})` : "");
  if (lines.length === 1 && first && first.qty === 1) {
    parts.push(
      `Bonjour, je veux passer commande de ce produit : *${first.name}*${lineRef(first)} au prix de *${formatFdj(first.price)}*. Est-ce qu'il est disponible ?`,
    );
  } else {
    parts.push("Bonjour, je veux passer commande de ces produits :");
    parts.push("");
    for (const l of lines) {
      parts.push(`• *${l.name}*${lineRef(l)} x${l.qty} : *${formatFdj(l.price * l.qty)}*`);
    }
    parts.push("", `Total : *${formatFdj(grand)}* (livraison incluse)`);
    parts.push("", "Est-ce qu'ils sont disponibles ?");
  }
  if (method) parts.push("", `Paiement : ${method.label}`);
  if (customer && (customer.name || customer.phone || customer.address)) {
    parts.push("", "Mes informations :");
    if (customer.name) parts.push(`Nom : ${customer.name}`);
    if (customer.phone) parts.push(`Téléphone : ${customer.phone}`);
    if (customer.address) parts.push(`Adresse de livraison : ${customer.address}`);
  }
  return parts.join("\n");
}

export function whatsappLink(
  settings: Settings,
  lines: OrderLine[],
  total: number,
  paymentKey?: string,
  customer?: CustomerInfo,
) {
  const body = orderSummary(settings, lines, total, paymentKey, customer);
  const number = settings.whatsapp.replace(/\D/g, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(body)}`;
}

