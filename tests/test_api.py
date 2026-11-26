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


# ---------- main features ----------

def test_roles_and_skills(artifacts_dir):
    roles = client.get("/api/roles").json()
    assert roles[0]["postings"] >= roles[-1]["postings"]
    assert len(client.get("/api/skills").json()) > 5


def test_suggest(artifacts_dir):
    r = client.post("/api/suggest", json={"skills": ["sql", "python", "aws", "spark", "airflow"]})
    assert r.status_code == 200
    body = r.json()
    jobs = body["ready"] + body["within_reach"]
    assert jobs and jobs[0]["role"] == "Data Engineer"


def test_gap_and_roadmap(artifacts_dir):
    g = client.post("/api/gap", json={"skills": ["sql"], "role": "data scientist"})
    assert g.status_code == 200 and 0 <= g.json()["match"] <= 100
    rm = client.post("/api/roadmap", json={"skills": ["sql"], "role": "Data Scientist"})
    assert rm.status_code == 200 and rm.json()["stages"]
    assert client.post("/api/roadmap", json={"skills": [], "role": "Astronaut"}).status_code == 404


def test_resume_upload(artifacts_dir):
    files = {"file": ("cv.txt", b"Data Analyst\nSkills: SQL, Excel, Tableau, Python", "text/plain")}
    r = client.post("/api/resume/parse", files=files)
    assert r.status_code == 200
    assert {"sql", "excel", "tableau", "python"} <= set(r.json()["skills"])
    bad = client.post("/api/resume/parse", files={"file": ("x.png", b"abc", "image/png")})
    assert bad.status_code == 400


def test_trends(artifacts_dir):
    r = client.get("/api/skills/trending", params={"label": "stable", "limit": 3})
    assert r.status_code == 200 and len(r.json()) <= 3
    t = client.get("/api/skills/python/trend")
    assert t.status_code == 200 and len(t.json()["skill"]["forecast"]) == 3
