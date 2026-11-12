"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { signOut } from "@/lib/supabase-client";
import { useCurrentUser } from "@/lib/use-current-user";
import { useEhAdmin } from "@/lib/use-eh-admin";
import { itensDoMenuEu, menuEuAtivo, navegacaoDoPapel } from "@/lib/navegacao";

/**
 * Menu pessoal ("Eu"), aberto pelo avatar. Reúne o que é da conta e da identidade da pessoa no
 * marketplace, fora da navegação principal. Teclado: Enter/Espaço/seta para baixo abrem; setas,
 * Home e End percorrem; Esc fecha e devolve o foco ao avatar; Tab fecha.
 */
export function MenuEu() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, papel, papelConfirmado, profissional, empresa } = useCurrentUser();
  const ehAdmin = useEhAdmin();
  const [aberto, setAberto] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const itensRef = useRef<(HTMLElement | null)[]>([]);

  const nome = profissional?.nome ?? empresa?.nome ?? session?.user.email ?? "Minha conta";
  const avatarUrl = profissional?.avatar_url ?? empresa?.avatar_url ?? null;
  const itens = papelConfirmado ? itensDoMenuEu(papel, ehAdmin) : [];
  const ativo = papelConfirmado && menuEuAtivo(pathname, papel);

  useEffect(() => {
    setAberto(false);
  }, [pathname]);

  useEffect(() => {
    if (!aberto) return;
    itensRef.current[0]?.focus();
    function aoClicarFora(e: MouseEvent) {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [aberto]);

  function aoTeclarNoMenu(e: React.KeyboardEvent) {
    const lista = itensRef.current.filter(Boolean) as HTMLElement[];
    const atual = lista.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      setAberto(false);
      botao.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      lista[(atual + 1) % lista.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      lista[(atual - 1 + lista.length) % lista.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      lista[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      lista[lista.length - 1]?.focus();
    } else if (e.key === "Tab") {
      setAberto(false);
    }
  }

  async function sair() {
    setSaindo(true);
    try {
      await signOut();
    } finally {
      router.push("/entrar");
    }
  }

  if (!session) return null;

  const subtitulo = papelConfirmado ? navegacaoDoPapel(papel).rotuloDoPapel : "Cadastro incompleto";
  // O perfil é a identidade profissional da pessoa no marketplace.
  const chamada = papelConfirmado
    ? papel === "profissional"
      ? "Seu perfil profissional"
      : "Perfil da sua organização"
    : null;

  return (
    <div className="relative" ref={raiz}>
      <button
        ref={botao}
        type="button"
        aria-label="Menu da conta"
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={() => setAberto((a) => !a)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !aberto) {
            e.preventDefault();
            setAberto(true);
          }
        }}
        className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-full overflow-hidden flex items-center justify-center text-on-surface-variant neu-surface-sm neu-pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          ativo ? "ring-2 ring-primary" : ""
        }`}
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt="" width={44} height={44} className="w-full h-full object-cover" />
        ) : (
          <MaterialIcon name="person" />
        )}
      </button>

      {aberto && (
        <div
          role="menu"
          aria-label="Conta"
          onKeyDown={aoTeclarNoMenu}
          className="absolute right-0 top-14 w-72 max-w-[calc(100vw-2rem)] rounded-2xl neu-surface bg-surface-container-lowest p-space-sm flex flex-col gap-space-xs z-50"
        >
          <div className="px-space-sm py-space-xs flex flex-col">
            <span className="font-title-md text-title-md text-on-surface line-clamp-1">{nome}</span>
            <span className="font-caption text-caption text-on-surface-variant">
              {subtitulo}
              {chamada ? ` · ${chamada}` : ""}
            </span>
          </div>
          <div className="h-px bg-outline-variant" role="separator" />

          {itens.map((item, i) => {
            const semHash = item.href.split("#")[0];
            const atual = pathname === semHash && !item.href.includes("#");
            return (
              <Link
                key={item.id}
                ref={(el) => {
                  itensRef.current[i] = el;
                }}
                role="menuitem"
                href={item.href}
                prefetch={item.somenteAdmin ? false : undefined}
                aria-current={atual ? "page" : undefined}
                className="min-h-[44px] px-space-sm rounded-xl flex items-center gap-space-sm font-label-md text-label-md text-on-surface hover:bg-primary-fixed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <MaterialIcon name={item.icone} className="text-[20px] text-on-surface-variant" />
                {item.rotulo}
              </Link>
            );
          })}

          {itens.length > 0 && <div className="h-px bg-outline-variant" role="separator" />}
          <button
            ref={(el) => {
              itensRef.current[itens.length] = el;
            }}
            type="button"
            role="menuitem"
            onClick={sair}
            disabled={saindo}
            className="min-h-[44px] px-space-sm rounded-xl flex items-center gap-space-sm font-label-md text-label-md text-on-surface hover:bg-primary-fixed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <MaterialIcon name="logout" className="text-[20px] text-on-surface-variant" />
            {saindo ? "Saindo..." : "Encerrar sessão"}
          </button>
        </div>
      )}
    </div>
  );
}
