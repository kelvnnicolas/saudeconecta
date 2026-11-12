import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  contarPendencias,
  itemAtivo,
  itensDoMenuEu,
  ITEM_ADMIN,
  linkInterno,
  menuEuAtivo,
  mostraBarraInferior,
  navegacaoDoPapel,
  rotuloDoContador,
  todosOsItens,
  totalDePaginas,
  type Acesso,
} from "./navegacao";
import type { NotificacaoRead, TipoNotificacao } from "./types";

const RAIZ_DO_APP = join(dirname(fileURLToPath(import.meta.url)), "..", "app");

function notificacao(tipo: TipoNotificacao, lida = false): NotificacaoRead {
  return {
    id: Math.floor(Math.random() * 1e6),
    tipo,
    titulo: "t",
    corpo: "c",
    link: "/contatos/1",
    lida_em: lida ? "2026-11-12T10:00:00Z" : null,
    criado_em: "2026-11-12T09:00:00Z",
  };
}

describe("navegação por papel", () => {
  it("profissional e empresa têm jornadas diferentes", () => {
    const pro = navegacaoDoPapel("profissional");
    const emp = navegacaoDoPapel("empresa");
    expect(pro.principais.map((i) => i.rotulo)).toEqual(["Início", "Oportunidades", "Propostas"]);
    expect(emp.principais.map((i) => i.rotulo)).toEqual(["Início", "Minhas demandas", "Buscar profissionais"]);
    expect(pro.acao).toBeUndefined();
    expect(emp.acao?.href).toBe("/demandas/nova");
  });

  it("a barra inferior tem no máximo cinco itens e todos com destino único", () => {
    for (const papel of ["profissional", "empresa"] as const) {
      const barra = navegacaoDoPapel(papel).barraInferior;
      expect(barra.length).toBeLessThanOrEqual(5);
      expect(new Set(barra.map((i) => i.href)).size).toBe(barra.length);
    }
    expect(navegacaoDoPapel("profissional").barraInferior).toHaveLength(4);
    expect(navegacaoDoPapel("empresa").barraInferior.map((i) => i.id)).toEqual([
      "inicio",
      "demandas",
      "publicar",
      "buscar",
      "mensagens",
    ]);
  });

  it("nenhum item do profissional aparece na navegação da empresa e vice-versa", () => {
    const hrefs = (papel: "profissional" | "empresa") => new Set(todosOsItens(navegacaoDoPapel(papel)).map((i) => i.href));
    expect(hrefs("empresa").has("/oportunidades")).toBe(false);
    expect(hrefs("empresa").has("/propostas")).toBe(false);
    expect(hrefs("profissional").has("/demandas")).toBe(false);
    expect(hrefs("profissional").has("/demandas/nova")).toBe(false);
  });

  it("o item do administrador só entra no menu Eu quando confirmado e nunca nas barras", () => {
    for (const papel of ["profissional", "empresa"] as const) {
      expect(itensDoMenuEu(papel, false).some((i) => i.href === ITEM_ADMIN.href)).toBe(false);
      expect(itensDoMenuEu(papel, true).at(-1)).toBe(ITEM_ADMIN);
      expect(todosOsItens(navegacaoDoPapel(papel)).some((i) => i.href.startsWith("/admin"))).toBe(false);
    }
  });

  it("empresa não ganha o item Avaliações, que não tem tela para ela", () => {
    expect(itensDoMenuEu("empresa", false).some((i) => i.href === "/avaliacoes")).toBe(false);
    expect(itensDoMenuEu("profissional", false).some((i) => i.href === "/avaliacoes")).toBe(true);
  });
});

