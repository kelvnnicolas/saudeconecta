import { AuthApiError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { mensagemDeErroAuth } from "./erros-auth";
import { MSG } from "./mensagens";

const authErro = (mensagem: string) => new AuthApiError(mensagem, 400, undefined);

describe("mensagemDeErroAuth", () => {
  it("traduz credenciais inválidas sem dizer qual dado está errado", () => {
    const texto = mensagemDeErroAuth(authErro("Invalid login credentials"));
    expect(texto).toBe(MSG.credenciaisIncorretas);
    expect(texto).toMatch(/e-mail ou senha/i);
  });

  it("traduz e-mail não confirmado, já cadastrado, senha fraca e senha repetida", () => {
    expect(mensagemDeErroAuth(authErro("Email not confirmed"))).toBe(MSG.emailNaoConfirmado);
    expect(mensagemDeErroAuth(authErro("User already registered"))).toBe(MSG.emailJaCadastrado);
    expect(mensagemDeErroAuth(authErro("Password should contain at least one character"))).toBe(MSG.senhaFraca);
    expect(mensagemDeErroAuth(authErro("New password should be different from the old password."))).toBe(
      MSG.senhaIgualAAtual,
    );
  });

  it("traduz limite de tentativas e falta de rede", () => {
    expect(mensagemDeErroAuth(authErro("email rate limit exceeded"))).toBe(MSG.muitasTentativas);
    expect(mensagemDeErroAuth(new TypeError("Failed to fetch"))).toBe(MSG.semConexao);
  });

  it("erro desconhecido do Auth cai na frase padrão recebida, nunca no texto em inglês", () => {
    expect(mensagemDeErroAuth(authErro("Something odd"), "Padrão da tela")).toBe("Padrão da tela");
  });

  it("erro do próprio app, já em português, passa como está", () => {
    expect(mensagemDeErroAuth(new Error(MSG.emailParaConfirmarNoCadastro))).toBe(MSG.emailParaConfirmarNoCadastro);
  });
});
