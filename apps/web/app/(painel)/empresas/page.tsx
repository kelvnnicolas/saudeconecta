"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BottomNav } from "@/components/ui/BottomNav";
import { CidadeEstadoFields } from "@/components/ui/CidadeEstadoFields";
import { Logo } from "@/components/ui/Logo";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { ListaEsqueleto } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import type { EmpresaDiretorioResult, TipoEmpresa } from "@/lib/types";

const POR_PAGINA = 20;

const TIPOS: { value: Exclude<TipoEmpresa, "pessoa_fisica">; label: string; icon: string }[] = [
  { value: "clinica", label: "Clínica", icon: "medical_services" },
  { value: "hospital", label: "Hospital", icon: "local_hospital" },
  { value: "homecare", label: "Home care", icon: "home_health" },
];

const ROTULO_TIPO: Record<TipoEmpresa, string> = {
  clinica: "Clínica",
  hospital: "Hospital",
  homecare: "Home care",
  pessoa_fisica: "Pessoa física",
};

function textoDemandas(total: number) {
  if (total === 0) return "Nenhuma demanda aberta";
  return total === 1 ? "1 demanda aberta" : `${total} demandas abertas`;
}

export default function EmpresasPage() {
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<TipoEmpresa | "">("");
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [empresas, setEmpresas] = useState<EmpresaDiretorioResult[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    const id = setTimeout(() => {
      api
        .diretorioEmpresas({
          q: busca.trim() || undefined,
          tipo: tipo || undefined,
          estado: estado || undefined,
          cidade: cidade || undefined,
          limit: POR_PAGINA,
        })
        .then((resposta) => {
          if (!ativo) return;
          setEmpresas(resposta.items);
          setTotal(resposta.total);
          setErro(null);
        })
        .catch((e) => ativo && setErro(e instanceof Error ? e.message : "Não foi possível carregar as empresas."))
        .finally(() => ativo && setCarregando(false));
    }, 300);
    return () => {
      ativo = false;
      clearTimeout(id);
    };
  }, [busca, tipo, estado, cidade]);

  async function verMais() {
    setCarregandoMais(true);
    try {
      const resposta = await api.diretorioEmpresas({
        q: busca.trim() || undefined,
        tipo: tipo || undefined,
        estado: estado || undefined,
        cidade: cidade || undefined,
        limit: POR_PAGINA,
        offset: empresas.length,
      });
      setEmpresas((atual) => [...atual, ...resposta.items]);
      setTotal(resposta.total);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar mais empresas.");
    } finally {
      setCarregandoMais(false);
    }
  }

  return (
    <>
      <main className="flex-1 pt-space-md pb-24 px-gutter bg-surface min-h-screen flex flex-col gap-space-md">
        <div className="flex items-start justify-between gap-space-sm">
          <div>
            <div className="flex items-center gap-1.5">
              <Logo compact />
              <h1 className="font-headline-md text-headline-md text-on-surface">Empresas</h1>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Veja quem está contratando na sua região.
            </p>
          </div>
          <NotificationBell />
        </div>

        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-space-md flex items-center pointer-events-none text-outline">
            <MaterialIcon name="search" className="text-[20px]" />
          </div>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            type="text"
            aria-label="Buscar empresa por nome"
            placeholder="Buscar empresa por nome..."
            className="w-full h-12 pl-11 pr-space-md rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-outline neu-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
          />
        </div>

        <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar py-0.5" role="group" aria-label="Tipo de empresa">
          <button
            onClick={() => setTipo("")}
            aria-pressed={tipo === ""}
            className={`flex-shrink-0 px-space-md py-1.5 rounded-full font-label-sm text-label-sm ${
              tipo === "" ? "bg-primary text-on-primary neu-surface" : "bg-surface-container-high text-on-surface-variant"
            }`}
          >
            Todas
          </button>
          {TIPOS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTipo(t.value)}
              aria-pressed={tipo === t.value}
              className={`flex-shrink-0 px-space-md py-1.5 rounded-full font-label-sm text-label-sm ${
                tipo === t.value ? "bg-primary text-on-primary neu-surface" : "bg-surface-container-high text-on-surface-variant"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <CidadeEstadoFields
          estado={estado}
          cidade={cidade}
          onChange={(campo, valor) => (campo === "estado" ? setEstado(valor) : setCidade(valor))}
        />

        {carregando && <ListaEsqueleto />}
        {erro && <p className="font-caption text-caption text-error bg-error-container rounded-lg p-space-sm">{erro}</p>}

        {!carregando && (
          <div className="flex flex-col gap-space-sm">
            {empresas.map((e) => (
              <article key={e.user_id} className="bg-surface-container-lowest rounded-2xl neu-surface p-space-md flex items-start gap-space-md">
                {e.avatar_url ? (
                  <Image src={e.avatar_url} alt={e.nome_fantasia} width={56} height={56} className="w-14 h-14 rounded-xl object-cover bg-surface-variant flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant flex-shrink-0">
                    <MaterialIcon name="apartment" />
                  </div>
                )}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <h2 className="font-title-md text-title-md text-on-surface line-clamp-1">{e.nome_fantasia}</h2>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {ROTULO_TIPO[e.tipo]}
                    {e.cidade ? ` · ${e.cidade}${e.estado ? `, ${e.estado}` : ""}` : ""}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 mt-1 font-label-md text-label-md ${
                      e.demandas_abertas > 0 ? "text-primary" : "text-on-surface-variant"
                    }`}
                  >
                    <MaterialIcon name="work" className="text-[16px]" />
                    {textoDemandas(e.demandas_abertas)}
                  </span>
                </div>
              </article>
            ))}

            {empresas.length === 0 && !erro && (
              <p className="font-body-md text-body-md text-on-surface-variant text-center py-space-lg">
                Nenhuma empresa encontrada com esses filtros.
              </p>
            )}

            {empresas.length < total && (
              <button
                onClick={verMais}
                disabled={carregandoMais}
                className="h-11 rounded-xl bg-surface-container-high text-on-surface font-label-md text-label-md disabled:opacity-60"
              >
                {carregandoMais ? "Carregando..." : "Ver mais"}
              </button>
            )}
          </div>
        )}

        <Link href="/oportunidades" className="self-center font-label-md text-label-md text-primary py-space-xs">
          Ver oportunidades para você
        </Link>
      </main>
      <BottomNav />
    </>
  );
}
