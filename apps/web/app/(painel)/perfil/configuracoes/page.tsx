"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/ui/BottomNav";
import { ConfirmarAcao } from "@/components/ui/ConfirmarAcao";
import { GrupoAjustes, LinhaAjuste, LinhaAjusteBotao, LinhaAjusteLink } from "@/components/ui/Linhas";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { AjusteAparencia } from "@/components/ui/ThemeSettings";
import { useCurrentUser } from "@/lib/use-current-user";
import { signOut } from "@/lib/supabase-client";

// Configurações da conta (F-035, fase 1). Escopo em docs/escopo-planos.md, seção 2.5.
// Cada item é uma linha: ícone, nome, valor e seta (a seta só aparece quando a linha
// leva a algum lugar ou abre algo). Depende só da sessão do Supabase, não da API.
export default function ConfiguracoesPage() {
  const router = useRouter();
  const { session, papel } = useCurrentUser();

  async function sair() {
    await signOut();
    router.push("/entrar");
  }

  return (
    <>
      <main className="flex-1 pt-space-md pb-28 px-gutter bg-surface min-h-screen">
        <div className="max-w-2xl w-full mx-auto flex flex-col gap-space-lg">
          <div className="flex items-center gap-space-xs">
            <Link
              href="/perfil"
              aria-label="Voltar ao perfil"
              className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant neu-surface-sm neu-pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <MaterialIcon name="arrow_back" />
            </Link>
            <h1 className="font-headline-md text-headline-md text-on-surface">Configurações</h1>
          </div>

          <GrupoAjustes titulo="Preferências">
            <AjusteAparencia />
          </GrupoAjustes>

          <GrupoAjustes titulo="Conta">
            <LinhaAjuste icone="mail" nome="E-mail" valor={session?.user.email} />
            <LinhaAjuste icone="badge" nome="Tipo de conta" valor={papel === "empresa" ? "Empresa" : "Profissional"} />
            {papel === "empresa" ? (
              <LinhaAjusteLink href="/assinatura" icone="workspace_premium" nome="Minha assinatura" />
            ) : (
              session && <LinhaAjusteLink href={`/profissional/${session.user.id}`} icone="visibility" nome="Meu perfil público" />
            )}
          </GrupoAjustes>
          <p className="px-space-sm -mt-space-md font-caption text-caption text-on-surface-variant">
            Para trocar o e-mail da conta, fale com o suporte.
          </p>

          <GrupoAjustes titulo="Sessão">
            <ConfirmarAcao
              titulo="Sair da conta?"
              descricao="Você vai precisar entrar de novo com seu e-mail e senha para usar o SaúdeConecta neste aparelho."
              rotuloConfirmar="Sair"
              perigosa
              onConfirmar={sair}
              gatilho={<LinhaAjusteBotao icone="logout" nome="Sair da conta" perigosa semSeta />}
            />
          </GrupoAjustes>

        </div>
      </main>
      <BottomNav />
    </>
  );
}
