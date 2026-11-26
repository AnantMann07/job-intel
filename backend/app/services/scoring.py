"""All scoring in one place, so every page (and the evaluation script) shows the same numbers.

Inputs are plain Python data loaded from backend/artifacts/roles.json:
    role = {"role": "Data Engineer", "postings": 186000, "median_salary_usd": 125000,
            "demand": {"growth": 1.08, "label": "growing"},
            "skills": [{"skill": "sql", "share": 0.68, "category": "programming"}, ...]}
`share` = fraction of that job's postings that mention the skill.

Three ideas, each easy to explain in a viva:
  * coverage  - what % of the job's top skills (weighted by how often employers ask for them) you have
  * cosine    - how similar your skill set is to the job's whole skill profile
  * demand    - how many postings the job has (log scale, 0-1)
Suggestion score = 0.5 * cosine + 0.3 * coverage + 0.2 * demand.
"""
from __future__ import annotations

import math
from typing import Iterable

TOP_N = 20               # how many of a job's skills count towards "match %"
READY_THRESHOLD = 70     # match % at which a job counts as "ready to apply"
W_COSINE, W_COVERAGE, W_DEMAND = 0.5, 0.3, 0.2
RISING_BOOST = 1.15      # roadmap: rising skills are pulled slightly earlier
STAGE_SIZE = 2           # roadmap: skills per stage
MAX_STAGES = 4

# Common ways people write a skill -> the name used in the job data.
ALIASES = {
    "js": "javascript", "node": "node.js", "nodejs": "node.js", "ts": "typescript",
    "powerbi": "power bi", "power-bi": "power bi", "ms excel": "excel", "microsoft excel": "excel",
    "sklearn": "scikit-learn", "scikit learn": "scikit-learn", "postgres": "postgresql",
    "amazon web services": "aws", "google cloud": "gcp", "google cloud platform": "gcp",
    "microsoft azure": "azure", "golang": "go", "k8s": "kubernetes", "py": "python",
    "tf": "tensorflow", "torch": "pytorch", "ml": "machine learning", "nlp": "natural language processing",
    "mssql": "sql server", "ms sql": "sql server", "gsheets": "sheets", "google sheets": "sheets",
}

PROJECTS = {  # practice-project idea per skill category (roadmap)
    "programming": "Write a small script that cleans a messy CSV and saves a tidy version.",
    "cloud": "Store a dataset in cloud storage and query it from a notebook.",
    "databases": "Design a small database for job postings and write 5 useful queries.",
    "libraries": "Build a notebook that loads data, explores it and trains a simple model.",
    "analyst_tools": "Build a one-page dashboard that answers three business questions.",
    "os": "Automate a daily task with a shell script and a scheduled job.",
    "async": "Build a small pipeline that moves data between two services automatically.",
    "webframeworks": "Build a tiny web app with one page and one API endpoint.",
    "sync": "Set up a shared project board and document a small team workflow.",
    "other": "Use it in a small end-to-end project and write a short README about it.",
}


# ---------- helpers ----------

def normalize_skills(skills: Iterable[str]) -> set[str]:
    """Lowercase, trim and map aliases ("sklearn" -> "scikit-learn")."""
    out = set()
    for s in skills:
        s = str(s).strip().lower()
        if s:
            out.add(ALIASES.get(s, s))
    return out


def _top(role: dict, n: int = TOP_N) -> list[dict]:
    return role["skills"][:n]


def coverage(user: set[str], role: dict) -> float:
    """0-1: share-weighted fraction of the job's top skills the user has."""
    top = _top(role)
    total = sum(s["share"] for s in top)
    have = sum(s["share"] for s in top if s["skill"] in user)
    return have / total if total else 0.0


def cosine(user: set[str], role: dict) -> float:
    """0-1: cosine similarity between the user's skills (0/1) and the job's skill shares."""
    if not user:
        return 0.0
    dot = sum(s["share"] for s in role["skills"] if s["skill"] in user)
    norm_role = math.sqrt(sum(s["share"] ** 2 for s in role["skills"]))
    return dot / (norm_role * math.sqrt(len(user))) if norm_role else 0.0


def demand(role: dict, roles: list[dict]) -> float:
    """0-1: log(postings) relative to the biggest job."""
    biggest = max(r["postings"] for r in roles)
    return math.log1p(role["postings"]) / math.log1p(biggest) if biggest else 0.0


def score(user: set[str], role: dict, roles: list[dict], method: str = "blend") -> float:
    if method == "cosine":
        return cosine(user, role)
    if method == "coverage":
        return coverage(user, role)
    if method == "popularity":
        return demand(role, roles)
    return W_COSINE * cosine(user, role) + W_COVERAGE * coverage(user, role) + W_DEMAND * demand(role, roles)


def rank_roles(user: set[str], roles: list[dict], method: str = "blend") -> list[tuple[str, float]]:
    ranked = [(r["role"], score(user, r, roles, method)) for r in roles]
    return sorted(ranked, key=lambda x: x[1], reverse=True)


