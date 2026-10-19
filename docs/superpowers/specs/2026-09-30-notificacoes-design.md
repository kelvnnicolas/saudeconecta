# Notificações

Data: 2026-09-30
Status: aprovado para planejamento de implementação

## 1. Contexto

O spec do chat e aceite de demanda direta
([`2026-09-29-chat-aceite-demanda-direta-design.md`](2026-09-29-chat-aceite-demanda-direta-design.md),
seção 8) adiou notificações de propósito: "mensagem não lida" só vira um
conceito rico depois que existe uma conversa de verdade. Essa etapa já foi
construída e mergeada (`mensagens_contato`, `Contato.aceito_em`,
`GET/POST /contatos/{id}/mensagens`, `POST /contatos/{id}/aceitar`) — este
spec é a segunda frente, sequenciada depois por esse motivo.

Hoje já existem três disparos de e-mail no backend
(`app/services/email_service.py` + `app/services/email_templates.py`, via
Resend, silenciosamente no-op sem `RESEND_API_KEY`): novo contato
(`contato_service.create_contato`), novo interesse em demanda
(`demandas.demonstrar_interesse`) e falha de pagamento de assinatura
(`billing._pagamento_falhou`). Nenhum desses hoje grava nada — o e-mail sai
e não fica registro nenhum de que o evento aconteceu. Também já existe um
ícone de sino em [`apps/web/app/(public)/buscar/page.tsx`](../../../apps/web/app/(public)/buscar/page.tsx)
sem nenhuma função (`<button aria-label="Notificações">`, sem `onClick`).

Este spec adiciona um registro persistente de notificações (para o sino
mostrar uma lista e um contador de não lidas) e estende os disparos de
e-mail existentes para três eventos novos, sem introduzir infraestrutura de
tempo real — mesma filosofia do chat (seção 5 daquele spec): poll simples
enquanto a tela está aberta.

## 2. Escopo desta etapa

1. Nova tabela `notificacoes`, com RLS habilitado desde a primeira migration
   (convenção já corrigida no review do chat — ver desvio de RLS no
   `STATUS.md`).
2. Seis eventos geram notificação in-app; três desses (os que já mandam
   e-mail hoje) continuam mandando e-mail sem mudança de comportamento, e
   três ganham e-mail novo:
   - Novo contato recebido → profissional (e-mail: já existe)
   - Nova mensagem no chat de um contato → a outra parte (e-mail: novo)
   - Demanda direta aceita → solicitante, quando o profissional aceita
     (e-mail: novo)
   - Novo interesse em demanda → empresa (e-mail: já existe)
   - Falha de pagamento de assinatura → empresa (e-mail: já existe)
   - Nova demanda compatível com especialidade + cidade do profissional →
     cada profissional compatível, uma notificação por demanda por
     profissional (e-mail: **não** — ver seção 3, decisão explícita)
3. Três endpoints REST: listar (com contador de não lidas), marcar uma como
   lida, marcar todas como lidas.
4. Sino funcional no frontend: contador de não lidas, lista com poll,
   marcar como lida ao clicar, link de cada notificação leva à tela
   relevante.
5. Testes de backend cobrindo autorização (só o próprio destinatário vê/
   marca suas notificações), idempotência de "aceite" (não duplica
   notificação em re-aceite, que já é idempotente por natureza), e o
   caminho feliz de cada um dos seis disparos.

## 3. Fora de escopo nesta etapa

- **Tempo real** (WebSocket, Supabase Realtime, push do navegador/mobile) —
  poll simples, mesma decisão já tomada para o chat.
- **Preferência de notificação por usuário** (ligar/desligar por tipo,
  silenciar e-mail mas manter in-app etc.) — ninguém pediu; não construir
  especulativamente.
- **E-mail para "nova demanda compatível"** — decisão explícita: esse é o
  único evento que pode gerar notificação para várias pessoas de uma vez
  (toda demanda nova dispara para cada profissional compatível). Mandar
  e-mail nesse caso multiplica o volume de envios pelo número de
  profissionais compatíveis por demanda, sem que isso tenha sido pedido —
  fica só in-app nesta etapa. Se necessário depois, é uma decisão de
  produto separada (ex.: resumo diário por e-mail em vez de um e-mail por
  demanda).
- **"Ofertas" como promoção institucional** — decidido em conversa: o termo
  se refere a demandas compatíveis (oportunidades), não a mensagens
  promocionais da plataforma. Um mecanismo de notificação administrativa
  (a SaúdeConecta avisando todo mundo de algo) não foi pedido.
