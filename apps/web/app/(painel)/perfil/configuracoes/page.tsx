"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/ui/BottomNav";
import { ConfirmarAcao } from "@/components/ui/ConfirmarAcao";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { ThemeSettings } from "@/components/ui/ThemeSettings";
import { useCurrentUser } from "@/lib/use-current-user";
import { signOut } from "@/lib/supabase-client";

// Configurações da conta (F-035, fase 1). Escopo em docs/escopo-planos.md, seção 2.5.
// Só depende da sessão do Supabase: e-mail e papel vêm dela, não da API.
export default function ConfiguracoesPage() {
  const router = useRouter();
  const { session, papel } = useCurrentUser();

  async function sair() {
    await signOut();
    router.push("/entrar");
  }

  return (
    <>
      <main className="flex-1 pt-space-md pb-24 px-gutter bg-surface min-h-screen flex flex-col gap-space-md max-w-2xl w-full mx-auto">
        <div className="flex items-center gap-space-xs">
          <Link
            href="/perfil"
            aria-label="Voltar ao perfil"
            className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <MaterialIcon name="arrow_back" />
          </Link>
          <h1 className="font-headline-md text-headline-md text-on-surface">Configurações</h1>
        </div>

        <section aria-labelledby="titulo-preferencias" className="bg-surface-container-lowest rounded-2xl p-space-md neu-surface flex flex-col gap-space-sm">
          <h2 id="titulo-preferencias" className="font-title-md text-title-md text-on-surface">
            Preferências
          </h2>
          <ThemeSettings />
        </section>

        <section aria-labelledby="titulo-conta" className="bg-surface-container-lowest rounded-2xl p-space-md neu-surface flex flex-col gap-space-sm">
          <h2 id="titulo-conta" className="font-title-md text-title-md text-on-surface">
            Conta
          </h2>
          <dl className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between gap-space-sm">
              <dt className="font-body-md text-body-md text-on-surface-variant">E-mail</dt>
              <dd className="font-body-md text-body-md text-on-surface truncate">{session?.user.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-space-sm">
              <dt className="font-body-md text-body-md text-on-surface-variant">Tipo de conta</dt>
              <dd className="font-body-md text-body-md text-on-surface">
                {papel === "empresa" ? "Empresa" : "Profissional"}
              </dd>
            </div>
          </dl>
          <p className="font-caption text-caption text-on-surface-variant">
            Para trocar o e-mail, fale com o suporte.
          </p>
        </section>

        <ConfirmarAcao
          titulo="Sair da conta?"
          descricao="Você vai precisar entrar de novo com seu e-mail e senha para usar o SaúdeConecta neste aparelho."
          rotuloConfirmar="Sair"
          perigosa
          onConfirmar={sair}
          gatilho={
            <button
              type="button"
              className="self-center h-11 px-space-md rounded-full flex items-center gap-space-xs font-label-md text-label-md text-error hover:bg-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span aria-hidden="true" className="flex">
                <MaterialIcon name="logout" className="text-[20px]" />
              </span>
              Sair da conta
            </button>
          }
        />
      </main>
      <BottomNav />
    </>
  );
}
