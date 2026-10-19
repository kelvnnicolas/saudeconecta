"use client";

import { useEffect, useState } from "react";
import { api } from "./api";
import type { Especialidade } from "./types";

// A lista muda raramente: uma busca por carga da página, compartilhada entre telas.
let pedido: Promise<Especialidade[]> | null = null;

function carregar() {
  if (!pedido) {
    pedido = api.listEspecialidades().catch((e) => {
      pedido = null; // permite tentar de novo na próxima montagem
      throw e;
    });
  }
  return pedido;
}

export function useEspecialidades() {
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let ativo = true;
    carregar()
      .then((lista) => ativo && setEspecialidades(lista))
      .catch(() => ativo && setErro(true))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, []);

  return { especialidades, carregando, erro };
}
