# Search, Avaliações, and Contatos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add text/filter search over `profissionais`, the `avaliações` (reviews) endpoints, and the `contatos` (contact) endpoints — including the e-mail notification via Resend — to the SaúdeConecta backend. This is Plan 3, built on the already-merged Backend Foundation (Plan 1) and Auth/Profile Endpoints (Plan 2) plans.

**Architecture:** Search lives on the existing `profissionais` router/service (it returns profissional-shaped data) as a new `GET /profissionais` list endpoint, separate from the existing `GET /profissionais/{user_id}` single-item lookup. Avaliações and contatos are new resources with their own schema/service/router modules, following the exact same layered pattern Plan 2 established. Creating an avaliação requires an existing `contato` row between the two parties (enforced in the service layer, per spec §6's authorization rule) — so contatos must exist before avaliações can reference them, which is why this plan builds contatos (Task 3) before avaliações (Task 4). Authorization continues to live entirely in the FastAPI service layer, never Postgres RLS (unchanged from Plan 2's architecture decision).

**Correction from Plan 2's own text:** Plan 2's "Plan Sequence Note" listed "Sentry wired into main.py with a live-fired error" as future scope. That was wrong — Plan 1's Task 7 already calls `init_sentry()` at `app/main.py` import time, so Sentry has been live (whenever `SENTRY_DSN` is configured) since Plan 1 merged. Nothing in this plan "wires up" Sentry; Task 3 simply uses the already-active `sentry_sdk` to report a deliberately-swallowed failure (an e-mail provider hiccup that must never break contact creation), which is normal use of already-wired instrumentation, not new integration work.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 (existing models, one new nullable column via Alembic), Pydantic v2, `httpx` (already a dependency, used directly for the Resend REST API — no new SDK dependency added), `pytest` against the real local test Postgres.

**Spec:** `docs/superpowers/specs/2026-09-19-saudeconecta-mvp-design.md`

## Plan Sequence Note

This plan covers the remaining parts of spec §12 phase 5: "busca por texto (`ILIKE`/`pg_trgm`) e filtros", "avaliações", and "contatos" (including the e-mail dispatch via Resend). Phase 3's Supabase Storage bucket already has a tested upload *helper* (`app.storage.supabase_storage.upload_avatar`, from Plan 1) but no endpoint wires it to an actual HTTP upload yet — that, along with the pandas analytics report, the Stripe payment link endpoint, CI, and `.env.example`/README review, are explicitly **out of scope** for this plan and belong to later plans. Do not implement any of those here even if it seems convenient — flag it instead and stop.

## Global Constraints

- Python 3.11+, type hints everywhere, Pydantic v2 for all request/response validation.
- Table/column names stay Portuguese snake_case. Variable/function/class names in code are English.
- `black` + `ruff` clean on everything touched (line-length 100, `select = ["E", "F", "I", "UP"]`).
- Authorization lives in the FastAPI service layer in Python, never Postgres RLS — do not add `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` or any RLS policy anywhere in this plan.
- Spec's authorization rule (§6): avaliações are publicly readable, but only creatable by someone who has a registered `contato` with the other party. Contatos are readable only by the two parties involved (solicitante and profissional).
- Tests run against the real local test Postgres (port 5433, via `docker-compose.dev.yml`) for anything touching the database — no SQLite, no mocked DB. The Resend HTTP call is mocked in tests (a true external HTTP dependency) — same rule Plan 1 applied to Supabase Storage and Sentry.
- This plan's own known risk, learned from Plan 2: every task's brief code was hand-written by the same process that produced 4 real defects in Plan 2 (2 missing/misordered imports, 1 formatting issue, 1 test-logic bug). Implementers and reviewers on this plan should not assume the code blocks below are bug-free — verify imports and test logic against actual behavior, the same discipline that caught all 4 issues in Plan 2.
- Do not implement Storage upload endpoints, payment, analytics, CI, or `.env.example`/README review in this plan (see "Plan Sequence Note" above).

---

## File Structure

```
apps/api/
├── alembic/versions/
│   └── <generated>_add_profiles_email.py    # NEW (Task 1)
├── app/
│   ├── main.py                              # MODIFY (Task 5) — include contatos + avaliacoes routers
│   ├── models/
│   │   └── profile.py                       # MODIFY (Task 1) — add `email` column
│   ├── schemas/
│   │   ├── profile.py                       # MODIFY (Task 1) — add `email` to ProfileRead
│   │   ├── busca.py                         # NEW (Task 2)
│   │   ├── contato.py                       # NEW (Task 3)
│   │   └── avaliacao.py                     # NEW (Task 4)
│   ├── services/
│   │   ├── profile_service.py               # MODIFY (Task 1) — upsert_profile accepts email
│   │   ├── profissional_service.py          # MODIFY (Task 2) — add search_profissionais
│   │   ├── email_service.py                 # NEW (Task 3)
│   │   ├── contato_service.py               # NEW (Task 3)
│   │   └── avaliacao_service.py             # NEW (Task 4)
│   └── routers/
│       ├── auth.py                          # MODIFY (Task 1) — pass current_user.email through
│       ├── profissionais.py                 # MODIFY (Task 2) — add `GET ""` search route
│       ├── contatos.py                      # NEW (Task 3)
│       └── avaliacoes.py                    # NEW (Task 4)
└── tests/
    ├── test_auth_sync.py                    # MODIFY (Task 1) — add email-persisted test
    ├── test_busca.py                        # NEW (Task 2)
    ├── test_email_service.py                # NEW (Task 3)
    ├── test_contatos.py                     # NEW (Task 3)
    └── test_avaliacoes.py                   # NEW (Task 4)
```

---

### Task 1: Add `email` to `profiles`, captured from the JWT at sync time

**Files:**
- Create: `apps/api/alembic/versions/<generated>_add_profiles_email.py`
- Modify: `apps/api/app/models/profile.py`
- Modify: `apps/api/app/schemas/profile.py`
- Modify: `apps/api/app/services/profile_service.py`
- Modify: `apps/api/app/routers/auth.py`
- Modify: `apps/api/tests/test_auth_sync.py`

