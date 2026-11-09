"""Verificação de registro profissional (F-031): estados, permissões, trilha e exibição pública."""

import uuid

from sqlalchemy import func, select

from app.models.verificacao import StatusVerificacao, VerificacaoRegistro
from tests.fabrica import autenticar, criar_admin, criar_empresa, criar_profissional

CONFERENCIA = {
    "status": "verified",
    "conselho": "coren",
    "uf": "sc",
    "numero_registro": "123456",
    "fonte": "Portal de consulta do COREN-SC",
}


def _com_registro(db_session, registro="COREN-SC 123456"):
    profissional_id = criar_profissional(db_session, registro_profissional=registro)
    db_session.commit()
    return profissional_id


def _conferir(client, admin_id, profissional_id, **sobrescritas):
    autenticar(admin_id)
    return client.post(
        f"/admin/profissionais/{profissional_id}/verificacao", json={**CONFERENCIA, **sobrescritas}
    )


def _linhas_da_trilha(db_session, profissional_id):
    return list(
        db_session.scalars(
            select(VerificacaoRegistro)
            .where(VerificacaoRegistro.profissional_id == profissional_id)
            .order_by(VerificacaoRegistro.id)
        )
    )


def _publico(client, profissional_id):
    return client.get(f"/profissionais/{profissional_id}").json()


# ---------- padrão: ninguém nasce verificado, e cadastro e busca não dependem disso ----------


def test_profissional_novo_nao_tem_selo(client, db_session):
    profissional_id = _com_registro(db_session)

    corpo = _publico(client, profissional_id)

    assert corpo["verificado"] is False
    assert corpo["verificado_em"] is None


def test_profissional_sem_registro_continua_aparecendo_na_busca(client, db_session):
    criar_profissional(db_session, registro_profissional=None)
    db_session.commit()

    resposta = client.get("/profissionais")

    assert resposta.status_code == 200
    assert resposta.json()["total"] == 1
    assert resposta.json()["items"][0]["verificado"] is False


# ---------- pedido de conferência pelo profissional ----------


def test_profissional_pede_conferencia_e_fica_pendente_sem_ganhar_selo(client, db_session):
    profissional_id = _com_registro(db_session)
    autenticar(profissional_id)

    resposta = client.post("/profissionais/me/verificacao/solicitar")

    assert resposta.status_code == 200
    assert resposta.json()["status"] == "pending"
    assert _publico(client, profissional_id)["verificado"] is False
    linhas = _linhas_da_trilha(db_session, profissional_id)
    assert [(x.status_anterior, x.status_novo) for x in linhas] == [
        (StatusVerificacao.unverified, StatusVerificacao.pending)
    ]
    assert linhas[0].ator_tipo.value == "profissional"
    assert linhas[0].ator_id == profissional_id


def test_pedido_exige_registro_informado(client, db_session):
    profissional_id = criar_profissional(db_session, registro_profissional="  ")
    db_session.commit()
    autenticar(profissional_id)

    resposta = client.post("/profissionais/me/verificacao/solicitar")

    assert resposta.status_code == 400
    assert resposta.json()["detail"]["code"] == "registro_nao_informado"


def test_pedido_repetido_e_recusado(client, db_session):
    profissional_id = _com_registro(db_session)
    autenticar(profissional_id)
    client.post("/profissionais/me/verificacao/solicitar")

    resposta = client.post("/profissionais/me/verificacao/solicitar")

    assert resposta.status_code == 409
    assert resposta.json()["detail"]["code"] == "verificacao_ja_solicitada"


def test_quem_ja_e_verificado_nao_pede_de_novo(client, db_session):
    profissional_id = _com_registro(db_session)
    _conferir(client, criar_admin(db_session), profissional_id)
    autenticar(profissional_id)

    resposta = client.post("/profissionais/me/verificacao/solicitar")

    assert resposta.status_code == 409
    assert resposta.json()["detail"]["code"] == "ja_verificado"


def test_pedido_exige_login_e_papel_de_profissional(client, db_session):
    assert client.post("/profissionais/me/verificacao/solicitar").status_code == 401
    autenticar(criar_empresa(db_session))
    resposta = client.post("/profissionais/me/verificacao/solicitar")
    assert resposta.status_code == 403


def test_profissional_ve_o_proprio_estado_inclusive_os_nao_publicos(client, db_session):
    profissional_id = _com_registro(db_session)
    admin_id = criar_admin(db_session)
    _conferir(
        client,
        admin_id,
        profissional_id,
        status="irregular",
        conselho=None,
        uf=None,
        numero_registro=None,
    )
    autenticar(profissional_id)

    resposta = client.get("/profissionais/me/verificacao")

    assert resposta.status_code == 200
    assert resposta.json()["status"] == "irregular"


# ---------- conferência pelo administrador ----------


def test_administrador_confere_e_o_profissional_ganha_selo_com_data(client, db_session):
    profissional_id = _com_registro(db_session)
    admin_id = criar_admin(db_session)

    resposta = _conferir(client, admin_id, profissional_id)

    assert resposta.status_code == 200
    assert resposta.json()["status"] == "verified"
    publico = _publico(client, profissional_id)
    assert publico["verificado"] is True
    assert publico["verificado_em"] is not None


