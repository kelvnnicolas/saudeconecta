import Link from "next/link";
import { AvisoLimite } from "./AvisoLimite";
import { MaterialIcon } from "./MaterialIcon";
import { estadoDaCota } from "@/lib/use-uso-mensal";
import type { ContextoLimite, PlanoResumo } from "@/lib/limite-plano";
import type { UsoMensal } from "@/lib/types";

/**
 * Quanto da cota mensal a empresa já usou: barra discreta no uso normal, aviso com atalho
 * perto do limite e, com a cota esgotada, o aviso completo de limite atingido.
 */
export function UsoDaCota({
  uso,
  plano = null,
  contexto = "geral",
  pagamentoPendente = false,
}: {
  uso: UsoMensal | null;
  plano?: PlanoResumo | null;
  contexto?: ContextoLimite;
  pagamentoPendente?: boolean;
}) {
  if (pagamentoPendente) {
    return <AvisoLimite uso={uso ?? { usado: 0, limite: null }} plano={plano} contexto={contexto} tipo="pagamento" />;
  }
  if (!uso || uso.limite == null) return null;
  const estado = estadoDaCota(uso);
  if (estado === "esgotada") return <AvisoLimite uso={uso} plano={plano} contexto={contexto} />;

  const restantes = Math.max(0, uso.limite - uso.usado);
  const percentual = Math.min(100, (uso.usado / uso.limite) * 100);
  const aviso = estado === "perto";
  const acao = plano ? { href: "/assinatura", rotulo: "Gerenciar assinatura" } : { href: "/empresa/planos", rotulo: "Conhecer os planos" };

  return (
    <div role="status" className="flex flex-col gap-1">
      <div className="flex items-center justify-between font-caption text-caption">
        <span className={`inline-flex items-center gap-1 ${aviso ? "text-error" : "text-on-surface-variant"}`}>
          {aviso && <MaterialIcon name="warning" className="text-[16px]" />}
          {aviso
            ? `Restam ${restantes} ${restantes === 1 ? "uso" : "usos"} neste mês`
            : "Contatos e demandas neste mês"}
        </span>
        <span className="text-on-surface-variant">
          {uso.usado} de {uso.limite}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
        <div className={`h-full ${aviso ? "bg-error" : "bg-primary"}`} style={{ width: `${percentual}%` }} />
      </div>
      {aviso && (
        <Link href={acao.href} className="inline-flex min-h-11 items-center self-start font-label-md text-label-md text-primary underline underline-offset-4">
          {acao.rotulo}
        </Link>
      )}
    </div>
  );
}
