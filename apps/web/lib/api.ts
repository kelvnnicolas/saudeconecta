import { getAccessToken } from "./supabase-client";
import { MSG } from "./mensagens";
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
  EmpresaDiretorioResponse,
  EmpresaRead,
  EmpresaUpdateRequest,
  Especialidade,
  InteresseResponse,
  ListaNotificacoesResponse,
  MensagemContatoRead,
  MinhaAssinaturaResponse,
  MinhaDemandaRead,
  NotificacaoRead,
  OportunidadesResponse,
  PlanoRead,
  PortalResponse,
  Profile,
  ProfissionalRead,
  ProfissionalSearchParams,
  ProfissionalSearchResponse,
  ProfissionalUpdateRequest,
  StatusDemanda,
  TipoEmpresa,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Mensagens do backend que não devem chegar ao usuário como estão (inglês do
// Pydantic/slowapi, "Internal Server Error", "Erro HTTP 500"). Regras de negócio
// {code, mensagem} e validadores próprios já vêm em português e passam direto.
const MSG_GENERICA = MSG.generica;
const MSG_SESSAO = MSG.sessaoExpirada;
const MSG_SERVIDOR = MSG.servidor;
const MSG_LIMITE = MSG.muitasTentativas;
const MSG_REDE = MSG.semConexao;
const MSG_DADOS_INVALIDOS = MSG.dadosInvalidos;
const MSG_CAMPOS_OBRIGATORIOS = MSG.camposObrigatorios;

function mensagemDeValidacao(itens: unknown[]): string | null {
  const primeiro = itens[0];
  if (typeof primeiro !== "object" || primeiro === null || !("msg" in primeiro)) return null;
  const { msg, type } = primeiro as Record<string, unknown>;
  // Validadores próprios do backend (type "value_error") escrevem em português;
  // o prefixo "Value error, " é do Pydantic. Os demais tipos são texto em inglês.
  if (type === "value_error") return String(msg).replace(/^Value error, /, "");
  if (type === "missing") return MSG_CAMPOS_OBRIGATORIOS;
  return MSG_DADOS_INVALIDOS;
}

function mensagemAmigavel(status: number, mensagem: string | null): string {
  if (status === 401) return MSG_SESSAO;
  if (status === 429) return MSG_LIMITE;
  if (status >= 500) return MSG_SERVIDOR;
  if (mensagem === null) return status === 403 ? MSG.semPermissao : MSG_GENERICA;
  // Regras de negócio e validações próprias já têm frase pronta.
  return mensagem;
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
    super(status === 0 ? (mensagem ?? MSG_REDE) : mensagemAmigavel(status, mensagem));
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

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...rest, headers: finalHeaders });
  } catch {
    // Sem rede, servidor fora do ar ou bloqueio de CORS: o navegador só diz "Failed to fetch".
    throw new ApiError(0, MSG_REDE);
  }
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

  diretorioEmpresas: (
    params: { q?: string; tipo?: TipoEmpresa; estado?: string; cidade?: string; limit?: number; offset?: number } = {},
  ) => request<EmpresaDiretorioResponse>(`/empresas/diretorio${qs(params)}`),

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
  getPlanoGratuito: () => request<PlanoRead>("/planos/gratuito", { auth: false }),

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
    request<NotificacaoRead>(`/notificacoes/${id}/marcar-lida`, { method: "POST" }),

  marcarTodasNotificacoesLidas: () =>
    request<{ marcadas: number }>("/notificacoes/marcar-todas-lidas", { method: "POST" }),

  marcarNotificacoesLidasDoLink: (link: string) =>
    request<{ marcadas: number }>("/notificacoes/marcar-lidas-do-link", {
      method: "POST",
      body: JSON.stringify({ link }),
    }),
};
