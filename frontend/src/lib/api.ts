// Everything the website needs to talk to the FastAPI backend.
// The types below mirror backend/app/schemas.py: keep them in sync.

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export type Health = { status: string; artifacts: string[]; data_generated_at?: string | null; is_sample?: boolean | null };

export type SkillStat = { skill: string; category?: string | null; postings?: number | null; share?: number | null };
export type RoleStat = { role: string; postings: number; share?: number | null; median_salary_usd?: number | null; top_skills: SkillStat[] };

export type MarketOverview = {
  generated_at: string;
  is_sample: boolean;
  source_note: string;
  kpis: {
    postings: number; postings_with_skills: number; companies: number; roles: number; distinct_skills: number;
    date_min: string; date_max: string; median_salary_usd?: number | null; pct_with_salary?: number | null; pct_remote?: number | null;
  };
  postings_by_month: { month: string; postings: number }[];
  top_skills: SkillStat[];
  top_roles: RoleStat[];
  top_countries: { country?: string | null; postings: number }[];
  levels: { level: string; postings: number }[];
};

export type RoleSummary = { role: string; postings: number; median_salary_usd?: number | null; demand: string; top_skills: string[] };
export type ResumeOut = { filename: string; characters: number; skills: string[]; current_role?: string | null };
export type Opening = { title: string; company?: string | null; location?: string | null; date: string; skills: string[]; uses: number; of: number };
export type SuggestedJob = {
  role: string; score: number; match: number; ready: boolean; postings: number; median_salary_usd?: number | null;
  demand: string; have: string[]; to_learn: string[]; biggest_gain?: string | null; openings: Opening[];
};
export type SuggestOut = { skills_used: string[]; ready: SuggestedJob[]; within_reach: SuggestedJob[] };
export type GapRow = { skill: string; share: number; category?: string | null; status: "matched" | "missing"; trend: string };
export type GapOut = { role: string; match: number; matched_count: number; total: number; skills: GapRow[]; learn_first: { skill: string; match_after: number }[] };
export type Stage = { number: number; title: string; skills: { skill: string; share: number; rising: boolean }[]; match_after: number; project: string };
export type RoadmapOut = {
  role: string; ready: number; have: { skill: string; share?: number | null }[]; top_count: number;
  stages: Stage[]; final_match: number; also_consider: { role: string; match: number }[];
};
export type TrendSkill = {
  skill: string; category?: string | null; label: "emerging" | "stable" | "declining"; share_now: number; growth?: number | null;
  slope_per_month: number; p_value: number; history: number[]; forecast: number[]; lower: number[]; upper: number[];
};
export type TrendDetail = { months: string[]; future: string[]; skill: TrendSkill };

// Free servers sleep when idle and take up to a minute to wake, so allow 90 s.
async function request<T>(path: string, init?: RequestInit, timeoutMs = 90_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}${path}`, { ...init, signal: controller.signal });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(typeof body.detail === "string" ? body.detail : `Request failed (HTTP ${res.status})`);
    }
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw new Error("The server took too long to answer. Please try again.");
    if (e instanceof TypeError) throw new Error(`Can't reach the API at ${API_URL}. Is the backend running?`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

const post = <T,>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const getHealth = () => request<Health>("/health");
export const getOverview = () => request<MarketOverview>("/api/market/overview");
export const getRoles = () => request<RoleSummary[]>("/api/roles");
export const getSkills = () => request<SkillStat[]>("/api/skills");
export const suggest = (skills: string[]) => post<SuggestOut>("/api/suggest", { skills });
export const getGap = (skills: string[], role: string) => post<GapOut>("/api/gap", { skills, role });
export const getRoadmap = (skills: string[], role: string) => post<RoadmapOut>("/api/roadmap", { skills, role });
export const getTrending = (label: string, limit = 15) => request<TrendSkill[]>(`/api/skills/trending?label=${label}&limit=${limit}`);
export const getSkillTrend = (skill: string) => request<TrendDetail>(`/api/skills/${encodeURIComponent(skill)}/trend`);

export function uploadResume(file: File) {
  const form = new FormData();
  form.append("file", file);
  return request<ResumeOut>("/api/resume/parse", { method: "POST", body: form });
}
