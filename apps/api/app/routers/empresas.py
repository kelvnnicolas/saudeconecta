import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.models.empresa import TipoEmpresa
from app.schemas.busca import EmpresaSearchResponse, EmpresaSearchResult
from app.schemas.empresa import EmpresaRead, EmpresaUpdateRequest
from app.services.empresa_service import (
    get_empresa_by_id,
    search_empresas,
    to_empresa_read,
    upsert_empresa,
)

router = APIRouter(prefix="/empresas", tags=["empresas"])


@router.get("", response_model=EmpresaSearchResponse)
def search_empresas_route(
    q: str | None = None,
    tipo: TipoEmpresa | None = None,
    cidade: str | None = None,
    estado: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> EmpresaSearchResponse:
    results, total = search_empresas(db, q, tipo, cidade, estado, limit, offset)
    items = [
        EmpresaSearchResult(
            user_id=empresa.user_id,
            nome_fantasia=empresa.nome_fantasia,
            tipo=empresa.tipo,
            cidade=empresa.cidade,
            estado=empresa.estado,
            avatar_url=empresa.profile.avatar_url,
            nota_media=float(nota_media) if nota_media is not None else None,
        )
        for empresa, nota_media in results
    ]
    return EmpresaSearchResponse(items=items, total=total, limit=limit, offset=offset)


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
