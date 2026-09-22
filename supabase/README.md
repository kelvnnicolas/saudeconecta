# Conexão com o Supabase

Este projeto usa o Supabase para **Auth** e **Storage**. O **schema do banco
é gerenciado inteiramente pelo Alembic** (`apps/api/alembic/`) — esta pasta
existe só como referência/documentação da conexão, não contém migrations.

**Por quê não usar a integração oficial Supabase ↔ GitHub (migrations via
Supabase CLI)?** Essa integração aplicaria migrations de um segundo sistema
(`supabase/migrations/`, formato da Supabase CLI) em paralelo ao Alembic já
existente, com risco real de schema divergente entre os dois. Decisão:
manter o Alembic como única fonte de verdade do schema.

## Projeto (desenvolvimento)

- **Nome:** saudeConecta
- **Project ref:** `rhjatedvqqginixlkdxh`
- **URL da API:** `https://rhjatedvqqginixlkdxh.supabase.co`
- **Dashboard:** https://supabase.com/dashboard/project/rhjatedvqqginixlkdxh

Quando o produto for para produção com dado real, um **segundo projeto**
Supabase dedicado a produção será criado — este projeto continua sendo o de
desenvolvimento (ver `STATUS.md` na raiz do repositório).

## Autenticação (JWT)

O projeto expõe tanto o secret JWT legado quanto o sistema novo de signing
keys (JWKS). A validação de token no backend usa **JWKS**
(`{SUPABASE_URL}/auth/v1/.well-known/jwks.json`), não o secret
compartilhado — ver `STATUS.md` para o raciocínio completo dessa decisão.

## Conexão com o Postgres

O host de conexão direta (`db.<project-ref>.supabase.co`) só publica
registro DNS **IPv6**. Em redes sem rota IPv6 (confirmado ser o caso da rede
de desenvolvimento local, e possivelmente também de Railway/Render em
produção), use o **Session Pooler** (compatível com IPv4) em vez da conexão
direta — a string correta está em Project Settings → Database → Connection
string → aba "Session pooler" no dashboard do Supabase.

## MCP do Supabase

O MCP do Supabase está configurado localmente (`~/.claude.json`, escopo de
projeto), autenticado via personal access token, escopado a este projeto e
em **modo somente leitura** — útil para inspecionar schema, dados e
políticas de RLS durante o desenvolvimento, mas não substitui o Alembic para
alterar schema.
