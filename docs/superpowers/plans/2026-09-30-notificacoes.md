# Notificações Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent, in-app notification record (bell icon with unread count) for six events, extending the three email sends that already exist and adding three new ones, with no new infrastructure beyond what already exists.

**Architecture:** One new table (`notificacoes`) + service + router, mirroring the `Contato`/`MensagemContato` pattern exactly (same ownership-check shape, same `lida_em`-as-null-means-unread idiom as `Contato.aceito_em`). Six call sites across three existing services call one shared `registrar_notificacao()` function after their own `db.commit()`. Frontend polls `GET /notificacoes` every 20s from a new `NotificationBell` component, wired into the one shared `Header.tsx` and inserted into six pages that build their own header block inline.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, pytest + `TestClient`, Next.js 14 App Router, React `useState`/`useEffect`.

**Spec:** [`docs/superpowers/specs/2026-09-30-notificacoes-design.md`](../specs/2026-09-30-notificacoes-design.md) — read it alongside this plan.

## Global Constraints

- No WebSocket/Realtime/push — plain `setInterval` poll, same as chat.
- `lida_em: datetime | None` — `null` = unread, a timestamp = read. No separate boolean.
- RLS enabled on `notificacoes` from its very first migration (`ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY`) — do not repeat the gap the chat feature's review caught on `mensagens_contato`.
- "Nova demanda compatível" (evento 6) is in-app only — no email. Every other event keeps or gains email via the existing `enviar_email`/`email_templates.py` helpers.
- A notification failure must never block the event it's attached to — `registrar_notificacao()` runs after the triggering action's own `db.commit()`, never before or instead of it.
- New endpoint errors use `erro_negocio()` — code `notificacao_inexistente` for the two POSTs when the id isn't the caller's.
- Rate limit `30/minute` on all three new endpoints (matches `GET /profissionais`, `GET /empresas`) — `GET /notificacoes` is polled every 20s per open tab.

## Review Focus

- **A notification for someone else's chat message must never be attributed to the sender** — the recipient of `nova_mensagem` is whichever party of the `Contato` is *not* `autor_id`, not always the same field. Getting this backwards means a user gets notified about their own messages and the actual recipient gets nothing.
- **Marking or listing another user's notification must 404, not leak or silently succeed** — same ownership-check shape as `_contato_das_partes`, applied per-row here instead of per-two-parties.
- **Re-accepting an already-accepted direct demand must not duplicate the notification** — `aceitar_demanda_direta`'s existing `if contato.aceito_em is None:` guard already makes the timestamp idempotent; the notification call must live *inside* that guard, not after it.
- **A professional with the right specialty but wrong city (or right city, wrong specialty) must not be notified** for "nova oportunidade" — both conditions are an AND, not an OR; a sloppy query would over-notify.
- **`total_nao_lidas` must reflect reality after a mark-as-read**, not just at the moment the page first loaded — the next `GET /notificacoes` poll must show the decremented count, since the frontend badge depends on it being live, not cached.

---

## File Structure

Backend:
- Create: `apps/api/app/models/notificacao.py` — `Notificacao` model, `TipoNotificacao` enum
- Modify: `apps/api/app/models/__init__.py` — register `Notificacao`, `TipoNotificacao`
- Create: `apps/api/alembic/versions/<rev>_add_notificacoes_table.py`
- Create: `apps/api/app/schemas/notificacao.py` — `NotificacaoRead`, `ListaNotificacoesResponse`, `MarcarTodasLidasResponse`
- Create: `apps/api/app/services/notificacao_service.py` — `registrar_notificacao`, `listar_notificacoes`, `marcar_lida`, `marcar_todas_lidas`
- Create: `apps/api/app/routers/notificacoes.py` — 3 routes
- Modify: `apps/api/app/main.py` — register the new router
- Modify: `apps/api/app/services/contato_service.py` — 3 trigger points
- Modify: `apps/api/app/services/demandas.py` — 2 trigger points (novo_interesse, nova_oportunidade) + compatible-professional query
- Modify: `apps/api/app/services/billing.py` — 1 trigger point (falha_pagamento)
- Modify: `apps/api/app/services/email_templates.py` — 2 new templates (`nova_mensagem_recebida`, `aceite_demanda_direta`)
- Modify: `apps/api/tests/fabrica.py` — `criar_notificacao()` factory
- Modify: `apps/api/tests/test_migrations.py` — extend `EXPECTED_TABLES`, `TABELAS_COM_RLS`
- Create: `apps/api/tests/test_notificacoes.py`

Frontend:
- Modify: `apps/web/lib/types.ts` — `TipoNotificacao`, `NotificacaoRead`, `ListaNotificacoesResponse`
- Modify: `apps/web/lib/api.ts` — `listarNotificacoes`, `marcarNotificacaoLida`, `marcarTodasNotificacoesLidas`
- Create: `apps/web/components/ui/NotificationBell.tsx`
- Modify: `apps/web/components/ui/Header.tsx` — render the bell
- Modify: `apps/web/app/(public)/buscar/page.tsx` — replace the dead button
- Modify: `apps/web/app/(painel)/avaliacoes/page.tsx`, `contatos/page.tsx`, `demandas/page.tsx`, `perfil/page.tsx`, `oportunidades/page.tsx` — insert the bell into each page's own header block

---

### Task 1: `notificacoes` table

**Files:**
- Create: `apps/api/app/models/notificacao.py`
- Modify: `apps/api/app/models/__init__.py`
- Create: `apps/api/alembic/versions/<rev>_add_notificacoes_table.py`
- Create: `apps/api/app/schemas/notificacao.py`
- Modify: `apps/api/tests/test_migrations.py`

**Interfaces:**
- Consumes: `app.core.database.Base`.
- Produces: `Notificacao` (model: `id: int`, `destinatario_id: uuid.UUID`, `tipo: TipoNotificacao`, `titulo: str`, `corpo: str`, `link: str`, `lida_em: datetime | None`, `criado_em: datetime`), `TipoNotificacao` enum (`novo_contato`, `nova_mensagem`, `aceite_demanda`, `novo_interesse`, `falha_pagamento`, `nova_oportunidade`), `NotificacaoRead`/`ListaNotificacoesResponse`/`MarcarTodasLidasResponse` schemas — all for Task 2 onward.

- [ ] **Step 1: Write the failing migration test**

Add to `apps/api/tests/test_migrations.py`:

```python
EXPECTED_TABLES = {
    "profiles",
    "especialidades",
    "profissionais",
    "profissional_especialidades",
    "empresas",
    "avaliacoes",
    "contatos",
    "mensagens_contato",
    "notificacoes",
    "links_pagamento",
    "planos",
    "assinaturas",
    "eventos_stripe",
    "demandas",
}

TABELAS_COM_RLS = {
    "planos",
    "assinaturas",
    "eventos_stripe",
    "demandas",
    "mensagens_contato",
    "notificacoes",
}
```

