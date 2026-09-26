# Checklist de integração — apps/web ↔ apps/api

Todo formulário e toda listagem já chamam `lib/api.ts` de verdade — não há
mais mock no caminho principal (só `lib/mock-data.ts` com a lista parcial de
especialidades, prioridade adiada). Backend rodando com credenciais reais
(Supabase + Stripe test mode) e testado ponta a ponta no browser com contas
de teste reais — ver seção 4.

Convenção: `[ ]` não verificado · `[b]` bloqueado (motivo anotado) · `[x]` ok.

## 0. Pré-requisitos

- [x] **CORS no `apps/api`** — implementado em `app/main.py`
      (`CORSMiddleware`, origem = `settings.app_url`). Coberto por
      `tests/test_cors.py` (3 testes novos, 192 no total, `pytest` verde).
- [x] **`apps/api` rodando com credenciais reais** — `.env` preenchido com
      Supabase real (projeto `rhjatedvqqginixlkdxh`, Session Pooler pra
      contornar a rede local sem IPv6) e Stripe test mode (`sk_test_...`,
      produtos/preços criados via API). As 7 migrations do Alembic rodaram
      contra esse Supabase real (pré-lançamento, sem usuário real ainda).
- [x] `apps/web/.env.local` criado com `NEXT_PUBLIC_API_URL`,
      `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` do mesmo
      projeto Supabase do backend.
- [x] **Bug crítico corrigido — SSL/JWKS no backend**: `PyJWKClient` usava o
      cacert do sistema pra buscar o JWKS da Supabase; em Python instalado
      via python.org no macOS isso falta, e TODO login falhava com 401
      mesmo com JWT válido (`certificate verify failed: unable to get local
      issuer certificate`). Corrigido em `app/core/auth.py` com
      `ssl.create_default_context(cafile=certifi.where())` — não depende de
      nenhuma variável de ambiente, funciona em qualquer máquina/CI.
      `certifi` adicionado ao `requirements.txt`.
- [ ] No painel do Supabase: **Authentication → URL Configuration** — adicionar
      `http://localhost:3000` (e depois a URL de produção) em *Site URL* e
      *Redirect URLs*. Sem isso o login com Google redireciona pra um lugar
      errado.
- [ ] Se for testar login com Google: provider Google habilitado em
      **Authentication → Providers** no Supabase.
- [x] **Bucket `avatars` no Supabase Storage** — criado via API
      (`POST /storage/v1/bucket`, público, limite 5MB, só image/png|jpeg|webp)
      com a `SUPABASE_SERVICE_ROLE_KEY`. Sem ele, upload de avatar falhava
      com `StorageException: Bucket not found`.

## 1. Autenticação e sessão

- [x] `lib/use-current-user.ts` reescrito: sessão real via
      `getSession()`/`onAuthStateChange` (`lib/supabase-client.ts`) +
      `GET /profissionais/{id}` ou `GET /empresas/{id}` com o id da sessão.
      Sem `GET /profiles/me` no backend, o papel (profissional/empresa) vem
      do `user_metadata` gravado no Supabase Auth no cadastro
      (`signUpWithPassword(email, senha, papel)`).
- [x] **Bug corrigido — estado de sessão perdido em reload**: cada componente
      chamava `useCurrentUser()` de forma independente (layout de
      auth-guard, `BottomNav`, a página), cada um com seu próprio
      `getSession()`/`onAuthStateChange`. Em um reload completo de qualquer
      página do painel, essas instâncias corriam separadamente contra a
      restauração assíncrona da sessão do Supabase e podiam divergir — uma
      via a sessão certa, outra recebia `null` primeiro e "vencia" a
      corrida, fazendo `/perfil` mostrar "não sincronizado" mesmo com o
      profissional carregado certinho no backend (reproduzido ao vivo,
      2 abas diferentes, de forma consistente). Corrigido reescrevendo o
      hook como um store único por aba (`useSyncExternalStore`) — um só
      `getSession()`/`onAuthStateChange` compartilhado por todos os
      consumidores, sem corrida possível entre instâncias.
- [x] **Guard de rota** novo em `app/(painel)/layout.tsx` — toda página do
      grupo `(painel)` (perfil, contatos, demandas, oportunidades,
      avaliações, assinatura...) agora exige sessão; sem ela, redireciona pra
      `/entrar`. Testado no browser com e sem sessão real: funciona.
