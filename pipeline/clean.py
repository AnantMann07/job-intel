"""Step 1: turn raw data_jobs.csv into one clean table with our unified schema.

Output: data/interim/postings.parquet, one row per job posting, columns:

    job_id, source, title_raw, title_norm, title_from_rules, dataset_role, experience_level,
    description, date_posted, month, location, country, is_remote, company,
    salary_annual_usd, skills

Also writes data/processed/skill_categories.csv (skill -> category), which we
reuse in Step 2 when we build the skill dictionary.

When you add a second dataset later, write another `clean_<name>()` function
that returns the same columns, then pd.concat the results in `build_postings()`.
"""
from __future__ import annotations

import ast
import json
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
import pandas as pd

from .config import (CLEAN_STATS, POSTINGS, RAW_DATA_JOBS, RAW_DATA_JOBS_SAMPLE, SKILL_CATEGORIES,
                     ensure_dirs)
from .titles import OTHER, normalize_title, strip_seniority

SCHEMA = [
    "job_id", "source", "title_raw", "title_norm", "title_from_rules", "dataset_role", "experience_level",
    "description", "date_posted", "month", "location", "country", "is_remote", "company",
    "salary_annual_usd", "skills",
]
HOURS_PER_YEAR = 2080

DATA_JOBS_COLUMNS = [
    "job_title_short", "job_title", "job_location", "job_work_from_home", "job_posted_date",
    "job_country", "salary_year_avg", "salary_hour_avg", "company_name", "job_skills", "job_type_skills",
]


# ---------- small helpers ----------

def _parse_literal(value, empty):
    """data_jobs stores lists/dicts as text like "['python', 'sql']". Parse safely."""
    if not isinstance(value, str) or not value.strip():
        return empty
    try:
        parsed = ast.literal_eval(value)
    except (ValueError, SyntaxError):
        return empty
    return parsed if isinstance(parsed, type(empty)) else empty


def parse_skill_list(series: pd.Series) -> pd.Series:
    """Parse every unique string once (fast on 786k rows), lowercase + dedupe skills."""
    cache = {}
    for value in series.dropna().unique():
        skills = _parse_literal(value, [])
        cache[value] = sorted({str(s).strip().lower() for s in skills if str(s).strip()})
    return series.map(lambda v: cache.get(v, []) if isinstance(v, str) else [])


def skill_categories_from(series: pd.Series) -> pd.DataFrame:
    """Majority-vote category for each skill from the job_type_skills dicts."""
    votes: dict[str, Counter] = defaultdict(Counter)
    for value in series.dropna().unique():
        for category, skills in _parse_literal(value, {}).items():
            for s in skills or []:
                votes[str(s).strip().lower()][str(category)] += 1
    rows = [(skill, c.most_common(1)[0][0]) for skill, c in votes.items()]
    return pd.DataFrame(rows, columns=["skill", "category"]).sort_values("skill", ignore_index=True)


def drop_salary_outliers(s: pd.Series, low_q: float = 0.01, high_q: float = 0.99) -> pd.Series:
    """Set salaries outside the 1st-99th percentile to NaN (keeps the row)."""
    valid = s.dropna()
    if len(valid) < 20:
        return s
    lo, hi = valid.quantile(low_q), valid.quantile(high_q)
    return s.where(s.between(lo, hi))


# ---------- dataset-specific cleaner ----------

