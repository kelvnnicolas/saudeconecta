import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class TipoNotificacao(str, enum.Enum):
    novo_contato = "novo_contato"
    nova_mensagem = "nova_mensagem"
    aceite_demanda = "aceite_demanda"
    novo_interesse = "novo_interesse"
    falha_pagamento = "falha_pagamento"
    nova_oportunidade = "nova_oportunidade"


class Notificacao(Base):
    __tablename__ = "notificacoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    destinatario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), index=True, nullable=False
    )
    tipo: Mapped[TipoNotificacao] = mapped_column(
        SQLEnum(TipoNotificacao, name="tipo_notificacao_enum"), nullable=False
    )
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    corpo: Mapped[str] = mapped_column(Text, nullable=False)
    link: Mapped[str] = mapped_column(String(500), nullable=False)
    lida_em: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
