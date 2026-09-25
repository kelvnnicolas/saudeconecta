"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/ui/BottomNav";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Logo } from "@/components/ui/Logo";
import { useCurrentUser } from "@/lib/use-current-user";
import { signOut } from "@/lib/supabase-client";
import { api } from "@/lib/api";

export default function MeuPerfilPage() {
  const router = useRouter();
  const { papel, setPapel, profile, profissional, empresa } = useCurrentUser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [enviandoAvatar, setEnviandoAvatar] = useState(false);

  async function onAvatarSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnviandoAvatar(true);
    try {
      await api.uploadAvatar(file); // TODO(integração): recarregar profile depois
    } catch {
      // modo de exemplo sem backend — silencioso de propósito aqui
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
          <button onClick={sair} aria-label="Sair" className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant">
            <MaterialIcon name="logout" />
          </button>
        </div>

        <section className="flex flex-col items-center gap-space-sm bg-surface-container-lowest rounded-2xl p-space-md neu-surface">
          <button onClick={() => fileRef.current?.click()} className="relative" aria-label="Trocar foto">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.nome} width={88} height={88} className="w-24 h-24 rounded-full object-cover" />
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
            <p className="font-title-md text-title-md text-on-surface">{profile.nome}</p>
            <p className="font-caption text-caption text-on-surface-variant">{profile.email}</p>
          </div>
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

        <section className="bg-surface-container-lowest rounded-2xl p-space-md neu-surface flex flex-col gap-space-xs">
          <h2 className="font-title-md text-title-md text-on-surface">Localização</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {[profile.cidade, profile.estado].filter(Boolean).join(", ") || "Não informado"}
          </p>
        </section>

        <section className="bg-surface-container-low rounded-2xl p-space-md flex flex-col gap-space-xs">
          <p className="font-caption text-caption text-on-surface-variant">
            Modo de exemplo (sem backend): alternar papel para navegar as duas visões do app.
          </p>
          <div className="flex gap-space-xs">
            <button
              onClick={() => setPapel("profissional")}
              className={`flex-1 h-10 rounded-xl font-label-sm text-label-sm neu-pressable ${papel === "profissional" ? "bg-primary text-on-primary neu-surface-sm" : "bg-surface-container text-on-surface-variant neu-inset-sm"}`}
            >
              Ver como profissional
            </button>
            <button
              onClick={() => setPapel("empresa")}
              className={`flex-1 h-10 rounded-xl font-label-sm text-label-sm neu-pressable ${papel === "empresa" ? "bg-primary text-on-primary neu-surface-sm" : "bg-surface-container text-on-surface-variant neu-inset-sm"}`}
            >
              Ver como empresa
            </button>
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  );
}
