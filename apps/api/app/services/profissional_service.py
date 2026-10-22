import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.errors import PERFIL_NAO_CONCLUIDO
from app.models.avaliacao import Avaliacao
from app.models.especialidade import Especialidade
from app.models.profile import Profile
from app.models.profissional import Profissional
from app.models.profissional_especialidade import profissional_especialidades
from app.schemas.especialidade import EspecialidadeRead
from app.schemas.profissional import ProfissionalRead, ProfissionalUpdateRequest
from app.services.verificacao_service import invalidar_por_mudanca_de_registro


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
        verificado_em=profissional.verificado_em if profissional.verificado else None,
        especialidades=[EspecialidadeRead.model_validate(e) for e in profissional.especialidades],
    )


def upsert_profissional(
    db: Session, user_id: uuid.UUID, data: ProfissionalUpdateRequest
) -> Profissional:
    profile = db.get(Profile, user_id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=PERFIL_NAO_CONCLUIDO,
        )
    if profile.papel != "profissional":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas usuários com papel 'profissional' podem editar este recurso",
        )

    especialidades: list[Especialidade] = []
    if data.especialidade_ids:
        especialidades = list(
            db.scalars(select(Especialidade).where(Especialidade.id.in_(data.especialidade_ids)))
        )
        found_ids = {e.id for e in especialidades}
        missing_ids = set(data.especialidade_ids) - found_ids
        if missing_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Alguma especialidade escolhida não existe mais. "
                    "Atualize a página e tente de novo."
                ),
            )

    profissional = db.get(Profissional, user_id)
    registro_novo = (data.registro_profissional or "").strip() or None
    if profissional is None:
        profissional = Profissional(user_id=user_id)
        db.add(profissional)
    else:
        registro_antigo = (profissional.registro_profissional or "").strip() or None
        if registro_novo != registro_antigo:
            # Outro número de registro: a conferência anterior deixa de valer (F-031).
            invalidar_por_mudanca_de_registro(db, profissional)

    profissional.registro_profissional = registro_novo
    profissional.bio = data.bio
    profissional.preco_hora = data.preco_hora
    profissional.especialidades = especialidades

    db.commit()
    db.refresh(profissional)
    return profissional


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
    verificado: bool | None = None,
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
    if verificado is not None:
        filters.append(Profissional.verificado.is_(verificado))
    for condition in filters:
        base_query = base_query.where(condition)

    count_query = select(func.count()).select_from(
        base_query.with_only_columns(Profissional.user_id).subquery()
    )
    total = db.scalar(count_query) or 0

    rows = db.execute(base_query.order_by(Profile.nome).limit(limit).offset(offset)).all()

    return [(row[0], row[1]) for row in rows], total
