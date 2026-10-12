"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Logo } from "@/components/ui/Logo";
import { type LoginInput, loginSchema } from "@/lib/validations/auth";
import { signInWithLinkedIn, signInWithGoogle, signInWithPassword } from "@/lib/supabase-client";

export default function EntrarPage() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [provedorSocial, setProvedorSocial] = useState<"google" | "linkedin" | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginInput) {
    setErro(null);
    setEnviando(true);
    try {
      // TODO(integração): depois do login, chamar api.syncProfile só se for um
      // usuário novo (profile ainda não existe) — normalmente é a própria tela
      // de cadastro que faz o /auth/sync inicial.
      await signInWithPassword(data.email, data.password);
      router.push("/buscar");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível entrar. Verifique os dados.");
    } finally {
      setEnviando(false);
    }
  }

  async function entrarComGoogle() {
    setErro(null);
    setProvedorSocial("google");
    try {
      await signInWithGoogle();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível entrar com o Google.");
    } finally {
      setProvedorSocial(null);
    }
  }

  async function entrarComLinkedIn() {
    setErro(null);
    setProvedorSocial("linkedin");
    try {
      await signInWithLinkedIn();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível entrar com o LinkedIn.");
    } finally {
      setProvedorSocial(null);
    }
  }

  return (
    <main className="relative flex-1 flex flex-col justify-center px-gutter py-space-xl bg-surface min-h-screen gap-space-lg">
      <div className="flex flex-col items-center gap-space-xs">
        <Logo />
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Acesse sua conta</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-space-sm max-w-sm w-full mx-auto">
        <label className="flex flex-col gap-1">
          <span className="font-label-md text-label-md text-on-surface">E-mail</span>
          <input
            type="email"
            {...register("email")}
            className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {errors.email && <span className="font-caption text-caption text-error">{errors.email.message}</span>}
        </label>
        <label className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-on-surface">Senha</span>
            <Link href="/entrar/esqueci-senha" className="font-caption text-caption text-primary">Esqueci</Link>
          </div>
          <input
            type="password"
            {...register("password")}
            className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {errors.password && <span className="font-caption text-caption text-error">{errors.password.message}</span>}
        </label>

        {erro && <p className="font-caption text-caption text-error bg-error-container rounded-lg p-space-sm">{erro}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="h-12 rounded-xl neu-surface neu-pressable bg-primary text-on-primary font-label-md text-label-md disabled:opacity-60"
        >
          {enviando ? "Entrando..." : "Entrar"}
        </button>

        <div className="flex items-center gap-space-sm text-on-surface-variant font-caption text-caption">
          <div className="flex-1 h-px bg-outline-variant" />
          ou
          <div className="flex-1 h-px bg-outline-variant" />
        </div>

        <button
          type="button"
          onClick={entrarComGoogle}
          disabled={provedorSocial !== null}
          className="h-12 rounded-xl bg-surface-container-lowest text-on-surface font-label-md text-label-md flex items-center justify-center gap-space-xs neu-surface neu-pressable disabled:opacity-60"
        >
          <MaterialIcon name="account_circle" className="text-[20px]" />
          {provedorSocial === "google" ? "Conectando..." : "Continuar com Google"}
        </button>

        <button
          type="button"
          onClick={entrarComLinkedIn}
          disabled={provedorSocial !== null}
          className="h-12 rounded-xl bg-surface-container-lowest text-on-surface font-label-md text-label-md flex items-center justify-center gap-space-xs neu-surface neu-pressable disabled:opacity-60"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="flex-shrink-0">
            <rect width="20" height="20" rx="4" fill="#0A66C2" />
            <path
              d="M6.94 7.5H4.56V15.5H6.94V7.5ZM5.75 6.44C6.54 6.44 7.06 5.9 7.06 5.22C7.06 4.53 6.55 4 5.77 4C4.99 4 4.46 4.53 4.46 5.22C4.46 5.9 4.98 6.44 5.74 6.44H5.75ZM8.36 15.5H10.74V11.09C10.74 10.85 10.76 10.61 10.83 10.44C11.02 9.96 11.46 9.46 12.2 9.46C13.17 9.46 13.56 10.2 13.56 11.28V15.5H15.94V11C15.94 8.8 14.77 7.78 13.21 7.78C11.93 7.78 11.37 8.49 11.05 8.98H11.07V7.9L8.36 7.9C8.4 8.75 8.36 15.5 8.36 15.5Z"
              fill="#fff"
            />
          </svg>
          {provedorSocial === "linkedin" ? "Conectando..." : "Continuar com LinkedIn"}
        </button>
      </form>

      <div className="flex flex-col items-center gap-space-xs">
        <span className="font-body-md text-body-md text-on-surface-variant">Ainda não tem conta?</span>
        <div className="flex items-center gap-space-sm">
          <Link href="/cadastro/profissional" className="font-label-md text-label-md text-primary">Sou profissional</Link>
          <span className="text-outline-variant">&middot;</span>
          <Link href="/cadastro/empresa" className="font-label-md text-label-md text-primary">Sou empresa/pessoa</Link>
        </div>
      </div>
    </main>
  );
}
