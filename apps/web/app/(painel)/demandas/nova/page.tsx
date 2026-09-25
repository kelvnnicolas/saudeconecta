"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Header } from "@/components/ui/Header";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { MOCK_ESPECIALIDADES } from "@/lib/mock-data";
import { type CriarDemandaInput, criarDemandaSchema } from "@/lib/validations/demanda";
import { api } from "@/lib/api";

const TURNOS_SUGERIDOS = [
  "08:00 - 18:00 (10h)",
  "07:00 - 19:00 (12h Dia)",
  "19:00 - 07:00 (12h Noite)",
  "Visita pontual (2h)",
];

// "Serviço requerido" do mockup original não tem campo próprio em DemandaCreate
// (ver docs/design/telas/MANIFEST.md) — aqui vira um atalho que prefixa a
// descrição livre, em vez de um campo separado inventado no request.
const SERVICOS_SUGERIDOS = [
  "Cuidados domiciliares (Home Care)",
  "Administração de medicação",
  "Acompanhamento pós-cirúrgico",
  "Curativos e cuidados com feridas",
];

export default function CriarNovaDemandaPage() {
  const router = useRouter();
  const [enviada, setEnviada] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CriarDemandaInput>({ resolver: zodResolver(criarDemandaSchema) });
  const descricao = watch("descricao") ?? "";

  function aplicarServicoSugerido(servico: string) {
    const atual = descricao.trim();
    const jaTem = atual.startsWith(servico);
    setValue("descricao", jaTem ? atual : `${servico}: ${atual}`.trim(), { shouldValidate: true });
  }

  async function onSubmit(data: CriarDemandaInput) {
    setErro(null);
    try {
      await api.criarDemanda({
        especialidade_id: data.especialidadeId,
        cidade: data.cidade,
        estado: data.estado,
        bairro: data.bairro || null,
        data_inicio: data.dataInicio,
        turno: data.turno,
        descricao: data.descricao,
        valor_oferecido: data.valorOferecido ?? null,
      });
      setEnviada(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível publicar a demanda.");
    }
  }

  if (enviada) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-space-md bg-surface min-h-screen px-gutter text-center">
        <MaterialIcon name="check_circle" filled className="text-[56px] text-secondary" />
        <h1 className="font-headline-md text-headline-md text-on-surface">Demanda publicada!</h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
          Os profissionais qualificados na região já foram notificados da sua solicitação.
        </p>
        <button onClick={() => router.push("/demandas")} className="px-space-md h-11 rounded-xl neu-surface neu-pressable bg-primary text-on-primary font-label-md text-label-md">
          Acompanhar respostas
        </button>
      </main>
    );
  }

  return (
    <>
      <Header title="Criar Nova Demanda" backHref="/demandas" />
      <main className="flex-1 pt-16 pb-space-xl px-gutter bg-surface min-h-screen">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-space-md max-w-sm w-full mx-auto mt-space-sm">
          <div className="flex flex-col gap-1">
            <h1 className="font-headline-md text-headline-md text-on-surface">Precisa de um profissional?</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Publique sua necessidade e receba profissionais compatíveis.
            </p>
          </div>

          <label className="flex flex-col gap-1">
            <span className="font-label-md text-label-md text-on-surface">Qual profissional?</span>
            <select
              {...register("especialidadeId", { valueAsNumber: true })}
              defaultValue=""
              className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm"
            >
              <option value="" disabled>Selecione a especialidade</option>
              {MOCK_ESPECIALIDADES.map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
            {errors.especialidadeId && <span className="font-caption text-caption text-error">{errors.especialidadeId.message}</span>}
          </label>

          <div className="flex gap-space-sm">
            <label className="flex-1 flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface">Cidade</span>
              <input {...register("cidade")} className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm" />
            </label>
            <label className="w-20 flex flex-col gap-1">
              <span className="font-label-md text-label-md text-on-surface">UF</span>
              <input {...register("estado")} maxLength={2} className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm uppercase" />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="font-label-md text-label-md text-on-surface">Bairro (opcional)</span>
            <input {...register("bairro")} className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm" />
          </label>
          {(errors.cidade || errors.estado) && (
            <span className="font-caption text-caption text-error">{errors.cidade?.message ?? errors.estado?.message}</span>
          )}

          <label className="flex flex-col gap-1">
            <span className="font-label-md text-label-md text-on-surface">Data de início</span>
            <input type="date" {...register("dataInicio")} className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm" />
            {errors.dataInicio && <span className="font-caption text-caption text-error">{errors.dataInicio.message}</span>}
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-label-md text-label-md text-on-surface">Turno / horário</span>
            <input {...register("turno")} placeholder="Ex.: 07:00 - 19:00 (12h Dia)" className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm" />
            <div className="flex flex-wrap gap-space-xs mt-1">
              {TURNOS_SUGERIDOS.map((t) => (
                <button type="button" key={t} onClick={() => setValue("turno", t, { shouldValidate: true })} className="px-space-sm py-1 rounded-full bg-surface-container-low text-on-surface-variant font-caption text-caption">
                  {t}
                </button>
              ))}
            </div>
            {errors.turno && <span className="font-caption text-caption text-error">{errors.turno.message}</span>}
          </label>

          <label className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface">Descrição da necessidade</span>
              <span className="font-caption text-caption text-on-surface-variant">{descricao.length}/500</span>
            </div>
            <textarea
              {...register("descricao")}
              rows={4}
              maxLength={500}
              placeholder="Conte mais sobre o que você precisa..."
              className="px-space-md py-space-sm rounded-xl bg-surface-container-lowest neu-inset-sm resize-none"
            />
            <div className="flex flex-wrap gap-space-xs">
              {SERVICOS_SUGERIDOS.map((s) => (
                <button type="button" key={s} onClick={() => aplicarServicoSugerido(s)} className="px-space-sm py-1 rounded-full bg-surface-container-low text-on-surface-variant font-caption text-caption">
                  {s}
                </button>
              ))}
            </div>
            {errors.descricao && <span className="font-caption text-caption text-error">{errors.descricao.message}</span>}
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-label-md text-label-md text-on-surface">Remuneração oferecida (opcional)</span>
            <input type="number" step="0.01" {...register("valorOferecido")} placeholder="Ex.: 180" className="h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm" />
            {errors.valorOferecido && <span className="font-caption text-caption text-error">{errors.valorOferecido.message}</span>}
          </label>

          {erro && <p className="font-caption text-caption text-error bg-error-container rounded-lg p-space-sm">{erro}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 rounded-xl neu-surface neu-pressable bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-space-xs disabled:opacity-60"
          >
            <MaterialIcon name="send" className="text-[18px]" />
            Publicar demanda
          </button>
          <span className="text-center font-caption text-caption text-on-surface-variant">
            Sem taxas para publicação inicial &middot; cancele quando desejar
          </span>
        </form>
      </main>
    </>
  );
}
