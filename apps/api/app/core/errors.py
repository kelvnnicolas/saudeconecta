import logging
from typing import Any

import sentry_sdk
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger("app")


class ErroNegocioDetalhe(BaseModel):
    code: str
    mensagem: str
    uso: int | None = None
    limite: int | None = None


class ErroNegocio(BaseModel):
    detail: ErroNegocioDetalhe


def erro_negocio(status_code: int, code: str, mensagem: str, **extra: Any) -> HTTPException:
    return HTTPException(
        status_code=status_code, detail={"code": code, "mensagem": mensagem, **extra}
    )


async def _erro_de_banco(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    # Postgres error text can quote row values ("Failing row contains (...)"), which may
    # include LGPD-sensitive free text — so only the type is logged, and the exception
    # never reaches uvicorn's default traceback logging. Handled exceptions without a
    # status_code aren't auto-reported by the Sentry integration, so report explicitly
    # (before_send strips the DB error text).
    sentry_sdk.capture_exception(exc)
    # warning, not error: the logging integration would turn an ERROR record into a
    # second Sentry event for the same failure.
    logger.warning(
        "erro de banco em %s %s: %s", request.method, request.url.path, type(exc).__name__
    )
    return JSONResponse(status_code=500, content={"detail": "Erro interno do servidor"})


def registrar_tratadores(app: FastAPI) -> None:
    app.add_exception_handler(SQLAlchemyError, _erro_de_banco)
