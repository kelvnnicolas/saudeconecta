// Dados de exemplo para navegar o app sem o backend rodando. Todo objeto aqui
// segue exatamente os tipos de lib/types.ts (mesmo shape que a API real devolve),
// então trocar por lib/api.ts nas páginas é só substituir a fonte do dado, não a
// forma dele. Ver TODO(integração) em cada página.
import type {
  AvaliacaoRead,
  ContatoRead,
  EmpresaRead,
  Especialidade,
  MinhaDemandaRead,
  OportunidadesResponse,
  PlanoRead,
  ProfissionalRead,
  ProfissionalSearchResult,
  Profile,
} from "./types";

// TODO(prioridade futura, combinado com o cliente): esta lista tem só 6 dos 10
// registros reais semeados em apps/api (GET /especialidades). Trocar por uma
// chamada a api.listEspecialidades() quando essa prioridade for retomada — ver
// docs/design/telas/MANIFEST.md, seção "Listas hardcoded".
export const MOCK_ESPECIALIDADES: Especialidade[] = [
  { id: 1, nome: "Enfermagem" },
  { id: 2, nome: "Técnico de Enfermagem" },
  { id: 4, nome: "Fisioterapia" },
  { id: 6, nome: "Nutrição" },
  { id: 5, nome: "Fonoaudiologia" },
  { id: 8, nome: "Cuidador de Idosos" },
];

export const MOCK_PROFISSIONAL_PROFILE: Profile = {
  id: "aaaaaaaa-0000-0000-0000-000000000001",
  papel: "profissional",
  nome: "Ana Silva",
  telefone: "(48) 99123-4567",
  cidade: "Florianópolis",
  estado: "SC",
  avatar_url:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDY-0QQJFauOg-csMgStCHTZ3ltmbCikQIArnd8jT_XekLftKfqy7mGBkqY8e-5Q_3EVvsczDJJaqg1LzV6stzpx9FCeoJiYCqUrK9HqsPSKv5yEJB-HCh58KUnsuTpLsjbjeHtUnrF-ebu7vrj9N8ZEhwN0sn9zcvF8n17VkM9UvfYRVomR1Jp5OfX1or2BabgVDZj06T--AFxJq5Om30YIucX1Gc0api2xjGxUqd7IgaR_e0mNyjKTQ",
  email: "ana.silva@exemplo.com.br",
  criado_em: "2026-06-01T12:00:00Z",
};

export const MOCK_PROFISSIONAL_DETAIL: ProfissionalRead = {
  user_id: MOCK_PROFISSIONAL_PROFILE.id,
  nome: MOCK_PROFISSIONAL_PROFILE.nome,
  cidade: MOCK_PROFISSIONAL_PROFILE.cidade,
  estado: MOCK_PROFISSIONAL_PROFILE.estado,
  avatar_url: MOCK_PROFISSIONAL_PROFILE.avatar_url,
  registro_profissional: "COREN-SC 123456",
  bio: "Enfermeira com 8 anos de experiência em home care e pós-operatório, especializada em administração de medicação e cuidados com feridas. Atendimentos em Florianópolis e região.",
  preco_hora: 45,
  verificado: true,
  especialidades: [MOCK_ESPECIALIDADES[0]!, MOCK_ESPECIALIDADES[5]!],
};

export const MOCK_EMPRESA_PROFILE: Profile = {
  id: "bbbbbbbb-0000-0000-0000-000000000002",
  papel: "empresa",
  nome: "Mariana Silveira",
  telefone: "(48) 99876-5432",
  cidade: "Florianópolis",
  estado: "SC",
  avatar_url: null,
  email: "mariana@clinicaestar.com.br",
  criado_em: "2026-05-10T09:00:00Z",
};

export const MOCK_EMPRESA_DETAIL: EmpresaRead = {
  user_id: MOCK_EMPRESA_PROFILE.id,
  nome: MOCK_EMPRESA_PROFILE.nome,
  avatar_url: null,
  nome_fantasia: "Clínica Estar Home Care",
  tipo: "homecare",
  cidade: "Florianópolis",
  estado: "SC",
};

