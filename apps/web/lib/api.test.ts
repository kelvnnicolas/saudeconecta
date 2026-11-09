import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import { MSG } from "./mensagens";

describe("ApiError", () => {
  it("401 vira aviso de sessão expirada, seja qual for o texto do servidor", () => {
    expect(new ApiError(401, "Token inválido ou expirado").message).toBe(MSG.sessaoExpirada);
  });

  it("429 e 5xx usam frases fixas do frontend", () => {
    expect(new ApiError(429, "Rate limit exceeded").message).toBe(MSG.muitasTentativas);
    expect(new ApiError(500, "Internal Server Error").message).toBe(MSG.servidor);
    expect(new ApiError(502, { code: "x", mensagem: "interno" }).message).toBe(MSG.servidor);
  });

  it("sem rede (status 0) usa a frase de conexão", () => {
    expect(new ApiError(0, MSG.semConexao).message).toBe(MSG.semConexao);
  });

  it("regra de negócio {code, mensagem}: mostra a mensagem e guarda o code", () => {
    const erro = new ApiError(409, { code: "limite_atingido", mensagem: "Você atingiu o limite.", uso: 5, limite: 5 });
    expect(erro.message).toBe("Você atingiu o limite.");
    expect(erro.code).toBe("limite_atingido");
    expect(erro.detail).toMatchObject({ uso: 5, limite: 5 });
  });

  it("403 sem mensagem diz que falta permissão; outros sem mensagem usam a frase genérica", () => {
    expect(new ApiError(403, null).message).toBe(MSG.semPermissao);
    expect(new ApiError(404, null).message).toBe(MSG.generica);
  });

  it("validação 422: campo obrigatório e dado inválido", () => {
    expect(new ApiError(422, [{ type: "missing", msg: "Field required" }]).message).toBe(MSG.camposObrigatorios);
    expect(new ApiError(422, [{ type: "string_too_long", msg: "String should have at most 5" }]).message).toBe(
      MSG.dadosInvalidos,
    );
    expect(new ApiError(422, [{ type: "value_error", msg: "Value error, Mensagem não pode ser vazia" }]).message).toBe(
      "Mensagem não pode ser vazia",
    );
  });
});
