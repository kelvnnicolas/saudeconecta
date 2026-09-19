# SaúdeConecta — Plano Básico (MVP comercial)

Data: 2026-09-19
Status: aprovado para planejamento de implementação

## 1. Contexto de negócio

SaúdeConecta é um marketplace que conecta profissionais de saúde (enfermeiros(as),
técnicos de enfermagem, médicos, fisioterapeutas, fonoaudiólogos(as), nutricionistas,
psicólogos(as), cuidadores(as) de idosos e crianças, entre outras especialidades) a
empresas e pessoas que precisam desses serviços (clínicas, hospitais, empresas de
homecare, operadoras de saúde e famílias). Funciona no espírito de marketplaces como
Airbnb e iFood: perfis verificados, busca com filtros, avaliação pública dos dois lados
e contratação com segurança.

Diferenciais: ampla variedade de especialidades em um único lugar, modelo de via dupla
(profissionais e empresas podem publicar oferta ou demanda) e pontuação bidirecional
para gerar confiança.

Este é o **Plano Básico**: primeira versão publicável, funcional, confiável e com boa
qualidade visual — não um protótipo descartável. Cliente já aprovou escopo e orçamento.

## 2. Escopo desta etapa

1. Cadastro e autenticação de dois tipos de usuário: profissional de saúde e
   empresa/pessoa contratante.
2. Perfil do profissional: dados pessoais, foto (upload), especialidade(s), registro
   profissional (texto livre, sem validação automática), bio curta, cidade/estado,
   faixa de preço.
3. Perfil da empresa/pessoa contratante: dados básicos, foto/logo (upload), tipo
   (clínica, hospital, homecare, pessoa física), cidade/estado.
4. Busca e filtros essenciais: texto (nome, especialidade) via PostgreSQL, filtros por
   cidade/estado, faixa de preço e nota média.
5. Página pública de perfil do profissional, com suas avaliações.
6. Avaliações/pontuação: após um contato, qualquer um dos dois lados pode avaliar o
   outro (nota 1–5 + comentário curto). Sem moderação automática.
7. Contato direto simples: formulário que registra a mensagem e notifica por e-mail
   (não é chat em tempo real).
8. Link de pagamento simples: checkout hospedado (Stripe Payment Links ou Pagar.me
   Link de Pagamento) por solicitação, sem split automático de comissão.
9. Relatório básico da plataforma: endpoint em Python/pandas com métricas (profissionais
   por especialidade, nota média geral, volume de contatos no período).

## 3. Fora de escopo nesta etapa

App mobile nativo; pagamento dentro do app com split automático; chat interno em tempo
real; agendamento com disponibilidade em tempo real; dashboard analítico completo para
empresas; busca geográfica por raio/distância com PostGIS (guardamos lat/long desde já,
sem ordenar por proximidade); matching automático por IA/ML; telemedicina; botão de
emergência/seguro integrado; observabilidade completa (só captura básica de erro via
Sentry); pipeline de CI/CD multi-ambiente com rollback automático (só lint + testes por
PR); containers/orquestração para escala.

Webhook de confirmação automática de pagamento também fica para depois — nesta fase o
`status` do link de pagamento é atualizado manualmente/via endpoint simples, sem
verificação criptográfica de webhook do provedor.

Se qualquer item fora de escopo parecer necessário durante a implementação, sinalizar
antes de implementar — não expandir escopo silenciosamente.

## 4. Stack tecnológico

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14+ (App Router) + TypeScript (strict) |
| UI | Tailwind CSS + shadcn/ui |
| Backend/API | Python 3.11+ + FastAPI |
| ORM/Migrations | SQLAlchemy + Alembic |
| Banco de dados | PostgreSQL (gerenciado — Supabase/Railway) |
| Autenticação | Supabase Auth; backend valida o JWT localmente (JWT secret do Supabase, sem round-trip à API a cada request) |
| Validação backend | Pydantic |
| Validação frontend | Zod + React Hook Form |
| Busca | PostgreSQL `ILIKE` / `pg_trgm` |
| Storage | Supabase Storage |
| Análise de dados | Python + pandas |
| Pagamento | Stripe Payment Links (ou Pagar.me Link de Pagamento) |
| E-mail | Resend, chamado pelo backend |
| Monitoramento | Sentry (free tier), frontend e backend |
| CI/CD | GitHub Actions (lint + testes por PR) + deploy automático (Railway/Render + Vercel) |
| Hospedagem | Backend: Railway ou Render. Frontend: Vercel |