def clean_data_jobs(raw: pd.DataFrame) -> pd.DataFrame:
    df = pd.DataFrame(index=raw.index)
    df["job_id"] = "dj_" + raw.index.astype(str)
    df["source"] = "data_jobs"
    df["title_raw"] = raw["job_title"].fillna(raw["job_title_short"]).astype(str).str.strip()

    # Normalize each distinct title once (many postings share a title).
    lookup = {t: normalize_title(t) for t in df["title_raw"].unique()}
    our_role = df["title_raw"].map(lambda t: lookup[t][0])
    level = df["title_raw"].map(lambda t: lookup[t][1])
    dataset_role = raw["job_title_short"].map(strip_seniority)
    # Use our normalizer; fall back to the dataset's own label when ours says "Other".
    df["title_from_rules"] = our_role != OTHER
    df["title_norm"] = our_role.where(df["title_from_rules"], dataset_role)
    df["dataset_role"] = dataset_role  # kept so we can measure normalizer agreement
    is_senior_label = raw["job_title_short"].astype(str).str.startswith("Senior")
    df["experience_level"] = level.mask((level == "Mid") & is_senior_label, "Senior")

    df["description"] = pd.Series(np.nan, index=raw.index, dtype="object")  # data_jobs has no full text
    df["date_posted"] = pd.to_datetime(raw["job_posted_date"], errors="coerce")
    df["month"] = df["date_posted"].dt.to_period("M").dt.to_timestamp()

    df["location"] = raw["job_location"].astype("string").str.strip()
    df["country"] = raw["job_country"].astype("string").str.strip()
    wfh = raw["job_work_from_home"].astype(str).str.lower().isin(["true", "1"])
    df["is_remote"] = wfh | df["location"].str.contains("anywhere|remote", case=False, na=False)
    df["company"] = raw["company_name"].astype("string").str.strip()

    year = pd.to_numeric(raw["salary_year_avg"], errors="coerce")
    hour = pd.to_numeric(raw["salary_hour_avg"], errors="coerce")
    df["salary_annual_usd"] = drop_salary_outliers(year.fillna(hour * HOURS_PER_YEAR))

    df["skills"] = parse_skill_list(raw["job_skills"])
    return df[SCHEMA]


def deduplicate(df: pd.DataFrame) -> pd.DataFrame:
    """Drop the same job posted twice (same title, company, location and day)."""
    key = [df["title_raw"].str.lower(), df["company"].str.lower(), df["location"].str.lower(),
           df["date_posted"].dt.date]
    dup = pd.concat(key, axis=1).duplicated()
    return df.loc[~dup].reset_index(drop=True)


# ---------- entry point ----------

def build_postings(raw_path: Path) -> tuple[pd.DataFrame, dict]:
    """Read raw CSV -> cleaned + deduplicated postings, plus counts for the report."""
    raw = pd.read_csv(raw_path, usecols=DATA_JOBS_COLUMNS, low_memory=False)
    n_raw = len(raw)
    cleaned = clean_data_jobs(raw)
    cleaned = cleaned.dropna(subset=["date_posted"])
    n_valid = len(cleaned)
    postings = deduplicate(cleaned)
    stats = {"raw_rows": n_raw, "rows_with_valid_date": n_valid, "rows_after_dedupe": len(postings)}
    categories = skill_categories_from(raw["job_type_skills"])
    return postings, {"stats": stats, "categories": categories}


def main(sample: bool = False) -> pd.DataFrame:
    ensure_dirs()
    raw_path = RAW_DATA_JOBS_SAMPLE if sample else RAW_DATA_JOBS
    if not raw_path.exists():
        hint = "python -m pipeline.sample" if sample else "python -m pipeline.download"
        raise SystemExit(f"Missing {raw_path}. Run `{hint}` first.")
    print(f"Cleaning {raw_path.name} ...")
    postings, extra = build_postings(raw_path)
    postings.to_parquet(POSTINGS, index=False)
    extra["categories"].to_csv(SKILL_CATEGORIES, index=False)
    s = {**extra["stats"], "source_file": raw_path.name, "is_sample": sample}
    CLEAN_STATS.write_text(json.dumps(s, indent=2))
    print(f"  raw rows: {s['raw_rows']:,} -> valid dates: {s['rows_with_valid_date']:,} "
          f"-> after dedupe: {s['rows_after_dedupe']:,}")
    print(f"  wrote {POSTINGS} and {SKILL_CATEGORIES}")
    return postings


if __name__ == "__main__":
    import argparse

    p = argparse.ArgumentParser()
    p.add_argument("--sample", action="store_true", help="use the fake sample file")
    main(sample=p.parse_args().sample)
