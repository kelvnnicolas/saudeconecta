import type { NotificacaoRead, Papel, TipoNotificacao } from "./types";

/**
 * Configuração ÚNICA da navegação (barra superior no desktop, barra inferior no celular e menu
 * "Eu"). Os componentes só leem daqui: nome, ícone, destino e quando o item fica ativo.
 *
 * Esconder um item NÃO é controle de acesso. Quem barra é o `ApenasPara` de cada rota e, de
 * verdade, a API. O campo `acesso` existe para o teste de consistência (navegacao.test.ts)
 * garantir que todo destino listado aqui tem a proteção correspondente.
 */

export type Acesso = "profissional" | "empresa" | "logado" | "publico" | "admin";

/** Fonte de cada contador. Só entram atividades que pedem uma resposta da pessoa. */
export type IndicadorId = "mensagens" | "propostas" | "demandas";

export interface ItemNav {
  id: string;
  rotulo: string;
  /** Versão curta para a barra inferior, onde cada item tem ~64 px. */
  rotuloCurto?: string;
  href: string;
  icone: string;
  /** Item de ação (publicar): ganha destaque na barra inferior. */
  destaque?: boolean;
  /** Rotas que deixam o item ativo. Vence o prefixo mais longo entre os itens do papel. */
  prefixos: string[];
  acesso: Acesso;
  indicador?: IndicadorId;
}

export interface ItemMenuEu {
  id: string;
  rotulo: string;
  href: string;
  icone: string;
  acesso: Acesso;
  /** Só aparece depois que o servidor confirmar o administrador (GET /admin/eu). */
  somenteAdmin?: boolean;
}

export interface ConfigNavegacao {
  papel: Papel;
  /** Rótulo curto do papel, mostrado no menu "Eu". */
  rotuloDoPapel: string;
  /** Centro da barra superior (desktop). */
  principais: ItemNav[];
  /** Direita da barra superior (desktop). */
  mensagens: ItemNav;
  /** Botão de destaque da barra superior, quando o papel tem uma ação principal. */
  acao?: ItemNav;
  /** Ordem da barra inferior (celular e tablet). */
  barraInferior: ItemNav[];
  menuEu: ItemMenuEu[];
}

const INICIO: ItemNav = {
  id: "inicio",
  rotulo: "Início",
  href: "/inicio",
  icone: "home",
  prefixos: ["/inicio"],
  acesso: "logado",
};

const MENSAGENS = (indicador?: IndicadorId): ItemNav => ({
  id: "mensagens",
  rotulo: "Mensagens",
  href: "/contatos",
  icone: "forum",
  prefixos: ["/contatos"],
  acesso: "logado",
  indicador,
});

const PROFISSIONAL: ConfigNavegacao = (() => {
  const oportunidades: ItemNav = {
    id: "oportunidades",
    rotulo: "Oportunidades",
    href: "/oportunidades",
    icone: "work",
    // O diretório de empresas é uma visão de "quem está contratando".
    prefixos: ["/oportunidades", "/empresas"],
    acesso: "profissional",
  };
  const propostas: ItemNav = {
    id: "propostas",
    rotulo: "Propostas",
    href: "/propostas",
    icone: "handshake",
    prefixos: ["/propostas"],
    acesso: "profissional",
    indicador: "propostas",
  };
  const mensagens = MENSAGENS("mensagens");
  return {
    papel: "profissional",
    rotuloDoPapel: "Profissional",
    principais: [INICIO, oportunidades, propostas],
    mensagens,
    barraInferior: [INICIO, oportunidades, propostas, mensagens],
    menuEu: [
      { id: "perfil", rotulo: "Meu perfil", href: "/perfil", icone: "person", acesso: "logado" },
      {
        id: "registro",
        rotulo: "Registro e verificação",
        href: "/perfil#registro",
        icone: "verified",
        acesso: "logado",
      },
      {
        id: "avaliacoes",
        rotulo: "Avaliações e reputação",
        href: "/avaliacoes",
        icone: "star",
        acesso: "profissional",
      },
      {
        id: "configuracoes",
        rotulo: "Configurações",
        href: "/perfil/configuracoes",
        icone: "settings",
        acesso: "logado",
      },
    ],
  };
})();

const EMPRESA: ConfigNavegacao = (() => {
  const demandas: ItemNav = {
    id: "demandas",
    rotulo: "Minhas demandas",
    rotuloCurto: "Demandas",
    href: "/demandas",
    icone: "assignment",
    prefixos: ["/demandas"],
    acesso: "empresa",
    indicador: "demandas",
  };
  const buscar: ItemNav = {
    id: "buscar",
    rotulo: "Buscar profissionais",
    rotuloCurto: "Buscar",
    href: "/buscar",
    icone: "person_search",
    // Abrir um contato e ver o perfil de um profissional fazem parte da busca.
    prefixos: ["/buscar", "/profissional", "/contato/novo"],
    acesso: "publico",
  };
  const publicar: ItemNav = {
    id: "publicar",
    rotulo: "Publicar",
    href: "/demandas/nova",
    icone: "add",
    destaque: true,
    prefixos: ["/demandas/nova"],
    acesso: "empresa",
  };
  const mensagens = MENSAGENS("mensagens");
  return {
    papel: "empresa",
    rotuloDoPapel: "Empresa",
    principais: [INICIO, demandas, buscar],
    mensagens,
    acao: { ...publicar, rotulo: "Publicar demanda" },
    // O destino central é a ação que a empresa mais repete, como o "Publicar" do LinkedIn.
    barraInferior: [INICIO, demandas, publicar, buscar, mensagens],
    menuEu: [
      { id: "perfil", rotulo: "Perfil da organização", href: "/perfil", icone: "apartment", acesso: "logado" },
      {
        id: "assinatura",
        rotulo: "Assinatura e plano",
        href: "/assinatura",
        icone: "credit_card",
        acesso: "empresa",
      },
      {
        id: "configuracoes",
        rotulo: "Configurações",
        href: "/perfil/configuracoes",
        icone: "settings",
        acesso: "logado",
      },
    ],
  };
})();

