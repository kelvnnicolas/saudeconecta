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
| Assinatura B2B (Stripe Checkout + Customer Portal) e demandas | ✅ Backend implementado e testado — checkout/webhook com Stripe real ⛔ ainda não testado ponta a ponta (ver [`STATUS.md`](STATUS.md)) |
| CI (lint + testes a cada PR) | ✅ GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) — só o backend, frontend ainda não entrou no CI |
| Link de pagamento por contato (Stripe/Pagar.me) | ⏳ Não iniciado |
| Frontend (Next.js) | ✅ 19 telas, integrado ao backend real e testado ponta a ponta (auth, busca, contato, avaliação, upload de avatar) — [`apps/web/README.md`](apps/web/README.md) |
| Deploy | 🟡 Em andamento — projeto Vercel conectado ao repo (frontend); backend ainda sem host definido |

O trabalho é dividido em planos de implementação por fase (cada um validável
e testável sozinho antes de avançar para o próximo), disponíveis em
[`docs/superpowers/plans/`](docs/superpowers/plans/). Cada plano teve
implementação por tarefa, revisão de código dedicada e uma revisão final de
branch antes de ser integrado à `main`.

### O que já funciona (backend, na `main`)

Backend FastAPI + SQLAlchemy 2.0 + Alembic, com 189 testes automatizados
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
- **Assinatura B2B**: `GET /planos`, `POST /assinaturas/checkout` (Stripe
  Checkout hospedado, cartão recorrente), `POST /assinaturas/portal` (Stripe
  Customer Portal: trocar cartão, faturas, cancelar), `GET /assinaturas/me`
  e `POST /webhooks/stripe` (assinatura validada, idempotente, estado sempre
  relido do Stripe). Só empresas `clinica`/`hospital`/`homecare` assinam.
- **Demandas**: empresas assinantes publicam (`POST /demandas`, limitado pelo
  plano); profissionais veem oportunidades compatíveis
  (`GET /demandas/oportunidades`) e demonstram interesse
  (`POST /demandas/{id}/interesse`), o que cria um **contato** comum — que
  segue o fluxo já existente (contato → avaliação). Erros de regra de negócio
  trazem um `code` estável em `detail.code` (ex.: `nao_elegivel`,
  `assinatura_necessaria`, `pagamento_pendente`, `limite_atingido`),
  documentados por rota no `/docs`.
- **LGPD**: `descricao` de demandas e `mensagem` de contatos são removidas de
  qualquer evento enviado ao Sentry e nunca aparecem em log — inclusive quando
  vêm dentro da mensagem de um erro do banco; payloads do Stripe não são
  armazenados.
- **Infra**: 12 tabelas, migrations com rollback testado, RLS nas tabelas de
  billing/demandas, helper de upload para o Supabase Storage, Sentry
  inicializado, `GET /health`, CI no GitHub Actions.

Ainda **fora de escopo** nesta etapa (ver o design spec para a lista
completa): link de pagamento por contato, deploy do backend.

### O que já funciona (frontend, `apps/web`)

Next.js 14 (App Router) + TypeScript + Tailwind, 19 telas geradas a partir de
[`docs/design/telas/`](docs/design/telas/), com todo formulário e listagem
chamando o backend real (`lib/api.ts`) — sem mock no caminho principal:

- **Autenticação**: cadastro/login via Supabase Auth real, com sessão
  restaurada de forma consistente entre reloads (`lib/use-current-user.ts`,
  um único store por aba) e guard de rota no grupo `(painel)`.
- **Busca e perfil público**: `GET /profissionais` com filtro, e
  `GET /profissionais/{id}` + avaliações no perfil público.
- **Contato e avaliação**: novo contato, lista de contatos (com nome da outra
  parte resolvido), avaliação após contato.
- **Upload de avatar**: `POST /perfis/me/avatar` pro Supabase Storage.
- **B2B**: planos, checkout (Stripe Checkout hospedado), portal de
  assinatura, demandas e oportunidades.

Testado manualmente de ponta a ponta contra o backend real (Supabase +
Stripe test mode): cadastro profissional/empresa, login/logout (inclusive
sobrevivendo a reload completo da página), contato entre as partes,
avaliação (gravada e conferida direto na API) e upload de avatar. Detalhes,
gaps conhecidos e o que ainda falta testar em
[`apps/web/INTEGRATION_CHECKLIST.md`](apps/web/INTEGRATION_CHECKLIST.md).

### Rodando o backend localmente

```bash
# 1. Subir o Postgres local (dev + test) via Docker
docker compose -f docker-compose.dev.yml up -d

# 2. Criar o virtualenv e instalar dependências
cd apps/api
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# 3. Copiar o .env de exemplo e preencher as variáveis obrigatórias do Stripe
#    e APP_URL (ver "Stripe (modo de teste)" abaixo) — sem elas a API se
#    recusa a subir, com uma mensagem listando o que falta
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

Os testes **não** dependem do `.env`: `tests/conftest.py` força valores
fictícios para Stripe/Sentry/Resend, então nenhum teste chama um serviço real.

### Rodando o frontend localmente

```bash
cd apps/web
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL + chaves do mesmo projeto Supabase do backend
npm run dev
```

Abre em `http://localhost:3000`. Detalhes em
[`apps/web/README.md`](apps/web/README.md).

#### Stripe (modo de teste)

Tudo no painel do Stripe com o toggle **Test mode** ligado:

