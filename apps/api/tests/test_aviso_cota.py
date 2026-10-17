from unittest.mock import patch

from app.models.assinatura import StatusAssinatura
from tests.test_cota_mensal import _cenario, _contatar, _publicar

QUASE = "cota_quase_no_limite"
ESGOTADA = "cota_esgotada"


def _tipos_de_aviso(client):
    itens = client.get("/notificacoes").json()["items"]
    return [n["tipo"] for n in itens if n["tipo"] in (QUASE, ESGOTADA)]


def test_gratis_recebe_aviso_ao_chegar_a_80_por_cento(client, db_session):
    _, profissional_id = _cenario(db_session, usos_contato=3)  # o próximo é o 4º de 5

    assert _contatar(client, profissional_id).status_code in (200, 201)

    assert _tipos_de_aviso(client) == [QUASE]
    aviso = client.get("/notificacoes").json()["items"][0]
    assert "4 de 5" in aviso["corpo"]
    assert aviso["link"] == "/empresa/planos"


def test_gratis_recebe_aviso_ao_esgotar_a_cota(client, db_session):
    _, profissional_id = _cenario(db_session, usos_contato=4)  # o próximo é o 5º de 5

    assert _contatar(client, profissional_id).status_code in (200, 201)

    assert _tipos_de_aviso(client) == [ESGOTADA]


def test_abaixo_de_80_por_cento_nao_avisa(client, db_session):
    _, profissional_id = _cenario(db_session, usos_contato=1)  # vira 2 de 5

    assert _contatar(client, profissional_id).status_code in (200, 201)

    assert _tipos_de_aviso(client) == []


def test_publicar_demanda_tambem_dispara_o_aviso(client, db_session):
    _cenario(db_session, usos_contato=2, usos_demanda=1)  # a demanda vira o 4º de 5

    assert _publicar(client, db_session).status_code in (200, 201)

    assert _tipos_de_aviso(client) == [QUASE]


def test_chegar_a_80_e_depois_esgotar_gera_um_aviso_de_cada_faixa(client, db_session):
    _, profissional_id = _cenario(db_session, usos_contato=3)

    _contatar(client, profissional_id)  # 4 de 5
    _contatar(client, profissional_id)  # 5 de 5

    assert sorted(_tipos_de_aviso(client)) == [ESGOTADA, QUASE]


def test_aviso_de_faixa_nao_se_repete_no_mesmo_mes(client, db_session):
    _, profissional_id = _cenario(db_session, plano="essencial", usos_contato=39)

    _contatar(client, profissional_id)  # 40 de 50: entra na faixa de 80%
    _contatar(client, profissional_id)  # 41 de 50: mesma faixa, não repete
    _contatar(client, profissional_id)  # 42 de 50

    assert _tipos_de_aviso(client) == [QUASE]


def test_essencial_aponta_para_a_assinatura_e_nao_para_os_planos(client, db_session):
    _, profissional_id = _cenario(db_session, plano="essencial", usos_contato=39)

    _contatar(client, profissional_id)

    aviso = client.get("/notificacoes").json()["items"][0]
    assert aviso["link"] == "/assinatura"


def test_pro_nao_tem_limite_e_nao_recebe_aviso(client, db_session):
    _, profissional_id = _cenario(db_session, plano="pro", usos_contato=60)

    assert _contatar(client, profissional_id).status_code in (200, 201)

    assert _tipos_de_aviso(client) == []


def test_falha_no_aviso_nao_impede_o_contato(client, db_session):
    _, profissional_id = _cenario(db_session, usos_contato=3)

    with (
        patch("app.services.aviso_cota.contar_uso_mensal", side_effect=RuntimeError("falha")),
        patch("app.services.aviso_cota.sentry_sdk.capture_exception") as sentry,
    ):
        resposta = _contatar(client, profissional_id)

    assert resposta.status_code in (200, 201)
    sentry.assert_called_once()


def test_pagamento_pendente_continua_bloqueando_sem_aviso(client, db_session):
    _, profissional_id = _cenario(
        db_session, plano="essencial", usos_contato=39, status=StatusAssinatura.past_due
    )

    assert _contatar(client, profissional_id).status_code == 402
    assert _tipos_de_aviso(client) == []
