import uuid

from pydantic import BaseModel, ConfigDict

from app.models.empresa import TipoEmpresa


class EmpresaUpdateRequest(BaseModel):
    nome_fantasia: str
    tipo: TipoEmpresa
    cidade: str | None = None
    estado: str | None = None


class EmpresaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    nome: str
    avatar_url: str | None
    nome_fantasia: str
    tipo: TipoEmpresa
    cidade: str | None
    estado: str | None
