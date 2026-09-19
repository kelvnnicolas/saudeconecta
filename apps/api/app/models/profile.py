import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class Papel(str, enum.Enum):
    profissional = "profissional"
    empresa = "empresa"


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    papel: Mapped[Papel] = mapped_column(SQLEnum(Papel, name="papel_enum"), nullable=False)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    telefone: Mapped[str | None] = mapped_column(String(20))
    cidade: Mapped[str | None] = mapped_column(String(100))
    estado: Mapped[str | None] = mapped_column(String(2))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
