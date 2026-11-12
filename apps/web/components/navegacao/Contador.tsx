import { rotuloDoContador } from "@/lib/navegacao";

/** Bolinha de pendência. Só existe quando há algo para responder; leitores de tela ouvem o número. */
export function Contador({ total, className = "" }: { total: number; className?: string }) {
  const rotulo = rotuloDoContador(total);
  if (!rotulo) return null;
  return (
    <>
      <span
        aria-hidden="true"
        className={`absolute min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error text-[10px] font-label-sm flex items-center justify-center ${className}`}
      >
        {rotulo}
      </span>
      <span className="sr-only">{total === 1 ? "1 pendente" : `${total} pendentes`}</span>
    </>
  );
}
