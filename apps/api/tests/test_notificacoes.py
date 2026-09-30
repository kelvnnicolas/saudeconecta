import uuid
from unittest.mock import patch

from app.models.notificacao import TipoNotificacao
from app.services.notificacao_service import registrar_notificacao
from tests.fabrica import autenticar, criar_notificacao, criar_profissional


def test_listar_notificacoes_retorna_so_as_proprias(client, db_session):
    user_a = criar_profissional(db_session)
    user_b = criar_profissional(db_session, nome="Outro")
    criar_notificacao(db_session, destinatario_id=user_a, titulo="Pra A")
    criar_notificacao(db_session, destinatario_id=user_b, titulo="Pra B")
    db_session.commit()

    autenticar(user_a)
    resposta = client.get("/notificacoes")

    assert resposta.status_code == 200
    body = resposta.json()
    assert body["total"] == 1
    assert body["items"][0]["titulo"] == "Pra A"


def test_listar_notificacoes_conta_nao_lidas_corretamente(client, db_session):
    user_id = criar_profissional(db_session)
    criar_notificacao(db_session, destinatario_id=user_id)
    criar_notificacao(db_session, destinatario_id=user_id)
    from datetime import UTC, datetime

    criar_notificacao(db_session, destinatario_id=user_id, lida_em=datetime.now(UTC))
    db_session.commit()

    autenticar(user_id)
    resposta = client.get("/notificacoes")

    body = resposta.json()
    assert body["total"] == 3
    assert body["total_nao_lidas"] == 2


def test_listar_notificacoes_requires_authentication(client):
    resposta = client.get("/notificacoes")
    assert resposta.status_code == 401


def test_listar_notificacoes_respeita_limit_e_offset(client, db_session):
    user_id = criar_profissional(db_session)
    criar_notificacao(db_session, destinatario_id=user_id, titulo="Primeira")
    criar_notificacao(db_session, destinatario_id=user_id, titulo="Segunda")
    db_session.commit()

    autenticar(user_id)
    resposta = client.get("/notificacoes", params={"limit": 1, "offset": 0})

    body = resposta.json()
    assert body["total"] == 2
    assert len(body["items"]) == 1
    # mais recente primeiro — "Segunda" foi criada depois
    assert body["items"][0]["titulo"] == "Segunda"


def test_marcar_lida_marca_a_propria(client, db_session):
    user_id = criar_profissional(db_session)
    notificacao = criar_notificacao(db_session, destinatario_id=user_id)
    db_session.commit()

    autenticar(user_id)
    resposta = client.post(f"/notificacoes/{notificacao.id}/marcar-lida")

    assert resposta.status_code == 200
    assert resposta.json()["lida_em"] is not None


def test_marcar_lida_de_outro_usuario_recebe_404(client, db_session):
    dono = criar_profissional(db_session)
    outro = criar_profissional(db_session, nome="Outro")
    notificacao = criar_notificacao(db_session, destinatario_id=dono)
    db_session.commit()

    autenticar(outro)
    resposta = client.post(f"/notificacoes/{notificacao.id}/marcar-lida")

    assert resposta.status_code == 404
    assert resposta.json()["detail"]["code"] == "notificacao_inexistente"


def test_marcar_lida_inexistente_recebe_404(client, db_session):
    user_id = criar_profissional(db_session)
    db_session.commit()

    autenticar(user_id)
    resposta = client.post("/notificacoes/999999/marcar-lida")

    assert resposta.status_code == 404


def test_marcar_lida_e_idempotente(client, db_session):
    user_id = criar_profissional(db_session)
    notificacao = criar_notificacao(db_session, destinatario_id=user_id)
    db_session.commit()

    autenticar(user_id)
    primeira = client.post(f"/notificacoes/{notificacao.id}/marcar-lida")
    timestamp_original = primeira.json()["lida_em"]

    segunda = client.post(f"/notificacoes/{notificacao.id}/marcar-lida")

    assert segunda.status_code == 200
    assert segunda.json()["lida_em"] == timestamp_original


@patch("app.services.notificacao_service.sentry_sdk.capture_exception")
def test_registrar_notificacao_falha_e_capturada_no_sentry_sem_lancar(capture, db_session):
    # destinatario_id não existe em profiles — viola a FK no flush, um jeito
    # realista de forçar a falha interna que o try/except deve engolir.
    resultado = registrar_notificacao(
        db_session,
        destinatario_id=uuid.uuid4(),
        tipo=TipoNotificacao.novo_contato,
        titulo="Teste",
        corpo="Teste",
        link="/x",
    )

    assert resultado is None
    capture.assert_called_once()


def test_marcar_todas_lidas_marca_so_as_proprias_nao_lidas(client, db_session):
    user_id = criar_profissional(db_session)
    outro = criar_profissional(db_session, nome="Outro")
    criar_notificacao(db_session, destinatario_id=user_id)
    criar_notificacao(db_session, destinatario_id=user_id)
    criar_notificacao(db_session, destinatario_id=outro)
    db_session.commit()

    autenticar(user_id)
    resposta = client.post("/notificacoes/marcar-todas-lidas")

    assert resposta.status_code == 200
    assert resposta.json()["marcadas"] == 2

    segunda_listagem = client.get("/notificacoes")
    assert segunda_listagem.json()["total_nao_lidas"] == 0

    autenticar(outro)
    listagem_outro = client.get("/notificacoes")
    assert listagem_outro.json()["total_nao_lidas"] == 1
