"use client";

import { createContext, useContext } from "react";
import { useCurrentUser } from "@/lib/use-current-user";
import { BarraInferior } from "./BarraInferior";
import { BarraSuperior, ALTURA_DA_BARRA_SUPERIOR } from "./BarraSuperior";

const DentroDaCasca = createContext(false);

/** Telas com a barra de navegação do app (quem está logado). `Header` usa para se posicionar. */
export function useDentroDaCasca() {
  return useContext(DentroDaCasca);
}

/**
 * Moldura única de navegação: barra superior em todas as telas de quem está logado e barra
 * inferior no celular/tablet. Visitantes não veem nada daqui. Só decide o que MOSTRAR; quem
 * barra o acesso são o layout do painel, o `ApenasPara` de cada rota e a API.
 */
export function CascaDaNavegacao({ children }: { children: React.ReactNode }) {
  const { session } = useCurrentUser();
  const comBarra = !!session;

  if (!comBarra) return <>{children}</>;

  const topo = `calc(${ALTURA_DA_BARRA_SUPERIOR} + env(safe-area-inset-top, 0px))`;
  return (
    <DentroDaCasca.Provider value>
      <BarraSuperior />
      <div
        style={{ paddingTop: topo }}
        // Cada tela tem min-h-screen no <main>; desconta a barra para não criar rolagem à toa.
        className="flex-1 flex flex-col [&_main]:min-h-[calc(100dvh-4rem-env(safe-area-inset-top,0px))]"
      >
        <div className="mx-auto w-full max-w-5xl flex-1 flex flex-col">{children}</div>
      </div>
      <BarraInferior />
    </DentroDaCasca.Provider>
  );
}
