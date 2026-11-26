"""Career Discovery endpoints."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .. import data
from ..services import discovery, scoring

router = APIRouter()


class DiscoverIn(BaseModel):
    answers: dict = Field(default_factory=dict)   # question id -> option id(s); plus strengths, education
    skills: list[str] = Field(default_factory=list, max_length=200)
    surprise: int = 0                              # change to get a different "Surprise me" career


@router.get("/discover/questions")
def questions():
    c = data.careers()
    return {"questions": discovery.QUESTIONS, "strengths": c["strengths"], "education": discovery.EDUCATION}


@router.post("/discover")
def discover(body: DiscoverIn):
    return discovery.discover(body.answers, body.skills, data.careers()["careers"], data.skill_graph(), body.surprise)


@router.get("/careers")
def careers():
    c = data.careers()
    return [{"id": x["id"], "title": x["title"], "category": x["category"], "source": x["source"]} for x in c["careers"]]


@router.post("/careers/{career_id}")
def career(career_id: str, body: DiscoverIn):
    """Full profile of one career, compared with the person's skills."""
    all_c = data.careers()["careers"]
    c = next((x for x in all_c if x["id"] == career_id), None)
    if c is None:
        raise HTTPException(status_code=404, detail="Unknown career.")
    user = scoring.normalize_skills(list(body.skills) + list(body.answers.get("strengths") or []))
    fit, have, transfer, missing = discovery.skill_fit(user, c, data.skill_graph())
    plan = scoring.roadmap(user, discovery.career_as_role(c), data.trend_labels())
    return {
        **{k: c[k] for k in ("id", "title", "category", "source", "description", "involves", "education", "opportunities",
                             "projects", "postings", "median_salary_usd", "demand", "rising_skills")},
        "skills": c["skills"][:12], "skill_fit": round(100 * fit), "have": have, "transferable": transfer,
        "missing": [m["skill"] for m in missing[:8]],
        "roadmap": [{"step": s["number"], "skills": [k["skill"] for k in s["skills"]], "match_after": s["match_after"]} for s in plan["stages"]],
        "related": discovery.related(c, all_c),
    }
