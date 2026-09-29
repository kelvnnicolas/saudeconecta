import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class MensagemContatoCreateRequest(BaseModel):
    corpo: str

    @field_validator("corpo")
    @classmethod
    def corpo_nao_vazio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Mensagem não pode ser vazia")
        return v


class MensagemContatoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    contato_id: int
    autor_id: uuid.UUID
    corpo: str
    criado_em: datetime
