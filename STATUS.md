# Status do projeto

Última atualização: 2026-09-24 — branch `feature/b2b-assinatura-demandas`
(assinatura B2B + demandas + CI). Tudo o que está marcado como concluído abaixo
foi verificado rodando comandos, não por suposição.

## Resumo

- **Backend**: Planos 1–5 integrados à `main` (fundação, auth, perfis, busca,
  avaliações, contatos, avatar, analytics). Esta branch adiciona assinatura
  B2B recorrente (Stripe), demandas, proteção de LGPD no Sentry e CI.
- **Testes**: 177 passando (`pytest`), `black --check` e `ruff check` limpos,
  inclusive em Python 3.11 (versão alvo). Nenhum teste chama serviço real.
- **Frontend**: não iniciado.
- **Bloqueado**: teste manual ponta a ponta com o Stripe real — depende de
  configurações que só você pode fazer (seção
  [⛔ Bloqueado](#-bloqueado--o-que-precisa-de-você)).

## Checklist de implementação (sequência do spec original)

| # | Etapa | Status | Observações |
|---|---|---|---|
| 1 | Backend inicializado (FastAPI + SQLAlchemy + Alembic) | ✅ | Plano 1. |
| 2 | Postgres + migrations | ✅ | 8 migrations lineares (`alembic heads` = 1), todas com `downgrade` testado ida e volta. |
| 3 | Supabase Storage + Sentry no backend | ✅ | Upload de avatar em `POST /perfis/me/avatar` (Plano 4). Storage real ainda não reconfirmado de ponta a ponta — credenciais perdidas no incidente de 2026-09-22 (ver abaixo). |
| 4 | Validação de JWT do Supabase + sync de perfil | ✅ | Plano 2 — JWKS, `POST /auth/sync`. |
| 5 | Endpoints REST: perfis, especialidades, busca, avaliações, contatos | ✅ | Planos 2 e 3. |
| 6 | Frontend Next.js + Sentry + cliente HTTP | ❌ Não iniciado | `apps/web/` não existe. |
| 7 | Páginas (Landing, Cadastro, Busca, Perfil, Painel, Avaliações) | ❌ Não iniciado | Depende do item 6. |
| 8 | Fluxo de contato (+ e-mail) e criação de avaliação | ✅ | Plano 3. Contatos gerados por demanda seguem o mesmo fluxo. |
| 9 | Link de pagamento por contato | ❌ Não iniciado | Diferente da assinatura B2B desta branch: é a cobrança do *serviço* entre empresa e profissional (`POST /contatos/{id}/pagamento`). |
| 10 | Relatório com pandas | ✅ | Plano 5 — `GET /analytics/relatorio`. |
| 11 | CI (lint + testes por PR) | ✅ | Esta branch — `.github/workflows/ci.yml` (Postgres 16 + Python 3.11). |
| 12 | `.env.example` + `README.md` | 🟡 Parcial | Backend completo, incluindo setup do Stripe CLI. Falta `apps/web/.env.example` (frontend não existe). |
| 13 | Deploy | ❌ Não iniciado | Depende de decisões de hospedagem (ver bloqueios de deploy). |

## Assinatura B2B e demandas (`feature/b2b-assinatura-demandas`)

| Item da definição de pronto | Status | Observações |
|---|---|---|
| Migrations aplicam e revertem | ✅ | `planos` (com seed dos 2 planos a partir do `.env`), `assinaturas`, `eventos_stripe`, `demandas`, `contatos.origem/demanda_id`. Ida e volta coberta por `tests/test_migrations.py`. |
| Endpoints das seções 6 e 8, documentados no `/docs` | ✅ | Todos com schema de resposta e os `code` de erro por status (verificado no `/openapi.json`). |
| Webhook: assinatura, idempotência, `Subscription.retrieve` | ✅ | Testado com payloads assinados de verdade (HMAC), não com `construct_event` mockado. |
| Testes da seção 13 | ✅ | Webhook, entitlements (um por linha da tabela), checkout, demandas, LGPD. |
| CI verde | 🟡 | Workflow criado nesta branch; o primeiro run acontece ao abrir o PR. |
| Teste manual ponta a ponta com Stripe CLI | ⛔ Bloqueado | Ver abaixo — faltam price ids, Customer Portal, `whsec_` e o Stripe CLI instalado. |
| `.env.example` e `README.md` | ✅ | Inclui passo a passo do Stripe (modo de teste) e do `stripe listen`. |
| Nenhum arquivo de `apps/web` alterado | ✅ | `apps/web` nem existe. |

### Decisões e desvios da especificação

1. **RLS**: o projeto não tinha padrão de RLS (decisão documentada: autorização na
   camada de serviço, API conectando como o role dono das tabelas). Nas 4
   tabelas novas o RLS foi **ativado** — o dono ignora RLS, então a API não é
   afetada, mas o acesso direto via PostgREST (`anon`/`authenticated`) fica
   bloqueado se o banco for o do Supabase. As policies de leitura de
   `demandas` só são criadas onde o schema `auth` existe (Supabase), porque o
   Postgres local/CI não tem `auth.uid()`; o SQL delas foi validado num banco
   descartável simulando esse schema. As tabelas antigas continuam **sem**
   RLS — risco pré-existente, fora do escopo desta etapa.
2. **Checkout abandonado**: uma linha `incomplete` sem subscription (usuário fechou
   o Checkout) nunca é encerrada por webhook — pela spec literal a empresa ficaria
   bloqueada com 409 para sempre. O checkout reaproveita essa linha; o 409 vale
   quando já existe subscription real.
3. **Limites dos planos** (não definidos na spec): `essencial` = 5 demandas
   abertas, `pro` = ilimitado. Ajuste em `alembic/versions/afbbf49c8fb1_create_planos.py`
   (ou `UPDATE planos`).
4. **`STRIPE_SECRET_KEY`** também passou a falhar rápido (sem ela nenhuma
   rota de assinatura funciona). A mensagem de erro de boot lista só os
   **nomes** das variáveis — a mensagem padrão do Pydantic incluiria os valores
   (inclusive segredos) no log.
5. **E-mail de falha de pagamento** aponta para `APP_URL/empresa/assinatura`, não
   para uma sessão do Portal: sessões do Portal expiram em minutos e não servem
   num e-mail. A página do frontend chama `POST /assinaturas/portal`.
6. **Contato por demanda**: `solicitante_id` = empresa dona, `profissional_id` =
   profissional interessado; `mensagem` = texto opcional do profissional ou um
   padrão. Assim aparece em `GET /contatos` para os dois e libera avaliação.
7. **API do Stripe**: SDK `stripe==15.6.1` fixa a versão `2026-08-26.dahlia`.
   Nela, `current_period_end` fica nos **itens** da subscription, e é de lá que
   o código lê. `invoice.payment_failed` identifica a empresa pelo `customer`
   da invoice (estável entre versões).
8. **Sentry/LGPD**: além do `before_send` pedido, `before_send_transaction` também
   filtra, e a captura de variáveis locais foi desligada por completo.

## ⛔ Bloqueado — o que precisa de você

### Para o teste manual ponta a ponta (Stripe, modo de teste)

Estado verificado em 2026-09-24 no `apps/api/.env` local (só presença/tamanho,
nenhum valor lido): `STRIPE_SECRET_KEY` vazia; `STRIPE_WEBHOOK_SECRET`,
`STRIPE_PRICE_ESSENCIAL`, `STRIPE_PRICE_PRO` e `APP_URL` ausentes; Stripe CLI
não instalado. **Com isso a API local não sobe** (falha rápido, por design).

1. ⛔ Chave secreta de teste (`sk_test_...`) em `STRIPE_SECRET_KEY`.
2. ⛔ Criar no painel (modo de teste) os produtos **Essencial** e **Pro**, cada um com
   preço mensal recorrente, e colocar os `price_...` em `STRIPE_PRICE_ESSENCIAL` e
   `STRIPE_PRICE_PRO`. Se as migrations já tiverem rodado antes, depois rode
   `python -m app.jobs.sincronizar_planos`.
3. ⛔ Ativar e salvar o **Customer Portal** (Settings → Billing → Customer portal).
4. ⛔ Instalar o Stripe CLI, rodar `stripe listen --forward-to localhost:8000/webhooks/stripe`
   e colocar o `whsec_...` exibido em `STRIPE_WEBHOOK_SECRET`.
5. `APP_URL=http://localhost:3000` (não é segredo; ainda não há frontend, então os
   redirecionamentos do Checkout vão para uma página inexistente — esperado).

Roteiro do teste, a registrar aqui quando rodar: assinar com `4242 4242 4242 4242`
→ publicar demanda → profissional de teste demonstra interesse → contato aparece
para os dois em `GET /contatos` → simular falha de pagamento → `POST /demandas`
responde 402 `pagamento_pendente` → cancelar pelo Portal → status `canceled`.
**Resultado: não executado (bloqueado pelos itens 1–4).**

### Credenciais perdidas (incidente de 2026-09-22)

As credenciais reais coladas em 2026-09-22 (Supabase, Sentry, Resend, Stripe
teste) foram perdidas junto com o worktree onde estava o `.env`. O
`apps/api/.env` atual tem esses campos vazios. Para reconfirmar Storage, e-mail
e Sentry de ponta a ponta, é preciso fornecê-las de novo.

### Para o deploy (não bloqueia implementação)

1. Hospedagem do backend (Render free / Railway / outra).
2. Projeto Supabase de produção: o mesmo `rhjatedvqqginixlkdxh` ou um separado
   (recomendado para dado de saúde) — decide também o `DATABASE_URL` de produção.
3. Domínio próprio, se houver.
4. Stripe em modo produção (`sk_live_...`, produtos/preços e webhook de produção).

## Checklist de critérios de aceite do MVP

| Critério | Status | Observações |
|---|---|---|
| Backend e frontend rodam localmente | 🟡 | Backend ✅ (com as variáveis obrigatórias preenchidas). Frontend não existe. |
| Cadastro e login para os dois papéis | 🟡 | Backend ✅ (JWT via JWKS + `/auth/sync`); falta a UI. |
| Busca com texto e filtros | 🟡 | Backend ✅ (`GET /profissionais`); falta a UI. |
| Upload de foto/logo | 🟡 | Endpoint ✅; falta reconfirmar contra o Storage real (credenciais). |
| Perfil público com avaliações | 🟡 | Backend ✅; falta a UI. |
| Contato registra mensagem e envia e-mail | 🟡 | Backend ✅; envio real depende de `RESEND_API_KEY`. |
| Link de pagamento abre checkout válido | ❌ | Item 9 não iniciado (a assinatura B2B desta branch é outra coisa). |
| Relatório pandas retorna métricas corretas | ✅ | Plano 5, com dados reais desde a integração do Plano 3. |
| Erro forçado aparece no Sentry | 🟡 | Código pronto; passo manual pendente de `SENTRY_DSN` real. |
| CI (lint + testes) passa | 🟡 | Workflow criado; primeiro run no PR. |
| Layout responsivo | ❌ | Frontend não existe. |
| README permite rodar do zero | ✅ | Backend, incluindo Stripe CLI. |

## Checklist de prontidão para produção (segurança e estabilidade)

| Item | Status | Observações |
|---|---|---|
| Configuração validada na inicialização | ✅ | Variáveis obrigatórias falham rápido, listando só os nomes. |
| Segredos fora do controle de versão | ✅ | `.env` no `.gitignore`; testes forçam valores fictícios. |
| Migrations com rollback testado | ✅ | Ida e volta em `tests/test_migrations.py`. |
| Acesso a dado via ORM | ✅ | Nenhum SQL cru com input de usuário. |
| Autenticação e autorização | ✅ | JWT via JWKS; regras na camada de serviço; RLS nas tabelas novas. Tabelas antigas sem RLS (ver desvio 1). |
| Webhook de pagamento seguro | ✅ | Assinatura HMAC validada no corpo bruto, idempotência, sem payload armazenado. |
| LGPD no Sentry | ✅ | `descricao`/`mensagem` filtradas; teste de ponta a ponta com o SDK real. |
| CI | 🟡 | Criado nesta branch. |
| CORS | ❌ | Obrigatório antes do frontend — lista explícita de origens, nunca `*`. |
| Rate limiting | ❌ | Relevante para busca, contato, interesse em demanda e checkout. |
| Health check consciente do banco | 🟡 | `/health` é estático; recomendado `/ready` com `SELECT 1`. |
| Verificação de vulnerabilidades de dependências | ❌ | Sem `pip-audit`/Dependabot. |
| Dependências de produção x desenvolvimento | ❌ | `requirements.txt` mistura `pytest`/`ruff`/`black` com runtime. |
| Convenção de nomes de constraints | ❌ Adiado | Decisão do Plano 1; fica mais cara quando houver dado real. |
| Ambiente e segredos de produção | ❌ | Ver bloqueios de deploy. |
| Agendamento do job de expiração | ❌ | `python -m app.jobs.expirar_demandas` existe; falta agendar (cron da hospedagem). As leituras já tratam demanda vencida como expirada, então o atraso do job não expõe nada. |

## Por onde retomar

1. Destravar os itens ⛔ do Stripe e rodar o teste manual ponta a ponta,
   registrando o resultado acima.
2. Revisar e integrar o PR de `feature/b2b-assinatura-demandas`.
3. Próximas etapas do MVP: link de pagamento por contato (item 9), CORS + rate
   limiting, frontend, deploy.
