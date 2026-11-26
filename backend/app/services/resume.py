"""Resume parsing: file -> text -> skills.

1. Text: pdfplumber for PDF, python-docx for Word, plain decode for .txt.
2. Skills: look for every skill in the skill dictionary (built from the job postings, so we only
   find skills employers actually ask for), plus common aliases ("sklearn" -> "scikit-learn").
   Matching is whole-word and case-insensitive, and handles names like "c++", "c#" and "power bi".
3. Short ambiguous names ("r", "go", "c") only count on a line that also lists other skills
   (a "Skills:" line), so the letter "R" in a sentence isn't read as the R language.
4. Current job: the first known job title that appears in the resume.

The file is read in memory and never saved.
"""
from __future__ import annotations

import io
import re

from .scoring import ALIASES

MAX_BYTES = 5 * 1024 * 1024
AMBIGUOUS = {"r", "go", "c", "sas", "dax", "vba", "excel", "word", "sheets", "spark", "swift", "rust", "julia"}
ROLE_WORDS = {
    "data engineer": "Data Engineer", "data scientist": "Data Scientist", "data analyst": "Data Analyst",
    "business analyst": "Business Analyst", "machine learning engineer": "Machine Learning Engineer",
    "ml engineer": "Machine Learning Engineer", "software engineer": "Software Engineer",
    "software developer": "Software Engineer", "cloud engineer": "Cloud Engineer",
    "analytics engineer": "Analytics Engineer", "bi developer": "BI Developer",
}


class ResumeError(ValueError):
    """A problem the user can fix (wrong file type, empty file, scanned PDF)."""


def extract_text(filename: str, data: bytes) -> str:
    name = (filename or "").lower()
    if len(data) > MAX_BYTES:
        raise ResumeError("File is larger than 5 MB.")
    if not data:
        raise ResumeError("The file is empty.")
    if name.endswith(".pdf"):
        import pdfplumber
        try:
            with pdfplumber.open(io.BytesIO(data)) as pdf:
                text = "\n".join((page.extract_text() or "") for page in pdf.pages[:10])
        except Exception as exc:  # broken or encrypted PDFs
            raise ResumeError("Could not read this PDF. Try exporting it again, or upload a DOCX.") from exc
    elif name.endswith(".docx"):
        import docx
        try:
            doc = docx.Document(io.BytesIO(data))
        except Exception as exc:
            raise ResumeError("Could not read this Word file.") from exc
        parts = [p.text for p in doc.paragraphs]
        for table in doc.tables:
            for row in table.rows:
                parts.append(" | ".join(cell.text for cell in row.cells))
        text = "\n".join(parts)
    elif name.endswith(".txt"):
        text = data.decode("utf-8", errors="ignore")
    else:
        raise ResumeError("Please upload a PDF, DOCX or TXT file.")
    if len(text.strip()) < 30:
        raise ResumeError("No text found. If this is a scanned PDF, please upload a text-based PDF or DOCX.")
    return text


def _pattern(term: str) -> re.Pattern:
    # whole word: not preceded/followed by a letter, digit, '+' or '#'
    return re.compile(r"(?<![\w+#])" + re.escape(term) + r"(?![\w+#])", re.IGNORECASE)


def find_skills(text: str, dictionary: list[str]) -> list[dict]:
    """Return [{skill, count}] for every dictionary skill found in the text."""
    known = {s.lower() for s in dictionary}
    terms = {s: s for s in known}
    terms.update({alias: target for alias, target in ALIASES.items() if target in known})
    lines = text.splitlines()
    found: dict[str, int] = {}
    for term, skill in terms.items():
        rx = _pattern(term)
        if term in AMBIGUOUS or len(term) <= 2:
            n = 0
            for line in lines:
                if rx.search(line) and _looks_like_skill_line(line, known, term):
                    n += 1
        else:
            n = len(rx.findall(text))
        if n:
            found[skill] = found.get(skill, 0) + n
    return [{"skill": s, "count": c} for s, c in sorted(found.items(), key=lambda x: -x[1])]


def _looks_like_skill_line(line: str, known: set[str], term: str) -> bool:
    low = line.lower()
    if re.search(r"\b(skills?|tools|technologies|languages|tech stack)\b", low):
        return True
    others = sum(1 for k in known if k != term and len(k) > 2 and _pattern(k).search(line))
    return others >= 2 and ("," in line or "|" in line or "•" in line or "/" in line)


def guess_role(text: str) -> str | None:
    low = text.lower()
    best = None
    for words, role in ROLE_WORDS.items():
        i = low.find(words)
        if i >= 0 and (best is None or i < best[0]):
            best = (i, role)
    return best[1] if best else None


def parse_resume(filename: str, data: bytes, dictionary: list[str]) -> dict:
    text = extract_text(filename, data)
    skills = find_skills(text, dictionary)
    return {
        "filename": filename,
        "characters": len(text),
        "skills": [s["skill"] for s in skills],
        "current_role": guess_role(text),
    }
