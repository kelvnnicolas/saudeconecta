import { getAccessToken } from "./supabase-client";
import type {
  AuthSyncRequest,
  AvaliacaoCreateRequest,
  AvaliacaoRead,
  CheckoutResponse,
  ContatoCreateRequest,
  ContatoRead,
  DemandaCreateRequest,
  DemandaDetalheEmpresa,
  DemandaDetalheProfissional,
  DemandaRead,
  EmpresaRead,
  EmpresaUpdateRequest,
  Especialidade,
  InteresseResponse,
  MinhaAssinaturaResponse,
  MinhaDemandaRead,
  OportunidadesResponse,
  PlanoRead,
  PortalResponse,
  Profile,
  ProfissionalRead,
  ProfissionalSearchParams,
  ProfissionalSearchResponse,
  ProfissionalUpdateRequest,
  StatusDemanda,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  code: string | null;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    const code =
      typeof detail === "object" && detail !== null && "code" in detail
        ? String((detail as Record<string, unknown>).code)
        : null;
    super(code ?? `Erro HTTP ${status}`);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const finalHeaders = new Headers(headers);
  if (rest.body && !(rest.body instanceof FormData)) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = await getAccessToken();
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...rest, headers: finalHeaders });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // corpo de erro pode vir vazio
    }
    throw new ApiError(res.status, (body as { detail?: unknown })?.detail ?? body);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function qs(params: Record<string, string | number | boolean | undefined>) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

export const api = {
  // Auth / perfil
  syncProfile: (data: AuthSyncRequest) =>
    request<Profile>("/auth/sync", { method: "POST", body: JSON.stringify(data) }),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<Profile>("/perfis/me/avatar", { method: "POST", body: form });
  },

  // Especialidades
  listEspecialidades: () =>
    request<Especialidade[]>("/especialidades", { auth: false }),

  // Profissionais
  searchProfissionais: (params: ProfissionalSearchParams = {}) =>
    request<ProfissionalSearchResponse>(`/profissionais${qs({ ...params })}`, { auth: false }),

  getProfissional: (userId: string) =>
    request<ProfissionalRead>(`/profissionais/${userId}`, { auth: false }),

  updateOwnProfissional: (data: ProfissionalUpdateRequest) =>
    request<ProfissionalRead>("/profissionais/me", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Empresas
  getEmpresa: (userId: string) =>
    request<EmpresaRead>(`/empresas/${userId}`, { auth: false }),

  updateOwnEmpresa: (data: EmpresaUpdateRequest) =>
    request<EmpresaRead>("/empresas/me", { method: "PUT", body: JSON.stringify(data) }),

  // Contatos
  createContato: (data: ContatoCreateRequest) =>
    request<ContatoRead>("/contatos", { method: "POST", body: JSON.stringify(data) }),

  listContatos: () => request<ContatoRead[]>("/contatos"),

  // Avaliações
  createAvaliacao: (data: AvaliacaoCreateRequest) =>
    request<AvaliacaoRead>("/avaliacoes", { method: "POST", body: JSON.stringify(data) }),

  listAvaliacoes: (alvoId: string) =>
    request<AvaliacaoRead[]>(`/avaliacoes${qs({ alvo_id: alvoId })}`, { auth: false }),

  // Demandas
  criarDemanda: (data: DemandaCreateRequest) =>
    request<DemandaRead>("/demandas", { method: "POST", body: JSON.stringify(data) }),

  minhasDemandas: () => request<MinhaDemandaRead[]>("/demandas/minhas"),

  oportunidades: (params: { especialidade_id?: number; cidade?: string; limit?: number; offset?: number } = {}) =>
    request<OportunidadesResponse>(`/demandas/oportunidades${qs(params)}`),

  detalheDemanda: (id: string) =>
    request<DemandaDetalheEmpresa | DemandaDetalheProfissional>(`/demandas/${id}`),

  atualizarStatusDemanda: (id: string, status: StatusDemanda) =>
    request<DemandaRead>(`/demandas/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  demonstrarInteresse: (id: string, mensagem?: string) =>
    request<InteresseResponse>(`/demandas/${id}/interesse`, {
      method: "POST",
      body: mensagem ? JSON.stringify({ mensagem }) : undefined,
    }),

  // Assinatura B2B
  listPlanos: () => request<PlanoRead[]>("/planos", { auth: false }),

  iniciarCheckout: (planoCodigo: string) =>
    request<CheckoutResponse>("/assinaturas/checkout", {
      method: "POST",
      body: JSON.stringify({ plano_codigo: planoCodigo }),
    }),

  abrirPortal: () => request<PortalResponse>("/assinaturas/portal", { method: "POST" }),

  minhaAssinatura: () => request<MinhaAssinaturaResponse>("/assinaturas/me"),
};
