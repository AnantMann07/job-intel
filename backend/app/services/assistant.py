"""JobIntel Assistant: a chat helper that answers career questions from JobIntel's own data.

How it works (three steps, easy to explain in a viva):
  1. Understand: find the jobs and skills the question mentions (by matching our job list
     and skill dictionary) and what kind of question it is (keywords -> "intent").
  2. Retrieve: collect the facts for those from the SAME scoring code the pages use
     (suggestions, skill gap, roadmap, skill trends), so the numbers always agree.
  3. Answer: if a Gemini API key is set, send the question + facts to Google's Gemini model
     and tell it to answer ONLY from the facts. This pattern is called retrieval-augmented
     generation (RAG): the model writes the sentences, our data supplies the numbers.
     With no key, or if Gemini fails or is busy, the answer is built from simple templates,
     so the assistant always works.

The API key is read from the GEMINI_API_KEY environment variable on the server.
It is never sent to the browser and never stored in the code.
"""
from __future__ import annotations

import logging
import os
import re
import time
from collections import defaultdict, deque
from urllib.parse import quote

import httpx

from . import scoring

log = logging.getLogger("jobintel.assistant")

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
DEFAULT_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"]  # tried in this order
TIMEOUT_S = 20
MAX_HISTORY = 6          # earlier chat turns sent to the model
AI_PER_MINUTE = 15       # per visitor; protects the free API quota

SYSTEM_PROMPT = """You are the JobIntel Assistant, a friendly career guide inside JobIntel, a website that suggests data and tech jobs using {postings} real job postings from {period}.

Answer the user's question using ONLY the FACTS below.
- Use the numbers from FACTS exactly. Never invent salaries, percentages, jobs or skills that are not in FACTS.
- "match %" = the share of a job's most requested skills (weighted by how often employers ask for them) that the user has. "asked for in X%" = share of that job's postings mentioning the skill.
- Keep it short: at most 120 words, or up to 5 bullet points starting with "- ". Plain text, no headings, no tables.
- If the user has not added any skills, tell them they can upload a resume or type skills on the Home page, or simply tell you their skills.
- General career advice (interviews, resumes, how to practise) is fine in 2-3 sentences; say it is general advice, not from JobIntel's data.
- Politely decline questions that have nothing to do with jobs, skills or careers.
- Salaries are yearly US$ medians from postings that list pay."""

# Ways people name a job -> the job name used in our data (only used if that job exists).
ROLE_NICKNAMES = {
    "ml engineer": "Machine Learning Engineer", "mle": "Machine Learning Engineer",
    "data science": "Data Scientist", "data analytics": "Data Analyst", "data analysis": "Data Analyst",
    "bi analyst": "Data Analyst", "data engineering": "Data Engineer",
    "software developer": "Software Engineer", "software engineering": "Software Engineer",
    "swe": "Software Engineer", "sde": "Software Engineer", "developer": "Software Engineer",
    "cloud engineering": "Cloud Engineer", "business analysis": "Business Analyst",
}
# Skill names that are also ordinary English words: only count them in special cases.
SKILL_STOPWORDS = {"go", "c", "word", "sheets", "r"}

INTENT_WORDS = {
    "salary": r"\b(salar\w*|pay|paying|paid|earn\w*|money|ctc|package|income)\b",
    "trend": r"\b(rising|trend\w*|emerging|declin\w*|growing|future|hot|in demand|worth learning|popular|forecast\w*|outdated|dying)\b",
    "roadmap": r"\b(become|roadmap|path|get into|switch|transition|prepare|steps|how (do|can|should) i (get|start|become))\b",
    "learn": r"\b(learn|next skill|improve|missing|gap|study|focus on|upskill|need|require\w*)\b",
    "suggest": r"\b(jobs?|roles?|fits?|suits?|suitable|apply|career options?|matches|eligible|qualif\w*)\b",
    "tell_skills": r"\b(i (know|have|use|can use|am good at|learned|learnt)|my skills (are|include))\b",
    "help": r"^\s*(hi|hello|hey|help|hii+|namaste)\b|\bwhat can you do\b|\bwho are you\b",
}
_INTENT_RE = {k: re.compile(v, re.IGNORECASE) for k, v in INTENT_WORDS.items()}

_rate: dict[str, deque] = defaultdict(deque)


# ---------- settings ----------