(One line added to each existing set.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_migrations.py -v`
Expected: FAIL — `notificacoes` missing from table list and from the RLS set.

- [ ] **Step 3: Create the model**

`apps/api/app/models/notificacao.py`:

```python
import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class TipoNotificacao(str, enum.Enum):
    novo_contato = "novo_contato"
    nova_mensagem = "nova_mensagem"
    aceite_demanda = "aceite_demanda"
    novo_interesse = "novo_interesse"
    falha_pagamento = "falha_pagamento"
    nova_oportunidade = "nova_oportunidade"


class Notificacao(Base):
    __tablename__ = "notificacoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    destinatario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), index=True, nullable=False
    )
    tipo: Mapped[TipoNotificacao] = mapped_column(
        SQLEnum(TipoNotificacao, name="tipo_notificacao_enum"), nullable=False
    )
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    corpo: Mapped[str] = mapped_column(Text, nullable=False)
    link: Mapped[str] = mapped_column(String(500), nullable=False)
    lida_em: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
```

- [ ] **Step 4: Register the model**

Modify `apps/api/app/models/__init__.py` — add import in alphabetical position (after `MensagemContato`, before `Plano`):

```python
from app.models.notificacao import Notificacao, TipoNotificacao
```

Add to `__all__` (alphabetical position, after `"MensagemContato",`):

```python
    "Notificacao",
    "TipoNotificacao",
```

- [ ] **Step 5: Write the schemas**

`apps/api/app/schemas/notificacao.py`:

```python
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.notificacao import TipoNotificacao


class NotificacaoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tipo: TipoNotificacao
    titulo: str
    corpo: str
    link: str
    lida_em: datetime | None
    criado_em: datetime


class ListaNotificacoesResponse(BaseModel):
    items: list[NotificacaoRead]
    total: int
    total_nao_lidas: int
    limit: int
    offset: int


class MarcarTodasLidasResponse(BaseModel):
    marcadas: int
