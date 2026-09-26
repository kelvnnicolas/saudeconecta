"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSession, onAuthStateChange } from "./supabase-client";
import { api } from "./api";
import type { EmpresaRead, Papel, ProfissionalRead } from "./types";

interface CurrentUserState {
  loading: boolean;
  session: Session | null;
  papel: Papel;
  profissional: ProfissionalRead | null;
  empresa: EmpresaRead | null;
}

interface CurrentUser extends CurrentUserState {
  /** Recarrega profissional/empresa da API — usar depois de um upload de avatar, por exemplo. */
  refresh: () => Promise<void>;
}

const ESTADO_INICIAL: CurrentUserState = {
  loading: true,
  session: null,
  papel: "profissional",
  profissional: null,
  empresa: null,
};

/**
 * Estado compartilhado por TODA a aba, não por componente. Cada tela usa
 * useCurrentUser() de forma independente (layout de auth-guard, BottomNav,
 * a própria página) — quando cada uma tinha seu próprio getSession()/
 * onAuthStateChange(), elas corriam separadamente contra a restauração
 * assíncrona da sessão do Supabase e podiam divergir: uma instância via a
 * sessão certa e outra, montada no mesmo instante, recebia null antes do
 * GoTrueClient terminar de ler o localStorage — foi isso que causava
 * /perfil mostrar "não sincronizado" com o profissional carregado certinho
 * no backend (confirmado ao vivo: o layout tinha sessão, a página não).
 * Com um único carregamento por aba e useSyncExternalStore, todo mundo lê
 * exatamente o mesmo resultado.
 */
let estado: CurrentUserState = ESTADO_INICIAL;
let geracao = 0;
const listeners = new Set<() => void>();

function emitir(novoEstado: CurrentUserState) {
  estado = novoEstado;
  listeners.forEach((l) => l());
}

async function carregar(session: Session | null) {
  const minhaGeracao = ++geracao;
  if (!session) {
    if (geracao === minhaGeracao) emitir({ ...ESTADO_INICIAL, loading: false });
    return;
  }
  const papel: Papel =
    session.user.user_metadata?.papel === "empresa" ? "empresa" : "profissional";
  try {
    if (papel === "empresa") {
      const empresa = await api.getEmpresa(session.user.id);
      if (geracao === minhaGeracao) emitir({ loading: false, session, papel, empresa, profissional: null });
    } else {
      const profissional = await api.getProfissional(session.user.id);
      if (geracao === minhaGeracao) emitir({ loading: false, session, papel, profissional, empresa: null });
    }
  } catch {
    // Perfil ainda não sincronizado (POST /auth/sync não rodou, ou
    // PUT /profissionais|empresas/me nunca foi chamado) — mantém a
    // sessão válida, só sem dado de profissional/empresa carregado.
    if (geracao === minhaGeracao) emitir({ loading: false, session, papel, profissional: null, empresa: null });
  }
}

let inicializado = false;
function garantirInicializado() {
  if (inicializado) return;
  inicializado = true;
  getSession().then(carregar);
  onAuthStateChange(carregar);
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getSnapshot() {
  return estado;
}

function getServerSnapshot() {
  return ESTADO_INICIAL;
}

export function useCurrentUser(): CurrentUser {
  garantirInicializado();
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const refresh = useCallback(async () => {
    await carregar(await getSession());
  }, []);

  return { ...state, refresh };
}
