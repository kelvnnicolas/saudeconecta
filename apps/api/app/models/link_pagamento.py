import enum
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class StatusPagamento(str, enum.Enum):
    pendente = "pendente"
    pago = "pago"
    cancelado = "cancelado"


class LinkPagamento(Base):
    __tablename__ = "links_pagamento"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    contato_id: Mapped[int] = mapped_column(Integer, ForeignKey("contatos.id"), nullable=False)
    valor: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[StatusPagamento] = mapped_column(
        SQLEnum(StatusPagamento, name="status_pagamento_enum"),
        nullable=False,
        default=StatusPagamento.pendente,
    )
    url_checkout: Mapped[str] = mapped_column(String(500), nullable=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