def api_key() -> str | None:
    return (os.getenv("GEMINI_API_KEY") or "").strip() or None


def models() -> list[str]:
    raw = os.getenv("GEMINI_MODEL", "")
    chosen = [m.strip() for m in raw.split(",") if m.strip()]
    return chosen + [m for m in DEFAULT_MODELS if m not in chosen]


def ai_enabled() -> bool:
    return api_key() is not None


# ---------- 1. understand ----------

def _word(term: str) -> re.Pattern:
    return re.compile(r"(?<![\w+#])" + re.escape(term) + r"s?(?![\w+#])", re.IGNORECASE)


def find_roles(text: str, roles: list[dict]) -> list[str]:
    """Job names mentioned in the text, in the order they appear."""
    names = {r["role"].lower(): r["role"] for r in roles}
    terms = dict(names)
    terms.update({nick: role for nick, role in ROLE_NICKNAMES.items() if role.lower() in names})
    hits = []
    for term, role in sorted(terms.items(), key=lambda x: -len(x[0])):  # longest first
        m = _word(term).search(text)
        if m and role not in [h[1] for h in hits]:
            hits.append((m.start(), role))
    return [role for _, role in sorted(hits)]


def find_skills(text: str, dictionary: list[str]) -> list[str]:
    """Skills mentioned in the text (whole words, aliases understood)."""
    known = {s.lower() for s in dictionary}
    terms = {s: s for s in known}
    terms.update({a: t for a, t in scoring.ALIASES.items() if t in known})
    found = []
    for term, skill in terms.items():
        if term in SKILL_STOPWORDS:
            # "R" only when written as a capital letter on its own; never "go", "c", "word", "sheets"
            if term == "r" and re.search(r"(?<![\w+#])R(?![\w+#])", text):
                found.append(skill)
            continue
        if re.search(r"(?<![\w+#])" + re.escape(term) + r"(?![\w+#])", text, re.IGNORECASE) and skill not in found:
            found.append(skill)
    return found


def detect_intent(text: str, roles_found: list[str], skills_found: list[str]) -> str:
    has = {k: bool(rx.search(text)) for k, rx in _INTENT_RE.items()}
    if has["tell_skills"] and skills_found:
        return "suggest"
    if has["salary"]:
        return "salary"
    if has["trend"]:
        return "trend"
    if roles_found and (has["roadmap"] or has["learn"]):
        return "roadmap"
    if has["learn"]:
        return "learn"
    if has["roadmap"]:
        return "roadmap"
    if roles_found:
        return "role"
    if has["suggest"]:
        return "suggest"
    if skills_found:
        return "skill"
    if has["help"]:
        return "help"
    return "general"


# ---------- 2. retrieve ----------

def _pct(x: float) -> str:
    return f"{100 * x:.0f}%" if x >= 0.095 else f"{100 * x:.1f}%"


def _usd(x) -> str:
    return f"${x:,.0f}" if x else "not enough salary data"


def _trend_of(skill: str, trends: dict | None) -> dict | None:
    if not trends:
        return None
    return next((s for s in trends.get("skills", []) if s["skill"] == skill), None)


def _trend_line(t: dict) -> str:
    growth = t.get("growth")
    change = f"{(growth - 1) * 100:+.0f}% over the year" if growth else "change unknown"
    nxt = t.get("forecast") or []
    fc = f"; forecast for next month about {_pct(nxt[0])}" if nxt else ""
    return f"{t['skill']}: {t['label']}, asked for in {_pct(t['share_now'])} of all postings now ({change}){fc}"


