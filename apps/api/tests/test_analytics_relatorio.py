from datetime import UTC, date, datetime, timedelta, timezone

from app.analytics.relatorio import (
    calcular_nota_media_geral,
    contar_profissionais_por_especialidade,
    contar_volume_contatos_no_periodo,
)


def test_contar_profissionais_por_especialidade_empty_list():
    assert contar_profissionais_por_especialidade([]) == {}


def test_contar_profissionais_por_especialidade_counts_occurrences():
    resultado = contar_profissionais_por_especialidade(
        ["Enfermagem", "Fisioterapia", "Enfermagem", "Enfermagem", "Fisioterapia"]
    )
    assert resultado == {"Enfermagem": 3, "Fisioterapia": 2}


def test_calcular_nota_media_geral_empty_list_returns_none():
    assert calcular_nota_media_geral([]) is None


def test_calcular_nota_media_geral_rounds_to_two_decimals():
    assert calcular_nota_media_geral([5, 4, 4]) == 4.33


def test_calcular_nota_media_geral_exact_average():
    assert calcular_nota_media_geral([5, 4, 3, 4]) == 4.0


def test_contar_volume_contatos_no_periodo_empty_list_returns_zero():
    assert contar_volume_contatos_no_periodo([], date(2026, 1, 1), date(2026, 1, 31)) == 0


def test_contar_volume_contatos_no_periodo_includes_boundary_dates():
    datas = [
        datetime(2026, 1, 1, 0, 0, tzinfo=UTC),
        datetime(2026, 1, 31, 23, 59, tzinfo=UTC),
    ]
    assert contar_volume_contatos_no_periodo(datas, date(2026, 1, 1), date(2026, 1, 31)) == 2


def test_contar_volume_contatos_no_periodo_excludes_dates_outside_range():
    datas = [
        datetime(2025, 12, 31, 12, 0, tzinfo=UTC),
        datetime(2026, 1, 15, 12, 0, tzinfo=UTC),
        datetime(2026, 2, 1, 0, 0, tzinfo=UTC),
    ]
    assert contar_volume_contatos_no_periodo(datas, date(2026, 1, 1), date(2026, 1, 31)) == 1


def test_contar_volume_contatos_no_periodo_normalizes_non_utc_offsets_to_utc():
    fuso_brasil = timezone(timedelta(hours=-3))
    data_meia_noite_utc_seguinte = datetime(2026, 1, 31, 22, 0, tzinfo=fuso_brasil)

    resultado = contar_volume_contatos_no_periodo(
        [data_meia_noite_utc_seguinte], date(2026, 1, 1), date(2026, 1, 31)
    )

    assert resultado == 0
