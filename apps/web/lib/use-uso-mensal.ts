"use client";

import { useEffect, useState } from "react";
import { api } from "./api";
import type { UsoMensal } from "./types";

/** Fração da cota a partir da qual avisamos que está acabando. */
export const FRACAO_DE_AVISO = 0.8;

export type EstadoDaCota = "livre" | "perto" | "esgotada";

export function estadoDaCota(uso: UsoMensal | null): EstadoDaCota {
  if (!uso || uso.limite == null) return "livre";
  if (uso.usado >= uso.limite) return "esgotada";
  return uso.usado / uso.limite >= FRACAO_DE_AVISO ? "perto" : "livre";
}

/**
 * Uso do mês (contatos iniciados + demandas publicadas). Se a consulta falhar devolve
 * null e a tela segue normal: quem decide é sempre o servidor, isto é só um aviso.
 */
export function useUsoMensal(): UsoMensal | null {
  const [uso, setUso] = useState<UsoMensal | null>(null);
  useEffect(() => {
    let ativo = true;
    api
      .minhaAssinatura()
      .then((resposta) => ativo && setUso(resposta.uso))
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, []);
  return uso;
}
