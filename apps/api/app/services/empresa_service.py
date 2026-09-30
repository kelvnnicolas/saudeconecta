import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.avaliacao import Avaliacao
from app.models.empresa import Empresa, TipoEmpresa
from app.models.profile import Profile
from app.schemas.empresa import EmpresaRead, EmpresaUpdateRequest


def get_empresa_by_id(db: Session, user_id: uuid.UUID) -> Empresa | None:
    return db.get(Empresa, user_id)


def search_empresas(
    db: Session,
    q: str | None = None,
    tipo: TipoEmpresa | None = None,
    cidade: str | None = None,
    estado: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[tuple[Empresa, float | None]], int]:
    nota_subq = (
        select(Avaliacao.alvo_id.label("alvo_id"), func.avg(Avaliacao.nota).label("nota_media"))
        .group_by(Avaliacao.alvo_id)
        .subquery()
    )

    # Diretório público de instituições — pessoa_fisica nunca aparece aqui,
    # inclusive se alguém passar tipo=pessoa_fisica explicitamente (o filtro
    # abaixo simplesmente nunca casa com nada nesse caso).
    base_query = (
        select(Empresa, nota_subq.c.nota_media)
        .join(Profile, Empresa.user_id == Profile.id)
        .outerjoin(nota_subq, nota_subq.c.alvo_id == Profile.id)
        .where(Empresa.tipo != TipoEmpresa.pessoa_fisica)
    )

    if q:
        base_query = base_query.where(Empresa.nome_fantasia.ilike(f"%{q}%"))
    if tipo:
        base_query = base_query.where(Empresa.tipo == tipo)
    if cidade:
        base_query = base_query.where(Empresa.cidade.ilike(cidade))
    if estado:
        base_query = base_query.where(Empresa.estado == estado.upper())

    count_query = select(func.count()).select_from(
        base_query.with_only_columns(Empresa.user_id).subquery()
    )
    total = db.scalar(count_query) or 0

    rows = db.execute(base_query.order_by(Empresa.nome_fantasia).limit(limit).offset(offset)).all()

    return [(row[0], row[1]) for row in rows], total


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