export const MOCK_SEARCH_RESULTS: ProfissionalSearchResult[] = [
  {
    user_id: MOCK_PROFISSIONAL_PROFILE.id,
    nome: "Ana Silva",
    cidade: "Florianópolis",
    estado: "SC",
    avatar_url: MOCK_PROFISSIONAL_PROFILE.avatar_url,
    bio: "Enfermeira, especialista em home care e pós-operatório.",
    preco_hora: 45,
    verificado: true,
    nota_media: 4.9,
  },
  {
    user_id: "aaaaaaaa-0000-0000-0000-000000000003",
    nome: "Carlos Mendes",
    cidade: "São José",
    estado: "SC",
    avatar_url:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA9qHxxz1OJAsdQFbNOy9ycBHuAUP_6cN-5v7Zsw0cPpiSdPQnowy3cfy0_5Ii5HwU2jRm1ZJwPBxdpsWIjmbtC4Ryyh32N0Hscne-g-IoZ0OUd8iO9CVEufkdtd8XCgiCDRoeanWZSBuP5vrXo_f8tzuvCwhXGNza-_2gsiOb5UM8ExH1jWSF-__xAV4SO6DBADH1-iBOp8dSjK-gScysL5ZooSRn3Z9Cn6th5GB0L6CzBzaufIyR5dw",
    bio: "Fisioterapeuta respiratório e ortopédico.",
    preco_hora: 38,
    verificado: true,
    nota_media: 5.0,
  },
  {
    user_id: "aaaaaaaa-0000-0000-0000-000000000004",
    nome: "Mariana Costa",
    cidade: "Palhoça",
    estado: "SC",
    avatar_url:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAhmGzrRnEfYkRf65HUI4PlgC5-WuijFvvi9JvDeqFZrup-VinpGt_x_CulVXkFW379uLKXCcdKERpOtbFGZKh_APLvRY0QSVszijbDm6C1wixIlPslF2G-n4jO5EolJ3YQ8rbXKgkEPi2BFt9wI0wobpRjKOjcBEl2B07FIiFZmUDM0n8ZrW_c4jx5Cn8SK0sQAD1CKedIpcxb6F0n33jtOZBiHnq3tb1PvbS6eN3RFy5nftqf6TldDw",
    bio: "Cuidadora de idosos, acompanhamento noturno.",
    preco_hora: 28,
    verificado: true,
    nota_media: 4.8,
  },
];

export const MOCK_AVALIACOES: AvaliacaoRead[] = [
  {
    id: 1,
    autor_id: MOCK_EMPRESA_PROFILE.id,
    alvo_id: MOCK_PROFISSIONAL_PROFILE.id,
    nota: 5,
    comentario:
      "Atendimento impecável, muito atenciosa com meu pai no pós-operatório. Recomendo muito.",
    criado_em: "2026-09-12T14:00:00Z",
  },
  {
    id: 2,
    autor_id: "bbbbbbbb-0000-0000-0000-000000000005",
    alvo_id: MOCK_PROFISSIONAL_PROFILE.id,
    nota: 5,
    comentario: "Pontual e muito cuidadosa com a medicação. Voltaremos a chamar.",
    criado_em: "2026-08-30T10:00:00Z",
  },
];

export const MOCK_CONTATOS: ContatoRead[] = [
  {
    id: 101,
    solicitante_id: MOCK_EMPRESA_PROFILE.id,
    profissional_id: MOCK_PROFISSIONAL_PROFILE.id,
    mensagem: "Perfeito, chego amanhã às 08h com o material de punção.",
    status: "respondido",
    origem: "busca",
    demanda_id: null,
    criado_em: "2026-09-24T14:32:00Z",
  },
  {
    id: 102,
    solicitante_id: MOCK_EMPRESA_PROFILE.id,
    profissional_id: "aaaaaaaa-0000-0000-0000-000000000003",
    mensagem: "Olá Carlos, gostaria de agendar uma sessão de fisioterapia respiratória.",
    status: "pendente",
    origem: "busca",
    demanda_id: null,
    criado_em: "2026-09-23T19:15:00Z",
  },
];

