import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.errors import PERFIL_NAO_CONCLUIDO
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
    elif profile.papel != data.papel:
        # T-031: o papel só vale na criação. Trocar depois deixaria linhas órfãs
        # em profissionais/empresas e daria ao usuário o acesso do outro tipo.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Esta conta foi criada como {profile.papel.value} "
                "e o tipo de conta não pode ser alterado."
            ),
        )
    else:
        profile.nome = data.nome
    # Chamada repetida sem estes campos não apaga o que já foi salvo.
    if data.telefone is not None:
        profile.telefone = data.telefone
    if data.cidade is not None:
        profile.cidade = data.cidade
    if data.estado is not None:
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
            detail=PERFIL_NAO_CONCLUIDO,
        )

    normalized_content_type = (content_type or "").split(";")[0].strip().lower()
    extension = _AVATAR_CONTENT_TYPES.get(normalized_content_type)
    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Esse formato de imagem não é aceito. Use JPEG, PNG ou WEBP.",
        )
    if len(file_bytes) > _MAX_AVATAR_BYTES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A imagem passa de 5 MB. Escolha uma foto menor.",
        )

    avatar_url = upload_avatar(f"{user_id}.{extension}", file_bytes, normalized_content_type)
    profile.avatar_url = avatar_url
    db.commit()
    db.refresh(profile)
    return profile
