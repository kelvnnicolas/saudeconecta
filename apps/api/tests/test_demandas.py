from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import pytest
from sqlalchemy.exc import IntegrityError

from app.models.contato import Contato, OrigemContato
from app.models.demanda import Demanda, StatusDemanda
from tests.fabrica import (
    DESCRICAO_SENSIVEL,
    autenticar,
    criar_assinatura,
    criar_demanda,
    criar_empresa,
    criar_profissional,
    especialidade,
    payload_demanda,
)

EXPIRADA = datetime.now(UTC) - timedelta(minutes=1)


@pytest.fixture
def cenario(db_session):
    empresa_id = criar_empresa(db_session, email="rh@clinica.com")
    criar_assinatura(db_session, empresa_id)
    demanda = criar_demanda(db_session, empresa_id)
    profissional_id = criar_profissional(db_session)
    db_session.commit()
    return empresa_id, demanda, profissional_id


def _interesse(client, demanda_id, mensagem=None):
    corpo = {"mensagem": mensagem} if mensagem else {}
    with patch("app.services.demandas.enviar_email") as enviar:
        response = client.post(f"/demandas/{demanda_id}/interesse", json=corpo)
    return response, enviar


# --- criação -----------------------------------------------------------------


def test_criar_demanda_retorna_aberta_com_expiracao_em_30_dias(client, db_session):
    empresa_id = criar_empresa(db_session)
    criar_assinatura(db_session, empresa_id)
    db_session.commit()
    autenticar(empresa_id)

    response = client.post("/demandas", json=payload_demanda(db_session))

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "aberta"
    assert body["especialidade_nome"] == "Enfermagem"
    assert body["valor_oferecido"] == 350.0
    expira_em = datetime.fromisoformat(body["expira_em"])
    assert timedelta(days=29, hours=23) < expira_em - datetime.now(UTC) <= timedelta(days=30)


@pytest.mark.parametrize(
    "campo,valor",
    [("descricao", "x" * 501), ("turno", "t" * 61), ("estado", "SAO")],
)
def test_criar_demanda_valida_tamanhos_no_pydantic(client, db_session, campo, valor):
    empresa_id = criar_empresa(db_session)
    criar_assinatura(db_session, empresa_id)
    db_session.commit()
    autenticar(empresa_id)

    response = client.post("/demandas", json=payload_demanda(db_session, **{campo: valor}))

    assert response.status_code == 422


def test_check_do_banco_recusa_descricao_acima_de_500(db_session):
    empresa_id = criar_empresa(db_session)
    demanda = criar_demanda(db_session, empresa_id)
    with pytest.raises(IntegrityError):
        with db_session.begin_nested():
            demanda.descricao = "x" * 501
            db_session.flush()


def test_criar_demanda_com_especialidade_inexistente_retorna_400(client, db_session):
    empresa_id = criar_empresa(db_session)
    criar_assinatura(db_session, empresa_id)
    db_session.commit()
    autenticar(empresa_id)

    response = client.post("/demandas", json=payload_demanda(db_session, especialidade_id=99999))

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "especialidade_inexistente"


# --- minhas ------------------------------------------------------------------


def test_minhas_lista_so_as_proprias_com_contagem_de_interessados(client, db_session, cenario):
    empresa_id, demanda, profissional_id = cenario
    outra_empresa = criar_empresa(db_session, nome="Hospital Outro")
    criar_demanda(db_session, outra_empresa)
    db_session.commit()

    autenticar(profissional_id)
    _interesse(client, demanda.id)
    autenticar(empresa_id)

    body = client.get("/demandas/minhas").json()

    assert [d["id"] for d in body] == [str(demanda.id)]
    assert body[0]["interessados_count"] == 1


def test_minhas_recusa_profissional(client, db_session, cenario):
    _, _, profissional_id = cenario
    autenticar(profissional_id)
    response = client.get("/demandas/minhas")
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "apenas_empresas"


# --- oportunidades -----------------------------------------------------------


