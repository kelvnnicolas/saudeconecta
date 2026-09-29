import Link from "next/link";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Logo } from "@/components/ui/Logo";

const ESPECIALIDADES_LANDING = [
  { slug: "enfermagem", nome: "Enfermagem" },
  { slug: "fisioterapia", nome: "Fisioterapia" },
  { slug: "fonoaudiologia", nome: "Fonoaudiologia" },
  { slug: "medicos", nome: "Médicos" },
  { slug: "nutricao", nome: "Nutrição" },
  { slug: "psicologia", nome: "Psicologia" },
  { slug: "cuidadores", nome: "Cuidadores" },
];

export default function LandingPage() {
  return (
    <main className="flex-1 flex flex-col bg-surface">
      <header className="flex items-center justify-between flex-wrap gap-y-2 px-gutter py-3">
        <Logo />
        <div className="flex items-center gap-space-sm flex-shrink-0">
          <Link href="/entrar" className="font-label-md text-label-md text-on-surface">
            Entrar
          </Link>
          <Link
            href="/cadastro/profissional"
            className="px-space-sm sm:px-space-md h-10 rounded-xl neu-surface neu-pressable bg-primary text-on-primary font-label-md text-label-md flex items-center whitespace-nowrap"
          >
            Cadastrar
          </Link>
        </div>
      </header>

      <section className="flex flex-col gap-space-md px-gutter pt-space-lg pb-space-xl bg-gradient-to-b from-primary-fixed to-surface">
        <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight max-w-md">
          Encontre o profissional de saúde certo, perto de você
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-sm">
          Enfermeiros, fisioterapeutas, cuidadores e outras especialidades — perfis
          verificados, avaliados por quem já contratou.
        </p>
        <form action="/buscar" className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-space-md flex items-center pointer-events-none text-outline">
            <MaterialIcon name="search" className="text-[20px]" />
          </div>
          <input
            name="q"
            type="text"
            placeholder="Buscar por nome ou especialidade..."
            className="w-full h-12 pl-11 pr-space-md rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-outline neu-surface focus:outline-none focus:ring-2 focus:ring-primary-container"
          />
        </form>
        <div className="flex flex-wrap gap-space-xs">
          {ESPECIALIDADES_LANDING.map((esp) => (
            <Link
              key={esp.slug}
              href={`/buscar?esp=${esp.slug}`}
              className="px-space-sm py-1.5 rounded-full bg-surface-container-lowest neu-surface font-label-sm text-label-sm text-on-surface"
            >
              {esp.nome}
            </Link>
          ))}
        </div>
      </section>

      <section className="px-gutter py-space-lg flex flex-col gap-space-md">
        <h2 className="font-headline-md text-headline-md text-on-surface">Como funciona</h2>
        <div className="grid grid-cols-1 gap-space-sm">
          {[
            { icon: "search", title: "Busque", desc: "Filtre por especialidade, cidade e preço." },
            { icon: "chat", title: "Converse", desc: "Envie uma mensagem direto pelo app." },
            { icon: "star", title: "Avalie", desc: "Depois do atendimento, avalie e ajude outros." },
          ].map((step) => (
            <div key={step.title} className="flex items-center gap-space-sm bg-surface-container-lowest rounded-2xl p-space-md neu-surface">
              <div className="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center flex-shrink-0">
                <MaterialIcon name={step.icon} />
              </div>
              <div className="flex flex-col">
                <span className="font-title-md text-title-md text-on-surface">{step.title}</span>
                <span className="font-body-md text-body-md text-on-surface-variant">{step.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-gutter py-space-lg flex flex-col gap-space-sm bg-surface-container-low">
        <h2 className="font-headline-md text-headline-md text-on-surface">É uma clínica, hospital ou empresa de homecare?</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Publique demandas e monte seu banco de talentos clínicos.
        </p>
        <Link
          href="/cadastro/empresa"
          className="self-start px-space-md h-11 rounded-xl neu-surface neu-pressable bg-primary text-on-primary font-label-md text-label-md flex items-center gap-space-xs"
        >
          Cadastrar minha empresa
          <MaterialIcon name="arrow_forward" className="text-[18px]" />
        </Link>
      </section>

      <footer className="px-gutter py-space-lg flex flex-wrap gap-space-md font-caption text-caption text-on-surface-variant">
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