**Interfaces:**
- Consumes: `app.core.auth.CurrentUser.email` (already exists since Plan 2 — the JWT's `email` claim, never client-supplied).
- Produces: `Profile.email: str | None` (new column); `ProfileRead.email: str | None`; `upsert_profile(db, user_id, data, email)` (signature change — now takes a 4th positional `email` argument). Task 3's `contato_service.create_contato` reads `profissional.profile.email` to know where to send the notification.

Why this task exists: the spec's contact flow needs to notify the professional by e-mail, but `profiles` (and nothing else) is the only place a user's e-mail could live without a live JWT for that *other* user — the caller's own JWT only carries the caller's e-mail, never the target's. Capturing it once at `/auth/sync` time (when we *do* have that user's own valid JWT) avoids needing any Supabase Admin API call later.

- [ ] **Step 1: Write the failing test**

Append to `apps/api/tests/test_auth_sync.py` (add this function; keep every existing test in the file unchanged):
```python
def test_sync_stores_caller_email(client, db_session):
    user_id = uuid.uuid4()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email="maria@example.com", role="authenticated"
    )

    response = client.post(
        "/auth/sync", json={"papel": "profissional", "nome": "Maria Silva"}
    )

    assert response.status_code == 200
    assert response.json()["email"] == "maria@example.com"
    saved = db_session.get(Profile, user_id)
    assert saved.email == "maria@example.com"
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `apps/api`, venv active): `pytest tests/test_auth_sync.py::test_sync_stores_caller_email -v`
Expected: FAIL — `KeyError: 'email'` (the response body has no `email` key yet)

- [ ] **Step 3: Write the Alembic migration**

Run (from `apps/api`, venv active):
```bash
alembic revision -m "add_profiles_email"
```
This creates `apps/api/alembic/versions/<generated>_add_profiles_email.py` with a random `revision` id and `down_revision` already set to the current head (`d6a1d35da1f9`). Keep the generated `revision`/`down_revision` lines exactly as generated — only replace the body of `upgrade()`/`downgrade()`:
```python
from alembic import op
import sqlalchemy as sa

# keep the existing revision / down_revision / branch_labels / depends_on lines as generated