def build_context(message: str, user: set[str], roles: list[dict], skill_names: list[str],
                  trends: dict | None, overview: dict | None) -> dict:
    """Everything the answer needs: intent, facts (text for the AI) and the raw pieces (for templates)."""
    roles_found = find_roles(message, roles)
    skills_found = find_skills(message, skill_names)
    intent = detect_intent(message, roles_found, skills_found)
    added: list[str] = []
    if intent == "suggest" and _INTENT_RE["tell_skills"].search(message):
        added = [s for s in skills_found if s not in user]
        user = user | set(skills_found)
        skills_found = []

    kpis = (overview or {}).get("kpis", {})
    facts = [f"Data: {kpis.get('postings', 0):,} job postings, {kpis.get('date_min', '?')} to {kpis.get('date_max', '?')}."]
    facts.append(f"User's skills: {', '.join(sorted(user)) if user else 'none added yet'}.")
    sug = scoring.suggest(user, roles, k=4) if user else {"ready": [], "within_reach": []}
    top = sug["ready"] + sug["within_reach"]
    top.sort(key=lambda j: -j["score"])
    for j in top[:4]:
        facts.append(
            f"Suggestion: {j['role']} - match {j['match']}% ({'ready to apply' if j['ready'] else 'within reach'}), "
            f"has {', '.join(j['have']) or 'none'}; learn next: {', '.join(j['to_learn']) or 'nothing'}; "
            f"median salary {_usd(j['median_salary_usd'])}; demand {j['demand']}; {j['postings']:,} postings.")

    # the job to talk about: the one mentioned, else the best suggestion
    focus = roles_found[:2] or ([top[0]["role"]] if top and intent in ("learn", "roadmap") else [])
    labels = {s["skill"]: s["label"] for s in (trends or {}).get("skills", [])}
    details = []
    for name in focus:
        role = scoring.find_role(roles, name)
        g = scoring.gap(user, role, labels)
        plan = scoring.roadmap(user, role, labels)
        missing = [r for r in g["skills"] if r["status"] == "missing"][:6]
        facts.append(
            f"Job {role['role']}: {role['postings']:,} postings, median salary {_usd(role.get('median_salary_usd'))}, "
            f"demand {role.get('demand', {}).get('label', 'stable')}. Most requested skills: "
            + ", ".join(f"{s['skill']} {_pct(s['share'])}" for s in role["skills"][:8]) + ".")
        facts.append(f"User's match for {role['role']}: {g['match']}% ({g['matched_count']} of {g['total']} top skills). "
                     "Missing: " + (", ".join(f"{r['skill']} (asked for in {_pct(r['share'])})" for r in missing) or "none") + ".")
        for st in plan["stages"]:
            facts.append(f"Roadmap to {role['role']}, stage {st['number']} ({st['title']}): "
                         f"{', '.join(s['skill'] for s in st['skills'])} -> match {st['match_after']}%. Project: {st['project']}")
        details.append({"role": role, "gap": g, "plan": plan})

    skill_info = []
    for sk in skills_found[:3]:
        t = _trend_of(sk, trends)
        asks = sorted(((r["role"], s["share"]) for r in roles for s in r["skills"] if s["skill"] == sk), key=lambda x: -x[1])[:3]
        if t:
            facts.append("Trend " + _trend_line(t) + ".")
        if asks:
            facts.append(f"Jobs that ask for {sk} most: " + ", ".join(f"{r} ({_pct(s)})" for r, s in asks) + ".")
        skill_info.append({"skill": sk, "trend": t, "asks": asks})

    movers = {}
    if intent == "trend" and not skills_found and trends:
        em = sorted([s for s in trends["skills"] if s["label"] == "emerging"], key=lambda s: -(s["growth"] or 0))[:5]
        de = sorted([s for s in trends["skills"] if s["label"] == "declining"], key=lambda s: s["growth"] or 0)[:3]
        facts += ["Emerging " + _trend_line(s) + "." for s in em] + ["Declining " + _trend_line(s) + "." for s in de]
        movers = {"emerging": em, "declining": de}

    if intent == "salary" and not focus:
        paid = sorted([r for r in roles if r.get("median_salary_usd")], key=lambda r: -r["median_salary_usd"])
        facts += [f"Median salary {r['role']}: {_usd(r['median_salary_usd'])} ({r['postings']:,} postings)." for r in paid]

    return {"intent": intent, "user": user, "added": added, "facts": facts, "suggestions": top, "details": details,
            "skills": skill_info, "movers": movers, "kpis": kpis, "all_roles": roles}


# ---------- 3a. answer with Gemini ----------

def _clean(text: str) -> str:
    lines = []
    for line in text.strip().splitlines():
        line = re.sub(r"^\s*#+\s*", "", line)          # no markdown headings
        line = re.sub(r"^(\s*)[*•]\s+", r"\1- ", line)  # "* x" -> "- x"
        lines.append(line.rstrip())
    return "\n".join(lines).strip()


