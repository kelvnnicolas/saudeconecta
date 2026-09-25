"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Header } from "@/components/ui/Header";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { type CadastroEmpresaInput, cadastroEmpresaSchema } from "@/lib/validations/auth";
import { signUpWithPassword } from "@/lib/supabase-client";
import { api } from "@/lib/api";
import type { TipoEmpresa } from "@/lib/types";

const TIPOS: { value: TipoEmpresa; label: string; icon: string }[] = [
  { value: "pessoa_fisica", label: "Pessoa Física / Família", icon: "family_restroom" },
  { value: "clinica", label: "Clínica", icon: "local_hospital" },
  { value: "hospital", label: "Hospital", icon: "local_hospital" },
  { value: "homecare", label: "Empresa Home Care", icon: "domain" },
];

export default function CadastroEmpresaPage() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CadastroEmpresaInput>({
    resolver: zodResolver(cadastroEmpresaSchema),
    defaultValues: { tipo: "pessoa_fisica" },
  });
  const tipoSelecionado = watch("tipo");

  async function onSubmit(data: CadastroEmpresaInput) {
    setErro(null);
    setEnviando(true);
    try {
      await signUpWithPassword(data.email, data.password);
      await api.syncProfile({
        papel: "empresa",
        nome: data.nome,
        telefone: data.telefone,
        cidade: data.cidade,
        estado: data.estado,
      });
      await api.updateOwnEmpresa({
        nome_fantasia: data.nomeFantasia,
        tipo: data.tipo,
        cidade: data.cidade,
        estado: data.estado,
      });
      router.push("/perfil");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível concluir o cadastro.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <Header title="Cadastro de Empresa/Pessoa" backHref="/entrar" />
      <main className="flex-1 pt-16 pb-space-xl px-gutter bg-surface min-h-screen">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-space-md max-w-sm w-full mx-auto mt-space-sm">
          <h1 className="font-headline-md text-headline-md text-on-surface">Cadastre-se para contratar</h1>

          <section className="flex flex-col gap-space-sm">
            <h2 className="font-title-md text-title-md text-on-surface">Tipo de contratante</h2>
            <div className="flex flex-wrap gap-space-xs">
              {TIPOS.map((t) => {
                const ativo = tipoSelecionado === t.value;
                return (
                  <button
                    type="button"
                    key={t.value}
                    onClick={() => setValue("tipo", t.value, { shouldValidate: true })}
                    className={`inline-flex items-center gap-1 px-space-sm py-1.5 rounded-full font-label-sm text-label-sm transition-colors ${
                      ativo ? "bg-primary-container text-on-primary" : "bg-surface-container-low text-on-surface"
                    }`}
                  >
                    <MaterialIcon name={t.icon} className="text-[16px]" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-space-sm">
            <label className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface">Seu nome</span>
              <input {...register("nome")} placeholder="ex: Mariana Silveira" className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm" />
              {errors.nome && <span className="font-caption text-caption text-error">{errors.nome.message}</span>}
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface">
                {tipoSelecionado === "pessoa_fisica" ? "Nome da família (opcional)" : "Nome da empresa"}
              </span>
              <input {...register("nomeFantasia")} placeholder="ex: Clínica Estar Home Care" className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm" />
              {errors.nomeFantasia && <span className="font-caption text-caption text-error">{errors.nomeFantasia.message}</span>}
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface">E-mail</span>
              <input type="email" {...register("email")} placeholder="mariana@exemplo.com.br" className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm" />
              {errors.email && <span className="font-caption text-caption text-error">{errors.email.message}</span>}
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface">Telefone</span>
              <input {...register("telefone")} placeholder="(00) 00000-0000" className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm" />
              {errors.telefone && <span className="font-caption text-caption text-error">{errors.telefone.message}</span>}
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface">Senha</span>
              <input type="password" {...register("password")} placeholder="••••••••" className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm" />
              {errors.password && <span className="font-caption text-caption text-error">{errors.password.message}</span>}
            </label>
            <div className="flex gap-space-sm">
              <label className="flex-1 flex flex-col gap-1">
                <span className="font-label-md text-label-md text-on-surface">Cidade</span>
                <input {...register("cidade")} placeholder="ex: Florianópolis" className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm" />
              </label>
              <label className="w-20 flex flex-col gap-1">
                <span className="font-label-md text-label-md text-on-surface">UF</span>
                <input {...register("estado")} placeholder="SC" maxLength={2} className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm uppercase" />
              </label>
            </div>
            {(errors.cidade || errors.estado) && (
              <span className="font-caption text-caption text-error">{errors.cidade?.message ?? errors.estado?.message}</span>
            )}
          </section>

          {erro && <p className="font-caption text-caption text-error bg-error-container rounded-lg p-space-sm">{erro}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="h-12 rounded-xl neu-surface neu-pressable bg-primary text-on-primary font-label-md text-label-md disabled:opacity-60"
          >
            {enviando ? "Enviando..." : "Concluir cadastro"}
          </button>
          <span className="text-center font-body-md text-body-md text-on-surface-variant">
            Já tem conta? <Link href="/entrar" className="text-primary">Entrar</Link>
          </span>
        </form>
      </main>
    </>
  );
}
