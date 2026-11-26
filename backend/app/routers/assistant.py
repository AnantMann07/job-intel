"""Endpoints for the JobIntel Assistant (the chat button on every page)."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from .. import data
from ..schemas import AssistantIn, AssistantOut, AssistantStatus
from ..services import assistant

router = APIRouter()


def _optional(loader):
    """Trends or the overview missing should not break the chat."""
    try:
        return loader()
    except HTTPException:
        return None


def _visitor(request: Request) -> str:
    """Who is asking (for the per-visitor limit). Behind Render's proxy the real address is in X-Forwarded-For."""
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    return forwarded or (request.client.host if request.client else "anon")


@router.get("/status", response_model=AssistantStatus)
def status():
    """Whether AI answers are switched on (GEMINI_API_KEY set on the server)."""
    return {"ai": assistant.ai_enabled(), "models": assistant.models() if assistant.ai_enabled() else []}


@router.post("/chat", response_model=AssistantOut)
def chat(body: AssistantIn, request: Request):
    """Answer one chat message, using the visitor's skills and JobIntel's data.

    A plain `def` (not async): FastAPI runs it in a worker thread, so waiting for Gemini
    does not block other visitors.
    """
    return assistant.answer(
        message=body.message,
        skills=body.skills,
        history=[t.model_dump() for t in body.history],
        roles=data.roles(),
        skill_names=[s["skill"] for s in data.skills()],
        trends=_optional(data.trends),
        overview=_optional(data.market_overview),
        client=_visitor(request),
    )
