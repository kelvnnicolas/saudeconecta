"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Logo } from "@/components/ui/Logo";
import { type EsqueciSenhaInput, esqueciSenhaSchema } from "@/lib/validations/auth";
import { requestPasswordReset } from "@/lib/supabase-client";

export default function EsqueciSenhaPage() {
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EsqueciSenhaInput>({ resolver: zodResolver(esqueciSenhaSchema) });

  async function onSubmit(data: EsqueciSenhaInput) {
    setErro(null);
    setEnviando(true);
    try {
      await requestPasswordReset(data.email);
      setEnviado(true);
    } catch {
      setErro("Não foi possível enviar o link agora. Tente novamente em instantes.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="relative flex-1 flex flex-col justify-center px-gutter py-space-xl bg-surface min-h-screen gap-space-lg">
      <div className="flex flex-col items-center gap-space-xs">
        <Logo />
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Recuperar senha</h1>
      </div>

      {enviado ? (
        <div className="flex flex-col gap-space-sm max-w-sm w-full mx-auto text-center">
          <p className="font-body-md text-body-md text-on-surface">
            Se esse e-mail tiver cadastro, enviamos um link para você criar uma nova senha. Confira também a caixa de spam.
          </p>
          <Link href="/entrar" className="font-label-md text-label-md text-primary">Voltar para o login</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-space-sm max-w-sm w-full mx-auto">
          <p className="font-body-md text-body-md text-on-surface-variant">
            Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.
          </p>
          <label className="flex flex-col gap-1">
            <span className="font-label-md text-label-md text-on-surface">E-mail</span>
            <input
              type="email"
              autoComplete="email"
              {...register("email")}
              className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.email && <span className="font-caption text-caption text-error">{errors.email.message}</span>}
          </label>

          {erro && <p className="font-caption text-caption text-error bg-error-container rounded-lg p-space-sm">{erro}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="h-12 rounded-xl neu-surface neu-pressable bg-primary text-on-primary font-label-md text-label-md disabled:opacity-60"
          >
            {enviando ? "Enviando..." : "Enviar link"}
          </button>
          <Link href="/entrar" className="text-center font-label-md text-label-md text-primary">Voltar para o login</Link>
        </form>
      )}
    </main>
  );
}
