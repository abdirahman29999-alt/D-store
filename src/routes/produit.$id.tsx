import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { Stars, StarPicker } from "@/components/Stars";
import { formatFdj, productStats, shop, useShop } from "@/lib/shop";

export const Route = createFileRoute("/produit/$id")({
  head: () => ({
    meta: [
      { title: "Fiche produit — D-Store Djibouti" },
      {
        name: "description",
        content:
          "Détail du produit : description, prix en FDJ, notes en étoiles et avis des clients de Djibouti.",
      },
      { property: "og:title", content: "Fiche produit — D-Store Djibouti" },
      {
        property: "og:description",
        content: "Description, prix en FDJ et avis clients du produit.",
      },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const { products, reviews, cart, settings } = useShop();
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);

  const product = products.find((p) => p.id === id);
  const stats = productStats(reviews, id);
  const productReviews = reviews.filter((r) => r.productId === id);
  const qty = cart[id] ?? 0;

  if (!product) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans grid place-items-center px-6 text-center">
        <div className="space-y-4">
          <p className="font-display text-2xl">Ce produit n'existe plus.</p>
          <Link to="/" className="inline-block underline text-sm">
            Retour à la boutique
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans pb-16">
      <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="mx-auto w-full max-w-5xl px-4 py-3 flex items-center gap-3">
          <Link
            to="/"
            className="size-10 rounded-full border border-border grid place-items-center"
            aria-label="Retour à la boutique"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <p className="font-display text-xl truncate">{settings.shopName}</p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl">
      <div className="lg:grid lg:grid-cols-2 lg:gap-10 lg:items-start lg:px-4 lg:pt-8">
      <img
        src={product.image || "https://placehold.co/512x512?text=Produit"}
        alt={product.name}
        width={800}
        height={800}
        className="w-full aspect-square object-cover sm:aspect-[16/10] lg:aspect-square lg:rounded-2xl"
      />

      <section className="px-5 py-6 space-y-4 lg:px-0">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {product.category}
          </p>
          <h1 className="font-display text-3xl leading-tight mt-1 break-words">{product.name}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Stars rating={stats.average} />
          <span className="text-xs text-muted-foreground font-mono">
            {stats.count > 0
              ? `${stats.average.toFixed(1)}/5 · ${stats.count} avis`
              : "Aucun avis pour le moment"}
          </span>
        </div>

        <p className="font-mono text-2xl font-bold text-accent">{formatFdj(product.price)}</p>

        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line break-words">
          {product.description?.trim() ||
            "Article disponible à Djibouti. Contactez-nous sur WhatsApp pour plus de détails."}
        </p>

        {qty === 0 ? (
          <button
            onClick={() => shop.addToCart(product.id)}
            className="w-full rounded-xl bg-foreground text-background py-3.5 font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <ShoppingBag className="size-5" />
            Sélectionner
          </button>
        ) : (
          <div className="rounded-xl border border-accent/40 bg-card flex items-center justify-between px-3 py-2">
            <button
              onClick={() => shop.setQty(product.id, qty - 1)}
              className="size-9 rounded-full border border-border text-lg"
              aria-label="Retirer un"
            >
              −
            </button>
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase text-accent">Sélectionné</p>
              <p className="font-mono font-bold">{qty}</p>
            </div>
            <button
              onClick={() => shop.setQty(product.id, qty + 1)}
              className="size-9 rounded-full border border-border text-lg"
              aria-label="Ajouter un"
            >
              +
            </button>
          </div>
        )}
        <Link
          to="/"
          className="block text-center text-xs uppercase tracking-widest text-muted-foreground underline"
        >
          Continuer mes achats
        </Link>
      </section>
      </div>

      <section className="px-5 pb-10">
        <h2 className="font-display text-2xl mb-5">Avis des clients</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {productReviews.map((r) => (
            <div key={r.id} className="p-4 bg-card border border-border rounded-xl">
              <Stars rating={r.rating} size="size-3.5" />
              <p className="text-sm italic my-2">"{r.text}"</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">— {r.author}</p>
            </div>
          ))}
          {productReviews.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Soyez le premier à donner votre avis sur cet article.
            </p>
          )}
        </div>

        <form
          className="mt-6 p-4 bg-card border border-border rounded-xl space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!author.trim() || !text.trim()) return;
            shop.addReview({
              author: author.trim(),
              text: text.trim(),
              rating,
              productId: product.id,
            });
            setAuthor("");
            setText("");
            setRating(5);
          }}
        >
          <p className="font-display text-lg">Noter ce produit</p>
          <StarPicker value={rating} onChange={setRating} />
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Votre nom"
            maxLength={60}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Votre avis sur ce produit…"
            rows={3}
            maxLength={400}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            className="w-full bg-foreground text-background py-3 rounded-xl font-bold active:scale-[0.98] transition-transform"
          >
            Publier mon avis
          </button>
        </form>
      </section>
      </div>
    </div>
  );
}
