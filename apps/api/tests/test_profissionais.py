import uuid

from app.core.auth import CurrentUser, get_current_user
from app.main import app
from app.models.especialidade import Especialidade
from app.models.profile import Papel, Profile
from app.models.profissional import Profissional


def test_get_profissional_returns_404_when_not_found(client):
    response = client.get(f"/profissionais/{uuid.uuid4()}")
    assert response.status_code == 404


def test_get_profissional_returns_merged_profile_and_profissional_data(client, db_session):
    user_id = uuid.uuid4()
    profile = Profile(
        id=user_id, papel=Papel.profissional, nome="Maria Silva", cidade="São Paulo", estado="SP"
    )
    db_session.add(profile)
    db_session.flush()

    especialidade = Especialidade(nome="Acupuntura Avançada")
    db_session.add(especialidade)
    db_session.flush()

    profissional = Profissional(user_id=user_id, bio="Atendimento domiciliar", preco_hora=150)
    profissional.especialidades.append(especialidade)
    db_session.add(profissional)
    db_session.commit()

    response = client.get(f"/profissionais/{user_id}")

    assert response.status_code == 200
    body = response.json()
    assert body["nome"] == "Maria Silva"
    assert body["cidade"] == "São Paulo"
    assert body["bio"] == "Atendimento domiciliar"
    assert body["especialidades"][0]["nome"] == "Acupuntura Avançada"


def test_update_own_profissional_requires_authentication(client):
    response = client.put("/profissionais/me", json={"bio": "Nova bio"})
    assert response.status_code == 401


def test_update_own_profissional_requires_papel_profissional(client, db_session):
    user_id = uuid.uuid4()
    db_session.add(Profile(id=user_id, papel=Papel.empresa, nome="Clínica X"))
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email="x@example.com", role="authenticated"
    )

    response = client.put("/profissionais/me", json={"bio": "Nova bio"})

    assert response.status_code == 403


def test_update_own_profissional_creates_and_associates_especialidades(client, db_session):
    user_id = uuid.uuid4()
    db_session.add(Profile(id=user_id, papel=Papel.profissional, nome="João Souza"))
    especialidade = Especialidade(nome="Fonoaudiologia Infantil")
    db_session.add(especialidade)
    db_session.commit()
    especialidade_id = especialidade.id

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email="joao@example.com", role="authenticated"
    )

    response = client.put(
        "/profissionais/me",
        json={"bio": "Fonoaudiólogo", "preco_hora": 200, "especialidade_ids": [especialidade_id]},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["bio"] == "Fonoaudiólogo"
    assert body["especialidades"][0]["id"] == especialidade_id


def test_update_own_profissional_rejects_unknown_especialidade_id(client, db_session):
    user_id = uuid.uuid4()
    db_session.add(Profile(id=user_id, papel=Papel.profissional, nome="João Souza"))
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email="joao@example.com", role="authenticated"
    )

    response = client.put(
        "/profissionais/me",
        json={"bio": "Fonoaudiólogo", "especialidade_ids": [999999]},
    )

    assert response.status_code == 400
