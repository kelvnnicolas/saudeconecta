import re
import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.models.verificacao import AtorVerificacao, StatusVerificacao

_UF = re.compile(r"^[A-Z]{2}$")


def _limpar(valor: str | None) -> str | None:
    if valor is None:
        return None
    valor = valor.strip()
    return valor or None


class ResultadoVerificacaoRequest(BaseModel):
    """Resultado de uma conferência manual feita por um administrador numa fonte oficial.

    `pending` e `unverified` não entram aqui: o primeiro é pedido pelo profissional e o segundo
    é consequência de alterar o registro.
    """

    status: Literal["verified", "irregular", "unable_to_verify"]
    conselho: str | None = None
    uf: str | None = None
    numero_registro: str | None = None
    fonte: str | None = None
    verificado_em: date | None = None

    @field_validator("conselho", "numero_registro", "fonte", mode="before")
    @classmethod
    def _aparar(cls, valor):
        return _limpar(valor) if isinstance(valor, str) or valor is None else valor

    @field_validator("conselho")
    @classmethod
    def _conselho(cls, valor):
        if valor is None:
            return None
        valor = valor.upper()
        if not 2 <= len(valor) <= 20:
            raise ValueError("conselho deve ter de 2 a 20 caracteres")
        return valor

    @field_validator("uf", mode="before")
    @classmethod
    def _uf(cls, valor):
        valor = _limpar(valor) if isinstance(valor, str) or valor is None else valor
        if valor is None:
            return None
        valor = str(valor).upper()
        if not _UF.match(valor):
            raise ValueError("UF deve ter duas letras")
        return valor

    @field_validator("numero_registro")
    @classmethod
    def _numero(cls, valor):
        if valor is not None and len(valor) > 40:
            raise ValueError("número de registro longo demais")
        return valor

    @field_validator("fonte")
    @classmethod
    def _fonte(cls, valor):
        if valor is not None and not 3 <= len(valor) <= 255:
            raise ValueError("fonte deve ter de 3 a 255 caracteres")
        return valor

    @model_validator(mode="after")
    def _campos_obrigatorios(self):
        if self.fonte is None:
            raise ValueError("fonte da consulta é obrigatória")
        if self.status == "verified":
            faltando = [
                campo
                for campo in ("conselho", "uf", "numero_registro")
                if getattr(self, campo) is None
            ]
            if faltando:
                raise ValueError(f"conferência exige: {', '.join(faltando)}")
        return self


class VerificacaoPropriaRead(BaseModel):
    """Estado de verificação visto pelo PRÓPRIO profissional (nunca devolvido em rota pública)."""

    status: StatusVerificacao
    verificado_em: datetime | None = None


class VerificacaoAdminItem(BaseModel):
    user_id: uuid.UUID
    nome: str
    cidade: str | None
    estado: str | None
    registro_informado: str | None
    status: StatusVerificacao
    atualizado_em: datetime


class VerificacaoAdminLista(BaseModel):
    items: list[VerificacaoAdminItem]
    total: int
    limit: int
    offset: int


class TrilhaItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status_anterior: StatusVerificacao
    status_novo: StatusVerificacao
    conselho: str | None
    uf: str | None
    numero_registro: str | None
    metodo: str | None
    fonte: str | None
    verificado_em: datetime | None
    ator_tipo: AtorVerificacao
    ator_id: uuid.UUID | None
    criado_em: datetime
