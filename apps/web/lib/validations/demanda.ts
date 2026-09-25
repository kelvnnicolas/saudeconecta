import { z } from "zod";
import { optionalPositiveNumber } from "./shared";

// Espelha DemandaCreateRequest (apps/api/app/schemas/demanda.py). Sem campo de
// "tipo de contratante" (já é empresas.tipo, decidido no cadastro) nem "serviço
// requerido" (sem campo correspondente no backend — dobrado dentro de descricao
// pela UI, ver criar_nova_demanda/page.tsx).
export const criarDemandaSchema = z.object({
  especialidadeId: z.number({ required_error: "Selecione a especialidade" }),
  cidade: z.string().min(1, "Informe a cidade"),
  estado: z.string().length(2, "UF com 2 letras"),
  bairro: z.string().optional(),
  dataInicio: z.string().min(1, "Informe a data de início"),
  turno: z.string().min(1, "Informe o turno"),
  descricao: z.string().min(1, "Descreva a necessidade").max(500, "Máximo de 500 caracteres"),
  valorOferecido: optionalPositiveNumber(),
});
export type CriarDemandaInput = z.infer<typeof criarDemandaSchema>;
