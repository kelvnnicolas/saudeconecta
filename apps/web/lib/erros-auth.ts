import { isAuthError } from "@supabase/supabase-js";

const MSG_PADRAO = "Não foi possível concluir. Tente novamente.";

const TRADUCOES: { quando: RegExp; mensagem: string }[] = [
  { quando: /invalid login credentials/i, mensagem: "E-mail ou senha incorretos." },
  { quando: /email not confirmed/i, mensagem: "Confirme seu e-mail antes de entrar. O link foi enviado para a sua caixa de entrada." },
  { quando: /already (been )?registered|already exists/i, mensagem: "Este e-mail já tem cadastro. Entre na sua conta ou recupere a senha." },
  {
    quando: /password should|weak password|password is too/i,
    mensagem: "Escolha uma senha mais forte: 8 caracteres ou mais, com maiúscula, minúscula, número e símbolo.",
  },
  { quando: /different from the old|should be different/i, mensagem: "A nova senha precisa ser diferente da atual." },
  { quando: /rate limit|security purposes|too many/i, mensagem: "Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo." },
  { quando: /failed to fetch|network|fetch failed/i, mensagem: "Não foi possível conectar. Verifique sua conexão e tente de novo." },
  { quando: /invalid email|unable to validate email/i, mensagem: "Informe um e-mail válido." },
  { quando: /signups? (not allowed|are disabled)/i, mensagem: "Cadastros estão indisponíveis no momento." },
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
