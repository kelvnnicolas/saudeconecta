import { z } from "zod";
import { optionalPositiveNumber } from "./shared";

export const loginSchema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe sua senha"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const cadastroProfissionalSchema = z.object({
  nome: z.string().min(3, "Informe seu nome completo"),
  email: z.string().email("Informe um e-mail válido"),
  telefone: z.string().min(8, "Informe um telefone válido"),
  password: z.string().min(8, "Mínimo de 8 caracteres"),
  especialidadeIds: z.array(z.number()).min(1, "Selecione ao menos uma especialidade"),
  registroProfissional: z.string().min(1, "Informe seu registro no conselho"),
  cidade: z.string().min(1, "Informe a cidade"),
  estado: z.string().length(2, "UF com 2 letras"),
  precoHora: optionalPositiveNumber(),
});
export type CadastroProfissionalInput = z.infer<typeof cadastroProfissionalSchema>;

export const cadastroEmpresaSchema = z.object({
  nome: z.string().min(3, "Informe seu nome ou o nome do responsável"),
  nomeFantasia: z.string().min(2, "Informe o nome da empresa/família"),
  email: z.string().email("Informe um e-mail válido"),
  telefone: z.string().min(8, "Informe um telefone válido"),
  password: z.string().min(8, "Mínimo de 8 caracteres"),
  tipo: z.enum(["clinica", "hospital", "homecare", "pessoa_fisica"]),
  cidade: z.string().min(1, "Informe a cidade"),
  estado: z.string().length(2, "UF com 2 letras"),
});
export type CadastroEmpresaInput = z.infer<typeof cadastroEmpresaSchema>;
