"use client";

import { useEffect, useState } from "react";
import { api } from "./api";
import type { PlanoResumo } from "./limite-plano";
import type { UsoMensal } from "./types";

/** Fração da cota a partir da qual avisamos que está acabando. */
export const FRACAO_DE_AVISO = 0.8;

export type EstadoDaCota = "livre" | "perto" | "esgotada";

export function estadoDaCota(uso: UsoMensal | null): EstadoDaCota {
  if (!uso || uso.limite == null) return "livre";
  if (uso.usado >= uso.limite) return "esgotada";
  return uso.usado / uso.limite >= FRACAO_DE_AVISO ? "perto" : "livre";
}

export interface Cota {
  uso: UsoMensal | null;
  plano: PlanoResumo | null;
}

/**
 * Uso do mês (contatos iniciados + demandas publicadas) e o plano atual (null = gratuito).
 * Se a consulta falhar devolve nulos e a tela segue normal: quem decide é sempre o servidor,
 * isto é só um aviso. `ativo=false` não consulta (telas que também são vistas por quem não é
 * empresa).
 */
export function useCota(ativo = true): Cota {
  const [cota, setCota] = useState<Cota>({ uso: null, plano: null });
  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    api
      .minhaAssinatura()
      .then((resposta) => vivo && setCota({ uso: resposta.uso, plano: resposta.plano }))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [ativo]);
  return cota;
}

export function useUsoMensal(): UsoMensal | null {
  return useCota().uso;
}
