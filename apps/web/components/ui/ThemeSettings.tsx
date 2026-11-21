"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { LinhaAjusteBotao } from "./Linhas";
import { MaterialIcon } from "./MaterialIcon";

const STORAGE_KEY = "saudeconecta:theme";

type Tema = "light" | "dark" | "system";

const OPCOES: { value: Tema; label: string; icon: string; ajuda: string }[] = [
  { value: "light", label: "Claro", icon: "light_mode", ajuda: "Fundo claro o tempo todo" },
  { value: "dark", label: "Escuro", icon: "dark_mode", ajuda: "Fundo escuro o tempo todo" },
  { value: "system", label: "Sistema", icon: "brightness_auto", ajuda: "Segue o modo do seu aparelho" },
];

function applyTheme(tema: Tema) {
  const root = document.documentElement;
  // "system" remove o atributo de propósito — deixa a media query
  // prefers-color-scheme do globals.css decidir.
  if (tema === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", tema);
}

function ehTema(valor: string | null): valor is Tema {
  return valor === "light" || valor === "dark" || valor === "system";
}

/**
 * Aparência (F-036). Único controle de tema do app (B-006), em /perfil/configuracoes.
 * A inicialização do tema antes da pintura continua no script inline de app/layout.tsx.
 *
 * Linha de ajuste que abre uma folha (Dialog do Radix) com as três opções num
 * RadioGroup: foco preso, Esc, setas e aria-checked vêm da biblioteca; o visual
 * é dos nossos tokens. A escolha vale na hora, sem botão de salvar.
 */
export function AjusteAparencia() {
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

  const atual = OPCOES.find((op) => op.value === tema);

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <LinhaAjusteBotao icone="contrast" nome="Aparência" valor={atual?.label ?? ""} />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialogo-fundo fixed inset-0 z-[70] bg-black/45 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          // Foco inicial na opção marcada (não no "Fechar"): quem usa teclado já
          // troca com as setas, e o leitor de tela anuncia a escolha atual.
          onOpenAutoFocus={(evento) => {
            const marcada = (evento.currentTarget as HTMLElement).querySelector<HTMLElement>('[role="radio"][data-state="checked"]');
            if (marcada) {
              evento.preventDefault();
              marcada.focus();
            }
          }}
          className="folha fixed z-[71] inset-x-0 bottom-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 rounded-t-3xl sm:rounded-2xl bg-surface px-space-md pt-space-sm pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:pb-space-md neu-surface flex flex-col gap-space-sm focus:outline-none"
        >
          <span aria-hidden="true" className="sm:hidden mx-auto mt-1 h-1.5 w-10 rounded-full bg-on-surface/20" />
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-title-md text-title-md text-on-surface">Aparência</Dialog.Title>
            <Dialog.Close
              aria-label="Fechar"
              className="w-11 h-11 -mr-2 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <MaterialIcon name="close" />
            </Dialog.Close>
          </div>
          <RadioGroup.Root
            aria-label="Aparência"
            value={tema ?? ""}
            onValueChange={escolher}
            className="flex flex-col gap-space-xs"
          >
            {OPCOES.map((op) => (
              <RadioGroup.Item
                key={op.value}
                value={op.value}
                className="segmento group min-h-[60px] px-space-sm rounded-2xl flex items-center gap-space-sm text-left text-on-surface data-[state=checked]:neu-inset-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span
                  aria-hidden="true"
                  className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-on-surface/[0.06] text-on-surface-variant group-data-[state=checked]:bg-primary/10 group-data-[state=checked]:text-primary"
                >
                  <MaterialIcon name={op.icon} className="text-[20px]" />
                </span>
                <span className="flex-1 flex flex-col">
                  <span className="font-body-lg text-body-lg">{op.label}</span>
                  <span className="font-caption text-caption text-on-surface-variant">{op.ajuda}</span>
                </span>
                <span
                  aria-hidden="true"
                  className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-outline-variant group-data-[state=checked]:border-primary group-data-[state=checked]:bg-primary group-data-[state=checked]:text-on-primary"
                >
                  <RadioGroup.Indicator className="flex">
                    <MaterialIcon name="check" className="text-[16px]" />
                  </RadioGroup.Indicator>
                </span>
              </RadioGroup.Item>
            ))}
          </RadioGroup.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
