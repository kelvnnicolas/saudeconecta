"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { PaginaEsqueleto } from "@/components/ui/Skeleton";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { AvisoLimite } from "@/components/ui/AvisoLimite";
import { estadoDaCota } from "@/lib/use-uso-mensal";
import { assinaturaStatusLabel } from "@/components/ui/StatusBadge";
import { api, ApiError } from "@/lib/api";
import type { MinhaAssinaturaResponse } from "@/lib/types";

export default function MinhaAssinaturaPage() {
  const [assinatura, setAssinatura] = useState<MinhaAssinaturaResponse | null>(null);
  const [carregandoAssinatura, setCarregandoAssinatura] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .minhaAssinatura()
      .then(setAssinatura)
      .catch((e) => setErro(e instanceof Error ? e.message : "Não foi possível carregar a assinatura."))
      .finally(() => setCarregandoAssinatura(false));
  }, []);

  async function gerenciar() {
    setCarregando(true);
    setErro(null);
    try {
      const { portal_url } = await api.abrirPortal();
      window.location.href = portal_url;
    } catch (e) {
      // e.message já é a frase amigável do backend quando existe (ver ApiError em lib/api.ts).
      setErro(
        e instanceof ApiError
          ? e.message
          : "Backend indisponível — em modo de exemplo, o Portal do Stripe abriria aqui.",
      );
    } finally {
      setCarregando(false);
    }
  }

  if (carregandoAssinatura) {
    return (
      <>
        <Header title="Minha Assinatura" backHref="/perfil" />
        <main className="flex-1 pt-20 px-gutter pb-space-lg bg-surface min-h-screen">
          <PaginaEsqueleto comTitulo={false} />
        </main>
      </>
    );
  }

  if (erro && !assinatura) {
    return (
      <>
        <Header title="Minha Assinatura" backHref="/perfil" />
        <main className="flex-1 pt-16 px-gutter bg-surface min-h-screen flex flex-col items-center justify-center gap-space-sm text-center">
          <MaterialIcon name="error" className="text-[32px] text-error" />
          <p className="font-body-md text-body-md text-on-surface-variant">{erro}</p>
        </main>
      </>
    );
  }

  if (!assinatura) return null;

  const plano = assinatura.plano;
  const statusInfo = assinatura.status ? assinaturaStatusLabel(assinatura.status) : null;
  const percentualUso =
    assinatura.uso.limite != null ? Math.min(100, (assinatura.uso.usado / assinatura.uso.limite) * 100) : 35;

  return (
    <>
      <Header title="Minha Assinatura" backHref="/perfil" />
      <main className="flex-1 pt-16 pb-space-xl px-gutter bg-surface min-h-screen flex flex-col gap-space-md mt-space-sm">
        <section className="rounded-2xl p-space-md neu-surface bg-gradient-to-br from-primary to-primary-container text-on-primary flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wide opacity-80">Plano atual</span>
            {statusInfo && (
              <span className="inline-flex items-center gap-1 px-space-sm py-1 rounded-full bg-white/15 font-label-sm text-label-sm">
                <span className="w-2 h-2 rounded-full bg-secondary-fixed" />
                {statusInfo.label}
              </span>
            )}
          </div>
          <span className="font-headline-lg text-headline-lg">{plano?.nome ?? "Gratuito"}</span>
          {assinatura.current_period_end && (
            <span className="font-body-md text-body-md opacity-90">
              Renova em {new Date(assinatura.current_period_end).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </span>
          )}
        </section>

        {assinatura.cancel_at_period_end && (
          <section className="rounded-xl p-space-sm bg-error-container flex items-start gap-space-xs">
            <MaterialIcon name="warning" className="text-on-error-container text-[20px]" />
            <p className="font-body-md text-body-md text-on-error-container">
              Sua assinatura será cancelada ao final do período atual e não será renovada.
            </p>
          </section>
        )}

        <section className="bg-surface-container-lowest rounded-2xl neu-surface p-space-md flex flex-col gap-space-sm">
          <div className="flex items-center gap-space-xs">
            <MaterialIcon name="assignment" className="text-primary text-[20px]" />
            <h2 className="font-title-md text-title-md text-on-surface">Uso do plano</h2>
          </div>
          <div className="flex items-center justify-between font-body-md text-body-md text-on-surface">
            <span>Contatos e demandas no mês</span>
            <span className="font-semibold">
              {assinatura.uso.usado} de {assinatura.uso.limite ?? "ilimitado"}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${percentualUso}%` }} />
          </div>
        </section>

        {estadoDaCota(assinatura.uso) === "esgotada" && (
          <AvisoLimite uso={assinatura.uso} plano={plano} contexto="geral" />
        )}

        {plano && (
          <section className="bg-surface-container-lowest rounded-2xl neu-surface p-space-md flex flex-col gap-space-sm">
            <div className="flex items-center gap-space-xs">
              <MaterialIcon name="credit_card" className="text-primary text-[20px]" />
              <h2 className="font-title-md text-title-md text-on-surface">Pagamento e faturas</h2>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Trocar cartão, baixar faturas ou cancelar a assinatura é feito no portal seguro do Stripe.
            </p>
            {erro && <p className="font-caption text-caption text-error">{erro}</p>}
            <button
              onClick={gerenciar}
              disabled={carregando}
              className="w-full h-12 rounded-xl neu-surface neu-pressable bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-space-xs neu-surface disabled:opacity-60"
            >
              <MaterialIcon name="open_in_new" className="text-[20px]" />
              {carregando ? "Abrindo..." : "Gerenciar assinatura"}
            </button>
          </section>
        )}

        <Link href="/empresa/planos" className="text-center font-label-md text-label-md text-primary">
          {plano ? "Ver outros planos" : "Ver planos"}
        </Link>
      </main>
    </>
  );
}
