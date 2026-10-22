"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BottomNav } from "@/components/ui/BottomNav";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { Logo } from "@/components/ui/Logo";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { Etiqueta, LinhaAjusteLink, LinhaInfo, TituloSecao } from "@/components/ui/Linhas";
import { useCurrentUser } from "@/lib/use-current-user";
import { api } from "@/lib/api";
import type { TipoEmpresa } from "@/lib/types";

const NOME_TIPO_EMPRESA: Record<TipoEmpresa, string> = {
  clinica: "Clínica",
  hospital: "Hospital",
  homecare: "Home care",
  pessoa_fisica: "Pessoa física ou família",
};

const cartao = "overflow-hidden bg-surface-container-lowest rounded-2xl neu-surface p-space-md flex flex-col gap-space-sm";

export default function MeuPerfilPage() {
  const { session, profissional, empresa, refresh } = useCurrentUser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [enviandoAvatar, setEnviandoAvatar] = useState(false);
  const [erroAvatar, setErroAvatar] = useState<string | null>(null);

  // Nome/avatar/localização vêm de profissional ou empresa (o que estiver
  // carregado) — não existe um "GET /profiles/me" genérico, ver
  // lib/use-current-user.ts.
  const nome = profissional?.nome ?? empresa?.nome ?? session?.user.email ?? "";
  const avatarUrl = profissional?.avatar_url ?? empresa?.avatar_url ?? null;
  const cidade = profissional?.cidade ?? empresa?.cidade ?? null;
  const estado = profissional?.estado ?? empresa?.estado ?? null;
  const localizacao = [cidade, estado].filter(Boolean).join(", ");
  const subtitulo = profissional
    ? profissional.especialidades[0]?.nome ?? "Profissional de saúde"
    : empresa
      ? NOME_TIPO_EMPRESA[empresa.tipo]
      : null;

  async function onAvatarSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnviandoAvatar(true);
    setErroAvatar(null);
    try {
      await api.uploadAvatar(file);
      await refresh();
    } catch (err) {
      setErroAvatar(err instanceof Error ? err.message : "Não foi possível enviar a foto.");
    } finally {
      setEnviandoAvatar(false);
    }
  }

  return (
    <>
      <main className="flex-1 pt-space-md pb-28 px-gutter bg-surface min-h-screen">
        <div className="max-w-2xl w-full mx-auto flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Logo compact />
              <h1 className="font-headline-md text-headline-md text-on-surface">Meu Perfil</h1>
            </div>
            <div className="flex items-center gap-space-xs">
              <NotificationBell />
              <Link
                href="/perfil/configuracoes"
                aria-label="Configurações"
                title="Configurações"
                className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant neu-surface-sm neu-pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <MaterialIcon name="settings" />
              </Link>
            </div>
          </div>

          {/* Cartão do topo: quem eu sou */}
          <section aria-label="Resumo do perfil" className="bg-surface-container-lowest rounded-3xl neu-surface px-space-md pt-space-lg pb-space-md flex flex-col items-center gap-space-sm text-center">
            <div className="relative">
              <div className="p-1.5 rounded-full neu-surface">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="" width={128} height={128} className="w-28 h-28 rounded-full object-cover" />
                ) : (
                  <div className="w-28 h-28 rounded-full neu-inset flex items-center justify-center bg-primary/[0.06] text-primary">
                    <span className="font-headline-lg text-headline-lg" aria-hidden="true">
                      {nome.trim().charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label={avatarUrl ? "Trocar foto" : "Adicionar foto"}
                className="absolute bottom-1 right-1 w-10 h-10 rounded-full btn-accent-neu flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <MaterialIcon name={enviandoAvatar ? "progress_activity" : "photo_camera"} className={`text-[18px] ${enviandoAvatar ? "animate-spin" : ""}`} />
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatarSelecionado} />

            <div className="flex flex-col items-center gap-1">
              <p className="font-headline-md text-headline-md text-on-surface tracking-tight">{nome}</p>
              {subtitulo && <p className="font-body-md text-body-md text-on-surface-variant">{subtitulo}</p>}
            </div>

            {profissional?.verificado && (
              <span className="inline-flex items-center gap-1 px-space-sm py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm">
                <span aria-hidden="true" className="flex">
                  <MaterialIcon name="verified" filled className="text-[16px]" />
                </span>
                Registro conferido
              </span>
            )}

            <div className="flex flex-wrap justify-center gap-x-space-md gap-y-1 font-body-md text-body-md text-on-surface-variant">
              <span className="inline-flex items-center gap-1 min-w-0">
                <span aria-hidden="true" className="flex">
                  <MaterialIcon name="mail" className="text-[16px]" />
                </span>
                <span className="truncate">{session?.user.email}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span aria-hidden="true" className="flex">
                  <MaterialIcon name="location_on" className="text-[16px]" />
                </span>
                {localizacao || "Localização não informada"}
              </span>
            </div>

            {erroAvatar && (
              <p role="alert" className="font-caption text-caption text-error">
                {erroAvatar}
              </p>
            )}

            {/* A tela de edição chega na fase 3 do F-035; até lá o botão fica visível, mas indisponível. */}
            <button
              type="button"
              disabled
              aria-describedby="edicao-em-breve"
              className="mt-space-xs w-full sm:w-auto sm:min-w-[240px] h-12 px-space-lg rounded-full btn-accent-neu inline-flex items-center justify-center gap-space-xs font-label-md text-label-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span aria-hidden="true" className="flex">
                <MaterialIcon name="edit" className="text-[18px]" />
              </span>
              Editar perfil
            </button>
            <span id="edicao-em-breve" className="-mt-1 font-caption text-caption text-on-surface-variant">
              Em breve
            </span>
          </section>

          {profissional && (
            <>
              <section aria-labelledby="titulo-sobre" className={cartao}>
                <TituloSecao icone="person" id="titulo-sobre">
                  Sobre
                </TituloSecao>
                {profissional.bio ? (
                  <p className="font-body-lg text-body-lg text-on-surface whitespace-pre-line">{profissional.bio}</p>
                ) : (
                  <div className="flex items-start gap-space-sm rounded-xl bg-primary/[0.06] p-space-sm">
                    <span aria-hidden="true" className="flex text-primary mt-0.5">
                      <MaterialIcon name="edit_note" className="text-[22px]" />
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <p className="font-label-md text-label-md text-on-surface">Conte quem você é</p>
                      <p className="font-body-md text-body-md text-on-surface-variant">
                        Em poucas linhas, sua experiência e como você atende. É a primeira coisa que as empresas leem no seu perfil.
                      </p>
                    </div>
                  </div>
                )}
              </section>

              <section aria-labelledby="titulo-dados-prof" className={cartao}>
                <TituloSecao icone="medical_services" id="titulo-dados-prof">
                  Dados profissionais
                </TituloSecao>
                <div className="flex flex-col">
                  <LinhaInfo icone="badge" rotulo="Registro">
                    {profissional.registro_profissional ?? <span className="text-on-surface-variant">Não informado</span>}
                  </LinhaInfo>
                  <LinhaInfo icone="payments" rotulo="Valor por hora">
                    {profissional.preco_hora != null ? (
                      <>
                        R$ {profissional.preco_hora}
                        <span className="font-body-md text-body-md text-on-surface-variant"> /hora</span>
                      </>
                    ) : (
                      "A combinar"
                    )}
                  </LinhaInfo>
                  <LinhaInfo icone="stethoscope" rotulo="Especialidades">
                    {profissional.especialidades.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-space-xs">
                        {profissional.especialidades.map((e) => (
                          <Etiqueta key={e.id}>{e.nome}</Etiqueta>
                        ))}
                      </div>
                    ) : (
                      <span className="text-on-surface-variant">Nenhuma escolhida</span>
                    )}
                  </LinhaInfo>
                </div>
                <div className="-mx-space-md -mb-space-md border-t border-outline-variant/60">
                  <LinhaAjusteLink href={`/profissional/${profissional.user_id}`} icone="visibility" nome="Ver meu perfil público" />
                </div>
              </section>
            </>
          )}

          {empresa && (
            <section aria-labelledby="titulo-dados-empresa" className={cartao}>
              <TituloSecao icone="apartment" id="titulo-dados-empresa">
                Dados da empresa
              </TituloSecao>
              <div className="flex flex-col">
                <LinhaInfo icone="storefront" rotulo="Nome fantasia">
                  {empresa.nome_fantasia}
                </LinhaInfo>
                <LinhaInfo icone="category" rotulo="Tipo">
                  {NOME_TIPO_EMPRESA[empresa.tipo]}
                </LinhaInfo>
              </div>
              <div className="-mx-space-md -mb-space-md border-t border-outline-variant/60">
                <LinhaAjusteLink href="/assinatura" icone="workspace_premium" nome="Minha assinatura" />
              </div>
            </section>
          )}

          {!profissional && !empresa && (
            <section className="rounded-2xl p-space-md bg-secondary-container/40 border border-secondary-container flex items-start gap-space-xs">
              <MaterialIcon name="info" className="text-[18px] text-on-secondary-container mt-0.5" />
              <p className="font-caption text-caption text-on-secondary-container">
                Não conseguimos carregar os dados do seu perfil. Saia e entre novamente; se o problema
                continuar, conclua o cadastro para liberar todas as telas.
              </p>
            </section>
          )}
        </div>
      </main>
      <BottomNav />
    </>
  );
}
