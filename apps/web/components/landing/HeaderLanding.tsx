import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

/** Header flutuante em pílula, sobre a foto. */
export function HeaderLanding() {
  return (
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
  );
}
