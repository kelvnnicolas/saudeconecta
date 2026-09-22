# Auth (JWKS) and Profile Endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase Auth JWT validation (via JWKS, not the legacy shared secret) to the FastAPI backend, plus the `/auth/sync` profile-sync endpoint and the read/write endpoints for `profissionais`, `empresas`, and `especialidades` — the identity and profile layer the rest of the Plano Básico's business endpoints (search, avaliações, contatos, payment) build on.

**Architecture:** Authorization is enforced entirely in the FastAPI service layer, in Python — never via Postgres RLS. The backend connects to Postgres directly via `DATABASE_URL` (a superuser-equivalent role), bypassing Supabase's PostgREST/GoTrue layer entirely, so RLS policies on the Supabase-hosted tables would have zero effect on this backend's own queries; enabling RLS here would be pure theater. A `get_current_user` FastAPI dependency validates the `Authorization: Bearer` header against the Supabase project's JWKS endpoint (`{SUPABASE_URL}/auth/v1/.well-known/jwks.json`) using `PyJWT`'s built-in `PyJWKClient`, extracting the caller's user id from the token's `sub` claim. Every mutating endpoint requires this dependency; ownership checks (a user can only write their own `profissionais`/`empresas` row) happen by comparing `current_user.id` to the resource's `user_id`, in code.

**Tech Stack:** FastAPI, PyJWT (with the `cryptography` extra) for JWKS-based JWT verification, SQLAlchemy 2.0 (existing models from the Backend Foundation plan), Pydantic v2 for request/response schemas, pytest with a locally generated RSA test keypair (no network calls in the JWT unit tests) plus real network calls only where the plan explicitly says so.

**Spec:** `docs/superpowers/specs/2026-09-19-saudeconecta-mvp-design.md`

## Plan Sequence Note

This is a continuation of the SaúdeConecta MVP (Plano Básico), following **Plan 1 (Backend Foundation)**, which is complete and reviewed on branch `worktree-backend-foundation`. Per spec §12 sequencing, this plan covers phase 4 ("Validação de JWT do Supabase + endpoint de sync de perfil") and the `profissionais`/`empresas`/`especialidades` portion of phase 5 ("Endpoints REST: perfis, especialidades...").

**Out of scope for this plan** (future plans cover these): full-text search and filters, avaliações, contatos (+ e-mail via Resend), Supabase Storage upload wired into a real endpoint, Sentry wired into `main.py` with a live-fired error, payment link generation (Stripe), the pandas analytics report, tests-as-a-separate-concern (each task here writes its own tests, following TDD, same as Plan 1), CI workflow, and `.env.example` review. Do not implement any of those here even if it seems convenient — flag it instead and stop.

## Global Constraints

