"use client";

import Link from "next/link";
import { useCurrentUser } from "@/lib/use-current-user";

/** "Entrar" nas telas públicas: só aparece para quem não está logado. */
export function BotaoEntrar() {
  const { loading, session } = useCurrentUser();
  if (loading || session) return null;
  return (
    <Link
      href="/entrar"
      className="vidro-acento h-10 px-space-md rounded-full flex items-center flex-shrink-0 font-label-md text-label-md transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      Entrar
    </Link>
  );
}
