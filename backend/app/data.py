"""Loads the precomputed artifacts the pipeline wrote into backend/artifacts/.

The API never touches raw data or retrains models: it only reads these small
files. Each file is read once and cached; if the file changes on disk (e.g.
you re-run the pipeline while the server is running) it is read again.
"""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import HTTPException

from .config import artifacts_dir

_cache: dict[Path, tuple[float, object]] = {}


def load_json(name: str):
    path = artifacts_dir() / name
    if not path.exists():
        raise HTTPException(
            status_code=503,
            detail=f"Artifact '{name}' not found. Run `python -m pipeline.run_all` (add --sample for fake data).",
        )
    mtime = path.stat().st_mtime
    cached = _cache.get(path)
    if cached and cached[0] == mtime:
        return cached[1]
    data = json.loads(path.read_text(encoding="utf-8"))
    _cache[path] = (mtime, data)
    return data


def market_overview() -> dict:
    return load_json("market_overview.json")


def roles() -> list[dict]:
    return load_json("roles.json")


def skills() -> list[dict]:
    return load_json("skills.json")


def trends() -> dict:
    return load_json("trends.json")


def trend_labels() -> dict[str, str]:
    """skill -> emerging / stable / declining (empty if trends haven't been built)."""
    try:
        return {s["skill"]: s["label"] for s in trends()["skills"]}
    except HTTPException:
        return {}


def artifacts_status() -> dict:
    """Used by /health: which artifacts exist and when the data was built."""
    folder = artifacts_dir()
    files = sorted(p.name for p in folder.glob("*.json")) if folder.exists() else []
    info: dict = {"artifacts": files}
    if "market_overview.json" in files:
        ov = market_overview()
        info["data_generated_at"] = ov.get("generated_at")
        info["is_sample"] = ov.get("is_sample")
    return info


def careers() -> dict:
    return load_json("careers.json")


def skill_graph() -> dict:
    try:
        return load_json("skill_graph.json")
    except HTTPException:
        return {}


def all_roles() -> list[dict]:
    """Job profiles from postings plus curated careers (for roadmap and gap)."""
    from .services.discovery import career_as_role
    roles = list(load_json("roles.json"))
    names = {r["role"].lower() for r in roles}
    try:
        roles += [career_as_role(c) for c in careers()["careers"] if c["source"] == "curated" and c["title"].lower() not in names]
    except HTTPException:
        pass
    return roles
