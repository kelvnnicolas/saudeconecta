from fastapi import Depends, status
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.errors import erro_negocio
from app.models.verificacao import Administrador


def eh_admin(db: Session, user_id) -> bool:
    return db.get(Administrador, user_id) is not None


def exigir_admin(
    current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)
) -> CurrentUser:
    """Só quem está em `administradores` passa. Conferido no servidor a cada chamada."""
    if not eh_admin(db, current_user.id):
        raise erro_negocio(
            status.HTTP_403_FORBIDDEN, "apenas_admin", "Recurso disponível só para administradores"
        )
    return current_user
