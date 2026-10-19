"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Revelar } from "./Revelar";

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

/**
 * Cards por tipo de contratante. No celular viram um carrossel de rolagem com encaixe
 * (mostra a pontinha do próximo) e indicadores; de `sm` para cima, a grade de sempre.
 */
export function PerfisContratante() {
  const trilho = useRef<HTMLUListElement>(null);
  const cartoes = useRef<(HTMLLIElement | null)[]>([]);
  const [ativo, setAtivo] = useState(0);

  // Um observer por cartão, com o trilho como raiz: o ativo é o que está ao menos 60% à vista.
  useEffect(() => {
    const raiz = trilho.current;
    if (!raiz || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (!entrada.isIntersecting) continue;
          const indice = cartoes.current.indexOf(entrada.target as HTMLLIElement);
          if (indice >= 0) setAtivo(indice);
        }
      },
      { root: raiz, threshold: 0.6 },
    );
    cartoes.current.forEach((cartao) => cartao && observer.observe(cartao));
    return () => observer.disconnect();
  }, []);

  function irPara(indice: number) {
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    cartoes.current[indice]?.scrollIntoView({
      behavior: reduzido ? "auto" : "smooth",
      inline: "start",
      block: "nearest",
    });
  }

  return (
    <section className="px-gutter md:px-gutter-lg pb-space-xl md:pb-20">
      <div className="max-w-6xl mx-auto flex flex-col gap-space-lg">
        <Revelar className="text-center flex flex-col gap-space-xs">
          <h2 className="font-headline-lg text-headline-lg md:text-[36px] md:leading-[44px] text-on-surface">
            Feito para quem contrata cuidado
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Veja como o SaúdeConecta funciona para cada tipo de contratante.
          </p>
        </Revelar>

        <Revelar className="flex flex-col gap-space-sm">
          <ul
            ref={trilho}
            className="-mx-gutter flex snap-x snap-mandatory scroll-pl-gutter gap-space-sm overflow-x-auto px-gutter pb-space-xs no-scrollbar sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-space-md sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4"
          >
            {PERFIS_CONTRATANTE.map((p, i) => (
              <li
                key={p.titulo}
                ref={(el) => {
                  cartoes.current[i] = el;
                }}
                className="w-[85%] flex-shrink-0 snap-start sm:w-auto"
              >
                <article className="flex h-full flex-col gap-space-sm rounded-2xl bg-surface-container-lowest neu-surface p-space-lg">
                  <div className="w-11 h-11 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center">
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
                  <Link prefetch={false}
                    href={p.href}
                    className="mt-auto pt-space-sm inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:gap-2 transition-all"
                  >
                    {p.cta}
                    <MaterialIcon name="arrow_forward" className="text-[18px]" />
                  </Link>
                </article>
              </li>
            ))}
          </ul>

          <div role="group" aria-label="Escolher cartão" className="flex justify-center sm:hidden">
            {PERFIS_CONTRATANTE.map((p, i) => (
              <button
                key={p.titulo}
                type="button"
                onClick={() => irPara(i)}
                aria-label={`Ir para ${p.titulo}`}
                aria-current={ativo === i ? "true" : undefined}
                className="flex h-11 w-9 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span
                  aria-hidden="true"
                  className={`block h-2 w-6 rounded-full transition-[transform,background-color] duration-300 ${
                    ativo === i ? "scale-x-100 bg-primary" : "scale-x-[0.34] bg-on-surface/25"
                  }`}
                />
              </button>
            ))}
          </div>
        </Revelar>
      </div>
    </section>
  );
}
