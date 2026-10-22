"use client";

import { useEffect, useState } from "react";
import * as RadioGroup from "@radix-ui/react-radio-group";
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

function ehTema(valor: string | null): valor is Tema {
  return valor === "light" || valor === "dark" || valor === "system";
}

/**
 * Controle de aparência (F-036). Único controle de tema do app (B-006): vive em
 * /perfil/configuracoes. A inicialização do tema (padrão "light", aplicado antes
 * da pintura) continua no script inline de app/layout.tsx; aqui só se lê o
 * estado salvo e se troca.
 *
 * Controle segmentado sobre o RadioGroup do Radix: setas, Tab, foco e
 * `aria-checked` vêm da biblioteca; o visual é só dos nossos tokens (trilho
 * afundado, opção ativa em relevo). Ver docs/decisions/0002.
 */
export function ThemeSettings() {
  const [tema, setTema] = useState<Tema | null>(null);

  useEffect(() => {
    let salvo: string | null = null;
    try {
      salvo = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage indisponível (modo privado etc.): segue no padrão light
    }
    setTema(ehTema(salvo) ? salvo : "light");
  }, []);

  function escolher(valor: string) {
    if (!ehTema(valor)) return;
    applyTheme(valor);
    setTema(valor);
    try {
      window.localStorage.setItem(STORAGE_KEY, valor);
    } catch {
      // ok manter só em memória nesta sessão
    }
  }

  return (
    <div className="flex flex-col gap-space-xs">
      <span id="rotulo-aparencia" className="font-label-md text-label-md text-on-surface">
        Aparência
      </span>
      <RadioGroup.Root
        aria-labelledby="rotulo-aparencia"
        aria-describedby="ajuda-aparencia"
        orientation="horizontal"
        // Antes de ler o localStorage o valor é "" (nenhuma opção marcada), para
        // não piscar "Claro" em quem usa o escuro.
        value={tema ?? ""}
        onValueChange={escolher}
        className="grid grid-cols-3 gap-1 p-1 rounded-full neu-inset-sm"
      >
        {OPCOES.map((op) => (
          <RadioGroup.Item
            key={op.value}
            value={op.value}
            className="segmento h-10 rounded-full flex items-center justify-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface data-[state=checked]:text-primary data-[state=checked]:neu-surface-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span aria-hidden="true" className="flex">
              <MaterialIcon name={op.icon} className="text-[18px]" filled={tema === op.value} />
            </span>
            {op.label}
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
      <p id="ajuda-aparencia" className="font-caption text-caption text-on-surface-variant">
        Sistema segue o modo claro ou escuro do seu aparelho.
      </p>
    </div>
  );
}
