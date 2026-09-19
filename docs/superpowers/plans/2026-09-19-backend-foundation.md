# Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the FastAPI backend skeleton for SaúdeConecta — project scaffold, database connection, the full SQLAlchemy data model, the initial Alembic migration (with seed data), a Supabase Storage helper, and Sentry error reporting — all running locally and covered by tests against a real Postgres instance.

**Architecture:** `apps/api` is an independent Python 3.11+ package (own venv, own `requirements.txt`, no monorepo tooling). FastAPI serves the HTTP layer; SQLAlchemy 2.0 (declarative, typed `Mapped[...]` columns) models the 8 tables from the spec; Alembic owns migrations; a local Postgres 16 container (via `docker-compose.dev.yml`, dev + test databases on separate ports) backs both manual development and the automated test suite — no SQLite, no mocked DB, so `pg_trgm` and Postgres-native types are exercised for real.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, Alembic, `psycopg` (v3) driver, Pydantic v2 / `pydantic-settings`, `supabase-py` (Storage only, not Auth), `sentry-sdk`, `pytest`, `black`, `ruff`, Postgres 16 (Docker for local dev/test only — no containers for hosting the app itself).

**Spec:** `docs/superpowers/specs/2026-09-19-saudeconecta-mvp-design.md`

## Plan Sequence Note

This is **Plan 1 of several** for the SaúdeConecta MVP (Plano Básico), broken into phase-sized plans per the spec's own sequencing (spec §12). This plan covers spec phases 1–3 only:

1. Estrutura FastAPI + SQLAlchemy + Alembic
2. Conexão Postgres + primeira migration (todas as tabelas)
3. Supabase Storage (bucket) + Sentry no backend

**Out of scope for this plan** (future plans will cover these): Supabase Auth JWT validation and the `/auth/sync` endpoint, the CRUD/search/avaliações/contatos REST endpoints, the frontend, payment links, the pandas analytics report, CI, and deploy. Do not implement any of those here even if it seems convenient — flag it instead and stop.

## Global Constraints

- Python 3.11+ (this machine has 3.13 available, which satisfies the floor).
- Table and column names in the data model are Portuguese, snake_case, exactly as named in spec §6 — do not translate them.
- Variable, function, and class names in code are English; only the data-model identifiers (table/column names) and any user-facing copy are Portuguese.
- Type hints everywhere; Pydantic for validation (not used heavily yet in this plan, but `pydantic-settings` for config).
- `black` + `ruff` for backend lint/format (spec §"Convenções de código").
- Unhandled exceptions must go to Sentry, never just console/log (wired in this plan via `init_sentry()`, exercised fully once real endpoints exist in a later plan).
- No containers for hosting the app itself (spec: "Containers: Não usado nesta fase"). Docker is used here **only** to run a disposable local Postgres for development/testing — this is standard local tooling, not a hosting decision, and does not conflict with that constraint.
- Do not implement Supabase Auth JWT validation, business endpoints, payment, analytics, frontend, CI, or deploy in this plan (see "Plan Sequence Note" above).

---

## File Structure

```
saudeconecta/
├── .gitignore                                # NEW — repo-wide ignores
├── docker-compose.dev.yml                    # NEW — local Postgres for dev + test
└── apps/
    └── api/
        ├── requirements.txt                  # NEW
        ├── pyproject.toml                    # NEW — black/ruff config
        ├── alembic.ini                       # NEW (Task 4)
        ├── .env.example                      # NEW
        ├── app/
        │   ├── __init__.py                   # NEW
        │   ├── main.py                       # NEW (Task 7)
        │   ├── core/
        │   │   ├── __init__.py               # NEW
        │   │   ├── config.py                 # NEW (Task 1) — Settings via pydantic-settings
        │   │   ├── database.py               # NEW (Task 2) — engine, SessionLocal, Base
        │   │   └── sentry.py                 # NEW (Task 6) — init_sentry()
        │   ├── models/
        │   │   ├── __init__.py               # NEW (Task 3) — imports all models
        │   │   ├── profile.py                # NEW (Task 3)
        │   │   ├── especialidade.py           # NEW (Task 3)
        │   │   ├── profissional.py           # NEW (Task 3)
        │   │   ├── profissional_especialidade.py  # NEW (Task 3) — junction table
        │   │   ├── empresa.py                # NEW (Task 3)
        │   │   ├── avaliacao.py              # NEW (Task 3)
        │   │   ├── contato.py                # NEW (Task 3)
        │   │   └── link_pagamento.py         # NEW (Task 3)
        │   ├── schemas/__init__.py           # NEW (Task 7) — empty, for future plans
        │   ├── routers/
        │   │   ├── __init__.py               # NEW (Task 7)
        │   │   └── health.py                 # NEW (Task 7)
        │   ├── services/__init__.py          # NEW (Task 7) — empty, for future plans
        │   ├── storage/
        │   │   ├── __init__.py               # NEW (Task 5)
        │   │   └── supabase_storage.py       # NEW (Task 5)
        │   └── analytics/__init__.py         # NEW (Task 7) — empty, for future plans
        ├── alembic/                          # NEW (Task 4)
        │   ├── env.py
        │   ├── script.py.mako
        │   └── versions/
        │       └── <generated>_initial_schema.py
        └── tests/
            ├── __init__.py                   # NEW
            ├── conftest.py                   # NEW (Task 2, extended Tasks 3–4)
            ├── test_config.py                # NEW (Task 1)
            ├── test_database.py              # NEW (Task 2)
            ├── test_models.py                # NEW (Task 3)
            ├── test_migrations.py            # NEW (Task 4)
            ├── test_storage.py                # NEW (Task 5)
            ├── test_sentry.py                # NEW (Task 6)
            └── test_health.py                # NEW (Task 7)
```

