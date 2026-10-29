"use client";

import { useEffect, useRef, useState } from "react";
import { AvisoLimite, carregarPlanos } from "./AvisoLimite";
import { MaterialIcon } from "./MaterialIcon";
import type { ContextoLimite, PlanoResumo } from "@/lib/limite-plano";
import type { UsoMensal } from "@/lib/types";

/**
 * Popup com o aviso de limite, para avisar antes de a pessoa abrir um formulário que não
 * poderia enviar. Fecha com Esc, clique fora ou no X; o foco entra no popup, fica preso nele
 * e volta ao botão que o abriu.
 */
export function ModalLimite({
  aberto,
  onFechar,
  uso,
  plano,
  contexto,
}: {
  aberto: boolean;
  onFechar: () => void;
  uso: UsoMensal;
  plano: PlanoResumo | null;
  contexto: ContextoLimite;
}) {
  // Mantém o popup montado por um instante depois de fechar, para a animação de saída rodar.
  const [montado, setMontado] = useState(aberto);
  const painel = useRef<HTMLDivElement>(null);
  const botaoFechar = useRef<HTMLButtonElement>(null);
  // A função de fechar muda a cada renderização da tela; guardá-la numa referência evita
  // refazer o foco e o bloqueio da rolagem a cada vez.
  const fecharRef = useRef(onFechar);
  fecharRef.current = onFechar;

  // Os planos entram no texto do benefício; buscá-los já na montagem evita o texto "pular" ao abrir.
  useEffect(() => {
    void carregarPlanos();
  }, []);

  useEffect(() => {
    if (aberto) {
      setMontado(true);
      return;
    }
    const t = setTimeout(() => setMontado(false), 150);
    return () => clearTimeout(t);
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const quemAbriu = document.activeElement as HTMLElement | null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    botaoFechar.current?.focus();

    function aoPressionarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        fecharRef.current();
        return;
      }
      if (evento.key !== "Tab" || !painel.current) return;
      const focaveis = [...painel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (!primeiro || !ultimo) return;
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }
    document.addEventListener("keydown", aoPressionarTecla);
    return () => {
      document.removeEventListener("keydown", aoPressionarTecla);
      document.body.style.overflow = overflowAnterior;
      quemAbriu?.focus();
    };
  }, [aberto]);

  if (!montado) return null;
  const estado = aberto ? "open" : "closed";
  return (
    <div
      data-state={estado}
      className="modal-fundo fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-gutter sm:items-center"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onFechar();
      }}
    >
      <div ref={painel} role="dialog" aria-modal="true" aria-labelledby="titulo-aviso-limite" data-state={estado} className="modal-painel relative w-full max-w-sm">
        <button
          ref={botaoFechar}
          type="button"
          onClick={onFechar}
          aria-label="Fechar aviso"
          className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <MaterialIcon name="close" />
        </button>
        <AvisoLimite uso={uso} plano={plano} contexto={contexto} solido idTitulo="titulo-aviso-limite" />
      </div>
    </div>
  );
}
