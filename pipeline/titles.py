"""Job-title normalization: turn messy titles into (canonical role, seniority level).

Example:
    >>> normalize_title("Sr. Data Engineer II - Remote (Contract)")
    ('Data Engineer', 'Senior')

How it works:
  1. Find the seniority level from keywords (senior, junior, lead, intern ...).
  2. Remove noise: text in brackets, work-mode words, level numbers, and
     anything after " - ", " | " or ",".
  3. Match the cleaned title against ordered regex rules. The first rule that
     matches wins, so more specific roles are listed first.

Extend ROLE_RULES when you add datasets with new kinds of jobs.
"""
from __future__ import annotations

import re

OTHER = "Other"

# (level, pattern). Checked in this order; first match wins.
LEVEL_RULES: list[tuple[str, str]] = [
    ("Intern", r"\b(intern|internship|trainee|apprentice)\b"),
    ("Lead", r"\b(lead|principal|staff|head|manager|director|architect)\b"),
    ("Senior", r"\b(senior|sr)\b"),
    ("Entry", r"\b(junior|jr|entry[- ]level|graduate|new grad)\b"),
]
DEFAULT_LEVEL = "Mid"

# (canonical role, pattern). Order matters: specific before general.
ROLE_RULES: list[tuple[str, str]] = [
    ("MLOps Engineer", r"\bmlops\b"),
    ("Machine Learning Engineer", r"\b(machine learning|ml|deep learning|computer vision|nlp) (engineer|developer)\b"),
    ("AI Engineer", r"\b(ai|genai|generative ai|llm) (engineer|developer)\b"),
    ("Research Scientist", r"\b(research|applied) scientist\b"),
    ("Data Scientist", r"\bdata scien(tist|ce)\b|\bdecision scientist\b|\bmachine learning scientist\b"),
    ("Analytics Engineer", r"\banalytics engineer\b"),
    ("Data Architect", r"\bdata architect\b"),
    ("Data Engineer", r"\b(data|big data|etl) (engineer|developer)\b"),
    ("BI Developer", r"\b(bi|business intelligence|power bi|tableau) (developer|engineer)\b"),
    ("Data Analyst", r"\b(data|reporting|analytics|insights|bi|business intelligence|power bi|tableau) analyst\b"),
    ("Product Analyst", r"\bproduct analyst\b"),
    ("Business Analyst", r"\bbusiness (systems )?analyst\b"),
    ("Statistician", r"\b(bio)?statistician\b"),
    ("Cloud Engineer", r"\b(cloud|aws|azure|gcp) (engineer|architect|developer)\b"),
    ("DevOps Engineer", r"\b(devops|site reliability|platform) engineer\b|\bsre\b"),
    ("Database Administrator", r"\b(database administrator|dba)\b"),
    ("Software Engineer", r"\b(software|backend|back[- ]end|frontend|front[- ]end|full[- ]?stack) (engineer|developer)\b|\bsoftware development engineer\b|\bsde\b"),
]

_NOISE = [
    r"\(.*?\)|\[.*?\]",  # anything in brackets
    r"\b(remote|hybrid|on[- ]?site|contract|contractor|full[- ]time|part[- ]time|temporary|temp|w2|c2c|1099)\b",
    r"\b(ii|iii|iv|i|v)\b",  # roman level numbers
    r"\blevel \d\b|\b\d\b",  # "level 2", "2"
]
_SEPARATORS = r"\s[-|–—/]\s|,|\|"

_LEVEL_RE = [(lvl, re.compile(p)) for lvl, p in LEVEL_RULES]
_ROLE_RE = [(role, re.compile(p)) for role, p in ROLE_RULES]
_NOISE_RE = [re.compile(p) for p in _NOISE]
_SEP_RE = re.compile(_SEPARATORS)
_SENIORITY_WORDS_RE = re.compile(
    r"\b(senior|sr|junior|jr|lead|principal|staff|intern|internship|trainee|entry[- ]level)\b\.?"
)


def detect_level(title: str) -> str:
    """Return Intern / Entry / Mid / Senior / Lead from a raw title."""
    t = title.lower().replace(".", " ")
    for level, rx in _LEVEL_RE:
        if rx.search(t):
            return level
    return DEFAULT_LEVEL


def clean_title(title: str) -> str:
    """Lowercase, cut at separators, drop noise words and seniority words."""
    t = str(title).lower().strip()
    t = _SEP_RE.split(t, maxsplit=1)[0]
    for rx in _NOISE_RE:
        t = rx.sub(" ", t)
    t = _SENIORITY_WORDS_RE.sub(" ", t)
    return re.sub(r"\s+", " ", t).strip(" .-")


def match_role(cleaned: str) -> str:
    for role, rx in _ROLE_RE:
        if rx.search(cleaned):
            return role
    return OTHER


def normalize_title(title: str | None) -> tuple[str, str]:
    """Raw title -> (canonical role, level). Unknown titles give role 'Other'."""
    if title is None or (isinstance(title, float)) or not str(title).strip():
        return OTHER, DEFAULT_LEVEL
    raw = str(title)
    cleaned = clean_title(raw)
    role = match_role(cleaned)
    if role == OTHER:
        # second chance on the full lowercased title (rules may need the part after a comma)
        role = match_role(raw.lower())
    return role, detect_level(raw)


def strip_seniority(label: str) -> str:
    """'Senior Data Engineer' -> 'Data Engineer' (used for the dataset's own labels)."""
    return re.sub(r"^(senior|sr\.?|junior|jr\.?|lead)\s+", "", str(label).strip(), flags=re.I)
