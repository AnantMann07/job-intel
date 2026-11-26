"""Settings read from environment variables (with safe defaults for local use).

On Render you set these in the dashboard under "Environment":
  CORS_ORIGINS        comma-separated list of allowed frontend URLs
  CORS_ORIGIN_REGEX   regex for extra allowed origins (default: any *.vercel.app)
  ARTIFACTS_DIR       where the JSON/parquet artifacts live (default: backend/artifacts)
  GEMINI_API_KEY      turns on AI answers in the assistant (free key: https://aistudio.google.com)
  GEMINI_MODEL        optional: which Gemini model(s) to try first, comma-separated
"""
from __future__ import annotations

import os
from pathlib import Path

DEFAULT_ARTIFACTS = Path(__file__).resolve().parents[1] / "artifacts"


def artifacts_dir() -> Path:
    return Path(os.getenv("ARTIFACTS_DIR", str(DEFAULT_ARTIFACTS)))


def cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    return [o.strip() for o in raw.split(",") if o.strip()]


def cors_origin_regex() -> str | None:
    return os.getenv("CORS_ORIGIN_REGEX", r"https://.*\.vercel\.app") or None
