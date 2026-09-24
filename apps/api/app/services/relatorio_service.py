from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.analytics.relatorio import (
    calcular_nota_media_geral,
    contar_profissionais_por_especialidade,
    contar_volume_contatos_no_periodo,
)
from app.models.avaliacao import Avaliacao
from app.models.contato import Contato
from app.models.especialidade import Especialidade
from app.models.profissional_especialidade import profissional_especialidades
from app.schemas.analytics import RelatorioResponse


def gerar_relatorio(db: Session, data_inicio: date, data_fim: date) -> RelatorioResponse:
    if data_fim < data_inicio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="data_fim não pode ser anterior a data_inicio",
        )

    nomes_especialidades = list(
        db.scalars(
            select(Especialidade.nome).join(
                profissional_especialidades,
                profissional_especialidades.c.especialidade_id == Especialidade.id,
            )
        )
    )
    notas = list(db.scalars(select(Avaliacao.nota)))
    datas_contatos = list(db.scalars(select(Contato.criado_em)))

    return RelatorioResponse(
        data_inicio=data_inicio,
        data_fim=data_fim,
        profissionais_por_especialidade=contar_profissionais_por_especialidade(
            nomes_especialidades
        ),
        nota_media_geral=calcular_nota_media_geral(notas),
        volume_contatos_periodo=contar_volume_contatos_no_periodo(
            datas_contatos, data_inicio, data_fim
        ),
    )
