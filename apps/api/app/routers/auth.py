from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.models.profile import Profile
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
