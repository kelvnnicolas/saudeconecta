# Avatar Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an authenticated user upload a profile photo/logo, store it in Supabase Storage, and persist the resulting public URL on their `profiles` row.

**Architecture:** A new `POST /perfis/me/avatar` endpoint accepts a multipart file upload, delegates validation + storage + persistence to a new `profile_service.update_avatar` function, which reuses the existing `app/storage/supabase_storage.upload_avatar` helper (already built and unit-tested in Plan 1, but never wired to an HTTP endpoint until now).

**Tech Stack:** FastAPI (`UploadFile`, `python-multipart` — already in `requirements.txt`), SQLAlchemy, Supabase Storage Python SDK (via the existing `app/storage/supabase_storage.py` helper).

**Spec:** `docs/superpowers/specs/2026-09-19-saudeconecta-mvp-design.md`

**Branch base:** This plan branches from `main` (commit `52f118a`, the Plan 1+2 merge). It does NOT depend on Plan 3 (`worktree-search-reviews-contacts`), which is implemented, reviewed, and pushed but intentionally not yet merged — avatar upload only touches `profiles`, `app/routers/`, `app/services/profile_service.py`, and `app/main.py`, none of which Plan 3 changed in a conflicting way. Because this worktree forked before Plan 3, `app/schemas/profile.py`'s `ProfileRead` here has no `email` field and `profile_service.upsert_profile` takes 3 args (not Plan 3's 4-arg version) — this plan's tasks use exactly that pre-Plan-3 shape. Do not port Plan 3 changes into this plan.

## Global Constraints

- Authorization lives entirely in the FastAPI service layer (never Postgres RLS) — `DATABASE_URL` connects as a superuser-equivalent role. (Spec §6, Autorização)
- A user may only upload an avatar for themself — enforced via `get_current_user`, never a client-supplied id.
- Uploading an avatar requires an already-synced profile (`POST /auth/sync` must have run first) — mirrors the existing rule in `upsert_profissional` (`app/services/profissional_service.py:36-41`) that raises 400 with the same message when `profiles` has no row for the user yet.
- Accepted image formats: `image/jpeg`, `image/png`, `image/webp` only. Max size: 5 MiB. Reject anything else with `422`.
- Black (`line-length = 100`) and Ruff (`select = ["E", "F", "I", "UP"]`) must both pass clean (`pyproject.toml`).
- Test DB fixtures follow the existing `client`/`db_session` pattern in `apps/api/tests/conftest.py` — `client` already overrides `get_db` to share the test's rolled-back-transaction session; never add a redundant `monkeypatch.setenv("DATABASE_URL", ...)`.
- Out of scope for this plan (do not implement): the spec's acceptance criterion "Erro forçado em ambiente de teste aparece no Sentry" is a manual, credentials-gated QA step (needs a real `SENTRY_DSN`, which is currently unset after the credential-loss incident) — it is not a coded feature and does not belong in the API as a permanent debug endpoint. Task 2 documents it as a pending manual step in `STATUS.md` instead of building it.

---

### Task 1: `POST /perfis/me/avatar` endpoint

**Files:**
- Modify: `apps/api/app/services/profile_service.py`
- Create: `apps/api/app/routers/perfis.py`
- Modify: `apps/api/app/main.py`
- Create: `apps/api/tests/test_perfis.py`

**Interfaces:**
- Consumes: `app.storage.supabase_storage.upload_avatar(file_path_in_bucket: str, file_bytes: bytes, content_type: str) -> str` (existing, `app/storage/supabase_storage.py:14`). `app.core.auth.CurrentUser` / `get_current_user` (existing, `app/core/auth.py`). `app.models.profile.Profile` (existing, `app/models/profile.py`). `app.schemas.profile.ProfileRead` (existing, `app/schemas/profile.py:17-27`, no `email` field in this branch).
- Produces: `profile_service.update_avatar(db: Session, user_id: uuid.UUID, file_bytes: bytes, content_type: str | None) -> Profile` — raises `HTTPException(400)` if no `profiles` row exists for `user_id`, `HTTPException(422)` if `content_type` isn't in the whitelist or `file_bytes` exceeds 5 MiB. On success, sets `profile.avatar_url`, commits, and returns the refreshed `Profile`. Later tasks/plans that need "does this user have an avatar" can call this directly.

- [ ] **Step 1: Write the failing tests**

Create `apps/api/tests/test_perfis.py`:

