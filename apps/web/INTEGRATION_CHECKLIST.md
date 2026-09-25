# Checklist de integração — apps/web ↔ apps/api

Todo formulário e toda listagem já chamam `lib/api.ts` de verdade ou estão
marcados com `// TODO(integração)` apontando pra chamada exata que falta. Este
checklist é pra riscar item por item enquanto o backend entra no ar — não é
um plano de reescrever nada, é conferência.

Convenção: `[ ]` não verificado · `[b]` bloqueado (motivo anotado) · `[x]` ok.

## 0. Pré-requisitos (nada funciona sem isso)

- [ ] **CORS no `apps/api`** — hoje não existe (`STATUS.md` do backend confirma:
      "CORS ❌ Obrigatório antes do frontend"). Sem isso todo `fetch` daqui
      falha com erro de CORS antes mesmo de chegar no endpoint. Bloqueador nº 1.
- [ ] `apps/api` rodando localmente (`docker compose -f docker-compose.dev.yml up -d`
      + `uvicorn app.main:app --reload`) com `STRIPE_SECRET_KEY` e as demais
      variáveis obrigatórias preenchidas (senão a API recusa subir).
- [ ] `apps/web/.env.local` criado a partir de `.env.example`:
      `NEXT_PUBLIC_API_URL=http://localhost:8000`,
      `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` do **mesmo**
      projeto Supabase usado pelo backend.
- [ ] No painel do Supabase: **Authentication → URL Configuration** — adicionar
      `http://localhost:3000` (e depois a URL de produção) em *Site URL* e
      *Redirect URLs*. Sem isso o login com Google (`signInWithGoogle` em
      `lib/supabase-client.ts`) redireciona pra um lugar errado.
- [ ] Se for testar login com Google: provider Google habilitado em
      **Authentication → Providers** no Supabase (não é obrigatório pro fluxo
      de e-mail/senha funcionar).

## 1. Autenticação e sessão (base de tudo — fazer primeiro)

- [ ] `lib/use-current-user.ts` — trocar o mock (`MOCK_PROFISSIONAL_PROFILE`/
      `MOCK_EMPRESA_PROFILE` alternados por `localStorage`) por sessão real:
      `getSession()` de `lib/supabase-client.ts` + `GET /profissionais/{id}`
      ou `GET /empresas/{id}` usando o `id` da sessão. **Sem isso o app inteiro
      continua mostrando os dois perfis de exemplo**, mesmo com login real
      funcionando — é o ponto de maior impacto pra integrar primeiro.
- [ ] Conferir o fluxo de cadastro de profissional (`app/(auth)/cadastro/profissional`):
      `signUpWithPassword` → `api.syncProfile({ papel: "profissional", ... })`
      → `api.updateOwnProfissional({ especialidade_ids, ... })`. São 3
      chamadas em sequência — testar o que acontece se a 2ª ou 3ª falhar
      (hoje só mostra erro genérico, perfil fica parcialmente criado no
      Supabase Auth sem `profile` correspondente).
- [ ] Mesma conferência pro cadastro de empresa (`app/(auth)/cadastro/empresa`).
- [ ] `app/(auth)/entrar/page.tsx`: o comentário `TODO(integração)` marca que
      login **não** deveria chamar `/auth/sync` de novo pra quem já tem conta
      — confirmar que só o cadastro faz isso.
- [ ] Testar `signInWithGoogle()` de ponta a ponta (redirect + volta pro app
      com sessão ativa) — nunca foi testado, só o e-mail/senha foi validado
      no fluxo mockado.
- [ ] Rota protegida: hoje **nenhuma página em `app/(painel)/`** redireciona
      pra `/entrar` se não houver sessão — eram só mocks até aqui. Decidir e
      implementar o guard (middleware ou check por página) antes de deploy.

## 2. Por página — mock → API real

| Página | Troca | Endpoint(s) |
|---|---|---|
| `app/(public)/buscar` | `MOCK_SEARCH_RESULTS` → `api.searchProfissionais({ q, cidade, ... })`, com debounce | `GET /profissionais` |
| `app/(public)/profissional/[id]` | `MOCK_PROFISSIONAL_DETAIL` + `MOCK_AVALIACOES` → `api.getProfissional(id)` + `api.listAvaliacoes(id)` em paralelo | `GET /profissionais/{id}`, `GET /avaliacoes?alvo_id=` |
| `app/(painel)/avaliacoes` | `MOCK_AVALIACOES` → `api.listAvaliacoes(profile.id)` | `GET /avaliacoes?alvo_id=` |
| `app/(painel)/contatos` | `MOCK_CONTATOS` → `api.listContatos()` | `GET /contatos` |
| `app/(painel)/contatos/[id]` | busca o contato certo na lista (hoje pega o primeiro do mock) | `GET /contatos` (não tem endpoint de detalhe único — ver gap abaixo) |
| `app/(painel)/demandas` | `MOCK_MINHAS_DEMANDAS` → `api.minhasDemandas()`; interessados do mock → `api.detalheDemanda(id)` | `GET /demandas/minhas`, `GET /demandas/{id}` |
| `app/(painel)/oportunidades` | `MOCK_OPORTUNIDADES` → `api.oportunidades({ especialidade_id, cidade })` | `GET /demandas/oportunidades` |
| `app/(painel)/assinatura` | `MOCK_ASSINATURA` → `api.minhaAssinatura()` | `GET /assinaturas/me` |
| `app/(painel)/perfil` | recarregar `profile` depois de `api.uploadAvatar()` (hoje o avatar sobe mas a tela não atualiza) | `POST /perfis/me/avatar` |

