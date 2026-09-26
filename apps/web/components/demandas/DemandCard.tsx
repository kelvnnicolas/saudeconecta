import type { DemandaRead } from "@/lib/types";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { DemandaStatusBadge } from "@/components/ui/StatusBadge";

function diasRestantes(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

export function DemandCard({
  demanda,
  headerTitle,
  footer,
}: {
  demanda: DemandaRead;
  /** empresa_nome (visão do profissional) ou especialidade_nome (visão da empresa) */
  headerTitle: string;
  footer: React.ReactNode;
}) {
  return (
    <article className="bg-surface-container-lowest rounded-2xl p-space-md neu-surface flex flex-col gap-space-sm">
      <div className="flex items-start justify-between gap-space-sm">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-title-md text-title-md text-on-surface truncate">{headerTitle}</span>
          <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
            {demanda.especialidade_nome} &middot; {demanda.cidade}, {demanda.estado}
            {demanda.bairro ? ` - ${demanda.bairro}` : ""}
          </span>
        </div>
        <DemandaStatusBadge status={demanda.status} />
      </div>
      <p className="font-body-md text-body-md text-on-surface line-clamp-2">{demanda.descricao}</p>
      <div className="flex flex-wrap items-center gap-space-sm font-label-sm text-label-sm text-on-surface-variant">
        <span className="inline-flex items-center gap-1">
          <MaterialIcon name="calendar_month" className="text-[16px]" />
          Início {formatarData(demanda.data_inicio)}
        </span>
        <span className="inline-flex items-center gap-1">
          <MaterialIcon name="schedule" className="text-[16px]" />
          {demanda.turno}
        </span>
        <span className="inline-flex items-center gap-1">
          <MaterialIcon name="payments" className="text-[16px]" />
          {demanda.valor_oferecido != null ? `R$ ${demanda.valor_oferecido}` : "A combinar"}
        </span>
      </div>
      <div className="flex items-center justify-between pt-space-xs border-t border-outline-variant/30">
        <span className="font-caption text-caption text-outline">
          {demanda.status === "aberta" ? `Expira em ${diasRestantes(demanda.expira_em)} dias` : ""}
        </span>
        {footer}
      </div>
    </article>
  );
}
