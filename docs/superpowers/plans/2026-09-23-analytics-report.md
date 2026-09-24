# Analytics Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose `GET /analytics/relatorio?data_inicio&data_fim`, a pandas-powered report returning professionals-per-specialty, the platform's overall average rating, and contact volume within the given date range.

**Architecture:** A pure, DB-free module (`app/analytics/relatorio.py`) holds the pandas aggregation logic as small testable functions (per spec: "Função implementada como unidade testável, não em notebook"). A thin service (`app/services/relatorio_service.py`) fetches the raw rows via SQLAlchemy and hands them to those pure functions. A router exposes the result as JSON.

**Tech Stack:** FastAPI, SQLAlchemy, pandas (new dependency — not yet in `requirements.txt`).

**Spec:** `docs/superpowers/specs/2026-09-19-saudeconecta-mvp-design.md` (§7 "Relatório", §12 sequencing item 10)

**Branch base:** This plan branches from `main` (commit `058d123`, the Plan 1+2+4 merge — Plan 3's search/avaliações/contatos endpoints are still unmerged on `worktree-search-reviews-contacts`). The `avaliacoes` and `contatos` **tables** already exist (created by Plan 1's initial migration, which created all 8 tables up front) even though Plan 3's endpoints to populate them via the API aren't merged yet — so this plan's tests insert `Avaliacao`/`Contato` rows directly via the ORM (synthetic fixtures, exactly as the spec asks for), and the report code itself has no dependency on Plan 3's routers/services. In production, until Plan 3 merges, `nota_media_geral` and `volume_contatos_periodo` will report `None`/`0` (no real rows exist yet) while `profissionais_por_especialidade` will already reflect real data, since `PUT /profissionais/me` (Plan 2, merged) already writes to `profissionais`/`profissional_especialidades`. Task 3 documents this nuance in `STATUS.md`.

## Global Constraints

- The two metrics without a stated date qualifier in the spec ("profissionais por especialidade", "nota média geral") are computed over **all** rows, not filtered by `data_inicio`/`data_fim` — only "volume de contatos no período" is date-filtered, per the spec's literal wording ("profissionais por especialidade, nota média geral e volume de contatos **no período**").
- `data_fim` must not be before `data_inicio` — reject with `400`.
- The aggregation logic itself (grouping, averaging, date-range filtering) lives in pandas-based pure functions with no DB/FastAPI imports, so it's testable with synthetic data per spec §9 ("testar com dados sintéticos via fixtures"). The service layer does only I/O (querying rows, calling the pure functions, building the response).
- `criado_em` columns are `DateTime(timezone=True)` (UTC) — date-range comparisons work on calendar dates (`.date()`), not exact timestamps; a contact created at `2026-01-31 23:59 UTC` counts as being on `2026-01-31`.
- This endpoint has no authentication — it reports platform-wide aggregates, not any individual user's data, matching the existing pattern of `GET /especialidades` and `GET /profissionais` (search) being public.
- Black (`line-length = 100`) and Ruff (`select = ["E", "F", "I", "UP"]`) must both pass clean (`pyproject.toml`).
- Test DB fixtures follow the existing `client`/`db_session` pattern in `apps/api/tests/conftest.py`.
- The `especialidades` table is pre-seeded with 10 rows by Plan 1's migration (Enfermagem, Técnico de Enfermagem, Medicina (Clínico Geral), Fisioterapia, Fonoaudiologia, Nutrição, Psicologia, Cuidador de Idosos, Cuidador Infantil, Terapia Ocupacional) — tests that need an `Especialidade` row must look one up by name first and only create it if missing, never assume the table starts empty (a blind `Especialidade(nome=...)` insert on a name that's already seeded would violate the `nome` unique constraint).
- `Profissional`/`Contato`/`Avaliacao` reference `profiles`/`profissionais` by raw foreign key only (no ORM `relationship()` between them) — when a test needs both sides of such a link in the same transaction, `db_session.flush()` the referenced row before adding the row that references it, don't rely on `add()` order alone.

---

### Task 1: Pure pandas aggregation functions

**Files:**
- Modify: `apps/api/requirements.txt`
- Create: `apps/api/app/analytics/relatorio.py`
- Test: `apps/api/tests/test_analytics_relatorio.py`

