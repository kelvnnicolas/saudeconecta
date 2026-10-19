"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MaterialIcon } from "./MaterialIcon";
import { api } from "@/lib/api";
import {
  type ContextoLimite,
  type PlanoResumo,
  montarAvisoDeLimite,
  montarAvisoDePagamento,
} from "@/lib/limite-plano";
import type { UsoMensal } from "@/lib/types";

// Os planos são públicos e quase não mudam: uma consulta por carregamento da página.
let planosEmCache: Promise<PlanoResumo[]> | null = null;
export function carregarPlanos() {
  planosEmCache ??= api.listPlanos().catch(() => {
    planosEmCache = null;
    return [] as PlanoResumo[];
  });
  return planosEmCache;
}

/**
 * Aviso de limite mensal atingido (ou de pagamento pendente). Diz exatamente o que acabou,
 * mostra o que se ganha ao assinar, dá uma ação principal e uma saída para quem não quer
 * assinar agora, e deixa claro quando o limite volta. O botão de enviar da tela fica
 * travado junto: a ação bloqueada nunca parece disponível.
 */
export function AvisoLimite({
  uso,
  plano = null,
  contexto,
  tipo = "limite",
  solido = false,
  idTitulo,
}: {
  uso: UsoMensal;
  plano?: PlanoResumo | null;
  contexto: ContextoLimite;
  tipo?: "limite" | "pagamento";
  /** Fundo opaco, para quando o aviso fica sobre um popup com fundo escurecido. */
  solido?: boolean;
  idTitulo?: string;
}) {
  const [planos, setPlanos] = useState<PlanoResumo[]>([]);
  useEffect(() => {
    if (tipo !== "limite") return;
    let vivo = true;
    carregarPlanos().then((lista) => vivo && setPlanos(lista));
    return () => {
      vivo = false;
    };
  }, [tipo]);

  const texto = tipo === "pagamento" ? montarAvisoDePagamento(contexto) : montarAvisoDeLimite({ uso, plano, planos, contexto });

  return (
    <section
      role="status"
      className={`${solido ? "bg-surface-container-lowest neu-surface" : "vidro"} painel-fade flex flex-col gap-space-sm rounded-2xl p-space-md`}
    >
      <div className="flex items-center gap-space-sm">
        <span
          aria-hidden="true"
          className="cadeado-pop flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-fixed text-primary"
        >
          <MaterialIcon name="lock" filled />
        </span>
        <h2 id={idTitulo} className="font-title-md text-title-md text-on-surface pr-10">{texto.titulo}</h2>
      </div>

      <p className="font-body-md text-body-md text-on-surface">{texto.oQueAcabou}</p>
      <p className="font-body-md text-body-md text-on-surface-variant">{texto.beneficio}</p>
      {texto.renovacao && <p className="font-caption text-caption text-on-surface-variant">{texto.renovacao}</p>}

      <div className="flex flex-col gap-space-xs pt-space-xs">
        <Link
          href={texto.principal.href}
          className="vidro-acento inline-flex h-12 items-center justify-center gap-space-xs rounded-full px-space-lg font-label-md text-label-md transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {texto.principal.rotulo}
          <MaterialIcon name="arrow_forward" className="text-[18px]" />
        </Link>
        <Link
          href={texto.alternativa.href}
          className="inline-flex min-h-11 items-center justify-center rounded-full px-space-md font-label-md text-label-md text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {texto.alternativa.rotulo}
        </Link>
      </div>
    </section>
  );
}
