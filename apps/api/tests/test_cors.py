from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_preflight_allows_configured_frontend_origin():
    response = client.options(
        "/especialidades",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_preflight_rejects_unknown_origin():
    response = client.options(
        "/especialidades",
        headers={
            "Origin": "http://evil.example.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert "access-control-allow-origin" not in response.headers


def test_actual_request_carries_allow_origin_header():
    response = client.get("/health", headers={"Origin": "http://localhost:3000"})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
