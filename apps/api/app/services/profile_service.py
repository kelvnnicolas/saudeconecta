import uuid

from sqlalchemy.orm import Session

from app.models.profile import Profile
from app.schemas.profile import AuthSyncRequest


def upsert_profile(db: Session, user_id: uuid.UUID, data: AuthSyncRequest) -> Profile:
    profile = db.get(Profile, user_id)
    if profile is None:
        profile = Profile(id=user_id, papel=data.papel, nome=data.nome)
        db.add(profile)
    else:
        profile.papel = data.papel
        profile.nome = data.nome
    profile.telefone = data.telefone
    profile.cidade = data.cidade
    profile.estado = data.estado
    db.commit()
    db.refresh(profile)
    return profile
