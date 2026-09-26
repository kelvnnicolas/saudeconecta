"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/ui/BottomNav";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Logo } from "@/components/ui/Logo";
import { DemandCard } from "@/components/demandas/DemandCard";
import { api, ApiError } from "@/lib/api";
import type { DemandaRead } from "@/lib/types";

export default function OportunidadesPage() {
  const [oportunidades, setOportunidades] = useState<DemandaRead[]>([]);
  const [carregando, setCarregando] = useState(true);
  // GET /demandas/oportunidades não devolve ja_demonstrei_interesse por item —
  // rastreando localmente na sessão depois de um POST /interesse bem-sucedido.
  const [interessesEnviados, setInteressesEnviados] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .oportunidades()
      .then((resposta) => setOportunidades(resposta.items))
      .catch((e) => setErro(e instanceof Error ? e.message : "Não foi possível carregar as oportunidades."))
      .finally(() => setCarregando(false));
  }, []);

  async function demonstrarInteresse(id: string) {
    setEnviando(id);
    setErro(null);
    try {
      await api.demonstrarInteresse(id);
      setInteressesEnviados((atual) => new Set(atual).add(id));
    } catch (e) {
      if (e instanceof ApiError && e.code === "interesse_existente") {
        setInteressesEnviados((atual) => new Set(atual).add(id));
      } else {
        setErro(e instanceof ApiError ? `Não foi possível enviar (${e.code ?? e.message}).` : "Não foi possível enviar. Tente de novo.");
      }
    } finally {
      setEnviando(null);
    }
  }

  return (
    <>
      <main className="flex-1 pt-space-md pb-24 px-gutter bg-surface min-h-screen flex flex-col gap-space-md">
        <div>
          <div className="flex items-center gap-1.5">
            <Logo compact />
            <h1 className="font-headline-md text-headline-md text-on-surface">Oportunidades</h1>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Demandas abertas por empresas compatíveis com suas especialidades e cidade.
          </p>
        </div>

        {carregando && (
          <div className="flex justify-center py-space-lg">
            <MaterialIcon name="progress_activity" className="text-[28px] text-primary animate-spin" />
          </div>
        )}
        {erro && <p className="font-caption text-caption text-error bg-error-container rounded-lg p-space-sm">{erro}</p>}

        <div className="flex flex-col gap-space-sm">
          {oportunidades.map((demanda) => {
            const jaInteressado = interessesEnviados.has(demanda.id);
            return (
              <DemandCard
                key={demanda.id}
                demanda={demanda}
                headerTitle={demanda.empresa_nome}
                footer={
                  <button
                    onClick={() => demonstrarInteresse(demanda.id)}
                    disabled={jaInteressado || enviando === demanda.id}
                    className={`inline-flex items-center gap-1 px-space-md h-10 rounded-xl font-label-md text-label-md transition-colors ${
                      jaInteressado ? "bg-surface-container text-on-surface-variant" : "bg-primary text-on-primary neu-surface active:scale-95"
                    } disabled:opacity-70`}
                  >
                    <MaterialIcon name={jaInteressado ? "check" : "send"} className="text-[18px]" />
                    {jaInteressado ? "Já demonstrou interesse" : enviando === demanda.id ? "Enviando..." : "Tenho interesse"}
                  </button>
                }
              />
            );
          })}
          {!carregando && oportunidades.length === 0 && (
            <p className="font-body-md text-body-md text-on-surface-variant text-center py-space-lg">
              Nenhuma oportunidade compatível no momento.
            </p>
          )}
        </div>
      </main>
      <BottomNav />
    </>
  );
}
