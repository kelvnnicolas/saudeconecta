import uuid
from datetime import UTC, datetime

from app.models.avaliacao import Avaliacao
from app.models.contato import Contato
from app.models.especialidade import Especialidade
from app.models.profile import Papel, Profile
from app.models.profissional import Profissional


def _criar_profissional_com_especialidade(db_session, nome_especialidade: str) -> Profissional:
    especialidade = db_session.query(Especialidade).filter_by(nome=nome_especialidade).first()
    if especialidade is None:
        especialidade = Especialidade(nome=nome_especialidade)
        db_session.add(especialidade)
        db_session.flush()

    user_id = uuid.uuid4()
    db_session.add(Profile(id=user_id, papel=Papel.profissional, nome=f"Prof {user_id}"))
    db_session.flush()
    profissional = Profissional(user_id=user_id)
    profissional.especialidades = [especialidade]
    db_session.add(profissional)
    db_session.flush()
    return profissional


def test_get_relatorio_requires_date_range(client):
    response = client.get("/analytics/relatorio")
    assert response.status_code == 422


def test_get_relatorio_rejects_data_fim_before_data_inicio(client):
    response = client.get(
        "/analytics/relatorio",
        params={"data_inicio": "2026-01-31", "data_fim": "2026-01-01"},
    )
    assert response.status_code == 400


def test_get_relatorio_returns_zeroed_metrics_when_no_data(client):
    response = client.get(
        "/analytics/relatorio",
        params={"data_inicio": "2026-01-01", "data_fim": "2026-01-31"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["profissionais_por_especialidade"] == {}
    assert body["nota_media_geral"] is None
    assert body["volume_contatos_periodo"] == 0


def test_get_relatorio_counts_profissionais_por_especialidade(client, db_session):
    _criar_profissional_com_especialidade(db_session, "Enfermagem")
    _criar_profissional_com_especialidade(db_session, "Enfermagem")
    _criar_profissional_com_especialidade(db_session, "Fisioterapia")
    db_session.commit()

    response = client.get(
        "/analytics/relatorio",
        params={"data_inicio": "2026-01-01", "data_fim": "2026-01-31"},
    )

    assert response.status_code == 200
    assert response.json()["profissionais_por_especialidade"] == {
        "Enfermagem": 2,
        "Fisioterapia": 1,
    }


def test_get_relatorio_calculates_nota_media_geral(client, db_session):
    autor_id = uuid.uuid4()
    alvo_id = uuid.uuid4()
    db_session.add(Profile(id=autor_id, papel=Papel.empresa, nome="Empresa"))
    db_session.add(Profile(id=alvo_id, papel=Papel.profissional, nome="Profissional"))
    db_session.flush()
    db_session.add(Avaliacao(autor_id=autor_id, alvo_id=alvo_id, nota=5))
    db_session.add(Avaliacao(autor_id=autor_id, alvo_id=alvo_id, nota=3))
    db_session.commit()

    response = client.get(
        "/analytics/relatorio",
        params={"data_inicio": "2026-01-01", "data_fim": "2026-01-31"},
    )

    assert response.status_code == 200
    assert response.json()["nota_media_geral"] == 4.0


def test_get_relatorio_counts_volume_contatos_within_period_only(client, db_session):
    solicitante_id = uuid.uuid4()
    profissional = _criar_profissional_com_especialidade(db_session, "Nutrição")
    db_session.add(Profile(id=solicitante_id, papel=Papel.empresa, nome="Empresa X"))
    db_session.flush()

    dentro = Contato(
        solicitante_id=solicitante_id,
        profissional_id=profissional.user_id,
        mensagem="Dentro do período",
        criado_em=datetime(2026, 1, 15, 12, 0, tzinfo=UTC),
    )
    fora = Contato(
        solicitante_id=solicitante_id,
        profissional_id=profissional.user_id,
        mensagem="Fora do período",
        criado_em=datetime(2026, 2, 1, 12, 0, tzinfo=UTC),
    )
    db_session.add_all([dentro, fora])
    db_session.commit()

    response = client.get(
        "/analytics/relatorio",
        params={"data_inicio": "2026-01-01", "data_fim": "2026-01-31"},
    )

    assert response.status_code == 200
    assert response.json()["volume_contatos_periodo"] == 1
