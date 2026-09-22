import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.profile import Papel


class AuthSyncRequest(BaseModel):
    papel: Papel
    nome: str
    telefone: str | None = None
    cidade: str | None = None
    estado: str | None = None


class ProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    papel: Papel
    nome: str
    telefone: str | None
    cidade: str | None
    estado: str | None
    avatar_url: str | None
    email: str | None
    criado_em: datetime
