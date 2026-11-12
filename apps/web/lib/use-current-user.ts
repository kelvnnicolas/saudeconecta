"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSession, onAuthStateChange } from "./supabase-client";
import { api } from "./api";
import type { EmpresaRead, Papel, ProfissionalRead } from "./types";

interface CurrentUserState {
  loading: boolean;
  session: Session | null;
  /**
   * Papel usado pelo app. Quando o perfil carrega, é o papel que o SERVIDOR tem para este
   * usuário (existe linha em profissionais ou em empresas); antes disso, ou sem perfil, cai
   * no `user_metadata.papel`, que o próprio usuário consegue editar e por isso não vale como
   * prova de nada.
   */
  papel: Papel;
  /** true só quando o perfil do papel veio da API: é o que libera a navegação por papel. */
  papelConfirmado: boolean;
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
  papelConfirmado: false,
  profissional: null,
  empresa: null,
};

/**
 * Estado compartilhado por TODA a aba, não por componente. Cada tela usa
 * useCurrentUser() de forma independente (layout de auth-guard, barras de navegação,
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
  const papelDoMetadata: Papel =
    session.user.user_metadata?.papel === "empresa" ? "empresa" : "profissional";
  // Na primeira carga publica a sessão antes do perfil: quem só precisa saber se há login
  // (header da landing) não espera a API, que no plano gratuito do Render pode demorar a
  // acordar. `loading` continua true até o perfil chegar, então as telas do painel seguem
  // esperando como antes. Em recargas (refresh, renovação do token) não repete, para não
  // desmontar a tela que está aberta.
  if (estado.loading && geracao === minhaGeracao) {
    emitir({
      loading: true,
      session,
      papel: papelDoMetadata,
      papelConfirmado: false,
      profissional: null,
      empresa: null,
    });
  }
  const userId = session.user.id;
  const buscar = {
    empresa: async () => ({ empresa: await api.getEmpresa(userId), profissional: null }),
    profissional: async () => ({ profissional: await api.getProfissional(userId), empresa: null }),
  };
  // Tenta primeiro o papel do metadata. Se não houver perfil desse papel, tenta o outro: o
  // servidor é quem diz qual é o papel de verdade (o metadata pode ter sido alterado).
  const ordem: Papel[] = papelDoMetadata === "empresa" ? ["empresa", "profissional"] : ["profissional", "empresa"];
  for (const papel of ordem) {
    try {
      const perfil = await buscar[papel]();
      if (geracao === minhaGeracao) {
        emitir({ loading: false, session, papel, papelConfirmado: true, ...perfil });
      }
      return;
    } catch {
      // sem perfil deste papel (ou API fora do ar): tenta o próximo
    }
  }
  // Perfil ainda não sincronizado (POST /auth/sync não rodou, ou
  // PUT /profissionais|empresas/me nunca foi chamado) — mantém a
  // sessão válida, só sem dado de profissional/empresa carregado.
  if (geracao === minhaGeracao) {
    emitir({
      loading: false,
      session,
      papel: papelDoMetadata,
      papelConfirmado: false,
      profissional: null,
      empresa: null,
    });
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
