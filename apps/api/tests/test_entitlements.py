from datetime import UTC, datetime, timedelta

import pytest

from app.models.assinatura import StatusAssinatura
from app.models.empresa import TipoEmpresa
from tests.fabrica import (
    autenticar,
    criar_assinatura,
    criar_demanda,
    criar_empresa,
    criar_profissional,
    payload_demanda,
)


def _publicar(client, db_session):
    return client.post("/demandas", json=payload_demanda(db_session))


def test_publicar_exige_autenticacao(client, db_session):
    assert _publicar(client, db_session).status_code == 401


def test_perfil_que_nao_e_empresa_recebe_403_nao_elegivel(client, db_session):
    profissional_id = criar_profissional(db_session)
    db_session.commit()
    autenticar(profissional_id)

    response = _publicar(client, db_session)

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "nao_elegivel"


def test_empresa_pessoa_fisica_recebe_403_nao_elegivel(client, db_session):
    empresa_id = criar_empresa(db_session, tipo=TipoEmpresa.pessoa_fisica)
    criar_assinatura(db_session, empresa_id)
    db_session.commit()
    autenticar(empresa_id)

    response = _publicar(client, db_session)

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "nao_elegivel"


def test_empresa_sem_assinatura_recebe_402_assinatura_necessaria(client, db_session):
    empresa_id = criar_empresa(db_session)
    db_session.commit()
    autenticar(empresa_id)

    response = _publicar(client, db_session)

    assert response.status_code == 402
    assert response.json()["detail"]["code"] == "assinatura_necessaria"


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
def test_status_fora_de_active_trialing_recebe_402_assinatura_necessaria(
    client, db_session, status
):
    empresa_id = criar_empresa(db_session)
    criar_assinatura(db_session, empresa_id, status=status)
    db_session.commit()
    autenticar(empresa_id)

    response = _publicar(client, db_session)

    assert response.status_code == 402
    assert response.json()["detail"]["code"] == "assinatura_necessaria"


def test_status_past_due_recebe_402_pagamento_pendente(client, db_session):
    empresa_id = criar_empresa(db_session)
    criar_assinatura(db_session, empresa_id, status=StatusAssinatura.past_due)
    db_session.commit()
    autenticar(empresa_id)

    response = _publicar(client, db_session)

    assert response.status_code == 402
    assert response.json()["detail"]["code"] == "pagamento_pendente"


def test_past_due_mantem_demandas_existentes_visiveis(client, db_session):
    empresa_id = criar_empresa(db_session)
    criar_assinatura(db_session, empresa_id, status=StatusAssinatura.past_due)
    criar_demanda(db_session, empresa_id)
    db_session.commit()
    autenticar(empresa_id)

    response = client.get("/demandas/minhas")

    assert response.status_code == 200
    assert len(response.json()) == 1


def test_limite_do_plano_atingido_recebe_409_com_uso_e_limite(client, db_session):
    empresa_id = criar_empresa(db_session)
    criar_assinatura(db_session, empresa_id, plano_codigo="essencial")
    for _ in range(5):
        criar_demanda(db_session, empresa_id)
    db_session.commit()
    autenticar(empresa_id)

    response = _publicar(client, db_session)

    assert response.status_code == 409
    assert response.json()["detail"] == {
        "code": "limite_atingido",
        "mensagem": "Você atingiu o limite de demandas abertas do seu plano.",
        "uso": 5,
        "limite": 5,
    }


def test_demandas_expiradas_nao_contam_para_o_limite(client, db_session):
    empresa_id = criar_empresa(db_session)
    criar_assinatura(db_session, empresa_id, plano_codigo="essencial")
    for _ in range(4):
        criar_demanda(db_session, empresa_id)
    criar_demanda(db_session, empresa_id, expira_em=datetime.now(UTC) - timedelta(minutes=1))
    db_session.commit()
    autenticar(empresa_id)

    assert _publicar(client, db_session).status_code == 201


@pytest.mark.parametrize("status", [StatusAssinatura.active, StatusAssinatura.trialing])
def test_assinatura_active_ou_trialing_permite_publicar(client, db_session, status):
    empresa_id = criar_empresa(db_session)
    criar_assinatura(db_session, empresa_id, status=status)
    db_session.commit()
    autenticar(empresa_id)

    response = _publicar(client, db_session)

    assert response.status_code == 201
    assert response.json()["status"] == "aberta"


def test_plano_sem_limite_permite_publicar_alem_de_cinco(client, db_session):
    empresa_id = criar_empresa(db_session)
    criar_assinatura(db_session, empresa_id, plano_codigo="pro")
    for _ in range(6):
        criar_demanda(db_session, empresa_id)
    db_session.commit()
    autenticar(empresa_id)

    assert _publicar(client, db_session).status_code == 201
