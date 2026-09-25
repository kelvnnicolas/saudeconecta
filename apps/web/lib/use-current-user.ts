"use client";

import { useEffect, useState } from "react";
import {
  MOCK_EMPRESA_DETAIL,
  MOCK_EMPRESA_PROFILE,
  MOCK_PROFISSIONAL_DETAIL,
  MOCK_PROFISSIONAL_PROFILE,
} from "./mock-data";
import type { Papel } from "./types";

const STORAGE_KEY = "saudeconecta:mock-role";

// TODO(integração): trocar por sessão real (lib/supabase-client.ts getSession())
// + GET /profissionais/{id} ou /empresas/{id} com o id da sessão. Por ora alterna
// entre os dois perfis de exemplo via localStorage, pra dar pra navegar as telas
// dos dois papéis (profissional/empresa) sem precisar do backend no ar.
export function useCurrentUser() {
  const [papel, setPapelState] = useState<Papel>("profissional");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "profissional" || stored === "empresa") setPapelState(stored);
  }, []);

  function setPapel(next: Papel) {
    window.localStorage.setItem(STORAGE_KEY, next);
    setPapelState(next);
  }

  const profile = papel === "profissional" ? MOCK_PROFISSIONAL_PROFILE : MOCK_EMPRESA_PROFILE;
  const profissional = papel === "profissional" ? MOCK_PROFISSIONAL_DETAIL : null;
  const empresa = papel === "empresa" ? MOCK_EMPRESA_DETAIL : null;

  return { papel, setPapel, profile, profissional, empresa };
}
