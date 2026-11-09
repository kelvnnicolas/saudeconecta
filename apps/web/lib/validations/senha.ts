import { z } from "zod";

export const SENHA_MINIMO = 8;

export const REGRAS_SENHA = [
  { id: "tamanho", rotulo: `Pelo menos ${SENHA_MINIMO} caracteres`, curto: `${SENHA_MINIMO} caracteres`, ok: (s: string) => s.length >= SENHA_MINIMO },
  { id: "minuscula", rotulo: "Uma letra minúscula", curto: "letra minúscula", ok: (s: string) => /[a-zà-ÿ]/.test(s) },
  { id: "maiuscula", rotulo: "Uma letra maiúscula", curto: "letra maiúscula", ok: (s: string) => /[A-ZÀ-Þ]/.test(s) },
  { id: "numero", rotulo: "Um número", curto: "número", ok: (s: string) => /\d/.test(s) },
  { id: "simbolo", rotulo: "Um símbolo (ex.: ! @ # $ %)", curto: "símbolo", ok: (s: string) => /[^A-Za-z0-9À-ÿ\s]/.test(s) },
] as const;

export function regrasFaltando(senha: string) {
  return REGRAS_SENHA.filter((regra) => !regra.ok(senha));
}

/** Senha forte para criar ou trocar senha. No login não se usa: contas antigas podem ter senha mais fraca. */
export const senhaForteSchema = z.string().min(1, "Crie uma senha").superRefine((senha, ctx) => {
  const faltando = regrasFaltando(senha);
  if (faltando.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Falta na senha: ${faltando.map((r) => r.curto).join(", ")}`,
    });
  }
});