---

### Task 1: Project scaffold + settings

**Files:**
- Create: `.gitignore` (repo root)
- Create: `apps/api/requirements.txt`
- Create: `apps/api/pyproject.toml`
- Create: `apps/api/.env.example`
- Create: `apps/api/app/__init__.py`
- Create: `apps/api/app/core/__init__.py`
- Create: `apps/api/app/core/config.py`
- Create: `apps/api/tests/__init__.py`
- Test: `apps/api/tests/test_config.py`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `app.core.config.get_settings() -> Settings` (an `lru_cache`d factory). `Settings` fields: `database_url: str` (required), `supabase_url: str = ""`, `supabase_service_role_key: str = ""`, `supabase_jwt_secret: str = ""`, `supabase_storage_bucket: str = "avatars"`, `stripe_secret_key: str = ""`, `resend_api_key: str = ""`, `sentry_dsn: str = ""`. Later tasks/plans call `get_settings()` and `get_settings.cache_clear()` (it's an `lru_cache`-wrapped function).

- [ ] **Step 1: Create the repo-wide `.gitignore`**

```
.DS_Store
__pycache__/
*.pyc
.venv/
venv/
apps/api/.env
apps/web/.env
apps/web/.env.local
apps/web/node_modules/
apps/web/.next/
.pytest_cache/
*.egg-info/
```

- [ ] **Step 2: Create the folder skeleton and empty package markers**

Run:
```bash
mkdir -p apps/api/app/core apps/api/tests
touch apps/api/app/__init__.py apps/api/app/core/__init__.py apps/api/tests/__init__.py
```

- [ ] **Step 3: Write `apps/api/requirements.txt`**

```
fastapi==0.115.0
uvicorn[standard]==0.32.0
sqlalchemy==2.0.35
alembic==1.13.3
psycopg[binary]==3.2.3
pydantic==2.9.2
pydantic-settings==2.5.2
supabase==2.9.0
sentry-sdk[fastapi]==2.16.0
python-multipart==0.0.12
httpx==0.27.2
pytest==8.3.3
ruff==0.6.9
black==24.10.0
```

If `pip install` fails to resolve an exact pin above (package removed from PyPI, etc.), use the latest available patch release within the same minor version and note the change in the commit message.

- [ ] **Step 4: Write `apps/api/pyproject.toml`**

```toml
[tool.black]
line-length = 100
target-version = ["py311"]

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "UP"]
```

- [ ] **Step 5: Write `apps/api/.env.example`**

```
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/saudeconecta
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
SUPABASE_STORAGE_BUCKET=avatars
STRIPE_SECRET_KEY=
RESEND_API_KEY=
SENTRY_DSN=
```

- [ ] **Step 6: Create the venv and install dependencies**

Run:
```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

Keep this venv activated for all remaining steps/tasks in this plan.

- [ ] **Step 7: Write the failing test**

`apps/api/tests/test_config.py`:
```python
from app.core.config import get_settings


def test_settings_reads_database_url_from_env(monkeypatch):
    monkeypatch.setenv(
        "DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/example_db"
    )
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.database_url == "postgresql+psycopg://postgres:postgres@localhost:5432/example_db"
    get_settings.cache_clear()


def test_settings_defaults_storage_bucket_to_avatars(monkeypatch):
    monkeypatch.setenv(
        "DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/example_db"
    )
    monkeypatch.delenv("SUPABASE_STORAGE_BUCKET", raising=False)
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.supabase_storage_bucket == "avatars"
    get_settings.cache_clear()
```

- [ ] **Step 8: Run the test to verify it fails**

Run (from `apps/api`, venv active): `pytest tests/test_config.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.core.config'`

- [ ] **Step 9: Write `apps/api/app/core/config.py`**

```python
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    supabase_storage_bucket: str = "avatars"
    stripe_secret_key: str = ""
    resend_api_key: str = ""
    sentry_dsn: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

- [ ] **Step 10: Run the test to verify it passes**

Run: `pytest tests/test_config.py -v`
Expected: PASS (2 tests)

- [ ] **Step 11: Commit**

```bash
cd /Users/kelvs/Desktop/projects/saudeconecta
git add .gitignore apps/api/requirements.txt apps/api/pyproject.toml apps/api/.env.example \
  apps/api/app/__init__.py apps/api/app/core/__init__.py apps/api/app/core/config.py \
  apps/api/tests/__init__.py apps/api/tests/test_config.py
git commit -m "feat(api): scaffold FastAPI project and settings"
```

---

### Task 2: Database connection + local Postgres for dev/test

**Files:**
- Create: `docker-compose.dev.yml` (repo root)
- Create: `apps/api/tests/conftest.py`
- Create: `apps/api/app/core/database.py`
- Test: `apps/api/tests/test_database.py`

**Interfaces:**
- Consumes: `app.core.config.get_settings()` from Task 1.
- Produces: `app.core.database.engine` (SQLAlchemy `Engine`), `app.core.database.SessionLocal` (sessionmaker), `app.core.database.Base` (the `DeclarativeBase` every model in Task 3 inherits from), `app.core.database.get_db()` (FastAPI dependency generator, used starting in a later plan). `tests/conftest.py` sets `DATABASE_URL` in `os.environ` (via `setdefault`, so a real env var always wins) before any app module is imported — later tasks extend this same file, do not create a second conftest.

- [ ] **Step 1: Write `docker-compose.dev.yml`**

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: saudeconecta
    ports:
      - "5432:5432"
    volumes:
      - saudeconecta_db_data:/var/lib/postgresql/data

  db-test:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: saudeconecta_test
    ports:
      - "5433:5432"

volumes:
  saudeconecta_db_data:
```

- [ ] **Step 2: Start the containers and wait for them to be ready**

Run:
```bash
docker compose -f docker-compose.dev.yml up -d
```

Poll until both are accepting connections (they take a few seconds on first boot):
```bash
until docker exec $(docker compose -f docker-compose.dev.yml ps -q db) pg_isready -U postgres; do sleep 1; done
until docker exec $(docker compose -f docker-compose.dev.yml ps -q db-test) pg_isready -U postgres; do sleep 1; done
```

- [ ] **Step 3: Write `apps/api/tests/conftest.py`**

```python
import os

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5433/saudeconecta_test",
)
```

- [ ] **Step 4: Write the failing test**

`apps/api/tests/test_database.py`:
```python
from sqlalchemy import text

from app.core.database import engine


def test_engine_connects_to_postgres():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        assert result.scalar() == 1
```

- [ ] **Step 5: Run the test to verify it fails**

Run (from `apps/api`, venv active): `pytest tests/test_database.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.core.database'`

- [ ] **Step 6: Write `apps/api/app/core/database.py`**

```python
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `pytest tests/test_database.py -v`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add docker-compose.dev.yml apps/api/tests/conftest.py apps/api/tests/test_database.py \
  apps/api/app/core/database.py
git commit -m "feat(api): add database engine and local dev/test Postgres via Docker"
```

---

### Task 3: SQLAlchemy models for all 8 tables

**Files:**
- Create: `apps/api/app/models/profile.py`
- Create: `apps/api/app/models/especialidade.py`
- Create: `apps/api/app/models/profissional.py`
- Create: `apps/api/app/models/profissional_especialidade.py`
- Create: `apps/api/app/models/empresa.py`
- Create: `apps/api/app/models/avaliacao.py`
- Create: `apps/api/app/models/contato.py`
- Create: `apps/api/app/models/link_pagamento.py`
- Create: `apps/api/app/models/__init__.py`
- Modify: `apps/api/tests/conftest.py` (append schema fixtures)
- Test: `apps/api/tests/test_models.py`

**Interfaces:**
- Consumes: `app.core.database.Base`, `engine`, `SessionLocal` from Task 2.
- Produces: ORM classes `Profile` (fields: `id: uuid.UUID` PK, `papel: Papel`, `nome: str`, `telefone: str | None`, `cidade: str | None`, `estado: str | None`, `latitude: float | None`, `longitude: float | None`, `avatar_url: str | None`, `criado_em: datetime`), enum `Papel` (`profissional`, `empresa`); `Especialidade` (`id: int` PK, `nome: str` unique); `Profissional` (`user_id: uuid.UUID` PK/FK→`profiles.id`, `registro_profissional: str | None`, `bio: str | None`, `preco_hora: float | None` (`Numeric`), `verificado: bool`, `especialidades: list[Especialidade]` relationship); `profissional_especialidades` (junction `Table`, columns `profissional_id`, `especialidade_id`); `Empresa` (`user_id: uuid.UUID` PK/FK→`profiles.id`, `nome_fantasia: str`, `tipo: TipoEmpresa`, `cidade: str | None`, `estado: str | None`), enum `TipoEmpresa` (`clinica`, `hospital`, `homecare`, `pessoa_fisica`); `Avaliacao` (`id: int` PK, `autor_id`, `alvo_id: uuid.UUID` FK→`profiles.id`, `nota: int`, `comentario: str | None`, `criado_em: datetime`); `Contato` (`id: int` PK, `solicitante_id: uuid.UUID` FK→`profiles.id`, `profissional_id: uuid.UUID` FK→`profissionais.user_id`, `mensagem: str`, `status: StatusContato`, `criado_em: datetime`), enum `StatusContato` (`pendente`, `respondido`, `encerrado`); `LinkPagamento` (`id: int` PK, `contato_id: int` FK→`contatos.id`, `valor: float` (`Numeric`), `status: StatusPagamento`, `url_checkout: str`, `criado_em: datetime`), enum `StatusPagamento` (`pendente`, `pago`, `cancelado`). `tests/conftest.py` now also provides an autouse session fixture that creates/drops all tables, and a `db_session` fixture (a `Session` bound to a per-test transaction that's rolled back after the test) — later tasks in this plan and all future plans use `db_session` for DB-touching tests.

- [ ] **Step 1: Write `apps/api/app/models/profile.py`**

```python
import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class Papel(str, enum.Enum):
    profissional = "profissional"
    empresa = "empresa"


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    papel: Mapped[Papel] = mapped_column(SQLEnum(Papel, name="papel_enum"), nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    telefone: Mapped[str | None] = mapped_column(String(20))
    cidade: Mapped[str | None] = mapped_column(String(100))
    estado: Mapped[str | None] = mapped_column(String(2))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
```

- [ ] **Step 2: Write `apps/api/app/models/especialidade.py`**

```python
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Especialidade(Base):
    __tablename__ = "especialidades"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
```

- [ ] **Step 3: Write `apps/api/app/models/profissional_especialidade.py`**

```python
from sqlalchemy import Column, ForeignKey, Table

from app.core.database import Base

profissional_especialidades = Table(
    "profissional_especialidades",
    Base.metadata,
    Column("profissional_id", ForeignKey("profissionais.user_id"), primary_key=True),
    Column("especialidade_id", ForeignKey("especialidades.id"), primary_key=True),
)
```

- [ ] **Step 4: Write `apps/api/app/models/profissional.py`**

```python
import uuid

from sqlalchemy import Boolean, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.especialidade import Especialidade
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

    especialidades: Mapped[list[Especialidade]] = relationship(
        secondary=profissional_especialidades
    )
```

- [ ] **Step 5: Write `apps/api/app/models/empresa.py`**

```python
import enum
import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


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
```

- [ ] **Step 6: Write `apps/api/app/models/avaliacao.py`**

```python
import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class Avaliacao(Base):
    __tablename__ = "avaliacoes"
    __table_args__ = (CheckConstraint("nota >= 1 AND nota <= 5", name="ck_avaliacoes_nota_range"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    autor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    alvo_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    nota: Mapped[int] = mapped_column(Integer, nullable=False)
    comentario: Mapped[str | None] = mapped_column(Text)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
```

- [ ] **Step 7: Write `apps/api/app/models/contato.py`**

```python
import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class StatusContato(str, enum.Enum):
    pendente = "pendente"
    respondido = "respondido"
    encerrado = "encerrado"


class Contato(Base):
    __tablename__ = "contatos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    solicitante_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    profissional_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profissionais.user_id"), nullable=False
    )
    mensagem: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[StatusContato] = mapped_column(
        SQLEnum(StatusContato, name="status_contato_enum"),
        nullable=False,
        default=StatusContato.pendente,
    )
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
```

- [ ] **Step 8: Write `apps/api/app/models/link_pagamento.py`**

```python
import enum
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class StatusPagamento(str, enum.Enum):
    pendente = "pendente"
    pago = "pago"
    cancelado = "cancelado"


class LinkPagamento(Base):
    __tablename__ = "links_pagamento"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    contato_id: Mapped[int] = mapped_column(Integer, ForeignKey("contatos.id"), nullable=False)
    valor: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[StatusPagamento] = mapped_column(
        SQLEnum(StatusPagamento, name="status_pagamento_enum"),
        nullable=False,
        default=StatusPagamento.pendente,
    )
    url_checkout: Mapped[str] = mapped_column(String(500), nullable=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
```

- [ ] **Step 9: Write `apps/api/app/models/__init__.py`**

```python
from app.models.avaliacao import Avaliacao
from app.models.contato import Contato, StatusContato
from app.models.empresa import Empresa, TipoEmpresa
from app.models.especialidade import Especialidade
from app.models.link_pagamento import LinkPagamento, StatusPagamento
from app.models.profile import Papel, Profile
from app.models.profissional import Profissional
from app.models.profissional_especialidade import profissional_especialidades

__all__ = [
    "Avaliacao",
    "Contato",
    "StatusContato",
    "Empresa",
    "TipoEmpresa",
    "Especialidade",
    "LinkPagamento",
    "StatusPagamento",
    "Papel",
    "Profile",
    "Profissional",
    "profissional_especialidades",
]
```

- [ ] **Step 10: Append schema fixtures to `apps/api/tests/conftest.py`**

Add below the existing `os.environ.setdefault(...)` line:
```python
import pytest

from app.core.database import Base, SessionLocal, engine


@pytest.fixture(scope="session", autouse=True)
def _create_test_schema():
    import app.models  # noqa: F401  ensure all models are registered on Base.metadata

    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = SessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()
```

- [ ] **Step 11: Write the failing test**

`apps/api/tests/test_models.py`:
```python
import uuid

from app.models import Empresa, Especialidade, Papel, Profile, Profissional, TipoEmpresa


def test_create_profissional_with_especialidade(db_session):
    profile = Profile(
        id=uuid.uuid4(), papel=Papel.profissional, nome="Maria Silva", cidade="São Paulo", estado="SP"
    )
    db_session.add(profile)
    db_session.flush()

    especialidade = Especialidade(nome="Acupuntura")
    db_session.add(especialidade)
    db_session.flush()

    profissional = Profissional(user_id=profile.id, bio="Fisioterapeuta domiciliar", preco_hora=120.00)
    profissional.especialidades.append(especialidade)
    db_session.add(profissional)
    db_session.commit()

    saved = db_session.get(Profissional, profile.id)
    assert saved.bio == "Fisioterapeuta domiciliar"
    assert saved.especialidades[0].nome == "Acupuntura"


def test_create_empresa(db_session):
    profile = Profile(id=uuid.uuid4(), papel=Papel.empresa, nome="Clínica Vida")
    db_session.add(profile)
    db_session.flush()

    empresa = Empresa(
        user_id=profile.id, nome_fantasia="Clínica Vida", tipo=TipoEmpresa.clinica, cidade="Curitiba", estado="PR"
    )
    db_session.add(empresa)
    db_session.commit()

    saved = db_session.get(Empresa, profile.id)
    assert saved.tipo == TipoEmpresa.clinica
    assert saved.nome_fantasia == "Clínica Vida"
```

- [ ] **Step 12: Run the test to verify it fails**

Run (from `apps/api`, venv active): `pytest tests/test_models.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.models'`

- [ ] **Step 13: Run the test to verify it passes**

(The model files were already written in Steps 1–9 above.)
Run: `pytest tests/test_models.py -v`
Expected: PASS (2 tests)

- [ ] **Step 14: Commit**

```bash
git add apps/api/app/models apps/api/tests/conftest.py apps/api/tests/test_models.py
git commit -m "feat(api): add SQLAlchemy models for all 8 tables"
```

---

### Task 4: Alembic setup + initial migration (schema, pg_trgm, seed data)

**Files:**
- Create: `apps/api/alembic.ini`
- Create: `apps/api/alembic/env.py`
- Create: `apps/api/alembic/script.py.mako` (generated by `alembic init`, leave as default)
- Create: `apps/api/alembic/versions/<generated>_initial_schema.py`
- Modify: `apps/api/tests/conftest.py` (swap `_create_test_schema` to run real Alembic migrations)
- Test: `apps/api/tests/test_migrations.py`

**Interfaces:**
- Consumes: `app.core.database.Base`, `engine` from Task 2; `app.models` from Task 3.
- Produces: a runnable Alembic setup (`alembic upgrade head` / `alembic downgrade base` from `apps/api/`) that creates/drops all 8 tables plus 4 Postgres enum types plus 2 `pg_trgm` GIN indexes (`ix_profiles_nome_trgm`, `ix_especialidades_nome_trgm`) plus seeds 10 rows into `especialidades`. From this task onward, `tests/conftest.py`'s `_create_test_schema` fixture manages schema via Alembic (not `Base.metadata.create_all`), so every subsequent test in this and future plans runs against a migration-created schema — the closest match to production.

- [ ] **Step 1: Write the failing test**

`apps/api/tests/test_migrations.py`:
```python
import sqlalchemy as sa
from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from app.core.database import engine

EXPECTED_TABLES = {
    "profiles",
    "especialidades",
    "profissionais",
    "profissional_especialidades",
    "empresas",
    "avaliacoes",
    "contatos",
    "links_pagamento",
}


def test_migration_creates_all_tables_and_seeds_especialidades():
    inspector = inspect(engine)
    assert EXPECTED_TABLES.issubset(set(inspector.get_table_names()))

    with engine.connect() as conn:
        count = conn.execute(sa.text("SELECT COUNT(*) FROM especialidades")).scalar()
    assert count == 10


def test_migration_downgrade_and_upgrade_round_trip():
    cfg = Config("alembic.ini")

    command.downgrade(cfg, "base")
    inspector = inspect(engine)
    assert "profiles" not in inspector.get_table_names()

    command.upgrade(cfg, "head")
    inspector = inspect(engine)
    assert EXPECTED_TABLES.issubset(set(inspector.get_table_names()))
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `apps/api`, venv active): `pytest tests/test_migrations.py -v`
Expected: FAIL — `test_migration_downgrade_and_upgrade_round_trip` fails with `FileNotFoundError`/`No such file` because `alembic.ini` doesn't exist yet. (`test_migration_creates_all_tables_and_seeds_especialidades`'s table-existence assertion may pass trivially at this point since Task 3's `_create_test_schema` fixture still creates tables via `Base.metadata.create_all` — but its seed-count assertion (`count == 10`) fails, since `create_all` doesn't insert seed data. Either way this test file does not fully pass yet.)

- [ ] **Step 3: Initialize Alembic**

Run (from `apps/api`, venv active):
```bash
alembic init alembic
```

This creates `alembic.ini`, `alembic/env.py`, `alembic/script.py.mako`, `alembic/versions/`.

- [ ] **Step 4: Replace `apps/api/alembic/env.py` with:**

```python
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import get_settings
from app.core.database import Base

import app.models  # noqa: F401  ensures all models are registered on Base.metadata

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.database_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 5: Generate an empty revision**

Run (from `apps/api`):
```bash
alembic revision -m "initial_schema"
```

This creates `apps/api/alembic/versions/<some_hash>_initial_schema.py` with a random `revision` id and `down_revision = None`. Keep the generated `revision` value and the file name exactly as generated — only replace the body of `upgrade()` and `downgrade()` as below.

- [ ] **Step 6: Fill in the migration's `upgrade()` and `downgrade()`**

Open the generated file and replace its imports and function bodies with:

```python
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# keep the existing revision / down_revision / branch_labels / depends_on lines as generated


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    papel_enum = postgresql.ENUM("profissional", "empresa", name="papel_enum")
    tipo_empresa_enum = postgresql.ENUM(
        "clinica", "hospital", "homecare", "pessoa_fisica", name="tipo_empresa_enum"
    )
    status_contato_enum = postgresql.ENUM(
        "pendente", "respondido", "encerrado", name="status_contato_enum"
    )
    status_pagamento_enum = postgresql.ENUM(
        "pendente", "pago", "cancelado", name="status_pagamento_enum"
    )

    bind = op.get_bind()
    papel_enum.create(bind, checkfirst=True)
    tipo_empresa_enum.create(bind, checkfirst=True)
    status_contato_enum.create(bind, checkfirst=True)
    status_pagamento_enum.create(bind, checkfirst=True)

    op.create_table(
        "profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("papel", papel_enum, nullable=False),
        sa.Column("nome", sa.String(255), nullable=False),
        sa.Column("telefone", sa.String(20)),
        sa.Column("cidade", sa.String(100)),
        sa.Column("estado", sa.String(2)),
        sa.Column("latitude", sa.Float()),
        sa.Column("longitude", sa.Float()),
        sa.Column("avatar_url", sa.String(500)),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.execute("CREATE INDEX ix_profiles_nome_trgm ON profiles USING gin (nome gin_trgm_ops)")

    op.create_table(
        "especialidades",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("nome", sa.String(100), nullable=False, unique=True),
    )
    op.execute("CREATE INDEX ix_especialidades_nome_trgm ON especialidades USING gin (nome gin_trgm_ops)")

    op.create_table(
        "profissionais",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("profiles.id"), primary_key=True),
        sa.Column("registro_profissional", sa.String(100)),
        sa.Column("bio", sa.Text()),
        sa.Column("preco_hora", sa.Numeric(10, 2)),
        sa.Column("verificado", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    op.create_table(
        "profissional_especialidades",
        sa.Column(
            "profissional_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("profissionais.user_id"),
            primary_key=True,
        ),
        sa.Column(
            "especialidade_id", sa.Integer(), sa.ForeignKey("especialidades.id"), primary_key=True
        ),
    )

    op.create_table(
        "empresas",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("profiles.id"), primary_key=True),
        sa.Column("nome_fantasia", sa.String(255), nullable=False),
        sa.Column("tipo", tipo_empresa_enum, nullable=False),
        sa.Column("cidade", sa.String(100)),
        sa.Column("estado", sa.String(2)),
    )

    op.create_table(
        "avaliacoes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("autor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("profiles.id"), nullable=False),
        sa.Column("alvo_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("profiles.id"), nullable=False),
        sa.Column("nota", sa.Integer(), nullable=False),
        sa.Column("comentario", sa.Text()),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("nota >= 1 AND nota <= 5", name="ck_avaliacoes_nota_range"),
    )

    op.create_table(
        "contatos",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("solicitante_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("profiles.id"), nullable=False),
        sa.Column(
            "profissional_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("profissionais.user_id"),
            nullable=False,
        ),
        sa.Column("mensagem", sa.Text(), nullable=False),
        sa.Column("status", status_contato_enum, nullable=False, server_default="pendente"),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "links_pagamento",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("contato_id", sa.Integer(), sa.ForeignKey("contatos.id"), nullable=False),
        sa.Column("valor", sa.Numeric(10, 2), nullable=False),
        sa.Column("status", status_pagamento_enum, nullable=False, server_default="pendente"),
        sa.Column("url_checkout", sa.String(500), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    especialidades_table = sa.table("especialidades", sa.column("nome", sa.String))
    op.bulk_insert(
        especialidades_table,
        [
            {"nome": nome}
            for nome in [
                "Enfermagem",
                "Técnico de Enfermagem",
                "Medicina (Clínico Geral)",
                "Fisioterapia",
                "Fonoaudiologia",
                "Nutrição",
                "Psicologia",
                "Cuidador de Idosos",
                "Cuidador Infantil",
                "Terapia Ocupacional",
            ]
        ],
    )


def downgrade() -> None:
    op.drop_table("links_pagamento")
    op.drop_table("contatos")
    op.drop_table("avaliacoes")
    op.drop_table("empresas")
    op.drop_table("profissional_especialidades")
    op.drop_table("profissionais")
    op.execute("DROP INDEX IF EXISTS ix_especialidades_nome_trgm")
    op.drop_table("especialidades")
    op.execute("DROP INDEX IF EXISTS ix_profiles_nome_trgm")
    op.drop_table("profiles")

    postgresql.ENUM(name="status_pagamento_enum").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="status_contato_enum").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="tipo_empresa_enum").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="papel_enum").drop(op.get_bind(), checkfirst=True)
```

- [ ] **Step 7: Replace the `_create_test_schema` fixture in `apps/api/tests/conftest.py`**

Replace the fixture written in Task 3 Step 10:
```python
@pytest.fixture(scope="session", autouse=True)
def _create_test_schema():
    import app.models  # noqa: F401  ensure all models are registered on Base.metadata

    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
```

with:
```python
from alembic import command
from alembic.config import Config


def _alembic_config() -> Config:
    return Config("alembic.ini")


@pytest.fixture(scope="session", autouse=True)
def _create_test_schema():
    cfg = _alembic_config()
    command.upgrade(cfg, "head")
    yield
    command.downgrade(cfg, "base")
```

Keep the `db_session` fixture from Task 3 unchanged. Delete the now-unused `Base` from the `from app.core.database import Base, SessionLocal, engine` import line (rewrite it as `from app.core.database import SessionLocal, engine`) — nothing in `conftest.py` references `Base` anymore.

- [ ] **Step 8: Run the test to verify it now passes**

Run (from `apps/api`, venv active): `pytest tests/test_migrations.py -v`
Expected: PASS (2 tests) — table existence, seed count, and the downgrade/upgrade round trip.

- [ ] **Step 9: Run the full test suite to confirm nothing regressed**

Run: `pytest -v`
Expected: PASS — all tests from Tasks 1–4 (config, database, models, migrations) pass together against the Alembic-managed schema.

- [ ] **Step 10: Commit**

```bash
git add apps/api/alembic.ini apps/api/alembic apps/api/tests/conftest.py apps/api/tests/test_migrations.py
git commit -m "feat(api): add Alembic initial migration with pg_trgm and seed especialidades"
```

---

### Task 5: Supabase Storage helper

**Files:**
- Create: `apps/api/app/storage/__init__.py`
- Create: `apps/api/app/storage/supabase_storage.py`
- Test: `apps/api/tests/test_storage.py`

**Interfaces:**
- Consumes: `app.core.config.get_settings()` from Task 1.
- Produces: `app.storage.supabase_storage.get_supabase_client() -> Client` (`lru_cache`d), `app.storage.supabase_storage.upload_avatar(file_path_in_bucket: str, file_bytes: bytes, content_type: str) -> str` (returns the public URL). A later plan's upload endpoint calls `upload_avatar`.

- [ ] **Step 1: Write the failing test**

`apps/api/tests/test_storage.py`:
```python
from unittest.mock import MagicMock, patch

from app.storage.supabase_storage import upload_avatar


@patch("app.storage.supabase_storage.get_supabase_client")
def test_upload_avatar_returns_public_url(mock_get_client):
    mock_bucket = MagicMock()
    mock_bucket.get_public_url.return_value = (
        "https://example.supabase.co/storage/v1/object/public/avatars/user123.jpg"
    )
    mock_client = MagicMock()
    mock_client.storage.from_.return_value = mock_bucket
    mock_get_client.return_value = mock_client

    url = upload_avatar("user123.jpg", b"fake-image-bytes", "image/jpeg")

    mock_bucket.upload.assert_called_once_with(
        "user123.jpg", b"fake-image-bytes", {"content-type": "image/jpeg", "upsert": "true"}
    )
    assert url == "https://example.supabase.co/storage/v1/object/public/avatars/user123.jpg"
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `apps/api`, venv active): `pytest tests/test_storage.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.storage'`

- [ ] **Step 3: Write `apps/api/app/storage/supabase_storage.py`**

```python
from functools import lru_cache

from supabase import Client, create_client

from app.core.config import get_settings


@lru_cache
def get_supabase_client() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def upload_avatar(file_path_in_bucket: str, file_bytes: bytes, content_type: str) -> str:
    settings = get_settings()
    client = get_supabase_client()
    bucket = client.storage.from_(settings.supabase_storage_bucket)
    bucket.upload(file_path_in_bucket, file_bytes, {"content-type": content_type, "upsert": "true"})
    return bucket.get_public_url(file_path_in_bucket)
```

Also create `apps/api/app/storage/__init__.py` (empty).

- [ ] **Step 4: Run the test to verify it passes**

Run: `pytest tests/test_storage.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/storage apps/api/tests/test_storage.py
git commit -m "feat(api): add Supabase Storage upload helper"
```

---

### Task 6: Sentry initialization

**Files:**
- Create: `apps/api/app/core/sentry.py`
- Test: `apps/api/tests/test_sentry.py`

**Interfaces:**
- Consumes: `app.core.config.get_settings()` from Task 1.
- Produces: `app.core.sentry.init_sentry() -> None` — no-ops when `settings.sentry_dsn` is empty, otherwise calls `sentry_sdk.init(dsn=..., integrations=[FastApiIntegration()], traces_sample_rate=0.1)`. Task 7's `main.py` calls this once at import time.

- [ ] **Step 1: Write the failing test**

`apps/api/tests/test_sentry.py`:
```python
from unittest.mock import patch

from app.core.config import get_settings
from app.core.sentry import init_sentry


def test_init_sentry_skips_when_dsn_empty(monkeypatch):
    monkeypatch.setenv(
        "DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5433/saudeconecta_test"
    )
    monkeypatch.setenv("SENTRY_DSN", "")
    get_settings.cache_clear()
    with patch("app.core.sentry.sentry_sdk.init") as mock_init:
        init_sentry()
        mock_init.assert_not_called()
    get_settings.cache_clear()


def test_init_sentry_initializes_when_dsn_present(monkeypatch):
    monkeypatch.setenv(
        "DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5433/saudeconecta_test"
    )
    monkeypatch.setenv("SENTRY_DSN", "https://public@sentry.example.com/1")
    get_settings.cache_clear()
    with patch("app.core.sentry.sentry_sdk.init") as mock_init:
        init_sentry()
        mock_init.assert_called_once()
        _, kwargs = mock_init.call_args
        assert kwargs["dsn"] == "https://public@sentry.example.com/1"
    get_settings.cache_clear()
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `apps/api`, venv active): `pytest tests/test_sentry.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.core.sentry'`

- [ ] **Step 3: Write `apps/api/app/core/sentry.py`**

```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

from app.core.config import get_settings


def init_sentry() -> None:
    settings = get_settings()
    if not settings.sentry_dsn:
        return
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        integrations=[FastApiIntegration()],
        traces_sample_rate=0.1,
    )
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pytest tests/test_sentry.py -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/core/sentry.py apps/api/tests/test_sentry.py
git commit -m "feat(api): add Sentry initialization"
```

---

### Task 7: Wire up `main.py` and a health check endpoint

**Files:**
- Create: `apps/api/app/routers/__init__.py`
- Create: `apps/api/app/routers/health.py`
- Create: `apps/api/app/schemas/__init__.py` (empty, for future plans)
- Create: `apps/api/app/services/__init__.py` (empty, for future plans)
- Create: `apps/api/app/analytics/__init__.py` (empty, for future plans)
- Create: `apps/api/app/main.py`
- Test: `apps/api/tests/test_health.py`

**Interfaces:**
- Consumes: `app.core.sentry.init_sentry()` from Task 6, `app.routers.health.router` (own).
- Produces: `app.main.app` (the FastAPI instance) — this is what `uvicorn app.main:app` serves, and what a future plan's `TestClient(app)` for real business endpoints will import.

- [ ] **Step 1: Write the failing test**

`apps/api/tests/test_health.py`:
```python
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `apps/api`, venv active): `pytest tests/test_health.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.main'`

- [ ] **Step 3: Write `apps/api/app/routers/health.py`**

```python
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
```

Also create `apps/api/app/routers/__init__.py`, `apps/api/app/schemas/__init__.py`, `apps/api/app/services/__init__.py`, `apps/api/app/analytics/__init__.py` — all empty, they're package markers for routers/schemas/services/analytics code that future plans will add.

- [ ] **Step 4: Write `apps/api/app/main.py`**

```python
from fastapi import FastAPI

from app.core.sentry import init_sentry
from app.routers import health

init_sentry()

app = FastAPI(title="SaúdeConecta API")

app.include_router(health.router)
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pytest tests/test_health.py -v`
Expected: PASS

- [ ] **Step 6: Run the entire test suite one more time**

Run: `pytest -v`
Expected: PASS — every test from Tasks 1–7 passes (config, database, models, migrations, storage, sentry, health).

- [ ] **Step 7: Manually verify the app boots and serves real HTTP**

Run:
```bash
cd apps/api
cp .env.example .env
# edit .env: set DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/saudeconecta (the dev DB, port 5432, not 5433)
uvicorn app.main:app --port 8000 &
sleep 2
curl -s http://localhost:8000/health
kill %1
```
Expected: `curl` prints `{"status":"ok"}` and the server logs show no startup errors.

- [ ] **Step 8: Format and lint**

Run (from `apps/api`, venv active):
```bash
black app tests
ruff check app tests --fix
```
Fix anything ruff flags that `--fix` doesn't auto-resolve.

- [ ] **Step 9: Commit**

```bash
git add apps/api/app/routers apps/api/app/schemas apps/api/app/services apps/api/app/analytics \
  apps/api/app/main.py apps/api/tests/test_health.py
git commit -m "feat(api): wire up FastAPI app with health check endpoint"
```

---

## Definition of Done for this plan

- `pytest -v` run from `apps/api` (with `docker-compose.dev.yml`'s `db-test` container running) passes all tests across config, database, models, migrations, storage, sentry, and health.
- `uvicorn app.main:app` boots without errors against the `db` (dev) container and serves `GET /health` → `{"status": "ok"}`.
- `alembic upgrade head` and `alembic downgrade base` both run cleanly from `apps/api` against either Postgres database.
- `black --check` and `ruff check` pass with no findings on `apps/api/app` and `apps/api/tests`.
- Nothing from spec phases 4+ (auth sync, business endpoints, frontend, payment, analytics, CI, deploy) was implemented — confirm by re-reading the spec's §12 sequencing and this plan's "Plan Sequence Note".
