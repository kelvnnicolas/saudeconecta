# Chat e Aceite de Demanda Direta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dead "link de pagamento por contato" placeholder in the contact-detail screen with a real message history between empresa and profissional, plus a one-way "aceitar demanda direta" action for the profissional — both backed by new REST endpoints, no new infrastructure.

**Architecture:** Two additive DB changes (`mensagens_contato` table, `Contato.aceito_em` column). Three new endpoints under the existing `apps/api/app/routers/contatos.py` + `apps/api/app/services/contato_service.py`, sharing one new ownership-check helper. Frontend polls `GET /contatos/{id}/mensagens` every 7s with `setInterval` while the screen is mounted; no WebSocket, no Realtime.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 (`Mapped`/`mapped_column`), Alembic (hand-written migrations, no autogenerate), Pydantic v2, pytest + `TestClient`, Next.js 14 App Router, React `useState`/`useEffect`, Tailwind.

**Spec:** [`docs/superpowers/specs/2026-09-29-chat-aceite-demanda-direta-design.md`](../specs/2026-09-29-chat-aceite-demanda-direta-design.md) — read it alongside this plan; task descriptions below assume its context (scope, out-of-scope list, and rationale) without repeating it.

## Global Constraints

- No `Demanda` row is created by acceptance — `aceito_em` lives only on `Contato`. Entitlements (`entitlements.py`) are never checked by these endpoints.
- No new value is added to `StatusContato` — `pendente`/`respondido`/`encerrado` are untouched; none of the three new endpoints read or write `Contato.status`.
- No WebSocket/Realtime — frontend polls with plain `setInterval`, cleared on unmount.
- `Contato.mensagem` (the message that opened the contact) is never copied into `mensagens_contato` — it stays displayed as fixed context, exactly as today.
- Two linear Alembic migrations, each with a working, tested `downgrade()` — no destructive changes to existing columns/tables.
- New endpoint errors use `erro_negocio()` (the `{code, mensagem}` shape), not bare-string `HTTPException` — this is the convention the frontend's `ApiError` and this codebase's newer code (`demandas.py`) already standardize on.
- No new frontend library — poll via `useState`/`useEffect`/`setInterval`, matching every other data-fetching screen in `apps/web`.
- Acceptance is one-way and idempotent: re-accepting does not change an already-set `aceito_em` and never errors.
- Only the profissional side of a `Contato` may call `POST /contatos/{id}/aceitar`.

## Review Focus

- **Whitespace-only message body** (`"   "`) — a naive `min_length=1` check accepts it; the spec says "não-vazio" and a chat bubble with only whitespace is a real annoyance a user would hit by fat-fingering space+send. Pinned in Task 4.
- **`autor_id` spoofing** — a client sending `{"corpo": "oi", "autor_id": "<someone-else>"}` must have that field silently ignored; the value must always come from the authenticated JWT, never the body. Pinned in Task 4.
- **Idempotent accept must not shift the timestamp** — calling `POST /aceitar` twice must return the exact same `aceito_em` both times, not just "no error." A careless implementation using `datetime.now(UTC)` unconditionally on every call would silently corrupt this. Pinned in Task 5.
- **404 vs 403 must stay distinct** — the spec explicitly wants a truly nonexistent `contato_id` to 404 (`contato_inexistente`) and an authenticated-but-uninvolved third party to 403 (`nao_participante`). The closest existing precedent in this codebase (`demandas.py`) collapses both cases into 404 to hide existence — that's the wrong pattern to copy here; this spec chose differently on purpose. Pinned in Task 3.
- **Empresa cannot accept, including the empresa that owns this very contato** — the check must be "is the profissional of this contato," not "is not the empresa" — a `pessoa_fisica` solicitante is also not a profissional and must be equally rejected. Pinned in Task 5.

---

## File Structure

Backend:
- Create: `apps/api/app/models/mensagem_contato.py` — `MensagemContato` model
- Modify: `apps/api/app/models/contato.py` — add `aceito_em` column
- Modify: `apps/api/app/models/__init__.py` — register `MensagemContato`
- Create: `apps/api/alembic/versions/<rev1>_add_mensagens_contato_table.py`
- Create: `apps/api/alembic/versions/<rev2>_add_aceito_em_to_contatos.py`
- Modify: `apps/api/app/schemas/contato.py` — add `aceito_em` to `ContatoRead`
- Create: `apps/api/app/schemas/mensagem_contato.py` — `MensagemContatoCreateRequest`, `MensagemContatoRead`
- Modify: `apps/api/app/services/contato_service.py` — ownership helper + 3 service functions
- Modify: `apps/api/app/routers/contatos.py` — 3 new routes
- Modify: `apps/api/tests/fabrica.py` — `criar_contato()` factory
- Modify: `apps/api/tests/test_contatos.py` — new tests
- Modify: `apps/api/tests/test_migrations.py` — extend `EXPECTED_TABLES`, add column-existence assertions

