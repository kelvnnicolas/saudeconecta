"use client";

import { useState } from "react";
import { Header } from "@/components/ui/Header";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { MOCK_PLANOS } from "@/lib/mock-data";
import { api, ApiError } from "@/lib/api";

// Corrigido em relação ao mockup original do Stitch (checkout_corporativo_b2b):
// removido formulário próprio de cartão/CVV/boleto/pix, "múltiplos logins" e
// "contrato gerado" — sem suporte no backend. O fluxo real é: escolher o plano,
// chamar POST /assinaturas/checkout e redirecionar para o checkout_url (Stripe
// Checkout hospedado). Preço e benefícios abaixo são texto fixo do frontend —
// PlanoRead não devolve isso hoje (ver MANIFEST).
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
  const [selecionado, setSelecionado] = useState(MOCK_PLANOS[1]?.codigo ?? MOCK_PLANOS[0]?.codigo);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function assinar() {
    if (!selecionado) return;
    setCarregando(true);
    setErro(null);
    try {
      const { checkout_url } = await api.iniciarCheckout(selecionado);
      window.location.href = checkout_url;
    } catch (e) {
      setErro(
        e instanceof ApiError
          ? `Não foi possível iniciar o checkout (${e.code ?? e.message}).`
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

        <div className="flex flex-col gap-space-sm">
          {MOCK_PLANOS.map((plano) => {
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
          disabled={!selecionado || carregando}
          className="w-full h-12 rounded-xl neu-surface neu-pressable bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-space-xs neu-surface disabled:opacity-60"
        >
          <MaterialIcon name="assignment_turned_in" className="text-[20px]" />
          {carregando ? "Redirecionando..." : "Assinar plano"}
        </button>
      </main>
    </>
  );
}
