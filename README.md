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
| Plano 1 — Fundação do backend (FastAPI, banco, modelos, migrations, Storage, Sentry) | ✅ Implementado e revisado — branch `worktree-backend-foundation` (ainda não integrada à `main`) |
| Plano 2 — Autenticação (Supabase Auth) + endpoints de negócio (perfis, busca, avaliações, contatos) | ⏳ Não iniciado |
| Plano 3 — Frontend (Next.js) | ⏳ Não iniciado |
| Plano 4 — Link de pagamento + relatório de analytics (pandas) | ⏳ Não iniciado |
| CI (lint + testes por PR) e deploy | ⏳ Não iniciado |

O trabalho é dividido em planos de implementação por fase (cada um validável
e testável sozinho antes de avançar para o próximo), disponíveis em
[`docs/superpowers/plans/`](docs/superpowers/plans/).

### O que já funciona (branch `worktree-backend-foundation`)

- Backend FastAPI + SQLAlchemy 2.0 + Alembic, rodando localmente
- As 8 tabelas do modelo de dados (`profiles`, `especialidades`,
  `profissionais`, `profissional_especialidades`, `empresas`, `avaliacoes`,
  `contatos`, `links_pagamento`), com migration inicial (incluindo índices
  `pg_trgm` para busca por texto e seed das 10 especialidades iniciais)
- Helper de upload para o Supabase Storage
- Inicialização do Sentry (captura de erro)
- Endpoint `GET /health`
- Suíte de testes rodando contra Postgres real via Docker (não SQLite/mocks)

Ainda **fora de escopo** nesta etapa (ver o design spec para a lista
completa): autenticação, endpoints de negócio, frontend, pagamento,
relatório de analytics, CI/CD, deploy.

## Stack tecnológico

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14+ (App Router) + TypeScript |
| Backend/API | Python 3.11+ + FastAPI |
| ORM/Migrations | SQLAlchemy + Alembic |
| Banco de dados | PostgreSQL |
| Autenticação | Supabase Auth |
| Storage | Supabase Storage |
| Pagamento | Stripe Payment Links / Pagar.me Link de Pagamento |
| E-mail | Resend |
| Monitoramento | Sentry |
| CI/CD | GitHub Actions + Railway/Render (backend) + Vercel (frontend) |

Detalhes completos da stack, modelo de dados e critérios de aceite estão no
[design spec](docs/superpowers/specs/2026-09-19-saudeconecta-mvp-design.md).

## Estrutura do repositório

```
saudeconecta/
├── docs/superpowers/
│   ├── specs/     # design specs aprovados
│   └── plans/     # planos de implementação por fase
└── apps/
    ├── api/       # backend FastAPI (branch worktree-backend-foundation)
    └── web/       # frontend Next.js (ainda não iniciado)
```
