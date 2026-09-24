# Status do projeto — auditoria de retomada

Data da auditoria: 2026-09-21 (atualizado em 2026-09-22 com a rodada de
configuração externa — ver seção específica abaixo)
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
| 3 | Supabase Storage (bucket) e Sentry configurados no backend | ✅ Concluído | Credenciais reais confirmadas por conexão em 2026-09-22 (ver "Rodada de configuração externa" abaixo). O endpoint `POST /perfis/me/avatar` foi implementado no Plano 4 (`apps/api/app/routers/perfis.py`), com testes cobrindo autenticação, formato/tamanho de arquivo e persistência do `avatar_url` (Supabase Storage mockado nos testes). As credenciais reais (`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`) foram perdidas no incidente de perda de credenciais documentado abaixo e `apps/api/.env` está com esses campos em branco — falta reconfirmar o upload de ponta a ponta contra o Storage real quando forem refornecidas. |
| 4 | Validação do token do Supabase Auth + sincronização de perfil | ❌ Não iniciado | Pertence ao Plano 2 (ainda não escrito/executado), por decisão deliberada de escopo — não é um bloqueio, é a próxima etapa. |
| 5 | Endpoints REST: perfis, especialidades, busca, avaliações, contatos | ❌ Não iniciado | Idem — Plano 2. Só existe o endpoint `GET /health`. |
| 6 | Frontend Next.js inicializado + Sentry + cliente HTTP para a API | ❌ Não iniciado | `apps/web/` não existe no repositório. |
| 7 | Páginas construídas (Landing, Cadastro, Busca, Perfil público, Painel, Avaliações) com validação Zod | ❌ Não iniciado | Depende do item 6. |
| 8 | Fluxo de contato (endpoint + e-mail) e criação de avaliação | ❌ Não iniciado | Depende do item 5. |
| 9 | Link de pagamento integrado | ❌ Não iniciado | Planejado para uma etapa posterior (Plano 4). |
| 10 | Relatório com pandas em `app/analytics/` exposto como endpoint | ✅ Concluído | `GET /analytics/relatorio?data_inicio&data_fim` implementado no Plano 5 (`apps/api/app/routers/analytics.py`), com a agregação em funções pandas puras e testáveis (`apps/api/app/analytics/relatorio.py`) separadas da camada de I/O (`apps/api/app/services/relatorio_service.py`). `profissionais_por_especialidade` já reflete dados reais (escritos desde o Plano 2 via `PUT /profissionais/me`); `nota_media_geral` e `volume_contatos_periodo` retornam `null`/`0` até o Plano 3 (avaliações/contatos) ser integrado à `main`, pois é isso que popula essas tabelas. |
| 11 | Workflow de CI (lint + testes) configurado | ❌ Não iniciado | Nenhum arquivo em `.github/workflows/` em nenhuma branch. |
| 12 | `.env.example` e `README.md` completos | 🟡 Parcial | `apps/api/.env.example` existe e está completo (na branch do backend). `README.md` da raiz existe na `main` com resumo de status, mas ainda não tem instruções de setup passo a passo (vai fazer mais sentido depois que a branch do backend for integrada). Falta `apps/web/.env.example` (frontend não existe ainda). |
| 13 | Deploy (backend no Railway/Render, frontend na Vercel) | ❌ Não iniciado | Nenhuma configuração de deploy criada. Depende de credenciais externas (ver bloqueios). |

## Checklist de critérios de aceite

| Critério | Status | Observações |
|---|---|---|
| Backend e frontend rodam localmente sem erro | 🟡 Parcial | Backend: ✅ testado agora — `uvicorn app.main:app` sobe limpo, `GET /health` retorna `200 {"status":"ok"}`. Frontend: ❌ não existe. |
| Cadastro e login funcionam para os dois papéis | ❌ Não iniciado | Depende do item 4 acima (Plano 2). |
| Busca lista profissionais reais, com texto e filtros | ❌ Não iniciado | Depende do item 5. |
| Upload de foto de perfil/logo funciona (Storage) | 🟡 Parcial | Endpoint `POST /perfis/me/avatar` implementado e testado (Plano 4). Falta a verificação de ponta a ponta contra o Storage real — `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` estão em branco em `apps/api/.env` desde o incidente de perda de credenciais. |
| Perfil público exibe dados e avaliações | ❌ Não iniciado | Depende dos itens 5 e 6. |
| Fluxo de contato registra mensagem e dispara e-mail | 🟡 Parcial | `RESEND_API_KEY` confirmada válida (2026-09-22, ver nota sobre o HTTP 401 abaixo); falta o endpoint de contato em si (item 5). |
| Link de pagamento é gerado e abre checkout válido | 🟡 Parcial | `STRIPE_SECRET_KEY` confirmada válida por chamada real à API Stripe (2026-09-22, modo teste); falta a integração em si (Plano 4). |
| Relatório em pandas retorna métricas corretas | 🟡 Parcial | Endpoint implementado e testado com dados sintéticos (Plano 5). Falta apenas dados reais de avaliações/contatos, que dependem do Plano 3 (ainda não integrado à `main`) — `profissionais_por_especialidade` já é real hoje. |
| Erro forçado aparece no Sentry (frontend e backend) | 🟡 Parcial | `SENTRY_DSN` real confirmado por um evento de teste em 2026-09-22, mas foi perdido no incidente de perda de credenciais e está em branco em `apps/api/.env` hoje. Endpoints de negócio já existem (Planos 2-4) e poderiam disparar um erro real assim que o DSN for refornecido — passo manual pendente, não uma tarefa de código. |
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
| Captura de erro (Sentry) | ✅ Concluído | `SENTRY_DSN` real configurado e testado por conexão em 2026-09-22 — evento de teste enviado com sucesso. Falta só exercitar via um erro real de endpoint de negócio, quando esses existirem. |
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