def find_role(roles: list[dict], name: str) -> dict | None:
    for r in roles:
        if r["role"].lower() == str(name).strip().lower():
            return r
    return None


# ---------- what the pages need ----------

def gap(user: set[str], role: dict, trend_labels: dict[str, str] | None = None) -> dict:
    """Resume Analysis: match %, and each top skill as matched / missing."""
    trend_labels = trend_labels or {}
    rows = [{
        "skill": s["skill"], "share": round(s["share"], 4), "category": s.get("category"),
        "status": "matched" if s["skill"] in user else "missing",
        "trend": trend_labels.get(s["skill"], "stable"),
    } for s in _top(role)]
    missing = [r for r in rows if r["status"] == "missing"]
    learn_first = []
    current = set(user)
    for r in sorted(missing, key=lambda r: _priority(r["share"], r["trend"]), reverse=True)[:3]:
        current.add(r["skill"])
        learn_first.append({"skill": r["skill"], "match_after": round(100 * coverage(current, role))})
    return {
        "role": role["role"],
        "match": round(100 * coverage(user, role)),
        "matched_count": len(rows) - len(missing),
        "total": len(rows),
        "skills": rows,
        "learn_first": learn_first,
    }


def _priority(share: float, trend: str) -> float:
    return share * (RISING_BOOST if trend == "emerging" else 1.0)


def suggest(user: set[str], roles: list[dict], k: int = 6) -> dict:
    """Job Suggestions: ranked jobs split into 'ready' and 'within reach'."""
    ranked = rank_roles(user, roles)[:k]
    jobs = []
    for name, s in ranked:
        role = find_role(roles, name)
        top = _top(role)
        have = [x["skill"] for x in top if x["skill"] in user]
        missing = [x["skill"] for x in top if x["skill"] not in user]
        gains = []
        for m in missing[:5]:
            gains.append((m, coverage(user | {m}, role) - coverage(user, role)))
        gains.sort(key=lambda g: g[1], reverse=True)
        match = round(100 * coverage(user, role))
        jobs.append({
            "role": name,
            "score": round(s, 4),
            "match": match,
            "ready": match >= READY_THRESHOLD,
            "postings": role["postings"],
            "median_salary_usd": role.get("median_salary_usd"),
            "demand": role.get("demand", {}).get("label", "stable"),
            "have": have[:6],
            "to_learn": [g[0] for g in gains[:3]],
            "biggest_gain": gains[0][0] if gains else None,
            "openings": best_openings(user, role, 3),
        })
    return {"ready": [j for j in jobs if j["ready"]], "within_reach": [j for j in jobs if not j["ready"]]}


def best_openings(user: set[str], role: dict, n: int = 3) -> list[dict]:
    """Example postings for this job that use the most of the user's skills."""
    scored = []
    for o in role.get("openings", []):
        overlap = len(user & set(o.get("skills", [])))
        scored.append((overlap, o))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [{**o, "uses": ov, "of": len(user)} for ov, o in scored[:n]]


def roadmap(user: set[str], role: dict, trend_labels: dict[str, str] | None = None) -> dict:
    """My Roadmap: missing skills in stages, with the match % after each stage."""
    trend_labels = trend_labels or {}
    top = _top(role)
    have = [s for s in top if s["skill"] in user]
    missing = [s for s in top if s["skill"] not in user]
    missing.sort(key=lambda s: _priority(s["share"], trend_labels.get(s["skill"], "stable")), reverse=True)
    todo = missing[: STAGE_SIZE * MAX_STAGES]
    stages, current = [], set(user)
    for i in range(0, len(todo), STAGE_SIZE):
        chunk = todo[i:i + STAGE_SIZE]
        current |= {s["skill"] for s in chunk}
        category = chunk[0].get("category") or "other"
        stages.append({
            "number": len(stages) + 1,
            "title": _stage_title(chunk),
            "skills": [{"skill": s["skill"], "share": round(s["share"], 4),
                        "rising": trend_labels.get(s["skill"]) == "emerging"} for s in chunk],
            "match_after": round(100 * coverage(current, role)),
            "project": PROJECTS.get(category, PROJECTS["other"]),
        })
    return {
        "role": role["role"],
        "ready": round(100 * coverage(user, role)),
        "have": [{"skill": s["skill"], "share": round(s["share"], 4)} for s in have],
        "top_count": len(top),
        "stages": stages,
        "final_match": stages[-1]["match_after"] if stages else round(100 * coverage(user, role)),
    }


def _stage_title(chunk: list[dict]) -> str:
    """Name a stage after the kinds of skills in it, e.g. "Cloud & Frameworks"."""
    names = {
        "programming": "Programming", "cloud": "Cloud", "databases": "Databases",
        "libraries": "Frameworks", "analyst_tools": "BI tools", "os": "Systems",
        "async": "Pipelines", "webframeworks": "Web", "sync": "Collaboration", "other": "Tools",
    }
    seen = []
    for s in chunk:
        n = names.get(s.get("category") or "other", "Tools")
        if n not in seen:
            seen.append(n)
    return " & ".join(seen)
