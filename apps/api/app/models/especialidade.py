from sqlalchemy import Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Especialidade(Base):
    __tablename__ = "especialidades"
    __table_args__ = (
        Index(
            "ix_especialidades_nome_trgm",
            "nome",
            postgresql_using="gin",
            postgresql_ops={"nome": "gin_trgm_ops"},
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
