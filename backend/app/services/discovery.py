"""Career Discovery: recommend careers from interests, preferences, strengths and skills.

How a career is scored (all parts are 0..1, no random numbers):
  interest    cosine similarity between the person's RIASEC interest vector (built from
              their answers) and the career's RIASEC profile (careers.json)
  skills      share-weighted coverage of the career's skills; a missing skill earns partial
              credit (TRANSFER_CREDIT x similarity) if the person has a skill that often appears
              with it in the postings (skill_graph.json) -> "transferable skills"
  work style  overlap of what they like working with (people, data, ...) and where
  structure   how close their structured / creative preference is to the career's
  score = 0.45 interest + 0.35 skills + 0.10 work style + 0.10 structure
  (with fewer than 2 skills the skills part is left out and the rest is rescaled)

Groups
  strong       best overall scores
  hidden       good interest fit, but in a different field from the person's obvious one
  emerging     careers in a developing field, or whose skills are rising in the postings data
  alternative  careers reachable mainly through transferable skills plus some learning
  surprise     careers least like their usual interests that still use some of their skills
"""
from __future__ import annotations

import math

from . import scoring

W_INTEREST, W_SKILLS, W_STYLE, W_STRUCTURE = 0.45, 0.35, 0.10, 0.10
TRANSFER_CREDIT = 0.6
RIASEC = "RIASEC"

# Questions shown on the Discovery page. Each option nudges the RIASEC interest vector.
QUESTIONS = [
    {"id": "activities", "title": "What do you enjoy doing?", "hint": "Pick as many as you like.", "multi": True, "options": [
        {"id": "solve", "label": "Solving puzzles and tricky problems", "riasec": {"I": 1}},
        {"id": "build", "label": "Building, fixing or setting things up", "riasec": {"R": 1}},
        {"id": "design", "label": "Drawing, designing or making things look good", "riasec": {"A": 1}},
        {"id": "help", "label": "Helping or teaching people", "riasec": {"S": 1}},
        {"id": "lead", "label": "Leading, persuading or pitching ideas", "riasec": {"E": 1}},
        {"id": "organise", "label": "Planning and organising", "riasec": {"C": 1}},
        {"id": "research", "label": "Reading and researching", "riasec": {"I": 0.8, "A": 0.2}},
        {"id": "write", "label": "Writing and storytelling", "riasec": {"A": 0.7, "S": 0.3}},
        {"id": "numbers", "label": "Working with numbers", "riasec": {"C": 0.6, "I": 0.4}},
    ]},
    {"id": "work_with", "title": "What would you rather work with?", "hint": "Pick up to three.", "multi": True, "max": 3, "options": [
        {"id": "people", "label": "People", "riasec": {"S": 0.7, "E": 0.3}},
        {"id": "data", "label": "Data", "riasec": {"I": 0.6, "C": 0.4}},
        {"id": "technology", "label": "Technology", "riasec": {"R": 0.6, "I": 0.4}},
        {"id": "ideas", "label": "Ideas", "riasec": {"I": 0.4, "E": 0.3, "A": 0.3}},
        {"id": "creative", "label": "Creative work", "riasec": {"A": 1}},
    ]},
    {"id": "environments", "title": "Where would you like to work?", "hint": "Pick any that appeal to you.", "multi": True, "options": [
        {"id": "office", "label": "An office with a team"}, {"id": "remote", "label": "From home"},
        {"id": "classroom", "label": "A classroom or campus"}, {"id": "studio", "label": "A studio or creative space"},
        {"id": "lab", "label": "A lab or research centre"}, {"id": "field", "label": "Out in the field"},
    ]},
    {"id": "structure", "title": "How do you like your work?", "hint": "Pick one.", "multi": False, "options": [
        {"id": "structured", "label": "Clear tasks and a set way of doing them", "value": 0.15, "riasec": {"C": 0.5}},
        {"id": "mixed", "label": "A mix of both", "value": 0.5},
        {"id": "creative", "label": "Freedom to try my own ideas", "value": 0.85, "riasec": {"A": 0.4, "I": 0.2}},
    ]},
]
EDUCATION = ["School (12th)", "Diploma", "Bachelor's: engineering or computer science", "Bachelor's: science or maths",
             "Bachelor's: commerce or business", "Bachelor's: arts, humanities or design", "Master's or higher"]

