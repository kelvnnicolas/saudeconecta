"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Header } from "@/components/ui/Header";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { type CadastroProfissionalInput, cadastroProfissionalSchema } from "@/lib/validations/auth";
import { MOCK_ESPECIALIDADES } from "@/lib/mock-data";
import { signUpWithPassword } from "@/lib/supabase-client";
import { api } from "@/lib/api";

export default function CadastroProfissionalPage() {
  const router = useRouter();
  const [especialidadeIds, setEspecialidadeIds] = useState<number[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CadastroProfissionalInput>({ resolver: zodResolver(cadastroProfissionalSchema) });

  function toggleEspecialidade(id: number) {
    setEspecialidadeIds((atual) => {
      const proximo = atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id];
      setValue("especialidadeIds", proximo, { shouldValidate: true });
      return proximo;
    });
  }

  async function onSubmit(data: CadastroProfissionalInput) {
    setErro(null);
    setEnviando(true);
    try {
      // Fluxo real são 3 chamadas: Supabase Auth -> POST /auth/sync (cria o
      // profile) -> PUT /profissionais/me (especialidades, registro, preço).
      // Ver docs/design/telas/MANIFEST.md.
      await signUpWithPassword(data.email, data.password);
      await api.syncProfile({
        papel: "profissional",
        nome: data.nome,
        telefone: data.telefone,
        cidade: data.cidade,
        estado: data.estado,
      });
      await api.updateOwnProfissional({
        registro_profissional: data.registroProfissional,
        preco_hora: data.precoHora ?? null,
        especialidade_ids: data.especialidadeIds,
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
      <Header title="Detalhes do Profissional" backHref="/entrar" />
      <main className="flex-1 pt-16 pb-space-xl px-gutter bg-surface min-h-screen">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-space-md max-w-sm w-full mx-auto mt-space-sm">
          <h1 className="font-headline-md text-headline-md text-on-surface">Crie seu perfil profissional</h1>

          <section className="flex flex-col gap-space-sm">
            <h2 className="font-title-md text-title-md text-on-surface">Dados pessoais</h2>
            <label className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface">Nome completo</span>
              <input {...register("nome")} placeholder="Ex.: Dra. Camila Vasconcelos" className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm" />
              {errors.nome && <span className="font-caption text-caption text-error">{errors.nome.message}</span>}
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface">E-mail profissional</span>
              <input type="email" {...register("email")} placeholder="camila.saude@exemplo.com.br" className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm" />
              {errors.email && <span className="font-caption text-caption text-error">{errors.email.message}</span>}
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface">Telefone / WhatsApp</span>
              <input {...register("telefone")} placeholder="(48) 99123-4567" className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm" />
              {errors.telefone && <span className="font-caption text-caption text-error">{errors.telefone.message}</span>}
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface">Senha de acesso</span>
              <input type="password" {...register("password")} placeholder="Mínimo 8 caracteres" className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm" />
              {errors.password && <span className="font-caption text-caption text-error">{errors.password.message}</span>}
            </label>
          </section>

          <section className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-title-md text-title-md text-on-surface">Especialidade e registro</h2>
              <span className="font-caption text-caption text-on-surface-variant">{especialidadeIds.length} selec.</span>
            </div>
            <div className="flex flex-wrap gap-space-xs">
              {MOCK_ESPECIALIDADES.map((esp) => {
                const ativo = especialidadeIds.includes(esp.id);
                return (
                  <button
                    type="button"
                    key={esp.id}
                    onClick={() => toggleEspecialidade(esp.id)}
                    className={`inline-flex items-center gap-1 px-space-sm py-1.5 rounded-full font-label-sm text-label-sm transition-colors ${
                      ativo ? "bg-primary-container text-on-primary" : "bg-surface-container-low text-on-surface"
                    }`}
                  >
                    <MaterialIcon name={ativo ? "check" : "add"} className="text-[16px]" />
                    {esp.nome}
                  </button>
                );
              })}
            </div>
            {errors.especialidadeIds && (
              <span className="font-caption text-caption text-error">{errors.especialidadeIds.message}</span>
            )}
            <label className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface">Registro profissional (conselho)</span>
              <input {...register("registroProfissional")} placeholder="Ex.: COREN-SC 123.456 ou CRM 45210" className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm" />
              {errors.registroProfissional && <span className="font-caption text-caption text-error">{errors.registroProfissional.message}</span>}
            </label>
          </section>

          <section className="flex flex-col gap-space-sm">
            <h2 className="font-title-md text-title-md text-on-surface">Local e remuneração base</h2>
            <div className="flex gap-space-sm">
              <label className="flex-1 flex flex-col gap-1">
                <span className="font-label-md text-label-md text-on-surface">Cidade</span>
                <input {...register("cidade")} placeholder="Florianópolis" className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm" />
              </label>
              <label className="w-20 flex flex-col gap-1">
                <span className="font-label-md text-label-md text-on-surface">UF</span>
                <input {...register("estado")} placeholder="SC" maxLength={2} className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm uppercase" />
              </label>
            </div>
            {(errors.cidade || errors.estado) && (
              <span className="font-caption text-caption text-error">{errors.cidade?.message ?? errors.estado?.message}</span>
            )}
            <label className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface">Preço base por hora (R$)</span>
              <input type="number" step="0.01" {...register("precoHora")} placeholder="Ex.: 45" className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm" />
              {errors.precoHora && <span className="font-caption text-caption text-error">{errors.precoHora.message}</span>}
            </label>
          </section>

          {erro && <p className="font-caption text-caption text-error bg-error-container rounded-lg p-space-sm">{erro}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="h-12 rounded-xl neu-surface neu-pressable bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-space-xs disabled:opacity-60"
          >
            {enviando ? "Enviando..." : "Concluir cadastro profissional"}
            <MaterialIcon name="arrow_forward" className="text-[18px]" />
          </button>
          <span className="text-center font-body-md text-body-md text-on-surface-variant">
            Já tem conta? <Link href="/entrar" className="text-primary">Entrar</Link>
          </span>
        </form>
      </main>
    </>
  );
}
