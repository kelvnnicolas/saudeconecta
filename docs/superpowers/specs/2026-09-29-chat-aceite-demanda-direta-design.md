# Chat e aceite de demanda direta no Contato

Data: 2026-09-29
Status: aprovado para planejamento de implementação

## 1. Contexto

O spec original do Plano Básico ([`2026-09-19-saudeconecta-mvp-design.md`](2026-09-19-saudeconecta-mvp-design.md))
definiu contato como "formulário que registra a mensagem e notifica por
e-mail (não é chat em tempo real)" e listou "chat interno em tempo real"
explicitamente fora de escopo. Este spec **amplia** esse escopo — decisão do
cliente, fora deste documento — adicionando um histórico de mensagens dentro
de um contato já existente. Não é tempo real (ver seção 5): mantém o espírito
original de "sem infraestrutura de real-time", só troca "uma mensagem única"
por "uma conversa com histórico".

O gatilho imediato: a seção de "link de pagamento por contato" em
[`contatos/[id]/page.tsx`](../../../apps/web/app/(painel)/contatos/[id]/page.tsx)
é hoje um placeholder visual sem função (`POST /contatos/{id}/pagamento` não
existe — item do Plano Básico não implementado, seção 8 do spec original).
Este trabalho substitui esse placeholder por algo funcional: uma conversa de
verdade entre empresa e profissional, e uma forma leve de formalizar que o
profissional vai atender — sem depender do pagamento (que continua fora de
escopo) nem da assinatura B2B (que é um produto à parte, para
clínicas/hospitais/homecare assinantes).

## 2. Escopo desta etapa

1. Histórico de mensagens dentro de um `Contato` (empresa ↔ profissional),
   substituindo o placeholder de pagamento na tela de detalhe do contato.
2. Botão "Aceitar demanda direta", visível só para o profissional, só
   enquanto ainda não foi aceito.
3. Endpoints REST correspondentes, com a mesma autorização de "só as duas
   partes do contato" já usada em `GET /contatos`.
4. Testes de backend cobrindo autorização e o caminho feliz de cada
   endpoint novo.

## 3. Fora de escopo nesta etapa

- **Link de pagamento por contato** (`POST /contatos/{id}/pagamento`) —
  continua não implementado. Este trabalho não tenta resolver isso, só para
  de bloquear o fluxo por causa dele.
- **Tempo real** (WebSocket, Supabase Realtime) — poll simples enquanto a
  tela está aberta (seção 5). Decisão explícita do cliente nesta rodada de
  brainstorming, para não introduzir infraestrutura nova num MVP.
- **Notificações** (e-mail e/ou sino com não lidas) — é uma segunda frente,
  já identificada, mas com spec e plano de implementação próprios,
  sequenciada depois deste (ver seção 8).
- **Reuso do modelo `Demanda`/assinatura B2B** — decisão explícita: aceite
  direto é um status novo no próprio `Contato`, não cria uma `Demanda`. Não
  passa pela checagem de elegibilidade (`entitlements.py`), então funciona
  pra qualquer tipo de empresa, inclusive `pessoa_fisica` — esse é
  literalmente o buraco que preenche (pessoa física não pode publicar
  `Demanda` formal, mas precisa de algum jeito de formalizar um combinado).
- **Editar/apagar mensagem, anexos, indicador de digitação, recibo de
  leitura por mensagem** — nenhum desses foi pedido; não construir
  especulativamente.
- **Desfazer aceite** — uma vez aceito, fica aceito nesta etapa. Se
  necessário depois, é uma decisão de produto separada (ex.: reabrir o
  contato, cancelar), não antecipar aqui.
- **Aceite pelo lado da empresa** — decisão explícita: só o profissional
  aceita, espelhando o padrão já existente em Oportunidades (profissional
  demonstra interesse/aceita).

Se algo fora de escopo parecer necessário durante a implementação, sinalizar
antes de implementar — não expandir silenciosamente.

## 4. Modelo de dados

Duas mudanças aditivas, nenhuma migration destrutiva, `Demanda` e o fluxo
B2B ficam intocados.

### 4.1 Nova tabela `mensagens_contato`

```python
class MensagemContato(Base):
    __tablename__ = "mensagens_contato"

    id: Mapped[int] = mapped_column(primary_key=True)
    contato_id: Mapped[int] = mapped_column(ForeignKey("contatos.id"), index=True)
    autor_id: Mapped[uuid.UUID]  # sempre solicitante_id ou profissional_id do contato
    corpo: Mapped[str] = mapped_column(Text)
    criado_em: Mapped[datetime] = mapped_column(server_default=func.now())
```

A mensagem original (`Contato.mensagem`, o texto que abriu o contato)
**não** migra para essa tabela — continua sendo mostrada como contexto fixo
no topo da tela (já é assim hoje). O histórico novo começa vazio; a primeira
mensagem da conversa é a primeira linha em `mensagens_contato`.

### 4.2 Nova coluna em `Contato`

```python
aceito_em: Mapped[datetime | None] = mapped_column(nullable=True, default=None)
```

