import { createClient, type Session } from "@supabase/supabase-js";
import type { Papel } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Em dev sem as variáveis preenchidas isso não deve derrubar o app inteiro no
// import — só as chamadas reais abaixo (login, cadastro, sessão) vão falhar
// com uma mensagem clara, em vez de um erro de módulo na primeira renderização.
export const supabase =
  url && anonKey ? createClient(url, anonKey) : null;

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// POST /auth/sync (lib/api.ts) precisa do papel logo na primeira chamada, mas
// só temos o formulário de cadastro específico (profissional ou empresa) —
// gravamos o papel no user_metadata do próprio Supabase Auth no signup, pra
// lib/use-current-user.ts saber qual endpoint chamar (/profissionais/{id} ou
// /empresas/{id}) sem precisar perguntar de novo a cada sessão restaurada.
export function onAuthStateChange(callback: (session: Session | null) => void) {
  if (!supabase) return () => {};
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => subscription.unsubscribe();
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? null;
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) throw new Error("Supabase não configurado (ver .env.example)");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error("Supabase não configurado (ver .env.example)");
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google" });
  if (error) throw error;
  return data;
}

export async function signInWithLinkedIn() {
  if (!supabase) throw new Error("Supabase não configurado (ver .env.example)");
  // Supabase usa "linkedin_oidc" (OpenID Connect) — o provider "linkedin"
  // antigo foi descontinuado.
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: "linkedin_oidc" });
  if (error) throw error;
  return data;
}

export async function signUpWithPassword(email: string, password: string, papel: Papel) {
  if (!supabase) throw new Error("Supabase não configurado (ver .env.example)");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { papel } },
  });
  if (error) throw error;
  return data;
}

export class EmailNaoConfirmadoError extends Error {
  constructor() {
    super("Enviamos um link de confirmação para o seu e-mail. Confirme antes de continuar.");
  }
}

/**
 * signUp() nem sempre devolve sessão ativa na mesma chamada (depende de
 * confirmação de e-mail estar ligada no projeto Supabase, e mesmo quando não
 * está, a sessão pode não vir preenchida de imediato) — confirmado testando
 * ao vivo: sem isso, POST /auth/sync falhava com 401 logo depois do cadastro,
 * deixando um usuário no Auth sem profile correspondente. Cadastro sempre
 * segue com um signIn explícito antes de chamar a API.
 */
export async function signUpAndEnsureSession(email: string, password: string, papel: Papel) {
  await signUpWithPassword(email, password, papel);
  try {
    await signInWithPassword(email, password);
  } catch (e) {
    if (e instanceof Error && /confirm/i.test(e.message)) {
      throw new EmailNaoConfirmadoError();
    }
    throw e;
  }
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
