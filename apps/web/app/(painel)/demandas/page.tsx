"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BottomNav } from "@/components/ui/BottomNav";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Logo } from "@/components/ui/Logo";
import { DemandaStatusBadge } from "@/components/ui/StatusBadge";
import { api, ApiError } from "@/lib/api";
import type { DemandaDetalheEmpresa, InteressadoRead, MinhaDemandaRead, StatusDemanda } from "@/lib/types";

const ABAS: { value: "todas" | StatusDemanda; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "aberta", label: "Abertas" },
  { value: "preenchida", label: "Preenchidas" },
  { value: "expirada", label: "Expiradas" },
];

export default function MinhasDemandasPage() {
  const [demandas, setDemandas] = useState<MinhaDemandaRead[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<(typeof ABAS)[number]["value"]>("todas");
  const [expandida, setExpandida] = useState<string | null>(null);
  const [interessadosPorDemanda, setInteressadosPorDemanda] = useState<Record<string, InteressadoRead[]>>({});
  const [carregandoInteressados, setCarregandoInteressados] = useState<string | null>(null);

  useEffect(() => {
    api
      .minhasDemandas()
      .then(setDemandas)
      .catch((e) => setErro(e instanceof Error ? e.message : "Não foi possível carregar as demandas."))
      .finally(() => setCarregando(false));
  }, []);

  const filtradas = useMemo(
    () => demandas.filter((d) => aba === "todas" || d.status === aba),
    [demandas, aba],
  );

  async function alternarExpandida(id: string) {
    const proxima = expandida === id ? null : id;
    setExpandida(proxima);
    if (proxima && !interessadosPorDemanda[proxima]) {
      setCarregandoInteressados(proxima);
      try {
        const detalhe = (await api.detalheDemanda(proxima)) as DemandaDetalheEmpresa;
        setInteressadosPorDemanda((atual) => ({ ...atual, [proxima]: detalhe.interessados }));
      } catch {
        setInteressadosPorDemanda((atual) => ({ ...atual, [proxima]: [] }));
      } finally {
        setCarregandoInteressados(null);
      }
    }
  }

  async function mudarStatus(id: string, status: StatusDemanda) {
    const anterior = demandas;
    setDemandas((atual) => atual.map((d) => (d.id === id ? { ...d, status } : d)));
    try {
      await api.atualizarStatusDemanda(id, status);
    } catch (e) {
      setDemandas(anterior); // reverte o optimistic update
      if (!(e instanceof ApiError && e.code === "transicao_invalida")) {
        setErro(e instanceof Error ? e.message : "Não foi possível atualizar o status.");
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

        {carregando && (
          <div className="flex justify-center py-space-lg">
            <MaterialIcon name="progress_activity" className="text-[28px] text-primary animate-spin" />
          </div>
        )}
        {erro && <p className="font-caption text-caption text-error bg-error-container rounded-lg p-space-sm">{erro}</p>}

        <div className="flex flex-col gap-space-sm">
          {filtradas.map((d) => {
            const aberta = expandida === d.id;
            const interessados = interessadosPorDemanda[d.id];
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
                  onClick={() => alternarExpandida(d.id)}
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
                    {carregandoInteressados === d.id && (
                      <div className="flex justify-center py-space-sm">
                        <MaterialIcon name="progress_activity" className="text-[20px] text-primary animate-spin" />
                      </div>
                    )}
                    {interessados?.map((p) => (
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
                          <span className="font-caption text-caption text-on-surface-variant">
                            Interessado(a) em {new Date(p.criado_em).toLocaleDateString("pt-BR")}
                          </span>
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
          {!carregando && filtradas.length === 0 && (
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
