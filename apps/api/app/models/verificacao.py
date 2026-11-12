import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base

METODO_CONSULTA_MANUAL = "consulta_manual_fonte_oficial"


class StatusVerificacao(str, enum.Enum):
    unverified = "unverified"
    pending = "pending"
    verified = "verified"
    irregular = "irregular"
    unable_to_verify = "unable_to_verify"


class AtorVerificacao(str, enum.Enum):
    profissional = "profissional"
    administrador = "administrador"
    sistema = "sistema"


class Administrador(Base):
    """Quem pode registrar conferências. O primeiro é criado por SQL (ver o desenho do F-031)."""

    __tablename__ = "administradores"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class VerificacaoRegistro(Base):
    """Trilha de auditoria (só inserção) e fonte do estado atual de verificação.

    O estado atual de um profissional é o `status_novo` da última linha; sem linhas, é
    `unverified`. O estado detalhado vive só aqui (tabela com RLS) e nunca em `profissionais`,
    que o Supabase expõe pela API pública. Sem texto livre, de propósito (minimização de dados).
    """

    __tablename__ = "verificacoes_registro"
    __table_args__ = (Index("ix_verificacoes_registro_profissional_id", "profissional_id", "id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    profissional_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "profissionais.user_id",
            ondelete="CASCADE",
            name="fk_verificacoes_registro_profissional_id",
        ),
        nullable=False,
    )
    status_anterior: Mapped[StatusVerificacao] = mapped_column(
        SQLEnum(StatusVerificacao, name="status_verificacao_enum"), nullable=False
    )
    status_novo: Mapped[StatusVerificacao] = mapped_column(
        SQLEnum(StatusVerificacao, name="status_verificacao_enum"), nullable=False
    )
    conselho: Mapped[str | None] = mapped_column(String(20))
    uf: Mapped[str | None] = mapped_column(String(2))
    numero_registro: Mapped[str | None] = mapped_column(String(40))
    metodo: Mapped[str | None] = mapped_column(String(40))
    fonte: Mapped[str | None] = mapped_column(String(255))
    verificado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ator_tipo: Mapped[AtorVerificacao] = mapped_column(
        SQLEnum(AtorVerificacao, name="ator_verificacao_enum"), nullable=False
    )
    ator_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
