import { formatFdj } from "@/lib/shop";

export type OrderLine = { name: string; qty: number; price: number; image: string };

export type Customer = { name: string; phone: string; address: string };

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (/^https?:\/\//i.test(src)) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Fabrique une image récapitulative de la commande (photos, prix, quantités, total, adresse). */
export async function buildOrderImage(
  shopName: string,
  lines: OrderLine[],
  total: number,
  deliveryFee: number,
  customer: Customer,
  paymentLabel?: string,
): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const W = 900;
  const rowH = 150;
  const headH = 150;
  const footH = 300;
  const H = headH + lines.length * rowH + footH;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#FDF8F3";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#0F1A33";
  ctx.fillRect(0, 0, W, headH);
  ctx.fillStyle = "#D4A853";
  ctx.font = "bold 44px sans-serif";
  ctx.fillText(shopName, 40, 70);
  ctx.fillStyle = "#FDF8F3";
  ctx.font = "26px sans-serif";
  ctx.fillText("Récapitulatif de commande", 40, 112);

  let y = headH;
  const photos = await Promise.all(lines.map((l) => loadImage(l.image)));
  lines.forEach((l, i) => {
    const top = y + 15;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(30, top, W - 60, rowH - 30);
    const photo = photos[i];
    if (photo) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(45, top + 15, 90, 90);
      ctx.clip();
      const scale = Math.max(90 / photo.width, 90 / photo.height);
      const w = photo.width * scale;
      const h = photo.height * scale;
      ctx.drawImage(photo, 45 + (90 - w) / 2, top + 15 + (90 - h) / 2, w, h);
      ctx.restore();
    }
    ctx.fillStyle = "#0F1A33";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(wrap(ctx, l.name, 500)[0] ?? "", 160, top + 45);
    ctx.font = "24px sans-serif";
    ctx.fillStyle = "#555";
    ctx.fillText(`Quantité : ${l.qty}`, 160, top + 82);
    ctx.fillStyle = "#0F1A33";
    ctx.font = "bold 26px sans-serif";
    const price = formatFdj(l.price * l.qty);
    ctx.fillText(price, W - 60 - ctx.measureText(price).width, top + 82);
    y += rowH;
  });

  y += 10;
  ctx.fillStyle = "#0F1A33";
  ctx.font = "24px sans-serif";
  ctx.fillText(`Livraison : ${formatFdj(deliveryFee)}`, 45, y + 20);
  ctx.font = "bold 34px sans-serif";
  const grand = `Total : ${formatFdj(total + deliveryFee)}`;
  ctx.fillText(grand, W - 60 - ctx.measureText(grand).width, y + 22);
  if (paymentLabel) {
    ctx.font = "24px sans-serif";
    ctx.fillText(`Paiement : ${paymentLabel}`, 45, y + 60);
  }

  let cy = y + 110;
  ctx.font = "bold 26px sans-serif";
  ctx.fillText("Client", 45, cy);
  ctx.font = "24px sans-serif";
  for (const t of [customer.name, customer.phone, ...wrap(ctx, customer.address, W - 100)]) {
    if (!t) continue;
    cy += 34;
    ctx.fillText(t, 45, cy);
  }

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9));
}
