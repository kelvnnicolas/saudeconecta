import { getImageProps } from "next/image";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { CaixasAcesso } from "./CaixasAcesso";
import { FaixaEspecialidades } from "./FaixaEspecialidades";

function HeroImagem() {
  // Direção de arte: foto em paisagem no desktop e em retrato no mobile.
  // getImageProps mantém a otimização do next/image dentro de um <picture>.
  const comum = { alt: "", sizes: "100vw", priority: true };
  const {
    props: { srcSet: desktop },
  } = getImageProps({ ...comum, src: "/img/landing/hero-desktop.webp", width: 1672, height: 941, quality: 75 });
  const {
    props: { srcSet: mobile, ...resto },
  } = getImageProps({ ...comum, src: "/img/landing/hero-mobile.webp", width: 1024, height: 1536, quality: 70 });

  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={desktop} />
      <source media="(max-width: 767px)" srcSet={mobile} />
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- props vêm do getImageProps; foto decorativa */}
      <img {...resto} className="absolute inset-0 h-full w-full object-cover object-top" />
    </picture>
  );
}

export function HeroLanding() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-[#1b1238] text-white min-h-[70svh] md:min-h-[760px] lg:min-h-[min(100svh,880px)] flex flex-col">
        <HeroImagem />
        {/* Escurece de baixo para cima nos dois tamanhos: os rostos ficam no alto da
            foto e o texto e as caixas ocupam a parte de baixo. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#1b1238] via-[#1b1238]/75 via-45% to-transparent to-75% md:via-[#1b1238]/80 md:via-50% md:to-transparent md:to-80%"
        />

        <div className="relative flex-1 flex flex-col justify-end w-full max-w-6xl mx-auto px-gutter md:px-gutter-lg pt-28 pb-16 md:pb-space-lg">
          <div className="max-w-xl flex flex-col gap-space-md">
            <span className="self-start inline-flex items-center gap-space-xs rounded-full border border-white/25 bg-white/10 backdrop-blur-md px-space-sm py-1.5 font-label-sm text-label-sm text-white/90">
              <MaterialIcon name="verified" className="text-[16px] text-[#8ee6bd]" filled />
              Clínicas · Hospitais · Homecare · Famílias
            </span>

            <h1 className="font-headline-xl text-[36px] leading-[1.1] md:text-[40px] md:leading-[1.08] lg:text-[48px] lg:leading-[1.05] font-semibold tracking-tight">
              O profissional de saúde <strong className="font-bold text-[#c9b6ff]">certo</strong>, quando você precisa
            </h1>

            <p className="font-body-lg text-body-lg md:text-[18px] md:leading-[28px] text-white/85 max-w-lg">
              Cadastre sua empresa, busque por especialidade e converse direto com quem vai atender.
            </p>
          </div>

          {/* Desktop: caixas de vidro sobre a foto */}
          <div className="hidden md:block mt-space-lg">
            <CaixasAcesso variante="vidro" />
          </div>
        </div>

        <div className="hidden md:block">
          <FaixaEspecialidades variante="escuro" />
        </div>
      </section>

      {/* Celular: as caixas saem da foto e sobrepõem só a borda de baixo dela */}
      <div className="md:hidden relative z-10 -mt-12 px-gutter pb-space-lg flex flex-col gap-space-sm">
        <CaixasAcesso variante="cartao" />
        <FaixaEspecialidades variante="claro" />
      </div>
    </>
  );
}
