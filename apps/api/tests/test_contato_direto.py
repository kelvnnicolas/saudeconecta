from sqlalchemy import func, select

from app.models.contato import Contato
from app.models.empresa import TipoEmpresa
from tests.fabrica import autenticar, criar_empresa, criar_profissional


def _contatar(client, profissional_id):
    return client.post(
        "/contatos", json={"profissional_id": str(profissional_id), "mensagem": "Olá, tudo bem?"}
    )


def test_profissional_nao_pode_iniciar_contato_com_outro_profissional(client, db_session):
    solicitante_id = criar_profissional(db_session, nome="Ana")
    alvo_id = criar_profissional(db_session, nome="Bruno")
    db_session.commit()
    autenticar(solicitante_id)

    resposta = _contatar(client, alvo_id)

    assert resposta.status_code == 403
    assert resposta.json()["detail"]["code"] == "apenas_empresas"
    assert resposta.json()["detail"]["mensagem"] == "Recurso disponível só para empresas"
    assert db_session.scalar(select(func.count()).select_from(Contato)) == 0


def test_empresa_inicia_contato_com_profissional(client, db_session):
    empresa_id = criar_empresa(db_session)
    alvo_id = criar_profissional(db_session)
    db_session.commit()
    autenticar(empresa_id)

    assert _contatar(client, alvo_id).status_code == 200


def test_pessoa_fisica_tambem_pode_iniciar_contato(client, db_session):
    empresa_id = criar_empresa(db_session, tipo=TipoEmpresa.pessoa_fisica)
    alvo_id = criar_profissional(db_session)
    db_session.commit()
    autenticar(empresa_id)

    assert _contatar(client, alvo_id).status_code == 200


def test_empresa_com_cadastro_incompleto_recebe_perfil_nao_concluido(client, db_session):
    import uuid

    from app.models.profile import Papel, Profile

    sem_cadastro = uuid.uuid4()
    db_session.add(Profile(id=sem_cadastro, papel=Papel.empresa, nome="Sem cadastro"))
    alvo_id = criar_profissional(db_session)
    db_session.commit()
    autenticar(sem_cadastro)

    resposta = _contatar(client, alvo_id)

    assert resposta.status_code == 400
    assert resposta.json()["detail"]["code"] == "perfil_nao_concluido"
