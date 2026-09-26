# SaúdeConecta — Frontend (`apps/web`)

Next.js 14 (App Router) + TypeScript + Tailwind, gerado a partir das 19 telas em
[`docs/design/telas/`](../../docs/design/telas/). Integrado ao backend real
(`apps/api`): toda página chama `lib/api.ts`, a sessão vem do Supabase Auth de
verdade (`lib/use-current-user.ts`, um único store por aba — sem isso, cada
componente que lê a sessão corria separadamente contra a restauração
assíncrona do Supabase e podia divergir num reload) e o grupo `(painel)`
exige login.

Testado manualmente de ponta a ponta contra Supabase + Stripe test mode reais:
cadastro profissional/empresa, login/logout (inclusive sobrevivendo a reload
completo), contato entre as partes, avaliação (gravada e conferida direto na
API) e upload de avatar (Supabase Storage). Detalhes, gaps conhecidos e o que
ainda falta testar (checkout/webhook do Stripe, fluxo de demandas, e-mail via
Resend) em [`INTEGRATION_CHECKLIST.md`](./INTEGRATION_CHECKLIST.md).

## Rodando localmente

```bash
cd apps/web
npm install
cp .env.example .env.local   # preencher NEXT_PUBLIC_API_URL e as chaves do Supabase
npm run dev
```

Abre em `http://localhost:3000`. Sem `apps/api` rodando (ou sem CORS/credenciais
configuradas nele), toda ação que bate na API real (login, busca, contato,
demanda, checkout) mostra o erro de rede na tela em vez de travar.

### Deploy (Vercel)

Em produção: [`saudeconecta-pi.vercel.app`](https://saudeconecta-pi.vercel.app).
Projeto Vercel conectado ao repositório, com **root directory** = `apps/web`
(obrigatório — é um monorepo, o `package.json` do Next.js não está na raiz) e
framework Next.js. Variáveis de ambiente configuradas no painel do Vercel
(Settings → Environment Variables), iguais às do `.env.local`:

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | mesmo projeto Supabase do backend |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | idem (pública por design) |
| `NEXT_PUBLIC_API_URL` | `https://saudeconecta-api.onrender.com` (backend no Render, ver `README.md` da raiz) |
| `NEXT_PUBLIC_SENTRY_DSN` | ainda não configurado |

`next.config.mjs` já libera `*.supabase.co` em `images.remotePatterns` (avatar
via Supabase Storage) e `lh3.googleusercontent.com` (avatar do Google) — sem
isso `next/image` derruba a página com "Invalid src prop" em produção.

Pendente (só dá pra fazer pelo painel do Supabase, sem endpoint de API): em
**Authentication → URL Configuration**, adicionar a URL da Vercel acima em
*Site URL* e *Redirect URLs* — sem isso, confirmação de e-mail e login com
Google redirecionam pra um lugar errado em produção.

## Estrutura

```
app/
├── (public)/      # landing, busca, perfil público, planos B2B
├── (auth)/        # entrar, cadastro/profissional, cadastro/empresa
└── (painel)/      # layout com guard de sessão + perfil, avaliações, contatos, demandas, oportunidades, assinatura
components/ui/      # Header, BottomNav, Logo, badges de status, estrelas, ThemeToggle
components/busca/   # card de profissional
components/demandas/ # card de demanda
lib/
├── types.ts            # espelha os schemas Pydantic de apps/api 1:1
├── api.ts               # cliente HTTP tipado, uma função por endpoint
├── supabase-client.ts    # Supabase Auth (signIn/signUp/signOut/onAuthStateChange)
├── use-current-user.ts   # sessão real + GET /profissionais|empresas/{id}
├── mock-data.ts           # só a lista parcial de especialidades (prioridade adiada)
└── validations/           # schemas Zod dos formulários
```

## O que ainda falta

Ver [`INTEGRATION_CHECKLIST.md`](./INTEGRATION_CHECKLIST.md) para a lista
completa. Resumo:

1. **Backend sem host de produção definido** — `apps/api` roda local (Supabase
   real + Stripe test mode); falta decidir e configurar onde publicá-lo
   (Render/Railway) antes de `NEXT_PUBLIC_API_URL` apontar pra algo real.
2. Checkout/webhook do Stripe e o fluxo de demandas/oportunidades ainda não
   foram testados ponta a ponta nesta rodada de integração.
3. Gaps de dados que dependem do backend (nome de quem avaliou, preço dos
   planos, link de pagamento por contato) — documentados por página no
   checklist, nenhum bloqueia o resto de funcionar.
4. Lista de especialidades em `lib/mock-data.ts` incompleta (6 das 10 reais,
   prioridade adiada).

## Testado manualmente

Ponta a ponta contra o backend real (Supabase + Stripe test mode): cadastro
profissional/empresa, login/logout (inclusive sobrevivendo a reload completo
da página — ver fix do `use-current-user.ts`), guard de sessão, contato entre
as partes, avaliação (gravada e conferida direto na API) e upload de avatar
pro Supabase Storage. Backend: `pytest` (192 testes, incluindo CORS), `ruff` e
`black` limpos. Frontend: `npx tsc --noEmit` limpo.
