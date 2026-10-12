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


class EmpresaDiretorioResult(BaseModel):
    """Visão do diretório de empresas para profissionais logados.

    Sem nota e sem contato de propósito: a nota só entra quando houver base real
    (ver nextmove.md) e o contato só depois de um interesse demonstrado.
    """

    user_id: uuid.UUID
    nome_fantasia: str
    tipo: TipoEmpresa
    cidade: str | None
    estado: str | None
    avatar_url: str | None
    demandas_abertas: int


class EmpresaDiretorioResponse(BaseModel):
    items: list[EmpresaDiretorioResult]
    total: int
    limit: int
    offset: int


class EmpresaSearchResponse(BaseModel):
    items: list[EmpresaSearchResult]
    total: int
    limit: int
    offset: int
