import Link from "next/link";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Revelar } from "./Revelar";

/** Faixa curta de chamada para empresas, no meio da página: leva ao mesmo formulário do hero. */
export function ChamadaEmpresa() {
  return (
    <section className="px-gutter md:px-gutter-lg pb-space-xl md:pb-20">
      <Revelar className="mx-auto flex max-w-6xl flex-col gap-space-md rounded-2xl vidro p-space-lg md:flex-row md:items-center md:justify-between md:p-space-xl">
        <div className="flex flex-col gap-1">
          <h2 className="font-title-md text-title-md md:text-[24px] md:leading-[32px] text-on-surface">
            Sua empresa precisa de profissionais de saúde?
          </h2>
          <p className="font-body-md text-body-md text-on-surface">Comece só com o e-mail.</p>
        </div>
        <Link
          href="#empresas"
          className="vidro-acento inline-flex h-12 flex-shrink-0 items-center justify-center gap-space-xs rounded-full px-space-lg font-label-md text-label-md transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Cadastrar minha empresa
          <MaterialIcon name="arrow_forward" className="text-[18px]" />
        </Link>
      </Revelar>
    </section>
  );
}