- [x] Cadastro profissional/empresa: sequência
      `signUpWithPassword` → `api.syncProfile` → `api.updateOwnProfissional`
      (ou `updateOwnEmpresa`) testada ao vivo com conta de e-mail real
      (Gmail, endereço `+alias`).
- [x] **Bug corrigido — confirmação de e-mail no cadastro**: `signUp()` nem
      sempre devolve sessão ativa na mesma chamada; sem tratamento, `POST
      /auth/sync` falhava com 401 logo após o cadastro, deixando um usuário
      no Auth sem profile. Corrigido com `signUpAndEnsureSession()` +
      `EmailNaoConfirmadoError` em `lib/supabase-client.ts` — mostra uma
      mensagem clara em vez do erro genérico "Erro HTTP 401".
- [ ] Testar `signInWithGoogle()` de ponta a ponta (redirect + volta pro app
      com sessão ativa) — ainda não testado.
- [x] Perfil "órfão" (login funciona, mas `/profissionais/me` ou
      `/empresas/me` nunca foi preenchido) — `perfil/page.tsx` mostra aviso
      claro pra esse caso; texto confirmado fazendo sentido ao vivo.

## 2. Por página — todas já chamam a API real

| Página | Endpoint(s) | Observação |
|---|---|---|
| `app/(public)/buscar` | `GET /profissionais` | debounce de 300ms |
| `app/(public)/profissional/[id]` | `GET /profissionais/{id}` + `GET /avaliacoes?alvo_id=` | `Promise.all` |
| `app/(painel)/avaliacoes` | `GET /avaliacoes?alvo_id=` (com `session.user.id`) | — |
| `app/(painel)/contatos` | `GET /contatos` | nome da outra parte resolvido com 1 lookup por id único (ver gap abaixo) |
| `app/(painel)/contatos/[id]` | `GET /contatos` (filtra pelo id) + `POST /avaliacoes` | sem endpoint de detalhe único, ver gap |
| `app/(painel)/demandas` | `GET /demandas/minhas` + `GET /demandas/{id}` (interessados, sob demanda) + `PATCH /demandas/{id}` | — |
| `app/(painel)/oportunidades` | `GET /demandas/oportunidades` + `POST /demandas/{id}/interesse` | — |
| `app/(painel)/assinatura` | `GET /assinaturas/me` + `POST /assinaturas/portal` | — |
| `app/(public)/empresa/planos` | `GET /planos` + `POST /assinaturas/checkout` | preço/benefícios continuam fixos, ver gap |
| `app/(painel)/perfil` | `POST /perfis/me/avatar` + recarrega via `refresh()` | testado ao vivo, ver bug do `next.config.mjs` na seção 0 |
| `contato/novo`, `demandas/nova`, `cadastro/*` | já chamavam a API real desde antes | sem mudança |

Todas mostram estado de carregamento e erro real (não escondem mais falha de
rede atrás de "modo de exemplo").

- [x] **Bug corrigido — upload de avatar derrubava a página inteira**:
      `next.config.mjs` só liberava `lh3.googleusercontent.com` (avatar do
      Google) em `images.remotePatterns`; uma URL de avatar do Supabase
      Storage fazia `next/image` lançar `Invalid src prop... hostname is not
      configured` e a página inteira caía em "Erro de conexão" (reproduzido
      ao vivo). Corrigido liberando `*.supabase.co` também. Atenção: nesta
      versão do Next.js, `next.config.mjs` carrega **antes** de
      `.env.local` — não dá pra montar o hostname lendo
      `NEXT_PUBLIC_SUPABASE_URL` ali, por isso o wildcard em vez de derivar
      do env var.

## 3. Gaps de dados — ainda precisam de decisão de produto/backend

- [ ] **`GET /avaliacoes` não devolve nome de quem avaliou** (só `autor_id`).
      `profissional/[id]/page.tsx` continua mostrando "Contratante
      verificado" genérico — não dá pra resolver só no frontend sem um
      endpoint de perfil em lote.
- [ ] **`GET /demandas/oportunidades` não devolve `ja_demonstrei_interesse`
      por item.** Continua rastreado em memória no cliente; perde o estado
      ao recarregar a página.
