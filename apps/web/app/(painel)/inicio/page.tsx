"use client";

import Link from "next/link";
import { InicioEmpresa } from "@/components/inicio/InicioEmpresa";
import { InicioProfissional } from "@/components/inicio/InicioProfissional";
import { useCurrentUser } from "@/lib/use-current-user";

// Início de quem está logado. O conteúdo depende do papel que o SERVIDOR confirmou (perfil de
// profissional ou de empresa); sem perfil, orienta a concluir o cadastro em vez de adivinhar.
export default function InicioPage() {
  const { papel, papelConfirmado } = useCurrentUser();

  if (!papelConfirmado) {
    return (
      <main className="flex-1 pt-space-md pb-24 px-gutter bg-surface min-h-screen flex flex-col gap-space-md">
        <h1 className="font-headline-md text-headline-md text-on-surface">Início</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Não conseguimos carregar o seu perfil. Saia e entre novamente; se o problema continuar,
          conclua o cadastro para liberar todas as telas.
        </p>
        <Link href="/perfil" className="self-start font-label-md text-label-md text-primary min-h-[44px] flex items-center">
          Abrir meu perfil
        </Link>
      </main>
    );
  }

  return papel === "empresa" ? <InicioEmpresa /> : <InicioProfissional />;
}
