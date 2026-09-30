# Status do projeto

Última atualização: 2026-09-29 — `main` (74 commits), em produção real com
cliente. Tudo o que está marcado como concluído abaixo foi verificado rodando
comandos ou testando ao vivo, não por suposição. Este arquivo ficou parado
entre 2026-09-24 e 2026-09-29 enquanto o frontend inteiro foi construído —
a seção [O que mudou desde 2026-09-24](#o-que-mudou-desde-2026-09-24) resume
essa lacuna.

## Resumo

- **Backend**: todos os endpoints do spec original do MVP implementados e
  testados, exceto o link de pagamento por contato (item 9 abaixo — adiado
  de propósito, não esquecido). Em produção no Render:
  `https://saudeconecta-api.onrender.com` (free tier — "esfria" após
  inatividade, primeiro request depois de um tempo ocioso leva ~15s).
- **Frontend**: completo e em produção na Vercel
  (`https://saudeconecta-pi.vercel.app`), App Router + Supabase Auth (e-mail,
  Google, LinkedIn), tema claro/escuro, todas as telas do spec original mais
  chat e aceite de demanda direta dentro de Contato.
- **Testes**: 205 passando (`pytest`, backend), `tsc --noEmit` limpo
  (frontend — sem suíte automatizada de frontend ainda). CI verde a cada PR.
- **Bloqueado**: nada crítico no momento — os bloqueios de 2026-09-24 (Stripe,
  credenciais) foram resolvidos. Ver
  [O que falta](#o-que-falta-2026-09-29) para os gaps reais atuais.

## O que mudou desde 2026-09-24

Frontend Next.js inteiro construído e publicado (Vercel), autenticação social
(Google + LinkedIn, substituindo a tentativa inicial com Facebook), correção
de bugs de UX real (mensagens de erro cruas tipo `nao_elegivel` chegando ao
usuário, campo obrigatório que devia ser opcional, zoom/acessibilidade em
mobile), tema claro/escuro com padrão correto, polish de design (hierarquia
tipográfica, terceiro nível de texto), e a primeira funcionalidade que vai
além do spec original: **chat + aceite de demanda direta** dentro de um
`Contato` já existente (`mensagens_contato`, `Contato.aceito_em`,
`GET/POST /contatos/{id}/mensagens`, `POST /contatos/{id}/aceitar`) — ver
[`docs/superpowers/specs/2026-09-29-chat-aceite-demanda-direta-design.md`](docs/superpowers/specs/2026-09-29-chat-aceite-demanda-direta-design.md).
CORS também foi configurado nesse meio tempo (`CORSMiddleware` em
`app/main.py`) — o item 13 da checklist de prontidão abaixo, marcado ❌ em
2026-09-24, já está resolvido.

## Checklist de implementação (sequência do spec original)

| # | Etapa | Status | Observações |
|---|---|---|---|
| 1 | Backend inicializado (FastAPI + SQLAlchemy + Alembic) | ✅ | Plano 1. |
| 2 | Postgres + migrations | ✅ | 10 migrations lineares (`alembic heads` = 1), todas com `downgrade` testado ida e volta. |
| 3 | Supabase Storage + Sentry no backend | ✅ | Upload de avatar em `POST /perfis/me/avatar` (Plano 4). |
| 4 | Validação de JWT do Supabase + sync de perfil | ✅ | Plano 2 — JWKS, `POST /auth/sync`. |
| 5 | Endpoints REST: perfis, especialidades, busca, avaliações, contatos | ✅ | Planos 2 e 3. |
| 6 | Frontend Next.js + Sentry + cliente HTTP | ✅ | `apps/web/` completo, em produção na Vercel. |
| 7 | Páginas (Landing, Cadastro, Busca, Perfil, Painel, Avaliações) | ✅ | Todas construídas e testadas ao vivo. |
| 8 | Fluxo de contato (+ e-mail) e criação de avaliação | ✅ | Plano 3. Contatos gerados por demanda seguem o mesmo fluxo. Chat completo adicionado em 2026-09-29 (além do escopo original). |
| 9 | Link de pagamento por contato | ❌ Não iniciado | Diferente da assinatura B2B: é a cobrança do *serviço* entre empresa e profissional (`POST /contatos/{id}/pagamento`). Adiado duas vezes por decisão consciente — chat + aceite de demanda direta (2026-09-29) cobre o mesmo gatilho sem depender de pagamento. |
| 10 | Relatório com pandas | ✅ | Plano 5 — `GET /analytics/relatorio`. |
| 11 | CI (lint + testes por PR) | ✅ | `.github/workflows/ci.yml` (Postgres 16 + Python 3.11). |
| 12 | `.env.example` + `README.md` | ✅ | Backend e frontend, incluindo Stripe CLI e Supabase. |
| 13 | Deploy | ✅ | Backend no Render, frontend na Vercel, ambos em produção. |

## Assinatura B2B e demandas (`feature/b2b-assinatura-demandas`)

| Item da definição de pronto | Status | Observações |
|---|---|---|
| Migrations aplicam e revertem | ✅ | `planos` (com seed dos 2 planos a partir do `.env`), `assinaturas`, `eventos_stripe`, `demandas`, `contatos.origem/demanda_id`. Ida e volta coberta por `tests/test_migrations.py`. |
| Endpoints das seções 6 e 8, documentados no `/docs` | ✅ | Todos com schema de resposta e os `code` de erro por status (verificado no `/openapi.json`). |
| Webhook: assinatura, idempotência, `Subscription.retrieve` | ✅ | Testado com payloads assinados de verdade (HMAC), não com `construct_event` mockado. |
| Testes da seção 13 | ✅ | Webhook, entitlements (um por linha da tabela), checkout, demandas, LGPD. |
| CI verde | ✅ | Primeiro run no PR #1: `Backend (lint + testes)` passou em 57s. O check `Vercel` falha por outro motivo (ver abaixo). |
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
   descartável simulando esse schema, mas nenhum teste automatizado o exercita.
   A policy de profissional consulta `profiles`: se `profiles` ganhar RLS um
   dia, ela precisa ser revista. As tabelas antigas (inclusive `contatos`, que
   agora também guarda mensagens de interesse) continuam **sem** RLS — risco
   pré-existente, fora do escopo desta etapa.
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
   filtra, e a captura de variáveis locais foi desligada por completo. A revisão
   independente achou um vazamento que o teste original não cobria: o texto de
   erros do banco (o próprio Postgres cita valores, ex. `Failing row contains
   (...)`) levava `descricao`/`mensagem` ao Sentry e ao log do uvicorn. Corrigido
   com `hide_parameters`, filtro da mensagem de qualquer erro SQL no Sentry e um
   tratador que devolve 500 genérico e loga só o tipo do erro.
9. **Webhook — erros permanentes respondem 200** (desvio do item 6.2.7): eventos
   que nunca vão se aplicar (subscription duplicada, subscription sem assinatura
   local) são gravados em `eventos_stripe.erro`, alertados no Sentry e respondidos
   com 200 — com 500 o Stripe reenviaria por dias sem chance de sucesso. Erros
   transitórios (Stripe/banco fora do ar) continuam 500 para o Stripe reenviar.
10. **Checkout nunca deixa duas sessões pagáveis**: antes de criar uma sessão nova,
    a anterior ainda aberta é expirada; se ela já foi paga, responde 409
    `assinatura_em_processamento`. Sem isso a empresa podia ser cobrada duas vezes.
11. **Códigos de erro adicionais** (além dos da seção 7): `plano_inexistente`,
    `assinatura_existente`, `assinatura_em_processamento`, `assinatura_inexistente`,
    `stripe_indisponivel` (502), `apenas_empresas`, `apenas_profissionais`,
    `demanda_inexistente`, `especialidade_inexistente`, `transicao_invalida`,
    `interesse_existente`, `demanda_indisponivel` (410),
    `perfil_profissional_incompleto`, `assinatura_webhook_invalida`.

### Ponto de produto em aberto

- **Avaliação via demanda**: como a spec pede que o contato gerado pela demanda siga
  o fluxo existente até a avaliação, um profissional que demonstra interesse passa a
  poder **avaliar a empresa** — sem que a empresa tenha feito nada além de publicar.
  A mesma assimetria já existia no sentido oposto (qualquer empresa que envia um
  contato pode avaliar o profissional). Se isso não for desejado, a regra natural é
  exigir que o contato tenha sido respondido antes de liberar avaliação (nos dois
  sentidos) — mudança pequena, mas de regra de negócio, então não foi feita sem
  confirmação.
- **Troca de conta Stripe (teste → produção)**: o `stripe_customer_id` salvo é
  reutilizado nos próximos checkouts; ids do modo de teste não existem no modo de
  produção. Produção deve começar com banco próprio (já recomendado abaixo).

## ⛔ Bloqueado — o que precisa de você

Nada crítico agora. Os dois bloqueios de 2026-09-24 (credenciais perdidas,
Stripe não configurado) foram resolvidos — `apps/api/.env` tem valores reais
e o fluxo de checkout já foi testado ao vivo com conta descartável nesta
sessão. Histórico mantido abaixo por rastreabilidade.

<details>
<summary>Histórico: bloqueios de 2026-09-24 (resolvidos)</summary>

### Teste manual ponta a ponta (Stripe, modo de teste)

Estado em 2026-09-24: `STRIPE_SECRET_KEY` vazia; `STRIPE_WEBHOOK_SECRET`,
`STRIPE_PRICE_ESSENCIAL`, `STRIPE_PRICE_PRO` e `APP_URL` ausentes; Stripe CLI
não instalado. Resolvido — essas variáveis estão preenchidas e o checkout foi
exercitado de ponta a ponta (incluindo o bug do código de erro cru
`nao_elegivel` que chegava ao usuário, corrigido em `fix/checkout-error-message`).

### Credenciais perdidas (incidente de 2026-09-22)

As credenciais reais coladas em 2026-09-22 (Supabase, Sentry, Resend, Stripe
teste) foram perdidas junto com o worktree onde estava o `.env`. Foram
re-inseridas; `apps/api/.env` e `apps/web/.env.local` têm valores reais hoje.

</details>

### Para produção completa (não bloqueia — refinamentos)

1. Domínio próprio, se houver (hoje: `*.vercel.app` / `*.onrender.com`).
2. Stripe em modo produção (`sk_live_...`, produtos/preços e webhook de
   produção) — o fluxo foi validado só em modo de teste até agora.
3. Confirmar se o projeto Supabase atual (`rhjatedvqqginixlkdxh`) é o de
   produção definitivo ou se vale separar um dedicado (dado de saúde) —
   decisão de produto, não travada tecnicamente.
4. Plano pago do Render, se o cold-start de ~15s do free tier incomodar
   usuários reais.

## Checklist de critérios de aceite do MVP

| Critério | Status | Observações |
|---|---|---|
| Backend e frontend rodam localmente | ✅ | Backend (`.venv` + Postgres via Docker) e frontend (`npm run dev`) rodando lado a lado nesta sessão. |
| Cadastro e login para os dois papéis | ✅ | E-mail, Google e LinkedIn (LinkedIn com código pronto em PR #10, pendente só de config externa — ver [Pendências externas](#pendências-externas-fora-do-código)). |
| Busca com texto e filtros | ✅ | `/buscar` completo, testado ao vivo. |
| Upload de foto/logo | 🟡 | Endpoint ✅ e usado pela UI; Storage real não reconfirmado nesta rodada de verificação. |
| Perfil público com avaliações | ✅ | Testado ao vivo, com estrela em destaque (polish de design). |
| Contato registra mensagem e envia e-mail | ✅ | Mais chat completo (2026-09-29). |
| Link de pagamento abre checkout válido | ❌ | Item 9 segue não implementado (decisão consciente, ver acima). |
| Relatório pandas retorna métricas corretas | ✅ | Plano 5, com dados reais. |
| Erro forçado aparece no Sentry | 🟡 | Código pronto; não reconfirmado nesta rodada. |
| CI (lint + testes) passa | ✅ | GitHub Actions verde a cada PR. |
| Layout responsivo | ✅ | Verificado em viewport mobile emulado; zoom/pinch corrigido em `fix/viewport-zoom`. |
| README permite rodar do zero | ✅ | Backend e frontend. |

## Checklist de prontidão para produção (segurança e estabilidade)

| Item | Status | Observações |
|---|---|---|
| Configuração validada na inicialização | ✅ | Variáveis obrigatórias falham rápido, listando só os nomes. |
| Segredos fora do controle de versão | ✅ | `.env` no `.gitignore`; testes forçam valores fictícios. |
| Migrations com rollback testado | ✅ | Ida e volta em `tests/test_migrations.py` (10 migrations). |
| Acesso a dado via ORM | ✅ | Nenhum SQL cru com input de usuário. |
| Autenticação e autorização | ✅ | JWT via JWKS; regras na camada de serviço; RLS em `planos`/`assinaturas`/`eventos_stripe`/`demandas`/`mensagens_contato`. `contatos` e tabelas mais antigas seguem sem RLS (risco pré-existente, ver desvio 1). |
| Webhook de pagamento seguro | ✅ | Assinatura HMAC validada no corpo bruto, idempotência, sem payload armazenado. |
| LGPD no Sentry | ✅ | `descricao`/`mensagem` filtradas; teste de ponta a ponta com o SDK real. |
| CI | ✅ | GitHub Actions a cada PR/push na `main`. |
| CORS | ✅ | `CORSMiddleware` em `app/main.py`, origem única (`app_url`), configurado depois de 2026-09-24. |
| Rate limiting | 🟡 | `slowapi` em busca/contato/mensagens/interesse/checkout — código pronto em [PR #12](https://github.com/kelvnnicolas/saudeconecta/pull/12), aguardando merge. |
| Health check consciente do banco | 🟡 | `/ready` com `SELECT 1` pronto em [PR #12](https://github.com/kelvnnicolas/saudeconecta/pull/12), aguardando merge. |
| Verificação de vulnerabilidades de dependências | 🟡 | `.github/dependabot.yml` pronto em [PR #12](https://github.com/kelvnnicolas/saudeconecta/pull/12), aguardando merge. |
| Dependências de produção x desenvolvimento | 🟡 | Split em `requirements.txt`/`requirements-dev.txt` pronto em [PR #12](https://github.com/kelvnnicolas/saudeconecta/pull/12), aguardando merge. |
| Convenção de nomes de constraints | ❌ Adiado | Decisão do Plano 1; fica mais cara quando houver dado real. |
| Ambiente e segredos de produção | ✅ | Render + Vercel com variáveis reais preenchidas. |
| Agendamento do job de expiração | 🟡 | Workflow agendado (`expirar-demandas.yml`, diário 3h UTC) pronto em [PR #12](https://github.com/kelvnnicolas/saudeconecta/pull/12) — Render Cron Job não tem tier grátis (cobraria mensalmente, decisão de custo não tomada sem confirmar), então ficou em GitHub Actions. Falta o secret `PROD_DATABASE_URL` no repositório antes de funcionar de verdade; até lá roda e falha sem efeito (não afeta o site — as leituras já tratam demanda vencida como expirada independente do job). |

## Pendências externas (fora do código)

- **LinkedIn OAuth** ([PR #10](https://github.com/kelvnnicolas/saudeconecta/pull/10)): código pronto (`linkedin_oidc`), falta criar o app no LinkedIn Developers (produto "Sign In with LinkedIn using OpenID Connect"), configurar a redirect URI e habilitar o provider no Supabase.
- **Secret `PROD_DATABASE_URL`** ([PR #12](https://github.com/kelvnnicolas/saudeconecta/pull/12)): necessário pro workflow agendado de `expirar_demandas` funcionar —
  `gh secret set PROD_DATABASE_URL --repo kelvnnicolas/saudeconecta` (cola a `DATABASE_URL` de produção quando pedir).
- **Notificações** (e-mail e/ou sino com não lidas): deliberadamente adiado pelo spec do chat (seção 8), aguardando spec próprio.

## Por onde retomar

1. Mergear [PR #11](https://github.com/kelvnnicolas/saudeconecta/pull/11) (chat + aceite), [PR #12](https://github.com/kelvnnicolas/saudeconecta/pull/12) (rate limiting, `/ready`, Dependabot, split de deps, cron via GH Actions) e [PR #13](https://github.com/kelvnnicolas/saudeconecta/pull/13) (`GET /empresas`, diretório público de instituições) — todos com CI verde, aguardando revisão/merge. Depois de mergear a #12, aplicar rate limiting em `GET /empresas` também (ficou de fora de propósito pra não depender de outra PR aberta).
2. Configurar o secret `PROD_DATABASE_URL` (ver acima) pro cron de expiração funcionar de verdade.
3. `GET /empresas` ainda não tem página no frontend — só o endpoint. UI é o próximo passo natural se quiser a feature completa.
4. Notificações — precisa de spec próprio (seção 8 do spec do chat).
4. Link de pagamento por contato (item 9) — decisão de produto: manter
   adiado (chat + aceite já cobre o gatilho original) ou implementar mesmo
   assim.
