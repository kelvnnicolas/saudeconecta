from datetime import UTC, datetime, timedelta

from app.jobs.expirar_demandas import expirar_demandas
from app.jobs.sincronizar_planos import sincronizar_planos
from app.models.demanda import StatusDemanda
from tests.fabrica import criar_demanda, criar_empresa, plano


def test_expirar_demandas_marca_so_abertas_vencidas(db_session):
    empresa_id = criar_empresa(db_session)
    vencida = criar_demanda(
        db_session, empresa_id, expira_em=datetime.now(UTC) - timedelta(hours=1)
    )
    vigente = criar_demanda(db_session, empresa_id)
    preenchida_vencida = criar_demanda(
        db_session,
        empresa_id,
        status=StatusDemanda.preenchida,
        expira_em=datetime.now(UTC) - timedelta(hours=1),
    )
    db_session.commit()

    assert expirar_demandas(db_session) == 1

    for demanda in (vencida, vigente, preenchida_vencida):
        db_session.refresh(demanda)
    assert vencida.status == StatusDemanda.expirada
    assert vigente.status == StatusDemanda.aberta
    assert preenchida_vencida.status == StatusDemanda.preenchida


def test_sincronizar_planos_atualiza_price_ids_a_partir_do_env(db_session, monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setenv("STRIPE_PRICE_ESSENCIAL", "price_live_essencial")
    monkeypatch.setenv("STRIPE_PRICE_PRO", "price_live_pro")
    get_settings.cache_clear()
    try:
        sincronizar_planos(db_session)
    finally:
        get_settings.cache_clear()

    assert plano(db_session, "essencial").stripe_price_id == "price_live_essencial"
    assert plano(db_session, "pro").stripe_price_id == "price_live_pro"