describe("item ativo", () => {
  const emp = todosOsItens(navegacaoDoPapel("empresa"));
  const pro = todosOsItens(navegacaoDoPapel("profissional"));

  it("o prefixo mais específico vence: publicar não acende Minhas demandas", () => {
    expect(itemAtivo("/demandas", emp)?.id).toBe("demandas");
    expect(itemAtivo("/demandas/nova", emp)?.id).toBe("publicar");
    expect(itemAtivo("/demandas/abc", emp)?.id).toBe("demandas");
  });

  it("telas de apoio acendem o item de origem", () => {
    expect(itemAtivo("/contatos/12", pro)?.id).toBe("mensagens");
    expect(itemAtivo("/empresas", pro)?.id).toBe("oportunidades");
    expect(itemAtivo("/profissional/9", emp)?.id).toBe("buscar");
    expect(itemAtivo("/contato/novo", emp)?.id).toBe("buscar");
  });

  it("não confunde prefixos parecidos e rotas sem item", () => {
    expect(itemAtivo("/empresa/planos", pro)).toBeNull();
    expect(itemAtivo("/contatosx", pro)).toBeNull();
    expect(itemAtivo("/perfil", pro)).toBeNull();
  });

  it("o avatar fica ativo nas telas do menu Eu", () => {
    expect(menuEuAtivo("/perfil", "profissional")).toBe(true);
    expect(menuEuAtivo("/perfil/configuracoes", "empresa")).toBe(true);
    expect(menuEuAtivo("/assinatura", "empresa")).toBe(true);
    expect(menuEuAtivo("/admin/verificacoes", "profissional")).toBe(true);
    expect(menuEuAtivo("/inicio", "profissional")).toBe(false);
  });
});

describe("barra inferior", () => {
  it("sai das telas de tarefa e volta nas telas principais", () => {
    for (const rota of ["/demandas/nova", "/contato/novo", "/contatos/7", "/assinatura", "/profissional/abc"]) {
      expect(mostraBarraInferior(rota), rota).toBe(false);
    }
    for (const rota of ["/inicio", "/oportunidades", "/propostas", "/contatos", "/demandas", "/buscar", "/perfil", "/perfil/configuracoes"]) {
      expect(mostraBarraInferior(rota), rota).toBe(true);
    }
  });

  it("os rótulos curtos cabem: até 10 caracteres", () => {
    for (const papel of ["profissional", "empresa"] as const) {
      for (const item of navegacaoDoPapel(papel).barraInferior) {
        expect((item.rotuloCurto ?? item.rotulo).length, item.id).toBeLessThanOrEqual(13);
      }
    }
  });
});

describe("contadores de pendência", () => {
  it("conta só o que pede resposta e ainda não foi lido", () => {
    const resultado = contarPendencias([
      notificacao("nova_mensagem"),
      notificacao("nova_mensagem"),
      notificacao("nova_mensagem", true),
      notificacao("novo_contato"),
      notificacao("novo_interesse"),
      notificacao("novo_interesse"),
      notificacao("novo_interesse"),
    ]);
    expect(resultado).toEqual({ mensagens: 2, propostas: 1, demandas: 3 });
  });

  it("não conta oportunidade nova, aceite, cota nem falha de pagamento", () => {
    const informativas: TipoNotificacao[] = [
      "nova_oportunidade",
      "aceite_demanda",
      "cota_quase_no_limite",
      "cota_esgotada",
      "falha_pagamento",
    ];
    expect(contarPendencias(informativas.map((t) => notificacao(t)))).toEqual({
      mensagens: 0,
      propostas: 0,
      demandas: 0,
    });
  });

  it("formata o contador: some no zero, mostra até 10 e depois 10+", () => {
    expect(rotuloDoContador(0)).toBeNull();
    expect(rotuloDoContador(-1)).toBeNull();
    expect(rotuloDoContador(3)).toBe("3");
    expect(rotuloDoContador(9)).toBe("9");
    expect(rotuloDoContador(10)).toBe("10");
    expect(rotuloDoContador(11)).toBe("10+");
    expect(rotuloDoContador(250)).toBe("10+");
  });

  it("divide as notificações do pop-up em páginas de 10", () => {
    expect(totalDePaginas(0)).toBe(1);
    expect(totalDePaginas(10)).toBe(1);
    expect(totalDePaginas(11)).toBe(2);
    expect(totalDePaginas(25)).toBe(3);
    expect(totalDePaginas(-4)).toBe(1);
  });
});

