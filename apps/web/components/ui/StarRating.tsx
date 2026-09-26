import { MaterialIcon } from "./MaterialIcon";

export function StarRating({ nota, size = 16 }: { nota: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${nota} de 5 estrelas`}>
      {Array.from({ length: 5 }, (_, i) => (
        <MaterialIcon
          key={i}
          name="star"
          filled={i < Math.round(nota)}
          className={`text-[${size}px] ${i < Math.round(nota) ? "text-tertiary" : "text-outline-variant"}`}
        />
      ))}
    </div>
  );
}
