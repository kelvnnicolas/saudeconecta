def test_list_especialidades_returns_the_seeded_rows(client):
    response = client.get("/especialidades")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 10
    names = {item["nome"] for item in body}
    assert "Fisioterapia" in names
    assert "Enfermagem" in names
    assert all(set(item.keys()) == {"id", "nome"} for item in body)