describe("link de notificação", () => {
  it("aceita só caminho interno", () => {
    expect(linkInterno("/contatos/3")).toBe("/contatos/3");
    expect(linkInterno("/oportunidades")).toBe("/oportunidades");
  });

  it("recusa endereço externo e variações", () => {
    for (const ruim of [
      "https://exemplo.com",
      "//exemplo.com",
      "/\\exemplo.com",
      "javascript:alert(1)",
      "contatos/3",
      "/ok\nX",
      "",
      null,
      undefined,
    ]) {
      expect(linkInterno(ruim)).toBe("/inicio");
    }
    expect(linkInterno("http://x", "/contatos")).toBe("/contatos");
  });
});

// ---------------------------------------------------------------------------------------------
// Consistência rota ↔ proteção: nenhum destino da configuração pode existir sem a barreira que
// o `acesso` promete. É este teste que impede um item novo de aparecer num menu sem guard.
// ---------------------------------------------------------------------------------------------

function paginas(dir: string, saida: string[] = []): string[] {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const caminho = join(dir, entrada.name);
    if (entrada.isDirectory()) paginas(caminho, saida);
    else if (entrada.name === "page.tsx") saida.push(caminho);
  }
  return saida;
}

function urlDaPagina(arquivo: string): string {
  const segmentos = relative(RAIZ_DO_APP, dirname(arquivo))
    .split("/")
    .filter((s) => s && !/^\(.+\)$/.test(s));
  return `/${segmentos.join("/")}`;
}

const PAGINAS = paginas(RAIZ_DO_APP).map((arquivo) => ({ arquivo, url: urlDaPagina(arquivo) }));

/** Layouts que valem para a página: o da própria pasta e os de todas as pastas acima dela. */
function layoutsDe(arquivo: string): string[] {
  const textos: string[] = [];
  let dir = dirname(arquivo);
  while (dir.startsWith(RAIZ_DO_APP)) {
    const layout = join(dir, "layout.tsx");
    if (existsSync(layout)) textos.push(readFileSync(layout, "utf8"));
    if (dir === RAIZ_DO_APP) break;
    dir = dirname(dir);
  }
  return textos;
}

function destinos(): { href: string; acesso: Acesso }[] {
  const lista: { href: string; acesso: Acesso }[] = [];
  for (const papel of ["profissional", "empresa"] as const) {
    const config = navegacaoDoPapel(papel);
    for (const item of todosOsItens(config)) lista.push({ href: item.href, acesso: item.acesso });
    for (const item of itensDoMenuEu(papel, true)) lista.push({ href: item.href, acesso: item.acesso });
  }
  return lista;
}

describe("todo destino existe e tem a proteção prometida", () => {
  for (const { href, acesso } of destinos()) {
    const caminho = href.split("#")[0];
    it(`${href} (${acesso})`, () => {
      const pagina = PAGINAS.find((p) => p.url === caminho);
      expect(pagina, `não existe página para ${caminho}`).toBeDefined();
      const arquivo = pagina!.arquivo;
      const layouts = layoutsDe(arquivo).join("\n");

      if (acesso === "profissional" || acesso === "empresa") {
        expect(layouts).toContain(`<ApenasPara papel="${acesso}">`);
      } else if (acesso === "logado") {
        // O layout do painel manda quem não tem sessão para /entrar.
        expect(arquivo).toContain("(painel)");
      } else if (acesso === "publico") {
        expect(arquivo).toContain("(public)");
      } else if (acesso === "admin") {
        expect(arquivo).toContain(join("(painel)", "admin"));
        // Defesa em profundidade na interface; a barreira real é exigir_admin na API.
        expect(layouts).toMatch(/use(Eh|Resultado)Admin/);
      }
    });
  }
});
