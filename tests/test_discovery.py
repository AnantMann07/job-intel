"""Career Discovery: personas should land in the right field, and the API should work end to end."""
from fastapi.testclient import TestClient

from app.main import app
from app.services import discovery

client = TestClient(app)

TEACHER = {"activities": ["help", "write"], "work_with": ["people", "ideas"], "environments": ["classroom"], "structure": "mixed",
           "strengths": ["teaching", "communication"]}
DESIGNER = {"activities": ["design"], "work_with": ["creative", "people"], "environments": ["studio", "remote"], "structure": "creative"}
ANALYST = {"activities": ["numbers", "solve"], "work_with": ["data"], "environments": ["office"], "structure": "structured"}


def top_categories(result, n=3):
    return [c["category"] for c in result["groups"]["strong"][:n]]


def test_teacher_persona_gets_education(careers, graph):
    r = discovery.discover(TEACHER, [], careers, graph)
    assert "Education" in top_categories(r)
    assert r["groups"]["strong"][0]["reasons"]


def test_designer_persona_gets_creative(careers, graph):
    assert "Creative & Design" in top_categories(discovery.discover(DESIGNER, [], careers, graph))


def test_skills_shift_results_towards_data(careers, graph):
    r = discovery.discover(ANALYST, ["sql", "python", "excel", "tableau"], careers, graph)
    assert r["groups"]["strong"][0]["category"] in ("Data & Analytics", "Business & Operations")
    assert r["groups"]["strong"][0]["have"]


def test_scores_are_deterministic_and_bounded(careers, graph):
    a = discovery.discover(ANALYST, ["sql"], careers, graph)
    b = discovery.discover(ANALYST, ["sql"], careers, graph)
    assert a == b
    for group in a["groups"].values():
        for c in group:
            assert 0 <= c["match"] <= 100


def test_no_career_repeats_across_groups(careers, graph):
    r = discovery.discover(TEACHER, ["python"], careers, graph)
    ids = [c["id"] for g in r["groups"].values() for c in g]
    assert len(ids) == len(set(ids))


def test_transferable_skill_credit(careers, graph):
    career = {"skills": [{"skill": "sql", "weight": 1.0}], "id": "x"}
    full, *_ = discovery.skill_fit({"sql"}, career, graph)
    partial, _, transfer, _ = discovery.skill_fit({"python"}, career, graph)
    none, *_ = discovery.skill_fit({"blender"}, career, graph)
    assert full == 1 and 0 < partial < 1 and none == 0
    assert transfer == [{"have": "python", "toward": "sql"}]


def test_surprise_changes(careers, graph):
    a = discovery.discover(ANALYST, ["sql"], careers, graph, surprise=0)["surprise"]
    b = discovery.discover(ANALYST, ["sql"], careers, graph, surprise=1)["surprise"]
    assert a and b and a["id"] != b["id"]


def test_api(artifacts_dir):
    q = client.get("/api/discover/questions").json()
    assert q["questions"] and q["strengths"]
    r = client.post("/api/discover", json={"answers": TEACHER, "skills": []}).json()
    first = r["groups"]["strong"][0]["id"]
    p = client.post(f"/api/careers/{first}", json={"answers": TEACHER, "skills": ["communication"]}).json()
    assert p["title"] and p["involves"] and p["related"]
    assert client.post("/api/careers/nope", json={}).status_code == 404


def test_roadmap_works_for_curated_career(artifacts_dir):
    r = client.post("/api/roadmap", json={"skills": ["communication"], "role": "School Teacher"})
    assert r.status_code == 200 and r.json()["stages"]