Sem monorepo tooling (Turborepo/workspaces): `apps/web` e `apps/api` são independentes,
cada um com seu próprio gerenciador de dependências (`npm` / `venv`+`requirements.txt`),
já que não há pacotes compartilhados nesta fase.

## 5. Estrutura de pastas

```
saudeconecta/
├── .github/workflows/ci.yml
├── apps/
│   ├── web/                          # Next.js
│   │   ├── app/(public)/{page,buscar,profissional/[id]}
│   │   ├── app/(auth)/{entrar,cadastro/profissional,cadastro/empresa}
│   │   ├── app/(painel)/{perfil,avaliacoes,contatos}
│   │   ├── components/{ui,busca,perfil,avaliacoes}
│   │   └── lib/{api.ts,validations/,sentry.client.config.ts,supabase-client.ts}
│   └── api/                          # FastAPI
│       ├── app/{main.py,core/,models/,schemas/,routers/,services/,storage/,analytics/}
│       ├── alembic/
│       ├── tests/
│       ├── requirements.txt
│       └── .env.example
└── README.md
```

## 6. Modelo de dados

Tabelas SQLAlchemy (nomes em português, snake_case), migrations via Alembic:

- **profiles** — espelha o usuário do Supabase Auth: `id`, `papel`
  (`profissional`|`empresa`), `nome`, `telefone`, `cidade`, `estado`, `latitude`
  (nullable), `longitude` (nullable), `avatar_url`, `criado_em`. Lat/long ficam
  reservados para a busca geográfica futura (PostGIS), preenchidos por geocodificação
  simples da cidade quando possível, sem exigir migração retroativa depois.
- **especialidades** — `id`, `nome`. Seed inicial: Enfermagem, Técnico de Enfermagem,
  Medicina (Clínico Geral), Fisioterapia, Fonoaudiologia, Nutrição, Psicologia,
  Cuidador de Idosos, Cuidador Infantil, Terapia Ocupacional.
- **profissionais** — `user_id` (FK profiles), `registro_profissional` (texto livre),
  `bio`, `preco_hora`, `verificado` (bool, default false).
- **profissional_especialidades** — junção `profissional_id` × `especialidade_id`.
- **empresas** — `user_id` (FK profiles), `nome_fantasia`, `tipo`
  (`clinica`|`hospital`|`homecare`|`pessoa_fisica`), `cidade`, `estado`.
- **avaliacoes** — `id`, `autor_id`, `alvo_id`, `nota` (1–5), `comentario`, `criado_em`.
- **contatos** — `id`, `solicitante_id`, `profissional_id`, `mensagem`, `status`,
  `criado_em`.
- **links_pagamento** — `id`, `contato_id`, `valor`, `status`, `url_checkout`,
  `criado_em`.

### Autorização (camada de serviço do FastAPI)

- Perfis: leitura pública (necessária para a busca); escrita só pelo próprio usuário.
- Avaliações: leitura pública; criação só por quem tem um `contato` registrado com a
  outra parte.
- Contatos: leitura restrita às partes envolvidas (solicitante e profissional).

## 7. Contratos de API que preenchem lacunas do escopo original

- **Autenticação/sync**: `POST /auth/sync` — recebe o JWT do Supabase no header
  `Authorization: Bearer`, valida localmente, faz upsert em `profiles` com os dados do
  cadastro (papel, nome, cidade/estado etc.).
- **Pagamento**: `POST /contatos/{id}/pagamento` — recebe `valor`, cria o Payment Link
  via API do Stripe (ou Pagar.me), grava em `links_pagamento` com `status=pendente`,
  retorna `url_checkout`. Endpoint simples `PATCH /links-pagamento/{id}` para atualizar
  `status` manualmente (sem webhook nesta fase).
