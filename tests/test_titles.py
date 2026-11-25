import pytest

from pipeline.titles import normalize_title, strip_seniority


@pytest.mark.parametrize(
    "title, role, level",
    [
        ("Sr. Data Engineer II - Remote (Contract)", "Data Engineer", "Senior"),
        ("Junior Data Analyst", "Data Analyst", "Entry"),
        ("Lead Machine Learning Engineer", "Machine Learning Engineer", "Lead"),
        ("Data Scientist, Marketing Analytics", "Data Scientist", "Mid"),
        ("Business Intelligence Analyst", "Data Analyst", "Mid"),
        ("Full Stack Developer", "Software Engineer", "Mid"),
        ("Data Analyst Intern", "Data Analyst", "Intern"),
        ("Marketing Manager", "Other", "Lead"),
        ("", "Other", "Mid"),
    ],
)
def test_normalize_title(title, role, level):
    assert normalize_title(title) == (role, level)


def test_strip_seniority():
    assert strip_seniority("Senior Data Engineer") == "Data Engineer"
    assert strip_seniority("Data Analyst") == "Data Analyst"
