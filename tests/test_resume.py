import io

import docx
import pytest

from app.services.resume import ResumeError, find_skills, guess_role, parse_resume

DICT = ["python", "sql", "excel", "power bi", "r", "go", "c++", "scikit-learn", "tableau"]


def test_finds_skills_and_aliases():
    text = "Data Analyst at Acme\nBuilt dashboards in PowerBI and Tableau.\nSkills: Python, SQL, R, sklearn"
    found = {s["skill"] for s in find_skills(text, DICT)}
    assert {"python", "sql", "power bi", "tableau", "r", "scikit-learn"} <= found


def test_ambiguous_letters_need_a_skills_line():
    found = {s["skill"] for s in find_skills("I will go to R block of the building every day.", DICT)}
    assert "r" not in found and "go" not in found


def test_cpp_is_not_c():
    assert {s["skill"] for s in find_skills("Skills: C++, Python", DICT)} == {"c++", "python"}


def test_guess_role():
    assert guess_role("Jane Doe\nJunior Data Analyst, 2023-2024\nSoftware engineer intern") == "Data Analyst"


def test_docx_resume():
    d = docx.Document()
    d.add_paragraph("Business Analyst")
    d.add_paragraph("Skills: Excel, SQL, Tableau, Python")
    buf = io.BytesIO(); d.save(buf)
    out = parse_resume("cv.docx", buf.getvalue(), DICT)
    assert set(out["skills"]) == {"excel", "sql", "tableau", "python"}


def test_rejects_wrong_type_and_empty():
    with pytest.raises(ResumeError):
        parse_resume("photo.png", b"123", DICT)
    with pytest.raises(ResumeError):
        parse_resume("cv.txt", b"", DICT)
