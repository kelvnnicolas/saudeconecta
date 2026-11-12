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

    response = client.post("/auth/sync", json={"papel": "profissional", "nome": "Maria Silva"})

    assert response.status_code == 200
    assert response.json()["email"] == "maria@example.com"
    saved = db_session.get(Profile, user_id)
    assert saved.email == "maria@example.com"


def _login_as(user_id, email):
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email=email, role="authenticated"
    )


def test_sync_cannot_change_papel_of_existing_profile(client, db_session):
    """T-031: o papel só vale na criação; depois dela, trocar é recusado com 409."""
    user_id = uuid.uuid4()
    _login_as(user_id, "maria@example.com")
    criado = client.post("/auth/sync", json={"papel": "profissional", "nome": "Maria Silva"})
    assert criado.status_code == 200

    response = client.post("/auth/sync", json={"papel": "empresa", "nome": "Maria Silva"})

    assert response.status_code == 409
    assert response.json()["detail"] == (
        "Esta conta foi criada como profissional e o tipo de conta não pode ser alterado."
    )
    db_session.expire_all()
    assert db_session.get(Profile, user_id).papel.value == "profissional"


def test_sync_conflict_does_not_change_other_fields(client, db_session):
    user_id = uuid.uuid4()
    db_session.add(Profile(id=user_id, papel="empresa", nome="Clínica Boa", telefone="48999990000"))
    db_session.commit()
    _login_as(user_id, "clinica@example.com")

    response = client.post(
        "/auth/sync", json={"papel": "profissional", "nome": "Outro Nome", "cidade": "Recife"}
    )

    assert response.status_code == 409
    db_session.expire_all()
    saved = db_session.get(Profile, user_id)
    assert saved.nome == "Clínica Boa"
    assert saved.telefone == "48999990000"
    assert saved.cidade is None


def test_sync_repeated_with_same_papel_keeps_saved_contact_data(client, db_session):
    user_id = uuid.uuid4()
    _login_as(user_id, "maria@example.com")
    primeiro = client.post(
        "/auth/sync",
        json={
            "papel": "profissional",
            "nome": "Maria Silva",
            "telefone": "48991234567",
            "cidade": "Florianópolis",
            "estado": "SC",
        },
    )
    assert primeiro.status_code == 200

    segundo = client.post("/auth/sync", json={"papel": "profissional", "nome": "Maria Silva"})

    assert segundo.status_code == 200
    body = segundo.json()
    assert body["telefone"] == "48991234567"
    assert body["cidade"] == "Florianópolis"
    assert body["estado"] == "SC"
    assert body["papel"] == "profissional"


def test_sync_same_papel_still_updates_fields_that_come(client, db_session):
    user_id = uuid.uuid4()
    db_session.add(
        Profile(id=user_id, papel="profissional", nome="Maria", telefone="48991234567", estado="SC")
    )
    db_session.commit()
    _login_as(user_id, "maria@example.com")

    response = client.post(
        "/auth/sync",
        json={"papel": "profissional", "nome": "Maria Souza", "cidade": "Joinville"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["nome"] == "Maria Souza"
    assert body["cidade"] == "Joinville"
    assert body["telefone"] == "48991234567"
    assert body["estado"] == "SC"
