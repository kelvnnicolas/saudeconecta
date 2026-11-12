"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { useCurrentUser } from "@/lib/use-current-user";
import { useNotificacoes } from "@/lib/use-notificacoes";
import { contarPendencias, itemAtivo, mostraBarraInferior, navegacaoDoPapel, todosOsItens } from "@/lib/navegacao";
import { Contador } from "./Contador";

/**
 * Barra fixa de baixo (celular e tablet, até 1023 px): os itens prioritários do papel, vindos da
 * mesma configuração da barra superior. Notificações e menu pessoal ficam no cabeçalho.
 */
export function BarraInferior() {
  const pathname = usePathname();
  const { papel, papelConfirmado } = useCurrentUser();
  const { itens } = useNotificacoes();

  if (!papelConfirmado || !mostraBarraInferior(pathname)) return null;
  const config = navegacaoDoPapel(papel);
  const pendencias = contarPendencias(itens);
  const ativo = itemAtivo(pathname, todosOsItens(config));

  return (
    <nav aria-label="Principal, barra inferior" className="vidro-base fixed bottom-0 inset-x-0 z-50 pb-safe lg:hidden">
      <ul className="mx-auto max-w-5xl h-16 px-gutter-sm flex items-stretch justify-around">
        {config.barraInferior.map((item) => {
          const ehAtivo = ativo?.id === item.id;
          return (
            <li key={item.id} className="flex-1 min-w-0">
              <Link
                href={item.href}
                aria-current={ehAtivo ? "page" : undefined}
                className={`relative h-full min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl ${
                  ehAtivo ? "text-primary font-semibold" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span
                  className={`relative w-9 h-9 flex items-center justify-center rounded-full transition-shadow ${
                    item.destaque ? "bg-primary text-on-primary neu-surface-sm" : ehAtivo ? "neu-inset-sm" : ""
                  }`}
                >
                  <MaterialIcon name={item.icone} filled={ehAtivo && !item.destaque} />
                  {item.indicador && <Contador total={pendencias[item.indicador]} className="-top-1 -right-1" />}
                </span>
                <span className="font-caption text-caption text-center leading-none truncate max-w-full">
                  {item.rotuloCurto ?? item.rotulo}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
