import json
import uuid
from unittest.mock import patch

import sentry_sdk
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sentry_sdk.transport import Transport

from app.core.auth import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.sentry import FILTRADO, opcoes_sentry, remover_dados_sensiveis
from app.routers import demandas
from tests.fabrica import payload_demanda

DESCRICAO_SECRETA = "descricao-secreta-8f2c"
MENSAGEM_SECRETA = "mensagem-secreta-3a91"
TURNO_VISIVEL = "turno-visivel-77b0"


class TransporteCapturador(Transport):
    def __init__(self, options=None):
        super().__init__(options)
        self.envelopes = []

    def capture_envelope(self, envelope):
        self.envelopes.append(envelope)

    def capture_event(self, event):
        self.envelopes.append(event)


def _serializar(envelopes) -> str:
    partes = []
    for envelope in envelopes:
        if isinstance(envelope, dict):
            partes.append(json.dumps(envelope, default=str))
            continue
        for item in envelope.items:
            partes.append(item.payload.get_bytes().decode("utf-8", errors="replace"))
    return "\n".join(partes)


def test_evento_enviado_ao_sentry_nao_contem_descricao_nem_mensagem(db_session):
    transporte = TransporteCapturador()
    sentry_sdk.init(**opcoes_sentry("https://public@sentry.example.com/1"), transport=transporte)
    try:
        # Built after init, like app.main, so the FastAPI integration hooks the routes.
        app = FastAPI()
        app.include_router(demandas.router)
        app.dependency_overrides[get_db] = lambda: db_session
        app.dependency_overrides[get_current_user] = lambda: CurrentUser(
            id=uuid.uuid4(), email=None, role="authenticated"
        )

        def falhar(db, user_id, data):
            mensagem = MENSAGEM_SECRETA  # noqa: F841 - local var that must not leak
            sentry_sdk.add_breadcrumb(
                category="teste",
                message="criando demanda",
                data={"descricao": data.descricao, "mensagem": MENSAGEM_SECRETA},
            )
            raise RuntimeError("falha simulada ao criar demanda")

        corpo = payload_demanda(db_session, descricao=DESCRICAO_SECRETA, turno=TURNO_VISIVEL)
        with patch("app.services.demandas.criar_demanda", side_effect=falhar):
            response = TestClient(app, raise_server_exceptions=False).post("/demandas", json=corpo)
        sentry_sdk.flush()
    finally:
        sentry_sdk.init(dsn=None)

    assert response.status_code == 500
    enviado = _serializar(transporte.envelopes)
    assert "falha simulada ao criar demanda" in enviado
    assert TURNO_VISIVEL in enviado, "corpo da requisição não foi capturado — teste inválido"
    assert DESCRICAO_SECRETA not in enviado
    assert MENSAGEM_SECRETA not in enviado


def test_remover_dados_sensiveis_limpa_corpo_breadcrumbs_extra_e_variaveis():
    evento = {
        "request": {"data": {"descricao": "a", "turno": "noite", "itens": [{"mensagem": "b"}]}},
        "extra": {"payload": {"mensagem": "c"}},
        "breadcrumbs": {"values": [{"message": "x", "data": {"descricao": "d"}}]},
        "exception": {
            "values": [
                {
                    "stacktrace": {
                        "frames": [
                            {
                                "vars": {
                                    "mensagem": "'e'",
                                    "data": "DemandaCreate(descricao='f', turno='noite')",
                                    "limite": "5",
                                }
                            }
                        ]
                    }
                }
            ]
        },
    }

    limpo = remover_dados_sensiveis(evento)

    assert limpo["request"]["data"] == {
        "descricao": FILTRADO,
        "turno": "noite",
        "itens": [{"mensagem": FILTRADO}],
    }
    assert limpo["extra"] == {"payload": {"mensagem": FILTRADO}}
    assert limpo["breadcrumbs"]["values"][0]["data"] == {"descricao": FILTRADO}
    assert limpo["exception"]["values"][0]["stacktrace"]["frames"][0]["vars"] == {
        "mensagem": FILTRADO,
        "data": FILTRADO,
        "limite": "5",
    }


def test_remover_dados_sensiveis_limpa_corpo_json_em_texto_ou_bytes():
    for corpo in (
        f'{{"descricao": "{DESCRICAO_SECRETA}", "turno": "t"}}',
        f'{{"mensagem": "{MENSAGEM_SECRETA}"}}'.encode(),
    ):
        dados = json.dumps(remover_dados_sensiveis({"request": {"data": corpo}})["request"]["data"])
        assert DESCRICAO_SECRETA not in dados
        assert MENSAGEM_SECRETA not in dados
        assert FILTRADO in dados


def test_remover_dados_sensiveis_descarta_corpo_nao_json_com_campo_sensivel():
    evento = remover_dados_sensiveis({"request": {"data": "descricao=segredo&turno=noite"}})
    assert evento["request"]["data"] == FILTRADO


def test_opcoes_sentry_desligam_variaveis_locais_e_pii():
    opcoes = opcoes_sentry("https://public@sentry.example.com/1")
    assert opcoes["include_local_variables"] is False
    assert opcoes["send_default_pii"] is False
    assert opcoes["before_send"] is remover_dados_sensiveis
    assert opcoes["before_send_transaction"] is remover_dados_sensiveis