Frontend:
- Modify: `apps/web/lib/types.ts` — `MensagemContatoRead`, `MensagemContatoCreateRequest`, `ContatoRead.aceito_em`
- Modify: `apps/web/lib/api.ts` — `listarMensagensContato`, `enviarMensagemContato`, `aceitarDemandaDireta`
- Modify: `apps/web/app/(painel)/contatos/[id]/page.tsx` — replace the payment placeholder with chat UI + accept button/badge

---

### Task 1: `mensagens_contato` table

**Files:**
- Create: `apps/api/app/models/mensagem_contato.py`
- Create: `apps/api/app/schemas/mensagem_contato.py`
- Modify: `apps/api/app/models/__init__.py`
- Create: `apps/api/alembic/versions/<rev1>_add_mensagens_contato_table.py`
- Modify: `apps/api/tests/test_migrations.py`

**Interfaces:**
- Consumes: `app.core.database.Base` (existing declarative base).
- Produces: `MensagemContato` (SQLAlchemy model, table `mensagens_contato`, columns `id: int`, `contato_id: int`, `autor_id: uuid.UUID`, `corpo: str`, `criado_em: datetime`) for Tasks 3/4. `MensagemContatoCreateRequest` (Pydantic, field `corpo: str`) and `MensagemContatoRead` (Pydantic, mirrors the model 1:1) for Tasks 3/8.

- [ ] **Step 1: Write the failing migration/model test**

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
    "links_pagamento",
    "planos",
    "assinaturas",
    "eventos_stripe",
    "demandas",
}
```

(This is a one-line addition to the existing `EXPECTED_TABLES` set — `test_migration_creates_all_tables_and_seeds_especialidades` and `test_migration_downgrade_and_upgrade_round_trip` already assert against it, so both start failing until the table exists.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_migrations.py -v`
Expected: FAIL — `mensagens_contato` missing from `inspector.get_table_names()`.

- [ ] **Step 3: Create the model**

`apps/api/app/models/mensagem_contato.py`:

```python
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class MensagemContato(Base):
    __tablename__ = "mensagens_contato"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    contato_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("contatos.id"), index=True, nullable=False
    )
    autor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    corpo: Mapped[str] = mapped_column(Text, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
```

- [ ] **Step 4: Register the model**

Modify `apps/api/app/models/__init__.py` — add in alphabetical position (after `LinkPagamento`/`StatusPagamento`, before `Plano`):

```python
from app.models.mensagem_contato import MensagemContato
```

And add `"MensagemContato",` to `__all__` (alphabetical position, after `"StatusPagamento",`).

- [ ] **Step 5: Write the schemas**

`apps/api/app/schemas/mensagem_contato.py`:

```python
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class MensagemContatoCreateRequest(BaseModel):
    corpo: str

    @field_validator("corpo")
    @classmethod
    def corpo_nao_vazio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Mensagem não pode ser vazia")
        return v


class MensagemContatoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    contato_id: int
    autor_id: uuid.UUID
    corpo: str
    criado_em: datetime
```

- [ ] **Step 6: Write the migration**

Run: `cd apps/api && .venv/bin/alembic revision -m "add_mensagens_contato_table"`

This creates `apps/api/alembic/versions/<rev1>_add_mensagens_contato_table.py` with a random `revision` id (call it `<rev1>` below) and `down_revision = "ba676ac3e504"` (current head) auto-filled. Replace the generated empty `upgrade()`/`downgrade()` bodies with:

```python
def upgrade() -> None:
    op.create_table(
        "mensagens_contato",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "contato_id",
            sa.Integer(),
            sa.ForeignKey("contatos.id", name="fk_mensagens_contato_contato_id"),
            nullable=False,
        ),
        sa.Column("autor_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("corpo", sa.Text(), nullable=False),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_mensagens_contato_contato_id", "mensagens_contato", ["contato_id"])


def downgrade() -> None:
    op.drop_index("ix_mensagens_contato_contato_id", table_name="mensagens_contato")
    op.drop_table("mensagens_contato")
```

Make sure the file's imports include `from sqlalchemy.dialects import postgresql` (copy the import block from `apps/api/alembic/versions/ba676ac3e504_add_origem_demanda_to_contatos.py` — same `sqlalchemy as sa` / `alembic.op` / `sqlalchemy.dialects.postgresql` trio).

- [ ] **Step 7: Apply the migration and run tests**

