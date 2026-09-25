"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/use-current-user";
import { MaterialIcon } from "./MaterialIcon";

export function BottomNav() {
  const pathname = usePathname();
  const { papel } = useCurrentUser();

  const items = [
    { href: "/buscar", label: "Início/Buscar", icon: "explore" },
    papel === "profissional"
      ? { href: "/oportunidades", label: "Oportunidades", icon: "assignment" }
      : { href: "/demandas", label: "Demandas", icon: "assignment" },
    { href: "/contatos", label: "Contatos", icon: "forum" },
    { href: "/perfil", label: "Perfil", icon: "person" },
  ];

  return (
    <nav className="fixed bottom-0 w-full z-50 pb-safe bg-surface/90 backdrop-blur-xl border-t border-[color:var(--line)]">
      <div className="flex items-center justify-around h-16 px-gutter-sm">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] py-1 px-space-xs gap-space-xs transition-colors ${
                active ? "text-primary font-semibold" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-shadow ${
                  active ? "neu-inset-sm" : ""
                }`}
              >
                <MaterialIcon name={item.icon} filled={active} />
              </span>
              <span className="text-caption font-caption text-center leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
