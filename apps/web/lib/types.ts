// Espelha 1:1 os schemas Pydantic de apps/api/app/schemas/*.py e os enums de
// apps/api/app/models/*.py. Qualquer campo que exista aqui mas não no backend (ou
// vice-versa) é bug — manter em sincronia manualmente até haver geração automática
// (ex.: openapi-typescript a partir de /openapi.json).

export type Papel = "profissional" | "empresa";
export type TipoEmpresa = "clinica" | "hospital" | "homecare" | "pessoa_fisica";
export type StatusContato = "pendente" | "respondido" | "encerrado";
export type OrigemContato = "busca" | "demanda";
export type StatusDemanda = "aberta" | "preenchida" | "encerrada" | "expirada";
export type StatusAssinatura =
  | "incomplete"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete_expired"
  | "paused";

export interface Profile {
  id: string;
  papel: Papel;
  nome: string;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  avatar_url: string | null;
  email: string | null;
  criado_em: string;
}

export interface AuthSyncRequest {
  papel: Papel;
  nome: string;
  telefone?: string | null;
  cidade?: string | null;
  estado?: string | null;
}

export interface Especialidade {
  id: number;
  nome: string;
}

export interface ProfissionalRead {
  user_id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  avatar_url: string | null;
  registro_profissional: string | null;
  bio: string | null;
  preco_hora: number | null;
  verificado: boolean;
  especialidades: Especialidade[];
}

export interface ProfissionalUpdateRequest {
  registro_profissional?: string | null;
  bio?: string | null;
  preco_hora?: number | null;
  especialidade_ids: number[];
}

export interface ProfissionalSearchResult {
  user_id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  avatar_url: string | null;
  bio: string | null;
  preco_hora: number | null;
  verificado: boolean;
  nota_media: number | null;
}

export interface ProfissionalSearchResponse {
  items: ProfissionalSearchResult[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProfissionalSearchParams {
  q?: string;
  cidade?: string;
  estado?: string;
  preco_min?: number;
  preco_max?: number;
  nota_min?: number;
  limit?: number;
  offset?: number;
}

export interface EmpresaRead {
  user_id: string;
  nome: string;
  avatar_url: string | null;
  nome_fantasia: string;
  tipo: TipoEmpresa;
  cidade: string | null;
  estado: string | null;
}

export interface EmpresaUpdateRequest {
  nome_fantasia: string;
  tipo: TipoEmpresa;
  cidade?: string | null;
  estado?: string | null;
}

export interface ContatoRead {
  id: number;
  solicitante_id: string;
  profissional_id: string;
  mensagem: string;
  status: StatusContato;
  origem: OrigemContato;
  demanda_id: string | null;
  criado_em: string;
  aceito_em: string | null;
}

export interface ContatoCreateRequest {
  profissional_id: string;
  mensagem: string;
}

export interface MensagemContatoRead {
  id: number;
  contato_id: number;
  autor_id: string;
  corpo: string;
  criado_em: string;
}

export interface MensagemContatoCreateRequest {
  corpo: string;
}

export interface AvaliacaoRead {
  id: number;
  autor_id: string;
  alvo_id: string;
  nota: number;
  comentario: string | null;
  criado_em: string;
}

export interface AvaliacaoCreateRequest {
  alvo_id: string;
  nota: number;
  comentario?: string | null;
}

export interface DemandaCreateRequest {
  especialidade_id: number;
  cidade: string;
  estado: string;
  bairro?: string | null;
  data_inicio: string; // YYYY-MM-DD
  turno: string;
  descricao: string;
  valor_oferecido?: number | null;
}

export interface DemandaRead {
  id: string;
  empresa_id: string;
  empresa_nome: string;
  especialidade_id: number;
  especialidade_nome: string;
  cidade: string;
  estado: string;
  bairro: string | null;
  data_inicio: string;
  turno: string;
  descricao: string;
  valor_oferecido: number | null;
  status: StatusDemanda;
  expira_em: string;
  criado_em: string;
}

export interface MinhaDemandaRead extends DemandaRead {
  interessados_count: number;
}

export interface InteressadoRead {
  contato_id: number;
  profissional_id: string;
  nome: string;
  avatar_url: string | null;
  criado_em: string;
}

export interface DemandaDetalheEmpresa extends DemandaRead {
  interessados: InteressadoRead[];
}

export interface DemandaDetalheProfissional extends DemandaRead {
  ja_demonstrei_interesse: boolean;
}

export interface OportunidadesResponse {
  items: DemandaRead[];
  total: number;
  limit: number;
  offset: number;
}

export interface InteresseResponse {
  contato_id: number;
}

export interface PlanoRead {
  codigo: string;
  nome: string;
  limite_demandas_ativas: number | null;
}

export interface CheckoutResponse {
  checkout_url: string;
}

export interface PortalResponse {
  portal_url: string;
}

export interface UsoDemandas {
  demandas_ativas: number;
  limite: number | null;
}

export interface MinhaAssinaturaResponse {
  plano: PlanoRead | null;
  status: StatusAssinatura | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  uso: UsoDemandas;
}

// Corpo estável de erro de regra de negócio (detail.code), conforme README/STATUS.
export interface ErroNegocio {
  detail: {
    code: string;
    [key: string]: unknown;
  };
}

export type TipoNotificacao =
  | "novo_contato"
  | "nova_mensagem"
  | "aceite_demanda"
  | "novo_interesse"
  | "falha_pagamento"
  | "nova_oportunidade";

export interface NotificacaoRead {
  id: number;
  tipo: TipoNotificacao;
  titulo: string;
  corpo: string;
  link: string;
  lida_em: string | null;
  criado_em: string;
}

export interface ListaNotificacoesResponse {
  items: NotificacaoRead[];
  total: number;
  total_nao_lidas: number;
  limit: number;
  offset: number;
}
