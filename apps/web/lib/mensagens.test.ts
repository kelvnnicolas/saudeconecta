import { describe, expect, it } from "vitest";
import { MSG, avisoDeTipoDeConta, falhaAoCarregar, loginSocialFalhou } from "./mensagens";

describe("avisoDeTipoDeConta", () => {
  it("conta de profissional: convida a continuar como profissional e permite dispensar", () => {
    const aviso = avisoDeTipoDeConta("profissional");
    expect(aviso.titulo).toBe("Vamos continuar por aqui?");
    expect(aviso.descricao).toContain("conta de profissional de saúde");
    expect(aviso.rotulo).toBe("Continuar como profissional");
    expect(aviso.rotuloSecundario).toBe("Agora não");
  });

  it("conta de empresa: usa o rótulo 'empresa ou pessoa' da aba de login", () => {
    const aviso = avisoDeTipoDeConta("empresa");
    expect(aviso.rotulo).toBe("Continuar como empresa ou pessoa");
    expect(aviso.descricao).toContain("empresa ou pessoa");
    expect(aviso.rotuloSecundario).toBe("Agora não");
  });

  it("não expõe termos internos", () => {
    for (const papel of ["profissional", "empresa"] as const) {
      const { descricao } = avisoDeTipoDeConta(papel);
      expect(descricao).not.toMatch(/cadastro|papel|enum|token/i);
    }
  });
});

describe("frases com parâmetro", () => {
  it("login social indica o provedor e uma saída", () => {
    expect(loginSocialFalhou("Google")).toBe("Não conseguimos entrar com o Google. Tente de novo ou use e-mail e senha.");
  });
  it("falha de carregamento diz o que não carregou", () => {
    expect(falhaAoCarregar("seus contatos")).toContain("seus contatos");
  });
});

describe("MSG", () => {
  it("nenhuma mensagem expõe fornecedor, arquivo ou termo técnico", () => {
    for (const texto of Object.values(MSG)) {
      expect(texto).not.toMatch(/supabase|stripe|backend|\.env|token|http|enum/i);
    }
  });
});
