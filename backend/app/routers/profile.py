"""Endpoints for the main features: resume analysis, job suggestions, roadmap, skill trends."""
from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from .. import data
from ..schemas import (GapOut, ResumeOut, RoadmapOut, RoleSkillsIn, RoleSummary, SkillsIn, SkillStat,
                       SuggestOut, TrendDetail, TrendSkill)
from ..services import resume, scoring

router = APIRouter()


def _role(name: str) -> dict:
    role = scoring.find_role(data.roles(), name)
    if role is None:
        raise HTTPException(status_code=404, detail=f"Unknown job '{name}'. See /api/roles for the list.")
    return role


@router.get("/roles", response_model=list[RoleSummary], tags=["jobs"])
def roles():
    """Every job with a profile, biggest first."""
    return [{"role": r["role"], "postings": r["postings"], "median_salary_usd": r.get("median_salary_usd"),
             "demand": r.get("demand", {}).get("label", "stable"),
             "top_skills": [s["skill"] for s in r["skills"][:5]]} for r in data.roles()]


@router.get("/skills", response_model=list[SkillStat], tags=["skills"])
def skills():
    """The skill dictionary (for autocomplete)."""
    return data.skills()


@router.post("/resume/parse", response_model=ResumeOut, tags=["resume"])
async def parse_resume(file: UploadFile = File(...)):
    """Upload a PDF, DOCX or TXT resume (max 5 MB). Returns the skills found. Nothing is stored."""
    raw = await file.read(resume.MAX_BYTES + 1)
    try:
        return resume.parse_resume(file.filename or "", raw, [s["skill"] for s in data.skills()])
    except resume.ResumeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/suggest", response_model=SuggestOut, tags=["jobs"])
def suggest(body: SkillsIn):
    """Job suggestions for a set of skills, split into 'ready to apply' and 'within reach'."""
    user = scoring.normalize_skills(body.skills)
    return {"skills_used": sorted(user), **scoring.suggest(user, data.roles())}


@router.post("/gap", response_model=GapOut, tags=["resume"])
def gap(body: RoleSkillsIn):
    """Skill-by-skill comparison with one job."""
    return scoring.gap(scoring.normalize_skills(body.skills), _role(body.role), data.trend_labels())


@router.post("/roadmap", response_model=RoadmapOut, tags=["jobs"])
def roadmap(body: RoleSkillsIn):
    """Staged learning plan towards one job, with the match % after each stage."""
    user = scoring.normalize_skills(body.skills)
    result = scoring.roadmap(user, _role(body.role), data.trend_labels())
    others = [(r["role"], round(100 * scoring.coverage(user, r))) for r in data.roles() if r["role"] != result["role"]]
    result["also_consider"] = [{"role": n, "match": m} for n, m in sorted(others, key=lambda x: -x[1])[:3]]
    return result


@router.get("/skills/trending", response_model=list[TrendSkill], tags=["skills"])
def trending(label: str = Query("emerging", pattern="^(emerging|stable|declining)$"), limit: int = Query(20, ge=1, le=150)):
    """Skills with a given trend label, biggest change first."""
    items = [s for s in data.trends()["skills"] if s["label"] == label]
    key = (lambda s: -(s["growth"] or 0)) if label == "emerging" else (lambda s: (s["growth"] or 0)) if label == "declining" else (lambda s: -s["share_now"])
    return sorted(items, key=key)[:limit]


@router.get("/skills/{skill}/trend", response_model=TrendDetail, tags=["skills"])
def skill_trend(skill: str):
    """Monthly history, 3-month forecast with an 80% band, and the trend label for one skill."""
    t = data.trends()
    name = scoring.ALIASES.get(skill.strip().lower(), skill.strip().lower())
    for s in t["skills"]:
        if s["skill"] == name:
            return {"months": t["months"], "future": t["future"], "skill": s}
    raise HTTPException(status_code=404, detail=f"No trend data for '{skill}'. It may be too rare in the postings.")
