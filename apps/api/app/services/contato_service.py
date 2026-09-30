import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import erro_negocio
from app.models.contato import Contato
from app.models.mensagem_contato import MensagemContato
from app.models.notificacao import TipoNotificacao
from app.models.profile import Profile
from app.models.profissional import Profissional
from app.schemas.contato import ContatoCreateRequest
from app.services import email_templates
from app.services.email_service import enviar_email, send_contact_notification_email
from app.services.notificacao_service import registrar_notificacao


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

    registrar_notificacao(
        db,
        destinatario_id=data.profissional_id,
        tipo=TipoNotificacao.novo_contato,
        titulo="Novo contato recebido",
        corpo=f"{solicitante.nome} enviou uma mensagem.",
        link=f"/contatos/{contato.id}",
    )

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


def _contato_das_partes(db: Session, contato_id: int, user_id: uuid.UUID) -> Contato:
    contato = db.get(Contato, contato_id)
    if contato is None:
        raise erro_negocio(
            status.HTTP_404_NOT_FOUND, "contato_inexistente", "Contato não encontrado"
        )
    if user_id not in (contato.solicitante_id, contato.profissional_id):
        raise erro_negocio(
            status.HTTP_403_FORBIDDEN, "nao_participante", "Você não faz parte deste contato"
        )
    return contato


def listar_mensagens(db: Session, user_id: uuid.UUID, contato_id: int) -> list[MensagemContato]:
    _contato_das_partes(db, contato_id, user_id)
    return list(
        db.scalars(
            select(MensagemContato)
            .where(MensagemContato.contato_id == contato_id)
            .order_by(MensagemContato.criado_em)
        )
    )


def criar_mensagem(db: Session, user_id: uuid.UUID, contato_id: int, corpo: str) -> MensagemContato:
    contato = _contato_das_partes(db, contato_id, user_id)
    mensagem = MensagemContato(contato_id=contato_id, autor_id=user_id, corpo=corpo)
    db.add(mensagem)
    db.commit()
    db.refresh(mensagem)

    destinatario_id = (
        contato.profissional_id if user_id == contato.solicitante_id else contato.solicitante_id
    )
    registrar_notificacao(
        db,
        destinatario_id=destinatario_id,
        tipo=TipoNotificacao.nova_mensagem,
        titulo="Nova mensagem recebida",
        corpo=corpo[:200],
        link=f"/contatos/{contato_id}",
    )
    destinatario_profile = db.get(Profile, destinatario_id)
    if destinatario_profile is not None and destinatario_profile.email:
        link = f"{get_settings().app_url}/contatos/{contato_id}"
        enviar_email(destinatario_profile.email, *email_templates.nova_mensagem_recebida(link))

    return mensagem


def aceitar_demanda_direta(db: Session, user_id: uuid.UUID, contato_id: int) -> Contato:
    contato = _contato_das_partes(db, contato_id, user_id)
    if user_id != contato.profissional_id:
        raise erro_negocio(
            status.HTTP_403_FORBIDDEN,
            "apenas_profissional_aceita",
            "Só o profissional pode aceitar a demanda direta",
        )
    if contato.aceito_em is None:
        contato.aceito_em = datetime.now(UTC)
        db.commit()
        db.refresh(contato)

        registrar_notificacao(
            db,
            destinatario_id=contato.solicitante_id,
            tipo=TipoNotificacao.aceite_demanda,
            titulo="Demanda direta aceita",
            corpo="O profissional aceitou atender sua demanda direta.",
            link=f"/contatos/{contato_id}",
        )
        solicitante_profile = db.get(Profile, contato.solicitante_id)
        if solicitante_profile is not None and solicitante_profile.email:
            link = f"{get_settings().app_url}/contatos/{contato_id}"
            enviar_email(solicitante_profile.email, *email_templates.aceite_demanda_direta(link))

    return contato