def test_oportunidades_usa_especialidades_e_cidade_do_perfil_por_padrao(client, db_session):
    empresa_id = criar_empresa(db_session)
    compativel = criar_demanda(db_session, empresa_id, "Enfermagem", "São Paulo")
    criar_demanda(db_session, empresa_id, "Fisioterapia", "São Paulo")
    criar_demanda(db_session, empresa_id, "Enfermagem", "Campinas")
    profissional_id = criar_profissional(db_session, ("Enfermagem",), cidade="são paulo")
    db_session.commit()
    autenticar(profissional_id)

    body = client.get("/demandas/oportunidades").json()

    assert body["total"] == 1
    assert [d["id"] for d in body["items"]] == [str(compativel.id)]


def test_oportunidades_aceita_filtros_por_query(client, db_session):
    empresa_id = criar_empresa(db_session)
    alvo = criar_demanda(db_session, empresa_id, "Fisioterapia", "Campinas")
    criar_demanda(db_session, empresa_id, "Enfermagem", "São Paulo")
    profissional_id = criar_profissional(db_session, ("Enfermagem",))
    db_session.commit()
    autenticar(profissional_id)

    fisio_id = especialidade(db_session, "Fisioterapia").id
    body = client.get(
        "/demandas/oportunidades", params={"especialidade_id": fisio_id, "cidade": "Campinas"}
    ).json()

    assert [d["id"] for d in body["items"]] == [str(alvo.id)]


def test_oportunidades_so_mostra_abertas_e_nao_expiradas(client, db_session):
    empresa_id = criar_empresa(db_session)
    aberta = criar_demanda(db_session, empresa_id)
    criar_demanda(db_session, empresa_id, status=StatusDemanda.preenchida)
    criar_demanda(db_session, empresa_id, status=StatusDemanda.encerrada)
    criar_demanda(db_session, empresa_id, expira_em=EXPIRADA)
    profissional_id = criar_profissional(db_session)
    db_session.commit()
    autenticar(profissional_id)

    body = client.get("/demandas/oportunidades").json()

    assert [d["id"] for d in body["items"]] == [str(aberta.id)]


def test_oportunidades_pagina(client, db_session):
    empresa_id = criar_empresa(db_session)
    for _ in range(3):
        criar_demanda(db_session, empresa_id)
    profissional_id = criar_profissional(db_session)
    db_session.commit()
    autenticar(profissional_id)

    body = client.get("/demandas/oportunidades", params={"limit": 2, "offset": 2}).json()

    assert body["total"] == 3
    assert len(body["items"]) == 1
    assert (body["limit"], body["offset"]) == (2, 2)


def test_oportunidades_recusa_empresa(client, db_session, cenario):
    empresa_id, _, _ = cenario
    autenticar(empresa_id)
    response = client.get("/demandas/oportunidades")
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "apenas_profissionais"


# --- detalhe -----------------------------------------------------------------


def test_empresa_dona_ve_lista_de_interessados(client, db_session, cenario):
    empresa_id, demanda, profissional_id = cenario
    autenticar(profissional_id)
    _interesse(client, demanda.id)
    autenticar(empresa_id)

    body = client.get(f"/demandas/{demanda.id}").json()

    assert len(body["interessados"]) == 1
    assert body["interessados"][0]["profissional_id"] == str(profissional_id)
    assert body["interessados"][0]["nome"] == "Maria Silva"


def test_profissional_nunca_ve_outros_interessados(client, db_session, cenario):
    _, demanda, profissional_id = cenario
    outro_id = criar_profissional(db_session, nome="Outro Profissional")
    db_session.commit()
    autenticar(outro_id)
    _interesse(client, demanda.id)

    autenticar(profissional_id)
    body = client.get(f"/demandas/{demanda.id}").json()

    assert "interessados" not in body
    assert "interessados_count" not in body
    assert body["ja_demonstrei_interesse"] is False
    assert "Outro Profissional" not in str(body)


def test_profissional_ve_flag_de_interesse_proprio(client, db_session, cenario):
    _, demanda, profissional_id = cenario
    autenticar(profissional_id)
    _interesse(client, demanda.id)

    body = client.get(f"/demandas/{demanda.id}").json()

    assert body["ja_demonstrei_interesse"] is True


