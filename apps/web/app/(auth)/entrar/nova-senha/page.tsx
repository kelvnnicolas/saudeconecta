"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Logo } from "@/components/ui/Logo";
import { type NovaSenhaInput, novaSenhaSchema } from "@/lib/validations/auth";
import { getSession, onAuthStateChange, updatePassword } from "@/lib/supabase-client";

export default function NovaSenhaPage() {
  const router = useRouter();
  const [sessaoPronta, setSessaoPronta] = useState<boolean | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NovaSenhaInput>({ resolver: zodResolver(novaSenhaSchema) });

  // O link do e-mail traz a sessão de recuperação no hash da URL; o cliente
  // Supabase a processa de forma assíncrona. Sem sessão depois de uns segundos,
  // o link é inválido ou expirou.
  useEffect(() => {
    let ativo = true;
    const cancelar = onAuthStateChange((session) => {
      if (ativo && session) setSessaoPronta(true);
    });
    getSession().then((session) => {
      if (ativo && session) setSessaoPronta(true);
    });
    const limite = setTimeout(() => {
      if (ativo) setSessaoPronta((atual) => atual ?? false);
    }, 4000);
    return () => {
      ativo = false;
      cancelar();
      clearTimeout(limite);
    };
  }, []);

  async function onSubmit(data: NovaSenhaInput) {
    setErro(null);
    setEnviando(true);
    try {
      await updatePassword(data.password);
      router.push("/buscar");
    } catch {
      setErro("Não foi possível salvar a nova senha. Peça um novo link e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="relative flex-1 flex flex-col justify-center px-gutter py-space-xl bg-surface min-h-screen gap-space-lg">
      <div className="flex flex-col items-center gap-space-xs">
        <Logo />
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Nova senha</h1>
      </div>

      {sessaoPronta === null && (
        <p className="text-center font-body-md text-body-md text-on-surface-variant">Validando o link...</p>
      )}

      {sessaoPronta === false && (
        <div className="flex flex-col gap-space-sm max-w-sm w-full mx-auto text-center">
          <p className="font-body-md text-body-md text-on-surface">
            Este link é inválido ou expirou. Peça um novo para continuar.
          </p>
          <Link href="/entrar/esqueci-senha" className="font-label-md text-label-md text-primary">Pedir novo link</Link>
        </div>
      )}

      {sessaoPronta && (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-space-sm max-w-sm w-full mx-auto">
          <label className="flex flex-col gap-1">
            <span className="font-label-md text-label-md text-on-surface">Nova senha</span>
            <input
              type="password"
              autoComplete="new-password"
              {...register("password")}
              className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.password && <span className="font-caption text-caption text-error">{errors.password.message}</span>}
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-label-md text-label-md text-on-surface">Confirme a nova senha</span>
            <input
              type="password"
              autoComplete="new-password"
              {...register("confirmacao")}
              className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.confirmacao && <span className="font-caption text-caption text-error">{errors.confirmacao.message}</span>}
          </label>

          {erro && <p className="font-caption text-caption text-error bg-error-container rounded-lg p-space-sm">{erro}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="h-12 rounded-xl neu-surface neu-pressable bg-primary text-on-primary font-label-md text-label-md disabled:opacity-60"
          >
            {enviando ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
      )}
    </main>
  );
}
