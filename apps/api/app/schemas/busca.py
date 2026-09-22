import uuid

from pydantic import BaseModel, ConfigDict


class ProfissionalSearchResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    nome: str
    cidade: str | None
    estado: str | None
    avatar_url: str | None
    bio: str | None
    preco_hora: float | None
    verificado: bool
    nota_media: float | None


class ProfissionalSearchResponse(BaseModel):
    items: list[ProfissionalSearchResult]
    total: int
    limit: int
    offset: int
