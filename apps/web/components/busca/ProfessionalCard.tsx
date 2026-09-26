import Image from "next/image";
import Link from "next/link";
import type { ProfissionalSearchResult } from "@/lib/types";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { StarRating } from "@/components/ui/StarRating";

// Só usa campos que GET /profissionais de fato devolve (ProfissionalSearchResult).
// Removido de propósito, em relação ao mockup original: registro profissional,
// distância em km e "Disponível hoje" — nenhum desses vem da API hoje. Ver
// docs/design/telas/MANIFEST.md.
export function ProfessionalCard({ profissional }: { profissional: ProfissionalSearchResult }) {
  return (
    <Link
      href={`/profissional/${profissional.user_id}`}
      className="group bg-surface-container-lowest rounded-2xl p-space-md neu-surface neu-pressable transition-all active:scale-[0.99] flex flex-col gap-space-sm"
    >
      <div className="flex items-start gap-space-md">
        <div className="relative flex-shrink-0">
          {profissional.avatar_url ? (
            <Image
              src={profissional.avatar_url}
              alt={profissional.nome}
              width={56}
              height={56}
              className="w-14 h-14 rounded-full object-cover bg-surface-variant"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
              <MaterialIcon name="person" />
            </div>
          )}
          {profissional.verificado && (
            <span
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-secondary-container flex items-center justify-center border-2 border-surface-container-lowest"
              title="Verificado"
            >
              <MaterialIcon name="verified" filled className="text-[12px] text-on-secondary-container" />
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <h3 className="font-title-md text-title-md text-on-surface truncate group-hover:text-primary transition-colors">
            {profissional.nome}
          </h3>
          {profissional.bio && (
            <p className="font-label-sm text-label-sm text-on-surface-variant line-clamp-1">
              {profissional.bio}
            </p>
          )}
          <div className="flex items-center gap-space-sm flex-wrap">
            {profissional.nota_media != null && (
              <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-on-surface">
                <StarRating nota={profissional.nota_media} />
                {profissional.nota_media.toFixed(1)}
              </span>
            )}
            {(profissional.cidade || profissional.estado) && (
              <span className="inline-flex items-center gap-1 font-caption text-caption text-on-surface-variant">
                <MaterialIcon name="near_me" className="text-[14px]" />
                {[profissional.cidade, profissional.estado].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between pt-space-xs border-t border-outline-variant/30">
        <div className="flex flex-col">
          <span className="font-caption text-caption text-on-surface-variant">Valor base</span>
          <span className="font-title-md text-title-md text-on-surface">
            {profissional.preco_hora != null ? `R$ ${profissional.preco_hora}` : "A combinar"}
            {profissional.preco_hora != null && (
              <span className="font-body-md text-body-md text-on-surface-variant"> /hora</span>
            )}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 px-space-md h-10 rounded-xl bg-primary-fixed text-on-primary-fixed-variant group-hover:bg-primary group-hover:text-on-primary transition-colors font-label-md text-label-md">
          Ver perfil
        </span>
      </div>
    </Link>
  );
}
