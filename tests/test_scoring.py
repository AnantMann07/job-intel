from app.services import scoring


def _role(roles, name):
    return scoring.find_role(roles, name)


def test_all_top_skills_gives_100(roles):
    role = roles[0]
    user = {s["skill"] for s in role["skills"][: scoring.TOP_N]}
    assert round(scoring.coverage(user, role), 6) == 1.0
    assert scoring.gap(user, role)["match"] == 100


def test_no_skills_gives_0(roles):
    assert scoring.coverage(set(), roles[0]) == 0
    assert scoring.cosine(set(), roles[0]) == 0


def test_aliases():
    assert scoring.normalize_skills(["Sklearn", " PowerBI ", "Python"]) == {"scikit-learn", "power bi", "python"}


def test_suggest_puts_matching_job_first(roles):
    de = _role(roles, "Data Engineer")
    user = {s["skill"] for s in de["skills"][:8]}
    out = scoring.suggest(user, roles)
    jobs = out["ready"] + out["within_reach"]
    assert jobs[0]["role"] == "Data Engineer"
    assert all(0 <= j["match"] <= 100 for j in jobs)


def test_roadmap_match_never_goes_down_and_no_repeats(roles):
    role = _role(roles, "Data Scientist")
    plan = scoring.roadmap({"sql"}, role)
    after = [s["match_after"] for s in plan["stages"]]
    assert after == sorted(after)
    assert plan["ready"] <= after[0]
    skills = [k["skill"] for s in plan["stages"] for k in s["skills"]]
    assert len(skills) == len(set(skills)) and "sql" not in skills
