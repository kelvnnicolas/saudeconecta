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
            db.scalars(select(Especialidade).where(Especialidade.id.in_(data.especialidade_ids)))
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
