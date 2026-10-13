/**
 * Pré-preenchimento do cadastro de empresa vindo da landing.
 *
 * O e-mail digitado no cartão "comece pelo e-mail" vai por sessionStorage, não
 * pela URL: query string acaba em logs de servidor, histórico e analytics, e
 * e-mail é dado pessoal. O tipo de empresa (clinica, hospital...) não é dado
 * pessoal e vai como `?tipo=` para os cards da landing poderem ser links simples.
 */
export const CHAVE_EMAIL_CADASTRO = "saudeconecta:cadastro-email";

export function guardarEmailCadastro(email: string) {
  try {
    sessionStorage.setItem(CHAVE_EMAIL_CADASTRO, email);
  } catch {
    // navegação privada / storage bloqueado: o usuário só digita de novo
  }
}

/** Lê e apaga o e-mail guardado (uso único). */
export function consumirEmailCadastro(): string | null {
  try {
    const email = sessionStorage.getItem(CHAVE_EMAIL_CADASTRO);
    if (email) sessionStorage.removeItem(CHAVE_EMAIL_CADASTRO);
    return email;
  } catch {
    return null;
  }
}
