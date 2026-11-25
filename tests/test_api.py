from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health(artifacts_dir):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "market_overview.json" in body["artifacts"]


def test_overview(artifacts_dir):
    r = client.get("/api/market/overview")
    assert r.status_code == 200
    assert r.json()["kpis"]["postings"] > 0


def test_top_skills_limit(artifacts_dir):
    r = client.get("/api/market/skills/top", params={"limit": 5})
    assert r.status_code == 200
    assert len(r.json()) == 5


def test_top_skills_for_role(artifacts_dir):
    r = client.get("/api/market/skills/top", params={"role": "data engineer", "limit": 3})
    assert r.status_code == 200
    assert len(r.json()) == 3


def test_unknown_role_404(artifacts_dir):
    assert client.get("/api/market/skills/top", params={"role": "Astronaut"}).status_code == 404


def test_missing_artifacts_503(tmp_path, monkeypatch):
    monkeypatch.setenv("ARTIFACTS_DIR", str(tmp_path / "empty"))
    assert client.get("/api/market/overview").status_code == 503
    assert client.get("/health").status_code == 200  # health still answers