**Interfaces:**
- Consumes: nothing (pure functions, stdlib + pandas only).
- Produces: `contar_profissionais_por_especialidade(nomes_especialidades: list[str]) -> dict[str, int]`, `calcular_nota_media_geral(notas: list[int]) -> float | None`, `contar_volume_contatos_no_periodo(datas_criacao: list[datetime], data_inicio: date, data_fim: date) -> int`. Task 2's service layer calls all three directly by these exact names.

- [ ] **Step 1: Add pandas to requirements**

In `apps/api/requirements.txt`, add this line after `PyJWT[crypto]==2.9.0` (the last line):

```
pandas==2.2.3
```

Install it: `cd apps/api && .venv/bin/pip install pandas==2.2.3`

- [ ] **Step 2: Write the failing tests**

Create `apps/api/tests/test_analytics_relatorio.py`:

```python
from datetime import date, datetime, timezone

from app.analytics.relatorio import (
    calcular_nota_media_geral,
    contar_profissionais_por_especialidade,
    contar_volume_contatos_no_periodo,
)


def test_contar_profissionais_por_especialidade_empty_list():
    assert contar_profissionais_por_especialidade([]) == {}


def test_contar_profissionais_por_especialidade_counts_occurrences():
    resultado = contar_profissionais_por_especialidade(
        ["Enfermagem", "Fisioterapia", "Enfermagem", "Enfermagem", "Fisioterapia"]
    )
    assert resultado == {"Enfermagem": 3, "Fisioterapia": 2}


def test_calcular_nota_media_geral_empty_list_returns_none():
    assert calcular_nota_media_geral([]) is None


def test_calcular_nota_media_geral_rounds_to_two_decimals():
    assert calcular_nota_media_geral([5, 4, 4]) == 4.33


def test_calcular_nota_media_geral_exact_average():
    assert calcular_nota_media_geral([5, 4, 3, 4]) == 4.0


def test_contar_volume_contatos_no_periodo_empty_list_returns_zero():
    assert contar_volume_contatos_no_periodo([], date(2026, 1, 1), date(2026, 1, 31)) == 0


def test_contar_volume_contatos_no_periodo_includes_boundary_dates():
    datas = [
        datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc),
        datetime(2026, 1, 31, 23, 59, tzinfo=timezone.utc),
    ]
    assert contar_volume_contatos_no_periodo(datas, date(2026, 1, 1), date(2026, 1, 31)) == 2


def test_contar_volume_contatos_no_periodo_excludes_dates_outside_range():
    datas = [
        datetime(2025, 12, 31, 12, 0, tzinfo=timezone.utc),
        datetime(2026, 1, 15, 12, 0, tzinfo=timezone.utc),
        datetime(2026, 2, 1, 0, 0, tzinfo=timezone.utc),
    ]
    assert contar_volume_contatos_no_periodo(datas, date(2026, 1, 1), date(2026, 1, 31)) == 1
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_analytics_relatorio.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.analytics.relatorio'` (or `ImportError`).

- [ ] **Step 4: Implement the pure functions**

Create `apps/api/app/analytics/relatorio.py`:

```python
from datetime import date, datetime

import pandas as pd


def contar_profissionais_por_especialidade(nomes_especialidades: list[str]) -> dict[str, int]:
    if not nomes_especialidades:
        return {}
    return pd.Series(nomes_especialidades).value_counts().to_dict()


def calcular_nota_media_geral(notas: list[int]) -> float | None:
    if not notas:
        return None
    return round(float(pd.Series(notas).mean()), 2)


def contar_volume_contatos_no_periodo(
    datas_criacao: list[datetime], data_inicio: date, data_fim: date
) -> int:
    if not datas_criacao:
        return 0
    datas = pd.Series([d.date() for d in datas_criacao])
    return int(((datas >= data_inicio) & (datas <= data_fim)).sum())
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_analytics_relatorio.py -v`
Expected: 8 passed.

Then run the full suite:

Run: `cd apps/api && .venv/bin/python -m pytest -q`
Expected: all tests pass (35 existing + 8 new = 43).

- [ ] **Step 6: Format and lint**

