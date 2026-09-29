"use client";

import Link from "next/link";
import { MaterialIcon } from "./MaterialIcon";
import { Logo } from "./Logo";

export function Header({
  title,
  subtitle,
  backHref,
  action,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: { icon: string; label: string; onClick?: () => void; href?: string };
}) {
  return (
    <header className="fixed top-0 w-full z-50 pt-safe bg-surface/90 backdrop-blur-xl border-b border-[color:var(--line)]">
      <div className="h-16 px-gutter flex items-center gap-space-sm">
        {backHref && (
          <Link
            aria-label="Voltar"
            href={backHref}
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
            <Logo compact />
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
      </div>
    </header>
  );
}
