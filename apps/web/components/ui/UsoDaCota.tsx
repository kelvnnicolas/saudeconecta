import Link from "next/link";
import { MaterialIcon } from "./MaterialIcon";
import { estadoDaCota } from "@/lib/use-uso-mensal";
import type { UsoMensal } from "@/lib/types";

/** Quanto da cota mensal a empresa já usou, com aviso perto do limite e quando acaba. */
export function UsoDaCota({ uso }: { uso: UsoMensal | null }) {
  if (!uso || uso.limite == null) return null;
  const estado = estadoDaCota(uso);
  const restantes = Math.max(0, uso.limite - uso.usado);
  const percentual = Math.min(100, (uso.usado / uso.limite) * 100);

  if (estado === "esgotada") {
    return (
      <div role="status" className="flex flex-col gap-space-xs bg-error-container rounded-lg p-space-sm">
        <p className="font-caption text-caption text-error">
          Você usou {uso.usado} de {uso.limite} contatos e demandas neste mês. Assine um plano para continuar ou
          aguarde a virada do mês.
        </p>
        <Link href="/empresa/planos" className="font-label-md text-label-md text-primary">
          Ver planos
        </Link>
      </div>
    );
  }

  const aviso = estado === "perto";
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
      <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
        <div className={`h-full ${aviso ? "bg-error" : "bg-primary"}`} style={{ width: `${percentual}%` }} />
      </div>
    </div>
  );
}
