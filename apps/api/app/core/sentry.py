import json
from typing import Any

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

from app.core.config import get_settings

CAMPOS_SENSIVEIS = frozenset({"descricao", "mensagem"})
FILTRADO = "[Filtrado]"


def _limpar(valor: Any) -> Any:
    if isinstance(valor, dict):
        return {
            chave: FILTRADO if chave in CAMPOS_SENSIVEIS else _limpar(item)
            for chave, item in valor.items()
        }
    if isinstance(valor, list):
        return [_limpar(item) for item in valor]
    return valor


def _limpar_corpo(corpo: Any) -> Any:
    if isinstance(corpo, bytes):
        corpo = corpo.decode("utf-8", errors="replace")
    if isinstance(corpo, str):
        try:
            return _limpar(json.loads(corpo))
        except ValueError:
            return FILTRADO if any(campo in corpo for campo in CAMPOS_SENSIVEIS) else corpo
    return _limpar(corpo)


def _limpar_variaveis(variaveis: dict) -> dict:
    # Local vars arrive as repr strings (e.g. "DemandaCreate(descricao='...')"),
    # so matching on key names alone would miss sensitive values nested in objects.
    return {
        nome: (
            FILTRADO
            if nome in CAMPOS_SENSIVEIS or any(campo in str(valor) for campo in CAMPOS_SENSIVEIS)
            else valor
        )
        for nome, valor in variaveis.items()
    }


def _frames(evento: dict):
    for grupo in ("exception", "threads"):
        for valor in (evento.get(grupo) or {}).get("values", []):
            yield from (valor.get("stacktrace") or {}).get("frames", [])


def _contem_dado_sensivel(texto: Any) -> bool:
    # "[SQL" marks any SQLAlchemy DB error, whose server-side text can quote row values.
    return isinstance(texto, str) and (
        "[SQL" in texto
        or "[parameters:" in texto
        or any(campo in texto for campo in CAMPOS_SENSIVEIS)
    )


def remover_dados_sensiveis(evento: dict, _hint: dict | None = None) -> dict:
    for valor in (evento.get("exception") or {}).get("values", []):
        if _contem_dado_sensivel(valor.get("value")):
            valor["value"] = FILTRADO
    logentry = evento.get("logentry")
    if logentry and _contem_dado_sensivel(logentry.get("message")):
        logentry["message"] = FILTRADO
        logentry.pop("params", None)
    if _contem_dado_sensivel(evento.get("message")):
        evento["message"] = FILTRADO
    request = evento.get("request")
    if request and "data" in request:
        request["data"] = _limpar_corpo(request["data"])
    if "extra" in evento:
        evento["extra"] = _limpar(evento["extra"])
    for breadcrumb in (evento.get("breadcrumbs") or {}).get("values", []):
        if "data" in breadcrumb:
            breadcrumb["data"] = _limpar(breadcrumb["data"])
        if _contem_dado_sensivel(breadcrumb.get("message")):
            breadcrumb["message"] = FILTRADO
    for frame in _frames(evento):
        if "vars" in frame:
            frame["vars"] = _limpar_variaveis(frame["vars"])
    return evento


def opcoes_sentry(dsn: str) -> dict:
    return {
        "dsn": dsn,
        "integrations": [FastApiIntegration()],
        "traces_sample_rate": 0.1,
        "send_default_pii": False,
        "include_local_variables": False,
        "before_send": remover_dados_sensiveis,
        "before_send_transaction": remover_dados_sensiveis,
    }


def init_sentry() -> None:
    settings = get_settings()
    if not settings.sentry_dsn:
        return
    sentry_sdk.init(**opcoes_sentry(settings.sentry_dsn))
