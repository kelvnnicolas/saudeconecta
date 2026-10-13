"use client";

import { createElement, useEffect, useRef } from "react";

type Etiqueta = "div" | "article" | "li" | "h2" | "section";

/**
 * Entrada suave ao rolar (só opacity e transform). O conteúdo é renderizado visível no
 * servidor: o estado "escondido" só é aplicado depois que o JavaScript roda, e só para o
 * que ainda está fora da tela. Sem JS, sem IntersectionObserver ou com movimento reduzido,
 * tudo aparece direto. Nunca usar no hero nem no header (LCP).
 */
export function Revelar({
  as = "div",
  atraso = 0,
  className,
  children,
}: {
  as?: Etiqueta;
  /** Em ms, para escalonar cards do mesmo grupo (no máximo 3 passos de 80 ms). */
  atraso?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Já à vista no carregamento: não esconde para depois mostrar (evitaria um piscar).
    const caixa = elemento.getBoundingClientRect();
    if (caixa.top < window.innerHeight * 0.9 && caixa.bottom > 0) return;

    elemento.classList.add("revelar");
    elemento.style.transitionDelay = `${atraso}ms`;
    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (entrada?.isIntersecting) {
          elemento.setAttribute("data-visivel", "");
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(elemento);
    return () => observer.disconnect();
  }, [atraso]);

  return createElement(as, { ref, className }, children);
}
