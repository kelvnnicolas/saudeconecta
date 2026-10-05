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
  ListaNotificacoesResponse,
  MensagemContatoRead,
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

function mensagemDeValidacao(itens: unknown[]): string | null {
  const primeiro = itens[0];
  if (typeof primeiro !== "object" || primeiro === null || !("msg" in primeiro)) return null;
  // Pydantic prefixa validadores próprios com "Value error, ".
  return String((primeiro as Record<string, unknown>).msg).replace(/^Value error, /, "");
}

export class ApiError extends Error {
  status: number;
  code: string | null;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    // Duas formas de detail no backend: string simples (rotas mais antigas,
    // já é a mensagem pronta) ou {code, mensagem} (erro_negocio(), regra de
    // negócio). Sem isso, `message` virava o `code` cru ("nao_elegivel"),
    // que telas sem tratamento especial (ex.: criar demanda) mostravam
    // direto pro usuário em vez da frase explicativa que o backend já manda.
    // Terceira forma: erro de validação do FastAPI/Pydantic (422), uma lista
    // [{loc, msg, type}] — sem tratar, caía em "Erro HTTP 422".
    const isObjectDetail = typeof detail === "object" && detail !== null && !Array.isArray(detail);
    const code = isObjectDetail && "code" in detail ? String((detail as Record<string, unknown>).code) : null;
    const mensagemValidacao = Array.isArray(detail) ? mensagemDeValidacao(detail) : null;
    const mensagem =
      typeof detail === "string"
        ? detail
        : mensagemValidacao
          ? mensagemValidacao
          : isObjectDetail && "mensagem" in detail
            ? String((detail as Record<string, unknown>).mensagem)
            : null;
    super(mensagem ?? code ?? `Erro HTTP ${status}`);
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

  listarMensagensContato: (contatoId: number) =>
    request<MensagemContatoRead[]>(`/contatos/${contatoId}/mensagens`),

  enviarMensagemContato: (contatoId: number, corpo: string) =>
    request<MensagemContatoRead>(`/contatos/${contatoId}/mensagens`, {
      method: "POST",
      body: JSON.stringify({ corpo }),
    }),

  aceitarDemandaDireta: (contatoId: number) =>
    request<ContatoRead>(`/contatos/${contatoId}/aceitar`, { method: "POST" }),

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

  // Notificações
  listarNotificacoes: (params: { limit?: number; offset?: number } = {}) =>
    request<ListaNotificacoesResponse>(`/notificacoes${qs(params)}`),

  marcarNotificacaoLida: (id: number) =>
    request<void>(`/notificacoes/${id}/marcar-lida`, { method: "POST" }),

  marcarTodasNotificacoesLidas: () =>
    request<{ marcadas: number }>("/notificacoes/marcar-todas-lidas", { method: "POST" }),
};
