"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/ui/Header";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { api, ApiError } from "@/lib/api";
import type { PlanoRead } from "@/lib/types";

// Corrigido em relação ao mockup original do Stitch (checkout_corporativo_b2b):
// removido formulário próprio de cartão/CVV/boleto/pix, "múltiplos logins" e
// "contrato gerado" — sem suporte no backend. O fluxo real é: escolher o plano,
// chamar POST /assinaturas/checkout e redirecionar para o checkout_url (Stripe
// Checkout hospedado). Lista de planos (codigo/nome/limite) vem de GET /planos;
// preço e benefícios abaixo continuam texto fixo — PlanoRead não devolve isso
// hoje (ver MANIFEST).
const BENEFICIOS: Record<string, { preco: string; itens: string[]; destaque?: boolean }> = {
  essencial: {
    preco: "R$ 249/mês",
    itens: [
      "50 desbloqueios de contatos diretos/mês",
      "Filtros por especialidade e registro ativo",
      "1 usuário recrutador",
    ],
  },
  pro: {
    preco: "R$ 590/mês",
    itens: [
      "Desbloqueios ilimitados de profissionais",
      "Triagem automática por especialidade e cidade",
      "Demandas ativas ilimitadas",
    ],
    destaque: true,
  },
};

export default function PlanosEmpresaPage() {
  const [planos, setPlanos] = useState<PlanoRead[]>([]);
  const [carregandoPlanos, setCarregandoPlanos] = useState(true);
  const [selecionado, setSelecionado] = useState<string | undefined>();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .listPlanos()
      .then((lista) => {
        setPlanos(lista);
        setSelecionado((atual) => atual ?? lista[lista.length - 1]?.codigo ?? lista[0]?.codigo);
      })
      .catch((e) => setErro(e instanceof Error ? e.message : "Não foi possível carregar os planos."))
      .finally(() => setCarregandoPlanos(false));
  }, []);

  async function assinar() {
    if (!selecionado) return;
    setCarregando(true);
    setErro(null);
    try {
      const { checkout_url } = await api.iniciarCheckout(selecionado);
      window.location.href = checkout_url;
    } catch (e) {
      // e.message já é a frase amigável do backend quando existe (ver
      // ApiError em lib/api.ts) — usar e.code aqui mostrava o código cru
      // ("nao_elegivel") pro usuário em vez da explicação.
      setErro(
        e instanceof ApiError
          ? e.message
          : "Backend indisponível — em modo de exemplo, o redirecionamento para o Stripe aconteceria aqui.",
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <Header title="Planos B2B" backHref="/buscar" />
      <main className="flex-1 pt-16 pb-space-xl px-gutter bg-surface min-h-screen flex flex-col gap-space-md">
        <section className="flex flex-col gap-1 mt-space-sm">
          <h1 className="font-headline-md text-headline-md text-on-surface">Banco de Talentos Clínicos</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Assine para publicar demandas e acessar profissionais verificados.
          </p>
        </section>

        {carregandoPlanos && (
          <div className="flex justify-center py-space-lg">
            <MaterialIcon name="progress_activity" className="text-[28px] text-primary animate-spin" />
          </div>
        )}

        <div className="flex flex-col gap-space-sm">
          {planos.map((plano) => {
            const info = BENEFICIOS[plano.codigo];
            const ativo = selecionado === plano.codigo;
            return (
              <button
                key={plano.codigo}
                onClick={() => setSelecionado(plano.codigo)}
                className={`text-left rounded-2xl p-space-md neu-surface border-2 transition-colors flex flex-col gap-space-sm ${
                  ativo ? "border-primary bg-surface-container-lowest" : "border-transparent bg-surface-container-lowest"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-title-md text-title-md text-on-surface">{plano.nome}</span>
                  <MaterialIcon
                    name={ativo ? "radio_button_checked" : "radio_button_unchecked"}
                    className={ativo ? "text-primary" : "text-outline"}
                  />
                </div>
                <span className="font-headline-md text-headline-md text-on-surface">{info?.preco}</span>
                <ul className="flex flex-col gap-1">
                  {info?.itens.map((item) => (
                    <li key={item} className="flex items-center gap-1 font-body-md text-body-md text-on-surface-variant">
                      <MaterialIcon name="check_circle" className="text-[16px] text-secondary" />
                      {item}
                    </li>
                  ))}
                </ul>
                <span className="font-caption text-caption text-on-surface-variant">
                  {plano.limite_demandas_ativas != null
                    ? `Limite de ${plano.limite_demandas_ativas} demandas ativas`
                    : "Demandas ativas ilimitadas"}
                </span>
              </button>
            );
          })}
        </div>

        <section className="rounded-xl bg-surface-container-low p-space-sm flex items-start gap-space-xs">
          <MaterialIcon name="lock" className="text-[18px] text-on-surface-variant" />
          <p className="font-caption text-caption text-on-surface-variant">
            Pagamento processado inteiramente pelo Stripe Checkout — o SaúdeConecta
            nunca recebe ou armazena dados de cartão.
          </p>
        </section>

        {erro && (
          <p className="font-body-md text-body-md text-error bg-error-container rounded-xl p-space-sm">{erro}</p>
        )}

        <button
          onClick={assinar}
          disabled={!selecionado || carregando || carregandoPlanos}
          className="w-full h-12 rounded-xl neu-surface neu-pressable bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-space-xs neu-surface disabled:opacity-60"
        >
          <MaterialIcon name="assignment_turned_in" className="text-[20px]" />
          {carregando ? "Redirecionando..." : "Assinar plano"}
        </button>
      </main>
    </>
  );
}