_OPTIONS = {q["id"]: {o["id"]: o for o in q["options"]} for q in QUESTIONS}
INTEREST_WORDS = {"R": "hands-on building and fixing", "I": "solving problems and analysing", "A": "creating and designing",
                  "S": "helping and teaching people", "E": "leading and persuading", "C": "organising and detail"}


def interest_vector(answers: dict) -> dict[str, float]:
    vec = {k: 0.0 for k in RIASEC}
    for qid in ("activities", "work_with", "structure"):
        chosen = answers.get(qid) or []
        for oid in ([chosen] if isinstance(chosen, str) else chosen):
            for k, w in _OPTIONS[qid].get(oid, {}).get("riasec", {}).items():
                vec[k] += w
    return vec


def _cos(a: dict[str, float], b: dict[str, float]) -> float:
    dot = sum(a[k] * b[k] for k in RIASEC)
    na, nb = math.sqrt(sum(v * v for v in a.values())), math.sqrt(sum(v * v for v in b.values()))
    return dot / (na * nb) if na and nb else 0.0


def skill_fit(user: set[str], career: dict, graph: dict) -> tuple[float, list[str], list[dict], list[dict]]:
    """(fit 0..1, skills you have, transferable [{have, toward}], missing skills by importance)."""
    total = sum(s["weight"] for s in career["skills"]) or 1
    got, have, transfer, missing = 0.0, [], [], []
    for s in career["skills"]:
        if s["skill"] in user:
            got += s["weight"]
            have.append(s["skill"])
            continue
        best = max(((n["sim"], u) for u in user for n in graph.get(u, []) if n["skill"] == s["skill"]), default=(0, None))
        if best[1] and best[0] >= 0.15:
            got += s["weight"] * TRANSFER_CREDIT * min(1.0, best[0] * 2)
            transfer.append({"have": best[1], "toward": s["skill"]})
        missing.append(s)
    missing.sort(key=lambda s: -s["weight"])
    return got / total, have, transfer, missing


def _style(answers: dict, career: dict) -> float:
    ww, env = set(answers.get("work_with") or []), set(answers.get("environments") or [])
    a = len(ww & set(career["work_with"])) / len(ww) if ww else 0.5
    b = len(env & set(career["environments"])) / len(env) if env else 0.5
    return (a + b) / 2


def _structure(answers: dict, career: dict) -> float:
    opt = _OPTIONS["structure"].get(answers.get("structure") or "")
    return 1 - abs(opt["value"] - career["structure"]) if opt else 0.5


def evaluate(answers: dict, user: set[str], careers: list[dict], graph: dict) -> list[dict]:
    """Score every career; returns them best first with all the parts kept for explaining."""
    vec = interest_vector(answers)
    use_skills = len(user) >= 2
    out = []
    for c in careers:
        i = _cos(vec, c["riasec"]) if any(vec.values()) else 0.5
        s, have, transfer, missing = skill_fit(user, c, graph)
        st, sc = _style(answers, c), _structure(answers, c)
        if use_skills:
            total = W_INTEREST * i + W_SKILLS * s + W_STYLE * st + W_STRUCTURE * sc
        else:
            total = (W_INTEREST * i + W_STYLE * st + W_STRUCTURE * sc) / (1 - W_SKILLS)
        out.append({"career": c, "score": total, "interest": i, "skills": s, "style": st, "structure": sc,
                    "have": have, "transfer": transfer, "missing": missing})
    out.sort(key=lambda r: -r["score"])
    return out


def _reasons(r: dict, answers: dict, vec: dict) -> list[str]:
    c, reasons = r["career"], []
    top_user = [k for k in sorted(vec, key=lambda k: -vec[k]) if vec[k] > 0][:2]
    shared = [k for k in top_user if c["riasec"][k] >= 0.7]
    if shared:
        reasons.append("It suits your interest in " + " and ".join(INTEREST_WORDS[k] for k in shared) + ".")
    if r["have"]:
        reasons.append(f"You already have {', '.join(r['have'][:3])}.")
    if r["transfer"]:
        t = r["transfer"][0]
        reasons.append(f"Your {t['have']} skills transfer: it is often used alongside {t['toward']}.")
    env = set(answers.get("environments") or []) & set(c["environments"])
    if env:
        reasons.append(f"You can work {'from home' if 'remote' in env else 'in a ' + sorted(env)[0]}.")
    if c.get("rising_skills"):
        reasons.append(f"Skills it needs are rising in job postings ({', '.join(c['rising_skills'][:2])}).")
    return reasons[:3] or ["It fits the mix of interests and preferences you chose."]


