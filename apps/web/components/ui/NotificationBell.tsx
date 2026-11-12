"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MaterialIcon } from "./MaterialIcon";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/lib/use-current-user";
import { useNotificacoes } from "@/lib/use-notificacoes";
import { EVENTO_NOTIFICACOES_MUDARAM } from "@/lib/use-notificacoes-lidas-ao-abrir";
import { linkInterno, NOTIFICACOES_POR_PAGINA, rotuloDoContador, totalDePaginas } from "@/lib/navegacao";
import type { NotificacaoRead } from "@/lib/types";

/**
 * Sino de notificações. O ícone mostra quantas não lidas há (até 10; acima disso, "10+").
 * Aberto, o pop-up lista as notificações em páginas de 10, buscadas na API só enquanto está aberto.
 */
export function NotificationBell() {
  const { session } = useCurrentUser();
  const { totalNaoLidas, marcarComoLida, marcarTodasComoLidas } = useNotificacoes();
  const [aberto, setAberto] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [itens, setItens] = useState<NotificacaoRead[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const paginas = totalDePaginas(total);
  const rotulo = rotuloDoContador(totalNaoLidas);

  const carregarPagina = useCallback(async (indice: number) => {
    setCarregando(true);
    try {
      const resposta = await api.listarNotificacoes({
        limit: NOTIFICACOES_POR_PAGINA,
        offset: indice * NOTIFICACOES_POR_PAGINA,
      });
      setItens(resposta.items);
      setTotal(resposta.total);
      setErro(false);
      // Se a última página esvaziou (itens removidos), volta para a que existe.
      const ultima = totalDePaginas(resposta.total) - 1;
      if (indice > ultima) setPagina(ultima);
    } catch {
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(evento: MouseEvent) {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) setAberto(false);
    }
    function aoPressionarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoPressionarTecla);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoPressionarTecla);
    };
  }, [aberto]);

  // Busca a página enquanto o pop-up está aberto e quando uma notificação nova chega.
  useEffect(() => {
    if (!aberto) return;
    void carregarPagina(pagina);
    const aoMudar = () => void carregarPagina(pagina);
    window.addEventListener(EVENTO_NOTIFICACOES_MUDARAM, aoMudar);
    return () => window.removeEventListener(EVENTO_NOTIFICACOES_MUDARAM, aoMudar);
  }, [aberto, pagina, carregarPagina]);

  function alternar() {
    setPagina(0);
    setAberto((atual) => !atual);
  }

  async function lerTodas() {
    await marcarTodasComoLidas();
    setItens((atual) => atual.map((n) => (n.lida_em ? n : { ...n, lida_em: new Date().toISOString() })));
  }

  if (!session) return null;

  return (
    <div className="relative" ref={raiz}>
      <button
        type="button"
        aria-label={totalNaoLidas > 0 ? `Notificações, ${totalNaoLidas} não lidas` : "Notificações"}
        aria-expanded={aberto}
        onClick={alternar}
        className="relative w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-on-surface-variant neu-surface-sm neu-pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <MaterialIcon name="notifications" />
        {rotulo && (
          <span
            aria-hidden="true"
            className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error text-[10px] font-label-sm flex items-center justify-center"
          >
            {rotulo}
          </span>
        )}
      </button>
      {aberto && (
        <div className="fixed left-4 right-4 top-[4.25rem] sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:w-80 max-h-[28rem] overflow-y-auto rounded-2xl neu-surface bg-surface-container-lowest p-space-sm flex flex-col gap-space-xs z-50">
          {totalNaoLidas > 0 && (
            <button
              type="button"
              onClick={lerTodas}
              className="self-end min-h-[44px] font-caption text-caption text-primary px-space-xs py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
            >
              Marcar todas como lidas
            </button>
          )}
          {erro && (
            <p className="font-caption text-caption text-error text-center py-space-sm">
              Não foi possível carregar as notificações.
            </p>
          )}
          {!erro && !carregando && itens.length === 0 && (
            <p className="font-caption text-caption text-on-surface-variant text-center py-space-sm">
              Nenhuma notificação ainda.
            </p>
          )}
          <div aria-busy={carregando} className={`flex flex-col gap-space-xs ${carregando ? "opacity-60" : ""}`}>
            {itens.map((n) => (
              <Link
                key={n.id}
                href={linkInterno(n.link)}
                onClick={() => {
                  if (!n.lida_em) void marcarComoLida(n.id);
                  setAberto(false);
                }}
                className={`rounded-xl p-space-sm flex flex-col gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  n.lida_em ? "bg-transparent" : "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
                }`}
              >
                <span className="font-label-md text-label-md text-on-surface">{n.titulo}</span>
                <span className="font-caption text-caption text-on-surface-variant line-clamp-2">{n.corpo}</span>
              </Link>
            ))}
          </div>
          {paginas > 1 && (
            <nav aria-label="Páginas de notificações" className="sticky bottom-0 flex items-center justify-between gap-space-xs pt-space-xs bg-surface-container-lowest">
              <button
                type="button"
                onClick={() => setPagina((p) => Math.max(0, p - 1))}
                disabled={pagina === 0 || carregando}
                aria-label="Página anterior"
                className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <MaterialIcon name="chevron_left" />
              </button>
              <span className="font-caption text-caption text-on-surface-variant" aria-live="polite">
                Página {pagina + 1} de {paginas}
              </span>
              <button
                type="button"
                onClick={() => setPagina((p) => Math.min(paginas - 1, p + 1))}
                disabled={pagina >= paginas - 1 || carregando}
                aria-label="Próxima página"
                className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <MaterialIcon name="chevron_right" />
              </button>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
