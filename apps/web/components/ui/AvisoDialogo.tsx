"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";

/**
 * Aviso em popup para um resultado que a pessoa precisa ler (ex.: "você já avaliou"),
 * no lugar de uma linha de erro perdida no formulário. Controlado por quem usa: o
 * Radix cuida de prender o foco, fechar com Esc, devolver o foco e anunciar o texto.
 */
export function AvisoDialogo({
  aberto,
  onFechar,
  titulo,
  descricao,
  rotulo = "Entendi",
  onConfirmar,
}: {
  aberto: boolean;
  onFechar: () => void;
  titulo: string;
  descricao: string;
  rotulo?: string;
  /** Ação do botão principal; sem ela o botão só fecha o aviso. */
  onConfirmar?: () => void;
}) {
  return (
    <AlertDialog.Root open={aberto} onOpenChange={(valor) => !valor && onFechar()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialogo-fundo fixed inset-0 z-[70] bg-black/45 backdrop-blur-sm" />
        <AlertDialog.Content className="dialogo-painel fixed z-[71] left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface p-space-md neu-surface flex flex-col gap-space-sm focus:outline-none">
          <AlertDialog.Title className="font-title-md text-title-md text-on-surface">{titulo}</AlertDialog.Title>
          <AlertDialog.Description className="font-body-md text-body-md text-on-surface-variant">
            {descricao}
          </AlertDialog.Description>
          <div className="flex justify-end pt-space-xs">
            <AlertDialog.Action asChild>
              <button
                type="button"
                onClick={onConfirmar}
                className="btn-accent-neu h-11 px-space-md rounded-full font-label-md text-label-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {rotulo}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
