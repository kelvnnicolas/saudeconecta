import { z } from "zod";
import { optionalPositiveNumber } from "./shared";
import { senhaForteSchema } from "./senha";

const CONFIRMACAO_DIFERENTE = { message: "As senhas não coincidem", path: ["confirmacao"] };

export const loginSchema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe sua senha"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const esqueciSenhaSchema = z.object({
  email: z.string().email("Informe um e-mail válido"),
});
export type EsqueciSenhaInput = z.infer<typeof esqueciSenhaSchema>;

export const novaSenhaSchema = z
  .object({
    password: senhaForteSchema,
    confirmacao: z.string().min(1, "Confirme a senha"),
  })
  .refine((data) => data.password === data.confirmacao, CONFIRMACAO_DIFERENTE);
export type NovaSenhaInput = z.infer<typeof novaSenhaSchema>;

export const cadastroProfissionalSchema = z
  .object({
    nome: z.string().min(3, "Informe seu nome completo"),
    email: z.string().email("Informe um e-mail válido"),
    telefone: z.string().min(8, "Informe um telefone com DDD"),
    password: senhaForteSchema,
    confirmacao: z.string().min(1, "Confirme a senha"),
    especialidadeIds: z
      .array(z.number(), {
        required_error: "Selecione ao menos uma especialidade",
        invalid_type_error: "Selecione ao menos uma especialidade",
      })
      .min(1, "Selecione ao menos uma especialidade"),
    // Opcional por enquanto: a validação do registro no conselho ainda será definida.
    registroProfissional: z.string().optional(),
    cidade: z.string().min(1, "Informe a cidade"),
    estado: z.string().length(2, "Informe a UF com 2 letras, como SP"),
    precoHora: optionalPositiveNumber(),
  })
  .refine((data) => data.password === data.confirmacao, CONFIRMACAO_DIFERENTE);
export type CadastroProfissionalInput = z.infer<typeof cadastroProfissionalSchema>;

export const cadastroEmpresaSchema = z
  .object({
    nome: z.string().min(3, "Informe seu nome ou o nome do responsável"),
    // Opcional só pra pessoa_fisica/família (cai pro próprio `nome` no envio,
    // ver onSubmit) — clínica/hospital/homecare seguem exigindo um nome de
    // empresa de verdade, checado abaixo em .refine().
    nomeFantasia: z.string().optional(),
    email: z.string().email("Informe um e-mail válido"),
    telefone: z.string().min(8, "Informe um telefone com DDD"),
    password: senhaForteSchema,
    confirmacao: z.string().min(1, "Confirme a senha"),
    tipo: z.enum(["clinica", "hospital", "homecare", "pessoa_fisica"]),
    cidade: z.string().min(1, "Informe a cidade"),
    estado: z.string().length(2, "Informe a UF com 2 letras, como SP"),
  })
  .refine((data) => data.tipo === "pessoa_fisica" || (data.nomeFantasia?.trim().length ?? 0) >= 2, {
    message: "Informe o nome da empresa",
    path: ["nomeFantasia"],
  })
  .refine((data) => data.password === data.confirmacao, CONFIRMACAO_DIFERENTE);
export type CadastroEmpresaInput = z.infer<typeof cadastroEmpresaSchema>;
