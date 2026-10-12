"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

const LINKS = [
  { href: "#empresas", rotulo: "Para empresas" },
  { href: "#profissionais", rotulo: "Para profissionais" },
  { href: "#como-funciona", rotulo: "Como funciona" },
];

/**
 * Header flutuante em pílula, sobre a foto. Até 1023 px os links do centro viram um
 * menu (o botão "Para empresas" fica sempre à mão); a pílula fica mais opaca quando o
 * hero sai da tela.
 */
export function HeaderLanding() {
  const [aberto, setAberto] = useState(false);
  const [rolou, setRolou] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const botaoMenu = useRef<HTMLButtonElement>(null);
  const primeiroLink = useRef<HTMLAnchorElement>(null);

  // Um observer no hero, em vez de um listener de scroll a cada frame.
  useEffect(() => {
    const hero = document.querySelector("[data-hero-landing]");
    if (!hero || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entrada]) => {
      if (entrada) setRolou(!entrada.isIntersecting);
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

  return (
    <header className="fixed inset-x-0 top-0 z-30 px-gutter pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div ref={raiz} className="relative mx-auto max-w-6xl">
        <nav
          aria-label="Principal"
          className={`flex items-center justify-between gap-space-sm h-14 pl-space-md pr-2 rounded-full backdrop-blur-md border border-white/40 transition-[background-color,box-shadow] duration-300 ${
            rolou ? "bg-surface/95 shadow-xl shadow-black/15" : "bg-surface/85 shadow-lg shadow-black/10"
          }`}
        >
          <Logo />
          <div className="hidden lg:flex items-center gap-space-lg font-label-md text-label-md text-on-surface-variant">
            {LINKS.map((link) => (
              <a key={link.href} href={link.href} className="whitespace-nowrap hover:text-on-surface">
                {link.rotulo}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-space-xs flex-shrink-0">
            <Link
              href="/entrar"
              className="hidden sm:flex h-10 px-space-md rounded-full items-center font-label-md text-label-md text-on-surface hover:bg-on-surface/5"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro/empresa"
              className="hidden sm:flex h-10 px-space-md rounded-full items-center bg-primary text-on-primary font-label-md text-label-md shadow-md shadow-primary/30 transition hover:brightness-110"
            >
              Cadastrar empresa
            </Link>
            <a
              href="#empresas"
              className="sm:hidden h-10 px-space-md rounded-full flex items-center bg-primary text-on-primary font-label-md text-label-md shadow-md shadow-primary/30"
            >
              Para empresas
            </a>
            <button
              ref={botaoMenu}
              type="button"
              onClick={() => setAberto((atual) => !atual)}
              aria-expanded={aberto}
              aria-controls="menu-landing"
              aria-label={aberto ? "Fechar menu" : "Abrir menu"}
              className="lg:hidden w-11 h-11 rounded-full flex items-center justify-center text-on-surface hover:bg-on-surface/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <MaterialIcon name={aberto ? "close" : "menu"} />
            </button>
          </div>
        </nav>

        {aberto && (
          <div
            id="menu-landing"
            className="lg:hidden absolute left-0 right-0 top-full mt-2 flex flex-col rounded-3xl border border-outline-variant bg-surface p-space-sm shadow-xl shadow-black/15"
          >
            {LINKS.map((link, i) => (
              <a
                key={link.href}
                ref={i === 0 ? primeiroLink : undefined}
                href={link.href}
                onClick={() => setAberto(false)}
                className="min-h-11 flex items-center rounded-xl px-space-sm font-label-md text-label-md text-on-surface hover:bg-on-surface/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {link.rotulo}
              </a>
            ))}
            <div className="sm:hidden mt-space-xs flex flex-col gap-space-xs border-t border-outline-variant pt-space-sm">
              <Link
                href="/entrar"
                onClick={() => setAberto(false)}
                className="min-h-11 flex items-center rounded-xl px-space-sm font-label-md text-label-md text-on-surface hover:bg-on-surface/5"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro/empresa"
                onClick={() => setAberto(false)}
                className="h-12 flex items-center justify-center rounded-full bg-primary text-on-primary font-label-md text-label-md shadow-md shadow-primary/30"
              >
                Cadastrar empresa
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