const hoje = new Date();
function diasAPartirDeHoje(dias: number) {
  const d = new Date(hoje);
  d.setDate(d.getDate() + dias);
  return d.toISOString();
}

export const MOCK_MINHAS_DEMANDAS: MinhaDemandaRead[] = [
  {
    id: "cccccccc-0000-0000-0000-000000000001",
    empresa_id: MOCK_EMPRESA_PROFILE.id,
    empresa_nome: MOCK_EMPRESA_DETAIL.nome_fantasia,
    especialidade_id: 1,
    especialidade_nome: "Enfermagem",
    cidade: "Florianópolis",
    estado: "SC",
    bairro: "Centro",
    data_inicio: diasAPartirDeHoje(8).slice(0, 10),
    turno: "07:00 - 19:00 (12h Dia)",
    descricao:
      "Paciente idoso (78 anos) necessitando de auxílio na mobilidade, administração de medicação oral e verificação de sinais vitais pós alta hospitalar.",
    valor_oferecido: 180,
    status: "aberta",
    expira_em: diasAPartirDeHoje(27),
    criado_em: diasAPartirDeHoje(-3),
    interessados_count: 2,
  },
  {
    id: "cccccccc-0000-0000-0000-000000000002",
    empresa_id: MOCK_EMPRESA_PROFILE.id,
    empresa_nome: MOCK_EMPRESA_DETAIL.nome_fantasia,
    especialidade_id: 4,
    especialidade_nome: "Fisioterapia",
    cidade: "São José",
    estado: "SC",
    bairro: "Kobrasol",
    data_inicio: diasAPartirDeHoje(-4).slice(0, 10),
    turno: "Sessões 3x/semana",
    descricao: "Reabilitação pós-cirúrgica, sessões 3x por semana.",
    valor_oferecido: null,
    status: "preenchida",
    expira_em: diasAPartirDeHoje(10),
    criado_em: diasAPartirDeHoje(-10),
    interessados_count: 1,
  },
];

export const MOCK_OPORTUNIDADES: OportunidadesResponse = {
  items: [
    {
      id: "dddddddd-0000-0000-0000-000000000001",
      empresa_id: "bbbbbbbb-0000-0000-0000-000000000006",
      empresa_nome: "Clínica Estar Home Care",
      especialidade_id: 1,
      especialidade_nome: "Enfermagem",
      cidade: "Florianópolis",
      estado: "SC",
      bairro: "Centro",
      data_inicio: diasAPartirDeHoje(8).slice(0, 10),
      turno: "07:00 - 19:00 (12h Dia)",
      descricao:
        "Paciente idoso (78 anos) necessitando de auxílio na mobilidade, administração de medicação oral e verificação de sinais vitais pós alta hospitalar.",
      valor_oferecido: 180,
      status: "aberta",
      expira_em: diasAPartirDeHoje(27),
      criado_em: diasAPartirDeHoje(-3),
    },
    {
      id: "dddddddd-0000-0000-0000-000000000002",
      empresa_id: "bbbbbbbb-0000-0000-0000-000000000007",
      empresa_nome: "Hospital e Maternidade Santa Clara",
      especialidade_id: 1,
      especialidade_nome: "Enfermagem",
      cidade: "São José",
      estado: "SC",
      bairro: "Kobrasol",
      data_inicio: diasAPartirDeHoje(11).slice(0, 10),
      turno: "19:00 - 07:00 (12h Noite)",
      descricao:
        "Plantão noturno em enfermaria, suporte à equipe de enfermagem, administração de medicação conforme prescrição.",
      valor_oferecido: null,
      status: "aberta",
      expira_em: diasAPartirDeHoje(12),
      criado_em: diasAPartirDeHoje(-1),
    },
  ],
  total: 2,
  limit: 20,
  offset: 0,
};

export const MOCK_PLANOS: PlanoRead[] = [
  { codigo: "essencial", nome: "Essencial Clínicas", limite_demandas_ativas: 5 },
  { codigo: "pro", nome: "Pro Enterprise", limite_demandas_ativas: null },
];
