import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Revelar } from "./Revelar";

const PASSOS = [
  { icon: "search", titulo: "Busque", desc: "Filtre por especialidade, cidade e preço." },
  { icon: "chat", titulo: "Converse", desc: "Envie uma mensagem e combine tudo pelo app." },
  { icon: "star", titulo: "Avalie", desc: "Depois do atendimento, avalie e ajude quem vem depois." },
];

export function ComoFunciona() {
  return (
    <section id="como-funciona" className="scroll-mt-24 px-gutter md:px-gutter-lg pb-space-xl md:pb-20">
      <div className="max-w-6xl mx-auto flex flex-col gap-space-lg">
        <Revelar
          as="h2"
          className="font-headline-lg text-headline-lg md:text-[36px] md:leading-[44px] text-on-surface text-center"
        >
          Como funciona
        </Revelar>
        <ol className="grid gap-space-md md:grid-cols-3">
          {PASSOS.map((passo, i) => (
            <Revelar
              as="li"
              key={passo.titulo}
              atraso={i * 80}
              className="flex items-center md:items-start md:flex-col gap-space-sm rounded-2xl bg-surface-container-lowest neu-surface p-space-md md:p-space-lg"
            >
              <div className="relative w-11 h-11 rounded-xl bg-primary-fixed text-primary flex items-center justify-center flex-shrink-0">
                <MaterialIcon name={passo.icon} />
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-on-primary font-label-sm text-[11px] flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-title-md text-title-md text-on-surface">{passo.titulo}</span>
                <span className="font-body-md text-body-md text-on-surface-variant">{passo.desc}</span>
              </div>
            </Revelar>
          ))}
        </ol>
      </div>
    </section>
  );
}