- [x] **Nome da outra parte em `GET /contatos`/`GET /avaliacoes`** — resolvido
      no frontend com uma chamada extra por id único (`api.getEmpresa`/
      `api.getProfissional`), deduplicada. Funciona, mas é N+1 requisições;
      se a lista de contatos crescer muito vale um endpoint de perfil em
      lote no backend.
- [ ] **`GET /planos` não devolve preço nem benefícios.** `empresa/planos/page.tsx`
      já busca a lista real (`codigo`/`nome`/`limite`), mas preço e
      benefícios continuam no objeto `BENEFICIOS` fixo no componente — vai
      dessincronizar do Stripe se o preço mudar lá.
- [ ] **`POST /contatos/{id}/pagamento` não existe** — item 8 do Plano
      Básico, não implementado no backend.
- [ ] **Sem endpoint de detalhe de um único contato** — `contatos/[id]/page.tsx`
      busca a lista toda e filtra no cliente. Ok pra poucos contatos.
- [ ] **Lista de especialidades incompleta** (prioridade adiada, combinada
      com você) — `lib/mock-data.ts` ainda tem só 6 das 10 reais.

## 4. Teste manual fim a fim

Feito com duas contas de teste reais: Ana (profissional, Enfermagem,
Florianópolis/SC) e Mariana (empresa/pessoa física).

- [x] Cadastro profissional → aparece em `GET /profissionais` na busca
- [x] Cadastro empresa → `GET /empresas/{id}` retorna os dados certos
- [x] Login/logout com e-mail e senha reais (confirmação de e-mail
      desabilitada no projeto Supabase pra agilizar o teste local)
- [x] Novo contato (Mariana → Ana) → aparece em `GET /contatos` pros dois
      lados, com o nome da outra parte resolvido certo
- [x] Avaliação após contato (Ana avalia Mariana, 4 estrelas + comentário) →
      `POST /avaliacoes` grava certo, confirmado consultando
      `GET /avaliacoes?alvo_id=` direto na API
- [x] Upload de avatar → aparece no Supabase Storage (bucket `avatars`) e
      recarrega na tela via `refresh()`
- [x] Logout/login de novo → sessão persiste, dado certo carrega (inclusive
      em reload completo da página, depois do fix do use-current-user.ts)
- [x] Acessar `/contatos` (ou outra rota do painel) deslogado → redireciona
      pra `/entrar`
- [ ] Busca com filtro de texto/cidade/preço bate com o que existe no banco
      — testado só sem filtro (lista geral)
- [ ] Perfil público → avaliações reais aparecem — avaliação criada tem
      `alvo_id` de uma empresa, não de um profissional; `/profissional/[id]`
      (a única página de perfil público que existe) ainda não foi conferida
      com uma avaliação de verdade atrelada a um profissional
- [ ] Empresa assina plano → redireciona pro Stripe Checkout real → volta
      pro app → `GET /assinaturas/me` reflete o status — adiado: fechamos o
      `stripe listen` antes de rodar esse fluxo (decisão explícita, ver
      histórico)
- [ ] Empresa publica demanda → profissional vê em Oportunidades → demonstra
      interesse → vira contato em `GET /contatos` pros dois lados — ainda não
      testado nesta rodada
- [ ] Novo contato → e-mail chega (via Resend) pro profissional — não dá pra
      testar, `RESEND_API_KEY` vazio no `.env`

### Pendências menores encontradas ao vivo (não bloqueiam, ficam anotadas)

- Cartão do profissional aparece na própria busca (`/buscar`) quando ele
  mesmo está logado — não há exclusão de "eu mesmo" nos resultados de
  `GET /profissionais`.
- Depois do cadastro de empresa, `/perfil` às vezes mostra "não
  sincronizado" por um instante antes de corrigir sozinho, e a `BottomNav`
  pode piscar a aba errada por ~1-2s logo após o login — ambos cosméticos,
  o dado no banco está sempre certo; o bug de fundo (sessão perdida em
  reload) foi corrigido, mas esse flash residual de estado inicial em
  navegação client-side ainda pode aparecer brevemente.

## 5. Fora do escopo desta integração

- Rate limiting e CORS restritivo por ambiente (produção) — item do backend.
- Deploy (Vercel/Railway) — depende de credenciais reais, passo manual à parte.
- Sentry no frontend (`@sentry/nextjs`) — marcado em `app/error.tsx`, não
  bloqueia a integração funcional.