def ask_gemini(question: str, facts: list[str], history: list[dict], kpis: dict) -> str | None:
    """Returns the model's answer, or None if there is no key or every model failed."""
    key = api_key()
    if not key:
        return None
    start, end = str(kpis.get("date_min") or "")[:7], str(kpis.get("date_max") or "")[:7]
    period = f"{start} to {end}" if start and end else "2023"
    system = SYSTEM_PROMPT.format(postings=f"{kpis.get('postings', 0):,}", period=period) + "\n\nFACTS:\n" + "\n".join(f"- {f}" for f in facts)
    turns = [h for h in history if h.get("text")][-MAX_HISTORY:]
    while turns and turns[0]["role"] != "user":  # the conversation must start with the user
        turns.pop(0)
    contents = [{"role": "model" if h["role"] == "assistant" else "user", "parts": [{"text": h["text"][:1500]}]} for h in turns]
    contents.append({"role": "user", "parts": [{"text": question}]})
    for model in models():
        config: dict = {"temperature": 0.4, "maxOutputTokens": 1024}
        if model.startswith("gemini-2.5-flash"):
            config["thinkingConfig"] = {"thinkingBudget": 0}  # faster, and leaves all tokens for the answer
        body = {"system_instruction": {"parts": [{"text": system}]}, "contents": contents, "generationConfig": config}
        try:
            r = httpx.post(GEMINI_URL.format(model=model), headers={"x-goog-api-key": key}, json=body, timeout=TIMEOUT_S)
        except httpx.HTTPError as exc:
            log.warning("Gemini %s: %s", model, type(exc).__name__)
            continue
        if r.status_code != 200:
            log.warning("Gemini %s returned HTTP %s", model, r.status_code)
            continue
        try:
            parts = r.json()["candidates"][0]["content"]["parts"]
            text = "".join(p.get("text", "") for p in parts if not p.get("thought"))
        except (KeyError, IndexError, ValueError):
            text = ""
        if text.strip():
            return _clean(text)
    return None


def allow_ai(client: str) -> bool:
    """Simple per-visitor limit so one person can't use up the free quota."""
    now = time.monotonic()
    q = _rate[client]
    while q and now - q[0] > 60:
        q.popleft()
    if len(q) >= AI_PER_MINUTE:
        return False
    q.append(now)
    return True


# ---------- 3b. answer from templates (no AI needed) ----------