@pytest.mark.parametrize(
    "status,expira_em",
    [
        (StatusDemanda.preenchida, None),
        (StatusDemanda.encerrada, None),
        (StatusDemanda.expirada, None),
        (StatusDemanda.aberta, EXPIRADA),
    ],
)
def test_profissional_nao_ve_demanda_que_nao_esta_aberta(client, db_session, status, expira_em):
    empresa_id = criar_empresa(db_session)
    demanda = criar_demanda(db_session, empresa_id, status=status, expira_em=expira_em)
    profissional_id = criar_profissional(db_session)
    db_session.commit()
    autenticar(profissional_id)

    assert client.get(f"/demandas/{demanda.id}").status_code == 404


def test_empresa_nao_ve_demanda_de_outra_empresa(client, db_session, cenario):
    _, demanda, _ = cenario
    outra_empresa = criar_empresa(db_session, nome="Hospital Outro")
    db_session.commit()
    autenticar(outra_empresa)

    response = client.get(f"/demandas/{demanda.id}")

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "demanda_inexistente"


# --- PATCH -------------------------------------------------------------------


@pytest.mark.parametrize("destino", ["preenchida", "encerrada"])
def test_empresa_dona_fecha_demanda_aberta(client, db_session, cenario, destino):
    empresa_id, demanda, _ = cenario
    autenticar(empresa_id)

    response = client.patch(f"/demandas/{demanda.id}", json={"status": destino})

    assert response.status_code == 200
    assert response.json()["status"] == destino


@pytest.mark.parametrize("destino", ["aberta", "expirada"])
def test_transicao_para_destino_nao_permitido_retorna_409(client, db_session, cenario, destino):
    empresa_id, demanda, _ = cenario
    autenticar(empresa_id)

    response = client.patch(f"/demandas/{demanda.id}", json={"status": destino})

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "transicao_invalida"


def test_nao_reabre_demanda_preenchida(client, db_session):
    empresa_id = criar_empresa(db_session)
    demanda = criar_demanda(db_session, empresa_id, status=StatusDemanda.preenchida)
    db_session.commit()
    autenticar(empresa_id)

    response = client.patch(f"/demandas/{demanda.id}", json={"status": "encerrada"})

    assert response.status_code == 409


def test_empresa_nao_edita_demanda_de_outra_empresa(client, db_session, cenario):
    _, demanda, _ = cenario
    outra_empresa = criar_empresa(db_session, nome="Hospital Outro")
    db_session.commit()
    autenticar(outra_empresa)

    response = client.patch(f"/demandas/{demanda.id}", json={"status": "encerrada"})

    assert response.status_code == 404
    db_session.refresh(demanda)
    assert demanda.status == StatusDemanda.aberta


def test_profissional_nao_edita_demanda(client, db_session, cenario):
    _, demanda, profissional_id = cenario
    autenticar(profissional_id)
    response = client.patch(f"/demandas/{demanda.id}", json={"status": "encerrada"})
    assert response.status_code == 404


# --- interesse ---------------------------------------------------------------


def test_interesse_cria_contato_de_origem_demanda_e_avisa_empresa(client, db_session, cenario):
    empresa_id, demanda, profissional_id = cenario
    autenticar(profissional_id)

    response, enviar = _interesse(client, demanda.id)

    assert response.status_code == 201
    contato = db_session.get(Contato, response.json()["contato_id"])
    assert contato.origem == OrigemContato.demanda
    assert contato.demanda_id == demanda.id
    assert contato.solicitante_id == empresa_id
    assert contato.profissional_id == profissional_id

    para, assunto, texto, html = enviar.call_args.args
    assert para == "rh@clinica.com"
    assert assunto == "Um profissional demonstrou interesse na sua demanda"
    assert f"http://localhost:3000/contatos/{contato.id}" in texto
    assert DESCRICAO_SENSIVEL not in texto + html + assunto


def test_interesse_gera_notificacao_para_empresa(client, db_session, cenario):
    empresa_id, demanda, profissional_id = cenario
    autenticar(profissional_id)
    response, _ = _interesse(client, demanda.id)
    assert response.status_code == 201

    autenticar(empresa_id)
    notificacoes = client.get("/notificacoes")
    assert notificacoes.json()["total"] == 1
    assert notificacoes.json()["items"][0]["tipo"] == "novo_interesse"