```python
import uuid
from unittest.mock import patch

from app.core.auth import CurrentUser, get_current_user
from app.main import app
from app.models.profile import Papel, Profile


def test_upload_avatar_requires_authentication(client):
    response = client.post(
        "/perfis/me/avatar",
        files={"file": ("avatar.jpg", b"fake-image-bytes", "image/jpeg")},
    )
    assert response.status_code == 401


def test_upload_avatar_requires_synced_profile(client):
    user_id = uuid.uuid4()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email="maria@example.com", role="authenticated"
    )

    response = client.post(
        "/perfis/me/avatar",
        files={"file": ("avatar.jpg", b"fake-image-bytes", "image/jpeg")},
    )

    assert response.status_code == 400


@patch("app.services.profile_service.upload_avatar")
def test_upload_avatar_rejects_unsupported_content_type(mock_upload, client, db_session):
    user_id = uuid.uuid4()
    db_session.add(Profile(id=user_id, papel=Papel.profissional, nome="Maria Silva"))
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email="maria@example.com", role="authenticated"
    )

    response = client.post(
        "/perfis/me/avatar",
        files={"file": ("avatar.gif", b"fake-image-bytes", "image/gif")},
    )

    assert response.status_code == 422
    mock_upload.assert_not_called()


@patch("app.services.profile_service.upload_avatar")
def test_upload_avatar_rejects_file_over_size_limit(mock_upload, client, db_session):
    user_id = uuid.uuid4()
    db_session.add(Profile(id=user_id, papel=Papel.profissional, nome="Maria Silva"))
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email="maria@example.com", role="authenticated"
    )

    oversized = b"x" * (5 * 1024 * 1024 + 1)
    response = client.post(
        "/perfis/me/avatar",
        files={"file": ("avatar.jpg", oversized, "image/jpeg")},
    )

    assert response.status_code == 422
    mock_upload.assert_not_called()


@patch("app.services.profile_service.upload_avatar")
def test_upload_avatar_updates_profile_and_returns_url(mock_upload, client, db_session):
    user_id = uuid.uuid4()
    db_session.add(Profile(id=user_id, papel=Papel.profissional, nome="Maria Silva"))
    db_session.commit()
    mock_upload.return_value = (
        f"https://example.supabase.co/storage/v1/object/public/avatars/{user_id}.jpg"
    )

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email="maria@example.com", role="authenticated"
    )

    response = client.post(
        "/perfis/me/avatar",
        files={"file": ("avatar.jpg", b"fake-image-bytes", "image/jpeg")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["avatar_url"] == mock_upload.return_value
    mock_upload.assert_called_once_with(f"{user_id}.jpg", b"fake-image-bytes", "image/jpeg")

    saved = db_session.get(Profile, user_id)
    assert saved.avatar_url == mock_upload.return_value
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_perfis.py -v`
Expected: FAIL — `404 Not Found` on every request (no route registered yet) / collection works fine since the test file itself has no import errors.

- [ ] **Step 3: Add `update_avatar` to `profile_service.py`**

Replace the full content of `apps/api/app/services/profile_service.py` with:

```python
import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.profile import Profile
from app.schemas.profile import AuthSyncRequest
from app.storage.supabase_storage import upload_avatar

_AVATAR_CONTENT_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}
_MAX_AVATAR_BYTES = 5 * 1024 * 1024


def upsert_profile(db: Session, user_id: uuid.UUID, data: AuthSyncRequest) -> Profile:
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
    db.commit()
    db.refresh(profile)
    return profile


def update_avatar(
    db: Session, user_id: uuid.UUID, file_bytes: bytes, content_type: str | None
) -> Profile:
    profile = db.get(Profile, user_id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sincronize seu perfil primeiro via POST /auth/sync",
        )

    extension = _AVATAR_CONTENT_TYPES.get(content_type or "")
    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Formato de imagem não suportado. Use JPEG, PNG ou WEBP.",
        )
    if len(file_bytes) > _MAX_AVATAR_BYTES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Imagem maior que o limite de 5MB.",
        )

    avatar_url = upload_avatar(f"{user_id}.{extension}", file_bytes, content_type)
    profile.avatar_url = avatar_url
    db.commit()
    db.refresh(profile)
    return profile
```

Only `upsert_profile`'s existing body is unchanged — the imports and the new `update_avatar` function are additions.

- [ ] **Step 4: Create the router**

Create `apps/api/app/routers/perfis.py`:

```python
from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.schemas.profile import ProfileRead
from app.services.profile_service import update_avatar

router = APIRouter(prefix="/perfis", tags=["perfis"])


@router.post("/me/avatar", response_model=ProfileRead)
async def upload_own_avatar(
    file: UploadFile,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileRead:
    file_bytes = await file.read()
    return update_avatar(db, current_user.id, file_bytes, file.content_type)
```

- [ ] **Step 5: Wire the router into `main.py`**

Replace the full content of `apps/api/app/main.py` with:

```python
from fastapi import FastAPI

from app.core.sentry import init_sentry
from app.routers import auth, empresas, especialidades, health, perfis, profissionais

init_sentry()

app = FastAPI(title="SaúdeConecta API")

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(especialidades.router)
app.include_router(profissionais.router)
app.include_router(empresas.router)
app.include_router(perfis.router)
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_perfis.py -v`
Expected: 4 passed.

Then run the full suite to confirm no regressions:

Run: `cd apps/api && .venv/bin/python -m pytest -q`
Expected: all tests pass (30 existing + 4 new = 34).

- [ ] **Step 7: Format and lint**

