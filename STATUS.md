# Status do projeto — auditoria de retomada

Data da auditoria: 2026-09-21
Branch com a implementação: `worktree-backend-foundation` (não integrada à `main`)

## Contexto

Ao contrário do que o prompt de kickoff original presumia, a "sessão anterior"
não parou no meio de uma implementação com erros pendentes — ela seguiu um
processo formal (spec → plano de implementação → execução tarefa por tarefa
com revisão → revisão final de branch → rodada de correção) e **concluiu o
Plano 1 (Fundação do backend) com sucesso**, incluindo uma revisão final que
encontrou e corrigiu 4 problemas antes de considerar o trabalho pronto. O
único "corte" real foi a decisão consciente de manter a branch como está,
sem merge, aguardando definição de prioridade para o Plano 2.

Todos os comandos abaixo foram executados nesta auditoria (não são
suposições) contra a branch `worktree-backend-foundation`, que é onde o
código do backend existe.

## Checklist de implementação (passo a passo do prompt original)

| # | Etapa esperada | Status | Observações |
|---|---|---|---|
| 1 | Backend inicializado (FastAPI + SQLAlchemy + Alembic + estrutura de pastas) | ✅ Concluído | Estrutura completa em `apps/api/app/` (core, models, routers, storage, schemas/services/analytics como placeholders para planos futuros). `pytest`, `black`, `ruff` configurados. |
| 2 | Conexão com PostgreSQL + primeira migration aplicada | ✅ Concluído | Migration `d6a1d35da1f9_initial_schema` cria as 8 tabelas, 4 enums e 2 índices `pg_trgm`, e semeia 10 especialidades. Verificado `alembic current` = head e `\dt` no banco de dev: todas as tabelas presentes, `especialidades` com 10 linhas. |
| 3 | Supabase Storage (bucket) e Sentry configurados no backend | 🟡 Parcial | Código pronto e testado (`app/storage/supabase_storage.py`, `app/core/sentry.py`), mas **sem credenciais reais** — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SENTRY_DSN` estão vazios em `apps/api/.env`. Sentry hoje é um no-op (DSN vazio faz `init_sentry()` não fazer nada); upload real ao Storage falharia por falta de credenciais. |
| 4 | Validação do token do Supabase Auth + sincronização de perfil | ❌ Não iniciado | Pertence ao Plano 2 (ainda não escrito/executado), por decisão deliberada de escopo — não é um bloqueio, é a próxima etapa. |
| 5 | Endpoints REST: perfis, especialidades, busca, avaliações, contatos | ❌ Não iniciado | Idem — Plano 2. Só existe o endpoint `GET /health`. |
| 6 | Frontend Next.js inicializado + Sentry + cliente HTTP para a API | ❌ Não iniciado | `apps/web/` não existe no repositório. |
| 7 | Páginas construídas (Landing, Cadastro, Busca, Perfil público, Painel, Avaliações) com validação Zod | ❌ Não iniciado | Depende do item 6. |
| 8 | Fluxo de contato (endpoint + e-mail) e criação de avaliação | ❌ Não iniciado | Depende do item 5. |
| 9 | Link de pagamento integrado | ❌ Não iniciado | Planejado para uma etapa posterior (Plano 4). |
| 10 | Relatório com pandas em `app/analytics/` exposto como endpoint | ❌ Não iniciado | `app/analytics/` existe só como pacote vazio, reservado. |
| 11 | Workflow de CI (lint + testes) configurado | ❌ Não iniciado | Nenhum arquivo em `.github/workflows/` em nenhuma branch. |
| 12 | `.env.example` e `README.md` completos | 🟡 Parcial | `apps/api/.env.example` existe e está completo (na branch do backend). `README.md` da raiz existe na `main` com resumo de status, mas ainda não tem instruções de setup passo a passo (vai fazer mais sentido depois que a branch do backend for integrada). Falta `apps/web/.env.example` (frontend não existe ainda). |
| 13 | Deploy (backend no Railway/Render, frontend na Vercel) | ❌ Não iniciado | Nenhuma configuração de deploy criada. Depende de credenciais externas (ver bloqueios). |

## Checklist de critérios de aceite

| Critério | Status | Observações |
|---|---|---|
| Backend e frontend rodam localmente sem erro | 🟡 Parcial | Backend: ✅ testado agora — `uvicorn app.main:app` sobe limpo, `GET /health` retorna `200 {"status":"ok"}`. Frontend: ❌ não existe. |
| Cadastro e login funcionam para os dois papéis | ❌ Não iniciado | Depende do item 4 acima (Plano 2). |
| Busca lista profissionais reais, com texto e filtros | ❌ Não iniciado | Depende do item 5. |
| Upload de foto de perfil/logo funciona (Storage) | ⛔ Bloqueado | Código pronto e testado com mocks; falta `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` reais para funcionar de fato. |
| Perfil público exibe dados e avaliações | ❌ Não iniciado | Depende dos itens 5 e 6. |
| Fluxo de contato registra mensagem e dispara e-mail | ⛔ Bloqueado | Endpoint ainda não existe (item 5) **e** depende de `RESEND_API_KEY`. |
| Link de pagamento é gerado e abre checkout válido | ⛔ Bloqueado | Não implementado ainda; depende de `STRIPE_SECRET_KEY` (ou credencial Pagar.me). |
| Relatório em pandas retorna métricas corretas | ❌ Não iniciado | Não implementado ainda (item 10). |
| Erro forçado aparece no Sentry (frontend e backend) | ⛔ Bloqueado | `init_sentry()` implementado e testado (com mock), mas não há como verificar de ponta a ponta sem `SENTRY_DSN` real. |
| CI (lint + testes) passa | 🟡 Parcial | `pytest`, `black --check` e `ruff check` passam localmente (11/11 testes, 0 findings) — verificado agora. Não há workflow de CI configurado ainda (item 11). |
| Layout responsivo (mobile e desktop) | ❌ Não iniciado | Frontend não existe. |
| README permite rodar o projeto do zero | 🟡 Parcial | README atual (na `main`) documenta status e stack, mas ainda não tem passo a passo de setup local — decisão consciente de escrever isso quando a branch do backend for integrada à `main`, para não documentar comandos que ainda não existem no branch principal. |

## ⛔ Bloqueado — o que precisa de você

Nada impede a continuação técnica do Plano 2 (auth + endpoints de negócio)
sem essas credenciais — o trabalho de auth/endpoints não depende delas. Mas
os itens abaixo **não podem ser verificados de ponta a ponta** sem contas
externas que só você pode criar:

1. **Supabase** — preciso do projeto criado (URL, chave de service role e o
   JWT secret) para: sincronização de perfil via Supabase Auth (Plano 2),
   upload real de avatar/logo no Storage.
2. **Sentry** — preciso de um projeto Sentry (DSN) para verificar captura de
   erro de ponta a ponta; sem isso o `init_sentry()` continua sendo um no-op
   silencioso (comportamento correto, só não é verificável).
3. **Resend** — preciso de uma API key para o envio de e-mail no fluxo de
   contato (ainda não implementado, mas vai precisar disso assim que for).
4. **Stripe (ou Pagar.me)** — preciso da chave secreta para gerar links de
   pagamento (etapa posterior, Plano 4).

Nenhum desses bloqueia o início do Plano 2 (auth + endpoints) — só bloqueia
os itens de Storage, Sentry, e-mail e pagamento serem *verificados* de
verdade em vez de só implementados com testes mockados.

## Por onde retomar

Seguindo a ordem da tabela, sem pular etapas: a primeira linha não-✅ é o
**item 4 — validação do token do Supabase Auth + endpoint de sincronização
de perfil**, que é exatamente o começo do "Plano 2" já previsto na
sequência original. Isso pode começar **antes** de você configurar as
contas externas listadas acima — só a verificação de ponta a ponta do
Storage/Sentry/e-mail/pagamento depende delas.

Recomendação: comece o Plano 2 (que vai cobrir os itens 4 e 5 da tabela —
auth + endpoints REST de perfis/especialidades/busca/avaliações/contatos)
enquanto você providencia as credenciais do Supabase em paralelo, já que o
item 4 especificamente (sync de perfil) vai precisar do `SUPABASE_JWT_SECRET`
real para ser testado de ponta a ponta (os testes unitários podem usar um
segredo de teste, mas a verificação real exige o projeto Supabase existir).
