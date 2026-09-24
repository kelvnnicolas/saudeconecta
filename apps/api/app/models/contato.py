import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Text, text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class StatusContato(str, enum.Enum):
    pendente = "pendente"
    respondido = "respondido"
    encerrado = "encerrado"


class OrigemContato(str, enum.Enum):
    busca = "busca"
    demanda = "demanda"


class Contato(Base):
    __tablename__ = "contatos"
    __table_args__ = (
        Index(
            "uq_contatos_demanda_profissional",
            "demanda_id",
            "profissional_id",
            unique=True,
            postgresql_where=text("demanda_id IS NOT NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    solicitante_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False
    )
    profissional_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profissionais.user_id"), nullable=False
    )
    mensagem: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[StatusContato] = mapped_column(
        SQLEnum(StatusContato, name="status_contato_enum"),
        nullable=False,
        default=StatusContato.pendente,
    )
    origem: Mapped[OrigemContato] = mapped_column(
        SQLEnum(OrigemContato, name="origem_contato_enum"),
        nullable=False,
        default=OrigemContato.busca,
        server_default=OrigemContato.busca.value,
    )
    demanda_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("demandas.id")
    )
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
