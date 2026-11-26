# AI Job Market Intelligence Platform

College ML project: **JobIntel, a job suggestion platform** built on real job postings. Main features: (1) upload a resume or type skills → job suggestions; (2) resume analysis against a target job; (3) pick a dream job → a staged roadmap to it. Supporting features: market insights (dashboard, skill trends and forecasts). Career paths and a what-if simulator are planned future work. Every page is specified in DESIGN.md: follow it for layout, colours and content.

The owner is a beginner and will have to explain this code in a viva. So:
- Keep code simple, readable and commented. Prefer plain pandas/scikit-learn over clever abstractions.
- After each change, explain in plain words what you changed and why.
- Work in small steps and run the tests often.

## Plan

The build order and the "done when" checks are in ROADMAP.md. Work on one step at a time and don't start the next one unless asked. When every "done when" item of a step passes, tick its checkbox in ROADMAP.md.

## Architecture

- `pipeline/`: offline Python pipeline. All heavy ML runs here. Each module has a `main()` and is wired into `pipeline/run_all.py`. File paths come only from `pipeline/config.py`.
- `backend/`: FastAPI. Reads only small precomputed files from `backend/artifacts/`; never reads `data/` and never trains models. It must run in 512 MB RAM (Render free tier), so do not add PyTorch or sentence-transformers to `backend/requirements.txt`. For runtime embeddings use Model2Vec (`minishlab/potion-base-8M`), and precompute skill embeddings with the same model.
- `frontend/`: Next.js 16 (App Router) + TypeScript + Tailwind 4. Read `frontend/AGENTS.md` before writing Next.js code. The API URL comes from `NEXT_PUBLIC_API_URL`. Types in `frontend/src/lib/api.ts` mirror `backend/app/schemas.py`: change both together.
- All scoring goes through ONE module, `backend/app/services/scoring.py` (`suggest`, `gap`, `roadmap`), so every page shows the same numbers. Resume parsing is in `backend/app/services/resume.py`.
- Website routes: `/` Home, `/suggestions`, `/resume`, `/roadmap`, `/insights`, `/trends` (future: `/career`, `/simulator`). The user's skills live in `localStorage` via `frontend/src/lib/profile.ts` so all pages share them.

## Commands (Windows PowerShell; activate first with `.venv\Scripts\activate`)

- Pipeline on fake data: `python -m pipeline.run_all --sample`
- Pipeline on real data: `python -m pipeline.run_all`
- Tests: `pytest`
- API: `cd backend; uvicorn app.main:app --reload` (docs at http://localhost:8000/docs)
- Website: `cd frontend; npm run dev` (http://localhost:3000). Before committing: `npm run lint` and `npm run build`

## Rules

- Run `pytest` after every change. Add tests for new pipeline functions and endpoints. Tests use the fake sample (`pipeline/sample.py`); extend the sample when a new step needs new columns. Tests never use the real data.
- Skill demand is always a SHARE of postings, never a raw count.
- Never commit `data/`, `.env` files or API keys. Never delete or edit files in `data/raw/`.
- Keep `backend/artifacts/` under 50 MB and commit it (the deployed API needs it).
- Pipeline-only packages go in `requirements.txt`; packages the deployed API needs go in `backend/requirements.txt` (keep that list short).
- Ask the owner before adding a new dataset, changing a scoring formula, or making a large refactor.
- Every metric reported must be compared with a simple baseline.

## Data

- `data_jobs` (Hugging Face, lukebarousse, Apache-2.0): ~786k data-role postings from 2023 with pre-extracted skill lists, no job descriptions. Loaded by `pipeline/download.py`.
- Future option: "LinkedIn Job Postings 2023-2024" (Kaggle, arshkon) for full job descriptions. It would need the owner's Kaggle API token in `~/.kaggle/kaggle.json`.
