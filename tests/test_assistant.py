"""Tests for the JobIntel Assistant. No real AI calls: Gemini is replaced by a fake."""
import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import assistant

client = TestClient(app)


@pytest.fixture(autouse=True)
def no_key(monkeypatch):
    """Every test starts with AI switched off and an empty rate limit."""
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_MODEL", raising=False)
    assistant._rate.clear()


def ask(roles, trends, message, skills=(), overview=None):
    names = sorted({s["skill"] for r in roles for s in r["skills"]})
    return assistant.answer(message, list(skills), [], roles, names, trends, overview or {"kpis": {"postings": 500}})


def test_finds_jobs_and_skills(roles):
    names = sorted({s["skill"] for r in roles for s in r["skills"]})
    assert assistant.find_roles("how do I become a data engineer?", roles) == ["Data Engineer"]
    assert "Machine Learning Engineer" in assistant.find_roles("tips for ML engineers", roles)
    found = assistant.find_skills("Is Snowflake rising? I also know sklearn", names)
    assert "snowflake" in found and "scikit-learn" in found
    assert assistant.find_skills("how do I go about it", names) == []  # "go" is just a word here


@pytest.mark.parametrize("message, intent", [
    ("hi", "help"),
    ("Which jobs fit me?", "suggest"),
    ("What should I learn next?", "learn"),
    ("How do I become a Data Engineer?", "roadmap"),
    ("which skills are rising?", "trend"),
    ("highest paying jobs?", "salary"),
])
def test_intents(roles, trends, message, intent):
    assert ask(roles, trends, message, ["sql"])["intent"] == intent


def test_suggestions_without_ai(roles, trends):
    out = ask(roles, trends, "Which jobs fit me?", ["sql", "python", "excel", "tableau"])
    assert out["source"] == "data"
    top = assistant.scoring.rank_roles({"sql", "python", "excel", "tableau"}, roles)[0][0]
    assert top in out["reply"]
    assert {"label": "All jobs for you", "href": "/suggestions"} in out["links"]


def test_asks_for_skills_when_none(roles, trends):
    out = ask(roles, trends, "Which jobs fit me?")
    assert "your skills" in out["reply"].lower()


def test_skills_typed_in_chat_are_used(roles, trends):
    out = ask(roles, trends, "I know sql, python and tableau. What jobs can I get?")
    assert out["intent"] == "suggest"
    assert set(out["skills_added"]) == {"sql", "python", "tableau"}
    assert "match" in out["reply"]


def test_roadmap_answer_matches_roadmap_page(roles, trends):
    out = ask(roles, trends, "How do I become a Data Engineer?", ["sql"])
    plan = assistant.scoring.roadmap({"sql"}, assistant.scoring.find_role(roles, "Data Engineer"))
    assert "Stage 1" in out["reply"]
    assert f"{plan['ready']}%" in out["reply"]
    assert out["links"][0]["href"] == "/roadmap?role=Data%20Engineer"


def test_trend_answer(roles, trends):
    skill = trends["skills"][0]["skill"]
    out = ask(roles, trends, f"Is {skill} still in demand?")
    assert out["intent"] == "trend" and skill in out["reply"]


class FakeResponse:
    def __init__(self, status, payload):
        self.status_code, self._payload = status, payload

    def json(self):
        return self._payload


def test_uses_gemini_when_key_is_set(roles, trends, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    sent = {}

    def fake_post(url, headers, json, timeout):
        sent.update(url=url, headers=headers, body=json)
        return FakeResponse(200, {"candidates": [{"content": {"parts": [{"text": "**Data Analyst** fits you best."}]}}]})

    monkeypatch.setattr(assistant.httpx, "post", fake_post)
    out = ask(roles, trends, "Which jobs fit me?", ["sql", "excel"])
    assert out["source"] == "ai"
    assert out["reply"] == "**Data Analyst** fits you best."
    assert sent["headers"]["x-goog-api-key"] == "test-key"
    system = sent["body"]["system_instruction"]["parts"][0]["text"]
    assert "FACTS:" in system and "User's skills: excel, sql." in system  # the model only sees our data


def test_falls_back_when_gemini_fails(roles, trends, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    calls = []

    def failing_post(url, **kwargs):
        calls.append(url)
        if len(calls) == 1:
            return FakeResponse(429, {})  # first model: quota used up
        raise httpx.ConnectError("offline")  # second model: network down

    monkeypatch.setattr(assistant.httpx, "post", failing_post)
    out = ask(roles, trends, "Which jobs fit me?", ["sql", "excel"])
    assert len(calls) == 2  # tried both models
    assert out["source"] == "data" and "match" in out["reply"]


def test_rate_limit_switches_to_templates(roles, trends, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(assistant.httpx, "post",
                        lambda url, **kw: FakeResponse(200, {"candidates": [{"content": {"parts": [{"text": "ok"}]}}]}))
    sources = [ask(roles, trends, "hi")["source"] for _ in range(assistant.AI_PER_MINUTE + 1)]
    assert sources[:-1] == ["ai"] * assistant.AI_PER_MINUTE and sources[-1] == "data"


def test_chat_endpoint(artifacts_dir):
    r = client.post("/api/assistant/chat", json={"message": "How do I become a Data Analyst?", "skills": ["sql"]})
    assert r.status_code == 200
    body = r.json()
    assert body["source"] == "data" and "Data Analyst" in body["reply"]
    assert client.get("/api/assistant/status").json() == {"ai": False, "models": []}


def test_chat_endpoint_rejects_long_messages(artifacts_dir):
    r = client.post("/api/assistant/chat", json={"message": "x" * 501})
    assert r.status_code == 422
