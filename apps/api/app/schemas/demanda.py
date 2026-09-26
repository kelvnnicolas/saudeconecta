import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.demanda import DESCRICAO_MAX, TURNO_MAX, StatusDemanda


class DemandaCreate(BaseModel):
    especialidade_id: int
    cidade: str = Field(min_length=1, max_length=100)
    estado: str = Field(min_length=2, max_length=2)
    bairro: str | None = Field(default=None, max_length=100)
    data_inicio: date
    turno: str = Field(min_length=1, max_length=TURNO_MAX)
    descricao: str = Field(min_length=1, max_length=DESCRICAO_MAX)
    valor_oferecido: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)


class DemandaStatusUpdate(BaseModel):
    status: StatusDemanda


class InteresseCreate(BaseModel):
    mensagem: str | None = Field(default=None, max_length=500)


class InteresseResponse(BaseModel):
    contato_id: int


class DemandaRead(BaseModel):
    id: uuid.UUID
    empresa_id: uuid.UUID
    empresa_nome: str
    especialidade_id: int
    especialidade_nome: str
    cidade: str
    estado: str
    bairro: str | None
    data_inicio: date
    turno: str
    descricao: str
    valor_oferecido: float | None
    status: StatusDemanda
    expira_em: datetime
    criado_em: datetime


class MinhaDemandaRead(DemandaRead):
    interessados_count: int


class InteressadoRead(BaseModel):
    contato_id: int
    profissional_id: uuid.UUID
    nome: str
    avatar_url: str | None
    criado_em: datetime


class DemandaDetalheEmpresa(DemandaRead):
    interessados: list[InteressadoRead]


class DemandaDetalheProfissional(DemandaRead):
    ja_demonstrei_interesse: bool


class OportunidadesResponse(BaseModel):
    items: list[DemandaRead]
    total: int
    limit: int
    offset: int
