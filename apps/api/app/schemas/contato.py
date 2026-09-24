import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.contato import StatusContato


class ContatoCreateRequest(BaseModel):
    profissional_id: uuid.UUID
    mensagem: str


class ContatoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    solicitante_id: uuid.UUID
    profissional_id: uuid.UUID
    mensagem: str
    status: StatusContato
    criado_em: datetime