def test_interesse_comita_apos_registrar_notificacao(client, db_session, cenario):
    # registrar_notificacao() só dá flush, nunca commit (a própria função
    # participaria de um savepoint aberto por um caller como o webhook do
    # Stripe se também commitasse) — quem chama é responsável por commitar.
    # O db_session da suíte é compartilhado entre a requisição (que roda numa
    # thread do threadpool do FastAPI) e o teste, o que torna um rollback
    # no meio do teste um jeito não confiável de provar que um commit real
    # aconteceu; espiar Session.commit não depende de threads.
    _, demanda, profissional_id = cenario
    autenticar(profissional_id)

    with patch.object(db_session, "commit", wraps=db_session.commit) as commit_espiao:
        response, _ = _interesse(client, demanda.id)

    assert response.status_code == 201
    assert commit_espiao.call_count == 2, (
        "demonstrar_interesse deve commitar o contato e, separadamente, "
        "a notificação — um commit só significa que a notificação ficou "
        "apenas flushed e nunca foi persistida de verdade"
    )


def test_criar_demanda_comita_apos_notificar_profissionais(client, db_session):
    empresa_id = criar_empresa(db_session, email="rh@clinica.com")
    criar_assinatura(db_session, empresa_id)
    criar_profissional(db_session, especialidades=("Enfermagem",), cidade="São Paulo")
    db_session.commit()

    autenticar(empresa_id)
    with patch.object(db_session, "commit", wraps=db_session.commit) as commit_espiao:
        resposta = client.post("/demandas", json=payload_demanda(db_session))

    assert resposta.status_code == 201
    assert commit_espiao.call_count == 2, (
        "criar_demanda deve commitar a demanda e, separadamente, o laço de "
        "notificações em _notificar_profissionais_compativeis — um commit só "
        "significa que as notificações ficaram apenas flushed"
    )


def test_criar_demanda_notifica_profissional_compativel(client, db_session):
    empresa_id = criar_empresa(db_session, email="rh@clinica.com")
    criar_assinatura(db_session, empresa_id)
    profissional_id = criar_profissional(
        db_session, especialidades=("Enfermagem",), cidade="São Paulo"
    )
    db_session.commit()

    autenticar(empresa_id)
    resposta = client.post("/demandas", json=payload_demanda(db_session))
    assert resposta.status_code == 201

    autenticar(profissional_id)
    notificacoes = client.get("/notificacoes")
    assert notificacoes.json()["total"] == 1
    assert notificacoes.json()["items"][0]["tipo"] == "nova_oportunidade"


def test_criar_demanda_notifica_mesmo_com_espaco_sobrando_na_cidade_do_perfil(client, db_session):
    empresa_id = criar_empresa(db_session, email="rh@clinica.com")
    criar_assinatura(db_session, empresa_id)
    profissional_id = criar_profissional(
        db_session, especialidades=("Enfermagem",), cidade="  São Paulo "
    )
    db_session.commit()

    autenticar(empresa_id)
    assert client.post("/demandas", json=payload_demanda(db_session)).status_code == 201

    autenticar(profissional_id)
    assert client.get("/notificacoes").json()["total"] == 1


def test_criar_demanda_nao_notifica_profissional_de_outra_especialidade(client, db_session):
    empresa_id = criar_empresa(db_session, email="rh@clinica.com")
    criar_assinatura(db_session, empresa_id)
    profissional_id = criar_profissional(
        db_session, especialidades=("Fisioterapia",), cidade="São Paulo"
    )
    db_session.commit()

    autenticar(empresa_id)
    client.post("/demandas", json=payload_demanda(db_session))

    autenticar(profissional_id)
    notificacoes = client.get("/notificacoes")
    assert notificacoes.json()["total"] == 0