`null` = ainda não aceito. Um timestamp = aceito, e a UI ganha "de graça" a
data do aceite sem precisar de outro campo. Nenhum valor novo entra no enum
`StatusContato` (`pendente`/`respondido`/`encerrado` continuam exatamente
como são hoje — os filtros existentes em `contatos/page.tsx` não mudam).

Duas migrations Alembic lineares, cada uma com `downgrade` testado (padrão
já seguido por todas as migrations existentes, ver `tests/test_migrations.py`).

## 5. Endpoints

Todos em `apps/api/app/routers/contatos.py` (ou um novo
`mensagens_contato.py` se o arquivo atual crescer demais — decisão de
implementação, não de design). Autorização idêntica ao padrão já usado em
`GET /contatos`: só `solicitante_id` ou `profissional_id` daquele contato
específico podem chamar qualquer um destes.

| Rota | Método | Quem pode | Comportamento |
|---|---|---|---|
| `/contatos/{id}/mensagens` | `GET` | as duas partes | Lista mensagens, ordenadas por `criado_em`. Frontend faz poll a cada ~7s enquanto a tela está aberta (`setInterval`, limpo no unmount — mesmo padrão de lifecycle de `lib/use-current-user.ts`), e busca uma vez ao entrar na tela. |
| `/contatos/{id}/mensagens` | `POST` | as duas partes | Cria uma mensagem (`corpo` obrigatório, não-vazio). `autor_id` vem do JWT, nunca do body. |
| `/contatos/{id}/aceitar` | `POST` | **só o profissional** daquele contato | 403 se quem chama for a empresa. Idempotente: se `aceito_em` já estiver preenchido, retorna o estado atual sem erro (não é um erro re-aceitar). |

Erros de autorização seguem o padrão já usado em `GET /contatos` (403 sem
`code` de negócio — não é um erro de elegibilidade/assinatura, é
simplesmente "você não é parte desse contato").

Nenhum dos três endpoints checa `status` do contato (`pendente` /
`respondido` / `encerrado`) — mensagem e aceite funcionam independente do
status atual, mesma simplicidade do resto desta etapa. Se travar interação
num contato `encerrado` for necessário, é uma regra de negócio nova, fora
deste spec.

## 6. Frontend

Em [`app/(painel)/contatos/[id]/page.tsx`](../../../apps/web/app/(painel)/contatos/[id]/page.tsx):

- Remove a seção placeholder "Link de pagamento por contato ainda não
  existe..." (linhas ~101-109 hoje).
- Em seu lugar: lista de mensagens (bolhas alinhadas por autor, mesmo
  padrão visual das telas de mockup já existentes em
  `docs/design/telas/detalhes_do_contato_e_avalia_o/`) + campo de texto e
  botão de enviar.
- Botão "Aceitar demanda direta": renderiza só quando `papel === "profissional"`
  e `contato.aceito_em == null`. Depois de aceito, vira um badge "Aceito em
  {data}" pros dois lados — sem botão, sem ação.
- `lib/api.ts` ganha três funções (`listarMensagensContato`,
  `enviarMensagemContato`, `aceitarDemandaDireta`), seguindo exatamente o
  padrão já usado por toda a `api` (mesmo objeto, mesmo `request<T>()`
  helper, sem cliente HTTP novo).
- `lib/types.ts` ganha `MensagemContatoRead` e o campo `aceito_em` em
  `ContatoRead`.

Não precisa de nenhuma biblioteca nova — poll com `setInterval` e
`useState`/`useEffect` já é o padrão usado em todo o resto do app.

## 7. Testes

Backend (`apps/api/tests/`, seguindo o padrão de `tests/fabrica.py` e
`tests/test_demandas.py` para fixtures de contato):

- `GET /contatos/{id}/mensagens`: as duas partes conseguem ler; um terceiro
  usuário autenticado recebe 403; contato inexistente recebe 404.
- `POST /contatos/{id}/mensagens`: as duas partes conseguem enviar; corpo
  vazio é rejeitado (422); `autor_id` sempre reflete quem está autenticado,
  nunca um valor do body.
- `POST /contatos/{id}/aceitar`: profissional aceita com sucesso
  (`aceito_em` passa a ter valor); empresa tentando aceitar recebe 403;
  aceitar duas vezes é idempotente (não gera erro, não muda o timestamp já
  gravado).

Frontend: verificado ao vivo contra o backend real (mesmo padrão de todo o
resto desta sessão) — não há suíte de testes automatizados de frontend
neste projeto ainda.

## 8. Relação com a segunda frente (notificações)

Notificações (e-mail e/ou sino com não lidas) ficam para um spec e plano de
implementação separados, depois deste. Razão pra essa ordem: "mensagem não
lida" só vira um conceito rico depois que existe uma conversa de verdade
(esta etapa) — antes disso, a única coisa "não lida" possível seria o
contato inicial, o que já existe implicitamente via `status: "pendente"`.
Construir chat primeiro evita que o design de notificações tenha que
adivinhar a forma dos dados que ainda não existem.
