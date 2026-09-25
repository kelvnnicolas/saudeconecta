"use client";

import { BottomNav } from "@/components/ui/BottomNav";
import { StarRating } from "@/components/ui/StarRating";
import { Logo } from "@/components/ui/Logo";
import { MOCK_AVALIACOES } from "@/lib/mock-data";
import { useCurrentUser } from "@/lib/use-current-user";

export default function MinhasAvaliacoesPage() {
  const { profile } = useCurrentUser();
  // TODO(integração): api.listAvaliacoes(profile.id) — GET /avaliacoes?alvo_id=
  const avaliacoes = MOCK_AVALIACOES.filter((a) => a.alvo_id === profile.id);
  const media = avaliacoes.length
    ? avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length
    : null;

  return (
    <>
      <main className="flex-1 pt-space-md pb-24 px-gutter bg-surface min-h-screen flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Logo compact />
            <h1 className="font-headline-md text-headline-md text-on-surface">Minhas Avaliações</h1>
          </div>
          {media != null && (
            <span className="inline-flex items-center gap-1 font-label-md text-label-md text-on-surface">
              <StarRating nota={media} /> {media.toFixed(1)}
            </span>
          )}
        </div>

        {avaliacoes.length === 0 && (
          <p className="font-body-md text-body-md text-on-surface-variant text-center py-space-lg">
            Você ainda não recebeu avaliações.
          </p>
        )}

        <div className="flex flex-col gap-space-sm">
          {avaliacoes.map((a) => (
            <article key={a.id} className="bg-surface-container-lowest rounded-2xl neu-surface p-space-md flex flex-col gap-space-xs">
              <div className="flex items-center justify-between">
                <StarRating nota={a.nota} />
                <span className="font-caption text-caption text-outline">
                  {new Date(a.criado_em).toLocaleDateString("pt-BR")}
                </span>
              </div>
              {a.comentario && <p className="font-body-md text-body-md text-on-surface">&quot;{a.comentario}&quot;</p>}
            </article>
          ))}
        </div>
      </main>
      <BottomNav />
    </>
  );
}
