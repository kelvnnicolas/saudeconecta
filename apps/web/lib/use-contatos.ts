"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { falhaAoCarregar } from "./mensagens";
import type { ContatoRead } from "./types";
import { useCurrentUser } from "./use-current-user";

/**
 * Contatos da pessoa logada, com o nome da outra parte. `ContatoRead` só traz os UUIDs
 * (solicitante_id e profissional_id) e não há endpoint em lote, então o nome vem de uma busca
 * por perfil único conforme a lista chega. Usado por Mensagens, Propostas e Início.
 */
export function useContatos() {
  const { papel, papelConfirmado } = useCurrentUser();
  const [contatos, setContatos] = useState<ContatoRead[]>([]);
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    api
      .listContatos()
      .then(async (lista) => {
        if (!ativo) return;
        setContatos(lista);
        // Eu sou profissional -> a outra parte é sempre a empresa (solicitante_id).
        // Eu sou empresa -> a outra parte é sempre o profissional (profissional_id).
        const outroIdDe = (c: ContatoRead) => (papel === "profissional" ? c.solicitante_id : c.profissional_id);
        const idsUnicos = Array.from(new Set(lista.map(outroIdDe)));
        const buscarNome = papel === "profissional" ? api.getEmpresa : api.getProfissional;
        const entradas = await Promise.all(
          idsUnicos.map(async (id) => {
            try {
              const perfil = await buscarNome(id);
              return [id, perfil.nome] as const;
            } catch {
              return [id, papel === "profissional" ? "Empresa" : "Profissional"] as const;
            }
          }),
        );
        if (ativo) setNomes(Object.fromEntries(entradas));
      })
      .catch((e) => ativo && setErro(e instanceof Error ? e.message : falhaAoCarregar("seus contatos")))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [papel, papelConfirmado]);

  const nomeDaOutraParte = useCallback(
    (c: ContatoRead) => {
      const id = papel === "profissional" ? c.solicitante_id : c.profissional_id;
      return nomes[id] ?? "...";
    },
    [nomes, papel],
  );

  return { contatos, nomes, carregando, erro, nomeDaOutraParte };
}
