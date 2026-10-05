"use client";

import { useEffect, useState } from "react";

// Abaixo de ~100ms um indicador só pisca e parece mais lento que não ter nada.
const ATRASO_MS = 100;
// O backend no plano free dorme; a primeira chamada pode levar ~30s.
const ATRASO_AVISO_MS = 6000;

function useDepoisDe(ms: number) {
  const [passou, setPassou] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setPassou(true), ms);
    return () => clearTimeout(id);
  }, [ms]);
  return passou;
}

export function Bloco({ className = "" }: { className?: string }) {
  const arredondamento = className.includes("rounded") ? "" : "rounded-lg";
  return (
    <div
      aria-hidden="true"
      className={`${arredondamento} bg-[color-mix(in_srgb,var(--ink)_10%,transparent)] motion-safe:animate-pulse ${className}`}
    />
  );
}

function AvisoServidorLento() {
  const visivel = useDepoisDe(ATRASO_AVISO_MS);
  if (!visivel) return null;
  return (
    <p className="font-caption text-caption text-on-surface-variant text-center" aria-live="polite">
      Isso está demorando mais que o normal. O servidor pode estar acordando — a primeira carga leva até 30 segundos.
    </p>
  );
}

function Atrasado({ children, aviso }: { children: React.ReactNode; aviso: boolean }) {
  const visivel = useDepoisDe(ATRASO_MS);
  if (!visivel) return null;
  return (
    <div role="status" aria-busy="true" aria-label="Carregando" className="flex flex-col gap-space-sm">
      {children}
      {aviso && <AvisoServidorLento />}
    </div>
  );
}

export function CartaoEsqueleto() {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-space-md neu-surface flex flex-col gap-space-sm">
      <div className="flex items-center gap-space-sm">
        <Bloco className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 flex flex-col gap-1.5">
          <Bloco className="h-4 w-1/2" />
          <Bloco className="h-3 w-1/3" />
        </div>
      </div>
      <Bloco className="h-3 w-full" />
      <Bloco className="h-3 w-4/5" />
    </div>
  );
}

export function ListaEsqueleto({ quantidade = 3, aviso = true }: { quantidade?: number; aviso?: boolean }) {
  return (
    <Atrasado aviso={aviso}>
      {Array.from({ length: quantidade }, (_, i) => (
        <CartaoEsqueleto key={i} />
      ))}
    </Atrasado>
  );
}

/** Página inteira ainda sem conteúdo: título + cartões, sem simular uma tela específica. */
export function PaginaEsqueleto({ comTitulo = true }: { comTitulo?: boolean }) {
  return (
    <div className="flex flex-col gap-space-md w-full">
      {comTitulo && (
        <div aria-hidden="true" className="flex flex-col gap-1.5">
          <Bloco className="h-6 w-2/5" />
          <Bloco className="h-3 w-3/5" />
        </div>
      )}
      <ListaEsqueleto />
    </div>
  );
}
