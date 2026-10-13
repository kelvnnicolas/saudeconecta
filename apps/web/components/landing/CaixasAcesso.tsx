import Link from "next/link";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

// Só os três destinos que servem a quem contrata: cadastro, busca e planos. Os atalhos
// que levavam ao mesmo lugar (entrar, cadastro de profissional, especialidades) saíram
// do hero. Textos sem número e sem promessa que a tela não cumpre.
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

/** Caixas de acesso do hero, em vidro de mídia (sobre a foto escura). */
export function CaixasAcesso() {
  return (
    <ul className="grid gap-space-sm md:grid-cols-3 md:gap-space-md">
      {CAIXAS.map((caixa) => (
        <li key={caixa.titulo}>
          <Link
            href={caixa.href}
            className={`vidro-midia group flex h-full min-h-16 items-center gap-space-sm rounded-2xl p-space-sm lg:p-space-md transition ${SO_COM_MOUSE}:hover:-translate-y-0.5 ${SO_COM_MOUSE}:hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white`}
          >
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/15">
              <MaterialIcon name={caixa.icon} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-title-md text-title-md">{caixa.titulo}</span>
              <span className="font-caption text-caption text-white/80">{caixa.desc}</span>
            </span>
            <MaterialIcon
              name="arrow_forward"
              className={`flex-shrink-0 text-[20px] text-white/80 transition-transform md:!hidden lg:!block ${SO_COM_MOUSE}:group-hover:translate-x-1`}
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
