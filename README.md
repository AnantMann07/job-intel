# AI Job Market Intelligence Platform

A machine-learning website that analyses real job postings: which skills are in demand, which are emerging, how your resume compares to a target role, and which career moves are realistic.

This repository contains **Step 0 (project setup) and Step 1 (data collection & cleaning)** of the build guide, plus a working API and website you can deploy today. Later steps (skill extraction, forecasting, resume analysis, career graph) are added on top of this.

```
job-intel/
├── pipeline/            offline data + ML pipeline (Python)
│   ├── config.py        all file paths in one place
│   ├── download.py      downloads the dataset into data/raw/
│   ├── sample.py        makes a small FAKE dataset for testing
│   ├── titles.py        job-title normalization rules
│   ├── clean.py         raw CSV -> clean postings table
│   ├── report.py        writes reports/data_report.md
│   ├── market.py        skill/role statistics + market_overview.json
│   └── run_all.py       runs every step in order
├── backend/             FastAPI web API (deployed to Render)
│   ├── app/main.py      the API app, /health, CORS
│   ├── app/routers/     one file per group of endpoints
│   ├── app/schemas.py   response shapes (shown at /docs)
│   ├── artifacts/       small files the API serves (made by the pipeline)
│   └── Dockerfile       optional container build
├── frontend/            Next.js website (deployed to Vercel)
│   └── src/app/page.tsx starter Market Dashboard
├── tests/               pytest tests (run automatically on GitHub)
├── data/                raw / interim / processed data (NOT in Git)
├── reports/             data_report.md for your project write-up
└── .github/workflows/   CI: runs tests + website build on every push
```

---

## Part A — Install the tools (once, about 30 minutes)

| Tool | Get it from | Notes |
| --- | --- | --- |
| Python 3.12 | https://www.python.org/downloads/ | **Windows: tick "Add python.exe to PATH"** on the first installer screen |
| Node.js 22 LTS | https://nodejs.org/ | Needed for the website |
| Git | https://git-scm.com/downloads | Keep the default options |
| VS Code | https://code.visualstudio.com/ | Accept the recommended extensions when it asks |
| GitHub account | https://github.com/signup | Free |

Check everything installed. Open a new terminal and run:

```bash
python --version     # Python 3.12.x   (Mac: python3 --version)
node --version       # v22.x
git --version
```

## Part B — Open the project in VS Code

1. Unzip `job-intel.zip` somewhere simple, e.g. `Documents/job-intel`.
2. VS Code → **File → Open Folder…** → choose the `job-intel` folder.
3. **Terminal → New Terminal.** Every command below runs in this terminal, from the `job-intel` folder unless it says `cd` somewhere else.

## Part C — Set up Python (once)

A virtual environment (`.venv`) keeps this project's packages separate from everything else on your computer.

**Windows (PowerShell):**
```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```
If activation is blocked with a "running scripts is disabled" error, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, answer `Y`, then try again.

**Mac / Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

You'll see `(.venv)` at the start of the terminal line when it is active. Re-run the `activate` line every time you open a new terminal. Then in VS Code press `Ctrl+Shift+P` → **Python: Select Interpreter** → pick the one inside `.venv`.

## Part D — Run the data pipeline

**1. Test everything with fake data first (takes seconds):**
```bash
python -m pipeline.run_all --sample
pytest
```
You should see `22 passed`.

**2. Download the real dataset** (~231 MB, no account needed):
```bash
python -m pipeline.download
```
If it fails or is very slow, download `data_jobs.csv` by hand from https://huggingface.co/datasets/lukebarousse/data_jobs/tree/main and put it in `data/raw/`.

**3. Run the pipeline on the real data:**
```bash
python -m pipeline.run_all
```
This writes:
- `data/interim/postings.parquet` — about 786k cleaned job postings
- `data/processed/skills_monthly.parquet`, `role_skills.parquet`, `skill_categories.csv` — used in later steps
- `backend/artifacts/market_overview.json` — what the website shows
- `reports/data_report.md` — open it and press `Ctrl+Shift+V` to preview. **These tables go into your project report.**

