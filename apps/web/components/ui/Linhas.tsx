import Link from "next/link";
import { forwardRef, type ReactNode } from "react";
import { MaterialIcon } from "./MaterialIcon";

/*
 * Linhas de informação e de ajuste (F-035). Três níveis de texto:
 *   título da seção  → font-title-md, on-surface
 *   rótulo           → font-label-sm, on-surface-variant
 *   valor            → font-body-lg, on-surface
 * O ícone fica numa pastilha em tom da marca, para a leitura de relance.
 */

function Pastilha({ icone, perigosa = false }: { icone: string; perigosa?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
        perigosa ? "bg-error/10 text-error" : "bg-primary/10 text-primary"
      }`}
    >
      <MaterialIcon name={icone} className="text-[20px]" />
    </span>
  );
}

/** Título de seção com ícone, igual ao do perfil público. */
export function TituloSecao({ icone, children, id }: { icone: string; children: ReactNode; id?: string }) {
  return (
    <div className="flex items-center gap-space-xs">
      <span aria-hidden="true" className="flex text-primary">
        <MaterialIcon name={icone} className="text-[20px]" />
      </span>
      <h2 id={id} className="font-title-md text-title-md text-on-surface">
        {children}
      </h2>
    </div>
  );
}

/** Linha de leitura: ícone, rótulo em cima e valor embaixo. */
export function LinhaInfo({ icone, rotulo, children }: { icone: string; rotulo: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-space-sm py-space-xs">
      <Pastilha icone={icone} />
      <div className="min-w-0 flex-1 flex flex-col gap-0.5">
        <span className="font-label-sm text-label-sm text-on-surface-variant">{rotulo}</span>
        <div className="font-body-lg text-body-lg text-on-surface break-words">{children}</div>
      </div>
    </div>
  );
}

/** Etiqueta neutra (especialidades). Tom sobre o fundo, não token de superfície (T-018). */
export function Etiqueta({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center px-space-sm py-1 rounded-full bg-on-surface/[0.07] text-on-surface font-label-sm text-label-sm">
      {children}
    </span>
  );
}

/** Grupo de ajustes: rótulo pequeno acima e um cartão com linhas separadas por fio. */
export function GrupoAjustes({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-space-xs" aria-label={titulo}>
      <h2 className="px-space-sm font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">{titulo}</h2>
      <div className="bg-surface-container-lowest rounded-2xl neu-surface divide-y divide-outline-variant/60 overflow-hidden">
        {children}
      </div>
    </section>
  );
}

type ConteudoAjuste = {
  icone: string;
  nome: string;
  valor?: ReactNode;
  perigosa?: boolean;
  /** Mostra a seta: só quando a linha leva a algum lugar ou abre algo. */
  seta?: boolean;
};

function ConteudoLinhaAjuste({ icone, nome, valor, perigosa, seta }: ConteudoAjuste) {
  return (
    <>
      <Pastilha icone={icone} perigosa={perigosa} />
      <span className={`flex-1 min-w-0 font-body-lg text-body-lg ${perigosa ? "text-error" : "text-on-surface"}`}>{nome}</span>
      {valor != null && (
        <span className="min-w-0 max-w-[55%] truncate font-body-md text-body-md text-on-surface-variant text-right">{valor}</span>
      )}
      {seta && (
        <span aria-hidden="true" className="flex text-on-surface-variant">
          <MaterialIcon name="chevron_right" className="text-[20px]" />
        </span>
      )}
    </>
  );
}

const classeLinha =
  "w-full min-h-[60px] px-space-md py-space-xs flex items-center gap-space-sm text-left";
const classeInterativa =
  "transition-colors hover:bg-on-surface/[0.04] active:bg-on-surface/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary";

/** Linha só de leitura (sem seta). */
export function LinhaAjuste(props: Omit<ConteudoAjuste, "seta">) {
  return (
    <div className={classeLinha}>
      <ConteudoLinhaAjuste {...props} />
    </div>
  );
}

/** Linha que navega. */
export function LinhaAjusteLink({ href, ...props }: Omit<ConteudoAjuste, "seta"> & { href: string }) {
  return (
    <Link href={href} className={`${classeLinha} ${classeInterativa}`}>
      <ConteudoLinhaAjuste {...props} seta />
    </Link>
  );
}

/** Linha que abre algo (diálogo). forwardRef para servir de gatilho do Radix (asChild). */
export const LinhaAjusteBotao = forwardRef<
  HTMLButtonElement,
  Omit<ConteudoAjuste, "seta"> & React.ButtonHTMLAttributes<HTMLButtonElement> & { semSeta?: boolean }
>(function LinhaAjusteBotao({ icone, nome, valor, perigosa, semSeta, className = "", ...resto }, ref) {
  return (
    <button ref={ref} type="button" className={`${classeLinha} ${classeInterativa} ${className}`} {...resto}>
      <ConteudoLinhaAjuste icone={icone} nome={nome} valor={valor} perigosa={perigosa} seta={!semSeta} />
    </button>
  );
});
