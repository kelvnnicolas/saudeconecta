from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.models.plano import Plano

PRICE_POR_CODIGO = {"essencial": "stripe_price_essencial", "pro": "stripe_price_pro"}


def sincronizar_planos(db: Session) -> None:
    settings = get_settings()
    for codigo, campo in PRICE_POR_CODIGO.items():
        plano = db.scalar(select(Plano).where(Plano.codigo == codigo))
        if plano is not None:
            plano.stripe_price_id = getattr(settings, campo)
    db.commit()


def main() -> None:
    with SessionLocal() as db:
        sincronizar_planos(db)
    print("stripe_price_id dos planos sincronizado a partir do .env")


if __name__ == "__main__":
    main()
