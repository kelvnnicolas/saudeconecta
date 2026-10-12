"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/ui/BottomNav";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Logo } from "@/components/ui/Logo";
import { ListaEsqueleto } from "@/components/ui/Skeleton";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { ProfessionalCard } from "@/components/busca/ProfessionalCard";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/lib/use-current-user";
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

// A landing manda `?esp=<slug>`; cada slug vira o termo de busca que a tela já usa
// (a busca por texto `q` casa o nome da especialidade). Slug desconhecido é ignorado.
const TERMO_POR_ESPECIALIDADE: Record<string, string> = {
  enfermagem: "enfermagem",
  fisioterapia: "fisioterapia",
  fonoaudiologia: "fonoaudiologia",
  medicos: "medicina",
  nutricao: "nutrição",
  psicologia: "psicologia",
  cuidadores: "cuidador",
};

function termoInicial(params: URLSearchParams) {
  const q = params.get("q");
  if (q !== null) return q;
  const esp = params.get("esp");
  return (esp && Object.hasOwn(TERMO_POR_ESPECIALIDADE, esp) ? TERMO_POR_ESPECIALIDADE[esp] : "") ?? "";
}

export default function BuscarPage() {
  const searchParams = useSearchParams();
  const { papel, session } = useCurrentUser();
  // Publicar demanda é de empresa; visitantes ainda veem e caem no login.
  const ehProfissional = !!session && papel === "profissional";
  const [query, setQuery] = useState(() => termoInicial(searchParams));
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
            <NotificationBell />
          </div>
        </div>
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
            className="w-full h-12 pl-11 pr-12 rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-outline neu-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpar busca"
              className="absolute inset-y-0 right-1 w-11 flex items-center justify-center rounded-full text-on-surface-variant"
            >
              <MaterialIcon name="close" className="text-[20px]" />
            </button>
          )}
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
                aria-pressed={query.trim().toLowerCase() === cat.q}
                className={`flex items-center gap-space-xs px-space-sm py-space-sm rounded-xl bg-surface-container-lowest neu-surface text-left ${
                  query.trim().toLowerCase() === cat.q ? "ring-2 ring-primary" : ""
                }`}
              >
                <MaterialIcon name={cat.icon} className="text-primary text-[20px]" />
                <span className="font-label-sm text-label-sm text-on-surface">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {!ehProfissional && (
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
        )}

        <div>
          <h2 className="font-title-md text-title-md text-on-surface mb-1">Profissionais em destaque</h2>
          <p className="font-caption text-caption text-on-surface-variant mb-space-sm">
            Prontos para atendimento e verificados &middot; {resultados.length} resultado(s)
          </p>
          {erro && <p className="font-caption text-caption text-error bg-error-container rounded-lg p-space-sm mb-space-sm">{erro}</p>}
          <div className="flex flex-col gap-space-sm">
            {carregando && <ListaEsqueleto quantidade={4} />}
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
