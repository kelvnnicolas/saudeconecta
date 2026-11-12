"use client";

import Link from "next/link";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { linkInterno } from "@/lib/navegacao";
import type { ContatoRead, NotificacaoRead, TipoNotificacao } from "@/lib/types";

export const CARTAO = "bg-surface-container-lowest rounded-2xl p-space-md neu-surface flex flex-col gap-space-sm";

export function TituloDeBloco({ id, children, href, rotuloLink }: { id: string; children: React.ReactNode; href?: string; rotuloLink?: string }) {
  return (
    <div className="flex items-center justify-between gap-space-sm">
      <h2 id={id} className="font-title-md text-title-md text-on-surface">
        {children}
      </h2>
      {href && (
        <Link href={href} className="font-label-sm text-label-sm text-primary min-h-[44px] flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg px-1">
          {rotuloLink ?? "Ver todas"}
        </Link>
      )}
    </div>
  );
}

/** O que pede resposta agora: notificações não lidas dos tipos que exigem uma ação da pessoa. */
export function Atencao({ notificacoes, tipos }: { notificacoes: NotificacaoRead[]; tipos: TipoNotificacao[] }) {
  const pendentes = notificacoes.filter((n) => !n.lida_em && tipos.includes(n.tipo)).slice(0, 4);
  if (pendentes.length === 0) return null;
  return (
    <section aria-labelledby="inicio-atencao" className={CARTAO}>
      <TituloDeBloco id="inicio-atencao">Precisa da sua atenção</TituloDeBloco>
      <ul className="flex flex-col gap-space-xs">
        {pendentes.map((n) => (
          <li key={n.id}>
            <Link
              href={linkInterno(n.link)}
              className="min-h-[44px] rounded-xl p-space-sm flex items-start gap-space-sm bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <MaterialIcon name={n.tipo === "nova_mensagem" ? "forum" : "mark_email_unread"} className="text-[20px] text-primary mt-0.5" />
              <span className="flex flex-col min-w-0">
                <span className="font-label-md text-label-md text-on-surface">{n.titulo}</span>
                <span className="font-caption text-caption text-on-surface-variant line-clamp-2">{n.corpo}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ConversasRecentes({
  contatos,
  carregando,
  nomeDaOutraParte,
}: {
  contatos: ContatoRead[];
  carregando: boolean;
  nomeDaOutraParte: (c: ContatoRead) => string;
}) {
  const recentes = contatos.slice(0, 3);
  return (
    <section aria-labelledby="inicio-conversas" className={CARTAO}>
      <TituloDeBloco id="inicio-conversas" href={contatos.length > 0 ? "/contatos" : undefined} rotuloLink="Abrir mensagens">
        Conversas recentes
      </TituloDeBloco>
      {carregando && <p className="font-caption text-caption text-on-surface-variant">Carregando...</p>}
      {!carregando && recentes.length === 0 && (
        <p className="font-body-md text-body-md text-on-surface-variant">Você ainda não tem conversas.</p>
      )}
      <ul className="flex flex-col gap-space-xs">
        {recentes.map((c) => (
          <li key={c.id}>
            <Link
              href={`/contatos/${c.id}`}
              className="min-h-[44px] rounded-xl px-space-sm py-space-xs flex flex-col hover:bg-primary-fixed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="font-label-md text-label-md text-on-surface truncate">{nomeDaOutraParte(c)}</span>
              <span className="font-caption text-caption text-on-surface-variant line-clamp-1">{c.mensagem}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