/** Entrada do administrador. Aparece só no menu "Eu", nunca nas barras principais. */
export const ITEM_ADMIN: ItemMenuEu = {
  id: "admin-verificacoes",
  rotulo: "Verificações de registro",
  href: "/admin/verificacoes",
  icone: "verified_user",
  acesso: "admin",
  somenteAdmin: true,
};

export function navegacaoDoPapel(papel: Papel): ConfigNavegacao {
  return papel === "empresa" ? EMPRESA : PROFISSIONAL;
}

/** Todos os itens de menu do papel, na ordem de exibição, já com a entrada do administrador. */
export function itensDoMenuEu(papel: Papel, ehAdmin: boolean): ItemMenuEu[] {
  const base = navegacaoDoPapel(papel).menuEu;
  return ehAdmin ? [...base, ITEM_ADMIN] : base;
}

function combina(pathname: string, prefixo: string): boolean {
  return pathname === prefixo || pathname.startsWith(`${prefixo}/`);
}

/** Item ativo para a rota atual: o prefixo mais específico entre todos os itens da barra. */
export function itemAtivo(pathname: string, itens: ItemNav[]): ItemNav | null {
  let melhor: ItemNav | null = null;
  let tamanho = -1;
  for (const item of itens) {
    for (const prefixo of item.prefixos) {
      if (combina(pathname, prefixo) && prefixo.length > tamanho) {
        melhor = item;
        tamanho = prefixo.length;
      }
    }
  }
  return melhor;
}

/** Itens da barra superior + mensagens + ação, para calcular o ativo de uma vez só. */
export function todosOsItens(config: ConfigNavegacao): ItemNav[] {
  return [...config.barraInferior, ...config.principais, config.mensagens, ...(config.acao ? [config.acao] : [])];
}

/**
 * Telas de tarefa (formulário, conversa, perfil com botão de contato) têm barra de ação própria
 * ou campo de texto no rodapé: a barra inferior sai para não cobrir. A superior continua.
 */
const TELAS_DE_TAREFA = ["/demandas/nova", "/contato/novo", "/assinatura", "/profissional"];

export function mostraBarraInferior(pathname: string): boolean {
  if (TELAS_DE_TAREFA.some((t) => combina(pathname, t))) return false;
  // Conversa aberta: /contatos/<id> (a lista /contatos mantém a barra).
  return !/^\/contatos\/[^/]+/.test(pathname);
}

/** O avatar fica "ativo" nas telas que moram no menu Eu. */
export function menuEuAtivo(pathname: string, papel: Papel): boolean {
  const destinos = [...navegacaoDoPapel(papel).menuEu, ITEM_ADMIN].map((i) => i.href.split("#")[0] ?? i.href);
  return destinos.some((d) => combina(pathname, d));
}

// ---------------------------------------------------------------------------------------------
// Contadores: só o que pede resposta e só com dados que a API já entrega (GET /notificacoes).
// ---------------------------------------------------------------------------------------------

export type Pendencias = Record<IndicadorId, number>;

const TIPO_POR_INDICADOR: Record<IndicadorId, TipoNotificacao[]> = {
  // Conversa com mensagem nova.
  mensagens: ["nova_mensagem"],
  // Contato recebido por quem foi procurado: convite aguardando resposta (profissional).
  propostas: ["novo_contato"],
  // Interesse novo em uma demanda publicada (empresa).
  demandas: ["novo_interesse"],
};

/**
 * Conta notificações NÃO lidas por indicador. Ficam de fora, de propósito, oportunidade nova,
 * aceite, aviso de cota e pagamento: informam, mas não pedem resposta (o sino já mostra todas).
 * A contagem olha as notificações carregadas (as mais recentes); se houver mais não lidas do
 * que o lote, o número pode ficar abaixo do real. A notificação some do contador ao abrir a
 * conversa (use-notificacoes-lidas-ao-abrir), não quando a resposta é enviada.
 */
export function contarPendencias(notificacoes: NotificacaoRead[]): Pendencias {
  const resultado: Pendencias = { mensagens: 0, propostas: 0, demandas: 0 };
  for (const n of notificacoes) {
    if (n.lida_em) continue;
    for (const id of Object.keys(TIPO_POR_INDICADOR) as IndicadorId[]) {
      if (TIPO_POR_INDICADOR[id].includes(n.tipo)) resultado[id] += 1;
    }
  }
  return resultado;
}

/** Texto do contador: some quando é zero e limita em 9+. */
export function rotuloDoContador(total: number): string | null {
  if (total <= 0) return null;
  return total > 9 ? "9+" : String(total);
}

// ---------------------------------------------------------------------------------------------
// Link vindo de notificação: só caminho interno do próprio app.
// ---------------------------------------------------------------------------------------------

export function linkInterno(link: string | null | undefined, padrao = "/inicio"): string {
  if (typeof link !== "string") return padrao;
  const seguro =
    link.startsWith("/") &&
    !link.startsWith("//") &&
    !link.includes("\\") &&
    // eslint-disable-next-line no-control-regex
    !/[\u0000-\u001f\u007f]/.test(link);
  return seguro ? link : padrao;
}
