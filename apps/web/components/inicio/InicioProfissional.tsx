"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DemandCard } from "@/components/demandas/DemandCard";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { api } from "@/lib/api";
import { completudeDoPerfil } from "@/lib/completude-perfil";
import { useContatos } from "@/lib/use-contatos";
import { useCurrentUser } from "@/lib/use-current-user";
import { useNotificacoes } from "@/lib/use-notificacoes";
import type { DemandaRead, StatusVerificacao } from "@/lib/types";
import { Atencao, CARTAO, ConversasRecentes, TituloDeBloco } from "./Blocos";

/** Central de atividades do profissional: o que pede ação, onde há trabalho e como está o perfil. */
export function InicioProfissional() {
  const { session, profissional } = useCurrentUser();
  const { itens: notificacoes } = useNotificacoes();
  const { contatos, carregando: carregandoContatos, nomeDaOutraParte } = useContatos();
  const [oportunidades, setOportunidades] = useState<DemandaRead[] | null>(null);
  const [falhaOportunidades, setFalhaOportunidades] = useState(false);
  const [statusRegistro, setStatusRegistro] = useState<StatusVerificacao | null>(null);

  useEffect(() => {
    let ativo = true;
    api
      .oportunidades({ limit: 3 })
      .then((r) => ativo && setOportunidades(r.items))
      .catch(() => ativo && setFalhaOportunidades(true));
    api
      .getMinhaVerificacao()
      .then((r) => ativo && setStatusRegistro(r.status))
      .catch(() => {
        // sem o estado da conferência o item de registro só fica sem detalhe
      });
    return () => {
      ativo = false;
    };
  }, []);

  const meus = contatos.filter((c) => c.profissional_id === session?.user.id);
  const convites = meus.filter((c) => c.origem === "busca").length;
  const interesses = meus.filter((c) => c.origem === "demanda").length;
  const completude = profissional ? completudeDoPerfil(profissional, statusRegistro) : null;
  const primeiroNome = profissional?.nome.split(" ")[0];

  return (
    <main className="flex-1 pt-space-md pb-24 lg:pb-space-xl px-gutter bg-surface min-h-screen flex flex-col gap-space-md">
      <div>
        <h1 className="font-headline-md text-headline-md text-on-surface">
          {primeiroNome ? `Olá, ${primeiroNome}` : "Início"}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Suas oportunidades, propostas e conversas em um só lugar.
        </p>
      </div>

      <div className="grid gap-space-md lg:grid-cols-3 lg:items-start">
        <div className="flex flex-col gap-space-md lg:col-span-2">
          <Atencao notificacoes={notificacoes} tipos={["novo_contato", "nova_mensagem"]} />

          <section aria-labelledby="inicio-propostas" className={CARTAO}>
            <TituloDeBloco id="inicio-propostas" href="/propostas" rotuloLink="Ver propostas">
              Suas propostas
            </TituloDeBloco>
            <div className="grid grid-cols-2 gap-space-sm">
              <Link
                href="/propostas"
                className="min-h-[44px] rounded-xl p-space-sm bg-surface-container-high flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="font-headline-md text-headline-md text-on-surface">{carregandoContatos ? "–" : convites}</span>
                <span className="font-caption text-caption text-on-surface-variant">Convites recebidos</span>
              </Link>
              <Link
                href="/propostas"
                className="min-h-[44px] rounded-xl p-space-sm bg-surface-container-high flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="font-headline-md text-headline-md text-on-surface">{carregandoContatos ? "–" : interesses}</span>
                <span className="font-caption text-caption text-on-surface-variant">Interesses enviados</span>
              </Link>
            </div>
          </section>

          <section aria-labelledby="inicio-oportunidades" className="flex flex-col gap-space-sm">
            <TituloDeBloco id="inicio-oportunidades" href="/oportunidades" rotuloLink="Explorar oportunidades">
              Oportunidades para você
            </TituloDeBloco>
            {oportunidades === null && !falhaOportunidades && (
              <p className="font-caption text-caption text-on-surface-variant">Carregando...</p>
            )}
            {falhaOportunidades && (
              <p className="font-caption text-caption text-error bg-error-container rounded-lg p-space-sm">
                Não foi possível carregar as oportunidades agora.
              </p>
            )}
            {oportunidades?.length === 0 && (
              <p className="font-body-md text-body-md text-on-surface-variant">
                Nenhuma oportunidade compatível no momento.
              </p>
            )}
            {oportunidades?.map((d) => (
              <DemandCard
                key={d.id}
                demanda={d}
                headerTitle={d.empresa_nome}
                footer={
                  <Link
                    href="/oportunidades"
                    className="min-h-[44px] flex items-center font-label-md text-label-md text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg px-1"
                  >
                    Ver e demonstrar interesse
                  </Link>
                }
              />
            ))}
          </section>
        </div>

        <div className="flex flex-col gap-space-md">
          {completude && (
            <section aria-labelledby="inicio-perfil" className={CARTAO}>
              <TituloDeBloco id="inicio-perfil" href="/perfil" rotuloLink="Abrir perfil">
                Seu perfil
              </TituloDeBloco>
              <p className="font-caption text-caption text-on-surface-variant">
                {completude.feitos} de {completude.total} itens que ajudam empresas a confiar em você.
              </p>
              <ul className="flex flex-col gap-space-xs">
                {completude.itens.map((item) => {
                  const conteudo = (
                    <>
                      <MaterialIcon
                        name={item.ok ? "check_circle" : "radio_button_unchecked"}
                        filled={item.ok}
                        className={`text-[20px] ${item.ok ? "text-primary" : "text-outline"}`}
                      />
                      <span className="flex flex-col">
                        <span className="font-label-md text-label-md text-on-surface">{item.rotulo}</span>
                        {!item.ok && item.detalhe && (
                          <span className="font-caption text-caption text-on-surface-variant">{item.detalhe}</span>
                        )}
                      </span>
                    </>
                  );
                  return (
                    <li key={item.id}>
                      {!item.ok && item.href ? (
                        <Link
                          href={item.href}
                          className="min-h-[44px] flex items-center gap-space-sm rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          {conteudo}
                        </Link>
                      ) : (
                        <div className="min-h-[36px] flex items-center gap-space-sm">{conteudo}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <ConversasRecentes contatos={contatos} carregando={carregandoContatos} nomeDaOutraParte={nomeDaOutraParte} />
        </div>
      </div>
    </main>
  );
}
