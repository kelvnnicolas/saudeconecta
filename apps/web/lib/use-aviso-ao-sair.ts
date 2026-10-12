import { useEffect } from "react";

/** Mostra o aviso do navegador ao fechar/recarregar a aba enquanto `ativo` for true. */
export function useAvisoAoSair(ativo: boolean) {
  useEffect(() => {
    if (!ativo) return;
    function avisar(evento: BeforeUnloadEvent) {
      evento.preventDefault();
    }
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [ativo]);
}