- **Desfazer/apagar notificação** — só marcar como lida. Apagar não foi
  pedido.
- **Link de pagamento por contato e demais itens já listados como fora de
  escopo** nos specs anteriores continuam fora daqui também.

Se algo fora de escopo parecer necessário durante a implementação,
sinalizar antes de implementar — não expandir escopo silenciosamente.

## 4. Modelo de dados

Uma mudança aditiva, nenhuma migration destrutiva.

```python
class TipoNotificacao(str, enum.Enum):
    novo_contato = "novo_contato"
    nova_mensagem = "nova_mensagem"
    aceite_demanda = "aceite_demanda"
    novo_interesse = "novo_interesse"
    falha_pagamento = "falha_pagamento"
    nova_oportunidade = "nova_oportunidade"


class Notificacao(Base):
    __tablename__ = "notificacoes"

    id: Mapped[int] = mapped_column(primary_key=True)
    destinatario_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id"), index=True)
    tipo: Mapped[TipoNotificacao] = mapped_column(SQLEnum(TipoNotificacao, name="tipo_notificacao_enum"))
    titulo: Mapped[str] = mapped_column(String(200))
    corpo: Mapped[str] = mapped_column(Text)
    link: Mapped[str] = mapped_column(String(500))
    lida_em: Mapped[datetime | None] = mapped_column(nullable=True, default=None)
    criado_em: Mapped[datetime] = mapped_column(server_default=func.now())
```

`lida_em` segue exatamente o padrão já usado em `Contato.aceito_em`: `null`
= não lida, timestamp = lida, sem precisar de um booleano redundante.
`link` é um caminho relativo do frontend (ex. `/contatos/42`,
`/oportunidades`, `/empresa/assinatura`) — o componente do sino só
navega para ele, sem lógica condicional por tipo.

A migration habilita RLS (`ALTER TABLE notificacoes ENABLE ROW LEVEL
SECURITY`) na criação da tabela — o dono (API) ignora RLS, isso só nega
acesso direto via PostgREST com a chave anon pública, mesmo padrão já
corrigido em `mensagens_contato` depois do review do chat.

## 5. Endpoints

Novo `apps/api/app/routers/notificacoes.py`. Autorização: em todos, o
destinatário só enxerga e só altera as próprias notificações — mesma ideia
de `_contato_das_partes`, mas mais simples (dono único, não duas partes).

| Rota | Método | Comportamento |
|---|---|---|
| `/notificacoes` | `GET` | Lista as notificações do usuário autenticado, mais recentes primeiro, paginada (`limit`/`offset`, mesmo padrão de `/profissionais` e `/empresas`). Resposta inclui `total_nao_lidas` (contagem, não a lista toda) para o badge do sino não depender de carregar a página inteira. |
| `/notificacoes/{id}/marcar-lida` | `POST` | Seta `lida_em` se ainda for `null`. Idempotente — chamar de novo numa já lida não é erro, não muda o timestamp (mesmo padrão de `POST /contatos/{id}/aceitar`). 404 se o id não existir ou não pertencer ao usuário (não revela a existência de notificação de outra pessoa). |
| `/notificacoes/marcar-todas-lidas` | `POST` | Seta `lida_em = now()` em todas as não lidas do usuário. Retorna quantas foram marcadas. |

Todos os três limitados por rate limit (`30/minute`, mesmo padrão de busca) —
`GET /notificacoes` é chamado a cada poll do frontend.

Erros seguem `erro_negocio()` — `notificacao_inexistente` (404) para os dois
POSTs quando o id não é do usuário.

## 6. Disparo de notificações (backend)

Uma função central em `app/services/notificacao_service.py`:

```python
def criar_notificacao(
    db: Session,
    destinatario_id: uuid.UUID,
    tipo: TipoNotificacao,
    titulo: str,
    corpo: str,
    link: str,
) -> Notificacao:
    ...
```

Chamada nos seis pontos, sempre depois do `db.commit()` do evento principal
(a notificação nunca deve impedir a ação principal de acontecer — se
`criar_notificacao` falhar, loga no Sentry e segue, mesmo espírito do
`enviar_email` que já engole exceção e captura no Sentry):

1. `contato_service.create_contato` — depois do e-mail existente, notifica
   o profissional. `link=/contatos/{contato.id}`.