Run: `cd apps/api && .venv/bin/python -m black app tests && .venv/bin/python -m ruff check app tests`
Expected: both clean.

- [ ] **Step 7: Commit**

```bash
git add apps/api/requirements.txt apps/api/app/analytics/relatorio.py apps/api/tests/test_analytics_relatorio.py
git commit -m "feat(api): add pandas-based analytics aggregation functions"
```

---

### Task 2: `GET /analytics/relatorio` endpoint

**Files:**
- Create: `apps/api/app/schemas/analytics.py`
- Create: `apps/api/app/services/relatorio_service.py`
- Create: `apps/api/app/routers/analytics.py`
- Modify: `apps/api/app/main.py`
- Create: `apps/api/tests/test_analytics.py`

**Interfaces:**
- Consumes: `app.analytics.relatorio.contar_profissionais_por_especialidade`, `calcular_nota_media_geral`, `contar_volume_contatos_no_periodo` (Task 1, exact names above). `app.models.especialidade.Especialidade` (existing). `app.models.profissional_especialidade.profissional_especialidades` (existing `Table`, columns `profissional_id`/`especialidade_id`). `app.models.avaliacao.Avaliacao` (existing, `nota: int`). `app.models.contato.Contato` (existing, `criado_em: datetime`). `app.core.database.get_db` (existing).
- Produces: `relatorio_service.gerar_relatorio(db: Session, data_inicio: date, data_fim: date) -> RelatorioResponse` — raises `HTTPException(400)` if `data_fim < data_inicio`. `schemas.analytics.RelatorioResponse` with fields `data_inicio: date`, `data_fim: date`, `profissionais_por_especialidade: dict[str, int]`, `nota_media_geral: float | None`, `volume_contatos_periodo: int`.

- [ ] **Step 1: Write the failing tests**

Create `apps/api/tests/test_analytics.py`:

```python
import uuid
from datetime import datetime, timezone

from app.models.avaliacao import Avaliacao
from app.models.contato import Contato
from app.models.especialidade import Especialidade
from app.models.profile import Papel, Profile
from app.models.profissional import Profissional


def _criar_profissional_com_especialidade(db_session, nome_especialidade: str) -> Profissional:
    especialidade = db_session.query(Especialidade).filter_by(nome=nome_especialidade).first()
    if especialidade is None:
        especialidade = Especialidade(nome=nome_especialidade)
        db_session.add(especialidade)
        db_session.flush()

    user_id = uuid.uuid4()
    db_session.add(Profile(id=user_id, papel=Papel.profissional, nome=f"Prof {user_id}"))
    db_session.flush()
    profissional = Profissional(user_id=user_id)
    profissional.especialidades = [especialidade]
    db_session.add(profissional)
    db_session.flush()
    return profissional


def test_get_relatorio_requires_date_range(client):
    response = client.get("/analytics/relatorio")
    assert response.status_code == 422


def test_get_relatorio_rejects_data_fim_before_data_inicio(client):
    response = client.get(
        "/analytics/relatorio",
        params={"data_inicio": "2026-01-31", "data_fim": "2026-01-01"},
    )
    assert response.status_code == 400


def test_get_relatorio_returns_zeroed_metrics_when_no_data(client):
    response = client.get(
        "/analytics/relatorio",
        params={"data_inicio": "2026-01-01", "data_fim": "2026-01-31"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["profissionais_por_especialidade"] == {}
    assert body["nota_media_geral"] is None
    assert body["volume_contatos_periodo"] == 0


def test_get_relatorio_counts_profissionais_por_especialidade(client, db_session):
    _criar_profissional_com_especialidade(db_session, "Enfermagem")
    _criar_profissional_com_especialidade(db_session, "Enfermagem")
    _criar_profissional_com_especialidade(db_session, "Fisioterapia")
    db_session.commit()

    response = client.get(
        "/analytics/relatorio",
        params={"data_inicio": "2026-01-01", "data_fim": "2026-01-31"},
    )

    assert response.status_code == 200
    assert response.json()["profissionais_por_especialidade"] == {
        "Enfermagem": 2,
        "Fisioterapia": 1,
    }


def test_get_relatorio_calculates_nota_media_geral(client, db_session):
    autor_id = uuid.uuid4()
    alvo_id = uuid.uuid4()
    db_session.add(Profile(id=autor_id, papel=Papel.empresa, nome="Empresa"))
    db_session.add(Profile(id=alvo_id, papel=Papel.profissional, nome="Profissional"))
    db_session.flush()
    db_session.add(Avaliacao(autor_id=autor_id, alvo_id=alvo_id, nota=5))
    db_session.add(Avaliacao(autor_id=autor_id, alvo_id=alvo_id, nota=3))
    db_session.commit()

    response = client.get(
        "/analytics/relatorio",
        params={"data_inicio": "2026-01-01", "data_fim": "2026-01-31"},
    )

    assert response.status_code == 200
    assert response.json()["nota_media_geral"] == 4.0


def test_get_relatorio_counts_volume_contatos_within_period_only(client, db_session):
    solicitante_id = uuid.uuid4()
    profissional = _criar_profissional_com_especialidade(db_session, "Nutrição")
    db_session.add(Profile(id=solicitante_id, papel=Papel.empresa, nome="Empresa X"))
    db_session.flush()

    dentro = Contato(
        solicitante_id=solicitante_id,
        profissional_id=profissional.user_id,
        mensagem="Dentro do período",
        criado_em=datetime(2026, 1, 15, 12, 0, tzinfo=timezone.utc),
    )
    fora = Contato(
        solicitante_id=solicitante_id,
        profissional_id=profissional.user_id,
        mensagem="Fora do período",
        criado_em=datetime(2026, 2, 1, 12, 0, tzinfo=timezone.utc),
    )
    db_session.add_all([dentro, fora])
    db_session.commit()

    response = client.get(
        "/analytics/relatorio",
        params={"data_inicio": "2026-01-01", "data_fim": "2026-01-31"},
    )

    assert response.status_code == 200
    assert response.json()["volume_contatos_periodo"] == 1
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_analytics.py -v`
Expected: FAIL — `404 Not Found` (no route registered yet).

