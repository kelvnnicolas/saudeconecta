import Link from "next/link";
import { getImageProps } from "next/image";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { CTA_PRIMARIO, CTA_VIDRO } from "./estilos";
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
      <img {...resto} className="absolute inset-0 h-full w-full object-cover object-top md:object-center" />
    </picture>
  );
}

export function HeroLanding() {
  return (
    <section className="relative isolate overflow-hidden bg-[#1b1238] text-white min-h-[100svh] md:min-h-[720px] lg:min-h-[min(100svh,860px)] flex flex-col">
      <HeroImagem />
      {/* Escurecimento: de baixo para cima no mobile (texto embaixo), da
          esquerda para a direita no desktop (texto à esquerda). */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[#1b1238] via-[#1b1238]/75 via-45% to-transparent to-75% md:bg-gradient-to-r md:from-[#1b1238]/95 md:via-[#1b1238]/70 md:via-40% md:to-transparent md:to-70%"
      />

      <div className="relative flex-1 flex flex-col justify-end md:justify-center w-full max-w-6xl mx-auto px-gutter md:px-gutter-lg pt-28 pb-space-xl md:pb-24">
        <div className="max-w-xl flex flex-col gap-space-md">
          <span className="self-start inline-flex items-center gap-space-xs rounded-full border border-white/25 bg-white/10 backdrop-blur-md px-space-sm py-1.5 font-label-sm text-label-sm text-white/90">
            <MaterialIcon name="verified" className="text-[16px] text-[#8ee6bd]" filled />
            Clínicas · Hospitais · Homecare · Famílias
          </span>

          <h1 className="font-headline-xl text-[36px] leading-[1.1] md:text-[56px] md:leading-[1.05] font-semibold tracking-tight">
            O profissional de saúde <strong className="font-bold text-[#c9b6ff]">certo</strong>, quando você precisa
          </h1>

          <p className="font-body-lg text-body-lg md:text-[18px] md:leading-[28px] text-white/85 max-w-lg">
            Enfermeiros, fisioterapeutas, cuidadores e outras especialidades, com avaliações de quem já contratou.
            Busque, converse e combine tudo em um só lugar.
          </p>

          <div className="flex flex-col sm:flex-row gap-space-sm pt-1">
            <Link href="/buscar" className={CTA_PRIMARIO}>
              <MaterialIcon name="search" className="text-[20px]" />
              Encontrar profissionais
            </Link>
            <Link href="/cadastro/profissional" className={CTA_VIDRO}>
              Sou profissional de saúde
              <MaterialIcon name="arrow_forward" className="text-[18px]" />
            </Link>
          </div>

          <ul className="flex flex-wrap gap-x-space-md gap-y-1 font-caption text-caption text-white/75">
            {["Cadastro gratuito", "Avaliações reais", "Conversa direta pelo app"].map((t) => (
              <li key={t} className="inline-flex items-center gap-1">
                <MaterialIcon name="check_circle" className="text-[16px] text-[#8ee6bd]" filled />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <FaixaEspecialidades />
    </section>
  );
}
