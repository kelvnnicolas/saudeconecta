"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MaterialIcon } from "./MaterialIcon";
import { useCurrentUser } from "@/lib/use-current-user";
import { api } from "@/lib/api";
import type { NotificacaoRead } from "@/lib/types";

export function NotificationBell() {
  const { session } = useCurrentUser();
  const [aberto, setAberto] = useState(false);
  const [notificacoes, setNotificacoes] = useState<NotificacaoRead[]>([]);
  const [totalNaoLidas, setTotalNaoLidas] = useState(0);

  useEffect(() => {
    if (!session) return;
    let cancelado = false;
    async function buscar() {
      try {
        const resposta = await api.listarNotificacoes({ limit: 10 });
        if (!cancelado) {
          setNotificacoes(resposta.items);
          setTotalNaoLidas(resposta.total_nao_lidas);
        }
      } catch {
        // poll silencioso — próxima tentativa em 20s
      }
    }
    buscar();
    const intervalo = setInterval(buscar, 20000);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [session]);

  async function marcarComoLida(id: number) {
    try {
      await api.marcarNotificacaoLida(id);
      setNotificacoes((atual) =>
        atual.map((n) => (n.id === id ? { ...n, lida_em: new Date().toISOString() } : n)),
      );
      setTotalNaoLidas((atual) => Math.max(0, atual - 1));
    } catch {
      // ignora — próximo poll corrige
    }
  }

  if (!session) return null;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notificações"
        onClick={() => setAberto((atual) => !atual)}
        className="relative w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-on-surface-variant neu-surface-sm neu-pressable"
      >
        <MaterialIcon name="notifications" />
        {totalNaoLidas > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error text-[10px] font-label-sm flex items-center justify-center">
            {totalNaoLidas > 9 ? "9+" : totalNaoLidas}
          </span>
        )}
      </button>
      {aberto && (
        <div className="absolute right-0 top-14 w-80 max-h-96 overflow-y-auto rounded-2xl neu-surface bg-surface-container-lowest p-space-sm flex flex-col gap-space-xs z-50">
          {notificacoes.length === 0 && (
            <p className="font-caption text-caption text-on-surface-variant text-center py-space-sm">
              Nenhuma notificação ainda.
            </p>
          )}
          {notificacoes.map((n) => (
            <Link
              key={n.id}
              href={n.link}
              onClick={() => {
                if (!n.lida_em) marcarComoLida(n.id);
                setAberto(false);
              }}
              className={`rounded-xl p-space-sm flex flex-col gap-0.5 ${
                n.lida_em ? "bg-transparent" : "bg-secondary-container/40"
              }`}
            >
              <span className="font-label-md text-label-md text-on-surface">{n.titulo}</span>
              <span className="font-caption text-caption text-on-surface-variant line-clamp-2">
                {n.corpo}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
