"use client";

// Starter Market Dashboard. It checks the API is awake, then shows the
// market overview the pipeline produced. We'll grow this into the full
// dashboard (charts, filters) in a later step.

import { useEffect, useState } from "react";
import { API_URL, getHealth, getOverview, type MarketOverview } from "@/lib/api";

type Status = "checking" | "waking" | "online" | "offline";

const num = new Intl.NumberFormat("en-US");
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const pct = (x?: number | null) => (x == null ? "–" : `${(x * 100).toFixed(1)}%`);

export default function Home() {
  const [status, setStatus] = useState<Status>("checking");
  const [data, setData] = useState<MarketOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // If the API hasn't answered in 3 s it is probably waking up from sleep.
    const slow = setTimeout(() => !cancelled && setStatus((s) => (s === "checking" ? "waking" : s)), 3000);
    (async () => {
      try {
        await getHealth();
        if (cancelled) return;
        setStatus("online");
        const overview = await getOverview();
        if (!cancelled) setData(overview);
      } catch (e) {
        if (!cancelled) {
          setStatus("offline");
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        clearTimeout(slow);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(slow);
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">AI Job Market Intelligence</h1>
          <p className="mt-1 text-sm text-neutral-500">Skills in demand, skill gaps and career paths from real job postings</p>
        </div>
        <StatusPill status={status} />
      </header>

      {status === "waking" && (
        <Notice tone="info">Waking up the server. Free hosting sleeps when idle, so this can take up to a minute.</Notice>
      )}
      {status === "offline" && (
        <Notice tone="error">
          Could not load data from <code>{API_URL}</code>: {error}. Is the backend running? Locally, start it with{" "}
          <code>uvicorn app.main:app --reload</code> inside the <code>backend</code> folder.
        </Notice>
      )}
      {data?.is_sample && (
        <Notice tone="warn">
          Showing FAKE sample data. Run <code>python -m pipeline.download</code> and{" "}
          <code>python -m pipeline.run_all</code> to load the real dataset.
        </Notice>
      )}

      {data && (
        <>
          <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="Job postings" value={num.format(data.kpis.postings)} />
            <Kpi label="Companies" value={num.format(data.kpis.companies)} />
            <Kpi label="Distinct skills" value={num.format(data.kpis.distinct_skills)} />
            <Kpi
              label="Median salary"
              value={data.kpis.median_salary_usd ? usd.format(data.kpis.median_salary_usd) : "–"}
              note={`${pct(data.kpis.pct_with_salary)} of postings list one`}
            />
          </section>

          <section className="mb-10">
            <h2 className="mb-1 text-lg font-semibold">Most requested skills</h2>
            <p className="mb-4 text-sm text-neutral-500">Share of postings that list skills and mention each one</p>
            <ul className="space-y-2">
              {data.top_skills.slice(0, 15).map((s) => (
                <li key={s.skill} className="grid grid-cols-[8rem_1fr_3.5rem] items-center gap-3 text-sm">
                  <span className="truncate">{s.skill}</span>
                  <span className="h-3 rounded bg-neutral-100 dark:bg-neutral-800">
                    <span className="block h-3 rounded bg-blue-600" style={{ width: `${(s.share ?? 0) * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums text-neutral-500">{pct(s.share)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="mb-4 text-lg font-semibold">Roles</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-neutral-200 text-neutral-500 dark:border-neutral-800">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Role</th>
                    <th className="py-2 pr-4 text-right font-medium">Postings</th>
                    <th className="py-2 pr-4 text-right font-medium">Median salary</th>
                    <th className="py-2 font-medium">Top skills</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_roles.map((r) => (
                    <tr key={r.role} className="border-b border-neutral-100 dark:border-neutral-900">
                      <td className="py-2 pr-4">{r.role}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{num.format(r.postings)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {r.median_salary_usd ? usd.format(r.median_salary_usd) : "–"}
                      </td>
                      <td className="py-2 text-neutral-500">
                        {r.top_skills.slice(0, 4).map((s) => s.skill).join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="text-xs text-neutral-500">
            Data: {data.source_note} · {data.kpis.date_min} to {data.kpis.date_max} · API docs:{" "}
            <a className="underline" href={`${API_URL}/docs`} target="_blank" rel="noreferrer">
              {API_URL}/docs
            </a>
          </footer>
        </>
      )}
    </main>
  );
}

function StatusPill({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    checking: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
    waking: "bg-amber-100 text-amber-800",
    online: "bg-green-100 text-green-800",
    offline: "bg-red-100 text-red-800",
  };
  const label: Record<Status, string> = {
    checking: "Connecting…",
    waking: "Waking server…",
    online: "API online",
    offline: "API offline",
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}>{label[status]}</span>;
}

function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {note && <div className="mt-1 text-xs text-neutral-500">{note}</div>}
    </div>
  );
}

function Notice({ tone, children }: { tone: "info" | "warn" | "error"; children: React.ReactNode }) {
  const styles = {
    info: "border-blue-200 bg-blue-50 text-blue-900",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-red-200 bg-red-50 text-red-900",
  };
  return <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${styles[tone]}`}>{children}</div>;
}
