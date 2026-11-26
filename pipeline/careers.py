"""Step 7: careers.json + skill_graph.json for Career Discovery.

skill_graph.json  For the most common skills in the postings: which other skills appear in the
                  same postings most often (cosine similarity of co-occurrence). Discovery uses
                  this to find TRANSFERABLE skills: if you know A and a career needs B, and A and B
                  are often asked for together, A gives you partial credit towards B.

careers.json      Every career Discovery can recommend:
                  - careers that exist in the postings data: skills from the postings (roles.json),
                    interest profile from careers_catalog.DATA_ROLES;
                  - curated careers outside the dataset (careers_catalog.CURATED), labelled
                    source="curated".
"""
from __future__ import annotations

import json
import re

import numpy as np
import pandas as pd

from .careers_catalog import CATEGORIES, CURATED, DATA_ROLES, EMERGING_CATEGORIES, STRENGTHS
from .config import BACKEND_ARTIFACTS as ARTIFACTS, POSTINGS

GRAPH_SKILLS = 300      # skills included in the similarity graph
NEIGHBOURS = 8          # similar skills kept per skill
MIN_SIMILARITY = 0.08
CAREERS_ARTIFACT = ARTIFACTS / "careers.json"
GRAPH_ARTIFACT = ARTIFACTS / "skill_graph.json"
RIASEC = "RIASEC"


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def riasec_vector(code: str) -> dict[str, float]:
    weights = [1.0, 0.7, 0.4]
    vec = {k: 0.0 for k in RIASEC}
    for letter, w in zip(code, weights):
        vec[letter] = w
    return vec


def build_skill_graph(skill_lists: pd.Series, top_n: int = GRAPH_SKILLS) -> dict[str, list[dict]]:
    """Cosine similarity between skills, from how often they share a posting."""
    counts = skill_lists.explode().dropna().value_counts()
    vocab = list(counts.index[:top_n])
    index = {s: i for i, s in enumerate(vocab)}
    n = len(vocab)
    co = np.zeros(n * n, dtype=np.int64)
    rows = [np.array(sorted({index[s] for s in lst if s in index}), dtype=np.int64) for lst in skill_lists]
    for start in range(0, len(rows), 50_000):
        pairs = [(r[:, None] * n + r[None, :]).ravel() for r in rows[start:start + 50_000] if len(r)]
        if pairs:
            co += np.bincount(np.concatenate(pairs), minlength=n * n)
    co = co.reshape(n, n).astype(float)
    diag = np.sqrt(np.clip(np.diag(co), 1, None))
    sim = co / diag[:, None] / diag[None, :]
    np.fill_diagonal(sim, 0)
    graph = {}
    for i, s in enumerate(vocab):
        order = np.argsort(-sim[i])[:NEIGHBOURS]
        graph[s] = [{"skill": vocab[j], "sim": round(float(sim[i, j]), 3)} for j in order if sim[i, j] >= MIN_SIMILARITY]
    return graph


def build_careers(roles: list[dict], trend_labels: dict[str, str]) -> list[dict]:
    careers = []
    for role in roles:
        info = DATA_ROLES.get(role["role"])
        if not info:
            continue
        top = role["skills"][:20]
        careers.append({
            "id": slug(role["role"]), "title": role["role"], "source": "postings",
            **{k: v for k, v in info.items() if k != "riasec"},
            "riasec": riasec_vector(info["riasec"]), "riasec_code": info["riasec"],
            "skills": [{"skill": s["skill"], "weight": round(s["share"] / top[0]["share"], 3)} for s in top],
            "postings": role["postings"], "median_salary_usd": role.get("median_salary_usd"),
            "demand": role.get("demand", {}).get("label", "stable"),
        })
    for c in CURATED:
        careers.append({
            "id": slug(c["title"]), "source": "curated",
            **{k: v for k, v in c.items() if k not in ("riasec", "skills")},
            "riasec": riasec_vector(c["riasec"]), "riasec_code": c["riasec"],
            "skills": [{"skill": s, "weight": round(w / 3, 3)} for s, w in c["skills"]],
            "postings": None, "median_salary_usd": None, "demand": None,
        })
    for c in careers:
        rising = [s["skill"] for s in c["skills"] if trend_labels.get(s["skill"]) == "emerging"]
        c["rising_skills"] = rising
        c["emerging_field"] = c["category"] in EMERGING_CATEGORIES
    return careers


def main() -> dict:
    postings = pd.read_parquet(POSTINGS, columns=["skills"])
    graph = build_skill_graph(postings["skills"].map(list))
    roles = json.loads((ARTIFACTS / "roles.json").read_text(encoding="utf-8"))
    try:
        trends = json.loads((ARTIFACTS / "trends.json").read_text(encoding="utf-8"))
        labels = {s["skill"]: s["label"] for s in trends["skills"]}
    except FileNotFoundError:
        labels = {}
    careers = build_careers(roles, labels)
    out = {"categories": CATEGORIES, "strengths": STRENGTHS, "careers": careers}
    CAREERS_ARTIFACT.write_text(json.dumps(out, indent=1), encoding="utf-8")
    GRAPH_ARTIFACT.write_text(json.dumps(graph), encoding="utf-8")
    n_data = sum(c["source"] == "postings" for c in careers)
    print(f"  careers: {len(careers)} ({n_data} from postings, {len(careers) - n_data} curated); skill graph: {len(graph)} skills")
    return {"careers": len(careers), "graph_skills": len(graph)}


if __name__ == "__main__":
    main()