def template_answer(ctx: dict) -> str:
    intent, user, top = ctx["intent"], ctx["user"], ctx["suggestions"]
    n = ctx["kpis"].get("postings", 0)
    no_skills = ("Tell me your skills (for example: \"I know sql, python and excel\") "
                 "or add them on the Home page, and I'll suggest jobs that fit.")

    if intent == "help" or (intent == "general" and not ctx["details"] and not ctx["skills"]):
        start = "Hi! " if intent == "help" else "I can't answer that one, but here is what I can help with. "
        return (start + f"I answer from {n:,} real job postings. Ask me:\n"
                "- Which jobs fit my skills?\n- What should I learn next?\n"
                "- How do I become a Data Engineer?\n- Which skills are rising?\n- What does a Data Scientist earn?")

    if intent == "salary":
        if ctx["details"]:
            return "\n".join(f"- {d['role']['role']}: median {_usd(d['role'].get('median_salary_usd'))} a year "
                             f"({d['role']['postings']:,} postings)" for d in ctx["details"]) + \
                "\nSalaries are yearly US$ medians from postings that list pay."
        paid = sorted([r for r in ctx["all_roles"] if r.get("median_salary_usd")], key=lambda r: -r["median_salary_usd"])[:5]
        return "Highest median salaries (yearly US$, postings that list pay):\n" + \
            "\n".join(f"- {r['role']}: {_usd(r['median_salary_usd'])}" for r in paid)

    if intent == "trend" or intent == "skill":
        if ctx["skills"]:
            out = []
            for s in ctx["skills"]:
                if s["trend"]:
                    out.append("- " + _trend_line(s["trend"]))
                else:
                    out.append(f"- {s['skill']}: too rare in the postings for a reliable trend")
                if s["asks"]:
                    out.append(f"  Jobs that ask for it most: " + ", ".join(f"{r} ({_pct(v)})" for r, v in s["asks"]))
            return "\n".join(out)
        if ctx["movers"]:
            em = ", ".join(f"{s['skill']} ({(s['growth'] - 1) * 100:+.0f}%)" for s in ctx["movers"]["emerging"]) or "none"
            de = ", ".join(f"{s['skill']} ({(s['growth'] - 1) * 100:+.0f}%)" for s in ctx["movers"]["declining"]) or "none"
            return f"Rising fastest over the year: {em}.\nFalling: {de}.\nSee Skill Trends for the charts and forecasts."
        return "Tell me a skill, for example \"Is snowflake rising?\", or open Skill Trends."

    if intent == "suggest":
        if not user:
            return no_skills
        lines = [f"With {', '.join(sorted(user))}, your best matches are:"]
        for j in top[:3]:
            tag = "ready to apply" if j["ready"] else "within reach"
            nxt = f", learn {j['biggest_gain']} next" if j["biggest_gain"] else ""
            lines.append(f"- {j['role']}: {j['match']}% match ({tag}){nxt}")
        return "\n".join(lines)

    if ctx["details"]:  # roadmap / learn / role
        d = ctx["details"][0]
        role, g, plan = d["role"], d["gap"], d["plan"]
        if intent == "role":
            head = (f"{role['role']}: {role['postings']:,} postings, median salary {_usd(role.get('median_salary_usd'))}, "
                    f"demand {role.get('demand', {}).get('label', 'stable')}.\nMost requested: "
                    + ", ".join(f"{s['skill']} ({_pct(s['share'])})" for s in role["skills"][:6]) + ".")
            return head + (f"\nYour match: {g['match']}%." if user else "")
        if intent == "learn" and g["learn_first"]:
            steps = ", ".join(f"{x['skill']} (-> {x['match_after']}%)" for x in g["learn_first"])
            return f"For {role['role']} you're at {g['match']}%. Learn these first: {steps}."
        if not plan["stages"]:
            return f"You already have every top skill for {role['role']}. Time to apply!"
        lines = [f"Your roadmap to {role['role']} (you're at {plan['ready']}% now):"]
        for st in plan["stages"]:
            lines.append(f"- Stage {st['number']}, {st['title']}: {', '.join(s['skill'] for s in st['skills'])} -> {st['match_after']}%")
        return "\n".join(lines)

    if intent == "roadmap" or user:
        return "Which job are you aiming for? For example: \"How do I become a Data Engineer?\""
    return no_skills


# ---------- putting it together ----------

def _links(ctx: dict) -> list[dict]:
    intent, links = ctx["intent"], []
    for d in ctx["details"][:1]:
        name = d["role"]["role"]
        links.append({"label": f"Roadmap to {name}", "href": f"/roadmap?role={quote(name)}"})
        links.append({"label": "Skill-by-skill check", "href": f"/resume?role={quote(name)}"})
    if intent in ("suggest", "learn") and ctx["user"]:
        links.append({"label": "All jobs for you", "href": "/suggestions"})
    if intent in ("trend", "skill"):
        links.append({"label": "Skill Trends", "href": "/trends"})
    if intent == "salary":
        links.append({"label": "Market", "href": "/insights"})
    return links[:3]


def _chips(ctx: dict) -> list[str]:
    top = ctx["suggestions"]
    if not ctx["user"]:
        chips = ["Which skills are rising?", "How do I become a Data Analyst?", "What does a Data Scientist earn?"]
        return [c for c in chips if not (ctx["intent"] == "trend" and c.startswith("Which skills"))]
    best = top[0]["role"] if top else "Data Analyst"
    chips = ["Which jobs fit me?", "What should I learn next?", f"Roadmap to {best}", "Which skills are rising?"]
    skip = {"suggest": "Which jobs fit me?", "trend": "Which skills are rising?", "learn": "What should I learn next?"}
    return [c for c in chips if c != skip.get(ctx["intent"])][:3]


def answer(message: str, skills: list[str], history: list[dict], roles: list[dict], skill_names: list[str],
           trends: dict | None, overview: dict | None, client: str = "anon") -> dict:
    user = scoring.normalize_skills(skills)
    ctx = build_context(message, user, roles, skill_names, trends, overview)
    reply, source = None, "data"
    if ai_enabled() and allow_ai(client):
        reply = ask_gemini(message, ctx["facts"], history, ctx["kpis"])
        source = "ai" if reply else "data"
    if not reply:
        reply = template_answer(ctx)
    return {"reply": reply, "source": source, "intent": ctx["intent"], "links": _links(ctx), "chips": _chips(ctx),
            "skills_added": ctx["added"]}
