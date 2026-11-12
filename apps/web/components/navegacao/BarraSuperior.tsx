"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { useCurrentUser } from "@/lib/use-current-user";
import { useNotificacoes } from "@/lib/use-notificacoes";
import {
  contarPendencias,
  itemAtivo,
  navegacaoDoPapel,
  todosOsItens,
  type ItemNav,
  type Pendencias,
} from "@/lib/navegacao";
import { Contador } from "./Contador";
import { MenuEu } from "./MenuEu";

export const ALTURA_DA_BARRA_SUPERIOR = "4rem";

function ItemDesktop({ item, ativo, pendencias }: { item: ItemNav; ativo: boolean; pendencias: Pendencias }) {
  return (
    <Link
      href={item.href}
      aria-current={ativo ? "page" : undefined}
      className={`relative min-h-[44px] px-space-md rounded-full flex items-center gap-space-xs font-label-md text-label-md whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        ativo ? "text-primary font-semibold neu-inset-sm" : "text-on-surface-variant hover:text-on-surface"
      }`}
    >
      <MaterialIcon name={item.icone} filled={ativo} className="text-[22px]" />
      <span>{item.rotulo}</span>
      {item.indicador && <Contador total={pendencias[item.indicador]} className="top-0 left-6" />}
    </Link>
  );
}

/**
 * Barra fixa do topo. No desktop (≥1024 px): logo, navegação principal ao centro, mensagens,
 * notificações e menu pessoal. Abaixo disso: só logo, notificações e menu pessoal; a navegação
 * principal vai para a barra inferior.
 */
export function BarraSuperior() {
  const pathname = usePathname();
  const { papel, papelConfirmado } = useCurrentUser();
  const { itens } = useNotificacoes();
  const pendencias = contarPendencias(itens);
  const config = papelConfirmado ? navegacaoDoPapel(papel) : null;
  const ativo = config ? itemAtivo(pathname, todosOsItens(config)) : null;

  return (
    <header className="vidro-topo fixed top-0 inset-x-0 z-50 pt-safe">
      <div className="mx-auto max-w-5xl h-16 px-gutter flex items-center gap-space-sm">
        <span className="md:hidden">
          <Logo compact href="/inicio" rotulo="Ir para o início" />
        </span>
        <span className="hidden md:block">
          <Logo href="/inicio" rotulo="Ir para o início" />
        </span>

        {config && (
          <nav aria-label="Principal" className="hidden lg:flex flex-1 items-center justify-center gap-space-xs">
            {config.principais.map((item) => (
              <ItemDesktop key={item.id} item={item} ativo={ativo?.id === item.id} pendencias={pendencias} />
            ))}
          </nav>
        )}

        <div className="ml-auto lg:ml-0 flex items-center gap-space-xs">
          {config?.acao && (
            <Link
              href={config.acao.href}
              aria-current={ativo?.id === config.acao.id ? "page" : undefined}
              className="vidro-acento hidden lg:flex h-11 px-space-md rounded-full items-center gap-space-xs font-label-md text-label-md whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <MaterialIcon name={config.acao.icone} className="text-[20px]" />
              {config.acao.rotulo}
            </Link>
          )}
          {config && (
            <div className="hidden lg:block">
              <ItemDesktop item={config.mensagens} ativo={ativo?.id === config.mensagens.id} pendencias={pendencias} />
            </div>
          )}
          <NotificationBell />
          <MenuEu />
        </div>
      </div>
    </header>
  );
}
