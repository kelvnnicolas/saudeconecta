from datetime import UTC, datetime, timedelta

import pytest

from app.models.assinatura import StatusAssinatura
from app.models.contato import OrigemContato
from app.models.empresa import TipoEmpresa
from tests.fabrica import (
    autenticar,
    criar_assinatura,
    criar_contato,
    criar_demanda,
    criar_empresa,
    criar_profissional,
    payload_demanda,
)

MENSAGEM_LIMITE = "Você atingiu o limite de contatos e demandas do seu plano neste mês."


def _contatar(client, profissional_id):
    return client.post(
        "/contatos", json={"profissional_id": str(profissional_id), "mensagem": "Olá, tudo bem?"}
    )


def _publicar(client, db_session):
    return client.post("/demandas", json=payload_demanda(db_session))


def _cenario(db_session, usos_contato=0, usos_demanda=0, plano=None, status=None, tipo=None):
    empresa_id = criar_empresa(db_session, tipo=tipo or TipoEmpresa.clinica)
    profissional_id = criar_profissional(db_session)
    if plano:
        criar_assinatura(
            db_session, empresa_id, plano_codigo=plano, status=status or StatusAssinatura.active
        )
    for _ in range(usos_contato):
        criar_contato(db_session, empresa_id, profissional_id)
    for _ in range(usos_demanda):
        criar_demanda(db_session, empresa_id)
    db_session.commit()
    autenticar(empresa_id)
    return empresa_id, profissional_id


def _inicio_do_mes():
    return datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def test_gratis_permite_publicar_demanda_sem_assinatura(client, db_session):
    _cenario(db_session)

    assert _publicar(client, db_session).status_code in (200, 201)


def test_gratis_bloqueia_o_sexto_contato(client, db_session):
    _, profissional_id = _cenario(db_session, usos_contato=5)

    resposta = _contatar(client, profissional_id)

    assert resposta.status_code == 409
    assert resposta.json()["detail"] == {
        "code": "limite_atingido",
        "mensagem": MENSAGEM_LIMITE,
        "uso": 5,
        "limite": 5,
    }


def test_gratis_soma_contatos_e_demandas_na_mesma_cota(client, db_session):
    _, profissional_id = _cenario(db_session, usos_contato=3, usos_demanda=2)

    assert _contatar(client, profissional_id).status_code == 409
    assert _publicar(client, db_session).status_code == 409


def test_contato_bloqueado_nao_cria_registro_nem_conta(client, db_session):
    _, profissional_id = _cenario(db_session, usos_contato=5)

    _contatar(client, profissional_id)
    resposta = client.get("/assinaturas/me")

    assert resposta.json()["uso"] == {"usado": 5, "limite": 5}


def test_uso_do_mes_anterior_nao_conta(client, db_session):
    empresa_id = criar_empresa(db_session)
    profissional_id = criar_profissional(db_session)
    mes_passado = _inicio_do_mes() - timedelta(seconds=1)
    for _ in range(5):
        criar_contato(db_session, empresa_id, profissional_id, criado_em=mes_passado)
    for _ in range(5):
        criar_demanda(db_session, empresa_id, criado_em=mes_passado)
    db_session.commit()
    autenticar(empresa_id)

    assert _contatar(client, profissional_id).status_code == 200


def test_interesse_recebido_de_profissionais_nao_gasta_a_cota(client, db_session):
    empresa_id = criar_empresa(db_session)
    profissional_id = criar_profissional(db_session)
    for _ in range(5):
        criar_contato(
            db_session, empresa_id, criar_profissional(db_session), origem=OrigemContato.demanda
        )
    db_session.commit()
    autenticar(empresa_id)

    assert _contatar(client, profissional_id).status_code == 200


def test_pessoa_fisica_tem_o_mesmo_limite_gratis_de_contatos(client, db_session):
    _, profissional_id = _cenario(db_session, usos_contato=5, tipo=TipoEmpresa.pessoa_fisica)

    assert _contatar(client, profissional_id).status_code == 409


def test_essencial_vai_ate_50_no_mes(client, db_session):
    _, profissional_id = _cenario(db_session, usos_contato=49, plano="essencial")

    assert _contatar(client, profissional_id).status_code == 200
    resposta = _contatar(client, profissional_id)

    assert resposta.status_code == 409
    assert resposta.json()["detail"]["limite"] == 50
    assert resposta.json()["detail"]["uso"] == 50


def test_pro_e_ilimitado(client, db_session):
    _, profissional_id = _cenario(db_session, usos_contato=60, usos_demanda=10, plano="pro")

    assert _contatar(client, profissional_id).status_code == 200
    assert _publicar(client, db_session).status_code in (200, 201)


def test_past_due_bloqueia_contato_e_demanda(client, db_session):
    _, profissional_id = _cenario(db_session, plano="essencial", status=StatusAssinatura.past_due)

    contato = _contatar(client, profissional_id)
    demanda = _publicar(client, db_session)

    assert contato.status_code == 402
    assert contato.json()["detail"]["code"] == "pagamento_pendente"
    assert demanda.status_code == 402
    assert demanda.json()["detail"]["code"] == "pagamento_pendente"


@pytest.mark.parametrize(
    "status",
    [
        StatusAssinatura.incomplete,
        StatusAssinatura.unpaid,
        StatusAssinatura.paused,
        StatusAssinatura.canceled,
        StatusAssinatura.incomplete_expired,
    ],
)
def test_assinatura_sem_efeito_cai_no_limite_gratis(client, db_session, status):
    _, profissional_id = _cenario(db_session, usos_contato=5, plano="pro", status=status)

    resposta = _contatar(client, profissional_id)

    assert resposta.status_code == 409
    assert resposta.json()["detail"]["limite"] == 5


def test_uso_no_plano_gratis_aparece_em_assinaturas_me(client, db_session):
    _cenario(db_session, usos_contato=2, usos_demanda=1)

    corpo = client.get("/assinaturas/me").json()

    assert corpo["plano"] is None
    assert corpo["uso"] == {"usado": 3, "limite": 5}


def test_uso_no_pro_nao_tem_limite(client, db_session):
    _cenario(db_session, usos_contato=2, plano="pro")

    corpo = client.get("/assinaturas/me").json()

    assert corpo["uso"] == {"usado": 2, "limite": None}
