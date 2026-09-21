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

## Checklist de prontidão para deploy e QA de produção (segurança e estabilidade)

Objetivo desta seção: dar visibilidade do que falta resolver antes de fazer
sentido testar segurança e estabilidade em um ambiente de produção real —
separado do checklist de funcionalidades acima, porque um backend pode
passar 100% nos critérios de aceite funcionais e ainda não estar pronto
para produção.

| Item | Status | Observações |
|---|---|---|
| Configuração validada na inicialização | ✅ Concluído | `Settings.database_url` é campo obrigatório (Pydantic) — o processo nem sobe sem `DATABASE_URL` definido, falha rápido em vez de falhar silenciosamente depois. |
| Segredos fora do controle de versão | ✅ Concluído | `apps/api/.env` no `.gitignore`; só `.env.example` com placeholders é versionado. Confirmado que nenhuma chave real foi commitada. |
| Migrations com rollback testado | ✅ Concluído | `alembic upgrade head` / `downgrade base` testados de ponta a ponta contra Postgres real na revisão final do Plano 1 (não só teoria). |
| Acesso a dado via ORM (proteção contra SQL injection) | ✅ Concluído por enquanto | Todo o código hoje usa SQLAlchemy ORM; nenhum SQL cru fora da própria migration (que é código controlado, não input de usuário). Precisa ser reconfirmado quando os endpoints de busca (Plano 2) forem escritos — busca por texto é onde esse tipo de vulnerabilidade costuma aparecer se alguém usar concatenação manual em vez de `ILIKE` parametrizado. |
| Captura de erro (Sentry) | 🟡 Parcial | `init_sentry()` implementado e testado com mock; hoje é um no-op silencioso porque `SENTRY_DSN` está vazio. Sem efeito em produção até a credencial real existir. |
| CORS configurado | ❌ Não iniciado | Nenhum `CORSMiddleware` em `app/main.py`. Obrigatório antes do frontend (Plano 3) conseguir chamar a API de outro domínio — e importante configurar com a lista explícita de origens permitidas, não `allow_origins=["*"]`, já que a API vai lidar com dado de saúde. |
| Rate limiting / proteção contra abuso | ❌ Não iniciado | Nenhum limite de requisição configurado. Relevante antes de expor publicamente endpoints de busca e de contato (que disparam e-mail — um alvo óbvio de abuso). |
| Autenticação e autorização | ❌ Não iniciado | **Maior item de segurança pendente.** Hoje o backend inteiro não tem autenticação — só existe `GET /health`. Faz parte do Plano 2 (validação de JWT do Supabase Auth). Nenhum teste de segurança de acesso faz sentido antes disso existir. |
| Health check consciente de dependências | 🟡 Parcial | `/health` hoje é estático (`{"status":"ok"}`) e não verifica conexão com o banco — um load balancer poderia continuar roteando tráfego para uma instância com o Postgres fora do ar. Recomendado adicionar um `/ready` que rode `SELECT 1` antes do primeiro deploy. |
| Verificação de vulnerabilidades em dependências | ❌ Não iniciado | Nenhum `pip-audit`, `safety` ou Dependabot configurado ainda. |
| CI (lint + testes automáticos a cada PR) | ❌ Não iniciado | Sem isso, nada impede código quebrado (ou uma regressão de segurança) de chegar à branch principal antes de um deploy. |
| Separação de dependências de produção e desenvolvimento | ❌ Não iniciado | `apps/api/requirements.txt` hoje mistura `pytest`/`ruff`/`black` (dev) com as dependências de runtime — tudo isso iria para produção como está. Vale separar em `requirements-dev.txt` antes do primeiro deploy real (reduz superfície de ataque e tamanho da imagem). |
| Nomes de constraints do banco (naming convention) | ❌ Adiado deliberadamente | Decisão registrada na revisão final do Plano 1: sem convenção de nomes, futuras alterações de schema em produção exigem descobrir nomes autogerados pelo Postgres. Barato de resolver agora (nada em produção ainda); fica mais caro depois que houver dado real. Ver `.superpowers/sdd/2026-09-19-backend-foundation/progress.md` na branch `worktree-backend-foundation` para o raciocínio completo. |
| Ambiente de produção (Postgres gerenciado, backend hospedado) | ❌ Não iniciado | Só existem os containers Docker locais (dev/test) usados para desenvolvimento. Nenhuma instância de produção foi criada em Railway/Render/Supabase. |
| Estratégia de segredos em produção | ❌ Não iniciado | Ainda não decidido/documentado como `SENTRY_DSN`, `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY` etc. vão ser injetados no ambiente hospedado (variáveis de ambiente do Railway/Render/Vercel, provavelmente — mas isso precisa ser decidido e documentado antes do deploy, não durante). |
| Teste de carga / estabilidade sob concorrência | ❌ Não iniciado | Nenhum teste de carga rodado ainda. Só faz sentido depois que os endpoints de negócio (Plano 2) existirem — hoje só há um `/health` estático para testar. |

**Leitura recomendada da tabela acima:** os itens ✅ já reduzem risco real
hoje (configuração falha rápido, segredos protegidos, migrations
reversíveis, sem SQL injection óbvio). Os itens ❌ não são bugs — são
trabalho ainda não iniciado, na maioria dos casos porque dependem de algo
que vem depois na sequência (autenticação do Plano 2, ambiente de produção,
etc.). Não há nenhum item aqui que bloqueie o início do Plano 2.

## ⛔ Bloqueado — o que precisa de você

Nada impede a continuação técnica do Plano 2 (auth + endpoints de negócio)
sem essas credenciais — o trabalho de auth/endpoints não depende delas. Mas
os itens abaixo **não podem ser verificados de ponta a ponta** sem contas
externas que só você pode criar:

1. **Supabase** — 🟡 parcial: o projeto `saudeConecta` já existe
   (`rhjatedvqqginixlkdxh`) e o MCP do Supabase já está autenticado e
   conectado. Ainda faltam, especificamente para colocar no
   `apps/api/.env`: a chave de `service_role` e o JWT secret do projeto
   (Project Settings → API e API → JWT Settings) — necessários para
   sincronização de perfil via Supabase Auth (Plano 2) e upload real de
   avatar/logo no Storage.
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

**Adicionalmente, específico para deploy** (só relevante quando o projeto
chegar nessa etapa, não bloqueia nenhum plano de implementação agora):

5. **Escolha de hospedagem do backend** — Railway ou Render (o spec deixa
   as duas como opção equivalente; precisa de uma decisão e da conta criada
   quando chegar a hora).
6. **Projeto Supabase de produção** — decidir se produção usa o mesmo
   projeto `rhjatedvqqginixlkdxh` (mais simples, mas mistura dado de teste
   e produção) ou um projeto Supabase separado só para produção (mais
   seguro, recomendado para dado de saúde, mas exige recriar/migrar o
   schema lá também).
7. **Domínio**, se houver um definido para o produto (frontend na Vercel e
   backend no Railway/Render normalmente ganham subdomínios gratuitos por
   padrão, então isso não é bloqueante — só relevante se houver domínio
   próprio a configurar).

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
