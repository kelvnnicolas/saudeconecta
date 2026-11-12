"use client";

import Link from "next/link";
import { ListaEsqueleto } from "@/components/ui/Skeleton";
import { useResultadoAdmin } from "@/lib/use-eh-admin";

// Defesa em profundidade na interface: a tela de administração nem monta para quem o servidor
// (GET /admin/eu) não confirmou como administrador. Isto NÃO é controle de acesso: toda rota
// /admin/* da API exige administrador a cada chamada (exigir_admin), e é isso que protege.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const resultado = useResultadoAdmin();

  if (resultado === "desconhecido") {
    return (
      <main className="flex-1 pt-space-md px-gutter pb-24 bg-surface min-h-screen">
        <ListaEsqueleto quantidade={3} aviso={false} />
      </main>
    );
  }

  if (resultado === "nao") {
    return (
      <main className="flex-1 pt-space-md pb-24 px-gutter bg-surface min-h-screen flex flex-col gap-space-md">
        <h1 className="font-headline-md text-headline-md text-on-surface">Acesso restrito</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Esta área é restrita a administradores.
        </p>
        <Link href="/inicio" className="self-start font-label-sm text-label-sm text-primary">
          Voltar ao início
        </Link>
      </main>
    );
  }

  return <>{children}</>;
}
