import uuid

from sqlalchemy import Boolean, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.especialidade import Especialidade
from app.models.profissional_especialidade import profissional_especialidades


class Profissional(Base):
    __tablename__ = "profissionais"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id"), primary_key=True
    )
    registro_profissional: Mapped[str | None] = mapped_column(String(100))
    bio: Mapped[str | None] = mapped_column(Text)
    preco_hora: Mapped[float | None] = mapped_column(Numeric(10, 2))
    verificado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    especialidades: Mapped[list[Especialidade]] = relationship(
        secondary=profissional_especialidades
    )