Já chamam a API real, só precisam do backend no ar (nenhuma troca de código):
`contato/novo`, `demandas/nova`, `contatos/[id]` (avaliação), `oportunidades`
(botão), `demandas` (mudar status), `empresa/planos` (checkout), `assinatura`
(portal), `cadastro/profissional`, `cadastro/empresa`, `entrar`.

## 3. Gaps de dados — não são bug de frontend, precisam de decisão

Já eram conhecidos desde a auditoria (`docs/design/telas/MANIFEST.md`), aqui
com o ponto exato no código:

- [ ] **`GET /avaliacoes` não devolve nome de quem avaliou** (só `autor_id`).
      `app/(public)/profissional/[id]/page.tsx` mostra "Contratante
      verificado" genérico. Decidir: enriquecer no backend ou resolver em
      lote no frontend.
- [ ] **`GET /demandas/oportunidades` não devolve `ja_demonstrei_interesse`
      por item** (só `GET /demandas/{id}` devolve). `oportunidades/page.tsx`
      hoje rastreia isso em memória (`Set` no componente) depois de um
      interesse bem-sucedido — perde o estado ao recarregar a página.
- [ ] **`GET /contatos` não devolve nome/avatar da outra parte** (só
      `solicitante_id`/`profissional_id`). `contatos/page.tsx` resolve contra
      dados de exemplo hoje — precisa de resolução em lote real.
- [ ] **`GET /planos` não devolve preço nem benefícios** (só `codigo`, `nome`,
      `limite_demandas_ativas`). `empresa/planos/page.tsx` tem os valores
      (R$249/R$590) e a lista de benefícios fixos no componente
      (`BENEFICIOS`) — vai dessincronizar do Stripe real se o preço mudar lá.
- [ ] **`POST /contatos/{id}/pagamento` não existe** — item 8 do Plano Básico,
      não implementado no backend. A seção de pagamento em
      `contatos/[id]/page.tsx` já está pronta visualmente, só falta o
      endpoint.
- [ ] **Sem endpoint de detalhe de um único contato** — `GET /contatos` só
      lista todos; `contatos/[id]/page.tsx` filtra no cliente. Ok pra poucos
      contatos, decidir se compensa um `GET /contatos/{id}` mais pra frente.
- [ ] **Lista de especialidades incompleta no frontend** (prioridade
      combinada como posterior) — `lib/mock-data.ts` tem 6 das 10 reais.
      Trocar por `api.listEspecialidades()` quando essa prioridade voltar.

## 4. Teste manual fim a fim (depois de tudo acima)

Repetir os fluxos já validados com mock, agora contra o backend real:

- [ ] Cadastro profissional → aparece em `GET /profissionais` na busca
- [ ] Cadastro empresa → `GET /empresas/{id}` retorna os dados certos
- [ ] Busca com filtro de texto/cidade/preço bate com o que existe no banco
- [ ] Perfil público → avaliações reais aparecem
- [ ] Novo contato → e-mail chega (via Resend) pro profissional
- [ ] Empresa assina plano → redireciona pro Stripe Checkout real → volta
      pro app → `GET /assinaturas/me` reflete o status
- [ ] Empresa publica demanda → profissional vê em Oportunidades → demonstra
      interesse → vira contato em `GET /contatos` pros dois lados
- [ ] Avaliação após contato → aparece no perfil público do avaliado
- [ ] Upload de avatar → aparece no Supabase Storage e no `avatar_url`
- [ ] Logout/login de novo → sessão persiste, dado certo carrega (sem voltar
      pro mock)

## 5. Fora do escopo desta integração (não tentar consertar aqui)

- Rate limiting e CORS restritivo (produção) — item do backend, `STATUS.md`.
- Deploy (Vercel/Railway) — depende de credenciais reais, passo manual à parte.
- Sentry no frontend (`@sentry/nextjs`) — marcado em `app/error.tsx`, não
  bloqueia a integração funcional.
