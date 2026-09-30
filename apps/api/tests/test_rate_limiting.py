import pytest

from app.core.rate_limit import limiter


@pytest.fixture
def rate_limiting_enabled():
    limiter.enabled = True
    limiter.reset()
    yield
    limiter.enabled = False
    limiter.reset()


def test_busca_profissionais_returns_429_after_limit_exceeded(client, rate_limiting_enabled):
    for _ in range(30):
        resposta = client.get("/profissionais")
        assert resposta.status_code == 200

    resposta = client.get("/profissionais")
    assert resposta.status_code == 429


def test_busca_profissionais_works_normally_when_rate_limiting_disabled(client):
    for _ in range(35):
        resposta = client.get("/profissionais")
        assert resposta.status_code == 200
