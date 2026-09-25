# SaúdeConecta — Frontend (`apps/web`)

Next.js 14 (App Router) + TypeScript + Tailwind, gerado a partir das 19 telas em
[`docs/design/telas/`](../../docs/design/telas/). Todas as rotas navegam de
verdade entre si; os dados vêm de `lib/mock-data.ts` até o backend
(`apps/api`) ser conectado — ver "Como integrar" abaixo e o
[`INTEGRATION_CHECKLIST.md`](./INTEGRATION_CHECKLIST.md) pra riscar item por
item durante a integração.

## Rodando localmente

```bash
cd apps/web
npm install
cp .env.example .env.local   # preencher quando for integrar de verdade
npm run dev
```

Abre em `http://localhost:3000`. Sem nenhuma variável de ambiente preenchida o
app roda inteiro (navegação, formulários, validação) com os dados de exemplo;
qualquer ação que bate na API real (login, cadastro, busca, contato, demanda,
checkout) tenta `fetch` em `NEXT_PUBLIC_API_URL` de verdade e mostra o erro de
rede se o backend não estiver no ar — isso é esperado, não é bug.

## Estrutura

```
app/
├── (public)/      # landing, busca, perfil público, planos B2B
├── (auth)/        # entrar, cadastro/profissional, cadastro/empresa
└── (painel)/      # perfil, avaliações, contatos, demandas, oportunidades, assinatura
components/ui/      # Header, BottomNav, badges de status, estrelas
components/busca/   # card de profissional
components/demandas/ # card de demanda
lib/
├── types.ts         # espelha os schemas Pydantic de apps/api 1:1
├── api.ts            # cliente HTTP tipado, uma função por endpoint
├── supabase-client.ts # Supabase Auth (signIn/signUp/signOut)
├── mock-data.ts       # dados de exemplo, no mesmo formato da API real
├── use-current-user.ts # troca de papel (profissional/empresa) via localStorage
└── validations/        # schemas Zod dos formulários
```

## Como integrar com o backend (o que falta)

O código já está pronto para isso — trocar a fonte do dado, não a forma dele:

1. **CORS no backend**: `apps/api` ainda não tem CORS configurado (ver
   `STATUS.md` do repo) — nenhuma chamada real vai funcionar até isso existir.
2. Preencher `apps/web/.env.local` com `NEXT_PUBLIC_API_URL`,
   `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (mesmo projeto
   Supabase do backend).
3. Trocar os imports de `lib/mock-data.ts` por chamadas de `lib/api.ts` nas
   páginas — cada ponto está marcado com `// TODO(integração): ...` no código.
4. Pontos que precisam de decisão de produto/backend antes de integrar (todos
   documentados com comentário no código-fonte, resumo em
   `docs/design/telas/MANIFEST.md`):
   - `GET /avaliacoes` não devolve nome de quem avaliou (só `autor_id`).
   - `GET /demandas/oportunidades` não devolve `ja_demonstrei_interesse` por
     item — hoje rastreado em memória no cliente depois de um interesse bem-sucedido.
   - `GET /contatos` não devolve nome/avatar da outra parte — hoje resolvido
     contra os dados de exemplo.
   - `GET /planos` não devolve preço nem lista de benefícios — hoje é texto
     fixo em `app/(public)/empresa/planos/page.tsx`.
   - `POST /contatos/{id}/pagamento` (link de pagamento por contato) ainda não
     existe no backend — a seção já está na tela, sem ação.
5. **Lista de especialidades** (prioridade combinada como posterior):
   `lib/mock-data.ts` tem só 6 das 10 especialidades reais semeadas no banco.
   Quando for a hora, trocar por `api.listEspecialidades()`.

## Testado manualmente

Fluxos navegados de ponta a ponta no browser durante a implementação: landing
→ busca → perfil público → novo contato (chamada real, erro de rede
esperado); troca de papel profissional/empresa; minhas demandas (expandir
interessados, mudar status); criar nova demanda (validação Zod, chamada
real); oportunidades (demonstrar interesse); planos B2B; cadastro de
profissional (seleção de especialidades); página 404. `npx tsc --noEmit`
limpo.
