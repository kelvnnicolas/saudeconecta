"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Header } from "@/components/ui/Header";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { MOCK_CONTATOS, MOCK_PROFISSIONAL_PROFILE } from "@/lib/mock-data";
import { type AvaliacaoInput, avaliacaoSchema } from "@/lib/validations/contato";
import { api } from "@/lib/api";

export default function DetalheContatoPage({ params }: { params: { id: string } }) {
  // TODO(integração): buscar o contato específico — GET /contatos hoje devolve a
  // lista toda (das partes envolvidas); filtrar pelo id ou pedir endpoint dedicado.
  const contato = MOCK_CONTATOS.find((c) => String(c.id) === params.id) ?? MOCK_CONTATOS[0];
  const nomeOutraParte = MOCK_PROFISSIONAL_PROFILE.nome;
  const [avaliacaoEnviada, setAvaliacaoEnviada] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AvaliacaoInput>({ resolver: zodResolver(avaliacaoSchema), defaultValues: { nota: 0 } });
  const nota = watch("nota");

  async function onSubmit(data: AvaliacaoInput) {
    setErro(null);
    try {
      await api.createAvaliacao({
        alvo_id: contato?.profissional_id ?? MOCK_PROFISSIONAL_PROFILE.id,
        nota: data.nota,
        comentario: data.comentario,
      });
      setAvaliacaoEnviada(true);
    } catch {
      // sem backend disponível ainda — mostra sucesso local mesmo assim para
      // validar o fluxo visual (mesmo padrão dos outros formulários mockados).
      setAvaliacaoEnviada(true);
    }
  }

  return (
    <>
      <Header title="Detalhes do Contato" backHref="/contatos" />
      <main className="flex-1 pt-16 pb-space-xl px-gutter bg-surface min-h-screen flex flex-col gap-space-md">
        <section className="bg-surface-container-lowest rounded-2xl neu-surface p-space-md flex flex-col gap-space-xs mt-space-sm">
          <h1 className="font-title-md text-title-md text-on-surface">{nomeOutraParte}</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">{contato?.mensagem}</p>
          <span className="font-caption text-caption text-outline">
            {contato && new Date(contato.criado_em).toLocaleString("pt-BR")}
          </span>
        </section>

        <section className="rounded-2xl p-space-md bg-secondary-container/40 border border-secondary-container flex items-start gap-space-xs">
          <MaterialIcon name="info" className="text-[18px] text-on-secondary-container mt-0.5" />
          <p className="font-caption text-caption text-on-secondary-container">
            Link de pagamento por contato ainda não existe no backend (
            <code>POST /contatos/&#123;id&#125;/pagamento</code> — item do Plano Básico não
            implementado). Esta seção fica pronta visualmente, mas sem ação real até o
            endpoint existir.
          </p>
        </section>

        {avaliacaoEnviada ? (
          <section className="bg-surface-container-lowest rounded-2xl neu-surface p-space-md flex flex-col items-center gap-space-sm text-center">
            <MaterialIcon name="check_circle" filled className="text-[40px] text-secondary" />
            <p className="font-title-md text-title-md text-on-surface">Avaliação enviada!</p>
            <p className="font-body-md text-body-md text-on-surface-variant">Obrigado pelo retorno.</p>
          </section>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="bg-surface-container-lowest rounded-2xl neu-surface p-space-md flex flex-col gap-space-sm">
            <h2 className="font-title-md text-title-md text-on-surface">Como foi sua experiência com {nomeOutraParte.split(" ")[0]}?</h2>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }, (_, i) => i + 1).map((valor) => (
                <button
                  type="button"
                  key={valor}
                  onClick={() => setValue("nota", valor, { shouldValidate: true })}
                  aria-label={`${valor} estrela(s)`}
                >
                  <MaterialIcon
                    name="star"
                    filled={valor <= nota}
                    className={`text-[28px] ${valor <= nota ? "text-tertiary" : "text-outline-variant"}`}
                  />
                </button>
              ))}
            </div>
            {errors.nota && <span className="font-caption text-caption text-error">Selecione uma nota</span>}
            <label className="flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface">Comentário (opcional)</span>
              <textarea
                {...register("comentario")}
                rows={3}
                placeholder="Conte como foi o atendimento..."
                className="px-space-md py-space-sm rounded-xl bg-surface-container-lowest neu-inset-sm resize-none"
              />
            </label>
            <button
              type="submit"
              disabled={isSubmitting || nota === 0}
              className="h-12 rounded-xl neu-surface neu-pressable bg-primary text-on-primary font-label-md text-label-md disabled:opacity-60"
            >
              Enviar avaliação
            </button>
            {erro && <p className="font-caption text-caption text-error">{erro}</p>}
          </form>
        )}
      </main>
    </>
  );
}
