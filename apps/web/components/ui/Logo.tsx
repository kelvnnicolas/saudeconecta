import Link from "next/link";

// Marca vetorial original (cruz médica em 4 pétalas), extraída de
// docs/design/telas/_assets antes do zip fonte do Stitch ser removido —
// mesma arte, sem depender de nenhum arquivo externo.
function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none" className="flex-shrink-0" aria-hidden="true">
      <g transform="translate(6, 6)">
        <path d="M 24 4 C 18 4 14 8 14 14 C 14 20 18 24 24 24 C 30 24 34 20 34 14 C 34 8 30 4 24 4 Z" fill="#6366F1" />
        <path d="M 24 24 C 18 24 14 28 14 34 C 14 40 18 44 24 44 C 30 44 34 40 34 34 C 34 28 30 24 24 24 Z" fill="#3B82F6" />
        <path d="M 14 14 C 8 14 4 18 4 24 C 4 30 8 34 14 34 C 20 34 24 30 24 24 C 24 18 20 14 14 14 Z" fill="#A855F7" />
        <path d="M 34 14 C 28 14 24 18 24 24 C 24 30 28 34 34 34 C 40 34 44 30 44 24 C 44 18 40 14 34 14 Z" fill="#14B8A6" />
        <circle cx="24" cy="24" r="5" fill="#ffffff" />
      </g>
    </svg>
  );
}

/**
 * Logo clicável — atalho para "/" (landing) em qualquer tela. `compact` usa
 * só a marca (pra caber ao lado do título nas telas internas, no Header);
 * sem `compact`, mostra marca + "SaúdeConecta" (telas de entrada: landing,
 * busca, login).
 */
export function Logo({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Ir para a página inicial"
      className={`inline-flex items-center gap-2 flex-shrink-0 ${className}`}
    >
      <LogoMark size={compact ? 20 : 28} />
      {!compact && (
        <span className="font-headline-md text-headline-md font-bold text-on-surface whitespace-nowrap">
          Saúde<span className="text-primary">Conecta</span>
        </span>
      )}
    </Link>
  );
}
