"""Step 1 -> first market statistics, saved for the API and for later ML steps.

Writes:
  data/processed/skills_monthly.parquet  month, skill, postings, total, share
  data/processed/role_skills.parquet     role, skill, postings, total, share
  backend/artifacts/market_overview.json small summary the website shows

Important idea: we always use SHARE (postings that mention a skill / postings
that list any skills), never raw counts. Posting volume changes every month,
so raw counts would show fake "trends".
"""
from __future__ import annotations

import json
import math
from datetime import datetime, timezone

import pandas as pd

from .config import (CLEAN_STATS, MARKET_OVERVIEW, POSTINGS, ROLE_SKILLS, SKILL_CATEGORIES,
                     SKILLS_MONTHLY, ensure_dirs)

TOP_SKILLS = 50
TOP_ROLES = 15
SKILLS_PER_ROLE = 10


def explode_skills(postings: pd.DataFrame) -> pd.DataFrame:
    """One row per (posting, skill). Postings with no skills are dropped."""
    has = postings[postings["skills"].map(len) > 0]
    out = has[["job_id", "month", "title_norm", "skills"]].explode("skills")
    return out.rename(columns={"skills": "skill"}).reset_index(drop=True)


def skills_monthly(postings: pd.DataFrame) -> pd.DataFrame:
    long = explode_skills(postings)
    with_skills = postings[postings["skills"].map(len) > 0]
    totals = with_skills.groupby("month").size().rename("total")
    counts = long.groupby(["month", "skill"]).size().rename("postings").reset_index()
    out = counts.merge(totals, left_on="month", right_index=True)
    out["share"] = out["postings"] / out["total"]
    return out.sort_values(["month", "postings"], ascending=[True, False], ignore_index=True)


def role_skills(postings: pd.DataFrame) -> pd.DataFrame:
    long = explode_skills(postings)
    with_skills = postings[postings["skills"].map(len) > 0]
    totals = with_skills.groupby("title_norm").size().rename("total")
    counts = long.groupby(["title_norm", "skill"]).size().rename("postings").reset_index()
    out = counts.merge(totals, left_on="title_norm", right_index=True).rename(columns={"title_norm": "role"})
    out["share"] = out["postings"] / out["total"]
    return out.sort_values(["role", "postings"], ascending=[True, False], ignore_index=True)


def _num(x, digits: int = 4):
    """JSON-safe number: NaN -> None, numpy -> python."""
    if x is None:
        return None
    x = float(x)
    return None if math.isnan(x) else round(x, digits)


def build_overview(postings: pd.DataFrame, rs: pd.DataFrame, categories: pd.DataFrame | None,
                   is_sample: bool) -> dict:
    with_skills = postings[postings["skills"].map(len) > 0]
    n_with_skills = len(with_skills)
    cat = dict(zip(categories["skill"], categories["category"])) if categories is not None else {}

    skill_counts = explode_skills(postings)["skill"].value_counts().head(TOP_SKILLS)
    top_skills = [
        {"skill": s, "category": cat.get(s), "postings": int(n), "share": _num(n / max(n_with_skills, 1))}
        for s, n in skill_counts.items()
    ]

    role_counts = postings["title_norm"].value_counts().head(TOP_ROLES)
    salary = postings.groupby("title_norm")["salary_annual_usd"].median()
    top_roles = []
    for role, n in role_counts.items():
        skills = rs[rs["role"] == role].head(SKILLS_PER_ROLE)
        top_roles.append({
            "role": role,
            "postings": int(n),
            "share": _num(n / len(postings)),
            "median_salary_usd": _num(salary.get(role), 0),
            "top_skills": [{"skill": r.skill, "share": _num(r.share)} for r in skills.itertuples()],
        })

    by_month = postings.groupby("month").size()
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "is_sample": is_sample,
        "source_note": ("FAKE SAMPLE DATA - for testing only" if is_sample
                        else "data_jobs by Luke Barousse (Hugging Face, Apache-2.0)"),
        "kpis": {
            "postings": int(len(postings)),
            "postings_with_skills": int(n_with_skills),
            "companies": int(postings["company"].nunique()),
            "roles": int(postings["title_norm"].nunique()),
            "distinct_skills": int(explode_skills(postings)["skill"].nunique()),
            "date_min": postings["date_posted"].min().date().isoformat(),
            "date_max": postings["date_posted"].max().date().isoformat(),
            "median_salary_usd": _num(postings["salary_annual_usd"].median(), 0),
            "pct_with_salary": _num(postings["salary_annual_usd"].notna().mean()),
            "pct_remote": _num(postings["is_remote"].mean()),
        },
        "postings_by_month": [{"month": m.strftime("%Y-%m"), "postings": int(n)} for m, n in by_month.items()],
        "top_skills": top_skills,
        "top_roles": top_roles,
        "top_countries": [{"country": c, "postings": int(n)}
                          for c, n in postings["country"].value_counts().head(10).items()],
        "levels": [{"level": lvl, "postings": int(n)}
                   for lvl, n in postings["experience_level"].value_counts().items()],
    }


def main() -> dict:
    ensure_dirs()
    if not POSTINGS.exists():
        raise SystemExit(f"Missing {POSTINGS}. Run `python -m pipeline.clean` first.")
    postings = pd.read_parquet(POSTINGS)
    stats = json.loads(CLEAN_STATS.read_text()) if CLEAN_STATS.exists() else {}
    categories = pd.read_csv(SKILL_CATEGORIES) if SKILL_CATEGORIES.exists() else None

    sm = skills_monthly(postings)
    sm.to_parquet(SKILLS_MONTHLY, index=False)
    rs = role_skills(postings)
    rs.to_parquet(ROLE_SKILLS, index=False)

    overview = build_overview(postings, rs, categories, is_sample=bool(stats.get("is_sample")))
    MARKET_OVERVIEW.write_text(json.dumps(overview, indent=2))
    print(f"  wrote {SKILLS_MONTHLY.name}, {ROLE_SKILLS.name} and {MARKET_OVERVIEW}")
    return overview


if __name__ == "__main__":
    main()