```

- [ ] **Step 6: Write the migration**

Run: `cd apps/api && .venv/bin/alembic revision -m "add_notificacoes_table"`

This creates `apps/api/alembic/versions/<rev>_add_notificacoes_table.py` with a random `revision` id and `down_revision` auto-filled to the current head. Replace the generated empty bodies with:

```python
def upgrade() -> None:
    tipo_enum = postgresql.ENUM(
        "novo_contato",
        "nova_mensagem",
        "aceite_demanda",
        "novo_interesse",
        "falha_pagamento",
        "nova_oportunidade",
        name="tipo_notificacao_enum",
    )
    tipo_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "notificacoes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "destinatario_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("profiles.id", name="fk_notificacoes_destinatario_id"),
            nullable=False,
        ),
        sa.Column("tipo", tipo_enum, nullable=False),
        sa.Column("titulo", sa.String(200), nullable=False),
        sa.Column("corpo", sa.Text(), nullable=False),
        sa.Column("link", sa.String(500), nullable=False),
        sa.Column("lida_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_notificacoes_destinatario_id", "notificacoes", ["destinatario_id"])
    op.execute("ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.drop_index("ix_notificacoes_destinatario_id", table_name="notificacoes")
    op.drop_table("notificacoes")
    postgresql.ENUM(name="tipo_notificacao_enum").drop(op.get_bind(), checkfirst=True)
```

Make sure the file's imports include `from sqlalchemy.dialects import postgresql` (copy the import block from `apps/api/alembic/versions/122a523bd099_add_mensagens_contato_table.py` — same `sqlalchemy as sa` / `alembic.op` / `sqlalchemy.dialects.postgresql` trio).

- [ ] **Step 7: Apply the migration and run tests**

Run: `cd apps/api && .venv/bin/alembic upgrade head && .venv/bin/python -m pytest tests/test_migrations.py -v`
Expected: PASS — all migration tests, including the RLS set and the downgrade/upgrade round trip.

- [ ] **Step 8: Commit**

```bash
git add apps/api/app/models/notificacao.py apps/api/app/models/__init__.py apps/api/app/schemas/notificacao.py apps/api/alembic/versions/*_add_notificacoes_table.py apps/api/tests/test_migrations.py
git commit -m "feat(api): add notificacoes table and model"
```

---

### Task 2: Core service + 3 endpoints

**Files:**
- Create: `apps/api/app/services/notificacao_service.py`
- Create: `apps/api/app/routers/notificacoes.py`
- Modify: `apps/api/app/main.py`
- Modify: `apps/api/tests/fabrica.py` — add `criar_notificacao()`
- Create: `apps/api/tests/test_notificacoes.py`

**Interfaces:**
- Consumes: `Notificacao`, `TipoNotificacao` (Task 1), `NotificacaoRead`/`ListaNotificacoesResponse`/`MarcarTodasLidasResponse` (Task 1).
- Produces: `registrar_notificacao(db: Session, destinatario_id: uuid.UUID, tipo: TipoNotificacao, titulo: str, corpo: str, link: str) -> Notificacao` — used by Tasks 3, 4, 5 as the one shared creation point. `listar_notificacoes(db, user_id, limit=20, offset=0) -> tuple[list[Notificacao], int, int]` (items, total, total_nao_lidas). `marcar_lida(db, user_id, notificacao_id) -> Notificacao` — raises `erro_negocio(404, "notificacao_inexistente", ...)` if the id doesn't exist or isn't the caller's. `marcar_todas_lidas(db, user_id) -> int`. `criar_notificacao(db, destinatario_id, tipo=TipoNotificacao.novo_contato, titulo="...", corpo="...", link="...", lida_em=None) -> Notificacao` (test factory — direct model construction, flushes but does not commit, same convention as `criar_contato`).

- [ ] **Step 1: Add the test factory**

Modify `apps/api/tests/fabrica.py` — add import (after the `Especialidade` import, alphabetical):

```python
from app.models.notificacao import Notificacao, TipoNotificacao
```

Add function (after `criar_demanda`, before `payload_demanda`):

```python
def criar_notificacao(
    db,
    destinatario_id: uuid.UUID,
    tipo: TipoNotificacao = TipoNotificacao.novo_contato,
    titulo: str = "Novo contato recebido",
    corpo: str = "Alguém enviou uma mensagem.",
    link: str = "/contatos/1",
    lida_em: datetime | None = None,
) -> Notificacao:
    notificacao = Notificacao(
        destinatario_id=destinatario_id,
        tipo=tipo,
        titulo=titulo,
        corpo=corpo,
        link=link,
        lida_em=lida_em,
    )
    db.add(notificacao)
    db.flush()
    return notificacao
```

- [ ] **Step 2: Write the failing tests**

Create `apps/api/tests/test_notificacoes.py`:

```python
import uuid

from tests.fabrica import autenticar, criar_empresa, criar_notificacao, criar_profissional


def test_listar_notificacoes_retorna_so_as_proprias(client, db_session):
    user_a = criar_profissional(db_session)
    user_b = criar_profissional(db_session, nome="Outro")
    criar_notificacao(db_session, destinatario_id=user_a, titulo="Pra A")
    criar_notificacao(db_session, destinatario_id=user_b, titulo="Pra B")
    db_session.commit()

    autenticar(user_a)
    resposta = client.get("/notificacoes")

    assert resposta.status_code == 200
    body = resposta.json()
    assert body["total"] == 1
    assert body["items"][0]["titulo"] == "Pra A"


def test_listar_notificacoes_conta_nao_lidas_corretamente(client, db_session):
    user_id = criar_profissional(db_session)
    criar_notificacao(db_session, destinatario_id=user_id)
    criar_notificacao(db_session, destinatario_id=user_id)
    from datetime import UTC, datetime

    criar_notificacao(db_session, destinatario_id=user_id, lida_em=datetime.now(UTC))
    db_session.commit()

    autenticar(user_id)
    resposta = client.get("/notificacoes")

    body = resposta.json()
    assert body["total"] == 3
    assert body["total_nao_lidas"] == 2


def test_listar_notificacoes_requires_authentication(client):
    resposta = client.get("/notificacoes")
    assert resposta.status_code == 401


def test_listar_notificacoes_respeita_limit_e_offset(client, db_session):
    user_id = criar_profissional(db_session)
    criar_notificacao(db_session, destinatario_id=user_id, titulo="Primeira")
    criar_notificacao(db_session, destinatario_id=user_id, titulo="Segunda")
    db_session.commit()

    autenticar(user_id)
    resposta = client.get("/notificacoes", params={"limit": 1, "offset": 0})

    body = resposta.json()
    assert body["total"] == 2
    assert len(body["items"]) == 1
    # mais recente primeiro — "Segunda" foi criada depois
    assert body["items"][0]["titulo"] == "Segunda"


def test_marcar_lida_marca_a_propria(client, db_session):
    user_id = criar_profissional(db_session)
    notificacao = criar_notificacao(db_session, destinatario_id=user_id)
    db_session.commit()

    autenticar(user_id)
    resposta = client.post(f"/notificacoes/{notificacao.id}/marcar-lida")

    assert resposta.status_code == 200
    assert resposta.json()["lida_em"] is not None


def test_marcar_lida_de_outro_usuario_recebe_404(client, db_session):
    dono = criar_profissional(db_session)
    outro = criar_profissional(db_session, nome="Outro")
    notificacao = criar_notificacao(db_session, destinatario_id=dono)
    db_session.commit()

    autenticar(outro)
    resposta = client.post(f"/notificacoes/{notificacao.id}/marcar-lida")

    assert resposta.status_code == 404
    assert resposta.json()["detail"]["code"] == "notificacao_inexistente"


def test_marcar_lida_inexistente_recebe_404(client, db_session):
    user_id = criar_profissional(db_session)
    db_session.commit()

    autenticar(user_id)
    resposta = client.post("/notificacoes/999999/marcar-lida")

    assert resposta.status_code == 404


def test_marcar_lida_e_idempotente(client, db_session):
    user_id = criar_profissional(db_session)
    notificacao = criar_notificacao(db_session, destinatario_id=user_id)
    db_session.commit()

    autenticar(user_id)
    primeira = client.post(f"/notificacoes/{notificacao.id}/marcar-lida")
    timestamp_original = primeira.json()["lida_em"]

    segunda = client.post(f"/notificacoes/{notificacao.id}/marcar-lida")

    assert segunda.status_code == 200
    assert segunda.json()["lida_em"] == timestamp_original


def test_marcar_todas_lidas_marca_so_as_proprias_nao_lidas(client, db_session):
    user_id = criar_profissional(db_session)
    outro = criar_profissional(db_session, nome="Outro")
    criar_notificacao(db_session, destinatario_id=user_id)
    criar_notificacao(db_session, destinatario_id=user_id)
    criar_notificacao(db_session, destinatario_id=outro)
    db_session.commit()

    autenticar(user_id)
    resposta = client.post("/notificacoes/marcar-todas-lidas")

    assert resposta.status_code == 200
    assert resposta.json()["marcadas"] == 2

    segunda_listagem = client.get("/notificacoes")
    assert segunda_listagem.json()["total_nao_lidas"] == 0

    autenticar(outro)
    listagem_outro = client.get("/notificacoes")
    assert listagem_outro.json()["total_nao_lidas"] == 1
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_notificacoes.py -v`
Expected: FAIL — 404 Not Found on every request (no routes registered yet).

- [ ] **Step 4: Implement the service**

`apps/api/app/services/notificacao_service.py`:

```python
import uuid
from datetime import UTC, datetime

from fastapi import status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.errors import erro_negocio
from app.models.notificacao import Notificacao, TipoNotificacao


def registrar_notificacao(
    db: Session,
    destinatario_id: uuid.UUID,
    tipo: TipoNotificacao,
    titulo: str,
    corpo: str,
    link: str,
) -> Notificacao:
    notificacao = Notificacao(
        destinatario_id=destinatario_id, tipo=tipo, titulo=titulo, corpo=corpo, link=link
    )
    db.add(notificacao)
    db.commit()
    db.refresh(notificacao)
    return notificacao


def listar_notificacoes(
    db: Session, user_id: uuid.UUID, limit: int = 20, offset: int = 0
) -> tuple[list[Notificacao], int, int]:
    total = (
        db.scalar(
            select(func.count())
            .select_from(Notificacao)
            .where(Notificacao.destinatario_id == user_id)
        )
        or 0
    )
    total_nao_lidas = (
        db.scalar(
            select(func.count())
            .select_from(Notificacao)
            .where(Notificacao.destinatario_id == user_id, Notificacao.lida_em.is_(None))
        )
        or 0
    )
    items = list(
        db.scalars(
            select(Notificacao)
            .where(Notificacao.destinatario_id == user_id)
            .order_by(Notificacao.criado_em.desc())
            .limit(limit)
            .offset(offset)
        )
    )
    return items, total, total_nao_lidas


def _notificacao_do_usuario(db: Session, user_id: uuid.UUID, notificacao_id: int) -> Notificacao:
    notificacao = db.get(Notificacao, notificacao_id)
    if notificacao is None or notificacao.destinatario_id != user_id:
        raise erro_negocio(
            status.HTTP_404_NOT_FOUND, "notificacao_inexistente", "Notificação não encontrada"
        )
    return notificacao


def marcar_lida(db: Session, user_id: uuid.UUID, notificacao_id: int) -> Notificacao:
    notificacao = _notificacao_do_usuario(db, user_id, notificacao_id)
    if notificacao.lida_em is None:
        notificacao.lida_em = datetime.now(UTC)
        db.commit()
        db.refresh(notificacao)
    return notificacao


def marcar_todas_lidas(db: Session, user_id: uuid.UUID) -> int:
    resultado = db.execute(
        update(Notificacao)
        .where(Notificacao.destinatario_id == user_id, Notificacao.lida_em.is_(None))
        .values(lida_em=datetime.now(UTC))
    )
    db.commit()
    return resultado.rowcount
```

- [ ] **Step 5: Implement the router**

`apps/api/app/routers/notificacoes.py`:

```python
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.rate_limit import limiter
from app.schemas.notificacao import (
    ListaNotificacoesResponse,
    MarcarTodasLidasResponse,
    NotificacaoRead,
)
from app.services.notificacao_service import listar_notificacoes, marcar_lida, marcar_todas_lidas

router = APIRouter(prefix="/notificacoes", tags=["notificacoes"])


@router.get("", response_model=ListaNotificacoesResponse)
@limiter.limit("30/minute")
def listar_notificacoes_route(
    request: Request,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ListaNotificacoesResponse:
    items, total, total_nao_lidas = listar_notificacoes(db, current_user.id, limit, offset)
    return ListaNotificacoesResponse(
        items=[NotificacaoRead.model_validate(n) for n in items],
        total=total,
        total_nao_lidas=total_nao_lidas,
        limit=limit,
        offset=offset,
    )


@router.post("/{notificacao_id}/marcar-lida", response_model=NotificacaoRead)
@limiter.limit("30/minute")
def marcar_lida_route(
    request: Request,
    notificacao_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificacaoRead:
    return marcar_lida(db, current_user.id, notificacao_id)


@router.post("/marcar-todas-lidas", response_model=MarcarTodasLidasResponse)
@limiter.limit("30/minute")
def marcar_todas_lidas_route(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MarcarTodasLidasResponse:
    marcadas = marcar_todas_lidas(db, current_user.id)
    return MarcarTodasLidasResponse(marcadas=marcadas)
```

- [ ] **Step 6: Register the router**

Modify `apps/api/app/main.py` — add `notificacoes` to the import block from `app.routers` (alphabetical position, after `especialidades`, before `perfis` — check the existing list and insert correctly), and add:

```python
app.include_router(notificacoes.router)
```

(anywhere after `app.include_router(especialidades.router)`, matching the existing ungrouped ordering in that file).

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_notificacoes.py -v`
Expected: PASS (9 tests).

- [ ] **Step 8: Commit**

```bash
git add apps/api/app/services/notificacao_service.py apps/api/app/routers/notificacoes.py apps/api/app/main.py apps/api/tests/fabrica.py apps/api/tests/test_notificacoes.py
git commit -m "feat(api): add GET/POST /notificacoes endpoints"
```

---

### Task 3: Triggers in `contato_service.py` (novo_contato, nova_mensagem, aceite_demanda)

**Files:**
- Modify: `apps/api/app/services/contato_service.py`
- Modify: `apps/api/app/services/email_templates.py` — 2 new templates
- Modify: `apps/api/tests/test_contatos.py`

**Interfaces:**
- Consumes: `registrar_notificacao()` (Task 2), `TipoNotificacao` (Task 1), `enviar_email`/`email_templates` (existing).
- Produces: nothing new for later tasks — this task only wires existing service functions.

- [ ] **Step 1: Write the failing tests**

Add to `apps/api/tests/test_contatos.py`:

```python
def test_create_contato_gera_notificacao_para_profissional(client, db_session):
    solicitante_id = uuid.uuid4()
    db_session.add(Profile(id=solicitante_id, papel=Papel.empresa, nome="Clínica X"))

    profissional_id = uuid.uuid4()
    db_session.add(
        Profile(id=profissional_id, papel=Papel.profissional, nome="Maria Silva", email="maria@example.com")
    )
    db_session.flush()
    db_session.add(Profissional(user_id=profissional_id))
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=solicitante_id, email="x@example.com", role="authenticated"
    )

    resposta = client.post(
        "/contatos", json={"profissional_id": str(profissional_id), "mensagem": "Oi"}
    )
    assert resposta.status_code == 200

    autenticar(profissional_id)
    notificacoes = client.get("/notificacoes")
    assert notificacoes.json()["total"] == 1
    assert notificacoes.json()["items"][0]["tipo"] == "novo_contato"


def test_criar_mensagem_notifica_a_outra_parte_nao_o_autor(client, db_session):
    solicitante_id = criar_empresa(db_session)
    profissional_id = criar_profissional(db_session)
    contato = criar_contato(db_session, solicitante_id, profissional_id)
    db_session.commit()

    autenticar(solicitante_id)
    client.post(f"/contatos/{contato.id}/mensagens", json={"corpo": "Oi"})

    autenticar(profissional_id)
    notificacoes_profissional = client.get("/notificacoes")
    assert notificacoes_profissional.json()["total"] == 1
    assert notificacoes_profissional.json()["items"][0]["tipo"] == "nova_mensagem"

    autenticar(solicitante_id)
    notificacoes_solicitante = client.get("/notificacoes")
    assert notificacoes_solicitante.json()["total"] == 0


def test_aceitar_gera_notificacao_para_solicitante_so_na_primeira_vez(client, db_session):
    solicitante_id = criar_empresa(db_session)
    profissional_id = criar_profissional(db_session)
    contato = criar_contato(db_session, solicitante_id, profissional_id)
    db_session.commit()

    autenticar(profissional_id)
    client.post(f"/contatos/{contato.id}/aceitar")
    client.post(f"/contatos/{contato.id}/aceitar")  # re-aceite idempotente

    autenticar(solicitante_id)
    notificacoes = client.get("/notificacoes")
    assert notificacoes.json()["total"] == 1
    assert notificacoes.json()["items"][0]["tipo"] == "aceite_demanda"
```

Add these imports to the top of `apps/api/tests/test_contatos.py` if not already present (check the existing import block first — `uuid`, `Profile`, `Papel`, `Profissional`, `CurrentUser`, `get_current_user`, `app`, `autenticar`, `criar_contato`, `criar_empresa`, `criar_profissional` should all already be imported from earlier tasks in this file).

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_contatos.py -v -k "notificacao or notifica"`
Expected: FAIL — each new test's `/notificacoes` assertion fails (`total == 0` instead of `1`), since nothing creates a `Notificacao` yet.

- [ ] **Step 3: Add the two new email templates**

Modify `apps/api/app/services/email_templates.py` — add at the end of the file:

```python
def nova_mensagem_recebida(link_contato: str) -> tuple[str, str, str]:
    assunto = "Você recebeu uma nova mensagem no SaúdeConecta"
    texto = f"Você recebeu uma nova mensagem.\n\nVeja a conversa: {link_contato}\n"
    html = (
        "<p>Você recebeu uma nova mensagem.</p>"
        f'<p><a href="{escape(link_contato)}">Ver a conversa</a></p>'
    )
    return assunto, texto, html


def aceite_demanda_direta(link_contato: str) -> tuple[str, str, str]:
    assunto = "O profissional aceitou sua demanda direta"
    texto = (
        "O profissional aceitou atender sua demanda direta.\n\n"
        f"Veja o contato: {link_contato}\n"
    )
    html = (
        "<p>O profissional aceitou atender sua demanda direta.</p>"
        f'<p><a href="{escape(link_contato)}">Ver o contato</a></p>'
    )
    return assunto, texto, html
```

- [ ] **Step 4: Wire the three trigger points**

Modify `apps/api/app/services/contato_service.py` — update the import block at the top:

```python
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import erro_negocio
from app.models.contato import Contato
from app.models.mensagem_contato import MensagemContato
from app.models.notificacao import TipoNotificacao
from app.models.profile import Profile
from app.models.profissional import Profissional
from app.schemas.contato import ContatoCreateRequest
from app.services import email_templates
from app.services.email_service import enviar_email, send_contact_notification_email
from app.services.notificacao_service import registrar_notificacao
```

In `create_contato`, add the notification call right after `db.refresh(contato)`, before the existing `if profissional.profile.email:` email block:

```python
    db.refresh(contato)

    registrar_notificacao(
        db,
        destinatario_id=data.profissional_id,
        tipo=TipoNotificacao.novo_contato,
        titulo="Novo contato recebido",
        corpo=f"{solicitante.nome} enviou uma mensagem.",
        link=f"/contatos/{contato.id}",
    )

    if profissional.profile.email:
        send_contact_notification_email(profissional.profile.email, solicitante.nome, data.mensagem)
```

In `criar_mensagem`, replace the body with:

```python
def criar_mensagem(
    db: Session, user_id: uuid.UUID, contato_id: int, corpo: str
) -> MensagemContato:
    contato = _contato_das_partes(db, contato_id, user_id)
    mensagem = MensagemContato(contato_id=contato_id, autor_id=user_id, corpo=corpo)
    db.add(mensagem)
    db.commit()
    db.refresh(mensagem)

    destinatario_id = (
        contato.profissional_id if user_id == contato.solicitante_id else contato.solicitante_id
    )
    registrar_notificacao(
        db,
        destinatario_id=destinatario_id,
        tipo=TipoNotificacao.nova_mensagem,
        titulo="Nova mensagem recebida",
        corpo=corpo[:200],
        link=f"/contatos/{contato_id}",
    )
    destinatario_profile = db.get(Profile, destinatario_id)
    if destinatario_profile is not None and destinatario_profile.email:
        link = f"{get_settings().app_url}/contatos/{contato_id}"
        enviar_email(destinatario_profile.email, *email_templates.nova_mensagem_recebida(link))

    return mensagem
```

In `aceitar_demanda_direta`, replace the body with:

```python
def aceitar_demanda_direta(db: Session, user_id: uuid.UUID, contato_id: int) -> Contato:
    contato = _contato_das_partes(db, contato_id, user_id)
    if user_id != contato.profissional_id:
        raise erro_negocio(
            status.HTTP_403_FORBIDDEN,
            "apenas_profissional_aceita",
            "Só o profissional pode aceitar a demanda direta",
        )
    if contato.aceito_em is None:
        contato.aceito_em = datetime.now(UTC)
        db.commit()
        db.refresh(contato)

        registrar_notificacao(
            db,
            destinatario_id=contato.solicitante_id,
            tipo=TipoNotificacao.aceite_demanda,
            titulo="Demanda direta aceita",
            corpo="O profissional aceitou atender sua demanda direta.",
            link=f"/contatos/{contato_id}",
        )
        solicitante_profile = db.get(Profile, contato.solicitante_id)
        if solicitante_profile is not None and solicitante_profile.email:
            link = f"{get_settings().app_url}/contatos/{contato_id}"
            enviar_email(solicitante_profile.email, *email_templates.aceite_demanda_direta(link))

    return contato
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_contatos.py -v`
Expected: PASS (all tests in the file, including the 3 new ones — no regressions in the existing chat/aceite tests).

- [ ] **Step 6: Commit**

```bash
git add apps/api/app/services/contato_service.py apps/api/app/services/email_templates.py apps/api/tests/test_contatos.py
git commit -m "feat(api): notify on novo_contato, nova_mensagem, aceite_demanda"
```

---

### Task 4: Triggers in `demandas.py` and `billing.py` (novo_interesse, falha_pagamento)

**Files:**
- Modify: `apps/api/app/services/demandas.py`
- Modify: `apps/api/app/services/billing.py`
- Modify: `apps/api/tests/test_demandas.py`
- Modify: `apps/api/tests/test_webhooks.py`

**Interfaces:**
- Consumes: `registrar_notificacao()`, `TipoNotificacao` (Task 1/2).
- Produces: nothing new for later tasks.

- [ ] **Step 1: Write the failing test for novo_interesse**

Add to `apps/api/tests/test_demandas.py` (near the other `demonstrar_interesse` tests — check the file for the existing `cenario` fixture and `_interesse` helper before writing, and reuse them):

```python
def test_interesse_gera_notificacao_para_empresa(client, db_session, cenario):
    empresa_id, demanda, profissional_id = cenario
    autenticar(profissional_id)
    response, _ = _interesse(client, demanda.id)
    assert response.status_code == 201

    autenticar(empresa_id)
    notificacoes = client.get("/notificacoes")
    assert notificacoes.json()["total"] == 1
    assert notificacoes.json()["items"][0]["tipo"] == "novo_interesse"
```

- [ ] **Step 2: Write the failing test for falha_pagamento**

`apps/api/tests/test_webhooks.py` already covers `invoice.payment_failed` (see `test_pagamento_falhou_envia_email_com_link_da_assinatura`, around line 283) using `_evento`/`_enviar` helpers to post a real HMAC-signed payload — reuse that exact pattern. Add its import line's `autenticar`:

```python
from tests.fabrica import autenticar, criar_assinatura, criar_empresa, plano
```

Add the test near the existing `test_pagamento_falhou_envia_email_com_link_da_assinatura`:

```python
def test_pagamento_falhou_gera_notificacao_in_app(client, db_session, retrieve):
    empresa_id = criar_empresa(db_session, email="financeiro2@clinica.com")
    criar_assinatura(db_session, empresa_id, subscription_id="sub_falha2", customer_id="cus_falha2")
    db_session.commit()
    payload = _evento(
        "invoice.payment_failed",
        {"id": "in_2", "object": "invoice", "customer": "cus_falha2"},
    )

    with patch("app.services.billing.enviar_email"):
        response = _enviar(client, payload)
    assert response.status_code == 200

    autenticar(empresa_id)
    notificacoes = client.get("/notificacoes")
    assert notificacoes.json()["total"] == 1
    assert notificacoes.json()["items"][0]["tipo"] == "falha_pagamento"
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_demandas.py -v -k notificacao && .venv/bin/python -m pytest tests/test_webhooks.py -v -k notificacao`
Expected: FAIL — both assert `total == 1` but get `0`.

- [ ] **Step 4: Wire the two trigger points**

Modify `apps/api/app/services/demandas.py` — add to the import block:

```python
from app.models.notificacao import TipoNotificacao
from app.services.notificacao_service import registrar_notificacao
```

In `demonstrar_interesse`, add right after the existing email block at the end of the function:

```python
    empresa_profile = db.get(Profile, demanda.empresa_id)
    if empresa_profile is not None and empresa_profile.email:
        link = f"{get_settings().app_url}/contatos/{contato.id}"
        enviar_email(empresa_profile.email, *email_templates.novo_interesse_em_demanda(link))

    registrar_notificacao(
        db,
        destinatario_id=demanda.empresa_id,
        tipo=TipoNotificacao.novo_interesse,
        titulo="Novo interesse em demanda",
        corpo="Um profissional demonstrou interesse na sua demanda.",
        link=f"/contatos/{contato.id}",
    )
    return contato
```

Modify `apps/api/app/services/billing.py` — add to the import block:

```python
from app.models.notificacao import TipoNotificacao
from app.services.notificacao_service import registrar_notificacao
```

In `_pagamento_falhou`, add right after the existing `enviar_email(...)` call:

```python
def _pagamento_falhou(db: Session, invoice: Any) -> None:
    customer_id = _campo(invoice, "customer")
    assinatura = db.scalar(
        select(Assinatura)
        .where(Assinatura.stripe_customer_id == customer_id)
        .order_by(Assinatura.criado_em.desc())
        .limit(1)
    )
    if assinatura is None:
        return
    profile = db.get(Profile, assinatura.empresa_id)
    if profile is None or not profile.email:
        return
    link = f"{get_settings().app_url}/empresa/assinatura"
    enviar_email(profile.email, *email_templates.falha_pagamento_assinatura(link))
    registrar_notificacao(
        db,
        destinatario_id=assinatura.empresa_id,
        tipo=TipoNotificacao.falha_pagamento,
        titulo="Falha no pagamento",
        corpo="Não conseguimos processar o pagamento da sua assinatura.",
        link="/empresa/assinatura",
    )
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_demandas.py tests/test_webhooks.py -v`
Expected: PASS — the full contents of both files, no regressions.

- [ ] **Step 6: Commit**

```bash
git add apps/api/app/services/demandas.py apps/api/app/services/billing.py apps/api/tests/test_demandas.py apps/api/tests/test_webhooks.py
git commit -m "feat(api): notify on novo_interesse and falha_pagamento"
```

---

### Task 5: Trigger in `demandas.py` (nova_oportunidade — compatible professionals)

**Files:**
- Modify: `apps/api/app/services/demandas.py`
- Modify: `apps/api/tests/test_demandas.py`

**Interfaces:**
- Consumes: `registrar_notificacao()`, `TipoNotificacao` (Task 1/2), `profissional_especialidades` (existing join table).
- Produces: nothing new for later tasks.

- [ ] **Step 1: Write the failing tests**

Add to `apps/api/tests/test_demandas.py`:

```python
def test_criar_demanda_notifica_profissional_compativel(client, db_session):
    empresa_id = criar_empresa(db_session, email="rh@clinica.com")
    criar_assinatura(db_session, empresa_id)
    profissional_id = criar_profissional(
        db_session, especialidades=("Enfermagem",), cidade="São Paulo"
    )
    db_session.commit()

    autenticar(empresa_id)
    resposta = client.post("/demandas", json=payload_demanda(db_session))
    assert resposta.status_code == 201

    autenticar(profissional_id)
    notificacoes = client.get("/notificacoes")
    assert notificacoes.json()["total"] == 1
    assert notificacoes.json()["items"][0]["tipo"] == "nova_oportunidade"


def test_criar_demanda_nao_notifica_profissional_de_outra_especialidade(client, db_session):
    empresa_id = criar_empresa(db_session, email="rh@clinica.com")
    criar_assinatura(db_session, empresa_id)
    profissional_id = criar_profissional(
        db_session, especialidades=("Fisioterapia",), cidade="São Paulo"
    )
    db_session.commit()

    autenticar(empresa_id)
    client.post("/demandas", json=payload_demanda(db_session))

    autenticar(profissional_id)
    notificacoes = client.get("/notificacoes")
    assert notificacoes.json()["total"] == 0


def test_criar_demanda_nao_notifica_profissional_de_outra_cidade(client, db_session):
    empresa_id = criar_empresa(db_session, email="rh@clinica.com")
    criar_assinatura(db_session, empresa_id)
    profissional_id = criar_profissional(
        db_session, especialidades=("Enfermagem",), cidade="Curitiba"
    )
    db_session.commit()

    autenticar(empresa_id)
    client.post("/demandas", json=payload_demanda(db_session))

    autenticar(profissional_id)
    notificacoes = client.get("/notificacoes")
    assert notificacoes.json()["total"] == 0
```

(`payload_demanda` from `tests/fabrica.py` already defaults `cidade` to `"São Paulo"` and its especialidade to `"Enfermagem"` — matching what `criar_profissional`'s own defaults produce, so the "compatible" test needs no override, and the two negative tests only change one axis each.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_demandas.py -v -k "notifica_profissional or nao_notifica"`
Expected: FAIL on the first test (`total == 0` instead of `1`); the two negative tests already pass trivially (nothing notifies anyone yet) — that's expected and not a sign of anything: they'll stay green through Step 4, the positive test is the one proving the feature exists.

- [ ] **Step 3: Implement the compatible-professionals query and wire it**

Modify `apps/api/app/services/demandas.py` — add to the import block:

```python
from app.models.profissional_especialidade import profissional_especialidades
```

(`TipoNotificacao` and `registrar_notificacao` are already imported from Task 4.)

Add a new function, near `criar_demanda`:

```python
def _notificar_profissionais_compativeis(db: Session, demanda: Demanda) -> None:
    profissional_ids = db.scalars(
        select(Profissional.user_id)
        .join(Profile, Profissional.user_id == Profile.id)
        .join(
            profissional_especialidades,
            profissional_especialidades.c.profissional_id == Profissional.user_id,
        )
        .where(
            profissional_especialidades.c.especialidade_id == demanda.especialidade_id,
            func.lower(Profile.cidade) == demanda.cidade.strip().lower(),
        )
    ).all()
    for profissional_id in profissional_ids:
        registrar_notificacao(
            db,
            destinatario_id=profissional_id,
            tipo=TipoNotificacao.nova_oportunidade,
            titulo="Nova oportunidade compatível",
            corpo=f"Uma nova demanda em {demanda.cidade} bate com sua especialidade.",
            link="/oportunidades",
        )
```

Modify `criar_demanda` to call it right before the `return`:

```python
def criar_demanda(db: Session, user_id: uuid.UUID, data: DemandaCreate) -> DemandaRead:
    empresa = verificar_publicacao_demanda(db, user_id)
    if db.get(Especialidade, data.especialidade_id) is None:
        raise erro_negocio(
            status.HTTP_400_BAD_REQUEST, "especialidade_inexistente", "Especialidade inexistente"
        )
    demanda = Demanda(empresa_id=empresa.user_id, status=StatusDemanda.aberta, **data.model_dump())
    db.add(demanda)
    db.commit()
    db.refresh(demanda)
    _notificar_profissionais_compativeis(db, demanda)
    return DemandaRead(**_campos_leitura(demanda, empresa.nome_fantasia))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_demandas.py -v`
Expected: PASS — the full file, including the 3 new tests and every pre-existing `test_demandas.py` test (no regressions).

- [ ] **Step 5: Run the full backend suite**

Run: `cd apps/api && .venv/bin/python -m pytest -q && .venv/bin/black --check app tests && .venv/bin/ruff check app tests`
Expected: all pass, 0 formatting/lint issues.

- [ ] **Step 6: Commit**

```bash
git add apps/api/app/services/demandas.py apps/api/tests/test_demandas.py
git commit -m "feat(api): notify compatible professionals when a demanda is published"
```

---

### Task 6: Frontend types, api client, NotificationBell component

**Files:**
- Modify: `apps/web/lib/types.ts`
- Modify: `apps/web/lib/api.ts`
- Create: `apps/web/components/ui/NotificationBell.tsx`

**Interfaces:**
- Consumes: `useCurrentUser()` (existing, for `session`), `api` object pattern (existing `request<T>()` helper).
- Produces: `TipoNotificacao`, `NotificacaoRead`, `ListaNotificacoesResponse` (types), `api.listarNotificacoes({limit?, offset?})`, `api.marcarNotificacaoLida(id: number)`, `api.marcarTodasNotificacoesLidas()`, and the `NotificationBell` component (no props) — all consumed by Task 7.

- [ ] **Step 1: Add the types**

Modify `apps/web/lib/types.ts` — add near the end of the file (after `ErroNegocio`):

```typescript
export type TipoNotificacao =
  | "novo_contato"
  | "nova_mensagem"
  | "aceite_demanda"
  | "novo_interesse"
  | "falha_pagamento"
  | "nova_oportunidade";

export interface NotificacaoRead {
  id: number;
  tipo: TipoNotificacao;
  titulo: string;
  corpo: string;
  link: string;
  lida_em: string | null;
  criado_em: string;
}

export interface ListaNotificacoesResponse {
  items: NotificacaoRead[];
  total: number;
  total_nao_lidas: number;
  limit: number;
  offset: number;
}
```

- [ ] **Step 2: Add the api methods**

Modify `apps/web/lib/api.ts` — add `ListaNotificacoesResponse` to the type-only import block (alphabetical position, near `InteresseResponse`/`MensagemContatoRead`).

Add to the `api` object (a new section, after the `Assinatura B2B` section at the end):

```typescript
  // Notificações
  listarNotificacoes: (params: { limit?: number; offset?: number } = {}) =>
    request<ListaNotificacoesResponse>(`/notificacoes${qs(params)}`),

  marcarNotificacaoLida: (id: number) =>
    request<void>(`/notificacoes/${id}/marcar-lida`, { method: "POST" }),

  marcarTodasNotificacoesLidas: () =>
    request<{ marcadas: number }>("/notificacoes/marcar-todas-lidas", { method: "POST" }),
```

- [ ] **Step 3: Write the component**

`apps/web/components/ui/NotificationBell.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MaterialIcon } from "./MaterialIcon";
import { useCurrentUser } from "@/lib/use-current-user";
import { api } from "@/lib/api";
import type { NotificacaoRead } from "@/lib/types";

export function NotificationBell() {
  const { session } = useCurrentUser();
  const [aberto, setAberto] = useState(false);
  const [notificacoes, setNotificacoes] = useState<NotificacaoRead[]>([]);
  const [totalNaoLidas, setTotalNaoLidas] = useState(0);

  useEffect(() => {
    if (!session) return;
    let cancelado = false;
    async function buscar() {
      try {
        const resposta = await api.listarNotificacoes({ limit: 10 });
        if (!cancelado) {
          setNotificacoes(resposta.items);
          setTotalNaoLidas(resposta.total_nao_lidas);
        }
      } catch {
        // poll silencioso — próxima tentativa em 20s
      }
    }
    buscar();
    const intervalo = setInterval(buscar, 20000);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [session]);

  async function marcarComoLida(id: number) {
    try {
      await api.marcarNotificacaoLida(id);
      setNotificacoes((atual) =>
        atual.map((n) => (n.id === id ? { ...n, lida_em: new Date().toISOString() } : n)),
      );
      setTotalNaoLidas((atual) => Math.max(0, atual - 1));
    } catch {
      // ignora — próximo poll corrige
    }
  }

  if (!session) return null;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notificações"
        onClick={() => setAberto((atual) => !atual)}
        className="relative w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-on-surface-variant neu-surface-sm neu-pressable"
      >
        <MaterialIcon name="notifications" />
        {totalNaoLidas > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error text-[10px] font-label-sm flex items-center justify-center">
            {totalNaoLidas > 9 ? "9+" : totalNaoLidas}
          </span>
        )}
      </button>
      {aberto && (
        <div className="absolute right-0 top-14 w-80 max-h-96 overflow-y-auto rounded-2xl neu-surface bg-surface-container-lowest p-space-sm flex flex-col gap-space-xs z-50">
          {notificacoes.length === 0 && (
            <p className="font-caption text-caption text-on-surface-variant text-center py-space-sm">
              Nenhuma notificação ainda.
            </p>
          )}
          {notificacoes.map((n) => (
            <Link
              key={n.id}
              href={n.link}
              onClick={() => {
                if (!n.lida_em) marcarComoLida(n.id);
                setAberto(false);
              }}
              className={`rounded-xl p-space-sm flex flex-col gap-0.5 ${
                n.lida_em ? "bg-transparent" : "bg-secondary-container/40"
              }`}
            >
              <span className="font-label-md text-label-md text-on-surface">{n.titulo}</span>
              <span className="font-caption text-caption text-on-surface-variant line-clamp-2">
                {n.corpo}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors (additive types/methods/component; nothing consumes the component yet).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/types.ts apps/web/lib/api.ts apps/web/components/ui/NotificationBell.tsx
git commit -m "feat(web): add notification types, api client, and NotificationBell component"
```

---

### Task 7: Wire the bell into every painel page + live verification

**Files:**
- Modify: `apps/web/components/ui/Header.tsx`
- Modify: `apps/web/app/(public)/buscar/page.tsx`
- Modify: `apps/web/app/(painel)/avaliacoes/page.tsx`
- Modify: `apps/web/app/(painel)/contatos/page.tsx`
- Modify: `apps/web/app/(painel)/demandas/page.tsx`
- Modify: `apps/web/app/(painel)/perfil/page.tsx`
- Modify: `apps/web/app/(painel)/oportunidades/page.tsx`

**Interfaces:**
- Consumes: `NotificationBell` (Task 6, no props).

- [ ] **Step 1: Header.tsx**

Modify `apps/web/components/ui/Header.tsx` — add the import:

```typescript
import { NotificationBell } from "./NotificationBell";
```

Add `<NotificationBell />` right after the closing `))}` of the `{action && (...)}` block, still inside the row `<div>`:

```tsx
        {action &&
          (action.href ? (
            <Link
              href={action.href}
              aria-label={action.label}
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary neu-surface-sm neu-pressable transition-colors"
            >
              <MaterialIcon name={action.icon} />
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              aria-label={action.label}
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary neu-surface-sm neu-pressable transition-colors"
            >
              <MaterialIcon name={action.icon} />
            </button>
          ))}
        <NotificationBell />
      </div>
    </header>
```

- [ ] **Step 2: buscar/page.tsx — replace the dead button**

Modify `apps/web/app/(public)/buscar/page.tsx` — add the import:

```typescript
import { NotificationBell } from "@/components/ui/NotificationBell";
```

Replace:

```tsx
          <div className="flex items-center gap-space-xs">
            <button aria-label="Notificações" className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant neu-surface-sm neu-pressable">
              <MaterialIcon name="notifications" />
            </button>
          </div>
```

with:

```tsx
          <div className="flex items-center gap-space-xs">
            <NotificationBell />
          </div>
```

(`MaterialIcon`'s import in this file may become unused if nothing else in the page references it — check before removing; leave the import if anything else still uses `<MaterialIcon`.)

- [ ] **Step 3: avaliacoes/page.tsx**

Modify `apps/web/app/(painel)/avaliacoes/page.tsx` — add the import, then wrap the existing right-side conditional so the bell sits next to it:

```tsx
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Logo compact />
            <h1 className="font-headline-md text-headline-md text-on-surface">Minhas Avaliações</h1>
          </div>
          <div className="flex items-center gap-space-xs">
            <NotificationBell />
            {media != null && (
              <span className="inline-flex items-center gap-1 font-label-md text-label-md text-on-surface">
                <StarRating nota={media} /> {media.toFixed(1)}
              </span>
            )}
          </div>
        </div>
```

- [ ] **Step 4: contatos/page.tsx**

Modify `apps/web/app/(painel)/contatos/page.tsx` — add the import, then restructure the header block (currently a plain `<div>` with no `justify-between`, stacking the title row above a description `<p>`):

```tsx
        <div className="flex items-start justify-between gap-space-sm">
          <div>
            <div className="flex items-center gap-1.5">
              <Logo compact />
              <h1 className="font-headline-md text-headline-md text-on-surface">Meus Contatos</h1>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Gerencie conversas, propostas e atendimentos em andamento
            </p>
          </div>
          <NotificationBell />
        </div>
```

- [ ] **Step 5: demandas/page.tsx**

Modify `apps/web/app/(painel)/demandas/page.tsx` — add the import, then wrap the existing "Nova demanda" link with the bell:

```tsx
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <Logo compact />
            <h1 className="font-headline-md text-headline-md text-on-surface">Minhas Demandas</h1>
          </div>
          <div className="flex items-center gap-space-xs">
            <NotificationBell />
            <Link
              href="/demandas/nova"
              aria-label="Nova demanda"
              className="w-11 h-11 flex items-center justify-center rounded-full bg-primary text-on-primary neu-surface"
```

(Keep the rest of that `Link`'s existing props/children unchanged — only the two lines around it change: the new wrapping `<div className="flex items-center gap-space-xs">` and the `<NotificationBell />` line before it. Close that wrapping `<div>` right after the existing `</Link>`.)

- [ ] **Step 6: perfil/page.tsx**

Modify `apps/web/app/(painel)/perfil/page.tsx` — add the import, then wrap the existing "Sair" button with the bell:

```tsx
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Logo compact />
            <span className="font-headline-md text-headline-md text-on-surface">Meu Perfil</span>
          </div>
          <div className="flex items-center gap-space-xs">
            <NotificationBell />
            <button onClick={sair} aria-label="Sair" className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant">
              <MaterialIcon name="logout" />
            </button>
          </div>
        </div>
```

- [ ] **Step 7: oportunidades/page.tsx**

Modify `apps/web/app/(painel)/oportunidades/page.tsx` — add the import, then apply the same restructure as contatos/page.tsx (currently a plain `<div>` with title row + description `<p>`, no existing right-side element):

```tsx
        <div className="flex items-start justify-between gap-space-sm">
          <div>
            <div className="flex items-center gap-1.5">
              <Logo compact />
              <h1 className="font-headline-md text-headline-md text-on-surface">Oportunidades</h1>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Demandas abertas por empresas compatíveis com suas especialidades e cidade.
            </p>
          </div>
          <NotificationBell />
        </div>
```

- [ ] **Step 8: Type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Verify live**

Start the dev server (`preview_start` with the `web` launch config) against the real local backend (migrations through Task 5 applied):
1. Open `/buscar` logged out — confirm no bell renders (component returns `null` without a session) and nothing crashes.
2. Log in as a profissional whose specialty/city you control. Open `/perfil` — confirm the bell renders with no badge (0 unread).
3. From a second session (or by direct API call), create a contato targeting that profissional. Wait up to 20s — confirm the badge appears with "1" without a manual reload.
4. Click the bell — confirm the dropdown shows the notification, click it — confirm it navigates to `/contatos/{id}` and the badge count decrements.
5. As an empresa, publish a demanda whose especialidade/cidade match that same profissional. Confirm the profissional gets a `nova_oportunidade` notification (poll within 20s) and that a profissional with a different specialty does *not*.
6. Confirm the bell appears identically in `/contatos`, `/demandas`, `/avaliacoes`, and on a `Header.tsx`-based page like `/contatos/{id}`.

- [ ] **Step 10: Commit**

```bash
git add apps/web/components/ui/Header.tsx "apps/web/app/(public)/buscar/page.tsx" "apps/web/app/(painel)/avaliacoes/page.tsx" "apps/web/app/(painel)/contatos/page.tsx" "apps/web/app/(painel)/demandas/page.tsx" "apps/web/app/(painel)/perfil/page.tsx" "apps/web/app/(painel)/oportunidades/page.tsx"
git commit -m "feat(web): wire NotificationBell into every painel page and busca"
```

---

## Self-Review

**Spec coverage:**
- §2 nova tabela `notificacoes` com RLS desde a primeira migration → Task 1.
- §2 seis eventos, três com e-mail já existente mantido, três com e-mail novo, um (nova_oportunidade) sem e-mail → Tasks 3, 4, 5 (explicitly: Task 5's trigger has no `enviar_email` call, matching §3's explicit exclusion).
- §5 três endpoints, mesma autorização de dono único → Task 2.
- §6 `registrar_notificacao` central, chamada depois do commit do evento principal → every trigger task places the call after the triggering action's own `db.commit()`.
- §7 sino funcional, poll ~20s, aparece em toda página autenticada + busca pública → Tasks 6, 7.
- §8 testes de autorização, idempotência, caminho feliz de cada disparo → one test per disparo across Tasks 2-5, plus 404/idempotency tests in Task 2.
- §3 fora de escopo (tempo real, preferência por usuário, e-mail em massa, apagar notificação) → no task introduces any of these.

**Placeholder scan:** none — every step has literal code or literal shell commands, except Task 4 Step 2's payment-failure test, which explicitly defers to reading the existing file first rather than guessing test helper names that don't exist yet — that's a deliberate "read before writing" instruction, not a placeholder for content.

**Type consistency:** `registrar_notificacao(db, destinatario_id, tipo, titulo, corpo, link)` (Task 2) is called with this exact signature in Tasks 3, 4, 5. `TipoNotificacao` enum values match between the model (Task 1), the six call sites' `tipo=` arguments, and the frontend's `TipoNotificacao` string union (Task 6) — six values, same spelling, in both places. `NotificacaoRead.lida_em` (backend `datetime | None`) matches frontend `lida_em: string | null`. `ListaNotificacoesResponse.total_nao_lidas` is the exact field name the `NotificationBell` component reads in Task 6.

**Review Focus:** all five items map to an explicit test: message-notifies-the-other-party → Task 3 `test_criar_mensagem_notifica_a_outra_parte_nao_o_autor`; 404-not-leak on another user's notification → Task 2 `test_marcar_lida_de_outro_usuario_recebe_404`; idempotent re-accept → Task 3 `test_aceitar_gera_notificacao_para_solicitante_so_na_primeira_vez` (two accepts, still `total == 1`); wrong-specialty/wrong-city must not notify → Task 5's two negative tests (one per axis); `total_nao_lidas` live after mark-as-read → Task 2 `test_marcar_todas_lidas_marca_so_as_proprias_nao_lidas` (asserts a second `GET /notificacoes` call shows `0`, not a cached count).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-30-notificacoes.md`. Please review the plan. Which execution approach would you prefer?

- **Subagent-driven** — A fresh subagent implements each task and a fresh reviewer checks it before the next one starts, then a whole-branch review at the end. Most thorough; costs a fresh context per task and per review.
- **Native** — I implement every task myself in this session, then one fresh reviewer on the most capable model checks the whole branch. Cheapest and fastest; no independent review until the end.

For this plan I recommend **Native**, same reasoning as the chat/aceite plan: 7 tasks in a tight linear chain on one feature (every trigger task literally imports Task 2's `registrar_notificacao`), no fan-out across unrelated subsystems, and each task's own test cycle catches regressions immediately — the main risk is something subtle across task boundaries, which the final whole-branch review still covers.
