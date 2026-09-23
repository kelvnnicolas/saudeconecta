from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.schemas.profile import ProfileRead
from app.services.profile_service import update_avatar

router = APIRouter(prefix="/perfis", tags=["perfis"])


@router.post("/me/avatar", response_model=ProfileRead)
def upload_own_avatar(
    file: UploadFile,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfileRead:
    file_bytes = file.file.read()
    return update_avatar(db, current_user.id, file_bytes, file.content_type)
