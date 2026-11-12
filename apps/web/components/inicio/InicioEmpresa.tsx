"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { api } from "@/lib/api";
import { useContatos } from "@/lib/use-contatos";
import { useCurrentUser } from "@/lib/use-current-user";
import { useNotificacoes } from "@/lib/use-notificacoes";
import type { MinhaDemandaRead } from "@/lib/types";
import { Atencao, CARTAO, ConversasRecentes, TituloDeBloco } from "./Blocos";

/** Central da organização: demandas publicadas, interessados novos, conversas e atalho de busca. */
export function InicioEmpresa() {
  const { empresa } = useCurrentUser();
  const { itens: notificacoes } = useNotificacoes();
  const { contatos, carregando: carregandoContatos, nomeDaOutraParte } = useContatos();
  const [demandas, setDemandas] = useState<MinhaDemandaRead[] | null>(null);
  const [falha, setFalha] = useState(false);

  useEffect(() => {
    let ativo = true;
    api
      .minhasDemandas()
      .then((r) => ativo && setDemandas(r))
      .catch(() => ativo && setFalha(true));
    return () => {
      ativo = false;
    };
  }, []);

  const abertas = (demandas ?? []).filter((d) => d.status === "aberta");
  const preenchidas = (demandas ?? []).filter((d) => d.status === "preenchida").length;
  const interessados = abertas.reduce((soma, d) => soma + d.interessados_count, 0);
  const recentes = [...abertas].sort((a, b) => b.criado_em.localeCompare(a.criado_em)).slice(0, 3);
  const nome = empresa?.nome_fantasia ?? empresa?.nome;

  return (
    <main className="flex-1 pt-space-md pb-24 lg:pb-space-xl px-gutter bg-surface min-h-screen flex flex-col gap-space-md">
      <div className="flex items-start justify-between gap-space-sm">
        <div className="min-w-0">
          <h1 className="font-headline-md text-headline-md text-on-surface truncate">{nome ? `Olá, ${nome}` : "Início"}</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Suas demandas, interessados e conversas em um só lugar.
          </p>
        </div>
      </div>

      <div className="grid gap-space-md lg:grid-cols-3 lg:items-start">
        <div className="flex flex-col gap-space-md lg:col-span-2">
          <Atencao notificacoes={notificacoes} tipos={["novo_interesse", "nova_mensagem"]} />

          <section aria-labelledby="inicio-demandas" className={CARTAO}>
            <TituloDeBloco id="inicio-demandas" href="/demandas" rotuloLink="Ver minhas demandas">
              Suas demandas
            </TituloDeBloco>
            {demandas === null && !falha && <p className="font-caption text-caption text-on-surface-variant">Carregando...</p>}
            {falha && (
              <p className="font-caption text-caption text-error bg-error-container rounded-lg p-space-sm">
                Não foi possível carregar suas demandas agora.
              </p>
            )}
            {demandas && (
              <>
                <div className="grid grid-cols-3 gap-space-sm">
                  {[
                    { valor: abertas.length, rotulo: "Abertas" },
                    { valor: interessados, rotulo: "Interessados" },
                    { valor: preenchidas, rotulo: "Preenchidas" },
                  ].map((m) => (
                    <Link
                      key={m.rotulo}
                      href="/demandas"
                      className="min-h-[44px] rounded-xl p-space-sm bg-surface-container-high flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span className="font-headline-md text-headline-md text-on-surface">{m.valor}</span>
                      <span className="font-caption text-caption text-on-surface-variant">{m.rotulo}</span>
                    </Link>
                  ))}
                </div>
                {recentes.length === 0 ? (
                  <div className="flex flex-col items-start gap-space-sm">
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Você não tem demandas abertas. Publique uma para receber interessados.
                    </p>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-space-xs">
                    {recentes.map((d) => (
                      <li key={d.id}>
                        <Link
                          href="/demandas"
                          className="min-h-[44px] rounded-xl px-space-sm py-space-xs flex items-center justify-between gap-space-sm hover:bg-primary-fixed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <span className="flex flex-col min-w-0">
                            <span className="font-label-md text-label-md text-on-surface truncate">{d.especialidade_nome}</span>
                            <span className="font-caption text-caption text-on-surface-variant truncate">
                              {d.cidade}, {d.estado}
                            </span>
                          </span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant flex-shrink-0">
                            {d.interessados_count === 1 ? "1 interessado" : `${d.interessados_count} interessados`}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
            <Link
              href="/demandas/nova"
              className="self-start inline-flex items-center gap-1 h-11 px-space-md rounded-xl bg-primary text-on-primary neu-surface font-label-md text-label-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <MaterialIcon name="add" className="text-[18px]" />
              Publicar demanda
            </Link>
          </section>
        </div>

        <div className="flex flex-col gap-space-md">
          <section aria-labelledby="inicio-buscar" className={CARTAO}>
            <TituloDeBloco id="inicio-buscar">Procurando alguém?</TituloDeBloco>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Pesquise por especialidade, veja o perfil e quem tem registro conferido.
            </p>
            <Link
              href="/buscar"
              className="self-start inline-flex items-center gap-1 h-11 px-space-md rounded-xl bg-surface-container-high text-on-surface font-label-md text-label-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <MaterialIcon name="person_search" className="text-[18px]" />
              Buscar profissionais
            </Link>
          </section>

          <ConversasRecentes contatos={contatos} carregando={carregandoContatos} nomeDaOutraParte={nomeDaOutraParte} />
        </div>
      </div>
    </main>
  );
}
