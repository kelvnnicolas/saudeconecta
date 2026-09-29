import uuid
from unittest.mock import patch

from app.core.auth import CurrentUser, get_current_user
from app.main import app
from app.models.contato import Contato
from app.models.profile import Papel, Profile
from app.models.profissional import Profissional
from tests.fabrica import autenticar, criar_contato, criar_empresa, criar_profissional


def test_create_contato_requires_authentication(client):
    response = client.post(
        "/contatos", json={"profissional_id": str(uuid.uuid4()), "mensagem": "Oi"}
    )
    assert response.status_code == 401


def test_create_contato_requires_synced_profile(client):
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=uuid.uuid4(), email="x@example.com", role="authenticated"
    )

    response = client.post(
        "/contatos", json={"profissional_id": str(uuid.uuid4()), "mensagem": "Oi"}
    )
    assert response.status_code == 400


def test_create_contato_returns_404_for_unknown_profissional(client, db_session):
    solicitante_id = uuid.uuid4()
    db_session.add(Profile(id=solicitante_id, papel=Papel.empresa, nome="Clínica X"))
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=solicitante_id, email="x@example.com", role="authenticated"
    )

    response = client.post(
        "/contatos", json={"profissional_id": str(uuid.uuid4()), "mensagem": "Oi"}
    )
    assert response.status_code == 404


@patch("app.services.contato_service.send_contact_notification_email")
def test_create_contato_persists_and_notifies_by_email(mock_send_email, client, db_session):
    solicitante_id = uuid.uuid4()
    db_session.add(Profile(id=solicitante_id, papel=Papel.empresa, nome="Clínica X"))

    profissional_id = uuid.uuid4()
    db_session.add(
        Profile(
            id=profissional_id,
            papel=Papel.profissional,
            nome="Maria Silva",
            email="maria@example.com",
        )
    )
    db_session.flush()
    db_session.add(Profissional(user_id=profissional_id))
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=solicitante_id, email="x@example.com", role="authenticated"
    )

    response = client.post(
        "/contatos",
        json={"profissional_id": str(profissional_id), "mensagem": "Preciso de fisioterapia"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "pendente"
    saved = db_session.get(Contato, body["id"])
    assert saved is not None
    assert saved.mensagem == "Preciso de fisioterapia"

    mock_send_email.assert_called_once_with(
        "maria@example.com", "Clínica X", "Preciso de fisioterapia"
    )


def test_list_own_contatos_requires_authentication(client):
    response = client.get("/contatos")
    assert response.status_code == 401


def test_list_own_contatos_returns_only_own(client, db_session):
    user_a = uuid.uuid4()
    user_b = uuid.uuid4()
    user_c = uuid.uuid4()
    db_session.add_all(
        [
            Profile(id=user_a, papel=Papel.empresa, nome="A"),
            Profile(id=user_b, papel=Papel.profissional, nome="B"),
            Profile(id=user_c, papel=Papel.empresa, nome="C"),
        ]
    )
    db_session.flush()
    db_session.add(Profissional(user_id=user_b))
    db_session.commit()

    db_session.add_all(
        [
            Contato(solicitante_id=user_a, profissional_id=user_b, mensagem="A para B"),
            Contato(solicitante_id=user_c, profissional_id=user_b, mensagem="C para B (não vejo)"),
        ]
    )
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_a, email="a@example.com", role="authenticated"
    )

    response = client.get("/contatos")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["mensagem"] == "A para B"


def test_listar_mensagens_ambas_partes_conseguem_ler(client, db_session):
    solicitante_id = criar_empresa(db_session)
    profissional_id = criar_profissional(db_session)
    contato = criar_contato(db_session, solicitante_id, profissional_id)
    db_session.commit()

    autenticar(solicitante_id)
    resposta = client.get(f"/contatos/{contato.id}/mensagens")
    assert resposta.status_code == 200
    assert resposta.json() == []

    autenticar(profissional_id)
    resposta = client.get(f"/contatos/{contato.id}/mensagens")
    assert resposta.status_code == 200


def test_listar_mensagens_terceiro_recebe_403(client, db_session):
    solicitante_id = criar_empresa(db_session)
    profissional_id = criar_profissional(db_session)
    contato = criar_contato(db_session, solicitante_id, profissional_id)
    outro_usuario = criar_empresa(db_session, nome="Outra Empresa", email="outra@example.com")
    db_session.commit()

    autenticar(outro_usuario)
    resposta = client.get(f"/contatos/{contato.id}/mensagens")
    assert resposta.status_code == 403
    assert resposta.json()["detail"]["code"] == "nao_participante"


def test_listar_mensagens_contato_inexistente_404(client, db_session):
    solicitante_id = criar_empresa(db_session)
    db_session.commit()

    autenticar(solicitante_id)
    resposta = client.get("/contatos/999999/mensagens")
    assert resposta.status_code == 404
    assert resposta.json()["detail"]["code"] == "contato_inexistente"


def test_criar_mensagem_ambas_partes_conseguem_enviar(client, db_session):
    solicitante_id = criar_empresa(db_session)
    profissional_id = criar_profissional(db_session)
    contato = criar_contato(db_session, solicitante_id, profissional_id)
    db_session.commit()

    autenticar(solicitante_id)
    resposta = client.post(f"/contatos/{contato.id}/mensagens", json={"corpo": "Oi, tudo bem?"})
    assert resposta.status_code == 201
    body = resposta.json()
    assert body["corpo"] == "Oi, tudo bem?"
    assert body["autor_id"] == str(solicitante_id)

    autenticar(profissional_id)
    resposta = client.post(f"/contatos/{contato.id}/mensagens", json={"corpo": "Tudo, e você?"})
    assert resposta.status_code == 201
    assert resposta.json()["autor_id"] == str(profissional_id)


def test_criar_mensagem_corpo_vazio_e_rejeitado(client, db_session):
    solicitante_id = criar_empresa(db_session)
    profissional_id = criar_profissional(db_session)
    contato = criar_contato(db_session, solicitante_id, profissional_id)
    db_session.commit()

    autenticar(solicitante_id)
    assert client.post(f"/contatos/{contato.id}/mensagens", json={"corpo": ""}).status_code == 422
    assert client.post(f"/contatos/{contato.id}/mensagens", json={"corpo": "   "}).status_code == 422


def test_criar_mensagem_ignora_autor_id_do_body(client, db_session):
    solicitante_id = criar_empresa(db_session)
    profissional_id = criar_profissional(db_session)
    contato = criar_contato(db_session, solicitante_id, profissional_id)
    db_session.commit()

    autenticar(solicitante_id)
    resposta = client.post(
        f"/contatos/{contato.id}/mensagens",
        json={"corpo": "Oi", "autor_id": str(profissional_id)},
    )
    assert resposta.status_code == 201
    assert resposta.json()["autor_id"] == str(solicitante_id)


def test_criar_mensagem_terceiro_recebe_403(client, db_session):
    solicitante_id = criar_empresa(db_session)
    profissional_id = criar_profissional(db_session)
    contato = criar_contato(db_session, solicitante_id, profissional_id)
    outro_usuario = criar_empresa(db_session, nome="Outra Empresa", email="outra2@example.com")
    db_session.commit()

    autenticar(outro_usuario)
    resposta = client.post(f"/contatos/{contato.id}/mensagens", json={"corpo": "Oi"})
    assert resposta.status_code == 403
    assert resposta.json()["detail"]["code"] == "nao_participante"
