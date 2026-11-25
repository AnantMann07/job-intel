"""Generate a small FAKE dataset in exactly the same format as data_jobs.csv.

Why: you (and the automated tests) can run the whole pipeline in seconds
without downloading 231 MB. The numbers are made up, so never put results from
the sample in your report.

    python -m pipeline.sample            # writes data/raw/data_jobs_sample.csv
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .config import RAW_DATA_JOBS_SAMPLE, ensure_dirs

# skill -> category (mirrors the categories used in data_jobs' job_type_skills)
SKILL_CATEGORY = {
    "python": "programming", "sql": "programming", "r": "programming", "java": "programming",
    "scala": "programming", "javascript": "programming", "go": "programming", "sas": "programming",
    "aws": "cloud", "azure": "cloud", "gcp": "cloud", "snowflake": "cloud", "databricks": "cloud",
    "pandas": "libraries", "numpy": "libraries", "pytorch": "libraries", "tensorflow": "libraries",
    "scikit-learn": "libraries", "spark": "libraries", "airflow": "libraries", "kafka": "libraries",
    "excel": "analyst_tools", "tableau": "analyst_tools", "power bi": "analyst_tools", "looker": "analyst_tools",
    "postgresql": "databases", "mongodb": "databases", "mysql": "databases",
    "docker": "other", "kubernetes": "other", "git": "other", "terraform": "other", "linux": "os",
}

# job_title_short -> {skill: base probability}
ROLE_SKILLS = {
    "Data Analyst": {"sql": .55, "excel": .45, "python": .3, "tableau": .3, "power bi": .3, "r": .15, "sas": .1, "looker": .08},
    "Data Scientist": {"python": .75, "sql": .55, "r": .35, "pandas": .25, "scikit-learn": .2, "pytorch": .15, "tensorflow": .15, "aws": .15, "spark": .15, "sas": .1},
    "Data Engineer": {"sql": .65, "python": .65, "aws": .4, "spark": .35, "azure": .3, "airflow": .25, "snowflake": .25, "kafka": .2, "databricks": .2, "scala": .15, "java": .15},
    "Business Analyst": {"excel": .45, "sql": .4, "tableau": .2, "power bi": .25, "python": .1},
    "Machine Learning Engineer": {"python": .8, "pytorch": .4, "tensorflow": .35, "aws": .3, "docker": .25, "kubernetes": .2, "sql": .3, "scikit-learn": .2},
    "Cloud Engineer": {"aws": .6, "azure": .45, "terraform": .35, "kubernetes": .3, "docker": .3, "linux": .3, "python": .25, "gcp": .2},
    "Software Engineer": {"python": .45, "java": .4, "javascript": .35, "sql": .3, "aws": .25, "docker": .2, "git": .2, "go": .1},
}
ROLE_WEIGHTS = {"Data Analyst": .3, "Data Scientist": .2, "Data Engineer": .22, "Business Analyst": .08,
                "Machine Learning Engineer": .06, "Cloud Engineer": .04, "Software Engineer": .1}
ROLE_SALARY = {"Data Analyst": 90_000, "Data Scientist": 130_000, "Data Engineer": 130_000, "Business Analyst": 95_000,
               "Machine Learning Engineer": 150_000, "Cloud Engineer": 125_000, "Software Engineer": 135_000}
# monthly change in probability (per month, multiplicative) to create visible trends
TREND = {"pytorch": 1.06, "databricks": 1.05, "snowflake": 1.03, "kubernetes": 1.02, "sas": 0.95, "excel": 0.99}

LOCATIONS = [("New York, NY", "United States"), ("San Francisco, CA", "United States"), ("Austin, TX", "United States"),
             ("Anywhere", "United States"), ("London, UK", "United Kingdom"), ("Bengaluru, Karnataka, India", "India"),
             ("Toronto, ON, Canada", "Canada"), ("Berlin, Germany", "Germany"), ("Singapore", "Singapore")]
COMPANIES = [f"Company {c}" for c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ"] + ["Booz Allen Hamilton", "Capital One", "Accenture", "Deloitte"]
PREFIXES = ["", "", "", "Senior ", "Sr. ", "Junior ", "Lead "]
SUFFIXES = ["", "", "", " - Remote", " II", " (Hybrid)", ", Marketing"]


def make_sample(n: int = 3000, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    roles = list(ROLE_WEIGHTS)
    probs = np.array(list(ROLE_WEIGHTS.values()))
    probs = probs / probs.sum()
    rows = []
    for _ in range(n):
        role = rng.choice(roles, p=probs)
        month = int(rng.integers(1, 13))
        day = int(rng.integers(1, 29))
        prefix = rng.choice(PREFIXES)
        title = f"{prefix}{role}{rng.choice(SUFFIXES)}"
        short = role
        if prefix.strip(" .").lower() in ("senior", "sr") and role in ("Data Analyst", "Data Scientist", "Data Engineer"):
            short = f"Senior {role}"
        skills = []
        for skill, p in ROLE_SKILLS[role].items():
            p = min(0.95, p * TREND.get(skill, 1.0) ** (month - 1))
            if rng.random() < p:
                skills.append(skill)
        no_skills = rng.random() < 0.1 or not skills
        loc, country = LOCATIONS[int(rng.integers(len(LOCATIONS)))]
        has_salary = rng.random() < 0.15
        hourly = has_salary and rng.random() < 0.2
        base = ROLE_SALARY[role] * (1.25 if "Senior" in short or prefix.startswith(("Senior", "Sr", "Lead")) else 1.0)
        year = float(max(20_000, rng.normal(base, base * 0.18))) if has_salary and not hourly else np.nan
        if has_salary and not hourly and rng.random() < 0.01:
            year = 2_500_000.0  # deliberate outlier
        hour = round(base / 2080 * rng.uniform(.8, 1.2), 2) if hourly else np.nan
        types: dict[str, list[str]] = {}
        for s in skills:
            types.setdefault(SKILL_CATEGORY[s], []).append(s)
        rows.append({
            "job_title_short": short,
            "job_title": title,
            "job_location": loc,
            "job_via": f"via {rng.choice(['LinkedIn', 'Indeed', 'ZipRecruiter', 'BeBee'])}",
            "job_schedule_type": "Full-time",
            "job_work_from_home": loc == "Anywhere",
            "search_location": country,
            "job_posted_date": f"2023-{month:02d}-{day:02d} {int(rng.integers(0, 24)):02d}:{int(rng.integers(0, 60)):02d}:00",
            "job_no_degree_mention": bool(rng.random() < 0.3),
            "job_health_insurance": bool(rng.random() < 0.4),
            "job_country": country,
            "salary_rate": ("hour" if hourly else "year") if has_salary else np.nan,
            "salary_year_avg": year,
            "salary_hour_avg": hour,
            "company_name": COMPANIES[int(rng.integers(len(COMPANIES)))],
            "job_skills": np.nan if no_skills else str(skills),
            "job_type_skills": np.nan if no_skills else str(types),
        })
    df = pd.DataFrame(rows)
    # ~2% exact duplicates, like reposted jobs in real data
    dups = df.sample(frac=0.02, random_state=seed)
    return pd.concat([df, dups], ignore_index=True)


def main(n: int = 3000) -> None:
    ensure_dirs()
    df = make_sample(n)
    df.to_csv(RAW_DATA_JOBS_SAMPLE, index=False)
    print(f"Wrote {len(df):,} fake rows -> {RAW_DATA_JOBS_SAMPLE}")


if __name__ == "__main__":
    main()
