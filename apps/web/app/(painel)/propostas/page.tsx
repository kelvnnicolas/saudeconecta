"use client";

import Link from "next/link";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { ListaEsqueleto } from "@/components/ui/Skeleton";
import { useContatos } from "@/lib/use-contatos";
import { useCurrentUser } from "@/lib/use-current-user";
import type { ContatoRead } from "@/lib/types";

// Propostas = o que o profissional tem em andamento com empresas e contratantes. Não existe
// uma entidade "proposta" no backend: um interesse em demanda (POST /demandas/{id}/interesse) e
// um contato recebido são registros de contato, com origem "demanda" e "busca". Esta tela só
// os separa por origem; as conversas continuam em Mensagens. Estados de aceite, recusa ou
// análise não existem no backend e por isso não aparecem aqui.

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function Cartao({
  contato,
  nome,
  etiqueta,
  destaque,
}: {
  contato: ContatoRead;
  nome: string;
  etiqueta: string;
  destaque?: boolean;
}) {
  return (
    <Link
      href={`/contatos/${contato.id}`}
      className="bg-surface-container-lowest rounded-2xl p-space-md neu-surface neu-pressable active:scale-[0.99] flex flex-col gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-center justify-between gap-space-xs">
        <h3 className="font-title-md text-title-md text-on-surface truncate">{nome}</h3>
        <span className="font-caption text-caption text-on-surface-variant flex-shrink-0">
          {formatarData(contato.criado_em)}
        </span>
      </div>
      <p className="font-body-md text-body-md text-on-surface line-clamp-2">{contato.mensagem}</p>
      <span
        className={`self-start mt-space-xs inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-label-sm ${
          destaque ? "bg-primary-fixed text-on-primary-fixed-variant" : "bg-surface-container-high text-on-surface-variant"
        }`}
      >
        {etiqueta}
      </span>
    </Link>
  );
}

export default function PropostasPage() {
  const { session } = useCurrentUser();
  const { contatos, carregando, erro, nomeDaOutraParte } = useContatos();

  const meus = contatos.filter((c) => c.profissional_id === session?.user.id);
  const convites = meus.filter((c) => c.origem === "busca");
  const interesses = meus.filter((c) => c.origem === "demanda");

  return (
    <main className="flex-1 pt-space-md pb-24 px-gutter bg-surface min-h-screen flex flex-col gap-space-md">
      <div>
        <h1 className="font-headline-md text-headline-md text-on-surface">Propostas</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Convites que você recebeu e interesses que você enviou a empresas e contratantes.
        </p>
      </div>

      {carregando && <ListaEsqueleto />}
      {erro && <p className="font-caption text-caption text-error bg-error-container rounded-lg p-space-sm">{erro}</p>}

      {!carregando && !erro && (
        <>
          <section aria-labelledby="titulo-convites" className="flex flex-col gap-space-sm">
            <h2 id="titulo-convites" className="font-title-md text-title-md text-on-surface">
              Convites recebidos ({convites.length})
            </h2>
            {convites.map((c) => (
              <Cartao
                key={c.id}
                contato={c}
                nome={nomeDaOutraParte(c)}
                etiqueta={c.aceito_em ? "Aceito" : "Em aberto"}
                destaque={!c.aceito_em}
              />
            ))}
            {convites.length === 0 && (
              <p className="font-body-md text-body-md text-on-surface-variant py-space-sm">
                Quando uma empresa ou contratante entrar em contato com você, o convite aparece aqui.
              </p>
            )}
          </section>

          <section aria-labelledby="titulo-interesses" className="flex flex-col gap-space-sm">
            <h2 id="titulo-interesses" className="font-title-md text-title-md text-on-surface">
              Interesses enviados ({interesses.length})
            </h2>
            {interesses.map((c) => (
              <Cartao key={c.id} contato={c} nome={nomeDaOutraParte(c)} etiqueta="Interesse enviado" />
            ))}
            {interesses.length === 0 && (
              <div className="flex flex-col items-start gap-space-sm py-space-sm">
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Você ainda não demonstrou interesse em nenhuma oportunidade.
                </p>
                <Link
                  href="/oportunidades"
                  className="inline-flex items-center gap-1 h-11 px-space-md rounded-xl bg-primary text-on-primary neu-surface font-label-md text-label-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <MaterialIcon name="work" className="text-[18px]" />
                  Ver oportunidades
                </Link>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
