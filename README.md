# SaúdeConecta

Marketplace que conecta profissionais de saúde (enfermeiros(as), técnicos de
enfermagem, médicos, fisioterapeutas, fonoaudiólogos(as), nutricionistas,
psicólogos(as), cuidadores(as) de idosos e crianças, entre outras
especialidades) a empresas e pessoas que precisam desses serviços (clínicas,
hospitais, empresas de homecare, operadoras de saúde e famílias).

Este repositório contém o **Plano Básico (MVP comercial)**: primeira versão
publicável, funcional e de boa qualidade visual — não um protótipo
descartável. Escopo e orçamento já aprovados pelo cliente.

## Status do projeto

| Etapa | Status |
|---|---|
| Design spec do MVP (escopo, stack, modelo de dados, critérios de aceite) | ✅ Aprovado — [`docs/superpowers/specs/2026-09-19-saudeconecta-mvp-design.md`](docs/superpowers/specs/2026-09-19-saudeconecta-mvp-design.md) |
| Plano 1 — Fundação do backend (FastAPI, banco, modelos, migrations, Storage, Sentry) | ✅ Integrado à `main` |
| Plano 2 — Autenticação (Supabase Auth via JWKS) + perfis/especialidades/profissionais/empresas | ✅ Integrado à `main` |
| Plano 3 — Busca de profissionais, avaliações e contatos (+ e-mail via Resend) | ✅ Integrado à `main` |
| Plano 4 — Upload de avatar/logo (Supabase Storage) | ✅ Integrado à `main` |
| Plano 5 — Relatório de analytics (pandas) | ✅ Integrado à `main` |
| Link de pagamento (Stripe/Pagar.me) | ⏳ Não iniciado |
| Frontend (Next.js) | ⏳ Não iniciado |
| CI (lint + testes por PR) e deploy | ⏳ Não iniciado |

O trabalho é dividido em planos de implementação por fase (cada um validável
e testável sozinho antes de avançar para o próximo), disponíveis em
[`docs/superpowers/plans/`](docs/superpowers/plans/). Cada plano teve
implementação por tarefa, revisão de código dedicada e uma revisão final de
branch antes de ser integrado à `main`.

### O que já funciona (backend, na `main`)

Backend FastAPI + SQLAlchemy 2.0 + Alembic, com 74 testes automatizados
rodando contra Postgres real via Docker (não SQLite/mocks):

- **Autenticação**: `POST /auth/sync` valida o JWT do Supabase (via JWKS) e
  sincroniza o perfil do usuário autenticado.
- **Perfis**: `GET /profissionais/{id}`, `PUT /profissionais/me`,
  `GET /empresas/{id}`, `PUT /empresas/me`, `POST /perfis/me/avatar` (upload
  de foto/logo para o Supabase Storage, com validação de formato e tamanho).
- **Especialidades**: `GET /especialidades` (10 especialidades semeadas pela
  migration inicial).
- **Busca**: `GET /profissionais` com filtro por texto (nome/especialidade
  via `pg_trgm`), cidade, estado, faixa de preço e nota mínima.
- **Contato**: `POST /contatos` (registra a mensagem e dispara e-mail via
  Resend, com falha de e-mail isolada — nunca quebra a criação do contato) e
  `GET /contatos` (só para as partes envolvidas).
- **Avaliações**: `POST /avaliacoes` (só entre quem já tem um contato
  registrado) e `GET /avaliacoes` (leitura pública).
- **Analytics**: `GET /analytics/relatorio?data_inicio&data_fim` — métricas
  da plataforma (profissionais por especialidade, nota média geral, volume
  de contatos no período) via funções pandas puras e testáveis.
- **Infra**: as 8 tabelas do modelo de dados, migrations com rollback
  testado, helper de upload para o Supabase Storage, Sentry inicializado,
  `GET /health`.

Ainda **fora de escopo** nesta etapa (ver o design spec para a lista
completa): link de pagamento, frontend, relatório de analytics exposto no
frontend, CI/CD, deploy.

### Rodando o backend localmente

