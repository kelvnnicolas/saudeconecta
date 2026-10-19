"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Logo } from "@/components/ui/Logo";
import { CampoSenha } from "@/components/ui/CampoSenha";
import { mensagemDeErroAuth } from "@/lib/erros-auth";
import { type LoginInput, loginSchema } from "@/lib/validations/auth";
import { getSession, signInWithFacebook, signInWithGoogle, signInWithPassword, signOut } from "@/lib/supabase-client";

type PapelEntrada = "profissional" | "empresa";

const PAPEIS: { valor: PapelEntrada; rotulo: string; criar: string; href: string }[] = [
  { valor: "empresa", rotulo: "Empresa ou pessoa", criar: "Criar conta de empresa", href: "/cadastro/empresa" },
  { valor: "profissional", rotulo: "Profissional", criar: "Criar conta de profissional", href: "/cadastro/profissional" },
];

const CHAVE_PAPEL = "saudeconecta:entrar-papel";

export default function EntrarPage() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [provedorSocial, setProvedorSocial] = useState<"google" | "facebook" | null>(null);
  const [papelEscolhido, setPapelEscolhido] = useState<PapelEntrada>("empresa");
  const [semCadastro, setSemCadastro] = useState(false);

  // O tipo de conta vem de ?papel= (links), senão do último usado neste aparelho.
  useEffect(() => {
    const doLink = new URLSearchParams(window.location.search).get("papel");
    let guardado: string | null = null;
    try {
      guardado = localStorage.getItem(CHAVE_PAPEL);
    } catch {
      // storage bloqueado: segue com o padrão
    }
    const inicial = [doLink, guardado].find((v) => v === "profissional" || v === "empresa");
    if (inicial) setPapelEscolhido(inicial as PapelEntrada);
  }, []);

  const papelAtual = PAPEIS.find((p) => p.valor === papelEscolhido) ?? PAPEIS[0]!;

  function escolherPapel(papel: PapelEntrada) {
    setPapelEscolhido(papel);
    setErro(null);
    setSemCadastro(false);
    try {
      localStorage.setItem(CHAVE_PAPEL, papel);
    } catch {
      // sem storage, só não lembra a escolha
    }
  }
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginInput) {
    setErro(null);
    setSemCadastro(false);
    setEnviando(true);
    try {
      await signInWithPassword(data.email, data.password);
      // A conta tem um tipo (profissional ou empresa) gravado no cadastro. Se não for o
      // escolhido aqui, não deixa entrar por engano e leva para o lado certo.
      const sessao = await getSession();
      const papelDaConta = sessao?.user.user_metadata?.papel;
      if ((papelDaConta === "empresa" || papelDaConta === "profissional") && papelDaConta !== papelEscolhido) {
        await signOut();
        escolherPapel(papelDaConta);
        setErro(
          papelDaConta === "empresa"
            ? "Esta conta é de empresa ou pessoa. Ajustamos a opção acima: entre de novo."
            : "Esta conta é de profissional. Ajustamos a opção acima: entre de novo.",
        );
        return;
      }
      router.push("/buscar");
    } catch (e) {
      const mensagem = mensagemDeErroAuth(e, "Não foi possível entrar. Verifique os dados.");
      setErro(mensagem);
      // Credencial recusada: pode ser senha errada ou falta de cadastro (o Supabase não diz qual).
      setSemCadastro(mensagem.startsWith("E-mail ou senha incorretos"));
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
      setErro(mensagemDeErroAuth(e, "Não foi possível entrar com o Google."));
    } finally {
      setProvedorSocial(null);
    }
  }

  async function entrarComFacebook() {
    setErro(null);
    setProvedorSocial("facebook");
    try {
      await signInWithFacebook();
    } catch (e) {
      setErro(mensagemDeErroAuth(e, "Não foi possível entrar com o Facebook."));
    } finally {
      setProvedorSocial(null);
    }
  }

  return (
    <main className="relative flex-1 flex flex-col justify-center px-gutter py-space-xl bg-surface min-h-screen gap-space-lg">
      <div className="flex flex-col items-center gap-space-xs">
        <Logo />
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Entre para começar</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-space-sm max-w-sm w-full mx-auto">
        <div role="radiogroup" aria-label="Tipo de conta" className="vidro flex rounded-full p-1">
          {PAPEIS.map((papel) => {
            const ativo = papelEscolhido === papel.valor;
            return (
              <button
                key={papel.valor}
                type="button"
                role="radio"
                aria-checked={ativo}
                onClick={() => escolherPapel(papel.valor)}
                className={`flex-1 h-11 rounded-full font-label-md text-label-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  ativo ? "vidro-acento" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {papel.rotulo}
              </button>
            );
          })}
        </div>

        <label className="flex flex-col gap-1">
          <span className="font-label-md text-label-md text-on-surface">E-mail</span>
          <input
            type="email"
            {...register("email")}
            className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {errors.email && <span className="font-caption text-caption text-error">{errors.email.message}</span>}
        </label>
        <div className="flex flex-col gap-1">
          <label className="flex flex-col gap-1">
            <span className="font-label-md text-label-md text-on-surface">Senha</span>
            <CampoSenha autoComplete="current-password" {...register("password")} />
            {errors.password && <span className="font-caption text-caption text-error">{errors.password.message}</span>}
          </label>
          <Link
            href="/entrar/esqueci-senha"
            className="self-start inline-flex items-center gap-1 min-h-[44px] -mt-1 font-label-md text-label-md text-primary underline underline-offset-4"
          >
            <MaterialIcon name="lock_reset" className="text-[18px]" />
            Esqueceu a senha?
          </Link>
        </div>

        {erro && (
          <div role="alert" className="flex flex-col gap-space-xs rounded-lg bg-error-container p-space-sm">
            <p className="font-caption text-caption text-error">{erro}</p>
            {semCadastro && (
              <p className="font-caption text-caption text-on-surface-variant">
                Se ainda não tem cadastro,{" "}
                <Link href={papelAtual.href} className="font-label-md text-label-md text-primary underline underline-offset-2">
                  {papelAtual.criar.toLowerCase()}
                </Link>
                .
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="vidro-acento h-12 rounded-full font-label-md text-label-md transition hover:brightness-110 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
          onClick={entrarComFacebook}
          disabled={provedorSocial !== null}
          className="h-12 rounded-xl bg-surface-container-lowest text-on-surface font-label-md text-label-md flex items-center justify-center gap-space-xs neu-surface neu-pressable disabled:opacity-60"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="flex-shrink-0">
            <circle cx="10" cy="10" r="10" fill="#1877F2" />
            <path
              d="M13.2 12.7l.44-2.7h-2.59V8.28c0-.74.36-1.46 1.53-1.46h1.18V4.53s-1.08-.18-2.11-.18c-2.15 0-3.56 1.3-3.56 3.66v2.06H5.83v2.7h2.26v6.53c.45.07.92.11 1.4.11s.94-.04 1.4-.11V12.7h2.31z"
              fill="#fff"
            />
          </svg>
          {provedorSocial === "facebook" ? "Conectando..." : "Continuar com Facebook"}
        </button>
      </form>

      <div className="flex flex-col items-center gap-space-xs">
        <span className="font-body-md text-body-md text-on-surface-variant">Ainda não tem cadastro?</span>
        <Link href={papelAtual.href} className="min-h-11 inline-flex items-center font-label-md text-label-md text-primary underline underline-offset-4">
          {papelAtual.criar}
        </Link>
      </div>
    </main>
  );
}
