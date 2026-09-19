from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Especialidade(Base):
    __tablename__ = "especialidades"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
