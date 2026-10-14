/**
 * Agrupa os campos de um formulário e os desativa de uma vez quando a ação está bloqueada
 * pelo plano: quem já sabe que não pode enviar não gasta tempo preenchendo.
 */
export function CamposDoFormulario({ bloqueado, children }: { bloqueado: boolean; children: React.ReactNode }) {
  return (
    <fieldset
      disabled={bloqueado}
      className={`flex min-w-0 flex-col gap-space-md transition-opacity duration-200 ${bloqueado ? "opacity-50" : ""}`}
    >
      {children}
    </fieldset>
  );
}
