import type { ProfissionalRead, StatusVerificacao } from "./types";

export interface ItemDeCompletude {
  id: "foto" | "apresentacao" | "especialidades" | "valor" | "registro";
  rotulo: string;
  ok: boolean;
  /** Complemento quando falta algo ou está em andamento. */
  detalhe?: string;
  /** Onde a pessoa resolve, quando existe tela para isso hoje. */
  href?: string;
}

const DETALHE_DO_REGISTRO: Record<StatusVerificacao, string | undefined> = {
  verified: undefined,
  pending: "Conferência em andamento",
  irregular: "Há uma pendência no registro",
  unable_to_verify: "Não foi possível conferir",
  unverified: undefined,
};

/**
 * Quão completo e confiável está o perfil, só com o que já existe: campos do perfil e estado da
 * conferência do registro (F-031). Calculado na tela, sem endpoint novo. O `href` só aparece
 * onde há tela para resolver (foto e registro, ambos em /perfil); os demais campos hoje só se
 * preenchem no cadastro.
 */
export function completudeDoPerfil(
  p: Pick<ProfissionalRead, "avatar_url" | "bio" | "especialidades" | "preco_hora" | "registro_profissional">,
  statusDoRegistro: StatusVerificacao | null,
): { itens: ItemDeCompletude[]; feitos: number; total: number } {
  const registroInformado = !!p.registro_profissional?.trim();
  const conferido = statusDoRegistro === "verified";
  const detalheDoRegistro = conferido
    ? undefined
    : !registroInformado
      ? "Registro não informado"
      : ((statusDoRegistro && DETALHE_DO_REGISTRO[statusDoRegistro]) ?? "Peça a conferência");

  const itens: ItemDeCompletude[] = [
    { id: "foto", rotulo: "Foto", ok: !!p.avatar_url, detalhe: p.avatar_url ? undefined : "Adicione uma foto", href: "/perfil" },
    { id: "apresentacao", rotulo: "Apresentação", ok: !!p.bio?.trim() },
    { id: "especialidades", rotulo: "Especialidades", ok: p.especialidades.length > 0 },
    { id: "valor", rotulo: "Valor por hora", ok: p.preco_hora != null },
    { id: "registro", rotulo: "Registro conferido", ok: conferido, detalhe: detalheDoRegistro, href: "/perfil#registro" },
  ];
  return { itens, feitos: itens.filter((i) => i.ok).length, total: itens.length };
}
