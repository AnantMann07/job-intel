"""Market endpoints: everything the Dashboard page needs."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from .. import data
from ..schemas import MarketOverview, RoleStat, SkillStat

router = APIRouter()


@router.get("/overview", response_model=MarketOverview)
def overview() -> dict:
    """KPIs, postings per month, top skills, top roles, countries and levels."""
    return data.market_overview()


@router.get("/skills/top", response_model=list[SkillStat])
def top_skills(
    limit: int = Query(20, ge=1, le=50),
    role: str | None = Query(None, description="e.g. 'Data Engineer'; omit for all roles"),
):
    """Most requested skills overall, or for one role."""
    ov = data.market_overview()
    if role is None:
        return ov["top_skills"][:limit]
    for r in ov["top_roles"]:
        if r["role"].lower() == role.lower():
            return r["top_skills"][:limit]
    raise HTTPException(status_code=404, detail=f"Unknown role '{role}'")


@router.get("/roles", response_model=list[RoleStat])
def roles():
    """Roles with posting counts, median salary and their top skills."""
    return data.market_overview()["top_roles"]
