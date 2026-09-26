import { z } from "zod";

export const novoContatoSchema = z.object({
  mensagem: z.string().min(10, "Descreva a necessidade com mais detalhes").max(1000),
});
export type NovoContatoInput = z.infer<typeof novoContatoSchema>;

export const avaliacaoSchema = z.object({
  nota: z.number().int().min(1).max(5),
  comentario: z.string().max(500).optional(),
});
export type AvaliacaoInput = z.infer<typeof avaliacaoSchema>;
