import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ShoppingBag } from "lucide-react";
import hero from "@/assets/hero-market.jpg";
import logoDstore from "@/assets/logo-dstore.png";
import { Stars, StarPicker } from "@/components/Stars";
import {
  categoryList,
  faqList,
  formatFdj,
  paymentMethods,
  productStats,
  shop,
  useShop,
  whatsappLink,
  productRef,
  type CustomerInfo,
} from "@/lib/shop";
import { createOrder } from "@/lib/shop.functions";

const CUSTOMER_KEY = "djibouti-client-v1";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "D-Store — Boutique en ligne à Djibouti, commande WhatsApp" },
      {
        name: "description",
        content:
          "Boutique en ligne à Djibouti : mode, électronique, beauté et accessoires. Prix en FDJ, commande simple via WhatsApp, livraison à Djibouti-ville.",
      },
      { property: "og:title", content: "D-Store — Boutique en ligne à Djibouti" },
      {
        property: "og:description",
        content: "Produits et accessoires à Djibouti. Prix en FDJ, commandez en un clic sur WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Boutique,
});

function Ticker({ items }: { items: string[] }) {
  const list = items.filter((t) => t.trim());
  if (list.length === 0) return null;
  const loop = [...list, ...list, ...list, ...list];
  return (
    <div className="bg-foreground text-background overflow-hidden py-2">
      <div className="flex w-max animate-marquee whitespace-nowrap">
        {[0, 1].map((k) => (
          <div key={k} className="flex">
            {loop.map((t, i) => (
              <span
                key={`${k}-${i}`}
                className="px-5 text-[11px] uppercase tracking-[0.18em] font-semibold"
              >
                <span className="text-accent mr-2">•</span>
                {t}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Boutique() {
  const { products, reviews, cart, settings } = useShop();
  const faqs = faqList(settings);
  const [category, setCategory] = useState("Tout");
  const [cartOpen, setCartOpen] = useState(false);
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const methods = paymentMethods(settings);
  const [payment, setPayment] = useState("");
  const activePayment = methods.some((m) => m.key === payment) ? payment : (methods[0]?.key ?? "");

  const visible = products.filter((p) => category === "Tout" || p.category === category);

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const product = products.find((p) => p.id === id);
          return product ? { ...product, qty, ref: productRef(product) } : null;
        })
        .filter((l): l is NonNullable<typeof l> => l !== null),
    [cart, products],
  );

  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.qty * l.price, 0);

  const [customer, setCustomer] = useState<CustomerInfo>({ name: "", phone: "", address: "" });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CUSTOMER_KEY);
      if (raw) setCustomer({ name: "", phone: "", address: "", ...JSON.parse(raw) });
    } catch {
      /* rien à restaurer */
    }
  }, []);

  const setField = (key: keyof CustomerInfo, value: string) => {
    const next = { ...customer, [key]: value };
    setCustomer(next);
    try {
      window.localStorage.setItem(CUSTOMER_KEY, JSON.stringify(next));
    } catch {
      /* stockage indisponible */
    }
  };

  const link = whatsappLink(settings, lines, total, activePayment, customer);

  function sendOrder() {
    if (!customer.address.trim()) {
      alert("Merci d'indiquer votre adresse de livraison avant de commander.");
      return;
    }
    void createOrder({
      data: {
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        total,
        paymentLabel: methods.find((m) => m.key === activePayment)?.label ?? "",
        items: lines.map((l) => ({ name: l.name, qty: l.qty, price: l.price, ref: l.ref })),
      },
    }).catch(() => undefined);
    window.open(link, "_blank", "noopener");
  }


  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-accent/20 pb-8">
      {/* Bandeau défilant */}
      <Ticker items={[settings.statusOpen, settings.statusDelivery, settings.statusPayment]} />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-4 flex justify-between items-center gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={settings.logo || logoDstore}
            alt={`Logo de ${settings.shopName}`}
            width={40}
            height={40}
            className="size-10 rounded-full object-cover border border-accent/40 shadow-sm"
          />
          <h1 className="font-display text-2xl tracking-tight text-foreground truncate">
            {settings.shopName}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-[10px] uppercase tracking-[0.2em] font-bold text-accent">
            Djibouti
          </span>
          <button
            className="relative size-10 rounded-full border border-border grid place-items-center active:scale-95 transition-transform"
            aria-label="Ouvrir le panier"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag className="size-5 text-foreground" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-[9px] font-bold size-4 rounded-full flex items-center justify-center">
                {count}
              </span>
            )}
          </button>
          <Link
            to="/admin"
            className="size-10 rounded-full overflow-hidden border border-border shadow-sm active:scale-95 transition-transform"
            aria-label="Espace administrateur"
          >
            <img
              src={settings.logo || logoDstore}
              alt="Logo administrateur"
              width={40}
              height={40}
              className="size-full object-cover"
            />
          </Link>
        </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-0 sm:px-2">

      {/* Hero éditorial */}
      <section className="px-4 pt-6 animate-slide-up lg:grid lg:grid-cols-2 lg:items-center lg:gap-10 lg:pt-12">
        <div className="relative rounded-2xl overflow-hidden shadow-lg">
          <img
            src={settings.heroImage || hero}
            alt="Étal de tissus et d'épices colorés dans une boutique de Djibouti"
            width={800}
            height={1000}
            className="w-full aspect-[4/5] sm:aspect-[16/10] lg:aspect-[4/5] object-cover object-center block"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/90 via-foreground/60 to-transparent px-5 pt-16 pb-5 lg:hidden">
            <h2 className="font-display text-3xl sm:text-4xl leading-tight text-background break-words">
              {settings.heroTitle}{" "}
              <span className="text-accent">{settings.heroTitleAccent}</span>
            </h2>
          </div>
        </div>
        <div className="mt-5 px-1 space-y-4 lg:mt-0">
          <h2 className="hidden lg:block font-display text-5xl leading-tight break-words">
            {settings.heroTitle}{" "}
            <span className="text-accent">{settings.heroTitleAccent}</span>
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-muted-foreground break-words">
            {settings.heroText}
          </p>
          {settings.heroCta.trim() && (
            <a
              href="#produits"
              className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-3 text-xs font-bold uppercase tracking-[0.18em] active:scale-[0.98] transition-transform"
            >
              {settings.heroCta}
            </a>
          )}
        </div>
      </section>




      {/* Filtres catégories */}
      <div id="produits" className="flex gap-3 px-4 overflow-x-auto no-scrollbar mt-8 mb-8 scroll-mt-20">
        {categoryList(settings).map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-5 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
              c === category
                ? "bg-foreground text-background font-semibold"
                : "bg-card border border-border"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Produits */}
      <h4 className="px-4 font-display text-2xl mb-5">{settings.productsTitle}</h4>
      <section className="px-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-10">

        {visible.map((p, i) => {
          const stats = productStats(reviews, p.id);
          return (
          <div
            key={p.id}
            className="group animate-slide-up"
            style={{ animationDelay: `${100 + i * 50}ms` }}
          >
            <Link to="/produit/$id" params={{ id: p.id }} className="block">
              <div className="aspect-[3/4] bg-card rounded-xl border border-border overflow-hidden mb-3 relative">
                <img
                  src={p.image || "https://placehold.co/512x512?text=Produit"}
                  alt={p.name}
                  loading="lazy"
                  width={512}
                  height={512}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {p.featured && (
                  <div className="absolute top-2 left-2 bg-background px-2 py-0.5 rounded text-[10px] font-bold border border-accent/30 text-accent">
                    TOP VENTE
                  </div>
                )}
              </div>
              <h3 className="font-display text-base leading-tight mb-1">{p.name}</h3>
            </Link>
            <p className="text-accent font-mono text-sm font-bold mb-1">{formatFdj(p.price)}</p>
            <div className="flex items-center gap-2 mb-3">
              <Stars rating={stats.average} size="size-3.5" />
              <span className="text-[11px] text-muted-foreground font-mono">
                {stats.count > 0 ? `${stats.average.toFixed(1)}/5 (${stats.count})` : "Pas encore d'avis"}
              </span>
            </div>

            {(cart[p.id] ?? 0) === 0 ? (
              <button
                onClick={() => shop.addToCart(p.id)}
                className="w-full min-h-10 rounded-lg bg-foreground text-background px-3 py-2 text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                aria-label={`Sélectionner ${p.name}`}
              >
                <ShoppingBag className="size-4" />
                Sélectionner

              </button>
            ) : (
              <div className="min-h-10 rounded-lg border border-accent/40 bg-card flex items-center justify-between px-2">
                <button
                  onClick={() => shop.setQty(p.id, (cart[p.id] ?? 0) - 1)}
                  className="size-8 rounded-full border border-border grid place-items-center text-lg"
                  aria-label={`Retirer un ${p.name}`}
                >
                  −
                </button>
                <div className="text-center min-w-0 px-1">
                  <p className="text-[9px] font-bold uppercase text-accent">Sélectionné</p>
                  <p className="font-mono text-sm font-bold">{cart[p.id]}</p>
                </div>
                <button
                  onClick={() => shop.setQty(p.id, (cart[p.id] ?? 0) + 1)}
                  className="size-8 rounded-full border border-border grid place-items-center text-lg"
                  aria-label={`Ajouter un ${p.name}`}
                >
                  +
                </button>
              </div>
            )}
          </div>
          );
        })}
        {visible.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground">Aucun produit dans cette catégorie.</p>
        )}
      </section>

      {/* Moyens de paiement après le choix des articles */}
      {methods.length > 0 && (
        <section className="px-4 py-10 mt-4 border-t border-border">
          <h4 className="font-display text-2xl mb-2">{settings.paymentTitle}</h4>
          <p className="text-xs text-muted-foreground mb-5">{settings.paymentSubtitle}</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {methods.map((m) => (
              <div
                key={m.key}
                className="rounded-xl border border-border bg-card p-4"
              >
                <p className="text-sm font-bold">{m.label}</p>
                {m.number && (
                  <p className="font-mono text-xs text-accent mt-1 break-all">{m.number}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">{m.hint}</p>
              </div>
            ))}
          </div>
          {settings.paymentNote && (
            <p className="text-[11px] text-muted-foreground mt-4">{settings.paymentNote}</p>
          )}
        </section>
      )}

      {/* Avis clients */}
      <section className="px-4 py-12">
        <h4 className="font-display text-2xl mb-6">{settings.reviewsTitle}</h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <div key={r.id} className="p-4 bg-card border border-border rounded-xl">
              <Stars rating={r.rating} size="size-3.5" />
              <p className="text-sm italic mb-2">"{r.text}"</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">— {r.author}</p>
            </div>
          ))}
        </div>

        <form
          className="mt-6 p-4 bg-card border border-border rounded-xl space-y-3 lg:max-w-xl"
          onSubmit={(e) => {
            e.preventDefault();
            if (!author.trim() || !text.trim()) return;
            shop.addReview({ author: author.trim(), text: text.trim(), rating });
            setAuthor("");
            setText("");
            setRating(5);
          }}
        >
          <p className="font-display text-lg tracking-wide">Laisser un commentaire</p>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Votre nom"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Votre avis sur nos produits…"
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Note :</span>
            <StarPicker value={rating} onChange={setRating} />
          </div>

          <button
            type="submit"
            className="w-full bg-foreground text-background py-3 rounded-xl font-bold active:scale-[0.98] transition-transform"
          >
            Publier mon avis
          </button>
        </form>
      </section>

      {(settings.returnPolicy.trim() || settings.refundPolicy.trim() || faqs.length > 0) && (
        <section className="px-4 py-8 border-t border-border">
          <h4 className="font-display text-2xl mb-5">Informations utiles</h4>
          <div className="space-y-3">
            {settings.returnPolicy.trim() && (
              <details className="group rounded-xl border border-border bg-card overflow-hidden">
                <summary className="cursor-pointer list-none px-4 py-4 font-semibold flex items-center justify-between gap-4">
                  <span>Politique de retour</span>
                  <span aria-hidden="true" className="text-accent text-xl transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground whitespace-pre-line break-words">
                  {settings.returnPolicy}
                </p>
              </details>
            )}
            {settings.refundPolicy.trim() && (
              <details className="group rounded-xl border border-border bg-card overflow-hidden">
                <summary className="cursor-pointer list-none px-4 py-4 font-semibold flex items-center justify-between gap-4">
                  <span>Politique de remboursement</span>
                  <span aria-hidden="true" className="text-accent text-xl transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground whitespace-pre-line break-words">
                  {settings.refundPolicy}
                </p>
              </details>
            )}
            {faqs.map((f) => (
              <details key={f.id} className="group rounded-xl border border-border bg-card overflow-hidden">
                <summary className="cursor-pointer list-none px-4 py-4 font-semibold flex items-center justify-between gap-4">
                  <span className="break-words">{f.question}</span>
                  <span aria-hidden="true" className="text-accent text-xl transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground whitespace-pre-line break-words">
                  {f.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Footer éditorial */}
      <footer className="bg-foreground mx-4 rounded-2xl p-8 text-background mt-8">
        <h4 className="font-display text-xl mb-4">{settings.footerTitle}</h4>
        <p className="text-xs text-background/70 mb-4">{settings.deliveryZones}</p>
        <p className="text-[10px] uppercase tracking-widest text-accent">{settings.deliveryNote}</p>
      </footer>
      </div>

      {/* Panier flottant */}
      <button
        onClick={() => setCartOpen(true)}
        className="fixed bottom-8 right-6 z-50 size-16 bg-accent rounded-full shadow-2xl flex items-center justify-center text-accent-foreground border-4 border-background active:scale-95 transition-transform"
        aria-label="Ouvrir le panier"
      >
        <div className="relative">
          <ShoppingBag className="size-6" />
          {count > 0 && (
            <span className="absolute -top-3 -right-3 bg-foreground text-background text-[9px] size-5 rounded-full flex items-center justify-center font-bold">
              {count}
            </span>
          )}
        </div>
      </button>

      {/* Drawer panier */}
      {cartOpen && (
        <div className="fixed inset-0 z-60 flex">
          <button
            className="flex-1 bg-foreground/40"
            aria-label="Fermer le panier"
            onClick={() => setCartOpen(false)}
          />
          <aside className="w-[85%] max-w-sm bg-background border-l border-border p-5 overflow-y-auto animate-slide-in-right">
            <div className="flex items-center justify-between mb-6">
              <h5 className="font-display text-2xl tracking-wide flex items-center gap-2">
                <img
                  src={settings.logo || logoDstore}
                  alt=""
                  width={32}
                  height={32}
                  className="size-8 rounded-full object-cover border border-accent/50"
                />
                Mon Panier
              </h5>
              <button onClick={() => setCartOpen(false)} className="text-sm text-muted-foreground">
                Fermer
              </button>
            </div>
            {lines.length === 0 && (
              <p className="text-sm text-muted-foreground">Votre panier est vide.</p>
            )}
            <div className="space-y-4">
              {lines.map((l) => (
                <div key={l.id} className="flex gap-3 items-center">
                  <img
                    src={l.image}
                    alt={l.name}
                    loading="lazy"
                    width={64}
                    height={64}
                    className="size-16 rounded-lg object-cover border border-border"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{l.name}</p>
                    <p className="text-accent font-mono text-xs font-bold">{formatFdj(l.price)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => shop.setQty(l.id, l.qty - 1)}
                        className="size-6 rounded-full border border-border"
                        aria-label="Retirer un"
                      >
                        −
                      </button>
                      <span className="font-mono text-sm">{l.qty}</span>
                      <button
                        onClick={() => shop.setQty(l.id, l.qty + 1)}
                        className="size-6 rounded-full border border-border"
                        aria-label="Ajouter un"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {lines.length > 0 && (
              <div className="mt-8 space-y-3">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="font-mono">{formatFdj(total)}</span>
                </div>
                {methods.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      Mode de paiement
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {methods.map((m) => (
                        <button
                          key={m.key}
                          onClick={() => setPayment(m.key)}
                          className={`px-3 py-2 rounded-lg text-xs font-bold border ${
                            m.key === activePayment
                              ? "bg-foreground text-background border-foreground"
                              : "bg-card border-border"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                    {methods.find((m) => m.key === activePayment)?.number && (
                      <div className="rounded-xl border border-border bg-card p-3">
                        <p className="text-xs text-muted-foreground">Paiement disponible sur</p>
                        <p className="font-mono text-sm font-bold text-accent mt-1">
                          {methods.find((m) => m.key === activePayment)?.number}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-2 rounded-xl border border-border bg-card p-3">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Vos informations de livraison
                  </p>
                  <input
                    value={customer.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="Votre nom"
                    maxLength={80}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <input
                    value={customer.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    placeholder="Votre téléphone"
                    maxLength={30}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                  <textarea
                    value={customer.address}
                    onChange={(e) => setField("address", e.target.value)}
                    placeholder="Votre adresse de livraison (quartier, repère…)"
                    maxLength={300}
                    rows={2}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={sendOrder}
                  className="block w-full text-center bg-foreground text-background py-3 rounded-xl font-bold active:scale-[0.98] transition-transform"
                >
                  Passer la commande
                </button>
                <p className="text-[11px] text-center text-muted-foreground">
                  Vous serez redirigé vers WhatsApp avec le récapitulatif de votre commande.
                </p>
                <button
                  onClick={() => shop.clearCart()}
                  className="w-full py-2 text-xs uppercase tracking-widest text-muted-foreground"
                >
                  Vider le panier
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
