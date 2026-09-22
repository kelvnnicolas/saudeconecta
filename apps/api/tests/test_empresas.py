import uuid

from app.core.auth import CurrentUser, get_current_user
from app.main import app
from app.models.empresa import Empresa, TipoEmpresa
from app.models.profile import Papel, Profile


def test_get_empresa_returns_404_when_not_found(client):
    response = client.get(f"/empresas/{uuid.uuid4()}")
    assert response.status_code == 404


def test_get_empresa_returns_merged_profile_and_empresa_data(client, db_session):
    user_id = uuid.uuid4()
    db_session.add(
        Profile(
            id=user_id, papel=Papel.empresa, nome="Clínica Vida", cidade="Curitiba", estado="PR"
        )
    )
    db_session.flush()
    db_session.add(
        Empresa(
            user_id=user_id,
            nome_fantasia="Clínica Vida Homecare",
            tipo=TipoEmpresa.clinica,
            cidade="Curitiba",
            estado="PR",
        )
    )
    db_session.commit()

    response = client.get(f"/empresas/{user_id}")

    assert response.status_code == 200
    body = response.json()
    assert body["nome"] == "Clínica Vida"
    assert body["nome_fantasia"] == "Clínica Vida Homecare"
    assert body["cidade"] == "Curitiba"
    assert body["tipo"] == "clinica"


def test_update_own_empresa_requires_authentication(client):
    response = client.put("/empresas/me", json={"nome_fantasia": "X", "tipo": "clinica"})
    assert response.status_code == 401


def test_update_own_empresa_requires_papel_empresa(client, db_session):
    user_id = uuid.uuid4()
    db_session.add(Profile(id=user_id, papel=Papel.profissional, nome="Maria"))
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email="maria@example.com", role="authenticated"
    )

    response = client.put("/empresas/me", json={"nome_fantasia": "X", "tipo": "clinica"})

    assert response.status_code == 403


def test_update_own_empresa_creates_row(client, db_session):
    user_id = uuid.uuid4()
    db_session.add(Profile(id=user_id, papel=Papel.empresa, nome="Clínica Y"))
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email="clinicay@example.com", role="authenticated"
    )

    response = client.put(
        "/empresas/me",
        json={
            "nome_fantasia": "Clínica Y Ltda",
            "tipo": "hospital",
            "cidade": "Recife",
            "estado": "PE",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["nome_fantasia"] == "Clínica Y Ltda"
    assert body["tipo"] == "hospital"
    assert body["cidade"] == "Recife"
