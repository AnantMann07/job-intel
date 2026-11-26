"""Job profiles: for every job role, which skills its postings ask for and how often.

Writes:
  backend/artifacts/roles.json   one profile per job role (skills, salary, demand, example openings)
  backend/artifacts/skills.json  the skill dictionary (used to find skills in resumes)

A job profile is the core of the recommender: "Data Engineer" = {sql: 0.68, python: 0.64, aws: 0.41, ...}
where each number is the share of Data Engineer postings that mention that skill.
"""
from __future__ import annotations

import json

import pandas as pd

from .config import (POSTINGS, ROLES_ARTIFACT, SKILL_CATEGORIES, SKILLS_ARTIFACT, ensure_dirs)
from .market import explode_skills
from .titles import OTHER

TOP_SKILLS_PER_ROLE = 40
OPENINGS_PER_ROLE = 40
MIN_ROLE_SHARE = 0.002   # a job needs at least 0.2% of postings (and 20 postings) to get a profile
MIN_SKILL_SHARE = 0.0005  # a skill needs at least 0.05% of postings (and 5) to enter the dictionary


def _categories() -> dict[str, str]:
    if SKILL_CATEGORIES.exists():
        c = pd.read_csv(SKILL_CATEGORIES)
        return dict(zip(c["skill"], c["category"]))
    return {}


def demand_trend(postings: pd.DataFrame, role: str) -> dict:
    """Is this job's share of all postings growing? Compare the first and last 3 months."""
    monthly = postings.groupby("month").size()
    role_monthly = postings[postings["title_norm"] == role].groupby("month").size()
    share = (role_monthly / monthly).dropna().sort_index()
    if len(share) < 6:
        return {"growth": None, "label": "stable"}
    growth = float(share.iloc[-3:].mean() / share.iloc[:3].mean()) if share.iloc[:3].mean() else None
    label = "stable"
    if growth is not None and growth >= 1.10:
        label = "growing"
    elif growth is not None and growth <= 0.90:
        label = "shrinking"
    return {"growth": round(growth, 3) if growth else None, "label": label}


def build_roles(postings: pd.DataFrame, categories: dict[str, str] | None = None) -> list[dict]:
    categories = categories or {}
    with_skills = postings[postings["skills"].map(len) > 0]
    sizes = with_skills["title_norm"].value_counts()
    min_n = max(20, int(MIN_ROLE_SHARE * len(with_skills)))
    roles = []
    long = explode_skills(postings)
    for role, n in sizes.items():
        if role == OTHER or n < min_n:
            continue
        counts = long[long["title_norm"] == role]["skill"].value_counts().head(TOP_SKILLS_PER_ROLE)
        sub = with_skills[with_skills["title_norm"] == role]
        recent = sub[sub["skills"].map(len) >= 3].sort_values("date_posted", ascending=False).head(OPENINGS_PER_ROLE)
        salary = postings.loc[postings["title_norm"] == role, "salary_annual_usd"].median()
        roles.append({
            "role": role,
            "postings": int((postings["title_norm"] == role).sum()),
            "postings_with_skills": int(n),
            "median_salary_usd": None if pd.isna(salary) else round(float(salary)),
            "demand": demand_trend(postings, role),
            "skills": [{"skill": s, "share": round(c / n, 4), "category": categories.get(s, "other")}
                       for s, c in counts.items()],
            "openings": [{
                "title": r.title_raw, "company": None if pd.isna(r.company) else str(r.company),
                "location": None if pd.isna(r.location) else str(r.location),
                "date": r.date_posted.date().isoformat(), "skills": list(r.skills)[:12],
            } for r in recent.itertuples()],
        })
    return sorted(roles, key=lambda r: r["postings"], reverse=True)


def build_skill_dictionary(postings: pd.DataFrame, categories: dict[str, str] | None = None) -> list[dict]:
    categories = categories or {}
    with_skills = postings[postings["skills"].map(len) > 0]
    counts = explode_skills(postings)["skill"].value_counts()
    min_n = max(5, int(MIN_SKILL_SHARE * len(with_skills)))
    return [{"skill": s, "category": categories.get(s, "other"), "postings": int(c),
             "share": round(c / len(with_skills), 5)} for s, c in counts.items() if c >= min_n]


def main() -> None:
    ensure_dirs()
    postings = pd.read_parquet(POSTINGS)
    cats = _categories()
    roles = build_roles(postings, cats)
    skills = build_skill_dictionary(postings, cats)
    ROLES_ARTIFACT.write_text(json.dumps(roles))
    SKILLS_ARTIFACT.write_text(json.dumps(skills))
    print(f"  wrote {len(roles)} job profiles -> {ROLES_ARTIFACT.name}, {len(skills)} skills -> {SKILLS_ARTIFACT.name}")


if __name__ == "__main__":
    main()
