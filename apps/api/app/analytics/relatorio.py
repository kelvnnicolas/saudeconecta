from datetime import UTC, date, datetime

import pandas as pd


def contar_profissionais_por_especialidade(nomes_especialidades: list[str]) -> dict[str, int]:
    if not nomes_especialidades:
        return {}
    return pd.Series(nomes_especialidades).value_counts().to_dict()


def calcular_nota_media_geral(notas: list[int]) -> float | None:
    if not notas:
        return None
    return round(float(pd.Series(notas).mean()), 2)


def contar_volume_contatos_no_periodo(
    datas_criacao: list[datetime], data_inicio: date, data_fim: date
) -> int:
    if not datas_criacao:
        return 0
    datas = pd.Series([d.astimezone(UTC).date() for d in datas_criacao])
    return int(((datas >= data_inicio) & (datas <= data_fim)).sum())
