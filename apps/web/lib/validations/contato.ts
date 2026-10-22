import { z } from "zod";

export const novoContatoSchema = z.object({
  mensagem: z.string().min(10, "Conte um pouco mais: use pelo menos 10 caracteres").max(1000, "Use no máximo 1.000 caracteres"),
});
export type NovoContatoInput = z.infer<typeof novoContatoSchema>;

export const avaliacaoSchema = z.object({
  nota: z.number().int().min(1).max(5),
  comentario: z.string().max(500, "Use no máximo 500 caracteres").optional(),
});
export type AvaliacaoInput = z.infer<typeof avaliacaoSchema>;
