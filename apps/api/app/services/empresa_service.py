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
