import Link from "next/link";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

// Textos sem número e sem promessa que a tela não cumpre: a busca é por nome ou
// especialidade (não há filtro de cidade na tela) e o plano gratuito existe de fato.
const CAIXAS = [
  {
    icon: "domain_add",
    titulo: "Cadastrar minha empresa",
    desc: "Comece só com o e-mail",
    href: "#empresas",
  },
  {
    icon: "search",
    titulo: "Buscar profissionais",
    desc: "Busque por nome ou especialidade",
    href: "/buscar",
  },
  {
    icon: "workspace_premium",
    titulo: "Planos para empresas",
    desc: "Comece grátis e mude quando precisar",
    href: "/empresa/planos",
  },
];

// Hover só em aparelhos com mouse: no toque o estado de hover "gruda" depois do clique.
const SO_COM_MOUSE = "[@media(hover:hover)]";

/**
 * Caixas de acesso do hero. Duas versões: `vidro` sobre a foto (desktop) e `cartao`
 * sobre o fundo claro (celular, onde as caixas ficam fora da foto para não cobrir rostos).
 */
export function CaixasAcesso({ variante }: { variante: "vidro" | "cartao" }) {
  const vidro = variante === "vidro";
  return (
    <div className="flex flex-col gap-space-sm">
      <ul className={vidro ? "grid grid-cols-3 gap-space-md" : "flex flex-col gap-space-sm"}>
        {CAIXAS.map((caixa) => (
          <li key={caixa.titulo}>
            <Link
              href={caixa.href}
              className={
                vidro
                  ? `group flex h-full items-start gap-space-sm rounded-2xl border border-white/20 bg-white/10 p-space-sm lg:p-space-md text-white backdrop-blur-md transition ${SO_COM_MOUSE}:hover:-translate-y-0.5 ${SO_COM_MOUSE}:hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white`
                  : "group flex min-h-16 items-center gap-space-sm rounded-2xl bg-surface-container-lowest p-space-sm text-on-surface neu-surface transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              }
            >
              <span
                className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${
                  vidro ? "bg-white/15" : "bg-primary-fixed text-primary"
                }`}
              >
                <MaterialIcon name={caixa.icon} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-title-md text-title-md">{caixa.titulo}</span>
                <span
                  className={`font-caption text-caption ${vidro ? "text-white/80" : "text-on-surface-variant"}`}
                >
                  {caixa.desc}
                </span>
              </span>
              <MaterialIcon
                name="arrow_forward"
                className={`flex-shrink-0 text-[20px] transition-transform ${SO_COM_MOUSE}:group-hover:translate-x-1 ${
                  vidro ? "hidden lg:block text-white/80" : "text-primary"
                }`}
              />
            </Link>
          </li>
        ))}
      </ul>

      <div
        className={`flex flex-wrap items-center gap-x-space-md ${
          vidro ? "text-white/90" : "justify-center text-primary"
        }`}
      >
        <Link
          href="/cadastro/profissional"
          className="inline-flex min-h-11 items-center gap-1 font-label-md text-label-md underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          Sou profissional de saúde
          <MaterialIcon name="arrow_forward" className="text-[18px]" />
        </Link>
        <Link
          href="/entrar"
          className="inline-flex min-h-11 items-center font-label-md text-label-md underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          Já tenho conta
        </Link>
      </div>
    </div>
  );
}