def test_criar_demanda_nao_notifica_profissional_de_outra_cidade(client, db_session):
    empresa_id = criar_empresa(db_session, email="rh@clinica.com")
    criar_assinatura(db_session, empresa_id)
    profissional_id = criar_profissional(
        db_session, especialidades=("Enfermagem",), cidade="Curitiba"
    )
    db_session.commit()

    autenticar(empresa_id)
    client.post("/demandas", json=payload_demanda(db_session))

    autenticar(profissional_id)
    notificacoes = client.get("/notificacoes")
    assert notificacoes.json()["total"] == 0


def test_interesse_guarda_mensagem_opcional_do_profissional(client, db_session, cenario):
    _, demanda, profissional_id = cenario
    autenticar(profissional_id)

    response, _ = _interesse(client, demanda.id, mensagem="Tenho 5 anos de UTI")

    assert db_session.get(Contato, response.json()["contato_id"]).mensagem == (
        "Tenho 5 anos de UTI"
    )


def test_interesse_duplicado_retorna_409(client, db_session, cenario):
    _, demanda, profissional_id = cenario
    autenticar(profissional_id)
    _interesse(client, demanda.id)

    response, enviar = _interesse(client, demanda.id)

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "interesse_existente"
    enviar.assert_not_called()


def test_indice_unico_impede_interesse_duplicado_no_banco(db_session, cenario):
    empresa_id, demanda, profissional_id = cenario
    with pytest.raises(IntegrityError):
        with db_session.begin_nested():
            for _ in range(2):
                db_session.add(
                    Contato(
                        solicitante_id=empresa_id,
                        profissional_id=profissional_id,
                        mensagem="oi",
                        origem=OrigemContato.demanda,
                        demanda_id=demanda.id,
                    )
                )
            db_session.flush()


@pytest.mark.parametrize(
    "status,expira_em",
    [(StatusDemanda.encerrada, None), (StatusDemanda.preenchida, None), (None, EXPIRADA)],
)
def test_interesse_em_demanda_nao_aberta_retorna_410(client, db_session, status, expira_em):
    empresa_id = criar_empresa(db_session)
    demanda = criar_demanda(
        db_session, empresa_id, status=status or StatusDemanda.aberta, expira_em=expira_em
    )
    profissional_id = criar_profissional(db_session)
    db_session.commit()
    autenticar(profissional_id)

    response, _ = _interesse(client, demanda.id)

    assert response.status_code == 410
    assert response.json()["detail"]["code"] == "demanda_indisponivel"


def test_empresa_nao_consegue_demonstrar_interesse(client, db_session, cenario):
    empresa_id, demanda, _ = cenario
    autenticar(empresa_id)

    response, _ = _interesse(client, demanda.id)

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "apenas_profissionais"


def test_profissional_sem_perfil_completo_recebe_400(client, db_session, cenario):
    _, demanda, _ = cenario
    incompleto = criar_profissional(db_session, com_perfil_profissional=False)
    db_session.commit()
    autenticar(incompleto)

    response, _ = _interesse(client, demanda.id)

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "perfil_profissional_incompleto"


def test_contato_da_demanda_aparece_em_contatos_para_as_duas_partes(client, db_session, cenario):
    empresa_id, demanda, profissional_id = cenario
    autenticar(profissional_id)
    contato_id = _interesse(client, demanda.id)[0].json()["contato_id"]

    for user_id in (profissional_id, empresa_id):
        autenticar(user_id)
        contatos = client.get("/contatos").json()
        assert [c["id"] for c in contatos] == [contato_id]
        assert contatos[0]["origem"] == "demanda"
        assert contatos[0]["demanda_id"] == str(demanda.id)


def test_contato_da_demanda_libera_avaliacao_entre_as_partes(client, db_session, cenario):
    empresa_id, demanda, profissional_id = cenario
    autenticar(profissional_id)
    _interesse(client, demanda.id)
    autenticar(empresa_id)

    response = client.post("/avaliacoes", json={"alvo_id": str(profissional_id), "nota": 5})

    assert response.status_code in (200, 201)


def test_demanda_persiste_na_tabela(db_session, cenario):
    _, demanda, _ = cenario
    assert db_session.get(Demanda, demanda.id).descricao == DESCRICAO_SENSIVEL
