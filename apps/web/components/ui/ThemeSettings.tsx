"use client";

import { useEffect, useState } from "react";
import { MaterialIcon } from "./MaterialIcon";

const STORAGE_KEY = "saudeconecta:theme";

type Tema = "light" | "dark" | "system";

const OPCOES: { value: Tema; label: string; icon: string }[] = [
  { value: "light", label: "Claro", icon: "light_mode" },
  { value: "dark", label: "Escuro", icon: "dark_mode" },
  { value: "system", label: "Sistema", icon: "brightness_auto" },
];

function applyTheme(tema: Tema) {
  const root = document.documentElement;
  // "system" remove o atributo de propósito — deixa a media query
  // prefers-color-scheme do globals.css decidir, sem precisar duplicar
  // lógica de detecção aqui.
  if (tema === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", tema);
}

/**
 * Configuração de aparência — vive só em /perfil agora (antes era um botão
 * solto repetido em várias telas). A inicialização do tema (padrão "light",
 * aplicado antes da pintura) é responsabilidade do script inline em
 * app/layout.tsx — precisa rodar em toda página, não só aqui. Este
 * componente só lê o estado já aplicado e deixa a pessoa trocar.
 */
export function ThemeSettings() {
  const [mounted, setMounted] = useState(false);
  const [tema, setTema] = useState<Tema>("light");

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage indisponível (modo privado etc.) — segue no padrão light
    }
    setTema(stored === "dark" || stored === "system" ? stored : "light");
    setMounted(true);
  }, []);

  function escolher(proximo: Tema) {
    applyTheme(proximo);
    setTema(proximo);
    try {
      window.localStorage.setItem(STORAGE_KEY, proximo);
    } catch {
      // ok manter só em memória nesta sessão
    }
  }

  return (
    <section className="bg-surface-container-lowest rounded-2xl p-space-md neu-surface flex flex-col gap-space-sm">
      <h2 className="font-title-md text-title-md text-on-surface">Aparência</h2>
      <div className="flex gap-space-xs">
        {OPCOES.map((op) => {
          const ativo = mounted && tema === op.value;
          return (
            <button
              key={op.value}
              type="button"
              onClick={() => escolher(op.value)}
              className={`flex-1 flex flex-col items-center gap-1 py-space-sm rounded-xl font-label-sm text-label-sm transition-colors ${
                ativo ? "bg-primary-container text-on-primary neu-inset-sm" : "bg-surface-container-low text-on-surface-variant"
              }`}
            >
              <MaterialIcon name={op.icon} className="text-[20px]" />
              {op.label}
            </button>
          );
        })}
      </div>
      <p className="font-caption text-caption text-on-surface-variant">
        &quot;Sistema&quot; acompanha o modo claro/escuro do seu navegador ou aparelho automaticamente.
      </p>
    </section>
  );
}
