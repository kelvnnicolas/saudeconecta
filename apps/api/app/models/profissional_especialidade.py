from sqlalchemy import Column, ForeignKey, Table

from app.core.database import Base

profissional_especialidades = Table(
    "profissional_especialidades",
    Base.metadata,
    Column("profissional_id", ForeignKey("profissionais.user_id"), primary_key=True),
    Column("especialidade_id", ForeignKey("especialidades.id"), primary_key=True),
)
