"""Write reports/data_report.md: the dataset facts your project report needs.

Covers row counts, date range, postings per month, roles, levels, coverage of
salary/skills, title-normalizer agreement and top skills. Re-run it whenever
the data changes; paste tables straight into your write-up.
"""
from __future__ import annotations

import json

import pandas as pd

from .config import CLEAN_STATS, DATA_REPORT, POSTINGS, ensure_dirs
from .market import explode_skills


def _table(df: pd.DataFrame) -> str:
    """Tiny markdown-table writer (avoids needing the 'tabulate' package)."""
    cols = list(df.columns)
    lines = ["| " + " | ".join(cols) + " |", "| " + " | ".join("---" for _ in cols) + " |"]
    for row in df.itertuples(index=False):
        lines.append("| " + " | ".join("" if pd.isna(v) else str(v) for v in row) + " |")
    return "\n".join(lines)


def _pct(x: float) -> str:
    return f"{100 * x:.1f}%"


def build_report(postings: pd.DataFrame, stats: dict) -> str:
    n = len(postings)
    with_skills = postings["skills"].map(len) > 0
    parts = ["# Data report", ""]
    if stats.get("is_sample"):
        parts += ["> **FAKE SAMPLE DATA.** Run the real download before using any number below.", ""]

    parts += [
        "## Overview", "",
        _table(pd.DataFrame([
            ("Source file", stats.get("source_file", "?")),
            ("Raw rows", f"{stats.get('raw_rows', n):,}"),
            ("Rows with a valid date", f"{stats.get('rows_with_valid_date', n):,}"),
            ("Rows after removing duplicates", f"{n:,}"),
            ("Date range", f"{postings['date_posted'].min():%Y-%m-%d} to {postings['date_posted'].max():%Y-%m-%d}"),
            ("Months covered", postings["month"].nunique()),
            ("Companies", f"{postings['company'].nunique():,}"),
            ("Postings with skills listed", _pct(with_skills.mean())),
            ("Postings with salary", _pct(postings["salary_annual_usd"].notna().mean())),
            ("Remote postings", _pct(postings["is_remote"].mean())),
        ], columns=["Measure", "Value"])), "",
    ]

    per_month = postings.groupby("month").size().rename("Postings").reset_index()
    per_month["Month"] = per_month["month"].dt.strftime("%Y-%m")
    parts += ["## Postings per month", "", _table(per_month[["Month", "Postings"]]), ""]

    roles = (postings.groupby("title_norm")
             .agg(Postings=("job_id", "size"),
                  Median_salary_USD=("salary_annual_usd", "median"),
                  With_skills=("skills", lambda s: (s.map(len) > 0).mean()))
             .sort_values("Postings", ascending=False).head(20).reset_index()
             .rename(columns={"title_norm": "Role"}))
    roles["Median_salary_USD"] = roles["Median_salary_USD"].map(lambda v: "" if pd.isna(v) else f"{v:,.0f}")
    roles["With_skills"] = roles["With_skills"].map(_pct)
    roles["Postings"] = roles["Postings"].map(lambda v: f"{v:,}")
    parts += ["## Roles (after title normalization)", "", _table(roles), ""]

    levels = postings["experience_level"].value_counts().rename_axis("Level").reset_index(name="Postings")
    parts += ["## Experience levels (from title keywords)", "", _table(levels), ""]

    # How often does our regex normalizer agree with the dataset's own role label?
    known = postings[postings["dataset_role"].notna()]
    matched = known["title_from_rules"]
    agree = ((known["title_norm"] == known["dataset_role"])[matched].mean()
             if matched.any() else float("nan"))
    parts += [
        "## Title normalizer check", "",
        f"- Titles our rules could classify: {_pct(matched.mean())}",
        f"- Of those, agreement with the dataset's own `job_title_short` label: {_pct(agree)}",
        "- Unclassified titles fall back to the dataset label.", "",
    ]

    top = (explode_skills(postings)["skill"].value_counts().head(25)
           .rename_axis("Skill").reset_index(name="Postings"))
    top["Share of postings with skills"] = (top["Postings"] / max(with_skills.sum(), 1)).map(_pct)
    top["Postings"] = top["Postings"].map(lambda v: f"{v:,}")
    parts += ["## Top 25 skills", "", _table(top), ""]
    return "\n".join(parts)


def main() -> str:
    ensure_dirs()
    postings = pd.read_parquet(POSTINGS)
    stats = json.loads(CLEAN_STATS.read_text()) if CLEAN_STATS.exists() else {}
    text = build_report(postings, stats)
    DATA_REPORT.write_text(text, encoding="utf-8")
    print(f"  wrote {DATA_REPORT}")
    return text


if __name__ == "__main__":
    main()
