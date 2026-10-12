import Link from "next/link";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

const PERFIS_CONTRATANTE = [
  {
    icon: "stethoscope",
    titulo: "Clínicas e consultórios",
    desc: "Reforce a equipe por especialidade, sem depender de indicação.",
    itens: ["Publique demandas por especialidade", "Monte seu banco de talentos", "Converse direto com o profissional"],
    cta: "Cadastrar minha clínica",
    href: "/cadastro/empresa?tipo=clinica",
  },
  {
    icon: "local_hospital",
    titulo: "Hospitais",
    desc: "Encontre profissionais para cobrir escalas e novas frentes.",
    itens: ["Busque por especialidade e cidade", "Receba interessados nas suas vagas", "Compare avaliações de outros contratantes"],
    cta: "Cadastrar meu hospital",
    href: "/cadastro/empresa?tipo=hospital",
  },
  {
    icon: "home_health",
    titulo: "Empresas de homecare",
    desc: "Cuidadores e técnicos para atendimento domiciliar na sua região.",
    itens: ["Filtre por região de atendimento", "Histórico de contatos em um só lugar", "Avalie cada atendimento"],
    cta: "Cadastrar minha empresa",
    href: "/cadastro/empresa?tipo=homecare",
  },
  {
    icon: "family_restroom",
    titulo: "Famílias",
    desc: "Cuidado em casa com quem já foi avaliado por outras famílias.",
    itens: ["Cuidadores e enfermeiros perto de você", "Veja avaliações antes de chamar", "Converse antes de fechar"],
    cta: "Buscar profissional",
    href: "/buscar",
  },
];

/** Cards por tipo de contratante. */
export function PerfisContratante() {
  return (
    <section className="px-gutter md:px-gutter-lg pb-space-xl md:pb-20">
      <div className="max-w-6xl mx-auto flex flex-col gap-space-lg">
        <div className="text-center flex flex-col gap-space-xs">
          <h2 className="font-headline-lg text-headline-lg md:text-[36px] md:leading-[44px] text-on-surface">
            Feito para quem contrata cuidado
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Veja como o SaúdeConecta funciona para cada tipo de contratante.
          </p>
        </div>
        <div className="grid gap-space-md sm:grid-cols-2 lg:grid-cols-4">
          {PERFIS_CONTRATANTE.map((p) => (
            <article
              key={p.titulo}
              className="flex flex-col gap-space-sm rounded-2xl bg-surface-container-lowest neu-surface p-space-lg"
            >
              <div className="w-11 h-11 rounded-xl bg-primary-fixed text-primary flex items-center justify-center">
                <MaterialIcon name={p.icon} />
              </div>
              <h3 className="font-title-md text-title-md text-on-surface">{p.titulo}</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">{p.desc}</p>
              <ul className="flex flex-col gap-1.5 font-body-md text-body-md text-on-surface">
                {p.itens.map((item) => (
                  <li key={item} className="flex items-start gap-space-xs">
                    <MaterialIcon name="check" className="text-[18px] text-secondary mt-px" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href={p.href}
                className="mt-auto pt-space-sm inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:gap-2 transition-all"
              >
                {p.cta}
                <MaterialIcon name="arrow_forward" className="text-[18px]" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
