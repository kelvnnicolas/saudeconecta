import enum
import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TipoEmpresa(str, enum.Enum):
    clinica = "clinica"
    hospital = "hospital"
    homecare = "homecare"
    pessoa_fisica = "pessoa_fisica"


class Empresa(Base):
    __tablename__ = "empresas"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), primary_key=True
    )
    nome_fantasia: Mapped[str] = mapped_column(String(255), nullable=False)
    tipo: Mapped[TipoEmpresa] = mapped_column(
        SQLEnum(TipoEmpresa, name="tipo_empresa_enum"), nullable=False
    )
    cidade: Mapped[str | None] = mapped_column(String(100))
    estado: Mapped[str | None] = mapped_column(String(2))
