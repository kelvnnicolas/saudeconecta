import { createClient, type Session } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Em dev sem as variáveis preenchidas isso não deve derrubar o app inteiro (as
// páginas rodam com lib/mock-data.ts) — só as chamadas reais abaixo vão falhar.
export const supabase =
  url && anonKey ? createClient(url, anonKey) : null;

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
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

export async function signUpWithPassword(email: string, password: string) {
  if (!supabase) throw new Error("Supabase não configurado (ver .env.example)");
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}
