# Website design

JobIntel is a job suggestion platform. Every page below must be built to this spec. The owner has a visual mock-up of all of them (a Claude design canvas); if anything here is unclear, ask the owner for a screenshot of that page.

## Look: "cute but technical"

Friendly and soft (rounded corners, pastel icon tiles, a little sparkle), with a technical touch (monospace code-style labels, a terminal preview, a dotted graph-paper background). Keep it elegant: lots of white space, one accent colour.

- Fonts (Google Fonts through `next/font/google`, or the system stack if fonts can't download):
  - **Inter** for normal text.
  - **Space Grotesk** (600) for page titles and big numbers.
  - **JetBrains Mono** only for small code-style bits: skill pills, match % pills, the "sample data" pill, and the terminal card and footer on Home.
- Icons: **lucide-react**, 1.8 px stroke, 16–18 px inline and 20–22 px inside tiles. Every menu item, page title, card heading and main button has one:
  - Home `Home`
  - Job Suggestions `Sparkles`
  - Resume Analysis `FileText`
  - My Roadmap `Map`
  - Career Paths `Route`
  - What-If `SlidersHorizontal`
  - Market Dashboard `BarChart3`
  - Skill Trends `TrendingUp`
  - Uploads `Upload`
  - Dream job `Target`
  - Job cards `Briefcase`
  - "You have" `Check`
  - "To learn" `BookOpen`
  - Practice projects `Code2`
  - Openings `MapPin`
  - Info `Info`
  - Best next skill `Zap`
  - Sample data `FlaskConical`
  - Data source `Database`
- Icon tiles: a 40–44 px rounded square (12 px corners), indigo tint background `#EEF0FF` with the indigo icon. Use the amber tint (`#FEF0C7` / `#B54708`) for "rising" and "dream job" items.
- Colours:
  - Page background `#F7F7FB`; cards `#FFFFFF` with a 1 px `#E7E8F1` border.
  - Text `#101828`; secondary text `#475467`; muted labels `#667085`.
  - Accent indigo `#4F46E5` (hover and text-on-tint `#3730A3`, light tint `#EEF0FF`): buttons, bars, "matched" skills, the active menu item.
  - Amber for rising / emerging skills: background `#FEF0C7`, text `#93370D`; sparkle icons `#F59E0B`.
  - Orange for missing skills: background `#FDEAD7`, text `#9C2A10`.
  - Grey for "partial" or neutral: background `#F2F4F7`, text `#344054`.
- Logo: a 30 px indigo rounded square (9 px corners) with a white rising line and a small yellow (`#FDE68A`) sparkle in the top-right corner, next to "JobIntel" in Space Grotesk.
- Corners: 16 px cards (20 px for the two big Home cards), 10–12 px inputs and buttons, fully round pills. Buttons and clickable items are at least 44 px tall.
- A small amber mono pill "sample data" with a flask icon next to the page title whenever the numbers are not real.
- Keep it uncluttered:
  - Lots of space: 40–48 px page padding, 32 px between sections, 24–28 px inside cards, 64 px between Home sections.
  - At most one primary button per card; secondary actions are plain text links.
  - No `//` code-comment labels anywhere.
- No gradient washes, no emoji, no drop shadows (the dotted hero background is a fine dot pattern, not a gradient). Every page works at phone width (the menu stacks above the content).

## Layout and menu

- **Home** has a top bar: logo "JobIntel", links (Job Suggestions, Resume Analysis, My Roadmap, Market Insights) and a "Get started" button.
- **All other pages** have a white left sidebar with the logo and this menu, each item with its icon, the current page highlighted in the indigo tint:
  - Home
  - (thin divider) Job Suggestions · Resume Analysis · My Roadmap
  - (thin divider) Career Paths · What-If Simulator
  - (thin divider) Market Dashboard · Skill Trends
  - No group titles and nothing else in the sidebar; the data source goes on the About page.
- The user's skills (from a resume or typed) are kept in React context + `localStorage`, so every page uses the same profile.

## Pages

### Home `/`
- Hero band with a dotted graph-paper background (1.2 px dots, `#D6D8EA`, every 22 px), two columns:
  - Left:
    - A small white pill: "AI career guide · built on 786k real job postings", with an amber sparkle.
    - The headline: "Find the job that fits your skills, and a clear roadmap to the one you want."
    - A one-paragraph explanation.
  - Right, a product preview:
    - A dark indigo terminal card (`#1E1B4B`, mono text `#E0E7FF`, three small window dots) showing `$ jobintel analyze resume.pdf`, `✓ parsed 2 pages`, `✓ found 7 skills`, `skills = ["sql", "python", "excel", …]` and `→ best match: Data Analyst 81%`.
    - Overlapping its bottom-right corner, a white job card: Data Analyst, an "81% match" pill, a progress bar and skill pills (`sql ✓`, `excel ✓`, `tableau ✓`, and `power bi +` in orange).
- Two big cards side by side:
  1. **"I have skills" → Suggest jobs for me**: resume upload box (PDF/DOCX, 5 MB, "read once, never stored"), "or type your skills" input, button "Get job suggestions" with a sparkle icon (to `/suggestions`). This card has a 2 px indigo border, an Upload icon tile and the label "I have skills".
  2. **"I know the job I want" → Build my roadmap**: "Dream job" dropdown (the starting point comes from the resume if there is one), three bullets (readiness score, staged skills with practice projects, easiest career route), button "Build my roadmap" with a map icon (to `/roadmap`). It has an amber Target icon tile and the label "I know the job I want"; the three bullets use Target, Code2 and Route icons instead of ✓.
- "How it works": 3 cards (Tell us your skills → See where you stand → Follow your roadmap), each with an icon tile on the left and a light mono number `01` / `02` / `03` on the right.
- "Also in JobIntel": link cards with icon tiles to Career Paths, What-If Simulator, Market Dashboard, Skill Trends (the border turns indigo on hover).
- Footer in small mono: "built with python · scikit-learn · fastapi · next.js".

### Job Suggestions `/suggestions` (API: `/api/suggest`)
- Title "Jobs that fit you", subtitle: "7 skills from my_resume.pdf, ranked by how well they match each job and how much it is in demand".
- A card with the person's skills as indigo mono pills, an "Edit skills" link to `/resume`, and Location and Experience filters.
- Two groups of job cards: **Ready to apply** (match ≥ 75%) and **Within reach** (one to three skills away). Each card shows a Briefcase icon tile, the job name, a line with median salary · number of postings · demand trend, a match pill (solid indigo when ≥ 75%, light indigo otherwise), "You have: …", "To learn: …" (mark the biggest gain), one primary button "Roadmap to this job" and a text link "See skill details".
- Right column: **Example openings** for the selected job (title, type of company · city · source site, "Uses X of your Y skills"), three of them, with a note that they come from the dataset and are not live. (The ranking formula goes in the About page, not here.)

### Resume Analysis `/resume` (API: `/api/resume/parse`, `/api/gap`)
- Left card "Your profile": upload box, file name + detected current job, skills found as removable pills ("remove any that are wrong"), an "Add a skill" input.
- Right card: a ring chart with the match %, a "Target job" dropdown, one sentence explaining the %, and a table: skill · "asked for in" bar with % · You (Matched / Partial / Missing pill) · Trend. Then "Learn these first": 3 skills with the match after each.
- Show the 6 most important skills in the table, not more.
- Bottom: one primary button "See jobs that fit these skills" (to `/suggestions`). No duplicate job cards here.

### My Roadmap `/roadmap` (API: `/api/roadmap`, `/api/career/path`)
- Title "Your roadmap to {job}", subtitle with the starting point.
- Readiness card: ring chart "% ready", a sentence like "You have 2 of the 8 skills {job} postings ask for most", and a "Target job" dropdown.
- **Your plan**: a vertical timeline. A first stage "What you already have" (filled indigo circle with ✓), then numbered stages (outlined circles) joined by a grey line. Each stage has a title, "Match after: X%" on the right, short mono skill pills ("aws · 41%", amber with "· rising" for emerging skills) and a "Practice project: …" line. A last stage "Apply" says the job now appears in suggestions.
- Right column: **Career route** (current job → steps → target, the target highlighted, link "Compare other routes →"), and a **Not sure about a skill?** card with a button to the What-If Simulator. Under the "Your plan" heading, one grey line explains the order and what the % means.

### Career Paths `/career` (API: `/api/career/graph`, `/api/career/path`)
- From / To dropdowns and a "Find path" button.
- "Easiest route" card: steps left to right (You are here → Step 1 → Goal, the goal card with an indigo border), with "Learn …" between steps; a summary line (moves · new skills · median pay change).
- "Other routes" list and "Where you can go from here" (pills grouped by 1 move / 2 moves). An interactive graph view (Cytoscape.js) is a bonus.

### What-If Simulator `/simulator` (API: `/api/whatif`)
- Left: Target job dropdown, current skills listed, "Skills to try" as toggle pills (indigo when on, mono text, `aria-pressed`), a Reset button.
- Right: a sentence ("Adding aws and spark raises your match from 54% to 75%."), two bars (Now in grey, With new in indigo), "Your top 5 jobs after this" with an indigo "New" pill on jobs that entered the top 5, and "Best next skill" chips with the points each adds. Everything updates instantly when a pill is toggled.

### Market Dashboard `/insights` (API: `/api/market/overview`)
- Filters (Country, Experience level, Job), 4 KPI cards (postings, companies, distinct skills, median salary with "% of postings that list pay"), a postings-per-month bar chart, a "Most requested skills" bar list, "Fastest-rising skills" with amber Emerging pills, and a jobs table (job, postings, median salary, top skills).

### Skill Trends `/trends` (API: `/api/skills/{skill}/trend`, `/api/skills/trending`)
- Skill search. A chart card: history line in indigo, a dashed amber forecast line with a light amber 80% band, a "Forecast" divider; the label pill; 4 evidence tiles (share now, growth, Mann-Kendall p-value, forecast with range) and one sentence explaining the label.
- Tabs Emerging / Stable / Declining with a table: skill · share now · change · 3-month forecast.