def test_conferencia_grava_trilha_com_fonte_data_responsavel_e_resultado(client, db_session):
    profissional_id = _com_registro(db_session)
    admin_id = criar_admin(db_session)

    _conferir(client, admin_id, profissional_id)

    (linha,) = _linhas_da_trilha(db_session, profissional_id)
    assert linha.status_novo == StatusVerificacao.verified
    assert linha.conselho == "COREN" and linha.uf == "SC"  # normalizados
    assert linha.numero_registro == "123456"
    assert linha.fonte == "Portal de consulta do COREN-SC"
    assert linha.metodo == "consulta_manual_fonte_oficial"
    assert linha.ator_tipo.value == "administrador" and linha.ator_id == admin_id
    assert linha.verificado_em is not None


def test_so_administrador_registra_conferencia(client, db_session):
    profissional_id = _com_registro(db_session)
    outro_profissional = _com_registro(db_session)

    # sem login
    assert (
        client.post(
            f"/admin/profissionais/{profissional_id}/verificacao", json=CONFERENCIA
        ).status_code
        == 401
    )
    # o próprio profissional tentando se dar o selo
    autenticar(profissional_id)
    resposta = client.post(f"/admin/profissionais/{profissional_id}/verificacao", json=CONFERENCIA)
    assert resposta.status_code == 403
    assert resposta.json()["detail"]["code"] == "apenas_admin"
    # outro profissional
    autenticar(outro_profissional)
    assert (
        client.post(
            f"/admin/profissionais/{profissional_id}/verificacao", json=CONFERENCIA
        ).status_code
        == 403
    )
    assert _publico(client, profissional_id)["verificado"] is False
    assert _linhas_da_trilha(db_session, profissional_id) == []


def test_profissional_nao_se_da_selo_pelo_proprio_perfil(client, db_session):
    profissional_id = _com_registro(db_session)
    autenticar(profissional_id)

    client.put(
        "/profissionais/me",
        json={
            "registro_profissional": "COREN-SC 123456",
            "especialidade_ids": [],
            "verificado": True,
            "verificacao_status": "verified",
            "verificado_em": "2026-01-01",
        },
    )

    assert _publico(client, profissional_id)["verificado"] is False
    assert _linhas_da_trilha(db_session, profissional_id) == []


def test_conferencia_verified_exige_conselho_uf_numero_e_fonte(client, db_session):
    profissional_id = _com_registro(db_session)
    admin_id = criar_admin(db_session)

    for campo in ("conselho", "uf", "numero_registro", "fonte"):
        resposta = _conferir(client, admin_id, profissional_id, **{campo: None})
        assert resposta.status_code == 422, campo
    assert _linhas_da_trilha(db_session, profissional_id) == []


def test_resultado_nao_verified_exige_fonte(client, db_session):
    profissional_id = _com_registro(db_session)
    admin_id = criar_admin(db_session)

    sem_fonte = _conferir(client, admin_id, profissional_id, status="irregular", fonte=None)
    com_fonte = _conferir(client, admin_id, profissional_id, status="irregular")

    assert sem_fonte.status_code == 422
    assert com_fonte.status_code == 200


def test_administrador_nao_pode_registrar_pending_nem_unverified(client, db_session):
    profissional_id = _com_registro(db_session)
    admin_id = criar_admin(db_session)

    for status in ("pending", "unverified", "qualquer"):
        assert _conferir(client, admin_id, profissional_id, status=status).status_code == 422


def test_conferir_profissional_inexistente_da_404(client, db_session):
    resposta = _conferir(client, criar_admin(db_session), uuid.uuid4())

    assert resposta.status_code == 404


def test_irregular_e_nao_localizado_nao_aparecem_para_o_publico(client, db_session):
    irregular = _com_registro(db_session)
    nao_localizado = _com_registro(db_session)
    pendente = _com_registro(db_session)
    admin_id = criar_admin(db_session)
    _conferir(client, admin_id, irregular, status="irregular")
    _conferir(client, admin_id, nao_localizado, status="unable_to_verify")
    autenticar(pendente)
    client.post("/profissionais/me/verificacao/solicitar")

    for profissional_id in (irregular, nao_localizado, pendente):
        corpo = _publico(client, profissional_id)
        assert corpo["verificado"] is False
        assert corpo["verificado_em"] is None
        texto = str(corpo).lower()
        assert "irregular" not in texto and "unable" not in texto and "pending" not in texto
        assert "verificacao" not in "".join(corpo.keys())


def test_a_conta_continua_funcionando_com_resultado_irregular(client, db_session):
    profissional_id = _com_registro(db_session)
    _conferir(client, criar_admin(db_session), profissional_id, status="irregular")
    autenticar(profissional_id)

    resposta = client.put(
        "/profissionais/me",
        json={"registro_profissional": "COREN-SC 654321", "bio": "ok", "especialidade_ids": []},
    )

    assert resposta.status_code == 200
    assert client.get("/profissionais").json()["total"] == 1


