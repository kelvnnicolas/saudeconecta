import math
import uuid

import sentry_sdk
from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.models.notificacao import Notificacao, TipoNotificacao
from app.services.entitlements import (
    assinatura_vigente,
    contar_uso_mensal,
    inicio_do_mes,
    limite_vigente,
)
from app.services.notificacao_service import registrar_notificacao

# Mesma fração da barra de uso do frontend (lib/use-uso-mensal.ts, FRACAO_DE_AVISO).
FRACAO_DE_AVISO = 0.8


def _faixa(uso: int, limite: int) -> TipoNotificacao | None:
    if uso >= limite:
        return TipoNotificacao.cota_esgotada
    if uso >= math.ceil(limite * FRACAO_DE_AVISO):
        return TipoNotificacao.cota_quase_no_limite
    return None


def avisar_cota_se_preciso(db: Session, empresa_id: uuid.UUID) -> None:
    """Notifica a empresa ao chegar a 80% e ao esgotar a cota do mês: uma vez por faixa e mês.

    Chamado logo depois de uma ação que gasta cota (contato ou demanda). Nunca derruba essa
    ação: roda em savepoint e a falha só vai ao Sentry. Não faz commit; quem chama commita.
    """
    try:
        with db.begin_nested():
            assinatura = assinatura_vigente(db, empresa_id)
            limite = limite_vigente(assinatura)
            if limite is None:
                return
            uso = contar_uso_mensal(db, empresa_id)
            tipo = _faixa(uso, limite)
            if tipo is None:
                return
            ja_avisou = db.scalar(
                select(
                    exists().where(
                        Notificacao.destinatario_id == empresa_id,
                        Notificacao.tipo == tipo,
                        Notificacao.criado_em >= inicio_do_mes(),
                    )
                )
            )
            if ja_avisou:
                return
            link = "/assinatura" if assinatura is not None else "/empresa/planos"
            if tipo == TipoNotificacao.cota_esgotada:
                titulo = "Você atingiu o limite do mês"
                corpo = (
                    f"Você usou os {limite} contatos e demandas deste mês. Para continuar "
                    "encontrando profissionais de saúde, veja os planos e escolha a opção ideal."
                )
            else:
                titulo = "Sua cota do mês está acabando"
                corpo = (
                    f"Você já usou {uso} de {limite} contatos e demandas deste mês. "
                    "Veja como ampliar o limite."
                )
            registrar_notificacao(
                db,
                destinatario_id=empresa_id,
                tipo=tipo,
                titulo=titulo,
                corpo=corpo,
                link=link,
            )
    except Exception as exc:
        sentry_sdk.capture_exception(exc)
