import uuid

from pydantic import BaseModel, ConfigDict

from app.schemas.especialidade import EspecialidadeRead


class ProfissionalUpdateRequest(BaseModel):
    registro_profissional: str | None = None
    bio: str | None = None
    preco_hora: float | None = None
    especialidade_ids: list[int] = []


class ProfissionalRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    nome: str
    cidade: str | None
    estado: str | None
    avatar_url: str | None
    registro_profissional: str | None
    bio: str | None
    preco_hora: float | None
    verificado: bool
    especialidades: list[EspecialidadeRead]
