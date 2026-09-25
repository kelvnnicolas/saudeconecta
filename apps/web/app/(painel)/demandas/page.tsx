"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BottomNav } from "@/components/ui/BottomNav";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Logo } from "@/components/ui/Logo";
import { DemandaStatusBadge } from "@/components/ui/StatusBadge";
import { MOCK_MINHAS_DEMANDAS } from "@/lib/mock-data";
import { api, ApiError } from "@/lib/api";
import type { MinhaDemandaRead, StatusDemanda } from "@/lib/types";

const ABAS: { value: "todas" | StatusDemanda; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "aberta", label: "Abertas" },
  { value: "preenchida", label: "Preenchidas" },
  { value: "expirada", label: "Expiradas" },
];

// Interessados de exemplo só pra ilustrar o accordion (DemandaDetalheEmpresa.interessados
// vem de GET /demandas/{id}, não da listagem /demandas/minhas). Ver TODO abaixo.
const INTERESSADOS_MOCK = [
  { contato_id: 201, profissional_id: "aaaaaaaa-0000-0000-0000-000000000001", nome: "Ana Silva", avatar_url: null, diasAtras: 2 },
  { contato_id: 202, profissional_id: "aaaaaaaa-0000-0000-0000-000000000010", nome: "Rafael Lima", avatar_url: null, diasAtras: 1 },
];

export default function MinhasDemandasPage() {
  // TODO(integração): api.minhasDemandas() — GET /demandas/minhas.
  const [demandas, setDemandas] = useState<MinhaDemandaRead[]>(MOCK_MINHAS_DEMANDAS);
  const [aba, setAba] = useState<(typeof ABAS)[number]["value"]>("todas");
  const [expandida, setExpandida] = useState<string | null>(null);

  const filtradas = useMemo(
    () => demandas.filter((d) => aba === "todas" || d.status === aba),
    [demandas, aba],
  );

  async function mudarStatus(id: string, status: StatusDemanda) {
    setDemandas((atual) => atual.map((d) => (d.id === id ? { ...d, status } : d)));
    try {
      // TODO(integração): quando a API estiver no ar, o optimistic update acima
      // já cobre a UI; aqui só propaga o erro se o backend recusar a transição.
      await api.atualizarStatusDemanda(id, status);
    } catch (e) {
      if (e instanceof ApiError && e.code === "transicao_invalida") {
        setDemandas(MOCK_MINHAS_DEMANDAS); // reverte
      }
    }
  }

  return (
    <>
      <main className="flex-1 pt-space-md pb-24 px-gutter bg-surface min-h-screen flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <Logo compact />
            <h1 className="font-headline-md text-headline-md text-on-surface">Minhas Demandas</h1>
          </div>
          <Link
            href="/demandas/nova"
            aria-label="Nova demanda"
            className="w-11 h-11 flex items-center justify-center rounded-full bg-primary text-on-primary neu-surface"
          >
            <MaterialIcon name="add" />
          </Link>
        </div>

        <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar py-0.5">
          {ABAS.map((a) => {
            const count = a.value === "todas" ? demandas.length : demandas.filter((d) => d.status === a.value).length;
            const ativo = aba === a.value;
            return (
              <button
                key={a.value}
                onClick={() => setAba(a.value)}
                className={`flex-shrink-0 px-space-md py-1.5 rounded-full font-label-sm text-label-sm ${
                  ativo ? "bg-primary text-on-primary neu-surface" : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {a.label} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-space-sm">
          {filtradas.map((d) => {
            const aberta = expandida === d.id;
            return (
              <article key={d.id} className="bg-surface-container-lowest rounded-2xl neu-surface overflow-hidden">
                <div className="p-space-md flex flex-col gap-space-sm">
                  <div className="flex items-start justify-between gap-space-sm">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-title-md text-title-md text-on-surface">{d.especialidade_nome}</span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        {d.cidade}, {d.estado}
                        {d.bairro ? ` - ${d.bairro}` : ""}
                      </span>
                    </div>
                    <DemandaStatusBadge status={d.status} />
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2">{d.descricao}</p>
                </div>
                <button
                  onClick={() => setExpandida(aberta ? null : d.id)}
                  className="w-full flex items-center justify-between px-space-md py-space-sm border-t border-outline-variant/30 bg-surface-container-low"
                >
                  <span className="inline-flex items-center gap-1 font-label-md text-label-md text-on-surface">
                    <MaterialIcon name="groups" className="text-[18px] text-primary" />
                    {d.interessados_count} profissional(is) interessado(s)
                  </span>
                  <MaterialIcon name={aberta ? "expand_less" : "expand_more"} className="text-[18px] text-on-surface-variant" />
                </button>
                {aberta && (
                  <div className="flex flex-col divide-y divide-outline-variant/20">
                    {/* TODO(integração): api.detalheDemanda(d.id) -> interessados */}
                    {INTERESSADOS_MOCK.slice(0, d.interessados_count).map((p) => (
                      <div key={p.contato_id} className="flex items-center gap-space-sm px-space-md py-space-sm">
                        {p.avatar_url ? (
                          <Image src={p.avatar_url} alt={p.nome} width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                            <MaterialIcon name="person" className="text-[18px]" />
                          </div>
                        )}
                        <div className="flex-1 flex flex-col">
                          <span className="font-label-md text-label-md text-on-surface">{p.nome}</span>
                          <span className="font-caption text-caption text-on-surface-variant">Interessado(a) há {p.diasAtras} dia(s)</span>
                        </div>
                        <Link href="/contatos" className="px-space-sm h-9 rounded-lg bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm flex items-center">
                          Ver conversa
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
                {d.status === "aberta" && (
                  <div className="flex items-center gap-space-xs px-space-md py-space-sm border-t border-outline-variant/30">
                    <button onClick={() => mudarStatus(d.id, "preenchida")} className="flex-1 h-10 rounded-xl bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                      Marcar como preenchida
                    </button>
                    <button onClick={() => mudarStatus(d.id, "encerrada")} className="flex-1 h-10 rounded-xl bg-error-container text-on-error-container font-label-sm text-label-sm">
                      Encerrar
                    </button>
                  </div>
                )}
              </article>
            );
          })}
          {filtradas.length === 0 && (
            <p className="font-body-md text-body-md text-on-surface-variant text-center py-space-lg">
              Nenhuma demanda nesta categoria.
            </p>
          )}
        </div>
      </main>
      <BottomNav />
    </>
  );
}