- Python 3.11+, type hints everywhere, Pydantic v2 for all request/response validation.
- Table/column names stay Portuguese snake_case (already fixed by Plan 1's models — do not rename anything). Variable/function/class names in code are English.
- `black` + `ruff` clean on everything touched (same config as Plan 1: line-length 100, `select = ["E", "F", "I", "UP"]`).
- Authorization lives in the FastAPI service layer in Python, never via Postgres RLS (see Architecture above) — do not add `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` or any RLS policy anywhere in this plan.
- Spec's authorization rule (§6): profiles/profissionais/empresas are publicly readable (search needs this); only the owning user can write their own row.
- Tests run against the real local test Postgres (port 5433, via the `docker-compose.dev.yml` containers from Plan 1) for anything touching the database — no SQLite, no mocked DB. JWT/JWKS cryptographic verification is tested with a locally generated RSA keypair (no network call to the real Supabase JWKS endpoint in unit tests) — this mirrors Plan 1's rule of "mock true external SDKs, use the real thing for our own DB."
- Do not implement search, avaliações, contatos, real Storage upload, Sentry-in-main.py, payment, analytics, CI, or `.env.example` review in this plan (see "Plan Sequence Note" above).

---

## File Structure

```
apps/api/
├── requirements.txt                         # MODIFY (Task 1) — add PyJWT[crypto]
├── app/
│   ├── main.py                              # MODIFY (Task 6) — include the 4 new routers
│   ├── core/
│   │   └── auth.py                          # NEW (Task 1) — get_current_user, JWKS validation
│   ├── models/
│   │   ├── profissional.py                  # MODIFY (Task 4) — add `profile` relationship
│   │   └── empresa.py                       # MODIFY (Task 5) — add `profile` relationship
│   ├── schemas/
│   │   ├── profile.py                       # NEW (Task 2)
│   │   ├── especialidade.py                 # NEW (Task 3)
│   │   ├── profissional.py                  # NEW (Task 4)
│   │   └── empresa.py                       # NEW (Task 5)
│   ├── services/
│   │   ├── profile_service.py               # NEW (Task 2)
│   │   ├── especialidade_service.py         # NEW (Task 3)
│   │   ├── profissional_service.py          # NEW (Task 4)
│   │   └── empresa_service.py               # NEW (Task 5)
│   └── routers/
│       ├── auth.py                          # NEW (Task 2)
│       ├── especialidades.py                # NEW (Task 3)
│       ├── profissionais.py                 # NEW (Task 4)
│       └── empresas.py                      # NEW (Task 5)
└── tests/
    ├── conftest.py                          # MODIFY (Task 2) — add `client` fixture
    ├── test_auth.py                         # NEW (Task 1)
    ├── test_auth_sync.py                    # NEW (Task 2)
    ├── test_especialidades.py               # NEW (Task 3)
    ├── test_profissionais.py                # NEW (Task 4)
    └── test_empresas.py                     # NEW (Task 5)
```

---

### Task 1: JWT/JWKS auth dependency

**Files:**
- Modify: `apps/api/requirements.txt`
- Create: `apps/api/app/core/auth.py`
- Test: `apps/api/tests/test_auth.py`

**Interfaces:**
- Consumes: `app.core.config.get_settings()` (`settings.supabase_url`).
- Produces: `app.core.auth.CurrentUser` (dataclass: `id: uuid.UUID`, `email: str | None`, `role: str | None`), `app.core.auth.get_current_user` (FastAPI dependency, raises `HTTPException(401)` on missing/invalid/expired token, otherwise returns `CurrentUser`), `app.core.auth.decode_supabase_token(token: str, jwk_client) -> dict` (the pure verification function, used directly by tests), `app.core.auth.get_jwk_client() -> jwt.PyJWKClient` (`lru_cache`d factory). Task 2 onward import `CurrentUser` and `get_current_user` to protect endpoints.

- [ ] **Step 1: Add the JWT dependency to `apps/api/requirements.txt`**

Add this line (keep the rest of the file exactly as-is, alphabetical position doesn't matter — append at the end):
```
PyJWT[crypto]==2.9.0
```

Run (from `apps/api`, venv active):
```bash
pip install -r requirements.txt
```

- [ ] **Step 2: Write the failing tests**

`apps/api/tests/test_auth.py`:
```python
import time
import uuid
from dataclasses import dataclass

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException

from app.core.auth import decode_supabase_token


@dataclass
class _FakeSigningKey:
    key: object


class _FakeJWKClient:
    def __init__(self, key):
        self._key = key

    def get_signing_key_from_jwt(self, token):
        return _FakeSigningKey(key=self._key)


def _generate_keypair():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return private_pem, public_pem


def _make_token(private_pem, **claim_overrides):
    payload = {
        "sub": str(uuid.uuid4()),
        "aud": "authenticated",
        "role": "authenticated",
        "email": "user@example.com",
        "exp": time.time() + 3600,
    }
    payload.update(claim_overrides)
    token = jwt.encode(payload, private_pem, algorithm="RS256")
    return token, payload


def test_decode_supabase_token_returns_payload_for_valid_token():
    private_pem, public_pem = _generate_keypair()
    token, payload = _make_token(private_pem)
    jwk_client = _FakeJWKClient(public_pem)

    result = decode_supabase_token(token, jwk_client)

    assert result["sub"] == payload["sub"]
    assert result["email"] == "user@example.com"


def test_decode_supabase_token_rejects_expired_token():
    private_pem, public_pem = _generate_keypair()
    token, _ = _make_token(private_pem, exp=time.time() - 10)
    jwk_client = _FakeJWKClient(public_pem)

    with pytest.raises(HTTPException) as exc_info:
        decode_supabase_token(token, jwk_client)
    assert exc_info.value.status_code == 401


def test_decode_supabase_token_rejects_wrong_audience():
    private_pem, public_pem = _generate_keypair()
    token, _ = _make_token(private_pem, aud="wrong-audience")
    jwk_client = _FakeJWKClient(public_pem)

    with pytest.raises(HTTPException) as exc_info:
        decode_supabase_token(token, jwk_client)
    assert exc_info.value.status_code == 401


def test_decode_supabase_token_rejects_bad_signature():
    private_pem_a, _ = _generate_keypair()
    _, public_pem_b = _generate_keypair()
    token, _ = _make_token(private_pem_a)
    jwk_client = _FakeJWKClient(public_pem_b)

    with pytest.raises(HTTPException) as exc_info:
        decode_supabase_token(token, jwk_client)
    assert exc_info.value.status_code == 401
```

- [ ] **Step 3: Run the tests to verify they fail**

Run (from `apps/api`, venv active): `pytest tests/test_auth.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.core.auth'`

- [ ] **Step 4: Write `apps/api/app/core/auth.py`**

```python
import uuid
from dataclasses import dataclass
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings

security = HTTPBearer(auto_error=False)


@dataclass
class CurrentUser:
    id: uuid.UUID
    email: str | None
    role: str | None


@lru_cache
def get_jwk_client() -> jwt.PyJWKClient:
    settings = get_settings()
    return jwt.PyJWKClient(f"{settings.supabase_url}/auth/v1/.well-known/jwks.json")


def decode_supabase_token(token: str, jwk_client: jwt.PyJWKClient) -> dict:
    try:
        signing_key = jwk_client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado"
        ) from exc


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> CurrentUser:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token não fornecido"
        )
    payload = decode_supabase_token(credentials.credentials, get_jwk_client())
    return CurrentUser(
        id=uuid.UUID(payload["sub"]),
        email=payload.get("email"),
        role=payload.get("role"),
    )
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pytest tests/test_auth.py -v`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add apps/api/requirements.txt apps/api/app/core/auth.py apps/api/tests/test_auth.py
git commit -m "feat(api): add JWKS-based Supabase JWT validation"
```

---

### Task 2: `POST /auth/sync` — profile sync endpoint

**Files:**
- Create: `apps/api/app/schemas/profile.py`
- Create: `apps/api/app/services/profile_service.py`
- Create: `apps/api/app/routers/auth.py`
- Modify: `apps/api/tests/conftest.py` (add the `client` fixture)
- Test: `apps/api/tests/test_auth_sync.py`

**Interfaces:**
- Consumes: `app.core.auth.CurrentUser`, `get_current_user` from Task 1; `app.core.database.get_db`, `Base`, `engine`, `SessionLocal` from the Backend Foundation plan; `app.models.profile.Profile`, `Papel`.
- Produces: `app.schemas.profile.AuthSyncRequest` (Pydantic: `papel: Papel`, `nome: str`, `telefone: str | None`, `cidade: str | None`, `estado: str | None`), `app.schemas.profile.ProfileRead` (adds `id`, `avatar_url`, `criado_em`); `app.services.profile_service.upsert_profile(db, user_id, data) -> Profile`; the `POST /auth/sync` route (`app.routers.auth.router`, mounted with prefix `/auth`). **`tests/conftest.py`'s new `client` fixture is the interface every later task's endpoint tests use** — it's a `TestClient` wired so the app's `get_db` dependency returns the same `db_session` (rolled back after the test), and any `app.dependency_overrides[get_current_user] = ...` a test sets is cleared automatically at teardown.

- [ ] **Step 1: Add the `client` fixture to `apps/api/tests/conftest.py`**

Append to the end of the file:
```python
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.main import app


@pytest.fixture
def client(db_session):
    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
```

- [ ] **Step 2: Write the failing tests**

`apps/api/tests/test_auth_sync.py`:
```python
import uuid

from app.core.auth import CurrentUser, get_current_user
from app.main import app
from app.models.profile import Profile


def test_sync_requires_authentication(client):
    response = client.post(
        "/auth/sync",
        json={"papel": "profissional", "nome": "Maria Silva"},
    )
    assert response.status_code == 401


def test_sync_creates_new_profile(client, db_session):
    user_id = uuid.uuid4()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email="maria@example.com", role="authenticated"
    )

    response = client.post(
        "/auth/sync",
        json={
            "papel": "profissional",
            "nome": "Maria Silva",
            "cidade": "São Paulo",
            "estado": "SP",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(user_id)
    assert body["nome"] == "Maria Silva"
    assert body["papel"] == "profissional"

    saved = db_session.get(Profile, user_id)
    assert saved is not None
    assert saved.cidade == "São Paulo"


def test_sync_updates_existing_profile(client, db_session):
    user_id = uuid.uuid4()
    db_session.add(Profile(id=user_id, papel="empresa", nome="Nome Antigo"))
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email="clinica@example.com", role="authenticated"
    )

    response = client.post(
        "/auth/sync",
        json={"papel": "empresa", "nome": "Nome Novo", "estado": "RJ"},
    )

    assert response.status_code == 200
    assert response.json()["nome"] == "Nome Novo"
    assert response.json()["estado"] == "RJ"
```

- [ ] **Step 3: Run the tests to verify they fail**

Run (from `apps/api`, venv active): `pytest tests/test_auth_sync.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.schemas.profile'` (or similar, since none of the new files exist yet)

- [ ] **Step 4: Write `apps/api/app/schemas/profile.py`**

```python
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.profile import Papel


class AuthSyncRequest(BaseModel):
    papel: Papel
    nome: str
    telefone: str | None = None
    cidade: str | None = None
    estado: str | None = None


class ProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    papel: Papel
    nome: str
    telefone: str | None
    cidade: str | None
    estado: str | None
    avatar_url: str | None
    criado_em: datetime
```

- [ ] **Step 5: Write `apps/api/app/services/profile_service.py`**

```python
import uuid

from sqlalchemy.orm import Session

from app.models.profile import Profile
from app.schemas.profile import AuthSyncRequest


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
```

- [ ] **Step 6: Write `apps/api/app/routers/auth.py`**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.schemas.profile import AuthSyncRequest, ProfileRead
from app.services.profile_service import upsert_profile

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/sync", response_model=ProfileRead)
def sync_profile(
    data: AuthSyncRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Profile:
    return upsert_profile(db, current_user.id, data)
```

- [ ] **Step 7: Wire the router into `apps/api/app/main.py`**

Modify `apps/api/app/main.py` — add the import and the `include_router` call:
```python
from fastapi import FastAPI

from app.core.sentry import init_sentry
from app.routers import auth, health

init_sentry()

app = FastAPI(title="SaúdeConecta API")

app.include_router(health.router)
app.include_router(auth.router)
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `pytest tests/test_auth_sync.py -v`
Expected: PASS (3 tests)

- [ ] **Step 9: Run the full suite to confirm nothing regressed**

Run: `pytest -v`
Expected: PASS — all tests from the Backend Foundation plan plus Tasks 1–2 of this plan pass together.

- [ ] **Step 10: Commit**

```bash
git add apps/api/app/schemas/profile.py apps/api/app/services/profile_service.py \
  apps/api/app/routers/auth.py apps/api/app/main.py apps/api/tests/conftest.py \
  apps/api/tests/test_auth_sync.py
git commit -m "feat(api): add POST /auth/sync profile sync endpoint"
```

---

### Task 3: `GET /especialidades`

**Files:**
- Create: `apps/api/app/schemas/especialidade.py`
- Create: `apps/api/app/services/especialidade_service.py`
- Create: `apps/api/app/routers/especialidades.py`
- Modify: `apps/api/app/main.py` (include the router)
- Test: `apps/api/tests/test_especialidades.py`

**Interfaces:**
- Consumes: `app.core.database.get_db`; `app.models.especialidade.Especialidade`; the `client` fixture from Task 2.
- Produces: `app.schemas.especialidade.EspecialidadeRead` (`id: int`, `nome: str`); `app.services.especialidade_service.list_especialidades(db) -> list[Especialidade]`; `GET /especialidades` (public, no auth). Task 4 imports `EspecialidadeRead` to nest it in the `profissional` response.

- [ ] **Step 1: Write the failing test**

`apps/api/tests/test_especialidades.py`:
```python
def test_list_especialidades_returns_the_seeded_rows(client):
    response = client.get("/especialidades")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 10
    names = {item["nome"] for item in body}
    assert "Fisioterapia" in names
    assert "Enfermagem" in names
    assert all(set(item.keys()) == {"id", "nome"} for item in body)
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `apps/api`, venv active): `pytest tests/test_especialidades.py -v`
Expected: FAIL — `404` (route doesn't exist) or `ModuleNotFoundError`, since none of the new files exist yet

- [ ] **Step 3: Write `apps/api/app/schemas/especialidade.py`**

```python
from pydantic import BaseModel, ConfigDict


class EspecialidadeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
```

- [ ] **Step 4: Write `apps/api/app/services/especialidade_service.py`**

```python
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.especialidade import Especialidade


def list_especialidades(db: Session) -> list[Especialidade]:
    return list(db.scalars(select(Especialidade).order_by(Especialidade.nome)))
```

- [ ] **Step 5: Write `apps/api/app/routers/especialidades.py`**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.especialidade import EspecialidadeRead
from app.services.especialidade_service import list_especialidades

router = APIRouter(prefix="/especialidades", tags=["especialidades"])


@router.get("", response_model=list[EspecialidadeRead])
def get_especialidades(db: Session = Depends(get_db)) -> list[EspecialidadeRead]:
    return list_especialidades(db)
```

- [ ] **Step 6: Wire the router into `apps/api/app/main.py`**

```python
from fastapi import FastAPI

from app.core.sentry import init_sentry
from app.routers import auth, especialidades, health

init_sentry()

app = FastAPI(title="SaúdeConecta API")

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(especialidades.router)
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `pytest tests/test_especialidades.py -v`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/api/app/schemas/especialidade.py apps/api/app/services/especialidade_service.py \
  apps/api/app/routers/especialidades.py apps/api/app/main.py apps/api/tests/test_especialidades.py
git commit -m "feat(api): add GET /especialidades endpoint"
```

---

### Task 4: `profissionais` endpoints (public read, own-profile write)

**Files:**
- Modify: `apps/api/app/models/profissional.py` (add `profile` relationship)
- Create: `apps/api/app/schemas/profissional.py`
- Create: `apps/api/app/services/profissional_service.py`
- Create: `apps/api/app/routers/profissionais.py`
- Modify: `apps/api/app/main.py` (include the router)
- Test: `apps/api/tests/test_profissionais.py`

**Interfaces:**
- Consumes: `app.core.auth.CurrentUser`, `get_current_user`; `app.core.database.get_db`; `app.models.profile.Profile`, `Papel`; `app.models.especialidade.Especialidade`; `app.schemas.especialidade.EspecialidadeRead` from Task 3; the `client` fixture.
- Produces: `app.schemas.profissional.ProfissionalUpdateRequest` (`registro_profissional: str | None`, `bio: str | None`, `preco_hora: float | None`, `especialidade_ids: list[int] = []`); `app.schemas.profissional.ProfissionalRead` (`user_id`, `nome`, `cidade`, `estado`, `avatar_url`, `registro_profissional`, `bio`, `preco_hora`, `verificado`, `especialidades: list[EspecialidadeRead]`); `app.services.profissional_service.get_profissional_by_id(db, user_id) -> Profissional | None`, `upsert_profissional(db, user_id, data) -> Profissional`, `to_profissional_read(profissional) -> ProfissionalRead`; routes `GET /profissionais/{user_id}` (public) and `PUT /profissionais/me` (auth required, only for callers whose `profiles.papel == profissional`).

- [ ] **Step 1: Add the `profile` relationship to `apps/api/app/models/profissional.py`**

Modify the file — add the import and the new relationship attribute (keep every existing column and the `especialidades` relationship unchanged):
```python
import uuid

from sqlalchemy import Boolean, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.especialidade import Especialidade
from app.models.profile import Profile
from app.models.profissional_especialidade import profissional_especialidades


class Profissional(Base):
    __tablename__ = "profissionais"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), primary_key=True
    )
    registro_profissional: Mapped[str | None] = mapped_column(String(100))
    bio: Mapped[str | None] = mapped_column(Text)
    preco_hora: Mapped[float | None] = mapped_column(Numeric(10, 2))
    verificado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    profile: Mapped[Profile] = relationship()
    especialidades: Mapped[list[Especialidade]] = relationship(
        secondary=profissional_especialidades
    )
```

- [ ] **Step 2: Write the failing tests**

`apps/api/tests/test_profissionais.py`:
```python
import uuid

from app.core.auth import CurrentUser, get_current_user
from app.main import app
from app.models.especialidade import Especialidade
from app.models.profile import Papel, Profile
from app.models.profissional import Profissional


def test_get_profissional_returns_404_when_not_found(client):
    response = client.get(f"/profissionais/{uuid.uuid4()}")
    assert response.status_code == 404


def test_get_profissional_returns_merged_profile_and_profissional_data(client, db_session):
    user_id = uuid.uuid4()
    profile = Profile(
        id=user_id, papel=Papel.profissional, nome="Maria Silva", cidade="São Paulo", estado="SP"
    )
    db_session.add(profile)
    db_session.flush()

    especialidade = Especialidade(nome="Acupuntura Avançada")
    db_session.add(especialidade)
    db_session.flush()

    profissional = Profissional(user_id=user_id, bio="Atendimento domiciliar", preco_hora=150)
    profissional.especialidades.append(especialidade)
    db_session.add(profissional)
    db_session.commit()

    response = client.get(f"/profissionais/{user_id}")

    assert response.status_code == 200
    body = response.json()
    assert body["nome"] == "Maria Silva"
    assert body["cidade"] == "São Paulo"
    assert body["bio"] == "Atendimento domiciliar"
    assert body["especialidades"][0]["nome"] == "Acupuntura Avançada"


def test_update_own_profissional_requires_authentication(client):
    response = client.put("/profissionais/me", json={"bio": "Nova bio"})
    assert response.status_code == 401


def test_update_own_profissional_requires_papel_profissional(client, db_session):
    user_id = uuid.uuid4()
    db_session.add(Profile(id=user_id, papel=Papel.empresa, nome="Clínica X"))
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email="x@example.com", role="authenticated"
    )

    response = client.put("/profissionais/me", json={"bio": "Nova bio"})

    assert response.status_code == 403


def test_update_own_profissional_creates_and_associates_especialidades(client, db_session):
    user_id = uuid.uuid4()
    db_session.add(Profile(id=user_id, papel=Papel.profissional, nome="João Souza"))
    especialidade = Especialidade(nome="Fonoaudiologia Infantil")
    db_session.add(especialidade)
    db_session.commit()
    especialidade_id = especialidade.id

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email="joao@example.com", role="authenticated"
    )

    response = client.put(
        "/profissionais/me",
        json={"bio": "Fonoaudiólogo", "preco_hora": 200, "especialidade_ids": [especialidade_id]},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["bio"] == "Fonoaudiólogo"
    assert body["especialidades"][0]["id"] == especialidade_id


def test_update_own_profissional_rejects_unknown_especialidade_id(client, db_session):
    user_id = uuid.uuid4()
    db_session.add(Profile(id=user_id, papel=Papel.profissional, nome="João Souza"))
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email="joao@example.com", role="authenticated"
    )

    response = client.put(
        "/profissionais/me",
        json={"bio": "Fonoaudiólogo", "especialidade_ids": [999999]},
    )

    assert response.status_code == 400
```

- [ ] **Step 3: Run the tests to verify they fail**

Run (from `apps/api`, venv active): `pytest tests/test_profissionais.py -v`
Expected: FAIL — routes don't exist yet (404s where 200/403/400 expected) and `ModuleNotFoundError` for the schema/service modules

- [ ] **Step 4: Write `apps/api/app/schemas/profissional.py`**

```python
import uuid

from pydantic import BaseModel, ConfigDict

from app.schemas.especialidade import EspecialidadeRead


class ProfissionalUpdateRequest(BaseModel):
    registro_profissional: str | None = None
    bio: str | None = None
    preco_hora: float | None = None
    especialidade_ids: list[int] = []


class ProfissionalRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    nome: str
    cidade: str | None
    estado: str | None
    avatar_url: str | None
    registro_profissional: str | None
    bio: str | None
    preco_hora: float | None
    verificado: bool
    especialidades: list[EspecialidadeRead]
```

- [ ] **Step 5: Write `apps/api/app/services/profissional_service.py`**

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


def get_profissional_by_id(db: Session, user_id: uuid.UUID) -> Profissional | None:
    return db.get(Profissional, user_id)


def to_profissional_read(profissional: Profissional) -> ProfissionalRead:
    return ProfissionalRead(
        user_id=profissional.user_id,
        nome=profissional.profile.nome,
        cidade=profissional.profile.cidade,
        estado=profissional.profile.estado,
        avatar_url=profissional.profile.avatar_url,
        registro_profissional=profissional.registro_profissional,
        bio=profissional.bio,
        preco_hora=float(profissional.preco_hora) if profissional.preco_hora is not None else None,
        verificado=profissional.verificado,
        especialidades=[EspecialidadeRead.model_validate(e) for e in profissional.especialidades],
    )


def upsert_profissional(
    db: Session, user_id: uuid.UUID, data: ProfissionalUpdateRequest
) -> Profissional:
    profile = db.get(Profile, user_id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sincronize seu perfil primeiro via POST /auth/sync",
        )
    if profile.papel != "profissional":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas usuários com papel 'profissional' podem editar este recurso",
        )

    especialidades: list[Especialidade] = []
    if data.especialidade_ids:
        especialidades = list(
            db.scalars(
                select(Especialidade).where(Especialidade.id.in_(data.especialidade_ids))
            )
        )
        found_ids = {e.id for e in especialidades}
        missing_ids = set(data.especialidade_ids) - found_ids
        if missing_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Especialidade(s) inexistente(s): {sorted(missing_ids)}",
            )

    profissional = db.get(Profissional, user_id)
    if profissional is None:
        profissional = Profissional(user_id=user_id)
        db.add(profissional)

    profissional.registro_profissional = data.registro_profissional
    profissional.bio = data.bio
    profissional.preco_hora = data.preco_hora
    profissional.especialidades = especialidades

    db.commit()
    db.refresh(profissional)
    return profissional
```

- [ ] **Step 6: Write `apps/api/app/routers/profissionais.py`**

```python
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.schemas.profissional import ProfissionalRead, ProfissionalUpdateRequest
from app.services.profissional_service import (
    get_profissional_by_id,
    to_profissional_read,
    upsert_profissional,
)

router = APIRouter(prefix="/profissionais", tags=["profissionais"])


@router.get("/{user_id}", response_model=ProfissionalRead)
def get_profissional(user_id: uuid.UUID, db: Session = Depends(get_db)) -> ProfissionalRead:
    profissional = get_profissional_by_id(db, user_id)
    if profissional is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profissional não encontrado")
    return to_profissional_read(profissional)


@router.put("/me", response_model=ProfissionalRead)
def update_own_profissional(
    data: ProfissionalUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfissionalRead:
    profissional = upsert_profissional(db, current_user.id, data)
    return to_profissional_read(profissional)
```

- [ ] **Step 7: Wire the router into `apps/api/app/main.py`**

```python
from fastapi import FastAPI

from app.core.sentry import init_sentry
from app.routers import auth, especialidades, health, profissionais

init_sentry()

app = FastAPI(title="SaúdeConecta API")

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(especialidades.router)
app.include_router(profissionais.router)
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `pytest tests/test_profissionais.py -v`
Expected: PASS (6 tests)

- [ ] **Step 9: Commit**

```bash
git add apps/api/app/models/profissional.py apps/api/app/schemas/profissional.py \
  apps/api/app/services/profissional_service.py apps/api/app/routers/profissionais.py \
  apps/api/app/main.py apps/api/tests/test_profissionais.py
git commit -m "feat(api): add profissionais read/update endpoints"
```

---

### Task 5: `empresas` endpoints (public read, own-profile write)

**Files:**
- Modify: `apps/api/app/models/empresa.py` (add `profile` relationship)
- Create: `apps/api/app/schemas/empresa.py`
- Create: `apps/api/app/services/empresa_service.py`
- Create: `apps/api/app/routers/empresas.py`
- Modify: `apps/api/app/main.py` (include the router)
- Test: `apps/api/tests/test_empresas.py`

**Interfaces:**
- Consumes: `app.core.auth.CurrentUser`, `get_current_user`; `app.core.database.get_db`; `app.models.profile.Profile`, `Papel`; `app.models.empresa.TipoEmpresa`; the `client` fixture.
- Produces: `app.schemas.empresa.EmpresaUpdateRequest` (`nome_fantasia: str`, `tipo: TipoEmpresa`, `cidade: str | None`, `estado: str | None`); `app.schemas.empresa.EmpresaRead` (`user_id`, `nome` (from Profile), `nome_fantasia`, `tipo`, `cidade`, `estado`, `avatar_url`); `app.services.empresa_service.get_empresa_by_id`, `upsert_empresa`, `to_empresa_read`; routes `GET /empresas/{user_id}` (public) and `PUT /empresas/me` (auth required, only for callers whose `profiles.papel == empresa`).

- [ ] **Step 1: Add the `profile` relationship to `apps/api/app/models/empresa.py`**

Modify the file — add the import and the new relationship attribute (keep every existing column unchanged):
```python
import enum
import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.profile import Profile


class TipoEmpresa(str, enum.Enum):
    clinica = "clinica"
    hospital = "hospital"
    homecare = "homecare"
    pessoa_fisica = "pessoa_fisica"


class Empresa(Base):
    __tablename__ = "empresas"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), primary_key=True
    )
    nome_fantasia: Mapped[str] = mapped_column(String(255), nullable=False)
    tipo: Mapped[TipoEmpresa] = mapped_column(
        SQLEnum(TipoEmpresa, name="tipo_empresa_enum"), nullable=False
    )
    cidade: Mapped[str | None] = mapped_column(String(100))
    estado: Mapped[str | None] = mapped_column(String(2))

    profile: Mapped[Profile] = relationship()
```

- [ ] **Step 2: Write the failing tests**

`apps/api/tests/test_empresas.py`:
```python
import uuid

from app.core.auth import CurrentUser, get_current_user
from app.main import app
from app.models.empresa import Empresa, TipoEmpresa
from app.models.profile import Papel, Profile


def test_get_empresa_returns_404_when_not_found(client):
    response = client.get(f"/empresas/{uuid.uuid4()}")
    assert response.status_code == 404


def test_get_empresa_returns_merged_profile_and_empresa_data(client, db_session):
    user_id = uuid.uuid4()
    db_session.add(
        Profile(id=user_id, papel=Papel.empresa, nome="Clínica Vida", cidade="Curitiba", estado="PR")
    )
    db_session.flush()
    db_session.add(
        Empresa(user_id=user_id, nome_fantasia="Clínica Vida Homecare", tipo=TipoEmpresa.clinica)
    )
    db_session.commit()

    response = client.get(f"/empresas/{user_id}")

    assert response.status_code == 200
    body = response.json()
    assert body["nome"] == "Clínica Vida"
    assert body["nome_fantasia"] == "Clínica Vida Homecare"
    assert body["cidade"] == "Curitiba"
    assert body["tipo"] == "clinica"


def test_update_own_empresa_requires_authentication(client):
    response = client.put(
        "/empresas/me", json={"nome_fantasia": "X", "tipo": "clinica"}
    )
    assert response.status_code == 401


def test_update_own_empresa_requires_papel_empresa(client, db_session):
    user_id = uuid.uuid4()
    db_session.add(Profile(id=user_id, papel=Papel.profissional, nome="Maria"))
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email="maria@example.com", role="authenticated"
    )

    response = client.put(
        "/empresas/me", json={"nome_fantasia": "X", "tipo": "clinica"}
    )

    assert response.status_code == 403


def test_update_own_empresa_creates_row(client, db_session):
    user_id = uuid.uuid4()
    db_session.add(Profile(id=user_id, papel=Papel.empresa, nome="Clínica Y"))
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email="clinicay@example.com", role="authenticated"
    )

    response = client.put(
        "/empresas/me",
        json={"nome_fantasia": "Clínica Y Ltda", "tipo": "hospital", "cidade": "Recife", "estado": "PE"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["nome_fantasia"] == "Clínica Y Ltda"
    assert body["tipo"] == "hospital"
    assert body["cidade"] == "Recife"
```

- [ ] **Step 3: Run the tests to verify they fail**

Run (from `apps/api`, venv active): `pytest tests/test_empresas.py -v`
Expected: FAIL — routes don't exist yet and `ModuleNotFoundError` for the schema/service modules

- [ ] **Step 4: Write `apps/api/app/schemas/empresa.py`**

```python
import uuid

from pydantic import BaseModel, ConfigDict

from app.models.empresa import TipoEmpresa


class EmpresaUpdateRequest(BaseModel):
    nome_fantasia: str
    tipo: TipoEmpresa
    cidade: str | None = None
    estado: str | None = None


class EmpresaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    nome: str
    avatar_url: str | None
    nome_fantasia: str
    tipo: TipoEmpresa
    cidade: str | None
    estado: str | None
```

- [ ] **Step 5: Write `apps/api/app/services/empresa_service.py`**

```python
import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.empresa import Empresa
from app.models.profile import Profile
from app.schemas.empresa import EmpresaRead, EmpresaUpdateRequest


def get_empresa_by_id(db: Session, user_id: uuid.UUID) -> Empresa | None:
    return db.get(Empresa, user_id)


def to_empresa_read(empresa: Empresa) -> EmpresaRead:
    return EmpresaRead(
        user_id=empresa.user_id,
        nome=empresa.profile.nome,
        avatar_url=empresa.profile.avatar_url,
        nome_fantasia=empresa.nome_fantasia,
        tipo=empresa.tipo,
        cidade=empresa.cidade,
        estado=empresa.estado,
    )


def upsert_empresa(db: Session, user_id: uuid.UUID, data: EmpresaUpdateRequest) -> Empresa:
    profile = db.get(Profile, user_id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sincronize seu perfil primeiro via POST /auth/sync",
        )
    if profile.papel != "empresa":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas usuários com papel 'empresa' podem editar este recurso",
        )

    empresa = db.get(Empresa, user_id)
    if empresa is None:
        empresa = Empresa(user_id=user_id, nome_fantasia=data.nome_fantasia, tipo=data.tipo)
        db.add(empresa)
    else:
        empresa.nome_fantasia = data.nome_fantasia
        empresa.tipo = data.tipo
    empresa.cidade = data.cidade
    empresa.estado = data.estado

    db.commit()
    db.refresh(empresa)
    return empresa
```

- [ ] **Step 6: Write `apps/api/app/routers/empresas.py`**

```python
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.schemas.empresa import EmpresaRead, EmpresaUpdateRequest
from app.services.empresa_service import get_empresa_by_id, to_empresa_read, upsert_empresa

router = APIRouter(prefix="/empresas", tags=["empresas"])


@router.get("/{user_id}", response_model=EmpresaRead)
def get_empresa(user_id: uuid.UUID, db: Session = Depends(get_db)) -> EmpresaRead:
    empresa = get_empresa_by_id(db, user_id)
    if empresa is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa não encontrada")
    return to_empresa_read(empresa)


@router.put("/me", response_model=EmpresaRead)
def update_own_empresa(
    data: EmpresaUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> EmpresaRead:
    empresa = upsert_empresa(db, current_user.id, data)
    return to_empresa_read(empresa)
```

- [ ] **Step 7: Wire the router into `apps/api/app/main.py`**

```python
from fastapi import FastAPI

from app.core.sentry import init_sentry
from app.routers import auth, empresas, especialidades, health, profissionais

init_sentry()

app = FastAPI(title="SaúdeConecta API")

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(especialidades.router)
app.include_router(profissionais.router)
app.include_router(empresas.router)
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `pytest tests/test_empresas.py -v`
Expected: PASS (5 tests)

- [ ] **Step 9: Commit**

```bash
git add apps/api/app/models/empresa.py apps/api/app/schemas/empresa.py \
  apps/api/app/services/empresa_service.py apps/api/app/routers/empresas.py \
  apps/api/app/main.py apps/api/tests/test_empresas.py
git commit -m "feat(api): add empresas read/update endpoints"
```

---

### Task 6: Final wiring, formatting, and manual verification

**Files:**
- Verify only (no new files): `apps/api/app/main.py`, all files from Tasks 1–5.

**Interfaces:**
- Consumes: everything produced by Tasks 1–5.
- Produces: nothing new — this task verifies the whole plan's deliverable works together end-to-end.

- [ ] **Step 1: Run the entire test suite**

Run (from `apps/api`, venv active): `pytest -v`
Expected: PASS — every test from the Backend Foundation plan plus this plan's Tasks 1–5 (should be 11 + 4 + 3 + 1 + 6 + 5 = 30 tests) passes, output pristine (no warnings beyond the 2 pre-existing third-party `DeprecationWarning`s already known from the Backend Foundation plan).

- [ ] **Step 2: Format and lint**

Run (from `apps/api`, venv active):
```bash
black app tests
ruff check app tests --fix
```
Fix anything ruff flags that `--fix` doesn't auto-resolve. Re-run `pytest -v` if any fix touched logic (not just formatting) to confirm nothing broke.

- [ ] **Step 3: Manually verify the app boots against the local dev Postgres and the new public endpoints respond**

Run:
```bash
cd apps/api
uvicorn app.main:app --port 8000 &
sleep 2
echo "=== GET /especialidades ==="
curl -s http://localhost:8000/especialidades
echo
echo "=== GET /profissionais/<random-uuid> (expect 404) ==="
curl -s -w "\nHTTP_STATUS:%{http_code}\n" http://localhost:8000/profissionais/00000000-0000-0000-0000-000000000000
echo "=== POST /auth/sync without a token (expect 401) ==="
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST http://localhost:8000/auth/sync \
  -H "Content-Type: application/json" -d '{"papel": "profissional", "nome": "Teste"}'
kill %1
```
Expected: `/especialidades` returns the 10 seeded rows as JSON; `/profissionais/<uuid>` returns HTTP 404; `/auth/sync` without a token returns HTTP 401. No server errors in the logs.

- [ ] **Step 4: Sanity-check the generated OpenAPI docs**

Run:
```bash
cd apps/api
uvicorn app.main:app --port 8000 &
sleep 2
curl -s http://localhost:8000/openapi.json | python3 -m json.tool | head -100
kill %1
```
Read through the output (or open `http://localhost:8000/docs` in a browser if working interactively) and confirm: all 6 new routes appear (`POST /auth/sync`, `GET /especialidades`, `GET /profissionais/{user_id}`, `PUT /profissionais/me`, `GET /empresas/{user_id}`, `PUT /empresas/me`), each with a named, non-generic response schema (not `Any` or an unnamed inline object), and no field is missing a type. This is the reference the frontend will use directly — if a field name looks unclear or a schema looks wrong, fix it in this task before committing further, since Tasks 1–5 are already committed and reviewed by this point.

- [ ] **Step 5: Commit (only if Step 2 or Step 4 produced changes)**

```bash
git add -A
git commit -m "chore(api): format and verify auth/profile endpoints end-to-end"
```
If nothing changed (formatting was already clean and no docs fix was needed), skip this step — there's nothing to commit.

---

## Definition of Done for this plan

- `pytest -v` run from `apps/api` (with `docker-compose.dev.yml`'s `db-test` container running) passes all tests, including every test from the Backend Foundation plan.
- `uvicorn app.main:app` boots without errors against the local dev Postgres and serves `GET /especialidades`, `GET /profissionais/{id}`, `GET /empresas/{id}` (public), and rejects unauthenticated `POST /auth/sync`, `PUT /profissionais/me`, `PUT /empresas/me` with 401.
- `black --check` and `ruff check` pass with no findings on `apps/api/app` and `apps/api/tests`.
- `GET /openapi.json` reflects all 6 new routes with named, complete schemas.
- No RLS policy was added anywhere (see Global Constraints).
- Nothing from later plans (search, avaliações, contatos, real Storage upload, Sentry-in-main.py, payment, analytics, CI, `.env.example` review) was implemented — confirm by re-reading this plan's "Plan Sequence Note".
