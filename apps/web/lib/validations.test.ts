import { describe, expect, it } from "vitest";
import { cadastroEmpresaSchema, loginSchema, novaSenhaSchema } from "./validations/auth";
import { avaliacaoSchema, novoContatoSchema } from "./validations/contato";
import { criarDemandaSchema } from "./validations/demanda";

const mensagens = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.success ? [] : r.error!.issues.map((i) => i.message);

describe("validações em português", () => {
  it("mensagem de contato: curta demais e longa demais", () => {
    expect(mensagens(novoContatoSchema.safeParse({ mensagem: "oi" }))).toEqual([
      "Conte um pouco mais: use pelo menos 10 caracteres",
    ]);
    expect(mensagens(novoContatoSchema.safeParse({ mensagem: "a".repeat(1001) }))).toEqual([
      "Use no máximo 1.000 caracteres",
    ]);
  });

  it("comentário da avaliação acima de 500 não cai em inglês", () => {
    expect(mensagens(avaliacaoSchema.safeParse({ nota: 5, comentario: "a".repeat(501) }))).toEqual([
      "Use no máximo 500 caracteres",
    ]);
  });

  it("login: e-mail inválido e senha vazia", () => {
    expect(mensagens(loginSchema.safeParse({ email: "x", password: "" })).sort()).toEqual([
      "Informe sua senha",
      "Informe um e-mail válido",
    ]);
  });

  it("senha nova fraca diz o que falta", () => {
    expect(mensagens(novaSenhaSchema.safeParse({ password: "abc", confirmacao: "abc" }))).toEqual([
      "Falta na senha: 8 caracteres, letra maiúscula, número, símbolo",
    ]);
  });

  it("cadastro de empresa: UF e telefone orientam o preenchimento", () => {
    const r = cadastroEmpresaSchema.safeParse({
      nome: "Maria Souza",
      email: "m@e.com",
      telefone: "1",
      password: "Abcdef1!",
      confirmacao: "Abcdef1!",
      tipo: "pessoa_fisica",
      cidade: "Sao Paulo",
      estado: "S",
    });
    expect(mensagens(r).sort()).toEqual(["Informe a UF com 2 letras, como SP", "Informe um telefone com DDD"]);
  });

  it("demanda: valor zero e descrição longa", () => {
    const base = {
      especialidadeId: 1,
      cidade: "Recife",
      estado: "PE",
      dataInicio: "2026-11-01",
      turno: "Dia",
      descricao: "ok",
    };
    expect(mensagens(criarDemandaSchema.safeParse({ ...base, valorOferecido: "0" }))).toEqual([
      "Informe um valor maior que zero",
    ]);
    expect(mensagens(criarDemandaSchema.safeParse({ ...base, descricao: "a".repeat(501) }))).toEqual([
      "Use no máximo 500 caracteres",
    ]);
  });
});
