import uuid

from app.models.avaliacao import Avaliacao
from app.models.especialidade import Especialidade
from app.models.profile import Papel, Profile
from app.models.profissional import Profissional


def _make_profissional(db_session, nome, cidade, estado, preco_hora, especialidade_nome=None):
    user_id = uuid.uuid4()
    db_session.add(
        Profile(id=user_id, papel=Papel.profissional, nome=nome, cidade=cidade, estado=estado)
    )
    db_session.flush()
    profissional = Profissional(user_id=user_id, preco_hora=preco_hora)
    if especialidade_nome:
        especialidade = Especialidade(nome=especialidade_nome)
        db_session.add(especialidade)
        db_session.flush()
        profissional.especialidades.append(especialidade)
    db_session.add(profissional)
    db_session.commit()
    return user_id


def test_search_returns_all_when_no_filters(client, db_session):
    _make_profissional(db_session, "Ana Lima", "Recife", "PE", 100)
    _make_profissional(db_session, "Bruno Rocha", "Salvador", "BA", 150)

    response = client.get("/profissionais")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert len(body["items"]) == 2


def test_search_filters_by_text_on_nome(client, db_session):
    _make_profissional(db_session, "Ana Lima", "Recife", "PE", 100)
    _make_profissional(db_session, "Bruno Rocha", "Salvador", "BA", 150)

    response = client.get("/profissionais", params={"q": "Ana"})

    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["nome"] == "Ana Lima"


def test_search_filters_by_text_on_especialidade(client, db_session):
    _make_profissional(
        db_session, "Ana Lima", "Recife", "PE", 100, especialidade_nome="Nefrologia Pediátrica"
    )
    _make_profissional(
        db_session, "Bruno Rocha", "Salvador", "BA", 150, especialidade_nome="Cardiologia"
    )

    response = client.get("/profissionais", params={"q": "Nefro"})

    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["nome"] == "Ana Lima"


def test_search_filters_by_cidade_and_estado(client, db_session):
    _make_profissional(db_session, "Ana Lima", "Recife", "PE", 100)
    _make_profissional(db_session, "Bruno Rocha", "Salvador", "BA", 150)

    response = client.get("/profissionais", params={"estado": "BA"})

    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["nome"] == "Bruno Rocha"


def test_search_filters_by_preco_range(client, db_session):
    _make_profissional(db_session, "Ana Lima", "Recife", "PE", 100)
    _make_profissional(db_session, "Bruno Rocha", "Salvador", "BA", 300)

    response = client.get("/profissionais", params={"preco_max": 200})

    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["nome"] == "Ana Lima"


def test_search_filters_by_nota_min(client, db_session):
    alta_nota_id = _make_profissional(db_session, "Ana Lima", "Recife", "PE", 100)
    baixa_nota_id = _make_profissional(db_session, "Bruno Rocha", "Salvador", "BA", 150)
    autor_id = uuid.uuid4()
    db_session.add(Profile(id=autor_id, papel=Papel.empresa, nome="Clínica X"))
    db_session.flush()
    db_session.add(Avaliacao(autor_id=autor_id, alvo_id=alta_nota_id, nota=5))
    db_session.add(Avaliacao(autor_id=autor_id, alvo_id=baixa_nota_id, nota=2))
    db_session.commit()

    response = client.get("/profissionais", params={"nota_min": 4})

    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["nome"] == "Ana Lima"
    assert body["items"][0]["nota_media"] == 5.0


def test_search_profissional_without_avaliacoes_has_null_nota_media(client, db_session):
    _make_profissional(db_session, "Ana Lima", "Recife", "PE", 100)

    response = client.get("/profissionais")

    body = response.json()
    assert body["items"][0]["nota_media"] is None


def test_search_respects_limit_and_offset(client, db_session):
    _make_profissional(db_session, "Ana Lima", "Recife", "PE", 100)
    _make_profissional(db_session, "Bruno Rocha", "Salvador", "BA", 150)
    _make_profissional(db_session, "Carla Souza", "Belo Horizonte", "MG", 120)

    response = client.get("/profissionais", params={"limit": 1, "offset": 1})

    body = response.json()
    assert body["total"] == 3
    assert len(body["items"]) == 1
    assert body["items"][0]["nome"] == "Bruno Rocha"
