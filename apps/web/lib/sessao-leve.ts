import type { Papel } from "./types";

/**
 * Leitura barata da sessão, só para a landing: o header precisa saber se há alguém logado
 * e de qual tipo, mas importar `supabase-js` por isso pesa ~70 kB de JavaScript na página
 * mais pública do app (T-014). O Supabase guarda a sessão no localStorage em
 * `sb-<ref>-auth-token`; aqui só se lê esse JSON. Quem decide se a sessão vale de verdade
 * continua sendo o cliente completo, nas telas que precisam dela.
 */
export interface SessaoLeve {
  papel: Papel;
}

const CHAVE_DA_SESSAO = /^sb-.+-auth-token$/;

/** Interpreta o texto guardado pelo Supabase. Qualquer coisa fora do formato = sem sessão. */
export function interpretarSessaoGuardada(texto: string | null): SessaoLeve | null {
  if (!texto) return null;
  try {
    const dados = JSON.parse(texto) as {
      refresh_token?: unknown;
      user?: { user_metadata?: { papel?: unknown } };
    } | null;
    // Sem refresh_token o cliente não consegue manter nem renovar a sessão.
    if (!dados || typeof dados.refresh_token !== "string" || !dados.refresh_token) return null;
    // Mesma regra de lib/use-current-user.ts: só "empresa" é empresa, o resto é profissional.
    const papel: Papel = dados.user?.user_metadata?.papel === "empresa" ? "empresa" : "profissional";
    return { papel };
  } catch {
    return null;
  }
}

export function lerSessaoLeve(): SessaoLeve | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const chave = localStorage.key(i);
      if (chave && CHAVE_DA_SESSAO.test(chave)) {
        const sessao = interpretarSessaoGuardada(localStorage.getItem(chave));
        if (sessao) return sessao;
      }
    }
  } catch {
    // storage bloqueado (janela privada, política do navegador): trata como deslogado
  }
  return null;
}

export function ehChaveDeSessao(chave: string | null): boolean {
  return !!chave && CHAVE_DA_SESSAO.test(chave);
}
