"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/ui/BottomNav";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Logo } from "@/components/ui/Logo";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { ThemeSettings } from "@/components/ui/ThemeSettings";
import { useCurrentUser } from "@/lib/use-current-user";
import { signOut } from "@/lib/supabase-client";
import { api } from "@/lib/api";

export default function MeuPerfilPage() {
  const router = useRouter();
  const { session, profissional, empresa, refresh } = useCurrentUser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [enviandoAvatar, setEnviandoAvatar] = useState(false);
  const [erroAvatar, setErroAvatar] = useState<string | null>(null);

  // Nome/avatar/localização vêm de profissional ou empresa (o que estiver
  // carregado) — não existe um "GET /profiles/me" genérico, ver
  // lib/use-current-user.ts.
  const nome = profissional?.nome ?? empresa?.nome ?? session?.user.email ?? "";
  const avatarUrl = profissional?.avatar_url ?? empresa?.avatar_url ?? null;
  const cidade = profissional?.cidade ?? empresa?.cidade ?? null;
  const estado = profissional?.estado ?? empresa?.estado ?? null;

  async function onAvatarSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnviandoAvatar(true);
    setErroAvatar(null);
    try {
      await api.uploadAvatar(file);
      await refresh();
    } catch (err) {
      setErroAvatar(err instanceof Error ? err.message : "Não foi possível enviar a foto.");
    } finally {
      setEnviandoAvatar(false);
    }
  }

  async function sair() {
    await signOut();
    router.push("/entrar");
  }

  return (
    <>
      <main className="flex-1 pt-space-md pb-24 px-gutter bg-surface min-h-screen flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Logo compact />
            <span className="font-headline-md text-headline-md text-on-surface">Meu Perfil</span>
          </div>
          <div className="flex items-center gap-space-xs">
            <NotificationBell />
            <button onClick={sair} aria-label="Sair" className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant">
              <MaterialIcon name="logout" />
            </button>
          </div>
        </div>

        <section className="flex flex-col items-center gap-space-sm bg-surface-container-lowest rounded-2xl p-space-md neu-surface">
          <button onClick={() => fileRef.current?.click()} className="relative" aria-label="Trocar foto">
            {avatarUrl ? (
              <Image src={avatarUrl} alt={nome} width={88} height={88} className="w-24 h-24 rounded-full object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                <MaterialIcon name="person" className="text-[36px]" />
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center border-2 border-surface-container-lowest neu-surface-sm">
              <MaterialIcon name={enviandoAvatar ? "progress_activity" : "photo_camera"} className="text-[16px]" />
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatarSelecionado} />
          <div className="text-center">
            <p className="font-title-md text-title-md text-on-surface">{nome}</p>
            <p className="font-caption text-caption text-on-surface-variant">{session?.user.email}</p>
          </div>
          {erroAvatar && <p className="font-caption text-caption text-error">{erroAvatar}</p>}
        </section>

        {profissional && (
          <section className="bg-surface-container-lowest rounded-2xl p-space-md neu-surface flex flex-col gap-space-xs">
            <h2 className="font-title-md text-title-md text-on-surface">Dados profissionais</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">{profissional.registro_profissional}</p>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {profissional.especialidades.map((e) => e.nome).join(", ")}
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {profissional.preco_hora != null ? `R$ ${profissional.preco_hora}/hora` : "Preço a combinar"}
            </p>
            <Link href={`/profissional/${profissional.user_id}`} className="self-start font-label-sm text-label-sm text-primary">
              Ver perfil público
            </Link>
          </section>
        )}

        {empresa && (
          <section className="bg-surface-container-lowest rounded-2xl p-space-md neu-surface flex flex-col gap-space-xs">
            <h2 className="font-title-md text-title-md text-on-surface">Dados da empresa</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">{empresa.nome_fantasia}</p>
            <p className="font-body-md text-body-md text-on-surface-variant capitalize">{empresa.tipo.replace("_", " ")}</p>
            <Link href="/assinatura" className="self-start font-label-sm text-label-sm text-primary">
              Ver minha assinatura
            </Link>
          </section>
        )}

        {!profissional && !empresa && (
          <section className="rounded-2xl p-space-md bg-secondary-container/40 border border-secondary-container flex items-start gap-space-xs">
            <MaterialIcon name="info" className="text-[18px] text-on-secondary-container mt-0.5" />
            <p className="font-caption text-caption text-on-secondary-container">
              Seu perfil ainda não foi sincronizado com a API (falta um{" "}
              <code>PUT /profissionais/me</code> ou <code>PUT /empresas/me</code> — normalmente
              feito no cadastro).
            </p>
          </section>
        )}

        <section className="bg-surface-container-lowest rounded-2xl p-space-md neu-surface flex flex-col gap-space-xs">
          <h2 className="font-title-md text-title-md text-on-surface">Localização</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {[cidade, estado].filter(Boolean).join(", ") || "Não informado"}
          </p>
        </section>

        <ThemeSettings />
      </main>
      <BottomNav />
    </>
  );
}
