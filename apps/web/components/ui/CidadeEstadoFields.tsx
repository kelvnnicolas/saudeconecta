"use client";

import { useEffect, useState } from "react";
import { UFS, buscarMunicipios } from "@/lib/localidades";

const CLASSE_CAMPO = "h-12 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm disabled:opacity-60";

export function CidadeEstadoFields({
  estado,
  cidade,
  onChange,
  erro,
}: {
  estado: string;
  cidade: string;
  onChange: (campo: "estado" | "cidade", valor: string) => void;
  erro?: string;
}) {
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    if (!estado) {
      setMunicipios([]);
      return;
    }
    let ativo = true;
    setCarregando(true);
    setFalhou(false);
    buscarMunicipios(estado)
      .then((nomes) => {
        if (ativo) setMunicipios(nomes);
      })
      .catch(() => {
        if (ativo) setFalhou(true);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [estado]);

  function trocarEstado(novo: string) {
    onChange("estado", novo);
    onChange("cidade", "");
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-space-sm">
        <label className="w-24 flex flex-col gap-1">
          <span className="font-label-md text-label-md text-on-surface">UF</span>
          <select value={estado} onChange={(e) => trocarEstado(e.target.value)} className={CLASSE_CAMPO}>
            <option value="" disabled>UF</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
        </label>
        <label className="flex-1 flex flex-col gap-1">
          <span className="font-label-md text-label-md text-on-surface">Cidade</span>
          {falhou ? (
            <input
              value={cidade}
              onChange={(e) => onChange("cidade", e.target.value)}
              placeholder="Digite a cidade"
              className={CLASSE_CAMPO}
            />
          ) : (
            <select
              value={cidade}
              onChange={(e) => onChange("cidade", e.target.value)}
              disabled={!estado || carregando}
              className={CLASSE_CAMPO}
            >
              <option value="" disabled>
                {!estado ? "Escolha a UF primeiro" : carregando ? "Carregando cidades..." : "Selecione a cidade"}
              </option>
              {municipios.map((nome) => (
                <option key={nome} value={nome}>{nome}</option>
              ))}
            </select>
          )}
        </label>
      </div>
      {falhou && (
        <span className="font-caption text-caption text-on-surface-variant">
          Não foi possível carregar a lista de cidades agora. Digite o nome da cidade.
        </span>
      )}
      {erro && <span className="font-caption text-caption text-error">{erro}</span>}
    </div>
  );
}