- [ ] **Step 3: Create the response schema**

Create `apps/api/app/schemas/analytics.py`:

```python
from datetime import date

from pydantic import BaseModel


class RelatorioResponse(BaseModel):
    data_inicio: date
    data_fim: date
    profissionais_por_especialidade: dict[str, int]
    nota_media_geral: float | None
    volume_contatos_periodo: int
```

- [ ] **Step 4: Create the service**

Create `apps/api/app/services/relatorio_service.py`:

```python
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.analytics.relatorio import (
    calcular_nota_media_geral,
    contar_profissionais_por_especialidade,
    contar_volume_contatos_no_periodo,
)
from app.models.avaliacao import Avaliacao
from app.models.contato import Contato
from app.models.especialidade import Especialidade
from app.models.profissional_especialidade import profissional_especialidades
from app.schemas.analytics import RelatorioResponse


def gerar_relatorio(db: Session, data_inicio: date, data_fim: date) -> RelatorioResponse:
    if data_fim < data_inicio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="data_fim não pode ser anterior a data_inicio",
        )

    nomes_especialidades = list(
        db.scalars(
            select(Especialidade.nome).join(
                profissional_especialidades,
                profissional_especialidades.c.especialidade_id == Especialidade.id,
            )
        )
    )
    notas = list(db.scalars(select(Avaliacao.nota)))
    datas_contatos = list(db.scalars(select(Contato.criado_em)))

    return RelatorioResponse(
        data_inicio=data_inicio,
        data_fim=data_fim,
        profissionais_por_especialidade=contar_profissionais_por_especialidade(
            nomes_especialidades
        ),
        nota_media_geral=calcular_nota_media_geral(notas),
        volume_contatos_periodo=contar_volume_contatos_no_periodo(
            datas_contatos, data_inicio, data_fim
        ),
    )
```

- [ ] **Step 5: Create the router**

Create `apps/api/app/routers/analytics.py`:

```python
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.analytics import RelatorioResponse
from app.services.relatorio_service import gerar_relatorio

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/relatorio", response_model=RelatorioResponse)
def get_relatorio(
    data_inicio: date,
    data_fim: date,
    db: Session = Depends(get_db),
) -> RelatorioResponse:
    return gerar_relatorio(db, data_inicio, data_fim)
```

