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

/**
 * Faixa de especialidades — no lugar da faixa de logos de parceiros. `escuro` fica no
 * pé da foto (desktop); `claro` fica sobre o fundo da página (celular).
 */
export function FaixaEspecialidades({ variante = "escuro" }: { variante?: "escuro" | "claro" }) {
  const escuro = variante === "escuro";
  return (
    <div className={escuro ? "relative border-t border-white/15 bg-[#1b1238]/60 backdrop-blur-md" : "relative"}>
      <div
        className={`max-w-6xl mx-auto flex flex-col md:flex-row md:items-center gap-space-sm ${
          escuro ? "px-gutter md:px-gutter-lg py-space-md" : "py-space-xs"
        }`}
      >
        <span
          className={`font-label-sm text-label-sm flex-shrink-0 ${escuro ? "text-white/70" : "text-on-surface-variant"}`}
        >
          Especialidades em destaque
        </span>
        <div
          className={`flex gap-space-xs overflow-x-auto no-scrollbar md:flex-wrap ${
            escuro ? "-mx-gutter px-gutter md:mx-0 md:px-0" : "-mx-gutter px-gutter"
          }`}
        >
          {ESPECIALIDADES_LANDING.map((esp) => (
            <Link
              key={esp.slug}
              href={`/buscar?esp=${esp.slug}`}
              className={`flex-shrink-0 px-space-sm py-1.5 rounded-full border font-label-sm text-label-sm transition focus-visible:outline-none focus-visible:ring-2 ${
                escuro
                  ? "border-white/25 bg-white/10 text-white hover:bg-white/20 focus-visible:ring-white"
                  : "border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container focus-visible:ring-primary"
              }`}
            >
              {esp.nome}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
