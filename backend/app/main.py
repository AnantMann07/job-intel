"""FastAPI entry point.

Run locally (from the backend/ folder):
    uvicorn app.main:app --reload
Then open http://localhost:8000/docs
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import data
from .config import cors_origin_regex, cors_origins
from .routers import market
from .schemas import Health

app = FastAPI(
    title="AI Job Market Intelligence API",
    version="0.1.0",
    description="Job-market analytics, skill gaps and career paths from job-posting data.",
)

# CORS lets the website (a different domain) call this API from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_origin_regex=cors_origin_regex(),
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/", include_in_schema=False)
def root() -> dict:
    return {"message": "AI Job Market Intelligence API. See /docs for all endpoints."}


@app.get("/health", response_model=Health, tags=["system"])
def health() -> dict:
    """Uptime check used by Render and by the website's 'waking up' message."""
    return {"status": "ok", **data.artifacts_status()}


app.include_router(market.router, prefix="/api/market", tags=["market"])