## Rodada de configuração externa (2026-09-22)

Você colou as credenciais reais em `apps/api/.env` (não versionado — segue
só local, nunca commitado). Testei cada uma com uma chamada de conexão real
(não só "a variável existe"), a partir da branch `worktree-backend-foundation`:

| Credencial | Resultado do teste de conexão |
|---|---|
| `DATABASE_URL` | ✅ `SELECT 1` funcionou — segue apontando para o Postgres local via Docker (não mudou para o Supabase; ver nota abaixo). |
| `SUPABASE_URL` | 🔧 **Corrigido por mim.** O valor colado era a URL do *dashboard* (`https://supabase.com/dashboard/project/rhjatedvqqginixlkdxh`), que não é um host de API — retornava HTTP 308 e não autenticaria nada. Troquei para o valor correto do projeto: `https://rhjatedvqqginixlkdxh.supabase.co`, confirmado por uma chamada real à API REST do projeto (HTTP 200) usando a `service_role key` que você colou. |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Autentica corretamente contra o host certo do projeto. |
| `SENTRY_DSN` | ✅ `sentry_sdk.init()` + um evento de teste enviado com sucesso (fica registrado no seu projeto Sentry como "[SaúdeConecta] Teste de conectividade do backend (auditoria de configuração — pode ignorar)" — é só o teste, pode ignorar/arquivar lá). |
| `STRIPE_SECRET_KEY` | ✅ Confirmada por chamada real a `GET /v1/balance` da API do Stripe (HTTP 200). É uma chave de **modo teste** (`sk_test_...`), o que é o esperado nesta fase. |
| `RESEND_API_KEY` | ✅ Válida — mas restrita a **apenas enviar e-mails** (a Resend recusou com HTTP 401 quando testei o endpoint de listar domínios, com a mensagem explícita `"This API key is restricted to only send emails"`). Isso não é um problema, é boa prática de segurança: a chave só pode fazer exatamente o que o backend precisa. Não tentei enviar um e-mail de verdade para não gerar ruído — se quiser, posso confirmar o envio real quando o fluxo de contato existir. |

### Determinação do sistema de JWT do Supabase

Testei diretamente, em vez de só ler a documentação: o projeto
`rhjatedvqqginixlkdxh` **expõe tanto o secret legado quanto o JWKS**
(`{SUPABASE_URL}/auth/v1/.well-known/jwks.json` responde HTTP 200 com 1
chave de assinatura publicada). Como o JWKS está disponível — e é o caminho
recomendado pelo próprio Supabase para projetos que o suportam — a
implementação do Plano 2 vai validar o token via **JWKS**, não via o
`SUPABASE_JWT_SECRET` compartilhado. Vou manter a variável no `.env` como
referência/fallback, mas o código não vai depender dela.

### Pendência que continua em aberto (não é bloqueio)

`DATABASE_URL` ainda aponta para o Postgres local via Docker, não para o
Postgres hospedado no Supabase. Ainda não decidimos se isso deve mudar agora
ou só na hora do deploy — ver item 6 abaixo ("Projeto Supabase de
produção"). Não bloqueia o Plano 2: a validação de JWT do Supabase Auth
funciona independente de onde a tabela `profiles` está hospedada.

## ⛔ Bloqueado — o que precisa de você

Depois da rodada acima, **nenhuma das quatro contas externas continua
bloqueando verificação de ponta a ponta** — Supabase, Sentry, Resend e
Stripe (modo teste) estão todas configuradas e testadas por conexão real.

Os itens abaixo são específicos de **deploy** (só relevantes quando o
projeto chegar nessa etapa — não bloqueiam nenhum plano de implementação
agora):

1. **Escolha de hospedagem do backend** — Railway ou Render (o spec deixa
   as duas como opção equivalente; precisa de uma decisão e da conta criada
   quando chegar a hora).
2. **Projeto Supabase de produção** — decidir se produção usa o mesmo
   projeto `rhjatedvqqginixlkdxh` (mais simples, mas mistura dado de teste
   e produção) ou um projeto Supabase separado só para produção (mais
   seguro, recomendado para dado de saúde, mas exige recriar/migrar o
   schema lá também). Essa decisão também resolve a pendência do
   `DATABASE_URL` acima.
3. **Domínio**, se houver um definido para o produto (frontend na Vercel e
   backend no Railway/Render normalmente ganham subdomínios gratuitos por
   padrão, então isso não é bloqueante — só relevante se houver domínio
   próprio a configurar).
4. **Stripe em modo produção** (chave `sk_live_...`) quando o projeto
   estiver pronto para cobrar de verdade — a chave de teste atual é
   suficiente para todo o desenvolvimento do Plano 4.

## Por onde retomar

Seguindo a ordem da tabela, sem pular etapas: a primeira linha não-✅ é o
**item 4 — validação do token do Supabase Auth + endpoint de sincronização
de perfil**, início do Plano 2. Diferente da auditoria anterior, agora não
há mais nenhuma credencial pendente para isso — Supabase, Sentry, Resend e
Stripe (teste) já estão configurados e confirmados por conexão real. Nada
impede começar o Plano 2 agora.

Próximo passo concreto: escrever o plano de implementação do Plano 2 (auth
via JWKS do Supabase + endpoints REST de perfis/especialidades/busca/
avaliações/contatos), seguindo o mesmo processo do Plano 1 — brainstorm →
plano detalhado → execução tarefa por tarefa com revisão.
