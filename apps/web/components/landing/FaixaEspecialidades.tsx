import Link from "next/link";

const ESPECIALIDADES_LANDING = [
  { slug: "enfermagem", nome: "Enfermagem" },
  { slug: "fisioterapia", nome: "Fisioterapia" },
  { slug: "fonoaudiologia", nome: "Fonoaudiologia" },
  { slug: "medicos", nome: "Médicos" },
  { slug: "nutricao", nome: "Nutrição" },
  { slug: "psicologia", nome: "Psicologia" },
  { slug: "cuidadores", nome: "Cuidadores" },
];

/** Faixa de especialidades — no lugar da faixa de logos de parceiros. */
export function FaixaEspecialidades() {
  return (
    <div className="relative border-t border-white/15 bg-[#1b1238]/60 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-gutter md:px-gutter-lg py-space-md flex flex-col md:flex-row md:items-center gap-space-sm">
        <span className="font-label-sm text-label-sm text-white/70 flex-shrink-0">
          Especialidades em destaque
        </span>
        <div className="flex gap-space-xs overflow-x-auto no-scrollbar -mx-gutter px-gutter md:mx-0 md:px-0 md:flex-wrap">
          {ESPECIALIDADES_LANDING.map((esp) => (
            <Link
              key={esp.slug}
              href={`/buscar?esp=${esp.slug}`}
              className="flex-shrink-0 px-space-sm py-1.5 rounded-full border border-white/25 bg-white/10 font-label-sm text-label-sm text-white transition hover:bg-white/20"
            >
              {esp.nome}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
