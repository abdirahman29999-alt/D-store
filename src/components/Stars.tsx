import { Star } from "lucide-react";

/** Affiche une note sur 5 sous forme d'étoiles. */
export function Stars({
  rating,
  size = "size-4",
}: {
  rating: number;
  size?: string;
}) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Note ${rating} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = rating >= i - 0.5;
        return (
          <Star
            key={i}
            className={`${size} ${filled ? "fill-accent text-accent" : "text-muted-foreground/40"}`}
            strokeWidth={1.5}
          />
        );
      })}
    </div>
  );
}

/** Étoiles cliquables pour choisir une note. */
export function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          aria-label={`Donner la note ${i} sur 5`}
          className="active:scale-90 transition-transform"
        >
          <Star
            className={`size-6 ${i <= value ? "fill-accent text-accent" : "text-muted-foreground/40"}`}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}
