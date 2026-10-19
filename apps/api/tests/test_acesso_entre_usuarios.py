"""B-002: quem não é parte não lê, altera nem descobre recursos de terceiros por ID.

Cada teste usa dois usuários: o dono do recurso e um estranho. Para contatos
(IDs sequenciais) a resposta do estranho tem que ser igual à de um ID que não
existe, para não revelar quais contatos existem.
"""

from sqlalchemy import func, select

from app.models.contato import Contato
from app.models.demanda import Demanda, StatusDemanda
from app.models.mensagem_contato import MensagemContato
from app.models.notificacao import Notificacao
from tests.fabrica import (
    autenticar,
    criar_contato,
    criar_demanda,
    criar_empresa,
    criar_notificacao,
    criar_profissional,
)

ID_QUE_NAO_EXISTE = 999_999


def _cenario_contato(db_session):
    dono_id = criar_empresa(db_session, email="dono@example.com")
    profissional_id = criar_profissional(db_session)
    estranho_id = criar_empresa(db_session, nome="Estranha", email="estranha@example.com")
    contato = criar_contato(db_session, dono_id, profissional_id)
    db_session.commit()
    return contato.id, dono_id, profissional_id, estranho_id


def _mesmo_que_inexistente(resposta, inexistente):
    assert resposta.status_code == inexistente.status_code == 404
    assert resposta.json() == inexistente.json()


def test_estranho_nao_le_mensagens_de_contato_alheio(client, db_session):
    contato_id, *_, estranho_id = _cenario_contato(db_session)
    autenticar(estranho_id)

    resposta = client.get(f"/contatos/{contato_id}/mensagens")
    inexistente = client.get(f"/contatos/{ID_QUE_NAO_EXISTE}/mensagens")

    _mesmo_que_inexistente(resposta, inexistente)


def test_estranho_nao_envia_mensagem_em_contato_alheio(client, db_session):
    contato_id, *_, estranho_id = _cenario_contato(db_session)
    autenticar(estranho_id)

    resposta = client.post(f"/contatos/{contato_id}/mensagens", json={"corpo": "intrusão"})
    inexistente = client.post(f"/contatos/{ID_QUE_NAO_EXISTE}/mensagens", json={"corpo": "x"})

    _mesmo_que_inexistente(resposta, inexistente)
    assert db_session.scalar(select(func.count()).select_from(MensagemContato)) == 0


def test_estranho_nao_aceita_contato_alheio(client, db_session):
    contato_id, *_, estranho_id = _cenario_contato(db_session)
    autenticar(estranho_id)

    resposta = client.post(f"/contatos/{contato_id}/aceitar")
    inexistente = client.post(f"/contatos/{ID_QUE_NAO_EXISTE}/aceitar")

    _mesmo_que_inexistente(resposta, inexistente)
    db_session.expire_all()
    assert db_session.get(Contato, contato_id).aceito_em is None


def test_lista_de_contatos_traz_so_os_proprios(client, db_session):
    contato_id, dono_id, _, estranho_id = _cenario_contato(db_session)

    autenticar(estranho_id)
    assert client.get("/contatos").json() == []

    autenticar(dono_id)
    assert [c["id"] for c in client.get("/contatos").json()] == [contato_id]


def test_outra_empresa_nao_ve_detalhe_de_demanda_alheia(client, db_session):
    dono_id = criar_empresa(db_session, email="dono@example.com")
    outra_id = criar_empresa(db_session, nome="Outra", email="outra@example.com")
    demanda = criar_demanda(db_session, dono_id)
    db_session.commit()
    autenticar(outra_id)

    resposta = client.get(f"/demandas/{demanda.id}")

    assert resposta.status_code == 404


def test_outra_empresa_nao_altera_demanda_alheia(client, db_session):
    dono_id = criar_empresa(db_session, email="dono@example.com")
    outra_id = criar_empresa(db_session, nome="Outra", email="outra@example.com")
    demanda = criar_demanda(db_session, dono_id)
    db_session.commit()
    autenticar(outra_id)

    resposta = client.patch(f"/demandas/{demanda.id}", json={"status": "encerrada"})

    assert resposta.status_code == 404
    db_session.expire_all()
    assert db_session.get(Demanda, demanda.id).status == StatusDemanda.aberta


def test_profissional_nao_ve_demanda_que_nao_esta_aberta(client, db_session):
    dono_id = criar_empresa(db_session)
    profissional_id = criar_profissional(db_session)
    demanda = criar_demanda(db_session, dono_id, status=StatusDemanda.encerrada)
    db_session.commit()
    autenticar(profissional_id)

    assert client.get(f"/demandas/{demanda.id}").status_code == 404


def test_empresa_nao_demonstra_interesse_em_demanda(client, db_session):
    dono_id = criar_empresa(db_session, email="dono@example.com")
    outra_id = criar_empresa(db_session, nome="Outra", email="outra@example.com")
    demanda = criar_demanda(db_session, dono_id)
    db_session.commit()
    autenticar(outra_id)

    resposta = client.post(f"/demandas/{demanda.id}/interesse", json={})

    assert resposta.status_code == 403
    assert resposta.json()["detail"]["code"] == "apenas_profissionais"


def test_usuario_nao_marca_notificacao_de_outro_como_lida(client, db_session):
    dono_id = criar_profissional(db_session)
    estranho_id = criar_profissional(db_session, nome="Outro")
    notificacao = criar_notificacao(db_session, dono_id)
    db_session.commit()
    autenticar(estranho_id)

    resposta = client.post(f"/notificacoes/{notificacao.id}/marcar-lida")
    inexistente = client.post(f"/notificacoes/{ID_QUE_NAO_EXISTE}/marcar-lida")

    _mesmo_que_inexistente(resposta, inexistente)
    db_session.expire_all()
    assert db_session.get(Notificacao, notificacao.id).lida_em is None


def test_lista_de_notificacoes_traz_so_as_proprias(client, db_session):
    dono_id = criar_profissional(db_session)
    estranho_id = criar_profissional(db_session, nome="Outro")
    criar_notificacao(db_session, dono_id)
    db_session.commit()
    autenticar(estranho_id)

    corpo = client.get("/notificacoes").json()

    assert corpo["items"] == []
    assert corpo["total_nao_lidas"] == 0