Run: `cd apps/api && .venv/bin/python -m black app tests && .venv/bin/python -m ruff check app tests`
Expected: black reports no changes needed (or reformats — re-run pytest after), ruff reports no errors.

- [ ] **Step 8: Commit**

```bash
git add apps/api/app/services/profile_service.py apps/api/app/routers/perfis.py apps/api/app/main.py apps/api/tests/test_perfis.py
git commit -m "feat(api): add POST /perfis/me/avatar upload endpoint"
```

---

### Task 2: Verification and docs

**Files:**
- Modify: `STATUS.md` (repo root)

**Interfaces:**
- Consumes: nothing new — this task only runs and documents, it writes no application code.
- Produces: nothing new.

- [ ] **Step 1: Run the full backend test suite**

Run: `cd apps/api && .venv/bin/python -m pytest -q`
Expected: all tests pass, 0 failures.

- [ ] **Step 2: Run format and lint checks**

Run: `cd apps/api && .venv/bin/python -m black --check app tests && .venv/bin/python -m ruff check app tests`
Expected: both clean.

- [ ] **Step 3: Manual smoke test of the new endpoint**

With the local dev Postgres running and `apps/api/.env`'s `DATABASE_URL` pointed at it, start the API:

```bash
cd apps/api && .venv/bin/uvicorn app.main:app --reload
```

In another terminal, confirm the route is registered and rejects unauthenticated requests:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8000/perfis/me/avatar \
  -F "file=@/dev/null;type=image/jpeg"
```

Expected: `401` (no `Authorization` header). This confirms routing + auth wiring without needing real Supabase Storage credentials — `.env`'s `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are empty in this worktree (documented credential-loss incident; see `STATUS.md`), so a real authenticated upload can't be exercised end-to-end until the user re-provides them. Also check `http://localhost:8000/docs` and confirm `POST /perfis/me/avatar` appears with a file-upload body.

Stop the server (`Ctrl+C`) when done.

- [ ] **Step 4: Update `STATUS.md`**

`STATUS.md` at the repo root is a living doc. Before editing, confirm the three target lines below are still present verbatim (`grep -n "Falta apenas exercitar" STATUS.md`, `grep -n "falta só o endpoint de upload" STATUS.md`, `grep -n "Falta verificar um erro real" STATUS.md`); if any has already changed, skip that edit rather than forcing a mismatched replace — leave a one-line note in the commit message instead.

In the "Checklist de implementação" table, row 3 ("Supabase Storage (bucket) e Sentry configurados no backend"), replace:

```
Credenciais reais confirmadas em `apps/api/.env` e testadas por conexão real em 2026-09-22 (ver "Rodada de configuração externa" abaixo): `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` autenticam contra a API real do projeto (HTTP 200); `SENTRY_DSN` inicializa e um evento de teste foi enviado com sucesso. Falta apenas exercitar isso em um endpoint real de upload (ainda não existe — Plano 2/3).
```

with:

```
Credenciais reais confirmadas por conexão em 2026-09-22 (ver "Rodada de configuração externa" abaixo). O endpoint `POST /perfis/me/avatar` foi implementado no Plano 4 (`apps/api/app/routers/perfis.py`), com testes cobrindo autenticação, formato/tamanho de arquivo e persistência do `avatar_url` (Supabase Storage mockado nos testes). As credenciais reais (`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`) foram perdidas no incidente de perda de credenciais documentado abaixo e `apps/api/.env` está com esses campos em branco — falta reconfirmar o upload de ponta a ponta contra o Storage real quando forem refornecidas.
```

In the "Checklist de critérios de aceite" table, row "Upload de foto de perfil/logo funciona (Storage)", replace:

```
Credenciais reais confirmadas por conexão (2026-09-22); falta só o endpoint de upload em si (Plano 2/3) para exercitar de ponta a ponta.
```

with:

```
Endpoint `POST /perfis/me/avatar` implementado e testado (Plano 4). Falta a verificação de ponta a ponta contra o Storage real — `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` estão em branco em `apps/api/.env` desde o incidente de perda de credenciais.
```

In the same table, row "Erro forçado aparece no Sentry (frontend e backend)", replace:

```
`SENTRY_DSN` real confirmado — um evento de teste foi enviado com sucesso em 2026-09-22 (event_id nos logs da sessão). Falta verificar um erro real disparado por um endpoint de negócio (ainda não existem).
```

with:

```
`SENTRY_DSN` real confirmado por um evento de teste em 2026-09-22, mas foi perdido no incidente de perda de credenciais e está em branco em `apps/api/.env` hoje. Endpoints de negócio já existem (Planos 2-4) e poderiam disparar um erro real assim que o DSN for refornecido — passo manual pendente, não uma tarefa de código.
```

Do not touch any other section — in particular, leave the "Checklist de implementação" rows 4/5 and the "Por onde retomar" section alone even though they read as if Plan 2 hasn't started; that staleness predates this plan and is being raised separately, not fixed here.

- [ ] **Step 5: Commit**

```bash
git add STATUS.md
git commit -m "docs: note avatar upload endpoint and pending Sentry verification"
```
