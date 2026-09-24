import uuid

from fastapi import HTTPException, status
from sqlalchemy import exists, or_, select
from sqlalchemy.orm import Session

from app.models.avaliacao import Avaliacao
from app.models.contato import Contato
from app.schemas.avaliacao import AvaliacaoCreateRequest


def _has_contato_between(db: Session, autor_id: uuid.UUID, alvo_id: uuid.UUID) -> bool:
    query = select(
        exists().where(
            or_(
                (Contato.solicitante_id == autor_id) & (Contato.profissional_id == alvo_id),
                (Contato.profissional_id == autor_id) & (Contato.solicitante_id == alvo_id),
            )
        )
    )
    return bool(db.scalar(query))


def create_avaliacao(db: Session, autor_id: uuid.UUID, data: AvaliacaoCreateRequest) -> Avaliacao:
    if autor_id == data.alvo_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Você não pode avaliar a si mesmo"
        )
    if not _has_contato_between(db, autor_id, data.alvo_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você só pode avaliar quem teve um contato registrado com você",
        )

    avaliacao = Avaliacao(
        autor_id=autor_id, alvo_id=data.alvo_id, nota=data.nota, comentario=data.comentario
    )
    db.add(avaliacao)
    db.commit()
    db.refresh(avaliacao)
    return avaliacao


def list_avaliacoes_by_alvo(db: Session, alvo_id: uuid.UUID) -> list[Avaliacao]:
    return list(
        db.scalars(
            select(Avaliacao)
            .where(Avaliacao.alvo_id == alvo_id)
            .order_by(Avaliacao.criado_em.desc())
        )
    )
