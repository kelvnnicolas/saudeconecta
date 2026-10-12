import Link from "next/link";

/** Atalho para resolver erros de plano (limite do mês ou pagamento pendente). */
export function AcaoDoErro({ codigo }: { codigo: string | null }) {
  if (codigo === "limite_atingido") {
    return (
      <Link href="/empresa/planos" className="font-label-md text-label-md text-primary">
        Ver planos
      </Link>
    );
  }
  if (codigo === "pagamento_pendente") {
    return (
      <Link href="/assinatura" className="font-label-md text-label-md text-primary">
        Atualizar pagamento
      </Link>
    );
  }
  return null;
}
