import type { StatusAssinatura, StatusContato, StatusDemanda } from "@/lib/types";
import { MaterialIcon } from "./MaterialIcon";

const DEMANDA_LABELS: Record<StatusDemanda, { label: string; icon: string; className: string }> = {
  aberta: { label: "Aberta", icon: "radio_button_checked", className: "bg-secondary-container text-on-secondary-container" },
  preenchida: { label: "Preenchida", icon: "task_alt", className: "bg-surface-container-high text-on-surface-variant" },
  encerrada: { label: "Encerrada", icon: "event_busy", className: "bg-surface-container text-outline" },
  expirada: { label: "Expirada", icon: "schedule", className: "bg-error-container text-on-error-container" },
};

const CONTATO_LABELS: Record<StatusContato, { label: string; icon: string; className: string }> = {
  pendente: { label: "Aguardando resposta", icon: "hourglass_top", className: "bg-surface-container-high text-on-surface-variant" },
  respondido: { label: "Em andamento", icon: "check_circle", className: "bg-secondary-container text-on-secondary-container" },
  encerrado: { label: "Concluído", icon: "task_alt", className: "bg-surface-container text-on-surface-variant" },
};

const ASSINATURA_LABELS: Record<StatusAssinatura, { label: string; className: string }> = {
  incomplete: { label: "Pendente", className: "bg-surface-container-high text-on-surface-variant" },
  trialing: { label: "Período de teste", className: "bg-tertiary-fixed text-on-tertiary-fixed-variant" },
  active: { label: "Ativa", className: "bg-white/15 text-inherit" },
  past_due: { label: "Pagamento atrasado", className: "bg-error-container text-on-error-container" },
  canceled: { label: "Cancelada", className: "bg-surface-container text-outline" },
  unpaid: { label: "Não paga", className: "bg-error-container text-on-error-container" },
  incomplete_expired: { label: "Expirada", className: "bg-surface-container text-outline" },
  paused: { label: "Pausada", className: "bg-surface-container-high text-on-surface-variant" },
};

export function DemandaStatusBadge({ status }: { status: StatusDemanda }) {
  const info = DEMANDA_LABELS[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm flex-shrink-0 ${info.className}`}>
      <MaterialIcon name={info.icon} className="text-[14px]" />
      {info.label}
    </span>
  );
}

export function ContatoStatusBadge({ status }: { status: StatusContato }) {
  const info = CONTATO_LABELS[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm ${info.className}`}>
      <MaterialIcon name={info.icon} className="text-[14px]" />
      {info.label}
    </span>
  );
}

export function assinaturaStatusLabel(status: StatusAssinatura | null) {
  if (!status) return { label: "Sem assinatura", className: "bg-surface-container text-outline" };
  return ASSINATURA_LABELS[status];
}
