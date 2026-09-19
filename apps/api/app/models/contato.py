import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class StatusContato(str, enum.Enum):
    pendente = "pendente"
    respondido = "respondido"
    encerrado = "encerrado"


class Contato(Base):
    __tablename__ = "contatos"

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
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
