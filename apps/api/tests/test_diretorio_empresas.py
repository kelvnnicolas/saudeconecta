from datetime import UTC, datetime, timedelta

from app.models.demanda import StatusDemanda
from app.models.empresa import TipoEmpresa
from tests.fabrica import autenticar, criar_demanda, criar_empresa, criar_profissional

ROTA = "/empresas/diretorio"


def _por_nome(corpo):
    return {item["nome_fantasia"]: item for item in corpo["items"]}


def test_diretorio_conta_so_demandas_abertas_e_nao_expiradas(client, db_session):
    empresa_id = criar_empresa(db_session, nome="Clínica Vida")
    criar_demanda(db_session, empresa_id)
    criar_demanda(db_session, empresa_id)
    criar_demanda(db_session, empresa_id, status=StatusDemanda.preenchida)
    criar_demanda(db_session, empresa_id, status=StatusDemanda.encerrada)
    criar_demanda(db_session, empresa_id, expira_em=datetime.now(UTC) - timedelta(minutes=1))
    profissional_id = criar_profissional(db_session)
    db_session.commit()
    autenticar(profissional_id)

    resposta = client.get(ROTA)

    assert resposta.status_code == 200
    assert _por_nome(resposta.json())["Clínica Vida"]["demandas_abertas"] == 2


def test_diretorio_empresa_sem_demandas_tem_zero(client, db_session):
    criar_empresa(db_session, nome="Clínica Vazia")
    profissional_id = criar_profissional(db_session)
    db_session.commit()
    autenticar(profissional_id)

    resposta = client.get(ROTA)

    assert _por_nome(resposta.json())["Clínica Vazia"]["demandas_abertas"] == 0


def test_diretorio_conta_demandas_de_cada_empresa_separadamente(client, db_session):
    a = criar_empresa(db_session, nome="Clínica A", email="a@example.com")
    b = criar_empresa(
        db_session, nome="Hospital B", tipo=TipoEmpresa.hospital, email="b@example.com"
    )
    criar_demanda(db_session, a)
    criar_demanda(db_session, b)
    criar_demanda(db_session, b)
    criar_demanda(db_session, b)
    profissional_id = criar_profissional(db_session)
    db_session.commit()
    autenticar(profissional_id)

    itens = _por_nome(client.get(ROTA).json())

    assert itens["Clínica A"]["demandas_abertas"] == 1
    assert itens["Hospital B"]["demandas_abertas"] == 3


def test_diretorio_nao_lista_pessoa_fisica(client, db_session):
    criar_empresa(db_session, nome="João Contratante", tipo=TipoEmpresa.pessoa_fisica)
    profissional_id = criar_profissional(db_session)
    db_session.commit()
    autenticar(profissional_id)

    assert client.get(ROTA).json()["total"] == 0


def test_diretorio_filtra_por_cidade_tipo_e_nome(client, db_session):
    criar_empresa(db_session, nome="Clínica Vida", email="a@example.com")
    criar_empresa(
        db_session, nome="Hospital Norte", tipo=TipoEmpresa.hospital, email="b@example.com"
    )
    profissional_id = criar_profissional(db_session)
    db_session.commit()
    autenticar(profissional_id)

    por_tipo = client.get(ROTA, params={"tipo": "hospital"}).json()
    por_nome = client.get(ROTA, params={"q": "vida"}).json()
    por_cidade = client.get(ROTA, params={"cidade": "Recife"}).json()

    assert [i["nome_fantasia"] for i in por_tipo["items"]] == ["Hospital Norte"]
    assert [i["nome_fantasia"] for i in por_nome["items"]] == ["Clínica Vida"]
    assert por_cidade["total"] == 0


def test_diretorio_nao_expoe_nota_nem_contato(client, db_session):
    criar_empresa(db_session, nome="Clínica Vida", email="rh@clinica.com")
    profissional_id = criar_profissional(db_session)
    db_session.commit()
    autenticar(profissional_id)

    item = client.get(ROTA).json()["items"][0]

    assert set(item) == {
        "user_id",
        "nome_fantasia",
        "tipo",
        "cidade",
        "estado",
        "avatar_url",
        "demandas_abertas",
    }


def test_diretorio_recusa_empresa(client, db_session):
    empresa_id = criar_empresa(db_session)
    db_session.commit()
    autenticar(empresa_id)

    resposta = client.get(ROTA)

    assert resposta.status_code == 403
    assert resposta.json()["detail"]["code"] == "apenas_profissionais"
    assert resposta.json()["detail"]["mensagem"] == "Esta ação é só para contas de profissional."


def test_diretorio_exige_login(client):
    resposta = client.get(ROTA)

    assert resposta.status_code in (401, 403)


def test_busca_publica_continua_sem_demandas_abertas(client, db_session):
    empresa_id = criar_empresa(db_session, nome="Clínica Vida")
    criar_demanda(db_session, empresa_id)
    db_session.commit()

    item = client.get("/empresas").json()["items"][0]

    assert "demandas_abertas" not in item
