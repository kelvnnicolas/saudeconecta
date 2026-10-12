import { InicioCadastroEmpresa } from "./InicioCadastroEmpresa";

/** Captação de empresas em etapas: só o e-mail primeiro. */
export function SecaoEmpresas() {
  return (
    <section id="empresas" className="scroll-mt-24 px-gutter md:px-gutter-lg py-space-xl md:py-20">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-space-lg md:gap-12 items-center rounded-3xl bg-surface-container-lowest neu-surface p-space-lg md:p-12">
        <div className="flex flex-col gap-space-sm">
          <span className="self-start rounded-full bg-primary-fixed text-on-primary-fixed px-space-sm py-1 font-label-sm text-label-sm">
            Para empresas
          </span>
          <h2 className="font-headline-lg text-headline-lg md:text-[32px] md:leading-[40px] text-on-surface">
            Conecte sua empresa a profissionais de saúde avaliados
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Comece pelo e-mail. Em seguida você informa os dados da empresa e já pode buscar profissionais e publicar
            demandas.
          </p>
        </div>
        <InicioCadastroEmpresa />
      </div>
    </section>
  );
}
