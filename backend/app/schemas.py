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
