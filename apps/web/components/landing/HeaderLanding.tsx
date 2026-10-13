"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { signOut } from "@/lib/supabase-client";
import { useCurrentUser } from "@/lib/use-current-user";

/**
 * Header flutuante em vidro (docs/decisions/0001-regra-de-vidro.md). Só marca,
 * "Como funciona?" e a entrada: quem não está logado vê um único "Entre para
 * começar"; quem está logado vê o menu com as telas do app. Sobre a foto usa vidro
 * de mídia (texto branco); depois do hero, vidro de superfície.
 */
export function HeaderLanding() {
  const router = useRouter();
  const { loading, session, papel } = useCurrentUser();
  const [aberto, setAberto] = useState(false);
  const [sobreFoto, setSobreFoto] = useState(true);
  const raiz = useRef<HTMLDivElement>(null);
  const botaoMenu = useRef<HTMLButtonElement>(null);
  const primeiroLink = useRef<HTMLAnchorElement>(null);

  // Um observer no hero, em vez de um listener de scroll a cada frame.
  useEffect(() => {
    const hero = document.querySelector("[data-hero-landing]");
    if (!hero || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entrada]) => {
      if (entrada) setSobreFoto(entrada.isIntersecting);
    });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!aberto) return;
    primeiroLink.current?.focus();
    function aoClicarFora(evento: MouseEvent) {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) setAberto(false);
    }
    function aoPressionarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        setAberto(false);
        botaoMenu.current?.focus();
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoPressionarTecla);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoPressionarTecla);
    };
  }, [aberto]);

  const logado = !!session;
  const itensMenu = [
    { href: "/buscar", rotulo: "Buscar profissionais", icone: "explore" },
    papel === "profissional"
      ? { href: "/oportunidades", rotulo: "Oportunidades", icone: "assignment" }
      : { href: "/demandas", rotulo: "Minhas demandas", icone: "assignment" },
    { href: "/contatos", rotulo: "Contatos", icone: "forum" },
    { href: "/perfil", rotulo: "Perfil", icone: "person" },
  ];

  async function sair() {
    setAberto(false);
    await signOut();
    router.refresh();
  }

  const textoDoLink = sobreFoto ? "text-white/90 hover:text-white" : "text-on-surface-variant hover:text-on-surface";

  return (
    <header className="fixed inset-x-0 top-0 z-30 px-3 sm:px-gutter pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div ref={raiz} className="relative mx-auto max-w-6xl">
        <nav
          aria-label="Principal"
          className={`flex items-center justify-between gap-space-xs h-14 pl-3 pr-1.5 sm:pl-space-md sm:pr-2 rounded-full transition-[background-color,border-color,box-shadow] duration-300 ${
            sobreFoto ? "vidro-midia-denso" : "vidro"
          }`}
        >
          <Logo
            className={`[&_span]:text-[16px] sm:[&_span]:text-[20px] max-[379px]:[&>span]:hidden ${sobreFoto ? "[&>span]:text-white [&_span_span]:text-[#c9b6ff]" : ""}`}
          />

          <div className="flex items-center gap-1 sm:gap-space-xs flex-shrink-0">
            <a
              href="#como-funciona"
              aria-label="Como funciona?"
              className={`h-10 min-w-10 px-2 sm:px-space-sm rounded-full flex items-center justify-center gap-1 font-label-md text-label-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${textoDoLink}`}
            >
              <MaterialIcon name="help" className="text-[22px] sm:!hidden" />
              <span className="hidden sm:inline">Como funciona?</span>
            </a>

            {loading && !session ? (
              <span
                aria-hidden="true"
                className="invisible flex h-10 items-center whitespace-nowrap px-3 text-[13px] sm:px-space-md sm:text-label-md font-label-md"
              >
                Entre para começar
              </span>
            ) : logado ? (
              <button
                ref={botaoMenu}
                type="button"
                onClick={() => setAberto((atual) => !atual)}
                aria-expanded={aberto}
                aria-controls="menu-landing"
                aria-label={aberto ? "Fechar menu" : "Abrir menu"}
                className="vidro-acento w-11 h-11 rounded-full flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <MaterialIcon name={aberto ? "close" : "menu"} />
              </button>
            ) : (
              <Link
                href="/entrar"
                className="vidro-acento h-10 px-3 sm:px-space-md rounded-full flex items-center whitespace-nowrap text-[13px] sm:text-label-md font-label-md transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Entre para começar
              </Link>
            )}
          </div>
        </nav>

        {logado && aberto && (
          <div
            id="menu-landing"
            className={`${sobreFoto ? "vidro-midia-denso" : "vidro"} absolute right-0 top-full mt-2 w-full sm:w-72 flex flex-col rounded-3xl p-space-sm`}
          >
            {itensMenu.map((item, i) => (
              <Link
                key={item.href}
                ref={i === 0 ? primeiroLink : undefined}
                href={item.href}
                onClick={() => setAberto(false)}
                className={`min-h-11 flex items-center gap-space-sm rounded-xl px-space-sm font-label-md text-label-md focus-visible:outline-none focus-visible:ring-2 ${
                  sobreFoto ? "text-white hover:bg-white/10 focus-visible:ring-white" : "text-on-surface hover:bg-on-surface/5 focus-visible:ring-primary"
                }`}
              >
                <MaterialIcon name={item.icone} className={`text-[20px] ${sobreFoto ? "text-[#c9b6ff]" : "text-primary"}`} />
                {item.rotulo}
              </Link>
            ))}
            <button
              type="button"
              onClick={sair}
              className={`mt-space-xs min-h-11 flex items-center gap-space-sm rounded-xl border-t px-space-sm pt-space-xs font-label-md text-label-md focus-visible:outline-none focus-visible:ring-2 ${
                sobreFoto
                  ? "border-white/20 text-white/85 hover:bg-white/10 focus-visible:ring-white"
                  : "border-outline-variant text-on-surface-variant hover:bg-on-surface/5 focus-visible:ring-primary"
              }`}
            >
              <MaterialIcon name="logout" className="text-[20px]" />
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
