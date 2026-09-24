from datetime import date

from pydantic import BaseModel


class RelatorioResponse(BaseModel):
    data_inicio: date
    data_fim: date
    profissionais_por_especialidade: dict[str, int]
    nota_media_geral: float | None
    volume_contatos_periodo: int
