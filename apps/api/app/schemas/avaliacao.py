import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AvaliacaoCreateRequest(BaseModel):
    alvo_id: uuid.UUID
    nota: int = Field(ge=1, le=5)
    comentario: str | None = None


class AvaliacaoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    autor_id: uuid.UUID
    alvo_id: uuid.UUID
    nota: int
    comentario: str | None
    criado_em: datetime
