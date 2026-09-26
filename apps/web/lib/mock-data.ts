import type { Especialidade } from "./types";

// Único dado de exemplo que sobrou depois da integração com apps/api — todo o
// resto (profissionais, contatos, demandas, avaliações, planos...) já vem de
// lib/api.ts. Isso aqui é o item "prioridade futura" combinado com o cliente:
// só 6 dos 10 registros reais semeados no backend (GET /especialidades).
// Trocar por api.listEspecialidades() quando essa prioridade for retomada —
// ver docs/design/telas/MANIFEST.md, seção "Listas hardcoded".
export const MOCK_ESPECIALIDADES: Especialidade[] = [
  { id: 1, nome: "Enfermagem" },
  { id: 2, nome: "Técnico de Enfermagem" },
  { id: 4, nome: "Fisioterapia" },
  { id: 6, nome: "Nutrição" },
  { id: 5, nome: "Fonoaudiologia" },
  { id: 8, nome: "Cuidador de Idosos" },
];