Run: `cd apps/api && .venv/bin/alembic upgrade head && .venv/bin/python -m pytest tests/test_migrations.py -v`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api/app/models/mensagem_contato.py apps/api/app/models/__init__.py apps/api/app/schemas/mensagem_contato.py apps/api/alembic/versions/*_add_mensagens_contato_table.py apps/api/tests/test_migrations.py
git commit -m "feat(api): add mensagens_contato table and model"
```

---

### Task 2: `Contato.aceito_em` column

**Files:**
- Modify: `apps/api/app/models/contato.py`
- Modify: `apps/api/app/schemas/contato.py`
- Create: `apps/api/alembic/versions/<rev2>_add_aceito_em_to_contatos.py`
- Modify: `apps/api/tests/test_migrations.py`

**Interfaces:**
- Consumes: nothing new (extends the existing `Contato` model from Task 1's revision chain).
- Produces: `Contato.aceito_em: datetime | None` (model attribute) and `ContatoRead.aceito_em: datetime | None` (schema field) for Tasks 5, 8, 9.

- [ ] **Step 1: Write the failing migration test**

Add to `apps/api/tests/test_migrations.py`, after `test_migration_adds_origem_and_demanda_id_to_contatos`:

```python
def test_migration_adds_aceito_em_to_contatos():
    colunas = {c["name"]: c for c in inspect(engine).get_columns("contatos")}
    assert colunas["aceito_em"]["nullable"] is True
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_migrations.py::test_migration_adds_aceito_em_to_contatos -v`
Expected: FAIL — `KeyError: 'aceito_em'`.

- [ ] **Step 3: Add the column to the model**

Modify `apps/api/app/models/contato.py` — add after `criado_em` (last field in the class):

```python
    aceito_em: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
```

- [ ] **Step 4: Add the field to the schema**

Modify `apps/api/app/schemas/contato.py` — add after `criado_em: datetime` in `ContatoRead`:

```python
    aceito_em: datetime | None
```

- [ ] **Step 5: Write the migration**

Run: `cd apps/api && .venv/bin/alembic revision -m "add_aceito_em_to_contatos"`

This creates `apps/api/alembic/versions/<rev2>_add_aceito_em_to_contatos.py` with `down_revision = "<rev1>"` (Task 1's revision id) auto-filled. Replace the bodies with:

```python
def upgrade() -> None:
    op.add_column("contatos", sa.Column("aceito_em", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("contatos", "aceito_em")
```

- [ ] **Step 6: Apply and run tests**

Run: `cd apps/api && .venv/bin/alembic upgrade head && .venv/bin/python -m pytest tests/test_migrations.py -v`
Expected: PASS (all migration tests, including the round-trip downgrade/upgrade test).

- [ ] **Step 7: Commit**

```bash
git add apps/api/app/models/contato.py apps/api/app/schemas/contato.py apps/api/alembic/versions/*_add_aceito_em_to_contatos.py apps/api/tests/test_migrations.py
git commit -m "feat(api): add aceito_em column to contatos"
```

---

### Task 3: `GET /contatos/{id}/mensagens` + ownership helper + test factory

**Files:**
- Modify: `apps/api/tests/fabrica.py` — add `criar_contato()`
- Modify: `apps/api/app/services/contato_service.py` — add `_contato_das_partes()` and `listar_mensagens()`
- Modify: `apps/api/app/routers/contatos.py` — add the route
- Modify: `apps/api/tests/test_contatos.py` — new tests

**Interfaces:**
- Consumes: `Contato` (Task 2's `aceito_em` field included), `MensagemContato` (Task 1).
- Produces: `_contato_das_partes(db: Session, contato_id: int, user_id: uuid.UUID) -> Contato` — raises `erro_negocio(404, "contato_inexistente", ...)` if the id doesn't exist, `erro_negocio(403, "nao_participante", ...)` if `user_id` isn't `solicitante_id` or `profissional_id`, otherwise returns the `Contato`. Used by Tasks 4 and 5. `listar_mensagens(db: Session, user_id: uuid.UUID, contato_id: int) -> list[MensagemContato]`. `criar_contato(db, solicitante_id: uuid.UUID, profissional_id: uuid.UUID, mensagem: str = "Preciso de um profissional para plantão") -> Contato` (test factory, flushes but does not commit — same convention as `criar_demanda`).

- [ ] **Step 1: Add the test factory**

Modify `apps/api/tests/fabrica.py` — add import at top:

```python
from app.models.contato import Contato
```

Add function (after `criar_profissional`, before `criar_assinatura` — keeps alphabetical-ish grouping with the other `criar_*` helpers):

```python
def criar_contato(
    db,
    solicitante_id: uuid.UUID,
    profissional_id: uuid.UUID,
    mensagem: str = "Preciso de um profissional para plantão",
) -> Contato:
    contato = Contato(
        solicitante_id=solicitante_id,
        profissional_id=profissional_id,
        mensagem=mensagem,
    )
    db.add(contato)
    db.flush()
    return contato
```

- [ ] **Step 2: Write the failing tests**

Add to `apps/api/tests/test_contatos.py`. First, extend the existing import blocks:

```python
from tests.fabrica import autenticar, criar_contato, criar_empresa, criar_profissional
```

Then add:

```python
def test_listar_mensagens_ambas_partes_conseguem_ler(client, db_session):
    solicitante_id = criar_empresa(db_session)
    profissional_id = criar_profissional(db_session)
    contato = criar_contato(db_session, solicitante_id, profissional_id)
    db_session.commit()

    autenticar(solicitante_id)
    resposta = client.get(f"/contatos/{contato.id}/mensagens")
    assert resposta.status_code == 200
    assert resposta.json() == []

    autenticar(profissional_id)
    resposta = client.get(f"/contatos/{contato.id}/mensagens")
    assert resposta.status_code == 200


def test_listar_mensagens_terceiro_recebe_403(client, db_session):
    solicitante_id = criar_empresa(db_session)
    profissional_id = criar_profissional(db_session)
    contato = criar_contato(db_session, solicitante_id, profissional_id)
    outro_usuario = criar_empresa(db_session, nome="Outra Empresa", email="outra@example.com")
    db_session.commit()

    autenticar(outro_usuario)
    resposta = client.get(f"/contatos/{contato.id}/mensagens")
    assert resposta.status_code == 403
    assert resposta.json()["detail"]["code"] == "nao_participante"


def test_listar_mensagens_contato_inexistente_404(client, db_session):
    solicitante_id = criar_empresa(db_session)
    db_session.commit()

    autenticar(solicitante_id)
    resposta = client.get("/contatos/999999/mensagens")
    assert resposta.status_code == 404
    assert resposta.json()["detail"]["code"] == "contato_inexistente"
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_contatos.py -v -k mensagens`
Expected: FAIL — 404 Not Found (route doesn't exist yet).

- [ ] **Step 4: Implement the service functions**

Modify `apps/api/app/services/contato_service.py` — add imports at top (extend the existing import block):

```python
import uuid

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.errors import erro_negocio
from app.models.contato import Contato
from app.models.mensagem_contato import MensagemContato
from app.models.profile import Profile
from app.models.profissional import Profissional
from app.schemas.contato import ContatoCreateRequest
from app.services.email_service import send_contact_notification_email
```

Add at the end of the file:

```python
def _contato_das_partes(db: Session, contato_id: int, user_id: uuid.UUID) -> Contato:
    contato = db.get(Contato, contato_id)
    if contato is None:
        raise erro_negocio(
            status.HTTP_404_NOT_FOUND, "contato_inexistente", "Contato não encontrado"
        )
    if user_id not in (contato.solicitante_id, contato.profissional_id):
        raise erro_negocio(
            status.HTTP_403_FORBIDDEN, "nao_participante", "Você não faz parte deste contato"
        )
    return contato


def listar_mensagens(db: Session, user_id: uuid.UUID, contato_id: int) -> list[MensagemContato]:
    _contato_das_partes(db, contato_id, user_id)
    return list(
        db.scalars(
            select(MensagemContato)
            .where(MensagemContato.contato_id == contato_id)
            .order_by(MensagemContato.criado_em)
        )
    )
```

- [ ] **Step 5: Wire up the route**

Modify `apps/api/app/routers/contatos.py` — replace the top of the file with:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.errors import ErroNegocio
from app.models.contato import Contato
from app.schemas.contato import ContatoCreateRequest, ContatoRead
from app.schemas.mensagem_contato import MensagemContatoRead
from app.services.contato_service import create_contato, list_own_contatos, listar_mensagens

router = APIRouter(prefix="/contatos", tags=["contatos"])

ERRO_403_404 = {
    403: {"model": ErroNegocio, "description": "code=nao_participante"},
    404: {"model": ErroNegocio, "description": "code=contato_inexistente"},
}
```

Add at the end of the file:

```python
@router.get("/{contato_id}/mensagens", response_model=list[MensagemContatoRead], responses=ERRO_403_404)
def listar_mensagens_route(
    contato_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MensagemContatoRead]:
    return listar_mensagens(db, current_user.id, contato_id)
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_contatos.py -v -k mensagens`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/api/tests/fabrica.py apps/api/tests/test_contatos.py apps/api/app/services/contato_service.py apps/api/app/routers/contatos.py
git commit -m "feat(api): add GET /contatos/{id}/mensagens"
```

---

### Task 4: `POST /contatos/{id}/mensagens`

**Files:**
- Modify: `apps/api/app/services/contato_service.py` — add `criar_mensagem()`
- Modify: `apps/api/app/routers/contatos.py` — add the route
- Modify: `apps/api/tests/test_contatos.py` — new tests

**Interfaces:**
- Consumes: `_contato_das_partes()` (Task 3), `MensagemContatoCreateRequest`/`MensagemContatoRead` (Task 1).
- Produces: `criar_mensagem(db: Session, user_id: uuid.UUID, contato_id: int, corpo: str) -> MensagemContato`, used only by this task's route.

- [ ] **Step 1: Write the failing tests**

Add to `apps/api/tests/test_contatos.py`:

```python
def test_criar_mensagem_ambas_partes_conseguem_enviar(client, db_session):
    solicitante_id = criar_empresa(db_session)
    profissional_id = criar_profissional(db_session)
    contato = criar_contato(db_session, solicitante_id, profissional_id)
    db_session.commit()

    autenticar(solicitante_id)
    resposta = client.post(f"/contatos/{contato.id}/mensagens", json={"corpo": "Oi, tudo bem?"})
    assert resposta.status_code == 201
    body = resposta.json()
    assert body["corpo"] == "Oi, tudo bem?"
    assert body["autor_id"] == str(solicitante_id)

    autenticar(profissional_id)
    resposta = client.post(f"/contatos/{contato.id}/mensagens", json={"corpo": "Tudo, e você?"})
    assert resposta.status_code == 201
    assert resposta.json()["autor_id"] == str(profissional_id)


def test_criar_mensagem_corpo_vazio_e_rejeitado(client, db_session):
    solicitante_id = criar_empresa(db_session)
    profissional_id = criar_profissional(db_session)
    contato = criar_contato(db_session, solicitante_id, profissional_id)
    db_session.commit()

    autenticar(solicitante_id)
    assert client.post(f"/contatos/{contato.id}/mensagens", json={"corpo": ""}).status_code == 422
    assert client.post(f"/contatos/{contato.id}/mensagens", json={"corpo": "   "}).status_code == 422


def test_criar_mensagem_ignora_autor_id_do_body(client, db_session):
    solicitante_id = criar_empresa(db_session)
    profissional_id = criar_profissional(db_session)
    contato = criar_contato(db_session, solicitante_id, profissional_id)
    db_session.commit()

    autenticar(solicitante_id)
    resposta = client.post(
        f"/contatos/{contato.id}/mensagens",
        json={"corpo": "Oi", "autor_id": str(profissional_id)},
    )
    assert resposta.status_code == 201
    assert resposta.json()["autor_id"] == str(solicitante_id)


def test_criar_mensagem_terceiro_recebe_403(client, db_session):
    solicitante_id = criar_empresa(db_session)
    profissional_id = criar_profissional(db_session)
    contato = criar_contato(db_session, solicitante_id, profissional_id)
    outro_usuario = criar_empresa(db_session, nome="Outra Empresa", email="outra2@example.com")
    db_session.commit()

    autenticar(outro_usuario)
    resposta = client.post(f"/contatos/{contato.id}/mensagens", json={"corpo": "Oi"})
    assert resposta.status_code == 403
    assert resposta.json()["detail"]["code"] == "nao_participante"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_contatos.py -v -k criar_mensagem`
Expected: FAIL — 404 Not Found (route doesn't exist yet).

- [ ] **Step 3: Implement the service function**

Modify `apps/api/app/services/contato_service.py` — add after `listar_mensagens`:

```python
def criar_mensagem(
    db: Session, user_id: uuid.UUID, contato_id: int, corpo: str
) -> MensagemContato:
    _contato_das_partes(db, contato_id, user_id)
    mensagem = MensagemContato(contato_id=contato_id, autor_id=user_id, corpo=corpo)
    db.add(mensagem)
    db.commit()
    db.refresh(mensagem)
    return mensagem
```

- [ ] **Step 4: Wire up the route**

Modify `apps/api/app/routers/contatos.py` — update the import line for `contato_service` functions:

```python
from app.services.contato_service import (
    create_contato,
    criar_mensagem,
    list_own_contatos,
    listar_mensagens,
)
```

Add import for the request schema:

```python
from app.schemas.mensagem_contato import MensagemContatoCreateRequest, MensagemContatoRead
```

Add route at the end of the file:

```python
@router.post(
    "/{contato_id}/mensagens",
    response_model=MensagemContatoRead,
    status_code=201,
    responses=ERRO_403_404,
)
def criar_mensagem_route(
    contato_id: int,
    data: MensagemContatoCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MensagemContatoRead:
    return criar_mensagem(db, current_user.id, contato_id, data.corpo)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_contatos.py -v -k criar_mensagem`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/api/app/services/contato_service.py apps/api/app/routers/contatos.py apps/api/tests/test_contatos.py
git commit -m "feat(api): add POST /contatos/{id}/mensagens"
```

---

### Task 5: `POST /contatos/{id}/aceitar`

**Files:**
- Modify: `apps/api/app/services/contato_service.py` — add `aceitar_demanda_direta()`
- Modify: `apps/api/app/routers/contatos.py` — add the route
- Modify: `apps/api/tests/test_contatos.py` — new tests

**Interfaces:**
- Consumes: `_contato_das_partes()` (Task 3), `Contato.aceito_em` (Task 2), `ContatoRead` (existing, extended in Task 2).
- Produces: `aceitar_demanda_direta(db: Session, user_id: uuid.UUID, contato_id: int) -> Contato`, used only by this task's route.

- [ ] **Step 1: Write the failing tests**

Add to `apps/api/tests/test_contatos.py`:

```python
def test_aceitar_profissional_com_sucesso(client, db_session):
    solicitante_id = criar_empresa(db_session)
    profissional_id = criar_profissional(db_session)
    contato = criar_contato(db_session, solicitante_id, profissional_id)
    db_session.commit()

    autenticar(profissional_id)
    resposta = client.post(f"/contatos/{contato.id}/aceitar")
    assert resposta.status_code == 200
    assert resposta.json()["aceito_em"] is not None


def test_aceitar_empresa_recebe_403(client, db_session):
    solicitante_id = criar_empresa(db_session)
    profissional_id = criar_profissional(db_session)
    contato = criar_contato(db_session, solicitante_id, profissional_id)
    db_session.commit()

    autenticar(solicitante_id)
    resposta = client.post(f"/contatos/{contato.id}/aceitar")
    assert resposta.status_code == 403
    assert resposta.json()["detail"]["code"] == "apenas_profissional_aceita"


def test_aceitar_duas_vezes_e_idempotente(client, db_session):
    solicitante_id = criar_empresa(db_session)
    profissional_id = criar_profissional(db_session)
    contato = criar_contato(db_session, solicitante_id, profissional_id)
    db_session.commit()

    autenticar(profissional_id)
    primeira = client.post(f"/contatos/{contato.id}/aceitar")
    timestamp_original = primeira.json()["aceito_em"]

    segunda = client.post(f"/contatos/{contato.id}/aceitar")
    assert segunda.status_code == 200
    assert segunda.json()["aceito_em"] == timestamp_original


def test_aceitar_terceiro_recebe_403(client, db_session):
    solicitante_id = criar_empresa(db_session)
    profissional_id = criar_profissional(db_session)
    contato = criar_contato(db_session, solicitante_id, profissional_id)
    outro_usuario = criar_empresa(db_session, nome="Outra Empresa", email="outra3@example.com")
    db_session.commit()

    autenticar(outro_usuario)
    resposta = client.post(f"/contatos/{contato.id}/aceitar")
    assert resposta.status_code == 403
    assert resposta.json()["detail"]["code"] == "nao_participante"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_contatos.py -v -k aceitar`
Expected: FAIL — 404 Not Found (route doesn't exist yet).

- [ ] **Step 3: Implement the service function**

Modify `apps/api/app/services/contato_service.py` — add `datetime`/`UTC` to imports at top:

```python
from datetime import UTC, datetime
```

Add at the end of the file:

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
    return contato
```

This is the same "set a nullable timestamp on an existing row via application code" idiom already used at `apps/api/app/services/billing.py:353` (`registro.processado_em = datetime.now(UTC)`).

- [ ] **Step 4: Wire up the route**

Modify `apps/api/app/routers/contatos.py` — update the `contato_service` import line:

```python
from app.services.contato_service import (
    aceitar_demanda_direta,
    create_contato,
    criar_mensagem,
    list_own_contatos,
    listar_mensagens,
)
```

Add route at the end of the file:

```python
@router.post(
    "/{contato_id}/aceitar",
    response_model=ContatoRead,
    responses={
        **ERRO_403_404,
        403: {
            "model": ErroNegocio,
            "description": "code=nao_participante | apenas_profissional_aceita",
        },
    },
)
def aceitar_route(
    contato_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Contato:
    return aceitar_demanda_direta(db, current_user.id, contato_id)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_contatos.py -v -k aceitar`
Expected: PASS (4 tests).

- [ ] **Step 6: Run the full backend suite**

Run: `cd apps/api && .venv/bin/python -m pytest -q`
Expected: PASS, no regressions.

- [ ] **Step 7: Commit**

```bash
git add apps/api/app/services/contato_service.py apps/api/app/routers/contatos.py apps/api/tests/test_contatos.py
git commit -m "feat(api): add POST /contatos/{id}/aceitar"
```

---

### Task 6: Frontend types + api client

**Files:**
- Modify: `apps/web/lib/types.ts`
- Modify: `apps/web/lib/api.ts`

**Interfaces:**
- Consumes: nothing (leaf task, pure typing/HTTP-call additions).
- Produces: `MensagemContatoRead`, `MensagemContatoCreateRequest`, `ContatoRead.aceito_em: string | null` (types), `api.listarMensagensContato(contatoId: number)`, `api.enviarMensagemContato(contatoId: number, corpo: string)`, `api.aceitarDemandaDireta(contatoId: number)` — all consumed by Task 7.

- [ ] **Step 1: Add the types**

Modify `apps/web/lib/types.ts` — add `aceito_em: string | null;` to `ContatoRead`, right after `criado_em: string;`.

Add new interfaces (near `ContatoRead`/`ContatoCreateRequest`):

```typescript
export interface MensagemContatoRead {
  id: number;
  contato_id: number;
  autor_id: string;
  corpo: string;
  criado_em: string;
}

export interface MensagemContatoCreateRequest {
  corpo: string;
}
```

- [ ] **Step 2: Add the api methods**

Modify `apps/web/lib/api.ts` — add `MensagemContatoRead` to the type-only import block at the top (alongside the existing `ContatoRead` import).

Add to the `api` object, near the existing `listContatos`/`createContato` entries:

```typescript
  listarMensagensContato: (contatoId: number) =>
    request<MensagemContatoRead[]>(`/contatos/${contatoId}/mensagens`),

  enviarMensagemContato: (contatoId: number, corpo: string) =>
    request<MensagemContatoRead>(`/contatos/${contatoId}/mensagens`, {
      method: "POST",
      body: JSON.stringify({ corpo }),
    }),

  aceitarDemandaDireta: (contatoId: number) =>
    request<ContatoRead>(`/contatos/${contatoId}/aceitar`, { method: "POST" }),
```

- [ ] **Step 3: Type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors (these are additive types/methods; nothing consumes them yet).

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/types.ts apps/web/lib/api.ts
git commit -m "feat(web): add mensagens_contato and aceitar types/api client"
```

---

### Task 7: Frontend UI — replace payment placeholder with chat + accept button

**Files:**
- Modify: `apps/web/app/(painel)/contatos/[id]/page.tsx`

**Interfaces:**
- Consumes: `api.listarMensagensContato`, `api.enviarMensagemContato`, `api.aceitarDemandaDireta` (Task 6), `MensagemContatoRead`, `ContatoRead.aceito_em` (Task 6), `useCurrentUser()` (existing — `papel` already used on this page; `session` is a new destructured field from the same hook).

- [ ] **Step 1: Add imports and state**

Modify `apps/web/app/(painel)/contatos/[id]/page.tsx` — update the type import:

```typescript
import type { ContatoRead, MensagemContatoRead } from "@/lib/types";
```

Change the `useCurrentUser()` destructure to also pull `session`:

```typescript
const { papel, session } = useCurrentUser();
```

Add new state, alongside the existing `useState` calls:

```typescript
const [mensagens, setMensagens] = useState<MensagemContatoRead[]>([]);
const [corpoMensagem, setCorpoMensagem] = useState("");
const [enviandoMensagem, setEnviandoMensagem] = useState(false);
const [aceitando, setAceitando] = useState(false);
```

- [ ] **Step 2: Add the polling effect**

Add a new `useEffect`, after the existing contato-loading `useEffect`:

```typescript
useEffect(() => {
  if (!contato) return;
  let cancelado = false;
  async function buscarMensagens() {
    try {
      const lista = await api.listarMensagensContato(contato!.id);
      if (!cancelado) setMensagens(lista);
    } catch {
      // poll silencioso — próxima tentativa em 7s
    }
  }
  buscarMensagens();
  const intervalo = setInterval(buscarMensagens, 7000);
  return () => {
    cancelado = true;
    clearInterval(intervalo);
  };
}, [contato?.id]);
```

- [ ] **Step 3: Add the send-message and accept handlers**

Add after the existing `onSubmit` function:

```typescript
async function enviarMensagem() {
  if (!contato || !corpoMensagem.trim()) return;
  setEnviandoMensagem(true);
  try {
    const nova = await api.enviarMensagemContato(contato.id, corpoMensagem.trim());
    setMensagens((atual) => [...atual, nova]);
    setCorpoMensagem("");
  } catch (e) {
    setErro(e instanceof Error ? e.message : "Não foi possível enviar a mensagem.");
  } finally {
    setEnviandoMensagem(false);
  }
}

async function aceitarDemanda() {
  if (!contato) return;
  setAceitando(true);
  try {
    const atualizado = await api.aceitarDemandaDireta(contato.id);
    setContato(atualizado);
  } catch (e) {
    setErro(e instanceof Error ? e.message : "Não foi possível aceitar a demanda.");
  } finally {
    setAceitando(false);
  }
}
```

- [ ] **Step 4: Replace the placeholder section**

Replace the placeholder block (currently between the `{/* ---- PAYMENT PLACEHOLDER SECTION */}`-equivalent `<section>` showing "Link de pagamento por contato ainda não existe...") with:

```tsx
        <section className="bg-surface-container-lowest rounded-2xl neu-surface p-space-md flex flex-col gap-space-sm">
          <h2 className="font-title-md text-title-md text-on-surface">Conversa</h2>
          <div className="flex flex-col gap-space-xs max-h-80 overflow-y-auto">
            {mensagens.length === 0 && (
              <p className="font-caption text-caption text-on-surface-variant text-center py-space-sm">
                Nenhuma mensagem ainda. Comece a conversa.
              </p>
            )}
            {mensagens.map((msg) => {
              const minha = msg.autor_id === session?.user.id;
              return (
                <div key={msg.id} className={`flex ${minha ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-xl px-space-sm py-space-xs ${
                      minha ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface"
                    }`}
                  >
                    <p className="font-body-md text-body-md">{msg.corpo}</p>
                    <span
                      className={`font-caption text-caption ${minha ? "text-on-primary/70" : "text-outline"}`}
                    >
                      {new Date(msg.criado_em).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-space-xs">
            <input
              type="text"
              value={corpoMensagem}
              onChange={(e) => setCorpoMensagem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") enviarMensagem();
              }}
              placeholder="Escreva uma mensagem..."
              className="flex-1 h-11 px-space-md rounded-xl bg-surface-container-lowest neu-inset-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={enviarMensagem}
              disabled={enviandoMensagem || !corpoMensagem.trim()}
              aria-label="Enviar mensagem"
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-primary text-on-primary neu-surface neu-pressable disabled:opacity-60"
            >
              <MaterialIcon name="send" className="text-[20px]" />
            </button>
          </div>
        </section>

        {contato.aceito_em ? (
          <section className="rounded-2xl p-space-md bg-secondary-container/40 border border-secondary-container flex items-center gap-space-xs">
            <MaterialIcon name="check_circle" filled className="text-[18px] text-on-secondary-container" />
            <p className="font-caption text-caption text-on-secondary-container">
              Demanda direta aceita em {new Date(contato.aceito_em).toLocaleString("pt-BR")}
            </p>
          </section>
        ) : (
          papel === "profissional" && (
            <button
              type="button"
              onClick={aceitarDemanda}
              disabled={aceitando}
              className="h-12 rounded-xl neu-surface neu-pressable bg-primary text-on-primary font-label-md text-label-md flex items-center justify-center gap-space-xs disabled:opacity-60"
            >
              <MaterialIcon name="handshake" className="text-[20px]" />
              {aceitando ? "Aceitando..." : "Aceitar demanda direta"}
            </button>
          )
        )}
```

- [ ] **Step 5: Type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Verify live**

Start the dev server (`preview_start` with the `web` launch config) and, against the real local backend (migrations applied through Task 5):
1. Create a contato as an empresa/pessoa_fisica account, note its id.
2. Open `/contatos/{id}` as the solicitante — confirm the placeholder is gone, chat renders empty, no accept button (not a profissional).
3. Send a message as the solicitante — confirm it appears right-aligned, input clears.
4. Log in as the profissional side of that same contato, open the same `/contatos/{id}` — confirm the message appears left-aligned (or right, from their perspective — the point is bubble alignment flips correctly per viewer), and an "Aceitar demanda direta" button is visible.
5. Click accept — confirm it flips to the "Aceito em ..." badge, button disappears.
6. Reload as the solicitante — confirm they now see the same badge (not the button).
7. Wait ~7s with two browser tabs open (one per side) and confirm a message sent from one tab appears in the other without a manual reload (poll working).

- [ ] **Step 7: Commit**

```bash
git add "apps/web/app/(painel)/contatos/[id]/page.tsx"
git commit -m "feat(web): replace contato payment placeholder with chat and accept flow"
```

---

## Self-Review

**Spec coverage:**
- §4.1 `mensagens_contato` table → Task 1.
- §4.2 `aceito_em` column, no new `StatusContato` value → Task 2 (Global Constraints reaffirms the enum is untouched).
- §5 `GET/POST /contatos/{id}/mensagens`, `POST /contatos/{id}/aceitar`, same-parties authorization → Tasks 3, 4, 5.
- §5 "nenhum dos três endpoints checa `status`" → no task reads `Contato.status`; called out in Global Constraints.
- §6 frontend: placeholder removal, message bubbles, accept button/badge, three `api.ts` functions, `types.ts` additions → Tasks 6, 7.
- §6 "poll com `setInterval`" → Task 7 Step 2 (the spec's own `use-current-user.ts` cross-reference doesn't actually apply — that file has no `setInterval`; Task 7 uses a plain `useEffect`/`setInterval`/cleanup instead, which is what the spec's intent actually requires).
- §7 backend tests (both-parties read/write, third-party 403, nonexistent 404, empty-body 422, `autor_id` never from body, accept success/403/idempotent) → Tasks 3, 4, 5, one test each.
- §7 "frontend: verificado ao vivo" → Task 7 Step 6.
- §3 out-of-scope items (payment link, real-time, `Demanda` reuse, edit/delete/attachments, undo-accept, empresa-side accept) → none implemented; no task touches `links_pagamento`, WebSocket, `Demanda`, or adds a second acceptance path.

**Placeholder scan:** none — every step has literal code or literal shell commands.

**Type consistency:** `_contato_das_partes` (Task 3) is reused verbatim by name in Tasks 4 and 5. `MensagemContatoRead`/`MensagemContatoCreateRequest` (Task 1) field names match `MensagemContato` model attributes and the frontend `MensagemContatoRead` (Task 6) 1:1. `criar_mensagem`/`aceitar_demanda_direta` signatures match their router call sites exactly. `contato.id` (frontend) is a `number`, matching backend's `int` PK and the `api.ts` method signatures (`contatoId: number`).

**Review Focus:** all five items map to an explicit test: whitespace body → Task 4 `test_criar_mensagem_corpo_vazio_e_rejeitado`; `autor_id` spoofing → Task 4 `test_criar_mensagem_ignora_autor_id_do_body`; idempotent timestamp → Task 5 `test_aceitar_duas_vezes_e_idempotente`; 404-vs-403 distinction → Task 3 `test_listar_mensagens_contato_inexistente_404` vs `test_listar_mensagens_terceiro_recebe_403`; empresa/non-profissional cannot accept → Task 5 `test_aceitar_empresa_recebe_403`.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-29-chat-aceite-demanda-direta.md`. Please review the plan. Which execution approach would you prefer?

- **Subagent-driven** — A fresh subagent implements each task and a fresh reviewer checks it before the next one starts, then a whole-branch review at the end. Most thorough; costs a fresh context per task and per review.
- **Native** — I implement every task myself in this session, then one fresh reviewer on the most capable model checks the whole branch. Cheapest and fastest; no independent review until the end.

For this plan I recommend **Native**, because the 7 tasks are a tight linear chain on one feature (each backend task literally imports the previous one's function), there's no fan-out across unrelated subsystems, and every task's own test cycle already catches regressions immediately — the main risk here is a single end-to-end review missing something subtle across task boundaries, which a final whole-branch review still covers.
