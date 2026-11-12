"use client";

import { useEffect, useSyncExternalStore } from "react";
import { api } from "./api";
import { useCurrentUser } from "./use-current-user";

/**
 * Pergunta ao servidor (GET /admin/eu) se a pessoa logada é administradora. Administrador não
 * é um papel do app: é uma linha na tabela `administradores`, conferida pela API a cada chamada.
 *
 * - Uma consulta por pessoa e por aba, compartilhada por todos os componentes (a rota tem
 *   limite de 60 por minuto e responde 403 a quem não é admin).
 * - Fecha para o lado seguro: 403, erro de rede ou qualquer dúvida valem "não é admin".
 * - O resultado só decide se um LINK aparece. Nunca libera nada: a API barra quem não é admin.
 * - Não é guardado no navegador (nem localStorage, nem metadata) e é descartado ao trocar de
 *   conta ou sair.
 */

type Resultado = "desconhecido" | "sim" | "nao";

let usuario: string | null = null;
let resultado: Resultado = "desconhecido";
let geracao = 0;
const ouvintes = new Set<() => void>();

function emitir(novo: Resultado) {
  resultado = novo;
  ouvintes.forEach((o) => o());
}

function consultar(userId: string) {
  if (usuario === userId) return; // já consultou (ou está consultando) para esta pessoa
  usuario = userId;
  geracao += 1;
  const minhaGeracao = geracao;
  emitir("desconhecido");
  api
    .adminEu()
    .then(() => minhaGeracao === geracao && emitir("sim"))
    .catch(() => minhaGeracao === geracao && emitir("nao"));
}

function esquecer() {
  if (usuario === null) return;
  usuario = null;
  geracao += 1;
  emitir("desconhecido");
}

function assinar(fn: () => void) {
  ouvintes.add(fn);
  return () => {
    ouvintes.delete(fn);
  };
}

/** "desconhecido" enquanto consulta (ou sem login); a interface trata como "não" até confirmar. */
export function useResultadoAdmin(): Resultado {
  const { session, loading } = useCurrentUser();
  const userId = session?.user.id ?? null;

  useEffect(() => {
    // Só pergunta depois que o carregamento do perfil terminou, para não competir com ele.
    if (userId && !loading) consultar(userId);
    else if (!userId && !loading) esquecer();
  }, [userId, loading]);

  return useSyncExternalStore(
    assinar,
    () => resultado,
    () => "desconhecido" as Resultado,
  );
}

export function useEhAdmin(): boolean {
  return useResultadoAdmin() === "sim";
}
