// Everything the website needs to talk to the FastAPI backend.
// The types below mirror backend/app/schemas.py — keep them in sync.

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export type Health = {
  status: string;
  artifacts: string[];
  data_generated_at?: string | null;
  is_sample?: boolean | null;
};

export type SkillStat = { skill: string; category?: string | null; postings?: number | null; share?: number | null };
export type RoleStat = {
  role: string;
  postings: number;
  share?: number | null;
  median_salary_usd?: number | null;
  top_skills: SkillStat[];
};

export type MarketOverview = {
  generated_at: string;
  is_sample: boolean;
  source_note: string;
  kpis: {
    postings: number;
    postings_with_skills: number;
    companies: number;
    roles: number;
    distinct_skills: number;
    date_min: string;
    date_max: string;
    median_salary_usd?: number | null;
    pct_with_salary?: number | null;
    pct_remote?: number | null;
  };
  postings_by_month: { month: string; postings: number }[];
  top_skills: SkillStat[];
  top_roles: RoleStat[];
  top_countries: { country?: string | null; postings: number }[];
  levels: { level: string; postings: number }[];
};

// Free servers sleep when idle and take up to a minute to wake, so allow 90 s.
async function fetchJson<T>(path: string, timeoutMs = 90_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}${path}`, { signal: controller.signal });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail ?? `HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export const getHealth = () => fetchJson<Health>("/health");
export const getOverview = () => fetchJson<MarketOverview>("/api/market/overview");
