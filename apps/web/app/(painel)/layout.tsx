"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/use-current-user";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

// Nenhuma tela dentro de (painel) tinha guard de sessão até aqui (eram todas
// mocks). Redireciona pra /entrar assim que ficar claro que não há sessão —
// nunca antes do useCurrentUser() resolver, senão todo refresh de página
// manda quem já está logado de volta pro login por uma fração de segundo.
export default function PainelLayout({ children }: { children: React.ReactNode }) {
  const { loading, session } = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) router.replace("/entrar");
  }, [loading, session, router]);

  if (loading || !session) {
    return (
      <main className="flex-1 flex items-center justify-center bg-surface min-h-screen">
        <MaterialIcon name="progress_activity" className="text-[32px] text-primary animate-spin" />
      </main>
    );
  }

  return <>{children}</>;
}
