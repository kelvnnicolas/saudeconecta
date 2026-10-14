"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { StarRating } from "@/components/ui/StarRating";
import { Revelar } from "./Revelar";

// Mostra o fluxo real do app (busca, conversa com aceite e avaliação) com conteúdo
// ilustrativo: nomes fictícios, iniciais no lugar de foto e nada vindo da API.
const PASSOS = [
  {
    id: "busque",
    icon: "search",
    titulo: "Busque",
    desc: "Busque por nome ou especialidade e abra o perfil de quem interessa.",
  },
  {
    id: "converse",
    icon: "chat",
    titulo: "Converse e combine",
    desc: "Envie uma mensagem direto pelo app. O profissional responde e pode aceitar a demanda ali mesmo.",
  },
  {
    id: "avalie",
    icon: "star",
    titulo: "Avalie",
    desc: "Depois do atendimento, deixe uma nota e um comentário. Isso ajuda quem vem depois.",
  },
] as const;

function Iniciais({ texto }: { texto: string }) {
  return (
    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-secondary-container font-label-md text-label-md text-on-secondary-container">
      {texto}
    </span>
  );
}

function CartaoProfissional({ iniciais, nome, detalhe, preco }: { iniciais: string; nome: string; detalhe: string; preco: string }) {
  return (
    <div className="flex items-center gap-space-sm rounded-2xl bg-on-surface/5 p-space-sm">
      <Iniciais texto={iniciais} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-label-md text-label-md text-on-surface">{nome}</span>
        <span className="font-caption text-caption text-on-surface-variant">{detalhe}</span>
        <span className="font-caption text-caption text-on-surface">{preco}</span>
      </div>
      <span className="rounded-lg bg-primary-fixed px-space-sm py-1 font-label-sm text-label-sm text-primary">Ver perfil</span>
    </div>
  );
}

function Balao({ de, children }: { de: "empresa" | "profissional"; children: React.ReactNode }) {
  const empresa = de === "empresa";
  return (
    <div className={`flex ${empresa ? "justify-end" : "justify-start"}`}>
      <p
        className={`max-w-[85%] rounded-2xl px-space-sm py-2 font-body-md text-body-md ${
          empresa ? "rounded-br-md bg-primary text-on-primary" : "rounded-bl-md bg-on-surface/10 text-on-surface"
        }`}
      >
        {children}
      </p>
    </div>
  );
}

function PainelBusque() {
  return (
    <div className="flex flex-col gap-space-sm">
      <div className="flex h-11 items-center gap-space-xs rounded-xl bg-on-surface/5 px-space-sm text-on-surface-variant">
        <MaterialIcon name="search" className="text-[20px]" />
        <span className="font-body-md text-body-md">Fisioterapia</span>
      </div>
      <CartaoProfissional iniciais="MS" nome="Mariana S." detalhe="Fisioterapeuta · Florianópolis, SC" preco="R$ 80 /hora" />
      <CartaoProfissional iniciais="RT" nome="Rafael T." detalhe="Fisioterapeuta · São José, SC" preco="A combinar" />
    </div>
  );
}

function PainelConversa() {
  return (
    <div className="flex flex-col gap-space-xs">
      <Balao de="empresa">Preciso de um técnico de enfermagem para plantão noturno na sexta.</Balao>
      <Balao de="profissional">Tenho disponibilidade. Qual o endereço e o horário?</Balao>
      <Balao de="empresa">Clínica Vida, no centro. Das 19h às 7h.</Balao>
      <div className="mt-space-xs flex flex-col gap-space-xs rounded-2xl bg-on-surface/5 p-space-sm">
        <span className="font-caption text-caption text-on-surface-variant">Demanda direta de Clínica Vida</span>
        <span className="flex h-11 items-center justify-center rounded-xl bg-primary font-label-md text-label-md text-on-primary">
          Aceitar
        </span>
      </div>
    </div>
  );
}

function PainelAvaliacao() {
  return (
    <div className="flex flex-col gap-space-sm">
      <span className="font-title-md text-title-md text-on-surface">Como foi a experiência com Mariana?</span>
      <StarRating nota={5} />
      <p className="rounded-2xl bg-on-surface/5 p-space-sm font-body-md text-body-md text-on-surface">
        &ldquo;Pontual e muito atenciosa com os pacientes.&rdquo;
      </p>
      <span className="flex h-11 items-center justify-center rounded-xl bg-primary font-label-md text-label-md text-on-primary">
        Enviar avaliação
      </span>
    </div>
  );
}

