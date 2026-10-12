// O CSS da fonte de ícones (Google Fonts) fixa `display: inline-block` fora das camadas do
// Tailwind e vence `hidden`/`sm:hidden`. Para esconder um ícone por tamanho de tela, use o
// modificador importante (`sm:!hidden`, `lg:!block`) ou esconda um elemento em volta.
export function MaterialIcon({
  name,
  className = "",
  filled = false,
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  );
}
