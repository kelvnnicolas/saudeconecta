"use client";

import { useEffect } from "react";
import { api } from "./api";

/** O sino escuta este evento para atualizar o contador na hora, sem esperar o poll de 20 s. */
export const EVENTO_NOTIFICACOES_MUDARAM = "saudeconecta:notificacoes-mudaram";

/**
 * Ao abrir uma tela, marca como lidas as notificações que apontam para ela (`link`), mesmo
 * que a pessoa tenha chegado por outro caminho que não o sino. `null` = ainda não dá para saber.
 */
export function useNotificacoesLidasAoAbrir(link: string | null) {
  useEffect(() => {
    if (!link) return;
    let ativo = true;
    api
      .marcarNotificacoesLidasDoLink(link)
      .then(({ marcadas }) => {
        if (ativo && marcadas > 0) window.dispatchEvent(new Event(EVENTO_NOTIFICACOES_MUDARAM));
      })
      .catch(() => {
        // silencioso: o contador se corrige no próximo poll do sino
      });
    return () => {
      ativo = false;
    };
  }, [link]);
}
