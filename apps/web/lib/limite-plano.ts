import type { UsoMensal } from "./types";

export type ContextoLimite = "demanda" | "contato" | "geral";

export interface PlanoResumo {
  codigo: string;
  nome: string;
  limite_mensal: number | null;
}

export interface AcaoDoAviso {
  rotulo: string;
  href: string;
}

export interface TextoDoAviso {
  titulo: string;
  /** O que exatamente acabou. */
  oQueAcabou: string;
  /** Por que vale assinar, em vez de só pedir para "ver os planos". */
  beneficio: string;
  /** Quando volta, para quem não quer assinar agora. */
  renovacao: string | null;
  principal: AcaoDoAviso;
  /** Saída para quem não quer assinar agora. */
  alternativa: AcaoDoAviso;
}

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** A cota é do mês de calendário em UTC (decisão 15): renova no dia 1º do mês seguinte. */
export function proximaRenovacao(agora: Date = new Date()): string {
  const proximo = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() + 1, 1));
  return `1º de ${MESES[proximo.getUTCMonth()]}`;
}

const ALTERNATIVA: Record<ContextoLimite, AcaoDoAviso> = {
  demanda: { rotulo: "Ver minhas demandas", href: "/demandas" },
  contato: { rotulo: "Ver meus contatos", href: "/contatos" },
  geral: { rotulo: "Voltar à busca", href: "/buscar" },
};

function porCodigo(planos: PlanoResumo[], codigo: string) {
  return planos.find((p) => p.codigo === codigo);
}

/** Quanto cada plano libera, a partir do que a API devolve (nunca números escritos à mão). */
function descreverPlanos(planos: PlanoResumo[]): string | null {
  const essencial = porCodigo(planos, "essencial");
  const pro = porCodigo(planos, "pro");
  if (!essencial || !pro) return null;
  const faixa = (p: PlanoResumo) => (p.limite_mensal == null ? "não tem limite" : `permite até ${p.limite_mensal} por mês`);
  return `o ${essencial.nome} ${faixa(essencial)} e o ${pro.nome} ${faixa(pro)}`;
}

/** Texto do aviso de limite mensal atingido. Não promete nada que a tela não faça. */
export function montarAvisoDeLimite(entrada: {
  uso: UsoMensal;
  plano: PlanoResumo | null;
  planos: PlanoResumo[];
  contexto: ContextoLimite;
  agora?: Date;
}): TextoDoAviso {
  const { uso, plano, planos, contexto, agora } = entrada;
  const limite = uso.limite ?? uso.usado;
  const renovacao = `Seu limite renova em ${proximaRenovacao(agora)}.`;
  const alternativa = ALTERNATIVA[contexto];

  if (plano) {
    const pro = porCodigo(planos, "pro");
    return {
      titulo: "Limite mensal atingido",
      oQueAcabou: `Você utilizou os ${limite} usos do plano ${plano.nome} neste mês, entre demandas publicadas e contatos iniciados.`,
      beneficio:
        pro && pro.codigo !== plano.codigo
          ? `Mude para o plano ${pro.nome} e continue encontrando profissionais de saúde sem limite.`
          : "Fale com a gente para ampliar o seu limite.",
      renovacao,
      principal: { rotulo: "Gerenciar assinatura", href: "/assinatura" },
      alternativa,
    };
  }

  const comparacao = descreverPlanos(planos);
  return {
    titulo: "Limite mensal atingido",
    oQueAcabou: `Você utilizou os ${limite} usos gratuitos deste mês, entre demandas publicadas e contatos iniciados.`,
    beneficio: comparacao
      ? `Para continuar encontrando profissionais de saúde, conheça os planos do SaúdeConecta: ${comparacao}.`
      : "Para continuar encontrando profissionais de saúde, conheça os planos do SaúdeConecta e escolha a opção ideal para a sua empresa.",
    renovacao,
    principal: { rotulo: "Conhecer os planos", href: "/empresa/planos" },
    alternativa,
  };
}

/** Texto do aviso quando a assinatura está com pagamento pendente (402). */
export function montarAvisoDePagamento(contexto: ContextoLimite): TextoDoAviso {
  return {
    titulo: "Pagamento pendente",
    oQueAcabou: "Não conseguimos cobrar a sua assinatura, então novos contatos e demandas estão pausados.",
    beneficio: "Atualize o cartão para voltar a publicar demandas e iniciar contatos agora mesmo.",
    renovacao: null,
    principal: { rotulo: "Atualizar pagamento", href: "/assinatura" },
    alternativa: ALTERNATIVA[contexto],
  };
}
