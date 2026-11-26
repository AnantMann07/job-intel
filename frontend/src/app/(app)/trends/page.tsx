"use client";

import { useState } from "react";
import { getSkillTrend, getTrending, type TrendDetail } from "@/lib/api";
import { fmtPct } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import { useDataInfo } from "@/components/AppShell";
import { Sparkline, TrendChart, monthName } from "@/components/charts";
import { ErrorBox, Loading, PageHeader, buttonSecondary, inputClass } from "@/components/ui";

const TABS = [
  { id: "emerging", label: "Rising" },
  { id: "stable", label: "Steady" },
  { id: "declining", label: "Falling" },
] as const;

const change = (g?: number | null) => (g == null ? "–" : `${g >= 1 ? "up" : "down"} ${Math.abs(Math.round((g - 1) * 100))}%`);

export default function TrendsPage() {
  const { isSample } = useDataInfo();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("emerging");
  const [query, setQuery] = useState("");
  const [skill, setSkill] = useState<string | null>(null);
  const list = useAsync(`trending:${tab}`, () => getTrending(tab, 15));
  const fallback = useAsync("trending:all", () => getTrending("stable", 1));
  const current = skill ?? list.data?.[0]?.skill ?? fallback.data?.[0]?.skill ?? null;
  const detail = useAsync(current ? `trend:${current}` : null, () => getSkillTrend(current!));

  return (
    <>
      <PageHeader tone="mint" title="Skill trends" subtitle="How often each skill appeared in postings month by month, and where it's likely to go over the next three months." sample={isSample} />
      <form role="search" className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (query.trim()) setSkill(query.trim().toLowerCase()); }}>
        <label className="text-sm text-ink-2">
          Look up a skill
          <input className={`${inputClass} mt-1.5 w-72 max-w-full`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. snowflake" />
        </label>
        <button type="submit" className={buttonSecondary}>Show</button>
      </form>
      {detail.error && <ErrorBox message={detail.error} />}
      {detail.loading && <Loading />}
      {detail.data && <TrendDetailView d={detail.data} />}

      <section>
        <div role="tablist" aria-label="Trend groups" className="inline-flex gap-1 rounded-xl bg-surface-2 p-1">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`min-h-9 rounded-lg px-4 text-[15px] font-medium ${tab === t.id ? "bg-paper text-ink shadow-sm" : "text-ink-2 hover:text-ink"}`}>
              {t.label}
            </button>
          ))}
        </div>
        {list.loading && <Loading />}
        {list.error && <div className="mt-4"><ErrorBox message={list.error} /></div>}
        {list.data && list.data.length === 0 && <p className="mt-4 text-ink-2">No skills in this group.</p>}
        {list.data && list.data.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-2xl bg-paper p-4 ring-1 ring-line sm:p-6">
            <table className="w-full min-w-[560px] border-collapse text-[15px]">
              <thead>
                <tr className="border-b border-line text-left text-sm text-ink-2">
                  <th className="py-2.5 pr-3 font-normal">Skill</th>
                  <th className="px-3 py-2.5 font-normal">Over the year</th>
                  <th className="px-3 py-2.5 text-right font-normal">Share now</th>
                  <th className="px-3 py-2.5 text-right font-normal">Change</th>
                  <th className="py-2.5 pl-3 text-right font-normal">In 3 months</th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((s) => (
                  <tr key={s.skill} className={`border-b border-line-soft ${s.skill === current ? "bg-paper" : ""}`}>
                    <td className="py-2 pr-3">
                      <button type="button" onClick={() => setSkill(s.skill)} className={`text-left hover:text-brand ${s.skill === current ? "font-medium" : ""}`}>{s.skill}</button>
                    </td>
                    <td className="px-3 py-2"><Sparkline values={s.history} rising={s.label === "emerging"} /></td>
                    <td className="px-3 py-2 text-right">{fmtPct(s.share_now, 1)}</td>
                    <td className={`px-3 py-2 text-right ${s.label === "emerging" ? "text-mint-ink" : s.label === "declining" ? "text-rose-ink" : "text-ink-2"}`}>{change(s.growth)}</td>
                    <td className="py-2 pl-3 text-right">{fmtPct(s.forecast[s.forecast.length - 1], 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function TrendDetailView({ d }: { d: TrendDetail }) {
  const s = d.skill;
  const word = s.label === "emerging" ? "rising" : s.label === "declining" ? "falling" : "steady";
  const lastFuture = d.future[d.future.length - 1];
  return (
    <section className="rounded-2xl bg-paper p-6 ring-1 ring-line sm:p-8">
      <h2 className="text-[20px] font-semibold">{s.skill} is <span className={s.label === "emerging" ? "mark-have" : s.label === "declining" ? "mark-learn" : ""}>{word}</span></h2>
      <p className="mt-1 max-w-[70ch] text-ink-2">
        Mentioned in {fmtPct(s.share_now, 1)} of postings now, {change(s.growth)} over the year. By {monthName(lastFuture, true)} we expect about{" "}
        {fmtPct(s.forecast[s.forecast.length - 1], 1)} (likely between {fmtPct(s.lower[s.lower.length - 1], 1)} and {fmtPct(s.upper[s.upper.length - 1], 1)}).
      </p>
      <div className="mt-5">
        <TrendChart months={d.months} future={d.future} history={s.history} forecast={s.forecast} lower={s.lower} upper={s.upper} label={s.skill} />
      </div>
      <details className="mt-4 text-sm text-ink-2">
        <summary className="cursor-pointer font-medium text-ink">How this is worked out</summary>
        <p className="mt-2 max-w-[75ch] leading-relaxed">
          A skill counts as rising when its month-by-month share goes up consistently (Mann-Kendall test, p &lt; 0.05; here p = {s.p_value.toFixed(3)})
          and it grew at least 1.2 times over the year; falling is the mirror case (0.85 times or less). The slope is a Theil-Sen estimate. The forecast uses
          Holt&apos;s linear smoothing, and the shaded range covers 80% of likely outcomes.
        </p>
      </details>
    </section>
  );
}
