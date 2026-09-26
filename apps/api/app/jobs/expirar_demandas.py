from sqlalchemy import func, update
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.demanda import Demanda, StatusDemanda


def expirar_demandas(db: Session) -> int:
    resultado = db.execute(
        update(Demanda)
        .where(Demanda.status == StatusDemanda.aberta, Demanda.expira_em <= func.now())
        .values(status=StatusDemanda.expirada)
    )
    db.commit()
    return resultado.rowcount


def main() -> None:
    with SessionLocal() as db:
        total = expirar_demandas(db)
    print(f"{total} demanda(s) marcada(s) como expirada(s)")


if __name__ == "__main__":
    main()
