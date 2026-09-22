import uuid

from app.core.auth import CurrentUser, get_current_user
from app.main import app
from app.models.avaliacao import Avaliacao
from app.models.contato import Contato
from app.models.profile import Papel, Profile
from app.models.profissional import Profissional


def test_create_avaliacao_requires_authentication(client):
    response = client.post("/avaliacoes", json={"alvo_id": str(uuid.uuid4()), "nota": 5})
    assert response.status_code == 401


def test_create_avaliacao_rejects_self_review(client, db_session):
    user_id = uuid.uuid4()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=user_id, email="x@example.com", role="authenticated"
    )

    response = client.post("/avaliacoes", json={"alvo_id": str(user_id), "nota": 5})
    assert response.status_code == 400


def test_create_avaliacao_requires_existing_contato(client, db_session):
    autor_id = uuid.uuid4()
    alvo_id = uuid.uuid4()
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=autor_id, email="x@example.com", role="authenticated"
    )

    response = client.post("/avaliacoes", json={"alvo_id": str(alvo_id), "nota": 5})
    assert response.status_code == 403


def test_create_avaliacao_succeeds_after_contato(client, db_session):
    solicitante_id = uuid.uuid4()
    profissional_id = uuid.uuid4()
    db_session.add(Profile(id=solicitante_id, papel=Papel.empresa, nome="Clínica X"))
    db_session.add(Profile(id=profissional_id, papel=Papel.profissional, nome="Maria"))
    db_session.flush()
    db_session.add(Profissional(user_id=profissional_id))
    db_session.flush()
    db_session.add(
        Contato(solicitante_id=solicitante_id, profissional_id=profissional_id, mensagem="Oi")
    )
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=solicitante_id, email="x@example.com", role="authenticated"
    )

    response = client.post(
        "/avaliacoes",
        json={"alvo_id": str(profissional_id), "nota": 5, "comentario": "Ótimo atendimento"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["nota"] == 5
    assert body["comentario"] == "Ótimo atendimento"


def test_create_avaliacao_rejects_nota_out_of_range(client, db_session):
    solicitante_id = uuid.uuid4()
    profissional_id = uuid.uuid4()
    db_session.add(Profile(id=solicitante_id, papel=Papel.empresa, nome="Clínica X"))
    db_session.add(Profile(id=profissional_id, papel=Papel.profissional, nome="Maria"))
    db_session.flush()
    db_session.add(Profissional(user_id=profissional_id))
    db_session.flush()
    db_session.add(
        Contato(solicitante_id=solicitante_id, profissional_id=profissional_id, mensagem="Oi")
    )
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        id=solicitante_id, email="x@example.com", role="authenticated"
    )

    response = client.post("/avaliacoes", json={"alvo_id": str(profissional_id), "nota": 6})
    assert response.status_code == 422


def test_list_avaliacoes_by_alvo_is_public(client, db_session):
    autor_id = uuid.uuid4()
    alvo_id = uuid.uuid4()
    db_session.add(Profile(id=autor_id, papel=Papel.empresa, nome="Clínica X"))
    db_session.add(Profile(id=alvo_id, papel=Papel.profissional, nome="Maria"))
    db_session.flush()
    db_session.add(Profissional(user_id=alvo_id))
    db_session.commit()
    db_session.add(Avaliacao(autor_id=autor_id, alvo_id=alvo_id, nota=4, comentario="Bom"))
    db_session.commit()

    response = client.get(f"/avaliacoes?alvo_id={alvo_id}")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["nota"] == 4
