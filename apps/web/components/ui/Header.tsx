"use client";

import Link from "next/link";
import { MaterialIcon } from "./MaterialIcon";
import { Logo } from "./Logo";
import { NotificationBell } from "./NotificationBell";
import { BotaoEntrar } from "./BotaoEntrar";
import { useDentroDaCasca } from "@/components/navegacao/CascaDaNavegacao";

export function Header({
  title,
  subtitle,
  backHref,
  confirmarSaida,
  action,
  semEntrar = false,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  /** Quando definido, voltar pede confirmação com esta mensagem (ex.: dados não salvos). */
  confirmarSaida?: string;
  action?: { icon: string; label: string; onClick?: () => void; href?: string };
  /** Esconde o "Entrar" (telas de cadastro, que já têm o caminho de volta ao login). */
  semEntrar?: boolean;
}) {
  // Dentro da navegação do app, a barra principal já tem logo, sino e menu da conta: este
  // cabeçalho vira só a barra de contexto (voltar + título) logo abaixo dela.
  const naCasca = useDentroDaCasca();
  return (
    <header
      className={`vidro-topo fixed w-full ${naCasca ? "z-40" : "top-0 z-50 pt-safe"}`}
      style={naCasca ? { top: "calc(4rem + env(safe-area-inset-top, 0px))" } : undefined}
    >
      <div className={`h-16 px-gutter flex items-center gap-space-sm ${naCasca ? "mx-auto max-w-5xl" : ""}`}>
        {backHref && (
          <Link
            aria-label="Voltar"
            href={backHref}
            onClick={(e) => {
              if (confirmarSaida && !window.confirm(confirmarSaida)) e.preventDefault();
            }}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-on-surface neu-surface-sm neu-pressable transition-colors"
          >
            <MaterialIcon name="arrow_back_ios_new" />
          </Link>
        )}
        <div className="flex flex-col flex-1 min-w-0">
          {subtitle && (
            <span className="text-label-sm font-label-sm text-primary tracking-tight font-semibold">
              {subtitle}
            </span>
          )}
          <div className="flex items-center gap-1.5 min-w-0">
            {!naCasca && <Logo compact />}
            <span className="text-title-md font-title-md text-on-surface line-clamp-1 min-w-0">
              {title}
            </span>
          </div>
        </div>
        {action &&
          (action.href ? (
            <Link
              href={action.href}
              aria-label={action.label}
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary neu-surface-sm neu-pressable transition-colors"
            >
              <MaterialIcon name={action.icon} />
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              aria-label={action.label}
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary neu-surface-sm neu-pressable transition-colors"
            >
              <MaterialIcon name={action.icon} />
            </button>
          ))}
        {!naCasca && !semEntrar && <BotaoEntrar />}
        {!naCasca && <NotificationBell />}
      </div>
    </header>
  );
}
