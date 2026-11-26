"""Pydantic models = the exact shape of each API response.

FastAPI uses them to validate output and to generate the interactive docs at
/docs. Your frontend's TypeScript types should mirror these.
"""
from __future__ import annotations

from pydantic import BaseModel


class Health(BaseModel):
    status: str
    artifacts: list[str]
    data_generated_at: str | None = None
    is_sample: bool | None = None


class SkillShare(BaseModel):
    skill: str
    share: float | None = None


class SkillStat(BaseModel):
    skill: str
    category: str | None = None
    postings: int | None = None
    share: float | None = None


class RoleStat(BaseModel):
    role: str
    postings: int
    share: float | None = None
    median_salary_usd: float | None = None
    top_skills: list[SkillShare] = []


class MonthCount(BaseModel):
    month: str
    postings: int


class CountryCount(BaseModel):
    country: str | None = None
    postings: int


class LevelCount(BaseModel):
    level: str
    postings: int


class Kpis(BaseModel):
    postings: int
    postings_with_skills: int
    companies: int
    roles: int
    distinct_skills: int
    date_min: str
    date_max: str
    median_salary_usd: float | None = None
    pct_with_salary: float | None = None
    pct_remote: float | None = None


class MarketOverview(BaseModel):
    generated_at: str
    is_sample: bool
    source_note: str
    kpis: Kpis
    postings_by_month: list[MonthCount]
    top_skills: list[SkillStat]
    top_roles: list[RoleStat]
    top_countries: list[CountryCount]
    levels: list[LevelCount]


# ---------- job suggestion platform ----------

from pydantic import Field  # noqa: E402


class SkillsIn(BaseModel):
    skills: list[str] = Field(default_factory=list, max_length=200, description="e.g. ['sql', 'python', 'excel']")


class RoleSkillsIn(SkillsIn):
    role: str = Field(..., description="e.g. 'Data Engineer'")


class ResumeOut(BaseModel):
    filename: str
    characters: int
    skills: list[str]
    current_role: str | None = None


class Opening(BaseModel):
    title: str
    company: str | None = None
    location: str | None = None
    date: str
    skills: list[str]
    uses: int
    of: int


class SuggestedJob(BaseModel):
    role: str
    score: float
    match: int
    ready: bool
    postings: int
    median_salary_usd: float | None = None
    demand: str
    have: list[str]
    to_learn: list[str]
    biggest_gain: str | None = None
    openings: list[Opening]


class SuggestOut(BaseModel):
    skills_used: list[str]
    ready: list[SuggestedJob]
    within_reach: list[SuggestedJob]


class GapRow(BaseModel):
    skill: str
    share: float
    category: str | None = None
    status: str
    trend: str


class LearnFirst(BaseModel):
    skill: str
    match_after: int


class GapOut(BaseModel):
    role: str
    match: int
    matched_count: int
    total: int
    skills: list[GapRow]
    learn_first: list[LearnFirst]


class StageSkill(BaseModel):
    skill: str
    share: float
    rising: bool


class Stage(BaseModel):
    number: int
    title: str
    skills: list[StageSkill]
    match_after: int
    project: str


class RoleMatch(BaseModel):
    role: str
    match: int


class RoadmapOut(BaseModel):
    role: str
    ready: int
    have: list[SkillShare]
    top_count: int
    stages: list[Stage]
    final_match: int
    also_consider: list[RoleMatch] = []


class RoleSummary(BaseModel):
    role: str
    postings: int
    median_salary_usd: float | None = None
    demand: str
    top_skills: list[str]


class TrendSkill(BaseModel):
    skill: str
    category: str | None = None
    label: str
    share_now: float
    growth: float | None = None
    slope_per_month: float
    p_value: float
    history: list[float]
    forecast: list[float]
    lower: list[float]
    upper: list[float]


class TrendDetail(BaseModel):
    months: list[str]
    future: list[str]
    skill: TrendSkill
