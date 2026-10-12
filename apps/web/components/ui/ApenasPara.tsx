"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PaginaEsqueleto } from "@/components/ui/Skeleton";
import { useCurrentUser } from "@/lib/use-current-user";
import type { Papel } from "@/lib/types";

/**
 * Barra quem não tem o papel certo antes da página montar (use em layout.tsx da
 * rota, assim os efeitos da página nem chegam a chamar a API). Quem está no papel
 * errado vai para a tela inicial do próprio papel, em vez de ver um erro da API.
 *
 * `permitirVisitante`: para páginas públicas que só devem desviar quem já está
 * logado com outro papel (ex.: planos para empresas).
 */
export function ApenasPara({
  papel,
  permitirVisitante = false,
  children,
}: {
  papel: Papel;
  permitirVisitante?: boolean;
  children: React.ReactNode;
}) {
  const { loading, session, papel: papelAtual } = useCurrentUser();
  const router = useRouter();

  const visitante = !loading && !session;
  const papelErrado = !loading && !!session && papelAtual !== papel;

  useEffect(() => {
    if (papelErrado) router.replace(papelAtual === "empresa" ? "/demandas" : "/oportunidades");
  }, [papelErrado, papelAtual, router]);

  if (loading || papelErrado || (visitante && !permitirVisitante)) {
    return (
      <main className="flex-1 pt-space-md px-gutter pb-24 bg-surface min-h-screen">
        <PaginaEsqueleto />
      </main>
    );
  }

  return <>{children}</>;
}
