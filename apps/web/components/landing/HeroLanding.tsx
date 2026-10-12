import { getImageProps } from "next/image";
import { CaixasAcesso } from "./CaixasAcesso";

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
    <section
      data-hero-landing
      className="relative isolate overflow-hidden rounded-b-[2rem] md:rounded-none bg-[#1b1238] text-white md:min-h-[760px] lg:min-h-[min(100svh,880px)] flex flex-col"
    >
      {/* Foto. No celular ocupa só o alto da página, na proporção da própria foto, e o
          resto do hero continua no mesmo roxo escuro (as caixas de vidro ficam sobre ele,
          sem cartão branco sobre mídia). No desktop cobre a seção inteira. */}
      <div className="absolute inset-x-0 top-0 h-[150vw] md:inset-0 md:h-auto">
        <HeroImagem />
        {/* Degradê no topo: dá contraste ao header sobre a parte clara da foto. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#1b1238]/55 to-transparent"
        />
        {/* Escurece de baixo para cima: os rostos ficam no alto e o texto, embaixo. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#1b1238] via-[#1b1238]/80 via-40% to-transparent to-70% md:via-[#1b1238]/80 md:via-50% md:to-transparent md:to-80%"
        />
      </div>

      <div className="relative flex-1 flex flex-col justify-end w-full max-w-6xl mx-auto px-gutter md:px-gutter-lg pt-[85vw] md:pt-28 pb-space-lg md:pb-space-xl">
        <div className="max-w-xl flex flex-col gap-space-md">
          <h1 className="font-headline-xl text-[36px] leading-[1.1] md:text-[40px] md:leading-[1.08] lg:text-[48px] lg:leading-[1.05] font-semibold tracking-tight">
            O profissional de saúde <strong className="font-bold text-[#c9b6ff]">certo</strong>, quando você precisa
          </h1>

          <p className="font-body-lg text-body-lg md:text-[18px] md:leading-[28px] text-white/85 max-w-lg">
            Cadastre sua empresa, busque por especialidade e converse direto com quem vai atender.
          </p>
        </div>

        <div className="mt-space-lg">
          <CaixasAcesso />
        </div>
      </div>
    </section>
  );
}
