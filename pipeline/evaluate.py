"""Evaluate the job-suggestion model with held-out postings.

There are no real users with known "right answers", so we use job postings as pretend candidates:
take a posting, hide its job title, give its skill list to the recommender, and check whether
the posting's real job appears at the top of the suggestions.

  * 90% of postings build the job profiles (train), 10% are pretend candidates (test).
  * Hit@1 / Hit@3: the real job is ranked first / in the top 3.
  * MRR (mean reciprocal rank): 1 if first, 1/2 if second, 1/3 if third ...

Compared with three baselines: cosine similarity only, coverage only, and "always suggest
the most common jobs" (popularity).

Writes reports/suggestions_eval.md and data/processed/eval_metrics.json.
"""
from __future__ import annotations

import json
import sys
import zlib

import pandas as pd

from .config import EVAL_METRICS, POSTINGS, ROOT, SUGGESTIONS_REPORT, ensure_dirs
from .profiles import _categories, build_roles

sys.path.insert(0, str(ROOT / "backend"))
from app.services import scoring  # noqa: E402  (shared with the website)

MAX_TEST = 20_000
METHODS = [("blend", "Our score: 0.5 cosine + 0.3 coverage + 0.2 demand"), ("cosine", "Cosine similarity only"),
           ("coverage", "Coverage only"), ("popularity", "Baseline: most common jobs first")]


def split(postings: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Deterministic 90/10 split by a hash of the job id (same split every run)."""
    bucket = postings["job_id"].map(lambda j: zlib.crc32(str(j).encode()) % 10)
    return postings[bucket != 0], postings[bucket == 0]


def evaluate(postings: pd.DataFrame) -> dict:
    train, test = split(postings)
    roles = build_roles(train, _categories())
    names = {r["role"] for r in roles}
    test = test[(test["skills"].map(len) >= 3) & test["title_norm"].isin(names)]
    if len(test) > MAX_TEST:
        test = test.sample(MAX_TEST, random_state=42)
    results = {}
    for method, _ in METHODS:
        hit1 = hit3 = rr = 0.0
        for skills, truth in zip(test["skills"], test["title_norm"]):
            ranked = [name for name, _ in scoring.rank_roles(scoring.normalize_skills(skills), roles, method)]
            rank = ranked.index(truth) + 1
            hit1 += rank == 1
            hit3 += rank <= 3
            rr += 1 / rank
        n = max(len(test), 1)
        results[method] = {"hit1": round(hit1 / n, 4), "hit3": round(hit3 / n, 4), "mrr": round(rr / n, 4)}
    return {"test_postings": int(len(test)), "train_postings": int(len(train)), "jobs": len(roles), "results": results}


def write_report(m: dict) -> None:
    lines = [
        "# Job suggestion evaluation", "",
        f"{m['test_postings']:,} held-out postings used as pretend candidates; job profiles built from "
        f"{m['train_postings']:,} other postings; {m['jobs']} jobs to choose from.", "",
        "| Method | Hit@1 | Hit@3 | MRR |", "| --- | --- | --- | --- |",
    ]
    for method, label in METHODS:
        r = m["results"][method]
        lines.append(f"| {label} | {r['hit1']:.1%} | {r['hit3']:.1%} | {r['mrr']:.3f} |")
    lines += ["", "Hit@k: the posting's real job is in the top k suggestions. MRR: average of 1/rank (1 = always first).",
              "Note: similar data jobs share many skills (e.g. sql and python), so Hit@3 is the fairer measure of usefulness."]
    SUGGESTIONS_REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main(trend_metrics: dict | None = None) -> dict:
    ensure_dirs()
    postings = pd.read_parquet(POSTINGS)
    m = evaluate(postings)
    write_report(m)
    out = {"suggestions": m, "forecast": trend_metrics}
    EVAL_METRICS.write_text(json.dumps(out, indent=2))
    best = m["results"]["blend"]
    print(f"  suggestions: Hit@1 {best['hit1']:.1%}, Hit@3 {best['hit3']:.1%}, MRR {best['mrr']:.3f} "
          f"(popularity baseline Hit@1 {m['results']['popularity']['hit1']:.1%}) -> {SUGGESTIONS_REPORT.name}")
    return out


if __name__ == "__main__":
    main()
