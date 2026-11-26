# Website design

## Idea

Calm and professional, like a premium SaaS product. White/off-white surfaces, deep navy text, soft violet for actions, muted sage only for good news. Whitespace separates content; cards only for real objects; secondary details sit in expandable sections or profile pages.

## Tokens (`frontend/src/app/globals.css`, CSS variables, light and dark)

| Token | Light | Dark |
| --- | --- | --- |
| background / surface | `#FBFBFC` / `#FFFFFF` | `#17161F` / `#1F1D2A` |
| text (navy) | `#29263D` | `#F0EFF6` |
| accent (violet) | `#7566CF` | `#9184E3` |
| sage (positive only) | `#E5F1EB` on `#2F6A4E` | `#1F3A2E` on `#B9E0CB` |
| lines | `#E6E5EC` | `#34314A` |

- Font: Plus Jakarta Sans (bundled), weights 400/500/600 only. Page title 28 to 32px, section 20px, body 15 to 16px.
- One radius family: 12px controls, 16px cards. Subtle border + soft shadow on cards. No gradients, no decorative shapes.
- Theme: Settings → Light / Dark / System; saved in the browser and in the account profile; applied before first paint.

## Layout

- Sticky top bar: logo, Discover, Jobs, Resume check, Roadmap, Applications, Market (Skill trends is inside Market), settings icon, Log in / account.
- 1120px content width, left-aligned, 40px between sections.

## Pages

- **Discover `/discover`**: one question group per screen with a progress bar (activities, work with, environment, structure, then skills/strengths/education). Results as simple lists in four groups (Strong matches, Hidden opportunities, Emerging careers, Alternative paths), each with match %, one reason, skills to learn, save and Explore. Surprise me shows one career outside the usual interests.
- **Career profile `/careers/[id]`**: what the work involves, skills you have / to learn / transferable, learning route, projects, related careers; side panel with skill fit, Add to my roadmap, Save, education and opportunities.
- **Settings `/settings`**: theme, account, clear data. **Reset password `/reset-password`**.

- **Home `/`**: a lavender block with "Find jobs that fit what you already know.", the skills box and an upload link, and three tilted example job cards. Below, three blocks: peach "Know the job you want?" (job picker), sky "Not sure where to start?" (opens the chat), mint "See what's in demand".
- **Jobs for you `/suggestions`**: "You can apply now" (match at least 50%) and "A few skills away". Two columns of pastel job cards: name, match % with five dots, up to 3 skills you have, Apply and Details. Details opens pay, demand, skills to learn next, real 2023 postings and links to the route and the skill-by-skill check.
- **Resume check `/resume`**: left, your skills (remove, add, upload); right, one job: match %, bar, a sentence, a table (skill, share of postings, have/missing, trend), "Learn these first".
- **Roadmap `/roadmap`**: progress box ("You started at 34%. Now you're at 45%"), then a grid of coloured step cards. Each skill has a tick box; ticking adds it to your skills and updates the % live (the steps stay put). Practice project per step, Apply at the end, "Download PDF" (browser print, the menu and buttons are hidden in print).
- **Applications `/applications`**: every job opened from Apply, with status (Saved, Applied, Interview, Offer, Not selected) and a note.
- **Market `/insights`** and **Skill trends `/trends`**: plain charts. One colour, thin marks, light axes, a hover readout line above each chart, tables next to them. The method is explained under "How this is worked out".
- **Log in `/login`** and **Account `/account`**: only shown when accounts are switched on.

## Apply

The 2023 postings are closed, so Apply opens today's listings for the same job on LinkedIn, Indeed, Naukri (jobs) and Internshala, for a job or an internship, in the person's city. Opening a listing saves the job to Applications.