def test_revogar_o_selo_volta_para_nao_verificado_publicamente(client, db_session):
    profissional_id = _com_registro(db_session)
    admin_id = criar_admin(db_session)
    _conferir(client, admin_id, profissional_id)

    _conferir(client, admin_id, profissional_id, status="irregular")

    publico = _publico(client, profissional_id)
    assert publico["verificado"] is False and publico["verificado_em"] is None
    assert len(_linhas_da_trilha(db_session, profissional_id)) == 2


# ---------- alterar o registro invalida a conferência ----------


def test_alterar_o_registro_derruba_o_selo_e_registra_na_trilha(client, db_session):
    profissional_id = _com_registro(db_session)
    _conferir(client, criar_admin(db_session), profissional_id)
    autenticar(profissional_id)

    client.put(
        "/profissionais/me",
        json={"registro_profissional": "COREN-SC 999999", "especialidade_ids": []},
    )

    assert _publico(client, profissional_id)["verificado"] is False
    ultima = _linhas_da_trilha(db_session, profissional_id)[-1]
    assert ultima.status_anterior == StatusVerificacao.verified
    assert ultima.status_novo == StatusVerificacao.unverified
    assert ultima.ator_tipo.value == "sistema" and ultima.ator_id is None


def test_salvar_o_perfil_sem_mudar_o_registro_nao_derruba_o_selo(client, db_session):
    profissional_id = _com_registro(db_session, registro="COREN-SC 123456")
    _conferir(client, criar_admin(db_session), profissional_id)
    autenticar(profissional_id)

    client.put(
        "/profissionais/me",
        json={
            "registro_profissional": "  COREN-SC 123456 ",
            "bio": "nova bio",
            "especialidade_ids": [],
        },
    )

    assert _publico(client, profissional_id)["verificado"] is True
    assert len(_linhas_da_trilha(db_session, profissional_id)) == 1


# ---------- área do administrador ----------


def test_admin_eu_distingue_administrador_de_quem_nao_e(client, db_session):
    autenticar(criar_admin(db_session))
    assert client.get("/admin/eu").status_code == 200
    autenticar(criar_profissional(db_session))
    assert client.get("/admin/eu").status_code == 403


def test_admin_lista_pendentes_com_o_registro_informado(client, db_session):
    pendente = _com_registro(db_session, registro="CRM-SC 55555")
    nao_pediu = _com_registro(db_session)
    autenticar(pendente)
    client.post("/profissionais/me/verificacao/solicitar")
    autenticar(criar_admin(db_session))

    resposta = client.get("/admin/verificacoes", params={"status": "pending"})

    assert resposta.status_code == 200
    ids = [i["user_id"] for i in resposta.json()["items"]]
    assert ids == [str(pendente)] and str(nao_pediu) not in ids
    assert resposta.json()["items"][0]["registro_informado"] == "CRM-SC 55555"


def test_lista_e_historico_do_admin_sao_fechados_para_os_demais(client, db_session):
    profissional_id = _com_registro(db_session)
    autenticar(profissional_id)
    assert client.get("/admin/verificacoes").status_code == 403
    assert client.get(f"/admin/profissionais/{profissional_id}/verificacoes").status_code == 403


def test_historico_do_admin_mostra_a_trilha_na_ordem(client, db_session):
    profissional_id = _com_registro(db_session)
    autenticar(profissional_id)
    client.post("/profissionais/me/verificacao/solicitar")
    admin_id = criar_admin(db_session)
    _conferir(client, admin_id, profissional_id)

    resposta = client.get(f"/admin/profissionais/{profissional_id}/verificacoes")

    assert resposta.status_code == 200
    assert [i["status_novo"] for i in resposta.json()] == ["pending", "verified"]
    assert resposta.json()[1]["ator_id"] == str(admin_id)


# ---------- busca ----------


def test_busca_identifica_verificados_sem_excluir_os_demais(client, db_session):
    verificado = _com_registro(db_session)
    outro = _com_registro(db_session)
    _conferir(client, criar_admin(db_session), verificado)

    todos = client.get("/profissionais").json()
    so_verificados = client.get("/profissionais", params={"verificado": "true"}).json()

    assert todos["total"] == 2
    marcados = {i["user_id"]: i["verificado"] for i in todos["items"]}
    assert marcados == {str(verificado): True, str(outro): False}
    assert [i["user_id"] for i in so_verificados["items"]] == [str(verificado)]


# ---------- trilha só de inserção e exclusão do perfil ----------


def test_trilha_acompanha_a_exclusao_do_profissional(client, db_session):
    profissional_id = _com_registro(db_session)
    _conferir(client, criar_admin(db_session), profissional_id)
    from app.models.profissional import Profissional

    db_session.delete(db_session.get(Profissional, profissional_id))
    db_session.flush()

    restantes = db_session.scalar(
        select(func.count())
        .select_from(VerificacaoRegistro)
        .where(VerificacaoRegistro.profissional_id == profissional_id)
    )
    assert restantes == 0
