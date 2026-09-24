import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Text, text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.plano import Plano


class StatusAssinatura(str, enum.Enum):
    incomplete = "incomplete"
    trialing = "trialing"
    active = "active"
    past_due = "past_due"
    canceled = "canceled"
    unpaid = "unpaid"
    incomplete_expired = "incomplete_expired"
    paused = "paused"


STATUS_ENCERRADOS = (StatusAssinatura.canceled, StatusAssinatura.incomplete_expired)


class Assinatura(Base):
    __tablename__ = "assinaturas"
    __table_args__ = (
        Index(
            "uq_assinaturas_empresa_vigente",
            "empresa_id",
            unique=True,
            postgresql_where=text("status NOT IN ('canceled', 'incomplete_expired')"),
        ),
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
    plano_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("planos.id"), nullable=False
    )
    stripe_customer_id: Mapped[str] = mapped_column(Text, nullable=False)
    stripe_subscription_id: Mapped[str | None] = mapped_column(Text, unique=True)
    stripe_checkout_session_id: Mapped[str | None] = mapped_column(Text)
    status: Mapped[StatusAssinatura] = mapped_column(
        SQLEnum(StatusAssinatura, name="status_assinatura_enum"),
        nullable=False,
        default=StatusAssinatura.incomplete,
        server_default=StatusAssinatura.incomplete.value,
    )
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancel_at_period_end: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    plano: Mapped[Plano] = relationship()
