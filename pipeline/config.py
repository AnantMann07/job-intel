"""Central place for file paths and dataset names used by the pipeline.

Every other module imports paths from here, so if you move a folder you only
change it in one place.
"""
from pathlib import Path

# Project root = the folder that contains pipeline/, backend/, data/ ...
ROOT = Path(__file__).resolve().parents[1]

DATA = ROOT / "data"
RAW = DATA / "raw"              # downloaded files, never edited (git-ignored)
INTERIM = DATA / "interim"      # cleaned postings (git-ignored)
PROCESSED = DATA / "processed"  # tables used by later ML steps (git-ignored)
REPORTS = ROOT / "reports"      # markdown reports for your project write-up
BACKEND_ARTIFACTS = ROOT / "backend" / "artifacts"  # small files the API serves (committed)

# Dataset 1: data_jobs by Luke Barousse on Hugging Face (Apache-2.0)
DATA_JOBS_REPO = "lukebarousse/data_jobs"
DATA_JOBS_FILE = "data_jobs.csv"
RAW_DATA_JOBS = RAW / DATA_JOBS_FILE
RAW_DATA_JOBS_SAMPLE = RAW / "data_jobs_sample.csv"  # fake sample for offline testing

# Outputs
POSTINGS = INTERIM / "postings.parquet"
CLEAN_STATS = INTERIM / "clean_stats.json"
SKILL_CATEGORIES = PROCESSED / "skill_categories.csv"
SKILLS_MONTHLY = PROCESSED / "skills_monthly.parquet"
ROLE_SKILLS = PROCESSED / "role_skills.parquet"
DATA_REPORT = REPORTS / "data_report.md"
SUGGESTIONS_REPORT = REPORTS / "suggestions_eval.md"
FORECAST_REPORT = REPORTS / "forecast_eval.md"
EVAL_METRICS = PROCESSED / "eval_metrics.json"
MARKET_OVERVIEW = BACKEND_ARTIFACTS / "market_overview.json"
ROLES_ARTIFACT = BACKEND_ARTIFACTS / "roles.json"      # job profiles + example openings
SKILLS_ARTIFACT = BACKEND_ARTIFACTS / "skills.json"    # skill dictionary for resume parsing
TRENDS_ARTIFACT = BACKEND_ARTIFACTS / "trends.json"    # history, forecast and label per skill


def ensure_dirs() -> None:
    """Create every output folder if it does not exist yet."""
    for folder in (RAW, INTERIM, PROCESSED, REPORTS, BACKEND_ARTIFACTS):
        folder.mkdir(parents=True, exist_ok=True)
