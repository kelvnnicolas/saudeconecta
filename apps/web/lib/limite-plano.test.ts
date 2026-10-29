import { describe, expect, it } from "vitest";
import { montarAvisoDeLimite, montarAvisoDePagamento, type PlanoResumo } from "./limite-plano";

const essencial: PlanoResumo = { codigo: "essencial", nome: "Essencial", limite_mensal: 50 };
const pro: PlanoResumo = { codigo: "pro", nome: "Pro", limite_mensal: null };
const agora = new Date(Date.UTC(2026, 9, 22));

describe("montarAvisoDeLimite", () => {
  it("plano gratuito: usa o número da API, compara os planos e leva a /empresa/planos", () => {
    const texto = montarAvisoDeLimite({
      uso: { usado: 5, limite: 5 },
      plano: null,
      planos: [essencial, pro],
      contexto: "demanda",
      agora,
    });
    expect(texto.titulo).toBe("Você atingiu o limite do mês");
    expect(texto.oQueAcabou).toBe("Você usou os 5 contatos e demandas gratuitos deste mês.");
    expect(texto.beneficio).toBe("Quer continuar antes disso? O Essencial permite até 50 por mês e o Pro não tem limite.");
    expect(texto.renovacao).toBe("Seu limite renova em 1º de novembro.");
    expect(texto.principal).toEqual({ rotulo: "Ver os planos", href: "/empresa/planos" });
    expect(texto.alternativa.href).toBe("/demandas");
  });

  it("plano gratuito sem lista de planos: não inventa números", () => {
    const texto = montarAvisoDeLimite({ uso: { usado: 5, limite: 5 }, plano: null, planos: [], contexto: "geral", agora });
    expect(texto.beneficio).toBe("Quer continuar antes disso? Veja os planos do SaúdeConecta.");
    expect(texto.beneficio).not.toMatch(/\d/);
  });

  it("Essencial: sugere o Pro e leva a /assinatura", () => {
    const texto = montarAvisoDeLimite({
      uso: { usado: 50, limite: 50 },
      plano: essencial,
      planos: [essencial, pro],
      contexto: "contato",
      agora,
    });
    expect(texto.oQueAcabou).toBe("Você usou os 50 contatos e demandas do plano Essencial neste mês.");
    expect(texto.beneficio).toBe("Quer continuar antes disso? O plano Pro não tem limite.");
    expect(texto.principal.href).toBe("/assinatura");
  });

  it("sem Pro na lista: não manda 'falar com a gente' (não há canal de contato)", () => {
    const texto = montarAvisoDeLimite({ uso: { usado: 50, limite: 50 }, plano: essencial, planos: [], contexto: "geral", agora });
    expect(texto.beneficio).toBe("Veja as opções da sua assinatura.");
  });

  it("evita jargão e promessas de efeito imediato", () => {
    const textos = [
      montarAvisoDeLimite({ uso: { usado: 5, limite: 5 }, plano: null, planos: [essencial, pro], contexto: "geral", agora }),
      montarAvisoDePagamento("geral"),
    ];
    for (const t of textos) {
      expect(JSON.stringify(t)).not.toMatch(/\busos?\b|agora mesmo|fale com a gente/i);
    }
  });
});

describe("montarAvisoDePagamento", () => {
  it("diz o que aconteceu e leva a atualizar o pagamento", () => {
    const texto = montarAvisoDePagamento("contato");
    expect(texto.titulo).toBe("Pagamento pendente");
    expect(texto.beneficio).toBe("Atualize o cartão para voltar a publicar demandas e iniciar contatos.");
    expect(texto.principal).toEqual({ rotulo: "Atualizar pagamento", href: "/assinatura" });
  });
});
