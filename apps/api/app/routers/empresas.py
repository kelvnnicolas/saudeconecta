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
