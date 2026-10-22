"use client";

import { MaterialIcon } from "@/components/ui/MaterialIcon";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // TODO(integração): reportar `error` ao Sentry (@sentry/nextjs), conforme o spec.
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-space-md bg-surface min-h-screen px-gutter text-center">
      <MaterialIcon name="error" className="text-[56px] text-error" />
      <h1 className="font-headline-md text-headline-md text-on-surface">Algo deu errado</h1>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
        Não foi possível mostrar esta tela. Tente de novo; se continuar, recarregue a página.
      </p>
      <button
        onClick={reset}
        className="px-space-md h-11 rounded-xl neu-surface neu-pressable bg-primary text-on-primary font-label-md text-label-md flex items-center"
      >
        Tentar novamente
      </button>
    </main>
  );
}