def _card(r: dict, answers: dict, vec: dict) -> dict:
    c = r["career"]
    return {
        "id": c["id"], "title": c["title"], "category": c["category"], "source": c["source"],
        "description": c["description"], "match": round(100 * r["score"]),
        "interest_fit": round(100 * r["interest"]), "skill_fit": round(100 * r["skills"]),
        "reasons": _reasons(r, answers, vec), "have": r["have"][:6],
        "transferable": r["transfer"][:3], "missing": [m["skill"] for m in r["missing"][:5]],
        "education": c["education"], "opportunities": c["opportunities"],
        "next_steps": [f"Learn {r['missing'][0]['skill']}" if r["missing"] else "Apply for entry roles", c["projects"][0]],
    }


def discover(answers: dict, skills: list[str], careers: list[dict], graph: dict, surprise: int = 0) -> dict:
    user = scoring.normalize_skills(list(skills) + list(answers.get("strengths") or []))
    vec = interest_vector(answers)
    ranked = evaluate(answers, user, careers, graph)
    used: set[str] = set()

    def take(rows, n):
        picked = [r for r in rows if r["career"]["id"] not in used][:n]
        used.update(r["career"]["id"] for r in picked)
        return [_card(r, answers, vec) for r in picked]

    strong = take(ranked, 4)
    domain = ranked[0]["career"]["category"] if ranked else ""
    best_i = max((r["interest"] for r in ranked), default=0)
    hidden = take(sorted([r for r in ranked if r["career"]["category"] != domain and r["interest"] >= 0.75 * best_i],
                         key=lambda r: -(r["interest"] + 0.3 * r["skills"])), 3)
    emerging = take([r for r in ranked if r["career"]["emerging_field"] or r["career"].get("rising_skills")], 3)
    alternative = take(sorted([r for r in ranked if r["transfer"] and r["skills"] < 0.6],
                              key=lambda r: -(len(r["transfer"]) + r["skills"])), 3)
    far = sorted([r for r in ranked if (r["have"] or r["transfer"]) and r["career"]["category"] != domain], key=lambda r: r["interest"])
    if not far:
        far = sorted(ranked, key=lambda r: r["interest"])
    pick = far[surprise % len(far)] if far else None
    return {
        "interests": {k: round(v, 2) for k, v in vec.items()},
        "top_interests": [INTEREST_WORDS[k] for k in sorted(vec, key=lambda k: -vec[k]) if vec[k] > 0][:2],
        "skills_used": sorted(user),
        "groups": {"strong": strong, "hidden": hidden, "emerging": emerging, "alternative": alternative},
        "surprise": _card(pick, answers, vec) if pick else None,
    }


def career_as_role(c: dict) -> dict:
    """A career in the shape scoring.gap / scoring.roadmap expect."""
    return {"role": c["title"], "postings": c.get("postings") or 0, "median_salary_usd": c.get("median_salary_usd"),
            "skills": [{"skill": s["skill"], "share": s["weight"], "category": "other"} for s in c["skills"]]}


def related(c: dict, careers: list[dict], n: int = 4) -> list[dict]:
    """Careers closest to this one by interests and shared skills."""
    mine = {s["skill"] for s in c["skills"]}
    scored = []
    for o in careers:
        if o["id"] == c["id"]:
            continue
        theirs = {s["skill"] for s in o["skills"]}
        jac = len(mine & theirs) / len(mine | theirs) if mine | theirs else 0
        scored.append((0.6 * _cos(c["riasec"], o["riasec"]) + 0.4 * jac, o))
    scored.sort(key=lambda x: -x[0])
    return [{"id": o["id"], "title": o["title"], "category": o["category"]} for _, o in scored[:n]]