const PAINEIS = [PainelBusque, PainelConversa, PainelAvaliacao];

export function ComoFunciona() {
  const [ativa, setAtiva] = useState(0);
  const abas = useRef<(HTMLButtonElement | null)[]>([]);
  const Painel = PAINEIS[ativa] ?? PainelBusque;

  function selecionar(indice: number) {
    setAtiva(indice);
    abas.current[indice]?.focus();
  }

  function aoPressionarTecla(evento: React.KeyboardEvent) {
    const total = PASSOS.length;
    const mapa: Record<string, number> = {
      ArrowRight: (ativa + 1) % total,
      ArrowDown: (ativa + 1) % total,
      ArrowLeft: (ativa - 1 + total) % total,
      ArrowUp: (ativa - 1 + total) % total,
      Home: 0,
      End: total - 1,
    };
    const destino = mapa[evento.key];
    if (destino === undefined) return;
    evento.preventDefault();
    selecionar(destino);
  }

  return (
    <section id="como-funciona" className="scroll-mt-24 px-gutter md:px-gutter-lg pb-space-xl md:pb-20">
      <div className="max-w-6xl mx-auto flex flex-col gap-space-lg">
        <Revelar
          as="h2"
          className="font-headline-lg text-headline-lg md:text-[36px] md:leading-[44px] text-on-surface text-center"
        >
          Como funciona
        </Revelar>

        <div className="grid grid-cols-1 gap-space-lg md:grid-cols-2 md:gap-12 md:items-center">
          <div className="flex min-w-0 flex-col gap-space-md">
            <div
              role="tablist"
              aria-label="Etapas"
              aria-orientation="vertical"
              onKeyDown={aoPressionarTecla}
              className="-mx-gutter flex gap-space-xs overflow-x-auto px-gutter no-scrollbar md:mx-0 md:flex-col md:overflow-visible md:px-0"
            >
              {PASSOS.map((passo, i) => {
                const ligada = ativa === i;
                return (
                  <button
                    key={passo.id}
                    ref={(el) => {
                      abas.current[i] = el;
                    }}
                    id={`aba-${passo.id}`}
                    role="tab"
                    type="button"
                    aria-selected={ligada}
                    aria-controls={`painel-${passo.id}`}
                    tabIndex={ligada ? 0 : -1}
                    onClick={() => setAtiva(i)}
                    className={`flex flex-shrink-0 items-center gap-space-sm rounded-full px-space-md h-11 text-left font-label-md text-label-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:h-auto md:flex-col md:items-start md:rounded-2xl md:p-space-md ${
                      ligada
                        ? "vidro-acento"
                        : "bg-surface-container-lowest text-on-surface-variant neu-surface hover:text-on-surface"
                    }`}
                  >
                    <span className="flex items-center gap-space-xs">
                      <MaterialIcon name={passo.icon} className="text-[20px]" />
                      <span className="font-title-md text-title-md">
                        {i + 1}. {passo.titulo}
                      </span>
                    </span>
                    {ligada && <span className="hidden font-body-md text-body-md opacity-95 md:block">{passo.desc}</span>}
                  </button>
                );
              })}
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant md:hidden">{PASSOS[ativa]?.desc}</p>

            <Link
              href="#empresas"
              className="vidro-acento inline-flex h-12 items-center justify-center gap-space-xs self-start rounded-full px-space-lg font-label-md text-label-md transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Cadastrar minha empresa
              <MaterialIcon name="arrow_forward" className="text-[18px]" />
            </Link>
          </div>

          <div className="flex flex-col items-center gap-space-xs">
            <div className="w-full max-w-xs rounded-[2rem] bg-surface-container-lowest p-space-md neu-surface">
              <div aria-hidden="true" className="mx-auto mb-space-sm h-1.5 w-16 rounded-full bg-on-surface/15" />
              <div
                key={ativa}
                role="tabpanel"
                id={`painel-${PASSOS[ativa]?.id}`}
                aria-labelledby={`aba-${PASSOS[ativa]?.id}`}
                className="painel-fade min-h-[300px]"
              >
                <Painel />
              </div>
            </div>
            <span className="font-caption text-caption text-on-surface-variant">Exemplo ilustrativo, com nomes fictícios.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
