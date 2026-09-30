import uuid

from app.models.avaliacao import Avaliacao
from app.models.empresa import Empresa, TipoEmpresa
from app.models.profile import Papel, Profile


def _make_empresa(db_session, nome_fantasia, tipo, cidade, estado):
    user_id = uuid.uuid4()
    db_session.add(
        Profile(id=user_id, papel=Papel.empresa, nome=nome_fantasia, cidade=cidade, estado=estado)
    )
    db_session.flush()
    db_session.add(
        Empresa(
            user_id=user_id, nome_fantasia=nome_fantasia, tipo=tipo, cidade=cidade, estado=estado
        )
    )
    db_session.commit()
    return user_id


def test_search_returns_all_institutions_when_no_filters(client, db_session):
    _make_empresa(db_session, "Clínica Vida", TipoEmpresa.clinica, "Recife", "PE")
    _make_empresa(db_session, "Hospital Norte", TipoEmpresa.hospital, "Salvador", "BA")

    response = client.get("/empresas")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert len(body["items"]) == 2


def test_search_never_returns_pessoa_fisica(client, db_session):
    _make_empresa(db_session, "Clínica Vida", TipoEmpresa.clinica, "Recife", "PE")
    _make_empresa(db_session, "João Contratante", TipoEmpresa.pessoa_fisica, "Recife", "PE")

    response = client.get("/empresas")

    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["nome_fantasia"] == "Clínica Vida"


def test_search_explicit_pessoa_fisica_filter_returns_empty(client, db_session):
    _make_empresa(db_session, "João Contratante", TipoEmpresa.pessoa_fisica, "Recife", "PE")

    response = client.get("/empresas", params={"tipo": "pessoa_fisica"})

    body = response.json()
    assert body["total"] == 0
    assert body["items"] == []


def test_search_filters_by_text_on_nome_fantasia(client, db_session):
    _make_empresa(db_session, "Clínica Vida", TipoEmpresa.clinica, "Recife", "PE")
    _make_empresa(db_session, "Hospital Norte", TipoEmpresa.hospital, "Salvador", "BA")

    response = client.get("/empresas", params={"q": "Vida"})

    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["nome_fantasia"] == "Clínica Vida"


def test_search_filters_by_tipo(client, db_session):
    _make_empresa(db_session, "Clínica Vida", TipoEmpresa.clinica, "Recife", "PE")
    _make_empresa(db_session, "Hospital Norte", TipoEmpresa.hospital, "Salvador", "BA")

    response = client.get("/empresas", params={"tipo": "hospital"})

    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["nome_fantasia"] == "Hospital Norte"


def test_search_filters_by_cidade_and_estado(client, db_session):
    _make_empresa(db_session, "Clínica Vida", TipoEmpresa.clinica, "Recife", "PE")
    _make_empresa(db_session, "Hospital Norte", TipoEmpresa.hospital, "Salvador", "BA")

    response = client.get("/empresas", params={"estado": "BA"})

    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["nome_fantasia"] == "Hospital Norte"


def test_search_computes_nota_media(client, db_session):
    alvo_id = _make_empresa(db_session, "Clínica Vida", TipoEmpresa.clinica, "Recife", "PE")
    autor_id = uuid.uuid4()
    db_session.add(Profile(id=autor_id, papel=Papel.profissional, nome="Maria"))
    db_session.flush()
    db_session.add(Avaliacao(autor_id=autor_id, alvo_id=alvo_id, nota=4))
    db_session.add(Avaliacao(autor_id=autor_id, alvo_id=alvo_id, nota=2))
    db_session.commit()

    response = client.get("/empresas")

    body = response.json()
    assert body["items"][0]["nota_media"] == 3.0


def test_search_empresa_without_avaliacoes_has_null_nota_media(client, db_session):
    _make_empresa(db_session, "Clínica Vida", TipoEmpresa.clinica, "Recife", "PE")

    response = client.get("/empresas")

    body = response.json()
    assert body["items"][0]["nota_media"] is None


def test_search_respects_limit_and_offset(client, db_session):
    _make_empresa(db_session, "Clínica Vida", TipoEmpresa.clinica, "Recife", "PE")
    _make_empresa(db_session, "Hospital Norte", TipoEmpresa.hospital, "Salvador", "BA")
    _make_empresa(db_session, "Homecare Sul", TipoEmpresa.homecare, "Porto Alegre", "RS")

    response = client.get("/empresas", params={"limit": 1, "offset": 1})

    body = response.json()
    assert body["total"] == 3
    assert len(body["items"]) == 1
    # Ordenado por nome_fantasia: Clínica Vida, Homecare Sul, Hospital Norte
    # ("Home..." < "Hosp..." em 'm' < 's').
    assert body["items"][0]["nome_fantasia"] == "Homecare Sul"