- **Relatório**: `GET /analytics/relatorio?data_inicio&data_fim` — roda função pandas em
  `app/analytics/` sobre os dados do Postgres; retorna JSON com profissionais por
  especialidade, nota média geral e volume de contatos no período. Função implementada
  como unidade testável, não em notebook.
- **Contato + e-mail**: `POST /contatos` registra a mensagem e dispara e-mail via Resend
  para o profissional notificado.

## 8. Tratamento de erros e observabilidade

- Erros de validação: `HTTPException` do FastAPI com corpo JSON padronizado
  (`{"detail": ...}`), gerado a partir das mensagens do Pydantic.
- Exceções não tratadas: reportadas ao Sentry (backend via SDK do Sentry para FastAPI;
  frontend via `@sentry/nextjs`), nunca só logadas em console/terminal.
- Frontend valida com Zod antes de enviar (evita round-trip desnecessário), mas a
  validação de negócio final é sempre do backend.

## 9. Testes e CI

- Backend: `pytest` cobrindo `services/` e `analytics/` (funções puras, fáceis de
  testar com dados sintéticos via fixtures).
- Lint backend: `ruff` + `black --check`.
- Lint frontend: `eslint` + `tsc --noEmit` (checagem de tipos como gate de qualidade).
- Sem suíte de testes de UI automatizados nesta fase (fora do escopo do Básico).
- GitHub Actions roda lint + testes em cada PR; deploy automático (Railway/Render +
  Vercel) acontece após merge, sem múltiplos ambientes/rollback automático.

## 10. Variáveis de ambiente

Backend (`apps/api/.env`): `DATABASE_URL`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_STORAGE_BUCKET`,
`STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `SENTRY_DSN`.

Frontend (`apps/web/.env`): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SENTRY_DSN`.

Nesta fase, o scaffold roda com `.env.example` e placeholders documentados; credenciais
reais de serviços externos (Supabase, Stripe/Pagar.me, Resend, Sentry, Railway/Render,
Vercel) serão fornecidas pelo usuário conforme a implementação chegar nas etapas que
precisam delas.

## 11. Critérios de aceite

- Backend e frontend rodam localmente sem erros (`uvicorn` e `npm run dev`).
- Cadastro e login funcionam para os dois papéis de usuário.
- Busca lista profissionais reais do banco, com texto e filtros funcionando.
- Upload de foto de perfil/logo funciona via Storage.
- Perfil público exibe dados e avaliações do profissional.
- Fluxo de contato registra a mensagem e dispara e-mail de notificação.
- Link de pagamento é gerado e abre um checkout válido.
- Relatório em `app/analytics/` retorna métricas corretas a partir de dados reais.
- Erro forçado em ambiente de teste aparece no Sentry (frontend e backend).
- Workflow de CI (lint + testes) passa antes de cada deploy.
- Layout responsivo, testado em mobile e desktop.
- `README.md` permite que qualquer pessoa rode os dois apps do zero.

## 12. Sequenciamento (fases para o plano de implementação)

1. Backend: estrutura FastAPI + SQLAlchemy + Alembic.
2. Conexão Postgres + primeira migration (todas as tabelas).
3. Supabase Storage (bucket) + Sentry no backend.
4. Validação de JWT do Supabase + endpoint de sync de perfil.
5. Endpoints REST: perfis, especialidades, busca (texto/filtros), avaliações, contatos.
6. Frontend: init Next.js + Sentry + cliente HTTP.
7. Páginas: Landing, Cadastro, Busca, Perfil público, Painel, Avaliações (Zod).
8. Fluxo de contato (endpoint + e-mail) e criação de avaliação.
9. Link de pagamento.
10. Relatório em `app/analytics/` com pandas, exposto como endpoint.
11. CI (lint + testes por PR).
12. `.env.example` (dois apps) + `README.md` com setup local e deploy.
13. Deploy: backend (Railway/Render) + frontend (Vercel) — depende de credenciais reais
    fornecidas pelo usuário; documentado no README como passo manual guiado.

Cada fase será validada (rodando localmente / testes) antes de avançar para a próxima,
conforme pedido no escopo original.
