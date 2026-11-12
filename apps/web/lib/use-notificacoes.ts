"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { api } from "./api";
import { EVENTO_NOTIFICACOES_MUDARAM } from "./use-notificacoes-lidas-ao-abrir";
import { useCurrentUser } from "./use-current-user";
import type { NotificacaoRead } from "./types";

/**
 * Notificações da pessoa logada, carregadas UMA vez por aba e compartilhadas pelo sino, pelas
 * barras de navegação e pela tela inicial. Antes só o sino buscava; com mais consumidores,
 * cada um com seu intervalo estouraria o limite de 30 requisições por minuto da API.
 *
 * O poll só roda enquanto houver quem use (contagem de usos) e o estado é descartado quando
 * muda a pessoa logada, para ninguém ver o contador de quem saiu.
 */

// Mais que a lista do sino (10) para o contador por tipo enxergar mensagens e convites antigos.
const TAMANHO_DO_LOTE = 50;
const INTERVALO_MS = 20_000;

interface Estado {
  itens: NotificacaoRead[];
  totalNaoLidas: number;
  carregado: boolean;
}

const VAZIO: Estado = { itens: [], totalNaoLidas: 0, carregado: false };

let estado: Estado = VAZIO;
let usuario: string | null = null;
let usos = 0;
let intervalo: ReturnType<typeof setInterval> | null = null;
let geracao = 0;
const ouvintes = new Set<() => void>();

function emitir(novo: Estado) {
  estado = novo;
  ouvintes.forEach((o) => o());
}

async function buscar() {
  const minhaGeracao = geracao;
  try {
    const resposta = await api.listarNotificacoes({ limit: TAMANHO_DO_LOTE });
    if (minhaGeracao !== geracao) return; // outra pessoa entrou enquanto a resposta vinha
    emitir({ itens: resposta.items, totalNaoLidas: resposta.total_nao_lidas, carregado: true });
  } catch {
    // poll silencioso — próxima tentativa em 20 s
  }
}

function aoMudar() {
  void buscar();
}

function iniciar() {
  void buscar();
  intervalo = setInterval(buscar, INTERVALO_MS);
  window.addEventListener(EVENTO_NOTIFICACOES_MUDARAM, aoMudar);
}

function parar() {
  if (intervalo) clearInterval(intervalo);
  intervalo = null;
  window.removeEventListener(EVENTO_NOTIFICACOES_MUDARAM, aoMudar);
}

function usar(userId: string) {
  if (usuario !== userId) {
    // Pessoa diferente: zera tudo e invalida respostas em voo.
    geracao += 1;
    usuario = userId;
    emitir(VAZIO);
    if (usos > 0) {
      parar();
      iniciar();
    }
  }
  usos += 1;
  if (usos === 1) iniciar();
  return () => {
    usos -= 1;
    if (usos === 0) parar();
  };
}

function assinar(fn: () => void) {
  ouvintes.add(fn);
  return () => {
    ouvintes.delete(fn);
  };
}

export function useNotificacoes() {
  const { session } = useCurrentUser();
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) {
      // Saiu da conta: nada de contador antigo na próxima entrada.
      if (usuario !== null) {
        geracao += 1;
        usuario = null;
        emitir(VAZIO);
      }
      return;
    }
    return usar(userId);
  }, [userId]);

  const atual = useSyncExternalStore(
    assinar,
    () => estado,
    () => VAZIO,
  );

  const marcarComoLida = useCallback(async (id: number) => {
    try {
      await api.marcarNotificacaoLida(id);
      emitir({
        ...estado,
        itens: estado.itens.map((n) => (n.id === id && !n.lida_em ? { ...n, lida_em: new Date().toISOString() } : n)),
        totalNaoLidas: Math.max(0, estado.totalNaoLidas - 1),
      });
    } catch {
      // ignora — próximo poll corrige
    }
  }, []);

  const marcarTodasComoLidas = useCallback(async () => {
    try {
      await api.marcarTodasNotificacoesLidas();
      emitir({
        ...estado,
        itens: estado.itens.map((n) => (n.lida_em ? n : { ...n, lida_em: new Date().toISOString() })),
        totalNaoLidas: 0,
      });
    } catch {
      // ignora — próximo poll corrige
    }
  }, []);

  return { ...atual, marcarComoLida, marcarTodasComoLidas };
}
