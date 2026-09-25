"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { StarRating } from "@/components/ui/StarRating";
import { MOCK_AVALIACOES, MOCK_PROFISSIONAL_DETAIL } from "@/lib/mock-data";

// TODO(integração): api.getProfissional(params.id) + api.listAvaliacoes(params.id)
// em paralelo (Promise.all), com loading.tsx cobrindo o Suspense. Por ora sempre
// mostra o profissional de exemplo, independente do :id na URL.
export default function PerfilPublicoProfissionalPage({ params }: { params: { id: string } }) {
  const profissional = MOCK_PROFISSIONAL_DETAIL;
  const avaliacoes = MOCK_AVALIACOES;
  const notaMedia = avaliacoes.length
    ? avaliacoes.reduce((soma, a) => soma + a.nota, 0) / avaliacoes.length
    : null;
  const [favorito, setFavorito] = useState(false);

  return (
    <>
      <Header
        title="Perfil do Profissional"
        backHref="/buscar"
        action={{
          icon: favorito ? "favorite" : "favorite_border",
          label: "Favoritar",
          onClick: () => setFavorito((v) => !v),
        }}
      />
      <main className="flex-1 pt-16 pb-32 bg-surface min-h-screen">
        <section className="w-full bg-gradient-to-b from-primary-fixed to-surface px-gutter pt-space-lg pb-space-md flex flex-col items-center text-center gap-space-sm">
          <div className="relative">
            {profissional.avatar_url ? (
              <Image
                src={profissional.avatar_url}
                alt={profissional.nome}
                width={96}
                height={96}
                className="w-24 h-24 rounded-full object-cover neu-surface-sm border-4 border-surface-container-lowest"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant border-4 border-surface-container-lowest">
                <MaterialIcon name="person" className="text-[40px]" />
              </div>
            )}
            {profissional.verificado && (
              <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center border-2 border-surface-container-lowest">
                <MaterialIcon name="verified" filled className="text-[18px] text-on-secondary-container" />
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight">{profissional.nome}</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {profissional.especialidades.map((e) => e.nome).join(", ")}
              {profissional.registro_profissional ? ` · ${profissional.registro_profissional}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-space-sm flex-wrap justify-center">
            {notaMedia != null && (
              <span className="inline-flex items-center gap-1 px-space-sm py-1 rounded-full bg-surface-container-lowest neu-surface font-label-sm text-label-sm text-on-surface">
                <StarRating nota={notaMedia} />
                {notaMedia.toFixed(1)} <span className="text-on-surface-variant font-normal">({avaliacoes.length} avaliações)</span>
              </span>
            )}
            {(profissional.cidade || profissional.estado) && (
              <span className="inline-flex items-center gap-1 px-space-sm py-1 rounded-full bg-surface-container-lowest neu-surface font-label-sm text-label-sm text-on-surface-variant">
                <MaterialIcon name="location_on" className="text-[16px]" />
                {[profissional.cidade, profissional.estado].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
        </section>

        <div className="flex flex-col w-full px-gutter pb-space-lg gap-space-md -mt-space-xs">
          <section className="bg-surface-container-lowest rounded-2xl neu-surface p-space-md flex flex-col gap-space-sm">
            <div className="flex items-center gap-space-xs">
              <MaterialIcon name="medical_services" className="text-primary text-[20px]" />
              <h2 className="font-title-md text-title-md text-on-surface">Especialidades</h2>
            </div>
            <div className="flex flex-wrap gap-space-xs">
              {profissional.especialidades.map((e) => (
                <span key={e.id} className="px-space-sm py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                  {e.nome}
                </span>
              ))}
            </div>
          </section>

          {profissional.bio && (
            <section className="bg-surface-container-lowest rounded-2xl neu-surface p-space-md flex flex-col gap-space-sm">
              <div className="flex items-center gap-space-xs">
                <MaterialIcon name="person" className="text-primary text-[20px]" />
                <h2 className="font-title-md text-title-md text-on-surface">Sobre</h2>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant">{profissional.bio}</p>
            </section>
          )}

          <section className="bg-surface-container-lowest rounded-2xl neu-surface p-space-md flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-caption text-caption text-on-surface-variant">Valor base</span>
              <span className="font-headline-md text-headline-md text-on-surface">
                {profissional.preco_hora != null ? `R$ ${profissional.preco_hora}` : "A combinar"}
                {profissional.preco_hora != null && <span className="font-body-md text-body-md text-on-surface-variant"> /hora</span>}
              </span>
            </div>
            {profissional.verificado && (
              <span className="inline-flex items-center gap-1 px-space-sm py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm">
                <MaterialIcon name="check_circle" className="text-[14px]" />
                Verificado
              </span>
            )}
          </section>

          <section className="flex flex-col gap-space-sm">
            <h2 className="font-title-md text-title-md text-on-surface">Avaliações</h2>
            {avaliacoes.length === 0 && (
              <p className="font-body-md text-body-md text-on-surface-variant">Ainda sem avaliações.</p>
            )}
            {avaliacoes.map((a) => (
              <article key={a.id} className="bg-surface-container-lowest rounded-2xl neu-surface p-space-md flex flex-col gap-space-xs">
                <div className="flex items-center justify-between">
                  <StarRating nota={a.nota} />
                  <span className="font-caption text-caption text-outline">
                    {new Date(a.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
                {a.comentario && <p className="font-body-md text-body-md text-on-surface">&quot;{a.comentario}&quot;</p>}
                {/* GET /avaliacoes devolve autor_id, não o nome — rótulo genérico até o backend enriquecer. */}
                <p className="font-caption text-caption text-on-surface-variant">Contratante verificado</p>
              </article>
            ))}
          </section>
        </div>
      </main>
      <div className="fixed bottom-0 w-full z-50 pb-safe bg-surface/95 backdrop-blur-xl shadow-[0_-2px_12px_rgba(0,0,0,0.06)] px-gutter py-space-sm">
        <Link
          href={`/contato/novo?profissional_id=${profissional.user_id}&nome=${encodeURIComponent(profissional.nome)}`}
          className="w-full h-12 rounded-xl neu-surface neu-pressable bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-space-xs neu-surface active:scale-[0.98] transition-transform"
        >
          <MaterialIcon name="chat" className="text-[20px]" />
          Entrar em contato
        </Link>
      </div>
    </>
  );
}
