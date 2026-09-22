import uuid

from app.core.auth import CurrentUser, get_current_user
from app.main import app
from app.models.profile import Profile


def test_sync_requires_authentication(client):
    response = client.post(
        "/auth/sync",
        json={"papel": "profissional", "nome": "Maria Silva"},
    )
    assert response.status_code == 401


def test_sync_creates_new_profile(client, db_session):
    user_id = uuid.uuid4()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email="maria@example.com", role="authenticated"
    )

    response = client.post(
        "/auth/sync",
        json={
            "papel": "profissional",
            "nome": "Maria Silva",
            "cidade": "São Paulo",
            "estado": "SP",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(user_id)
    assert body["nome"] == "Maria Silva"
    assert body["papel"] == "profissional"

    saved = db_session.get(Profile, user_id)
    assert saved is not None
    assert saved.cidade == "São Paulo"


def test_sync_updates_existing_profile(client, db_session):
    user_id = uuid.uuid4()
    db_session.add(Profile(id=user_id, papel="empresa", nome="Nome Antigo"))
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email="clinica@example.com", role="authenticated"
    )

    response = client.post(
        "/auth/sync",
        json={"papel": "empresa", "nome": "Nome Novo", "estado": "RJ"},
    )

    assert response.status_code == 200
    assert response.json()["nome"] == "Nome Novo"
    assert response.json()["estado"] == "RJ"


def test_sync_stores_caller_email(client, db_session):
    user_id = uuid.uuid4()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email="maria@example.com", role="authenticated"
    )

    response = client.post(
        "/auth/sync", json={"papel": "profissional", "nome": "Maria Silva"}
    )

    assert response.status_code == 200
    assert response.json()["email"] == "maria@example.com"
    saved = db_session.get(Profile, user_id)
    assert saved.email == "maria@example.com"
