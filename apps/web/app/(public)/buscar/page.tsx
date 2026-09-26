"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/ui/BottomNav";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Logo } from "@/components/ui/Logo";
import { ProfessionalCard } from "@/components/busca/ProfessionalCard";
import { api } from "@/lib/api";
import type { ProfissionalSearchResult } from "@/lib/types";

// Agrupamento de UX só do frontend — GET /profissionais não tem conceito de
// "categoria", cada tile aqui manda uma busca de texto (q) com o nome da
// especialidade. Ver docs/design/telas/MANIFEST.md.
const CATEGORIAS = [
  { icon: "medical_services", label: "Enfermagem & Técnicos", q: "enfermagem" },
  { icon: "stethoscope", label: "Médicos & Plantonistas", q: "medicina" },
  { icon: "accessibility_new", label: "Fisioterapia", q: "fisioterapia" },
  { icon: "volunteer_activism", label: "Cuidadores Home Care", q: "cuidador" },
  { icon: "nutrition", label: "Nutrição Clínica", q: "nutrição" },
  { icon: "psychology", label: "Psicologia & Fono", q: "psicologia" },
];

export default function BuscarPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [resultados, setResultados] = useState<ProfissionalSearchResult[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const termo = query.trim();
    setCarregando(true);
    const id = setTimeout(() => {
      api
        .searchProfissionais(termo ? { q: termo } : {})
        .then((resposta) => {
          setResultados(resposta.items);
          setErro(null);
        })
        .catch((e) => setErro(e instanceof Error ? e.message : "Não foi possível buscar."))
        .finally(() => setCarregando(false));
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  return (
    <>
      <main className="flex-1 pt-space-md pb-24 px-gutter flex flex-col gap-space-md bg-surface min-h-screen">
        <div className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-space-xs">
            <button aria-label="Notificações" className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant neu-surface-sm neu-pressable">
              <MaterialIcon name="notifications" />
            </button>
            <ThemeToggle />
          </div>
        </div>
        <p className="font-caption text-caption text-on-surface-variant">+1.400 profissionais ativos</p>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">
          Encontre profissionais de saúde para o que você precisa.
        </h1>

        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-space-md flex items-center pointer-events-none text-outline">
            <MaterialIcon name="search" className="text-[20px]" />
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Buscar por nome ou especialidade..."
            className="w-full h-12 pl-11 pr-space-md rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-outline neu-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-space-sm">
            <h2 className="font-title-md text-title-md text-on-surface">Especialidades</h2>
            <Link href="/buscar" className="font-label-sm text-label-sm text-primary">Ver todas</Link>
          </div>
          <div className="grid grid-cols-2 gap-space-sm">
            {CATEGORIAS.map((cat) => (
              <button
                key={cat.label}
                onClick={() => setQuery(cat.q)}
                className="flex items-center gap-space-xs px-space-sm py-space-sm rounded-xl bg-surface-container-lowest neu-surface text-left"
              >
                <MaterialIcon name={cat.icon} className="text-primary text-[20px]" />
                <span className="font-label-sm text-label-sm text-on-surface">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        <Link
          href="/demandas/nova"
          className="flex items-center justify-between bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-2xl p-space-md neu-surface"
        >
          <div className="flex items-center gap-space-sm">
            <MaterialIcon name="emergency" className="text-[24px]" />
            <span className="font-title-md text-title-md">Precisa com urgência? Publicar demanda</span>
          </div>
          <MaterialIcon name="arrow_forward" />
        </Link>

        <div>
          <h2 className="font-title-md text-title-md text-on-surface mb-1">Profissionais em destaque</h2>
          <p className="font-caption text-caption text-on-surface-variant mb-space-sm">
            Prontos para atendimento e verificados &middot; {resultados.length} resultado(s)
          </p>
          {erro && <p className="font-caption text-caption text-error bg-error-container rounded-lg p-space-sm mb-space-sm">{erro}</p>}
          <div className="flex flex-col gap-space-sm">
            {carregando && (
              <div className="flex justify-center py-space-lg">
                <MaterialIcon name="progress_activity" className="text-[28px] text-primary animate-spin" />
              </div>
            )}
            {!carregando && resultados.map((p) => (
              <ProfessionalCard key={p.user_id} profissional={p} />
            ))}
            {!carregando && resultados.length === 0 && !erro && (
              <p className="font-body-md text-body-md text-on-surface-variant text-center py-space-lg">
                Nenhum profissional encontrado para &quot;{query}&quot;.
              </p>
            )}
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