2. `contato_service.criar_mensagem` — notifica a **outra parte** (quem não
   é o autor da mensagem): se `autor_id == contato.solicitante_id`, notifica
   `profissional_id`, senão notifica `solicitante_id`. Dispara e-mail novo
   (template novo em `email_templates.py`). `link=/contatos/{contato.id}`.
3. `contato_service.aceitar_demanda_direta` — dentro do
   `if contato.aceito_em is None:` que já existe (garante que só dispara na
   primeira vez, não em re-aceites idempotentes), notifica
   `contato.solicitante_id`. Dispara e-mail novo. `link=/contatos/{contato.id}`.
4. `demandas.demonstrar_interesse` — depois do e-mail existente, notifica a
   empresa (mesmo destinatário do e-mail). `link=/contatos/{contato.id}`
   (o contato criado pelo interesse, não a demanda — é o que a empresa vai
   querer ver primeiro, mesma escolha já feita pelo e-mail atual).
5. `billing._pagamento_falhou` — depois do e-mail existente, notifica a
   empresa. `link=/empresa/assinatura`.
6. `demandas.criar_demanda` — depois de criar a demanda, busca profissionais
   compatíveis (mesma especialidade E cidade, comparação case-insensitive —
   espelha o filtro já usado em `listar_oportunidades`) e cria uma
   notificação para cada um. **Sem e-mail** (seção 3). `link=/oportunidades`.
   Uma consulta, um loop de inserts — nesta escala (dezenas a centenas de
   profissionais) não precisa de fila/job assíncrono.

## 7. Frontend

`lib/api.ts` ganha três funções (`listarNotificacoes`,
`marcarNotificacaoLida`, `marcarTodasNotificacoesLidas`), mesmo padrão já
usado por toda a `api`. `lib/types.ts` ganha `NotificacaoRead` e
`ListaNotificacoesResponse` (espelhando os schemas Pydantic novos, 1:1,
mesma convenção já documentada no cabeçalho do arquivo).

Novo componente `components/ui/NotificationBell.tsx`: ícone de sino com
badge de contador (mesmo visual do botão morto que já existe em
`/buscar`), poll a cada ~20s enquanto montado (mais espaçado que o poll do
chat — notificação não é uma conversa ao vivo), dropdown/lista ao clicar
com as notificações mais recentes, cada uma navegando para seu `link` e
marcando como lida ao ser clicada. Usa o mesmo padrão de
`useState`/`useEffect`/`setInterval`/cleanup já usado na tela de chat, sem
loja/store compartilhada nova — YAGNI, só um componente monta o sino por
vez.

O sino passa a aparecer:
- No componente `Header.tsx` (compartilhado por `assinatura`,
  `contato/novo`, `contatos/[id]`, `demandas/nova`).
- No bloco de cabeçalho próprio das telas que não usam `Header.tsx`
  (`avaliacoes`, `contatos` (lista), `demandas` (lista), `oportunidades`,
  `perfil`) — essas telas duplicam um bloco `<Logo compact /><h1>...</h1>`
  local em vez de usar um componente compartilhado; adicionar o sino ali é
  inserir o mesmo componente `NotificationBell` em cada uma, não uma
  refatoração para extrair um header compartilhado (fora de escopo, não
  serve ao objetivo desta etapa).
- Substituindo o botão morto em `/buscar`.

## 8. Testes

Backend (`apps/api/tests/`, seguindo o padrão de `tests/fabrica.py` e
`tests/test_contatos.py`):

- `GET /notificacoes`: só retorna notificações do próprio usuário;
  `total_nao_lidas` bate com a contagem real; paginação respeitada.
- `POST /notificacoes/{id}/marcar-lida`: marca a própria; 404 pra
  notificação de outro usuário ou inexistente; idempotente (marcar duas
  vezes não muda o timestamp já gravado).
- `POST /notificacoes/marcar-todas-lidas`: marca todas as não lidas do
  usuário, não mexe nas de outros usuários, retorna a contagem certa.
- Um teste por disparo (6 no total): criar contato gera notificação pro
  profissional; enviar mensagem gera notificação pra outra parte (e não
  pro próprio autor); aceitar gera notificação pro solicitante só na
  primeira vez (reaceitar não duplica); demonstrar interesse gera
  notificação pra empresa; falha de pagamento gera notificação pra
  empresa; criar demanda gera notificação pra cada profissional
  compatível e nenhuma pra profissional incompatível (especialidade ou
  cidade diferente).

Frontend: verificado ao vivo contra o backend real, mesmo padrão do resto
do projeto — sem suíte automatizada de frontend ainda.