- [ ] **Step 6: Wire the router into `main.py`**

Replace the full content of `apps/api/app/main.py` with:

```python
from fastapi import FastAPI

from app.core.sentry import init_sentry
from app.routers import analytics, auth, empresas, especialidades, health, perfis, profissionais

init_sentry()

app = FastAPI(title="SaúdeConecta API")

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(especialidades.router)
app.include_router(profissionais.router)
app.include_router(empresas.router)
app.include_router(perfis.router)
app.include_router(analytics.router)
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_analytics.py -v`
Expected: 6 passed.

Then run the full suite:

Run: `cd apps/api && .venv/bin/python -m pytest -q`
Expected: all tests pass (43 from Task 1 + 6 new = 49).

- [ ] **Step 8: Format and lint**

Run: `cd apps/api && .venv/bin/python -m black app tests && .venv/bin/python -m ruff check app tests`
Expected: both clean.

- [ ] **Step 9: Commit**

```bash
git add apps/api/app/schemas/analytics.py apps/api/app/services/relatorio_service.py apps/api/app/routers/analytics.py apps/api/app/main.py apps/api/tests/test_analytics.py
git commit -m "feat(api): add GET /analytics/relatorio endpoint"
```

---

### Task 3: Verification and docs

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

In another terminal:

```bash
curl -s "http://localhost:8000/analytics/relatorio?data_inicio=2026-01-01&data_fim=2026-12-31"
```

Expected: `200` with a JSON body like `{"data_inicio":"2026-01-01","data_fim":"2026-12-31","profissionais_por_especialidade":{},"nota_media_geral":null,"volume_contatos_periodo":0}` (empty local dev DB — zeroed metrics are correct, not a bug). Also check `http://localhost:8000/docs` and confirm `GET /analytics/relatorio` appears with `data_inicio`/`data_fim` as required query parameters.

Stop the server (`Ctrl+C`) when done.

- [ ] **Step 4: Update `STATUS.md`**

`STATUS.md` at the repo root is a living doc. Before editing, confirm the two target lines below are still present verbatim using single-quoted grep patterns (backticks in a double-quoted shell string trigger command substitution, so single-quote these): `grep -n 'existe só como pacote vazio' STATUS.md` and `grep -n 'Não implementado ainda (item 10)' STATUS.md`. If either has already changed, skip that edit rather than forcing a mismatched replace — leave a one-line note in the commit message instead.

In the "Checklist de implementação" table, row 10 ("Relatório com pandas em `app/analytics/` exposto como endpoint"), replace:

```
❌ Não iniciado | `app/analytics/` existe só como pacote vazio, reservado.
```

with:

```
✅ Concluído | `GET /analytics/relatorio?data_inicio&data_fim` implementado no Plano 5 (`apps/api/app/routers/analytics.py`), com a agregação em funções pandas puras e testáveis (`apps/api/app/analytics/relatorio.py`) separadas da camada de I/O (`apps/api/app/services/relatorio_service.py`). `profissionais_por_especialidade` já reflete dados reais (escritos desde o Plano 2 via `PUT /profissionais/me`); `nota_media_geral` e `volume_contatos_periodo` retornam `null`/`0` até o Plano 3 (avaliações/contatos) ser integrado à `main`, pois é isso que popula essas tabelas.
```

In the "Checklist de critérios de aceite" table, row "Relatório em pandas retorna métricas corretas", replace:

```
❌ Não iniciado | Não implementado ainda (item 10).
```

with:

```
🟡 Parcial | Endpoint implementado e testado com dados sintéticos (Plano 5). Falta apenas dados reais de avaliações/contatos, que dependem do Plano 3 (ainda não integrado à `main`) — `profissionais_por_especialidade` já é real hoje.
```

Do not touch any other section — in particular, leave rows 4/5/8/9 of the "Checklist de implementação" table and the "Por onde retomar" section alone even though they read as if Plans 2-4 haven't happened; that staleness predates this plan and is being raised separately, not fixed here.

- [ ] **Step 5: Commit**

```bash
git add STATUS.md
git commit -m "docs: note analytics report endpoint and its data dependency on Plan 3"
```
