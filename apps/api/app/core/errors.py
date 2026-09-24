from typing import Any

from fastapi import HTTPException
from pydantic import BaseModel


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
