# Roadmap

JobIntel is a **job suggestion platform**. A person either
1. uploads a resume or types skills and gets **job suggestions**, or
2. picks the job they want and gets a **roadmap** to it.

Resume analysis, career paths, the what-if simulator and market insights support those two journeys. `DESIGN.md` describes every page.

## Status (25 Nov): MVP built

Done and tested (38 tests): data pipeline on the real data, job profiles, job suggestions, resume analysis, roadmap, skill trends with forecasts, market dashboard, offline evaluation against baselines (`reports/suggestions_eval.md`, `reports/forecast_eval.md`).

Built differently from the plan below, on purpose, to meet the deadline:
- Skills come from the dataset's own skill lists (no LinkedIn descriptions, no embeddings yet).
- The roadmap is a staged skill plan; the NetworkX career graph is not built.

Future work (not built yet): Career Paths page, What-If Simulator, LinkedIn job descriptions with skill extraction, Model2Vec skill similarity. The steps below stay as the full plan.

Each step ends with something you can see on the website. Work through them in order. Start each step in a new Claude Code chat with:

```
Do Step N from ROADMAP.md. First show me a short plan and wait for my OK.
```

A step is finished when every "Done when" box is ticked.

---

## Step 1: Setup, data and first deploy

- [ ] `pytest` shows all tests passing
- [ ] Real data downloaded and `python -m pipeline.run_all` finished
- [ ] `reports/data_report.md` generated from real data (no "FAKE" warning)
- [ ] Code pushed to GitHub, and the Actions tab shows a green tick
- [ ] API live on Render (`/health` answers) and website live on Vercel showing real data

## Step 2: Skills dictionary, skill extraction and job profiles

- Add the Kaggle "LinkedIn Job Postings 2023-2024" dataset (arshkon) to `download.py` and `clean.py`, in the same schema, with full descriptions.
- Build `data/processed/skills.csv` (`skill_id, name, aliases, category`) from the data_jobs skill lists plus O*NET Technology Skills. Hand-check the top 200.
- `pipeline/skills.py`: a reusable extractor (spaCy `PhraseMatcher`, lowercase) with rules for ambiguous skills (R, Go, C, Excel, Spark, Swift). The resume parser reuses it in Step 3.
- Job profiles: for each job role, the share of its postings that mention each skill, plus median salary, posting count and demand trend. Save as small artifacts for the API.
- Website: build the **Home** page from `DESIGN.md` (both starting cards, "How it works", menu). The buttons can lead to "coming soon" pages for now.

Done when:
- [ ] `reports/skills_eval.md` shows precision, recall and F1 of the extractor against data_jobs' own skill labels, compared with a simple keyword-search baseline
- [ ] Job profiles are saved, with tests
- [ ] The Home page is live and matches `DESIGN.md`

## Step 3: Resume analysis and job suggestions (main feature)

- `POST /api/resume/parse`: PDF/DOCX upload (max 5 MB) → text (pdfplumber, python-docx) → skills with confidence, using the Step 2 extractor, plus the inferred current job. Nothing is stored.
- `backend/app/services/scoring.py`:
  - `match(skills, role)`: weighted coverage, partial credit through embedding similarity (Model2Vec), missing skills ranked by weight.
  - `suggest(skills, filters)`: score every job role (0.5 × skill similarity + 0.3 × match + 0.2 × demand) and split the results into "Ready to apply" (≥ 50%) and "Within reach".
- Example openings: a small artifact of real postings per role, so each suggestion can list the postings whose skills best match the person's.
- Endpoints: `/api/resume/parse`, `/api/suggest`, `/api/gap`.
- Evaluate suggestions with held-out postings as pseudo-candidates: Hit@1, Hit@5 and MRR vs a cosine-only and a "most common job" baseline.

Done when:
- [ ] Unit tests for `match()` and `suggest()`
- [ ] `reports/suggestions_eval.md` with Hit@k and MRR vs the baselines
- [ ] Tested with 3 real resumes
- [ ] Home → **Job Suggestions** and **Resume Analysis** pages work end to end, as in `DESIGN.md`

## Step 4: Roadmap and career paths (main feature)

- `roadmap(skills, target_role)` in `scoring.py`: readiness % today; missing skills grouped into 3–4 stages in the order that raises the match most (skills related to ones the person knows come earlier); the match % after each stage; a practice-project line per stage from a small hand-written list keyed by skill category.
- Career graph in NetworkX (job roles × levels; edges by skill similarity, same or higher level) exported to JSON. Dijkstra for the easiest route, plus 2 alternatives.
- Endpoints: `/api/roadmap`, `/api/career/graph`, `/api/career/path`.

Done when:
- [ ] Unit tests for `roadmap()` (the match after the last stage is the highest; stages never repeat a skill)
- [ ] 10 career routes checked by hand for sense
- [ ] **My Roadmap** and **Career Paths** pages work, reachable from Home and from each job suggestion

## Step 5: Skill trends and emerging skills

- Monthly demand share per skill, using both datasets.
- Forecast 3 months ahead: naive and moving-average baselines, then Holt-Winters and ARIMA (statsmodels). Rolling backtest with MAE and sMAPE.
- Label each skill emerging, stable or declining (Theil-Sen slope + Mann-Kendall test + growth ratio), saving the evidence.
- Feed the labels back in: rising skills get a small boost in roadmap ordering, and suggestions show "demand growing".
- Endpoints: `/api/skills/{skill}/trend`, `/api/skills/trending`.

Done when:
- [ ] `reports/forecast_eval.md` shows the models beat the naive baseline (or says honestly where they don't)
- [ ] The **Skill Trends** page works, and Home shows "Skills employers want more of"

## Step 6: What-If Simulator

- `POST /api/whatif`: before/after match %, changes in the top 5 suggested jobs, and a "best next skill" list, all from `scoring.py`.

Done when:
- [ ] The **What-If Simulator** page works and is linked from My Roadmap

## Step 7: Market dashboard and polish

- **Market Dashboard** page (charts with Recharts, country and level filters).
- Every page matches `DESIGN.md`: menu groups, loading/error/empty states, phone layout. An About page with data sources and methods.
- Check the backend stays under 512 MB on Render.

Done when:
- [ ] Every page works on the live site, on phone and laptop

## Step 8: Evaluation and report

Done when:
- [ ] One metrics table covering every ML component vs its baseline
- [ ] Architecture diagram, dataset table and screenshots of every page in the report
- [ ] Limitations section written (data sources, 2023 time window, dictionary coverage, example openings are not live)
- [ ] 3-5 minute demo video: resume → job suggestions → roadmap → what-if

## Optional extra (only if time is left)

- Live job openings from a jobs API, shown next to each suggestion.
