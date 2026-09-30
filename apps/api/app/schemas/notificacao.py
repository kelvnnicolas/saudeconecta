from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.notificacao import TipoNotificacao


class NotificacaoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tipo: TipoNotificacao
    titulo: str
    corpo: str
    link: str
    lida_em: datetime | None
    criado_em: datetime


class ListaNotificacoesResponse(BaseModel):
    items: list[NotificacaoRead]
    total: int
    total_nao_lidas: int
    limit: int
    offset: int


class MarcarTodasLidasResponse(BaseModel):
    marcadas: int
