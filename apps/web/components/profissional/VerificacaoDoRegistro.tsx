"use client";

import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { api } from "@/lib/api";
import type { VerificacaoPropria } from "@/lib/types";
import { podeSolicitarConferencia, textoRegistroConferido } from "@/lib/verificacao";

// Estado completo (pendente, irregular...) só aparece aqui, para o próprio profissional;
// o perfil público mostra apenas o selo de conferido.
export function VerificacaoDoRegistro({ registroInformado }: { registroInformado: boolean }) {
  const [estado, setEstado] = useState<VerificacaoPropria | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    api
      .getMinhaVerificacao()
      .then((r) => ativo && setEstado(r))
      .catch(() => ativo && setErro("Não foi possível carregar o estado da conferência."));
    return () => {
      ativo = false;
    };
  }, []);

  async function solicitar() {
    setEnviando(true);
    setErro(null);
    try {
      setEstado(await api.solicitarConferencia());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível pedir a conferência.");
    } finally {
      setEnviando(false);
    }
  }

  if (!estado) {
    return erro ? <p className="font-caption text-caption text-error">{erro}</p> : null;
  }

  const textos: Record<VerificacaoPropria["status"], string> = {
    unverified: "Seu registro ainda não foi conferido.",
    pending: "Conferência solicitada. Avisaremos o resultado aqui quando a análise terminar.",
    verified: textoRegistroConferido(estado.verificado_em),
    irregular: "A conferência não confirmou o registro informado. Revise o número e peça uma nova conferência.",
    unable_to_verify: "Não conseguimos concluir a conferência. Você pode pedir de novo.",
  };

  return (
    <div className="flex flex-col gap-space-xs border-t border-surface-container pt-space-xs">
      <p className="flex items-start gap-1 font-body-md text-body-md text-on-surface-variant">
        <MaterialIcon
          name={estado.status === "verified" ? "verified" : estado.status === "pending" ? "hourglass_top" : "info"}
          className="text-[18px] mt-0.5"
        />
        {textos[estado.status]}
      </p>
      {podeSolicitarConferencia(estado.status) &&
        (registroInformado ? (
          <button
            type="button"
            onClick={solicitar}
            disabled={enviando}
            className="self-start h-11 px-space-md rounded-full bg-primary text-on-primary font-label-sm text-label-sm disabled:opacity-60"
          >
            {enviando ? "Enviando..." : "Solicitar conferência"}
          </button>
        ) : (
          <p className="font-caption text-caption text-on-surface-variant">
            Informe o número do seu registro no cadastro para poder pedir a conferência.
          </p>
        ))}
      {erro && <p className="font-caption text-caption text-error">{erro}</p>}
    </div>
  );
}
