import pandas as pd

from pipeline.clean import SCHEMA, parse_skill_list
from pipeline.market import role_skills, skills_monthly


def test_schema_and_types(postings):
    assert list(postings.columns) == SCHEMA
    assert pd.api.types.is_datetime64_any_dtype(postings["date_posted"])
    assert postings["skills"].map(lambda s: isinstance(s, list)).all()
    assert postings["job_id"].is_unique


def test_duplicates_removed(raw_sample, postings):
    assert len(postings) < len(raw_sample)  # the sample contains ~2% duplicates


def test_salary_outliers_removed(postings):
    assert postings["salary_annual_usd"].dropna().max() < 1_000_000


def test_parse_skill_list_handles_bad_input():
    s = pd.Series(["['Python', 'SQL', 'python']", None, "not a list", "[]"])
    assert parse_skill_list(s).tolist() == [["python", "sql"], [], [], []]


def test_shares_are_valid(postings):
    sm = skills_monthly(postings)
    rs = role_skills(postings)
    assert sm["share"].between(0, 1).all()
    assert rs["share"].between(0, 1).all()
    assert set(rs["role"]) <= set(postings["title_norm"])


def test_overview_shape(overview):
    assert overview["kpis"]["postings"] > 0
    assert overview["top_skills"][0]["share"] <= 1
    assert len(overview["postings_by_month"]) == 12
