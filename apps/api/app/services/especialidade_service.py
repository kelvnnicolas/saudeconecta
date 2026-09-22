from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.especialidade import Especialidade


def list_especialidades(db: Session) -> list[Especialidade]:
    return list(db.scalars(select(Especialidade).order_by(Especialidade.nome)))
