import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.profile import Profile
from app.schemas.profile import AuthSyncRequest
from app.storage.supabase_storage import upload_avatar

_AVATAR_CONTENT_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}
_MAX_AVATAR_BYTES = 5 * 1024 * 1024


def upsert_profile(
    db: Session, user_id: uuid.UUID, data: AuthSyncRequest, email: str | None
) -> Profile:
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
    profile.email = email
    db.commit()
    db.refresh(profile)
    return profile


def update_avatar(
    db: Session, user_id: uuid.UUID, file_bytes: bytes, content_type: str | None
) -> Profile:
    profile = db.get(Profile, user_id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sincronize seu perfil primeiro via POST /auth/sync",
        )

    normalized_content_type = (content_type or "").split(";")[0].strip().lower()
    extension = _AVATAR_CONTENT_TYPES.get(normalized_content_type)
    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Formato de imagem não suportado. Use JPEG, PNG ou WEBP.",
        )
    if len(file_bytes) > _MAX_AVATAR_BYTES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Imagem maior que o limite de 5MB.",
        )

    avatar_url = upload_avatar(f"{user_id}.{extension}", file_bytes, normalized_content_type)
    profile.avatar_url = avatar_url
    db.commit()
    db.refresh(profile)
    return profile
