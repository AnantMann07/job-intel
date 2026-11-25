"""Shared test fixtures: a small fake dataset pushed through the real pipeline code."""
import json

import pandas as pd
import pytest

from pipeline.clean import clean_data_jobs, deduplicate
from pipeline.market import build_overview, role_skills
from pipeline.sample import make_sample


@pytest.fixture(scope="session")
def raw_sample() -> pd.DataFrame:
    return make_sample(n=500, seed=7)


@pytest.fixture(scope="session")
def postings(raw_sample) -> pd.DataFrame:
    cleaned = clean_data_jobs(raw_sample).dropna(subset=["date_posted"])
    return deduplicate(cleaned)


@pytest.fixture(scope="session")
def overview(postings) -> dict:
    return build_overview(postings, role_skills(postings), categories=None, is_sample=True)


@pytest.fixture()
def artifacts_dir(tmp_path, overview, monkeypatch):
    """A temporary artifacts folder the API reads from during a test."""
    (tmp_path / "market_overview.json").write_text(json.dumps(overview))
    monkeypatch.setenv("ARTIFACTS_DIR", str(tmp_path))
    return tmp_path
