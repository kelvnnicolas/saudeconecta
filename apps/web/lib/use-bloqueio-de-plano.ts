"use client";

import { useState } from "react";
import { ApiError } from "./api";
import type { PlanoResumo } from "./limite-plano";
import type { UsoMensal } from "./types";
import { estadoDaCota, useCota } from "./use-uso-mensal";

type BloqueioDoServidor = { tipo: "limite" | "pagamento"; uso: UsoMensal | null };

/**
 * Decide se a ação de enviar (publicar demanda, iniciar contato) está bloqueada pelo plano:
 * pela consulta de uso feita ao abrir a tela ou por uma recusa do servidor (409 de limite,
 * 402 de pagamento pendente), que cobre o caso de o uso ter mudado desde então. Nos dois
 * casos a tela mostra o aviso e trava o botão, em vez de um erro solto.
 */
export function useBloqueioDePlano() {
  const { uso: usoConsultado, plano } = useCota();
  const [doServidor, setDoServidor] = useState<BloqueioDoServidor | null>(null);

  const uso = doServidor?.uso ?? usoConsultado;
  const pagamentoPendente = doServidor?.tipo === "pagamento";
  const bloqueado = doServidor !== null || estadoDaCota(uso) === "esgotada";

  /** Devolve true se o erro era de plano (já virou aviso); false para tratar como erro comum. */
  function tratarErro(erro: unknown): boolean {
    if (!(erro instanceof ApiError)) return false;
    if (erro.code === "limite_atingido") {
      const d = erro.detail as { uso?: number; limite?: number };
      setDoServidor({
        tipo: "limite",
        uso: { usado: d.uso ?? usoConsultado?.usado ?? 0, limite: d.limite ?? usoConsultado?.limite ?? null },
      });
      return true;
    }
    if (erro.code === "pagamento_pendente") {
      setDoServidor({ tipo: "pagamento", uso: usoConsultado });
      return true;
    }
    return false;
  }

  return { uso, plano: plano as PlanoResumo | null, bloqueado, pagamentoPendente, tratarErro };
}
