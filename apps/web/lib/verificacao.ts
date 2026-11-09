import type { StatusVerificacao } from "./types";

/** Texto público do selo. Não diz "validado pelo conselho": a conferência é do SaúdeConecta. */
export function textoRegistroConferido(verificadoEm?: string | null): string {
  if (!verificadoEm) return "Registro conferido pelo SaúdeConecta";
  const data = new Date(verificadoEm);
  if (Number.isNaN(data.getTime())) return "Registro conferido pelo SaúdeConecta";
  // A API grava 12:00 UTC do dia (Brasil) da conferência; UTC evita virar o dia.
  const formatada = data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  return `Registro conferido pelo SaúdeConecta em ${formatada}`;
}

/** Quando o botão "Solicitar conferência" pode aparecer (a API ainda exige registro informado). */
export function podeSolicitarConferencia(status: StatusVerificacao): boolean {
  return status === "unverified" || status === "irregular" || status === "unable_to_verify";
}