## Part E — Run the website on your computer

You need **two terminals** (click the `+` in the terminal panel for the second one; activate `.venv` in it too).

**Terminal 1 — the API:**
```bash
cd backend
uvicorn app.main:app --reload
```
Open http://localhost:8000/docs. This page lists every endpoint; click one → **Try it out** → **Execute**.

**Terminal 2 — the website:**
```bash
cd frontend
npm install
copy .env.example .env.local      # Mac/Linux: cp .env.example .env.local
npm run dev
```
Open http://localhost:3000. You should see the dashboard with "API online". Stop either server with `Ctrl+C`.

## Part F — Put the project on GitHub

1. On https://github.com/new create a repository named `job-intel`. Leave "Add a README" **unticked**.
2. Back in the VS Code terminal (in the `job-intel` folder):
```bash
git init
git add .
git commit -m "Step 0-1: project setup, data pipeline, API and website"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/job-intel.git
git push -u origin main
```
The first push opens a browser window to sign in to GitHub. Large data files are excluded automatically by `.gitignore`; only the small `backend/artifacts/market_overview.json` is uploaded. Run the **real** pipeline (Part D, step 3) before pushing, so the live site shows real data.

3. On GitHub, open the **Actions** tab: a green tick means the tests and website build passed.

## Part G — Deploy (free)

**Backend on Render**
1. Sign up at https://render.com with your GitHub account.
2. **New → Web Service** → choose the `job-intel` repository.
3. Fill in:
   - **Root Directory:** `backend`
   - **Language / Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** Free
   - Under Advanced, **Health Check Path:** `/health`
4. Click **Create Web Service** and wait for "Live". Copy the URL (like `https://job-intel-api.onrender.com`) and open `/health` on it.

The free server sleeps after 15 minutes without visitors and takes up to a minute to wake up. The website shows a "Waking up the server" message while that happens. Open the site a few minutes before any demo.

**Website on Vercel**
1. Sign up at https://vercel.com with GitHub → **Add New → Project** → import `job-intel`.
2. **Root Directory:** `frontend` (Vercel detects Next.js by itself).
3. **Environment Variables:** add `NEXT_PUBLIC_API_URL` = your Render URL, with no `/` at the end.
4. Click **Deploy**, then open the URL it gives you.

From now on every `git push` to `main` redeploys both automatically. The API already accepts requests from `localhost:3000` and any `*.vercel.app` address; if you later add a custom domain, add it on Render as an environment variable `CORS_ORIGINS=https://your-domain.com`.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `python` is not recognized (Windows) | Use `py` instead, or reinstall Python with "Add to PATH" ticked |
| `No module named pipeline` | You are in the wrong folder. `cd` back to `job-intel` and run again |
| `No module named pandas` (or similar) | The `.venv` is not active. Run the `activate` line from Part C |
| Website says "API offline" | Is Terminal 1 still running? Does `frontend/.env.local` exist? Restart `npm run dev` after editing it |
| `/api/market/overview` returns 503 | The pipeline hasn't been run yet. Run Part D |
| Vercel site can't reach the API | Check `NEXT_PUBLIC_API_URL` on Vercel has no trailing `/`, then **Redeploy** (the value is baked in at build time) |

## What the pipeline does (for your report)

1. **Clean** (`clean.py`): maps the raw columns into a unified schema; parses the skill lists; converts hourly pay to yearly (× 2,080) and removes the top and bottom 1% of salaries; marks remote jobs; removes duplicates (same title, company, location and day).
2. **Normalize titles** (`titles.py`): extracts the seniority level (Intern / Entry / Mid / Senior / Lead) and maps messy titles to about 17 canonical roles with ordered regex rules. The data report shows how often these rules agree with the dataset's own role labels.
3. **Market statistics** (`market.py`): skill demand is measured as a **share** of postings, never as raw counts, because the number of postings changes from month to month.

Data: [data_jobs](https://huggingface.co/datasets/lukebarousse/data_jobs) by Luke Barousse, Apache-2.0 license, 2023 job postings for data roles.
