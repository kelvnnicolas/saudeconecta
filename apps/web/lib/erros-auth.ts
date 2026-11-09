import { isAuthError } from "@supabase/supabase-js";
import { MSG } from "./mensagens";

const MSG_PADRAO = MSG.generica;

const TRADUCOES: { quando: RegExp; mensagem: string }[] = [
  { quando: /invalid login credentials/i, mensagem: MSG.credenciaisIncorretas },
  { quando: /email not confirmed/i, mensagem: MSG.emailNaoConfirmado },
  { quando: /already (been )?registered|already exists/i, mensagem: MSG.emailJaCadastrado },
  // Antes da senha fraca: a frase do Supabase "New password should be different…" também casa com /password should/.
  { quando: /different from the old|should be different/i, mensagem: MSG.senhaIgualAAtual },
  { quando: /password should|weak password|password is too/i, mensagem: MSG.senhaFraca },
  { quando: /rate limit|security purposes|too many/i, mensagem: MSG.muitasTentativas },
  { quando: /failed to fetch|network|fetch failed/i, mensagem: MSG.semConexao },
  { quando: /invalid email|unable to validate email/i, mensagem: MSG.emailInvalido },
  { quando: /signups? (not allowed|are disabled)/i, mensagem: MSG.cadastrosFechados },
];

/**
 * Mensagens do Supabase Auth vêm em inglês. Traduz as conhecidas e cai numa frase
 * neutra nas desconhecidas. Erros do próprio app (já em português) passam como estão.
 */
export function mensagemDeErroAuth(erro: unknown, padrao: string = MSG_PADRAO): string {
  const texto = erro instanceof Error ? erro.message : "";
  const traducao = TRADUCOES.find((t) => t.quando.test(texto));
  if (traducao) return traducao.mensagem;
  if (isAuthError(erro) || erro instanceof TypeError) return padrao;
  return texto || padrao;
}
