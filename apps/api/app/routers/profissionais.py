import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.rate_limit import limiter
from app.schemas.busca import ProfissionalSearchResponse, ProfissionalSearchResult
from app.schemas.profissional import ProfissionalRead, ProfissionalUpdateRequest
from app.schemas.verificacao import VerificacaoPropriaRead
from app.services.profissional_service import (
    get_profissional_by_id,
    search_profissionais,
    to_profissional_read,
    upsert_profissional,
)
from app.services.verificacao_service import estado_do_proprio_profissional, solicitar_conferencia

router = APIRouter(prefix="/profissionais", tags=["profissionais"])


@router.get("", response_model=ProfissionalSearchResponse)
@limiter.limit("30/minute")
def search_profissionais_route(
    request: Request,
    q: str | None = None,
    cidade: str | None = None,
    estado: str | None = None,
    preco_min: float | None = None,
    preco_max: float | None = None,
    nota_min: float | None = Query(default=None, ge=1, le=5),
    verificado: bool | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> ProfissionalSearchResponse:
    results, total = search_profissionais(
        db, q, cidade, estado, preco_min, preco_max, nota_min, limit, offset, verificado
    )
    items = [
        ProfissionalSearchResult(
            user_id=profissional.user_id,
            nome=profissional.profile.nome,
            cidade=profissional.profile.cidade,
            estado=profissional.profile.estado,
            avatar_url=profissional.profile.avatar_url,
            bio=profissional.bio,
            preco_hora=(
                float(profissional.preco_hora) if profissional.preco_hora is not None else None
            ),
            verificado=profissional.verificado,
            nota_media=float(nota_media) if nota_media is not None else None,
        )
        for profissional, nota_media in results
    ]
    return ProfissionalSearchResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{user_id}", response_model=ProfissionalRead)
def get_profissional(user_id: uuid.UUID, db: Session = Depends(get_db)) -> ProfissionalRead:
    profissional = get_profissional_by_id(db, user_id)
    if profissional is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Profissional não encontrado"
        )
    return to_profissional_read(profissional)


@router.put("/me", response_model=ProfissionalRead)
def update_own_profissional(
    data: ProfissionalUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProfissionalRead:
    profissional = upsert_profissional(db, current_user.id, data)
    return to_profissional_read(profissional)


@router.get("/me/verificacao", response_model=VerificacaoPropriaRead)
def get_own_verificacao(
    current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)
) -> VerificacaoPropriaRead:
    """Estado completo, só para o dono: pendente, irregular e não localizado não são públicos."""
    estado, verificado_em = estado_do_proprio_profissional(db, current_user.id)
    return VerificacaoPropriaRead(status=estado, verificado_em=verificado_em)


@router.post("/me/verificacao/solicitar", response_model=VerificacaoPropriaRead)
@limiter.limit("10/minute")
def solicitar_verificacao(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> VerificacaoPropriaRead:
    """Pede a conferência do registro. Não dá selo: só avisa o administrador."""
    solicitar_conferencia(db, current_user.id)
    estado, verificado_em = estado_do_proprio_profissional(db, current_user.id)
    return VerificacaoPropriaRead(status=estado, verificado_em=verificado_em)
