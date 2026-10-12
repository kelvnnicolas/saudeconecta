import Link from "next/link";
import { getImageProps } from "next/image";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Logo } from "@/components/ui/Logo";
import { InicioCadastroEmpresa } from "@/components/landing/InicioCadastroEmpresa";

// Estrutura inspirada em landings B2B de saúde (hero em foto cheia, header em
// pílula, captação em etapas, cards por tipo de cliente). Regra do projeto:
// nenhum número sem lastro — sem contagem de usuários, logos de parceiros ou
// métricas de resultado até existirem dados reais.

const ESPECIALIDADES_LANDING = [
  { slug: "enfermagem", nome: "Enfermagem" },
  { slug: "fisioterapia", nome: "Fisioterapia" },
  { slug: "fonoaudiologia", nome: "Fonoaudiologia" },
  { slug: "medicos", nome: "Médicos" },
  { slug: "nutricao", nome: "Nutrição" },
  { slug: "psicologia", nome: "Psicologia" },
  { slug: "cuidadores", nome: "Cuidadores" },
];

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

const PASSOS = [
  { icon: "search", titulo: "Busque", desc: "Filtre por especialidade, cidade e preço." },
  { icon: "chat", titulo: "Converse", desc: "Envie uma mensagem e combine tudo pelo app." },
  { icon: "star", titulo: "Avalie", desc: "Depois do atendimento, avalie e ajude quem vem depois." },
];

// Classes compartilhadas dos CTAs — o primário é sempre o mesmo botão em
// pílula (cor de destaque, sombra colorida, seta), para o olho aprender onde
// clicar logo no hero.
const CTA_PRIMARIO =
  "inline-flex items-center justify-center gap-space-xs h-12 px-space-lg rounded-full bg-primary text-on-primary font-label-md text-label-md shadow-lg shadow-primary/30 transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary";
const CTA_VIDRO =
  "inline-flex items-center justify-center gap-space-xs h-12 px-space-lg rounded-full border border-white/40 bg-white/10 text-white backdrop-blur-md font-label-md text-label-md transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

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

export default function LandingPage() {
  return (
    <main className="flex-1 flex flex-col bg-surface">
      {/* Header flutuante em pílula, sobre a foto */}
      <header className="fixed inset-x-0 top-0 z-30 px-gutter pt-[max(0.75rem,env(safe-area-inset-top))]">
        <nav
          aria-label="Principal"
          className="mx-auto max-w-6xl flex items-center justify-between gap-space-sm h-14 pl-space-md pr-2 rounded-full bg-surface/85 backdrop-blur-md shadow-lg shadow-black/10 border border-white/40"
        >
          <Logo />
          <div className="hidden md:flex items-center gap-space-lg font-label-md text-label-md text-on-surface-variant">
            <a href="#empresas" className="hover:text-on-surface">Para empresas</a>
            <a href="#profissionais" className="hover:text-on-surface">Para profissionais</a>
            <a href="#como-funciona" className="hover:text-on-surface">Como funciona</a>
          </div>
          <div className="flex items-center gap-space-xs flex-shrink-0">
            <Link
              href="/entrar"
              className="h-10 px-space-md rounded-full flex items-center font-label-md text-label-md text-on-surface hover:bg-on-surface/5"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro/empresa"
              className="hidden sm:flex h-10 px-space-md rounded-full items-center bg-primary text-on-primary font-label-md text-label-md shadow-md shadow-primary/30 transition hover:brightness-110"
            >
              Cadastrar empresa
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
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

        {/* Faixa de especialidades — no lugar da faixa de logos de parceiros */}
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
      </section>

      {/* Captação de empresas em etapas: só o e-mail primeiro */}
      <section id="empresas" className="scroll-mt-24 px-gutter md:px-gutter-lg py-space-xl md:py-20">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-space-lg md:gap-12 items-center rounded-3xl bg-surface-container-lowest neu-surface p-space-lg md:p-12">
          <div className="flex flex-col gap-space-sm">
            <span className="self-start rounded-full bg-primary-fixed text-on-primary-fixed px-space-sm py-1 font-label-sm text-label-sm">
              Para empresas
            </span>
            <h2 className="font-headline-lg text-headline-lg md:text-[32px] md:leading-[40px] text-on-surface">
              Conecte sua empresa a profissionais de saúde avaliados
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Comece pelo e-mail. Em seguida você informa os dados da empresa e já pode buscar profissionais e publicar
              demandas.
            </p>
          </div>
          <InicioCadastroEmpresa />
        </div>
      </section>

      {/* Cards por tipo de contratante */}
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

      {/* Como funciona */}
      <section id="como-funciona" className="scroll-mt-24 px-gutter md:px-gutter-lg pb-space-xl md:pb-20">
        <div className="max-w-6xl mx-auto flex flex-col gap-space-lg">
          <h2 className="font-headline-lg text-headline-lg md:text-[36px] md:leading-[44px] text-on-surface text-center">
            Como funciona
          </h2>
          <ol className="grid gap-space-md md:grid-cols-3">
            {PASSOS.map((passo, i) => (
              <li key={passo.titulo} className="flex items-center md:items-start md:flex-col gap-space-sm rounded-2xl bg-surface-container-lowest neu-surface p-space-md md:p-space-lg">
                <div className="relative w-11 h-11 rounded-xl bg-primary-fixed text-primary flex items-center justify-center flex-shrink-0">
                  <MaterialIcon name={passo.icon} />
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-on-primary font-label-sm text-[11px] flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-title-md text-title-md text-on-surface">{passo.titulo}</span>
                  <span className="font-body-md text-body-md text-on-surface-variant">{passo.desc}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Para profissionais + CTA final */}
      <section id="profissionais" className="scroll-mt-24 px-gutter md:px-gutter-lg pb-space-xl md:pb-20">
        <div className="relative isolate overflow-hidden max-w-6xl mx-auto rounded-3xl bg-gradient-to-br from-[#6d3fd1] via-[#4f2aa8] to-[#1b1238] text-white p-space-lg md:p-14">
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
                className="inline-flex items-center justify-center gap-space-xs h-12 px-space-lg rounded-full bg-white text-[#4f2aa8] font-label-md text-label-md shadow-lg shadow-black/20 transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#4f2aa8]"
              >
                Criar meu perfil grátis
                <MaterialIcon name="arrow_forward" className="text-[18px]" />
              </Link>
              <Link href="/buscar" className={CTA_VIDRO}>
                Ver profissionais cadastrados
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="max-w-6xl w-full mx-auto px-gutter md:px-gutter-lg py-space-lg flex flex-wrap gap-space-md font-caption text-caption text-on-surface-variant">
        <Link href="/sobre">Sobre</Link>
        <Link href="/contato">Contato</Link>
        <Link href="/ajuda">Ajuda</Link>
        <Link href="/seguranca">Segurança</Link>
        <Link href="/privacidade">Privacidade</Link>
        <Link href="/termos">Termos</Link>
      </footer>
    </main>
  );
}
