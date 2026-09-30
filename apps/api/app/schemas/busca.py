import uuid

from pydantic import BaseModel, ConfigDict

from app.models.empresa import TipoEmpresa


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


class EmpresaSearchResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    nome_fantasia: str
    tipo: TipoEmpresa
    cidade: str | None
    estado: str | None
    avatar_url: str | None
    nota_media: float | None


class EmpresaSearchResponse(BaseModel):
    items: list[EmpresaSearchResult]
    total: int
    limit: int
    offset: int
