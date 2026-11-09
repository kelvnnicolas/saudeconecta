"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { VerificacaoAdminItem } from "@/lib/types";

type Resultado = "verified" | "irregular" | "unable_to_verify";

const OPCOES: { valor: Resultado; rotulo: string }[] = [
  { valor: "verified", rotulo: "Registro conferido" },
  { valor: "irregular", rotulo: "Registro irregular" },
  { valor: "unable_to_verify", rotulo: "Não foi possível conferir" },
];

const CAMPO =
  "h-11 w-full rounded-xl bg-surface-container-lowest px-space-sm text-on-surface neu-surface focus:outline-none focus:ring-2 focus:ring-primary-container";

// Só campos estruturados: a trilha não guarda texto livre (decisão 28 do STATUS.md).
export function FormularioConferencia({
  item,
  aoConcluir,
}: {
  item: VerificacaoAdminItem;
  aoConcluir: () => void;
}) {
  const [status, setStatus] = useState<Resultado>("verified");
  const [conselho, setConselho] = useState("");
  const [uf, setUf] = useState(item.estado ?? "");
  const [numero, setNumero] = useState("");
  const [fonte, setFonte] = useState("");
  const [data, setData] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const conferido = status === "verified";

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      await api.adminRegistrarConferencia(item.user_id, {
        status,
        fonte: fonte.trim(),
        ...(conselho.trim() ? { conselho: conselho.trim() } : {}),
        ...(uf.trim() ? { uf: uf.trim() } : {}),
        ...(numero.trim() ? { numero_registro: numero.trim() } : {}),
        ...(data ? { verificado_em: data } : {}),
      });
      aoConcluir();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível registrar o resultado.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-space-sm border-t border-surface-container pt-space-sm">
      <p className="font-caption text-caption text-on-surface-variant">
        Registro informado pelo profissional: {item.registro_informado ?? "nenhum"}. Confira numa fonte
        oficial e registre o resultado.
      </p>
      <fieldset className="flex flex-col gap-1">
        <legend className="font-label-sm text-label-sm text-on-surface mb-1">Resultado</legend>
        {OPCOES.map((o) => (
          <label key={o.valor} className="flex items-center gap-space-xs min-h-[44px] font-body-md text-body-md text-on-surface">
            <input type="radio" name={`resultado-${item.user_id}`} checked={status === o.valor} onChange={() => setStatus(o.valor)} />
            {o.rotulo}
          </label>
        ))}
      </fieldset>
      <div className="grid grid-cols-2 gap-space-sm">
        <label className="flex flex-col gap-1 font-label-sm text-label-sm text-on-surface">
          Conselho{conferido && " *"}
          <input className={CAMPO} value={conselho} onChange={(e) => setConselho(e.target.value)} placeholder="COREN" maxLength={20} required={conferido} />
        </label>
        <label className="flex flex-col gap-1 font-label-sm text-label-sm text-on-surface">
          UF{conferido && " *"}
          <input className={CAMPO} value={uf} onChange={(e) => setUf(e.target.value)} placeholder="SC" maxLength={2} required={conferido} />
        </label>
      </div>
      <label className="flex flex-col gap-1 font-label-sm text-label-sm text-on-surface">
        Número do registro{conferido && " *"}
        <input className={CAMPO} value={numero} onChange={(e) => setNumero(e.target.value)} maxLength={40} required={conferido} />
      </label>
      <label className="flex flex-col gap-1 font-label-sm text-label-sm text-on-surface">
        Fonte consultada *
        <input className={CAMPO} value={fonte} onChange={(e) => setFonte(e.target.value)} placeholder="Ex.: consulta pública do conselho" minLength={3} maxLength={255} required />
      </label>
      <label className="flex flex-col gap-1 font-label-sm text-label-sm text-on-surface">
        Data da conferência (opcional, hoje se vazio)
        <input type="date" className={CAMPO} value={data} onChange={(e) => setData(e.target.value)} />
      </label>
      {erro && <p role="alert" className="font-caption text-caption text-error">{erro}</p>}
      <button
        type="submit"
        disabled={enviando}
        className="self-start h-11 px-space-md rounded-full bg-primary text-on-primary font-label-sm text-label-sm disabled:opacity-60"
      >
        {enviando ? "Salvando..." : "Registrar resultado"}
      </button>
    </form>
  );
}
