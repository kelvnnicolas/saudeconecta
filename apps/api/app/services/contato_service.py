import uuid

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.contato import Contato
from app.models.profile import Profile
from app.models.profissional import Profissional
from app.schemas.contato import ContatoCreateRequest
from app.services.email_service import send_contact_notification_email


def create_contato(db: Session, solicitante_id: uuid.UUID, data: ContatoCreateRequest) -> Contato:
    solicitante = db.get(Profile, solicitante_id)
    if solicitante is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sincronize seu perfil primeiro via POST /auth/sync",
        )

    profissional = db.get(Profissional, data.profissional_id)
    if profissional is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profissional não encontrado"
        )

    contato = Contato(
        solicitante_id=solicitante_id,
        profissional_id=data.profissional_id,
        mensagem=data.mensagem,
    )
    db.add(contato)
    db.commit()
    db.refresh(contato)

    if profissional.profile.email:
        send_contact_notification_email(profissional.profile.email, solicitante.nome, data.mensagem)

    return contato


def list_own_contatos(db: Session, user_id: uuid.UUID) -> list[Contato]:
    return list(
        db.scalars(
            select(Contato)
            .where(or_(Contato.solicitante_id == user_id, Contato.profissional_id == user_id))
            .order_by(Contato.criado_em.desc())
        )
    )