```bash
# 1. Subir o Postgres local (dev + test) via Docker
docker compose -f docker-compose.dev.yml up -d

# 2. Criar o virtualenv e instalar dependências
cd apps/api
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# 3. Copiar o .env de exemplo (funciona com os valores padrão para dev local;
#    ver "Variáveis de ambiente" abaixo para os serviços externos)
cp .env.example .env

# 4. Aplicar as migrations
.venv/bin/alembic upgrade head

# 5. Rodar os testes
.venv/bin/python -m pytest -q

# 6. Subir a API
.venv/bin/uvicorn app.main:app --reload
```

A API sobe em `http://localhost:8000`; a documentação interativa (Swagger)
fica em `http://localhost:8000/docs`.

#### Variáveis de ambiente (`apps/api/.env`, nunca commitado)

| Variável | Obrigatória para rodar local? | Para quê |
|---|---|---|
| `DATABASE_URL` | Sim (já vem preenchida no `.env.example` para o Postgres local do Docker) | Conexão com o Postgres |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Só para autenticação real e upload de avatar de ponta a ponta | Validação de JWT (JWKS) e Supabase Storage |
| `SUPABASE_JWT_SECRET` | Não (mantida só como referência/fallback — a validação usa JWKS) | — |
| `SUPABASE_STORAGE_BUCKET` | Não (default `avatars`) | Nome do bucket de upload |
| `STRIPE_SECRET_KEY` | Só quando o link de pagamento for implementado | Stripe Payment Links |
| `RESEND_API_KEY` | Só para o e-mail de notificação de contato sair de verdade | API do Resend |
| `SENTRY_DSN` | Não (testes forçam vazio automaticamente) | Captura de erro |

Sem as credenciais externas, o backend sobe e os testes passam normalmente
— eles rodam contra o Postgres local e usam mocks para Storage/Resend/Sentry
onde é o caso. As credenciais só são necessárias para exercitar essas
integrações de ponta a ponta contra os serviços reais.

### Prontidão para deploy e QA de produção

O backend funciona localmente, mas **ainda não está pronto para um deploy de
produção**. Já resolvido: autenticação real via Supabase Auth, configuração
validada na inicialização (falha rápido se faltar variável obrigatória),
segredos fora do controle de versão, migrations com rollback testado de
ponta a ponta, e todo acesso a dado hoje passa pelo ORM (sem SQL cru fora da
migration). Ainda faltando, antes de qualquer teste real de segurança/
estabilidade em produção: CORS, rate limiting, health check consciente do
banco, verificação de vulnerabilidades de dependências, CI, separação de
dependências de produção/desenvolvimento, e a própria infraestrutura de
produção (Postgres gerenciado, hospedagem do backend, estratégia de
segredos). Checklist completo, item a item, em [`STATUS.md`](STATUS.md).

## Stack tecnológico

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14+ (App Router) + TypeScript |
| Backend/API | Python 3.11+ + FastAPI |
| ORM/Migrations | SQLAlchemy 2.0 + Alembic |
| Banco de dados | PostgreSQL 16 |
| Autenticação | Supabase Auth (JWT validado via JWKS) |
| Storage | Supabase Storage |
| Análise de dados | Python + pandas |
| Pagamento | Stripe Payment Links / Pagar.me Link de Pagamento |
| E-mail | Resend |
| Monitoramento | Sentry |
| CI/CD | GitHub Actions + Railway/Render (backend) + Vercel (frontend) |

Detalhes completos da stack, modelo de dados e critérios de aceite estão no
[design spec](docs/superpowers/specs/2026-09-19-saudeconecta-mvp-design.md).

## Estrutura do repositório

```
saudeconecta/
├── docker-compose.dev.yml   # Postgres local (dev + test) para desenvolvimento
├── docs/superpowers/
│   ├── specs/     # design specs aprovados
│   └── plans/     # planos de implementação por fase (um por branch/feature)
└── apps/
    ├── api/                 # backend FastAPI (na main)
    │   ├── app/
    │   │   ├── analytics/   # funções pandas puras (relatório)
    │   │   ├── core/        # config, auth (JWKS), database, sentry
    │   │   ├── models/      # SQLAlchemy ORM
    │   │   ├── routers/     # endpoints FastAPI
    │   │   ├── schemas/     # Pydantic
    │   │   ├── services/    # regras de negócio e autorização
    │   │   └── storage/     # helper do Supabase Storage
    │   ├── alembic/         # migrations
    │   ├── tests/           # 74 testes, rodando contra Postgres real
    │   └── .env.example
    └── web/       # frontend Next.js (ainda não iniciado)
```