1. **Chave secreta** — Developers → API keys → *Secret key* (`sk_test_...`)
   → `STRIPE_SECRET_KEY`.
2. **Produtos e preços** — Product catalog → crie dois produtos (Essencial e
   Pro), cada um com um preço **mensal recorrente**. Copie cada `price_...`
   para `STRIPE_PRICE_ESSENCIAL` e `STRIPE_PRICE_PRO`. Se o banco já foi
   migrado antes com outros valores, rode
   `.venv/bin/python -m app.jobs.sincronizar_planos` para atualizar.
3. **Customer Portal** — Settings → Billing → Customer portal → ative e
   salve (sem isso, `POST /assinaturas/portal` falha).
4. **`APP_URL`** — URL do frontend, usada nos redirecionamentos do Checkout
   e do Portal (em dev: `http://localhost:3000`).
5. **Webhook local** — instale o [Stripe CLI](https://docs.stripe.com/stripe-cli)
   e rode:

   ```bash
   stripe login
   stripe listen --forward-to localhost:8000/webhooks/stripe
   ```

   O comando imprime um segredo `whsec_...` → `STRIPE_WEBHOOK_SECRET`
   (reinicie a API depois). Deixe o `stripe listen` rodando enquanto testa.
   Cartão de teste: `4242 4242 4242 4242`, qualquer data futura/CVC; para
   simular falha de cobrança numa assinatura já ativa, use
   `stripe trigger invoice.payment_failed` ou o cartão `4000 0000 0000 0341`.

#### Jobs

- `.venv/bin/python -m app.jobs.expirar_demandas` — marca como `expirada` as
  demandas abertas vencidas (as leituras já tratam vencidas como expiradas;
  o job só atualiza o status em lote). Pensado para rodar agendado (ex.: cron
  diário).
- `.venv/bin/python -m app.jobs.sincronizar_planos` — copia os `price_id` do
  `.env` para a tabela `planos`.

#### Variáveis de ambiente (`apps/api/.env`, nunca commitado)

| Variável | Obrigatória para rodar local? | Para quê |
|---|---|---|
| `DATABASE_URL` | Sim (já vem preenchida no `.env.example` para o Postgres local do Docker) | Conexão com o Postgres |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Só para autenticação real e upload de avatar de ponta a ponta | Validação de JWT (JWKS) e Supabase Storage |
| `SUPABASE_JWT_SECRET` | Não (mantida só como referência/fallback — a validação usa JWKS) | — |
| `SUPABASE_STORAGE_BUCKET` | Não (default `avatars`) | Nome do bucket de upload |
| `STRIPE_SECRET_KEY` | **Sim** | API do Stripe (assinaturas) |
| `STRIPE_WEBHOOK_SECRET` | **Sim** | Validação da assinatura do webhook |
| `STRIPE_PRICE_ESSENCIAL` / `STRIPE_PRICE_PRO` | **Sim** | `price_id` mensal de cada plano (lidos na migration de seed) |
| `APP_URL` | **Sim** | URL do frontend para os redirecionamentos do Stripe e links de e-mail |
| `RESEND_API_KEY` | Só para os e-mails saírem de verdade | API do Resend |
| `SENTRY_DSN` | Não (testes forçam vazio automaticamente) | Captura de erro |

Os testes passam sem nenhuma credencial real. Para subir a API localmente,
as variáveis marcadas como **Sim** precisam estar preenchidas (a aplicação
falha rápido, listando só os nomes do que falta — nunca os valores).

### Prontidão para deploy e QA de produção

O backend funciona localmente, mas **ainda não está pronto para um deploy de
produção**. Já resolvido: autenticação real via Supabase Auth, configuração
validada na inicialização (falha rápido se faltar variável obrigatória),
segredos fora do controle de versão, migrations com rollback testado de
ponta a ponta, e todo acesso a dado hoje passa pelo ORM (sem SQL cru fora da
migration). Ainda faltando, antes de qualquer teste real de segurança/
estabilidade em produção: CORS, rate limiting, health check consciente do
banco, verificação de vulnerabilidades de dependências, separação de
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
├── .github/workflows/ci.yml # lint + testes do backend a cada PR
├── docker-compose.dev.yml   # Postgres local (dev + test) para desenvolvimento
├── docs/
│   ├── design/telas/        # mockups estáticos por tela (referência visual, não tocar)
│   └── superpowers/
│       ├── specs/     # design specs aprovados
│       └── plans/     # planos de implementação por fase (um por branch/feature)
└── apps/
    ├── api/                 # backend FastAPI (na main)
    │   ├── app/
    │   │   ├── analytics/   # funções pandas puras (relatório)
    │   │   ├── core/        # config, auth (JWKS), database, sentry, erros
    │   │   ├── jobs/        # comandos avulsos (expirar demandas, sincronizar planos)
    │   │   ├── models/      # SQLAlchemy ORM
    │   │   ├── routers/     # endpoints FastAPI
    │   │   ├── schemas/     # Pydantic
    │   │   ├── services/    # regras de negócio, autorização, billing (único ponto que usa o Stripe)
    │   │   └── storage/     # helper do Supabase Storage
    │   ├── alembic/         # migrations
    │   ├── tests/           # 192 testes, rodando contra Postgres real
    │   └── .env.example
    └── web/                 # frontend Next.js (App Router), integrado ao backend real
        ├── app/             # (public), (auth), (painel) — ver apps/web/README.md
        ├── components/
        └── lib/             # api.ts, supabase-client.ts, use-current-user.ts, validations/
```
