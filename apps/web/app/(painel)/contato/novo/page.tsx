"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Header } from "@/components/ui/Header";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { type NovoContatoInput, novoContatoSchema } from "@/lib/validations/contato";
import { api } from "@/lib/api";

export default function NovoContatoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const profissionalId = searchParams.get("profissional_id") ?? "";
  const nome = searchParams.get("nome") ?? "o profissional";
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<NovoContatoInput>({ resolver: zodResolver(novoContatoSchema) });
  const mensagem = watch("mensagem") ?? "";

  async function onSubmit(data: NovoContatoInput) {
    setErro(null);
    try {
      await api.createContato({ profissional_id: profissionalId, mensagem: data.mensagem });
      setEnviado(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar. Tente novamente.");
    }
  }

  if (enviado) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-space-md bg-surface min-h-screen px-gutter text-center">
        <MaterialIcon name="check_circle" filled className="text-[56px] text-secondary" />
        <h1 className="font-headline-md text-headline-md text-on-surface">Proposta enviada!</h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
          {nome} vai receber sua mensagem por e-mail e poderá te responder por aqui.
        </p>
        <button
          onClick={() => router.push("/contatos")}
          className="px-space-md h-11 rounded-xl neu-surface neu-pressable bg-primary text-on-primary font-label-md text-label-md"
        >
          Ver meus contatos
        </button>
      </main>
    );
  }

  return (
    <>
      <Header title="Novo Contato" backHref="/buscar" />
      <main className="flex-1 pt-16 pb-space-xl px-gutter bg-surface min-h-screen">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-space-md max-w-sm w-full mx-auto mt-space-sm">
          <div className="flex flex-col gap-1">
            <span className="font-caption text-caption text-on-surface-variant">Enviando para</span>
            <h1 className="font-title-md text-title-md text-on-surface">{nome}</h1>
          </div>
          <label className="flex flex-col gap-1">
            <span className="font-label-md text-label-md text-on-surface">Mensagem</span>
            <textarea
              {...register("mensagem")}
              rows={5}
              maxLength={1000}
              placeholder="Descreva a necessidade, cuidados requeridos, medicamentos ou tipo de procedimento..."
              className="px-space-md py-space-sm rounded-xl bg-surface-container-lowest neu-inset-sm resize-none"
            />
            <span className="self-end font-caption text-caption text-on-surface-variant">{mensagem.length}/1000</span>
            {errors.mensagem && <span className="font-caption text-caption text-error">{errors.mensagem.message}</span>}
          </label>
          {erro && <p className="font-caption text-caption text-error bg-error-container rounded-lg p-space-sm">{erro}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 rounded-xl neu-surface neu-pressable bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-space-xs disabled:opacity-60"
          >
            <MaterialIcon name="send" className="text-[18px]" />
            Enviar proposta
          </button>
        </form>
      </main>
    </>
  );
}