def upgrade() -> None:
    op.add_column("profiles", sa.Column("email", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("profiles", "email")
```

- [ ] **Step 4: Add `email` to `apps/api/app/models/profile.py`**

Modify the file — add one line to the `Profile` class, right after `avatar_url` (keep every other column, the `Papel` enum, and all imports unchanged):
```python
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    email: Mapped[str | None] = mapped_column(String(255))
    criado_em: Mapped[datetime] = mapped_column(
```
(i.e. insert the `email` line between the existing `avatar_url` line and the existing `criado_em` line)

- [ ] **Step 5: Add `email` to `ProfileRead` in `apps/api/app/schemas/profile.py`**

Modify the file — add one field to `ProfileRead` (do not add `email` to `AuthSyncRequest` — it must never be client-supplied, only JWT-derived):
```python
class ProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    papel: Papel
    nome: str
    telefone: str | None
    cidade: str | None
    estado: str | None
    avatar_url: str | None
    email: str | None
    criado_em: datetime
```

- [ ] **Step 6: Update `upsert_profile` in `apps/api/app/services/profile_service.py`**

Modify the function signature and body:
```python
import uuid

from sqlalchemy.orm import Session

from app.models.profile import Profile
from app.schemas.profile import AuthSyncRequest


def upsert_profile(
    db: Session, user_id: uuid.UUID, data: AuthSyncRequest, email: str | None
) -> Profile:
    profile = db.get(Profile, user_id)
    if profile is None:
        profile = Profile(id=user_id, papel=data.papel, nome=data.nome)
        db.add(profile)
    else:
        profile.papel = data.papel
        profile.nome = data.nome
    profile.telefone = data.telefone
    profile.cidade = data.cidade
    profile.estado = data.estado
    profile.email = email
    db.commit()
    db.refresh(profile)
    return profile
```

- [ ] **Step 7: Update `apps/api/app/routers/auth.py` to pass the e-mail through**

Modify the `sync_profile` function's call to `upsert_profile`:
```python
@router.post("/sync", response_model=ProfileRead)
def sync_profile(
    data: AuthSyncRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Profile:
    return upsert_profile(db, current_user.id, data, current_user.email)
```

- [ ] **Step 8: Run the migration against the test database and run the test**

Run (from `apps/api`, venv active): `pytest tests/test_auth_sync.py -v`
Expected: PASS (4 tests — the 3 pre-existing plus the new one). The session-scoped `_create_test_schema` fixture runs `alembic upgrade head` automatically, so the new column is applied to the test database as part of the test run — no manual migration step needed here.

- [ ] **Step 9: Run the full suite to confirm nothing regressed**

Run: `pytest -v`
Expected: PASS — all 31 tests (30 from Plans 1–2 plus this task's new test).

- [ ] **Step 10: Commit**

```bash
git add apps/api/alembic/versions apps/api/app/models/profile.py apps/api/app/schemas/profile.py \
  apps/api/app/services/profile_service.py apps/api/app/routers/auth.py apps/api/tests/test_auth_sync.py
git commit -m "feat(api): capture caller email in profiles at sync time"
```

---

### Task 2: `GET /profissionais` — text search and filters

**Files:**
- Create: `apps/api/app/schemas/busca.py`
- Modify: `apps/api/app/services/profissional_service.py` (add `search_profissionais`, `_build_search_filters`)
- Modify: `apps/api/app/routers/profissionais.py` (add the `GET ""` route)
- Test: `apps/api/tests/test_busca.py`

**Interfaces:**
- Consumes: `app.models.profile.Profile`, `app.models.profissional.Profissional`, `app.models.especialidade.Especialidade`, `app.models.profissional_especialidade.profissional_especialidades`, `app.models.avaliacao.Avaliacao` (all from Plan 1); `app.core.database.get_db`; the `client` fixture.
- Produces: `app.schemas.busca.ProfissionalSearchResult` (`user_id`, `nome`, `cidade`, `estado`, `avatar_url`, `bio`, `preco_hora`, `verificado`, `nota_media: float | None`), `app.schemas.busca.ProfissionalSearchResponse` (`items: list[ProfissionalSearchResult]`, `total: int`, `limit: int`, `offset: int`); `app.services.profissional_service.search_profissionais(db, q, cidade, estado, preco_min, preco_max, nota_min, limit, offset) -> tuple[list[tuple[Profissional, float | None]], int]`; the route `GET /profissionais?q=&cidade=&estado=&preco_min=&preco_max=&nota_min=&limit=&offset=` (public, no auth).

- [ ] **Step 1: Write the failing tests**

`apps/api/tests/test_busca.py`:
```python
import uuid

from app.models.avaliacao import Avaliacao
from app.models.especialidade import Especialidade
from app.models.profile import Papel, Profile
from app.models.profissional import Profissional


def _make_profissional(db_session, nome, cidade, estado, preco_hora, especialidade_nome=None):
    user_id = uuid.uuid4()
    db_session.add(Profile(id=user_id, papel=Papel.profissional, nome=nome, cidade=cidade, estado=estado))
    db_session.flush()
    profissional = Profissional(user_id=user_id, preco_hora=preco_hora)
    if especialidade_nome:
        especialidade = Especialidade(nome=especialidade_nome)
        db_session.add(especialidade)
        db_session.flush()
        profissional.especialidades.append(especialidade)
    db_session.add(profissional)
    db_session.commit()
    return user_id


def test_search_returns_all_when_no_filters(client, db_session):
    _make_profissional(db_session, "Ana Lima", "Recife", "PE", 100)
    _make_profissional(db_session, "Bruno Rocha", "Salvador", "BA", 150)

    response = client.get("/profissionais")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert len(body["items"]) == 2


def test_search_filters_by_text_on_nome(client, db_session):
    _make_profissional(db_session, "Ana Lima", "Recife", "PE", 100)
    _make_profissional(db_session, "Bruno Rocha", "Salvador", "BA", 150)

    response = client.get("/profissionais", params={"q": "Ana"})

    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["nome"] == "Ana Lima"


def test_search_filters_by_text_on_especialidade(client, db_session):
    _make_profissional(db_session, "Ana Lima", "Recife", "PE", 100, especialidade_nome="Nefrologia Pediátrica")
    _make_profissional(db_session, "Bruno Rocha", "Salvador", "BA", 150, especialidade_nome="Cardiologia")

    response = client.get("/profissionais", params={"q": "Nefro"})

    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["nome"] == "Ana Lima"


def test_search_filters_by_cidade_and_estado(client, db_session):
    _make_profissional(db_session, "Ana Lima", "Recife", "PE", 100)
    _make_profissional(db_session, "Bruno Rocha", "Salvador", "BA", 150)

    response = client.get("/profissionais", params={"estado": "BA"})

    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["nome"] == "Bruno Rocha"


def test_search_filters_by_preco_range(client, db_session):
    _make_profissional(db_session, "Ana Lima", "Recife", "PE", 100)
    _make_profissional(db_session, "Bruno Rocha", "Salvador", "BA", 300)

    response = client.get("/profissionais", params={"preco_max": 200})

    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["nome"] == "Ana Lima"


def test_search_filters_by_nota_min(client, db_session):
    alta_nota_id = _make_profissional(db_session, "Ana Lima", "Recife", "PE", 100)
    baixa_nota_id = _make_profissional(db_session, "Bruno Rocha", "Salvador", "BA", 150)
    autor_id = uuid.uuid4()
    db_session.add(Profile(id=autor_id, papel=Papel.empresa, nome="Clínica X"))
    db_session.flush()
    db_session.add(Avaliacao(autor_id=autor_id, alvo_id=alta_nota_id, nota=5))
    db_session.add(Avaliacao(autor_id=autor_id, alvo_id=baixa_nota_id, nota=2))
    db_session.commit()

    response = client.get("/profissionais", params={"nota_min": 4})

    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["nome"] == "Ana Lima"
    assert body["items"][0]["nota_media"] == 5.0


def test_search_profissional_without_avaliacoes_has_null_nota_media(client, db_session):
    _make_profissional(db_session, "Ana Lima", "Recife", "PE", 100)

    response = client.get("/profissionais")

    body = response.json()
    assert body["items"][0]["nota_media"] is None


def test_search_respects_limit_and_offset(client, db_session):
    _make_profissional(db_session, "Ana Lima", "Recife", "PE", 100)
    _make_profissional(db_session, "Bruno Rocha", "Salvador", "BA", 150)
    _make_profissional(db_session, "Carla Souza", "Belo Horizonte", "MG", 120)

    response = client.get("/profissionais", params={"limit": 1, "offset": 1})

    body = response.json()
    assert body["total"] == 3
    assert len(body["items"]) == 1
    assert body["items"][0]["nome"] == "Bruno Rocha"
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `apps/api`, venv active): `pytest tests/test_busca.py -v`
Expected: FAIL — `404` (the `GET /profissionais` route doesn't exist yet; `GET /profissionais/{user_id}` requires a path segment, so a bare `GET /profissionais` currently 404s)

- [ ] **Step 3: Write `apps/api/app/schemas/busca.py`**

```python
import uuid

from pydantic import BaseModel, ConfigDict


class ProfissionalSearchResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    nome: str
    cidade: str | None
    estado: str | None
    avatar_url: str | None
    bio: str | None
    preco_hora: float | None
    verificado: bool
    nota_media: float | None


class ProfissionalSearchResponse(BaseModel):
    items: list[ProfissionalSearchResult]
    total: int
    limit: int
    offset: int
```

- [ ] **Step 4: Add `search_profissionais` to `apps/api/app/services/profissional_service.py`**

Modify the file's import block. Its current imports are exactly:
```python
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.especialidade import Especialidade
from app.models.profile import Profile
from app.models.profissional import Profissional
from app.schemas.especialidade import EspecialidadeRead
from app.schemas.profissional import ProfissionalRead, ProfissionalUpdateRequest
```
Replace that whole block with:
```python
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.avaliacao import Avaliacao
from app.models.especialidade import Especialidade
from app.models.profile import Profile
from app.models.profissional import Profissional
from app.models.profissional_especialidade import profissional_especialidades
from app.schemas.especialidade import EspecialidadeRead
from app.schemas.profissional import ProfissionalRead, ProfissionalUpdateRequest
```
(`Especialidade` and `Profile` were already imported and are unchanged; the new additions are `func, or_` on the sqlalchemy line, and the `Avaliacao` / `profissional_especialidade` import lines.)

Keep every existing function (`get_profissional_by_id`, `to_profissional_read`, `upsert_profissional`) unchanged. Append to the end of the file:
```python
def _build_search_filters(
    q: str | None,
    cidade: str | None,
    estado: str | None,
    preco_min: float | None,
    preco_max: float | None,
) -> list:
    filters = []
    if q:
        especialidade_match = (
            select(profissional_especialidades.c.profissional_id)
            .join(Especialidade, Especialidade.id == profissional_especialidades.c.especialidade_id)
            .where(Especialidade.nome.ilike(f"%{q}%"))
        )
        filters.append(
            or_(Profile.nome.ilike(f"%{q}%"), Profissional.user_id.in_(especialidade_match))
        )
    if cidade:
        filters.append(Profile.cidade.ilike(cidade))
    if estado:
        filters.append(Profile.estado == estado.upper())
    if preco_min is not None:
        filters.append(Profissional.preco_hora >= preco_min)
    if preco_max is not None:
        filters.append(Profissional.preco_hora <= preco_max)
    return filters


def search_profissionais(
    db: Session,
    q: str | None = None,
    cidade: str | None = None,
    estado: str | None = None,
    preco_min: float | None = None,
    preco_max: float | None = None,
    nota_min: float | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[tuple[Profissional, float | None]], int]:
    nota_subq = (
        select(Avaliacao.alvo_id.label("alvo_id"), func.avg(Avaliacao.nota).label("nota_media"))
        .group_by(Avaliacao.alvo_id)
        .subquery()
    )

    base_query = (
        select(Profissional, nota_subq.c.nota_media)
        .join(Profile, Profissional.user_id == Profile.id)
        .outerjoin(nota_subq, nota_subq.c.alvo_id == Profile.id)
    )

    filters = _build_search_filters(q, cidade, estado, preco_min, preco_max)
    if nota_min is not None:
        filters.append(nota_subq.c.nota_media >= nota_min)
    for condition in filters:
        base_query = base_query.where(condition)

    count_query = select(func.count()).select_from(
        base_query.with_only_columns(Profissional.user_id).subquery()
    )
    total = db.scalar(count_query) or 0

    rows = db.execute(base_query.order_by(Profile.nome).limit(limit).offset(offset)).all()

    return [(row[0], row[1]) for row in rows], total
```

- [ ] **Step 5: Add the `GET ""` route to `apps/api/app/routers/profissionais.py`**

Modify the file — add `Query` to the existing `fastapi` import, add the new schema import, and append the new route function (keep the existing `GET /{user_id}` and `PUT /me` routes unchanged):
```python
from fastapi import APIRouter, Depends, HTTPException, Query, status
```
(replace the existing `from fastapi import APIRouter, Depends, HTTPException, status` line with this one, adding `Query`)
```python
from app.schemas.busca import ProfissionalSearchResponse, ProfissionalSearchResult
```
(add alongside the existing `from app.schemas.profissional import ...` line)
```python
from app.services.profissional_service import (
    get_profissional_by_id,
    search_profissionais,
    to_profissional_read,
    upsert_profissional,
)
```
(replace the existing `from app.services.profissional_service import ...` line with this one, adding `search_profissionais`)

Append this new route function (order doesn't matter relative to the other two routes, but conventionally list-before-detail reads better — place it above `get_profissional`):
```python
@router.get("", response_model=ProfissionalSearchResponse)
def search_profissionais_route(
    q: str | None = None,
    cidade: str | None = None,
    estado: str | None = None,
    preco_min: float | None = None,
    preco_max: float | None = None,
    nota_min: float | None = Query(default=None, ge=1, le=5),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> ProfissionalSearchResponse:
    results, total = search_profissionais(
        db, q, cidade, estado, preco_min, preco_max, nota_min, limit, offset
    )
    items = [
        ProfissionalSearchResult(
            user_id=profissional.user_id,
            nome=profissional.profile.nome,
            cidade=profissional.profile.cidade,
            estado=profissional.profile.estado,
            avatar_url=profissional.profile.avatar_url,
            bio=profissional.bio,
            preco_hora=float(profissional.preco_hora) if profissional.preco_hora is not None else None,
            verificado=profissional.verificado,
            nota_media=float(nota_media) if nota_media is not None else None,
        )
        for profissional, nota_media in results
    ]
    return ProfissionalSearchResponse(items=items, total=total, limit=limit, offset=offset)
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pytest tests/test_busca.py -v`
Expected: PASS (8 tests)

- [ ] **Step 7: Run the full suite to confirm nothing regressed**

Run: `pytest -v`
Expected: PASS — all 39 tests (31 from Task 1 plus this task's 8).

- [ ] **Step 8: Commit**

```bash
git add apps/api/app/schemas/busca.py apps/api/app/services/profissional_service.py \
  apps/api/app/routers/profissionais.py apps/api/tests/test_busca.py
git commit -m "feat(api): add GET /profissionais text search and filters"
```

---

### Task 3: `contatos` — create, list, and e-mail notification via Resend

**Files:**
- Create: `apps/api/app/schemas/contato.py`
- Create: `apps/api/app/services/email_service.py`
- Create: `apps/api/app/services/contato_service.py`
- Create: `apps/api/app/routers/contatos.py`
- Modify: `apps/api/app/main.py` (include the `contatos` router)
- Test: `apps/api/tests/test_email_service.py`
- Test: `apps/api/tests/test_contatos.py`

**Interfaces:**
- Consumes: `app.core.auth.CurrentUser`, `get_current_user`; `app.core.database.get_db`; `app.models.contato.Contato`, `StatusContato`; `app.models.profile.Profile`; `app.models.profissional.Profissional` (and its `.profile` relationship from Plan 2); the `client` fixture.
- Produces: `app.services.email_service.send_contact_notification_email(to_email, solicitante_nome, mensagem) -> None` (never raises — catches and reports failures to Sentry instead, since a notification hiccup must never break contact creation); `app.schemas.contato.ContatoCreateRequest` (`profissional_id: uuid.UUID`, `mensagem: str`), `ContatoRead` (`id`, `solicitante_id`, `profissional_id`, `mensagem`, `status`, `criado_em`); `app.services.contato_service.create_contato(db, solicitante_id, data) -> Contato`, `list_own_contatos(db, user_id) -> list[Contato]`; routes `POST /contatos` and `GET /contatos` (both require auth). Task 4 imports `Contato` to check for its existence when authorizing avaliação creation.

- [ ] **Step 1: Write the failing tests for the e-mail service**

`apps/api/tests/test_email_service.py`:
```python
from unittest.mock import patch

from app.services.email_service import send_contact_notification_email


@patch("app.services.email_service.httpx.post")
def test_send_contact_notification_email_calls_resend_api(mock_post, monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    get_settings.cache_clear()

    send_contact_notification_email("prof@example.com", "Maria Silva", "Olá, preciso de ajuda")

    mock_post.assert_called_once()
    _, kwargs = mock_post.call_args
    assert kwargs["json"]["to"] == ["prof@example.com"]
    assert "Maria Silva" in kwargs["json"]["text"]
    get_settings.cache_clear()


@patch("app.services.email_service.httpx.post")
def test_send_contact_notification_email_skips_when_no_api_key(mock_post, monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setenv("RESEND_API_KEY", "")
    get_settings.cache_clear()

    send_contact_notification_email("prof@example.com", "Maria Silva", "Olá")

    mock_post.assert_not_called()
    get_settings.cache_clear()


@patch("app.services.email_service.sentry_sdk.capture_exception")
@patch("app.services.email_service.httpx.post", side_effect=RuntimeError("network down"))
def test_send_contact_notification_email_reports_to_sentry_and_does_not_raise(
    mock_post, mock_capture, monkeypatch
):
    from app.core.config import get_settings

    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    get_settings.cache_clear()

    send_contact_notification_email("prof@example.com", "Maria Silva", "Olá")  # must not raise

    mock_capture.assert_called_once()
    get_settings.cache_clear()
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `apps/api`, venv active): `pytest tests/test_email_service.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.email_service'`

- [ ] **Step 3: Write `apps/api/app/services/email_service.py`**

```python
import httpx
import sentry_sdk

from app.core.config import get_settings

RESEND_API_URL = "https://api.resend.com/emails"


def send_contact_notification_email(to_email: str, solicitante_nome: str, mensagem: str) -> None:
    settings = get_settings()
    if not settings.resend_api_key:
        return
    try:
        httpx.post(
            RESEND_API_URL,
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={
                "from": "SaúdeConecta <onboarding@resend.dev>",
                "to": [to_email],
                "subject": "Você recebeu um novo contato no SaúdeConecta",
                "text": f"{solicitante_nome} enviou uma mensagem:\n\n{mensagem}",
            },
            timeout=10,
        )
    except Exception as exc:
        sentry_sdk.capture_exception(exc)
```

- [ ] **Step 4: Run the e-mail service tests to verify they pass**

Run: `pytest tests/test_email_service.py -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing tests for the contatos endpoints**

`apps/api/tests/test_contatos.py`:
```python
import uuid
from unittest.mock import patch

from app.core.auth import CurrentUser, get_current_user
from app.main import app
from app.models.contato import Contato
from app.models.profile import Papel, Profile
from app.models.profissional import Profissional


def test_create_contato_requires_authentication(client):
    response = client.post(
        "/contatos", json={"profissional_id": str(uuid.uuid4()), "mensagem": "Oi"}
    )
    assert response.status_code == 401


def test_create_contato_requires_synced_profile(client):
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=uuid.uuid4(), email="x@example.com", role="authenticated"
    )

    response = client.post(
        "/contatos", json={"profissional_id": str(uuid.uuid4()), "mensagem": "Oi"}
    )
    assert response.status_code == 400


def test_create_contato_returns_404_for_unknown_profissional(client, db_session):
    solicitante_id = uuid.uuid4()
    db_session.add(Profile(id=solicitante_id, papel=Papel.empresa, nome="Clínica X"))
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=solicitante_id, email="x@example.com", role="authenticated"
    )

    response = client.post(
        "/contatos", json={"profissional_id": str(uuid.uuid4()), "mensagem": "Oi"}
    )
    assert response.status_code == 404


@patch("app.services.contato_service.send_contact_notification_email")
def test_create_contato_persists_and_notifies_by_email(mock_send_email, client, db_session):
    solicitante_id = uuid.uuid4()
    db_session.add(Profile(id=solicitante_id, papel=Papel.empresa, nome="Clínica X"))

    profissional_id = uuid.uuid4()
    db_session.add(
        Profile(
            id=profissional_id,
            papel=Papel.profissional,
            nome="Maria Silva",
            email="maria@example.com",
        )
    )
    db_session.flush()
    db_session.add(Profissional(user_id=profissional_id))
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=solicitante_id, email="x@example.com", role="authenticated"
    )

    response = client.post(
        "/contatos",
        json={"profissional_id": str(profissional_id), "mensagem": "Preciso de fisioterapia"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "pendente"
    saved = db_session.get(Contato, body["id"])
    assert saved is not None
    assert saved.mensagem == "Preciso de fisioterapia"

    mock_send_email.assert_called_once_with(
        "maria@example.com", "Clínica X", "Preciso de fisioterapia"
    )


def test_list_own_contatos_requires_authentication(client):
    response = client.get("/contatos")
    assert response.status_code == 401


def test_list_own_contatos_returns_only_own(client, db_session):
    user_a = uuid.uuid4()
    user_b = uuid.uuid4()
    user_c = uuid.uuid4()
    db_session.add_all(
        [
            Profile(id=user_a, papel=Papel.empresa, nome="A"),
            Profile(id=user_b, papel=Papel.profissional, nome="B"),
            Profile(id=user_c, papel=Papel.empresa, nome="C"),
        ]
    )
    db_session.flush()
    db_session.add(Profissional(user_id=user_b))
    db_session.commit()

    db_session.add_all(
        [
            Contato(solicitante_id=user_a, profissional_id=user_b, mensagem="A para B"),
            Contato(solicitante_id=user_c, profissional_id=user_b, mensagem="C para B (não vejo)"),
        ]
    )
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_a, email="a@example.com", role="authenticated"
    )

    response = client.get("/contatos")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["mensagem"] == "A para B"
```

- [ ] **Step 6: Run the tests to verify they fail**

Run (from `apps/api`, venv active): `pytest tests/test_contatos.py -v`
Expected: FAIL — routes don't exist yet, `ModuleNotFoundError` for schema/service modules

- [ ] **Step 7: Write `apps/api/app/schemas/contato.py`**

```python
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.contato import StatusContato


class ContatoCreateRequest(BaseModel):
    profissional_id: uuid.UUID
    mensagem: str


class ContatoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    solicitante_id: uuid.UUID
    profissional_id: uuid.UUID
    mensagem: str
    status: StatusContato
    criado_em: datetime
```

- [ ] **Step 8: Write `apps/api/app/services/contato_service.py`**

```python
import uuid

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.contato import Contato
from app.models.profile import Profile
from app.models.profissional import Profissional
from app.schemas.contato import ContatoCreateRequest
from app.services.email_service import send_contact_notification_email


def create_contato(db: Session, solicitante_id: uuid.UUID, data: ContatoCreateRequest) -> Contato:
    solicitante = db.get(Profile, solicitante_id)
    if solicitante is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sincronize seu perfil primeiro via POST /auth/sync",
        )

    profissional = db.get(Profissional, data.profissional_id)
    if profissional is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profissional não encontrado"
        )

    contato = Contato(
        solicitante_id=solicitante_id,
        profissional_id=data.profissional_id,
        mensagem=data.mensagem,
    )
    db.add(contato)
    db.commit()
    db.refresh(contato)

    if profissional.profile.email:
        send_contact_notification_email(
            profissional.profile.email, solicitante.nome, data.mensagem
        )

    return contato


def list_own_contatos(db: Session, user_id: uuid.UUID) -> list[Contato]:
    return list(
        db.scalars(
            select(Contato)
            .where(or_(Contato.solicitante_id == user_id, Contato.profissional_id == user_id))
            .order_by(Contato.criado_em.desc())
        )
    )
```

- [ ] **Step 9: Write `apps/api/app/routers/contatos.py`**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.models.contato import Contato
from app.schemas.contato import ContatoCreateRequest, ContatoRead
from app.services.contato_service import create_contato, list_own_contatos

router = APIRouter(prefix="/contatos", tags=["contatos"])


@router.post("", response_model=ContatoRead)
def create_contato_route(
    data: ContatoCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Contato:
    return create_contato(db, current_user.id, data)


@router.get("", response_model=list[ContatoRead])
def list_own_contatos_route(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Contato]:
    return list_own_contatos(db, current_user.id)
```

- [ ] **Step 10: Wire the router into `apps/api/app/main.py`**

```python
from fastapi import FastAPI

from app.core.sentry import init_sentry
from app.routers import auth, contatos, empresas, especialidades, health, profissionais

init_sentry()

app = FastAPI(title="SaúdeConecta API")

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(especialidades.router)
app.include_router(profissionais.router)
app.include_router(empresas.router)
app.include_router(contatos.router)
```

- [ ] **Step 11: Run the tests to verify they pass**

Run: `pytest tests/test_contatos.py -v`
Expected: PASS (6 tests)

- [ ] **Step 12: Run the full suite to confirm nothing regressed**

Run: `pytest -v`
Expected: PASS — all 48 tests (39 from Task 2 plus this task's 3 + 6).

- [ ] **Step 13: Commit**

```bash
git add apps/api/app/schemas/contato.py apps/api/app/services/email_service.py \
  apps/api/app/services/contato_service.py apps/api/app/routers/contatos.py apps/api/app/main.py \
  apps/api/tests/test_email_service.py apps/api/tests/test_contatos.py
git commit -m "feat(api): add contatos endpoints with Resend email notification"
```

---

### Task 4: `avaliações` — create (contato-gated) and public read

**Files:**
- Create: `apps/api/app/schemas/avaliacao.py`
- Create: `apps/api/app/services/avaliacao_service.py`
- Create: `apps/api/app/routers/avaliacoes.py`
- Modify: `apps/api/app/main.py` (include the `avaliacoes` router)
- Test: `apps/api/tests/test_avaliacoes.py`

**Interfaces:**
- Consumes: `app.core.auth.CurrentUser`, `get_current_user`; `app.core.database.get_db`; `app.models.avaliacao.Avaliacao`; `app.models.contato.Contato` (from Task 3); the `client` fixture.
- Produces: `app.schemas.avaliacao.AvaliacaoCreateRequest` (`alvo_id: uuid.UUID`, `nota: int` constrained 1–5, `comentario: str | None`), `AvaliacaoRead` (`id`, `autor_id`, `alvo_id`, `nota`, `comentario`, `criado_em`); `app.services.avaliacao_service.create_avaliacao(db, autor_id, data) -> Avaliacao`, `list_avaliacoes_by_alvo(db, alvo_id) -> list[Avaliacao]`; routes `POST /avaliacoes` (auth required, contato-gated) and `GET /avaliacoes?alvo_id=` (public).

- [ ] **Step 1: Write the failing tests**

`apps/api/tests/test_avaliacoes.py`:
```python
import uuid

from app.core.auth import CurrentUser, get_current_user
from app.main import app
from app.models.avaliacao import Avaliacao
from app.models.contato import Contato
from app.models.profile import Papel, Profile
from app.models.profissional import Profissional


def test_create_avaliacao_requires_authentication(client):
    response = client.post("/avaliacoes", json={"alvo_id": str(uuid.uuid4()), "nota": 5})
    assert response.status_code == 401


def test_create_avaliacao_rejects_self_review(client, db_session):
    user_id = uuid.uuid4()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email="x@example.com", role="authenticated"
    )

    response = client.post("/avaliacoes", json={"alvo_id": str(user_id), "nota": 5})
    assert response.status_code == 400


def test_create_avaliacao_requires_existing_contato(client, db_session):
    autor_id = uuid.uuid4()
    alvo_id = uuid.uuid4()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=autor_id, email="x@example.com", role="authenticated"
    )

    response = client.post("/avaliacoes", json={"alvo_id": str(alvo_id), "nota": 5})
    assert response.status_code == 403


def test_create_avaliacao_succeeds_after_contato(client, db_session):
    solicitante_id = uuid.uuid4()
    profissional_id = uuid.uuid4()
    db_session.add(Profile(id=solicitante_id, papel=Papel.empresa, nome="Clínica X"))
    db_session.add(Profile(id=profissional_id, papel=Papel.profissional, nome="Maria"))
    db_session.flush()
    db_session.add(Profissional(user_id=profissional_id))
    db_session.add(
        Contato(solicitante_id=solicitante_id, profissional_id=profissional_id, mensagem="Oi")
    )
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=solicitante_id, email="x@example.com", role="authenticated"
    )

    response = client.post(
        "/avaliacoes",
        json={"alvo_id": str(profissional_id), "nota": 5, "comentario": "Ótimo atendimento"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["nota"] == 5
    assert body["comentario"] == "Ótimo atendimento"


def test_create_avaliacao_rejects_nota_out_of_range(client, db_session):
    solicitante_id = uuid.uuid4()
    profissional_id = uuid.uuid4()
    db_session.add(Profile(id=solicitante_id, papel=Papel.empresa, nome="Clínica X"))
    db_session.add(Profile(id=profissional_id, papel=Papel.profissional, nome="Maria"))
    db_session.flush()
    db_session.add(Profissional(user_id=profissional_id))
    db_session.add(
        Contato(solicitante_id=solicitante_id, profissional_id=profissional_id, mensagem="Oi")
    )
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=solicitante_id, email="x@example.com", role="authenticated"
    )

    response = client.post("/avaliacoes", json={"alvo_id": str(profissional_id), "nota": 6})
    assert response.status_code == 422


def test_list_avaliacoes_by_alvo_is_public(client, db_session):
    autor_id = uuid.uuid4()
    alvo_id = uuid.uuid4()
    db_session.add(Profile(id=autor_id, papel=Papel.empresa, nome="Clínica X"))
    db_session.add(Profile(id=alvo_id, papel=Papel.profissional, nome="Maria"))
    db_session.flush()
    db_session.add(Profissional(user_id=alvo_id))
    db_session.commit()
    db_session.add(Avaliacao(autor_id=autor_id, alvo_id=alvo_id, nota=4, comentario="Bom"))
    db_session.commit()

    response = client.get(f"/avaliacoes?alvo_id={alvo_id}")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["nota"] == 4
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `apps/api`, venv active): `pytest tests/test_avaliacoes.py -v`
Expected: FAIL — routes don't exist yet, `ModuleNotFoundError` for schema/service modules

- [ ] **Step 3: Write `apps/api/app/schemas/avaliacao.py`**

```python
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AvaliacaoCreateRequest(BaseModel):
    alvo_id: uuid.UUID
    nota: int = Field(ge=1, le=5)
    comentario: str | None = None


class AvaliacaoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    autor_id: uuid.UUID
    alvo_id: uuid.UUID
    nota: int
    comentario: str | None
    criado_em: datetime
```

- [ ] **Step 4: Write `apps/api/app/services/avaliacao_service.py`**

```python
import uuid

from fastapi import HTTPException, status
from sqlalchemy import exists, or_, select
from sqlalchemy.orm import Session

from app.models.avaliacao import Avaliacao
from app.models.contato import Contato
from app.schemas.avaliacao import AvaliacaoCreateRequest


def _has_contato_between(db: Session, autor_id: uuid.UUID, alvo_id: uuid.UUID) -> bool:
    query = select(
        exists().where(
            or_(
                (Contato.solicitante_id == autor_id) & (Contato.profissional_id == alvo_id),
                (Contato.profissional_id == autor_id) & (Contato.solicitante_id == alvo_id),
            )
        )
    )
    return bool(db.scalar(query))


def create_avaliacao(db: Session, autor_id: uuid.UUID, data: AvaliacaoCreateRequest) -> Avaliacao:
    if autor_id == data.alvo_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Você não pode avaliar a si mesmo"
        )
    if not _has_contato_between(db, autor_id, data.alvo_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você só pode avaliar quem teve um contato registrado com você",
        )

    avaliacao = Avaliacao(
        autor_id=autor_id, alvo_id=data.alvo_id, nota=data.nota, comentario=data.comentario
    )
    db.add(avaliacao)
    db.commit()
    db.refresh(avaliacao)
    return avaliacao


def list_avaliacoes_by_alvo(db: Session, alvo_id: uuid.UUID) -> list[Avaliacao]:
    return list(
        db.scalars(
            select(Avaliacao)
            .where(Avaliacao.alvo_id == alvo_id)
            .order_by(Avaliacao.criado_em.desc())
        )
    )
```

- [ ] **Step 5: Write `apps/api/app/routers/avaliacoes.py`**

```python
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.models.avaliacao import Avaliacao
from app.schemas.avaliacao import AvaliacaoCreateRequest, AvaliacaoRead
from app.services.avaliacao_service import create_avaliacao, list_avaliacoes_by_alvo

router = APIRouter(prefix="/avaliacoes", tags=["avaliacoes"])


@router.post("", response_model=AvaliacaoRead)
def create_avaliacao_route(
    data: AvaliacaoCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Avaliacao:
    return create_avaliacao(db, current_user.id, data)


@router.get("", response_model=list[AvaliacaoRead])
def list_avaliacoes_route(alvo_id: uuid.UUID, db: Session = Depends(get_db)) -> list[Avaliacao]:
    return list_avaliacoes_by_alvo(db, alvo_id)
```

- [ ] **Step 6: Wire the router into `apps/api/app/main.py`**

```python
from fastapi import FastAPI

from app.core.sentry import init_sentry
from app.routers import auth, avaliacoes, contatos, empresas, especialidades, health, profissionais

init_sentry()

app = FastAPI(title="SaúdeConecta API")

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(especialidades.router)
app.include_router(profissionais.router)
app.include_router(empresas.router)
app.include_router(contatos.router)
app.include_router(avaliacoes.router)
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pytest tests/test_avaliacoes.py -v`
Expected: PASS (6 tests)

- [ ] **Step 8: Run the full suite to confirm nothing regressed**

Run: `pytest -v`
Expected: PASS — all 54 tests (48 from Task 3 plus this task's 6).

- [ ] **Step 9: Commit**

```bash
git add apps/api/app/schemas/avaliacao.py apps/api/app/services/avaliacao_service.py \
  apps/api/app/routers/avaliacoes.py apps/api/app/main.py apps/api/tests/test_avaliacoes.py
git commit -m "feat(api): add avaliacoes endpoints (contato-gated creation, public read)"
```

---

### Task 5: Final wiring, formatting, and manual verification

**Files:**
- Verify only (no new files): `apps/api/app/main.py`, all files from Tasks 1–4.

**Interfaces:**
- Consumes: everything produced by Tasks 1–4.
- Produces: nothing new — this task verifies the whole plan's deliverable works together end-to-end.

- [ ] **Step 1: Run the entire test suite**

Run (from `apps/api`, venv active): `pytest -v`
Expected: PASS — all 54 tests, output pristine (only the known pre-existing third-party `DeprecationWarning`).

- [ ] **Step 2: Format and lint**

Run (from `apps/api`, venv active):
```bash
black app tests
ruff check app tests --fix
```
Fix anything ruff flags that `--fix` doesn't auto-resolve. Re-run `pytest -v` if any fix touched logic (not just formatting).

- [ ] **Step 3: Manually verify the app boots and the new endpoints respond**

Run:
```bash
cd apps/api
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/saudeconecta uvicorn app.main:app --port 8000 &
sleep 2
echo "=== GET /profissionais (search, expect empty list on a fresh dev DB) ==="
curl -s http://localhost:8000/profissionais
echo
echo "=== GET /avaliacoes without alvo_id (expect 422 - required query param) ==="
curl -s -w "\nHTTP_STATUS:%{http_code}\n" http://localhost:8000/avaliacoes
echo "=== POST /contatos without a token (expect 401) ==="
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST http://localhost:8000/contatos \
  -H "Content-Type: application/json" -d '{"profissional_id": "00000000-0000-0000-0000-000000000000", "mensagem": "teste"}'
kill %1
```
Expected: `/profissionais` returns `{"items":[],"total":0,"limit":20,"offset":0}` (or real data if the dev DB has rows from earlier manual testing); `/avaliacoes` without `alvo_id` returns HTTP 422; `/contatos` without a token returns HTTP 401. No server errors in the logs.

Note: if `apps/api/.env` exists with a different `DATABASE_URL`, the inline `DATABASE_URL=...` prefix above overrides it for just this command, consistent with how the Backend Foundation plan's own manual verification step worked around the same thing.

- [ ] **Step 4: Sanity-check the generated OpenAPI docs**

Run:
```bash
cd apps/api
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/saudeconecta uvicorn app.main:app --port 8000 &
sleep 2
curl -s http://localhost:8000/openapi.json | python3 -m json.tool | head -150
kill %1
```
Confirm: `GET /profissionais`, `POST /contatos`, `GET /contatos`, `POST /avaliacoes`, `GET /avaliacoes` all appear, each with a named, non-generic response schema (`ProfissionalSearchResponse`, `ContatoRead`, `AvaliacaoRead`), and `GET /profissionais`'s query parameters (`q`, `cidade`, `estado`, `preco_min`, `preco_max`, `nota_min`, `limit`, `offset`) are all present with correct types. Fix any unclear field name or missing type before committing further — this is the frontend team's reference.

- [ ] **Step 5: Commit (only if Step 2 or Step 4 produced changes)**

```bash
git add -A
git commit -m "chore(api): format and verify search/avaliacoes/contatos end-to-end"
```
If nothing changed, skip this step — there's nothing to commit.

---

## Definition of Done for this plan

- `pytest -v` run from `apps/api` (with `docker-compose.dev.yml`'s `db-test` container running) passes all 54 tests.
- `uvicorn app.main:app` boots without errors against the local dev Postgres and serves `GET /profissionais` (search), `GET /avaliacoes?alvo_id=` (public), and rejects unauthenticated `POST /contatos`, `POST /avaliacoes` with 401.
- `black --check` and `ruff check` pass with no findings on `apps/api/app` and `apps/api/tests`.
- `GET /openapi.json` reflects all 5 new/changed routes with named, complete schemas.
- No RLS policy was added anywhere.
- Nothing from later plans (Storage upload endpoint, payment, analytics, CI, `.env.example`/README) was implemented — confirm by re-reading this plan's "Plan Sequence Note".
