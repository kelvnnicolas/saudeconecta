import Link from "next/link";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Revelar } from "./Revelar";

/** Para profissionais + CTA final. */
export function SecaoProfissionais() {
  return (
    <section id="profissionais" className="scroll-mt-24 px-gutter md:px-gutter-lg pb-space-xl md:pb-20">
      <Revelar className="relative isolate overflow-hidden max-w-6xl mx-auto rounded-3xl bg-gradient-to-br from-[#6d3fd1] via-[#4f2aa8] to-[#1b1238] text-white p-space-lg md:p-14">
        {/* Pétalas da marca, decorativas */}
        <svg aria-hidden="true" viewBox="0 0 60 60" className="absolute -right-16 -bottom-20 w-80 h-80 md:w-[420px] md:h-[420px] -z-10 opacity-25">
          <circle cx="30" cy="18" r="12" fill="#3B82F6" />
          <circle cx="18" cy="30" r="12" fill="#A855F7" />
          <circle cx="42" cy="30" r="12" fill="#14B8A6" />
          <circle cx="30" cy="42" r="12" fill="#6366F1" />
        </svg>
        <div className="max-w-xl flex flex-col gap-space-md">
          <span className="self-start rounded-full bg-white/15 px-space-sm py-1 font-label-sm text-label-sm">
            Para profissionais de saúde
          </span>
          <h2 className="font-headline-lg text-[28px] leading-[34px] md:text-[40px] md:leading-[48px] font-bold">
            Seja encontrado por quem precisa do seu trabalho
          </h2>
          <p className="font-body-lg text-body-lg text-white/85">
            Crie seu perfil público, receba contatos de clínicas, hospitais e famílias e veja as oportunidades
            publicadas pelas empresas.
          </p>
          <div className="flex flex-col sm:flex-row gap-space-sm pt-1">
            <Link
              href="/cadastro/profissional"
              className="vidro-midia bg-white/25 inline-flex items-center justify-center gap-space-xs h-12 px-space-lg rounded-full font-label-md text-label-md transition hover:bg-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Criar meu perfil grátis
              <MaterialIcon name="arrow_forward" className="text-[18px]" />
            </Link>
            <Link
              href="/buscar"
              className="vidro-midia inline-flex items-center justify-center gap-space-xs h-12 px-space-lg rounded-full font-label-md text-label-md transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Ver profissionais cadastrados
            </Link>
          </div>
        </div>
      </Revelar>
    </section>
  );
}
