import enum
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.especialidade import Especialidade

DESCRICAO_MAX = 500
TURNO_MAX = 60


class StatusDemanda(str, enum.Enum):
    aberta = "aberta"
    preenchida = "preenchida"
    encerrada = "encerrada"
    expirada = "expirada"


class Demanda(Base):
    __tablename__ = "demandas"
    __table_args__ = (
        CheckConstraint(
            f"char_length(descricao) <= {DESCRICAO_MAX}", name="ck_demandas_descricao_max"
        ),
        Index("ix_demandas_status_especialidade_cidade", "status", "especialidade_id", "cidade"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    empresa_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("empresas.user_id"), nullable=False
    )
    especialidade_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("especialidades.id"), nullable=False
    )
    cidade: Mapped[str] = mapped_column(String(100), nullable=False)
    estado: Mapped[str] = mapped_column(String(2), nullable=False)
    bairro: Mapped[str | None] = mapped_column(String(100))
    data_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    turno: Mapped[str] = mapped_column(String(TURNO_MAX), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    valor_oferecido: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    status: Mapped[StatusDemanda] = mapped_column(
        SQLEnum(StatusDemanda, name="status_demanda_enum"),
        nullable=False,
        default=StatusDemanda.aberta,
        server_default=StatusDemanda.aberta.value,
    )
    expira_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now() + interval '30 days'"),
        nullable=False,
    )
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    especialidade: Mapped[Especialidade] = relationship()
