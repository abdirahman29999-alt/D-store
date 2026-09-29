import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function PaymentQr({ value, size = 128, label }: { value: string; size?: number; label?: string | undefined }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { width: size * 2, margin: 1 })
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => setSrc(""));
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!src) return <div className="rounded-lg bg-secondary animate-pulse" style={{ width: size, height: size }} />;

  return (
    <img
      src={src}
      alt={label ? `QR code de paiement ${label}` : "QR code de paiement"}
      width={size}
      height={size}
      className="rounded-lg border border-border bg-card p-1"
      style={{ width: size, height: size }}
    />
  );
}
