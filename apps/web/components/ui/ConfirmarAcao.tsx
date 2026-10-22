"use client";

import { useState, type ReactNode } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";

/**
 * Confirmação de uma ação com consequência (sair da conta, descartar, remover).
 * O AlertDialog do Radix cuida de prender o foco, fechar com Esc, devolver o
 * foco a quem abriu e anunciar título e descrição; o visual é dos nossos tokens.
 * O foco inicial vai para "Cancelar", que é a opção segura.
 */
export function ConfirmarAcao({
  gatilho,
  titulo,
  descricao,
  rotuloConfirmar,
  rotuloCancelar = "Cancelar",
  perigosa = false,
  onConfirmar,
}: {
  gatilho: ReactNode;
  titulo: string;
  descricao: string;
  rotuloConfirmar: string;
  rotuloCancelar?: string;
  perigosa?: boolean;
  onConfirmar: () => void | Promise<void>;
}) {
  const [executando, setExecutando] = useState(false);

  async function confirmar(evento: React.MouseEvent) {
    // Mantém o diálogo aberto enquanto a ação roda (ex.: signOut), para o
    // botão mostrar o estado em vez de a janela sumir antes da hora.
    evento.preventDefault();
    setExecutando(true);
    try {
      await onConfirmar();
    } finally {
      setExecutando(false);
    }
  }

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{gatilho}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialogo-fundo fixed inset-0 z-[70] bg-black/45 backdrop-blur-sm" />
        <AlertDialog.Content className="dialogo-painel fixed z-[71] left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface p-space-md neu-surface flex flex-col gap-space-sm focus:outline-none">
          <AlertDialog.Title className="font-title-md text-title-md text-on-surface">{titulo}</AlertDialog.Title>
          <AlertDialog.Description className="font-body-md text-body-md text-on-surface-variant">
            {descricao}
          </AlertDialog.Description>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-space-xs pt-space-xs">
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                className="h-11 px-space-md rounded-full font-label-md text-label-md text-on-surface neu-surface-sm neu-pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {rotuloCancelar}
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                type="button"
                onClick={confirmar}
                disabled={executando}
                aria-busy={executando}
                className={`h-11 px-space-md rounded-full font-label-md text-label-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 ${
                  perigosa ? "bg-error text-on-error" : "btn-accent-neu"
                }`}
              >
                {executando ? "Aguarde…" : rotuloConfirmar}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
