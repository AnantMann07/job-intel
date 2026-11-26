"use client";

import { useState } from "react";
import { Search, TrendingUp } from "lucide-react";
import { getSkillTrend, getTrending, type TrendDetail } from "@/lib/api";
import { fmtPct } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import { useDataInfo } from "@/components/AppShell";
import { Card, ErrorBox, Loading, PageHeader, SkillPill, buttonPrimary, inputClass } from "@/components/ui";

const TABS = [
  { id: "emerging", label: "Emerging" },
  { id: "stable", label: "Stable" },
  { id: "declining", label: "Declining" },
] as const;

export default function TrendsPage() {
  const { isSample } = useDataInfo();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("emerging");
  const [query, setQuery] = useState("");
  const [skill, setSkill] = useState<string | null>(null);
  const list = useAsync(`trending:${tab}`, () => getTrending(tab, 15));
  const allStable = useAsync("trending:all", () => getTrending("stable", 1));
  const current = skill ?? list.data?.[0]?.skill ?? allStable.data?.[0]?.skill ?? null;
  const detail = useAsync(current ? `trend:${current}` : null, () => getSkillTrend(current!));

  return (
    <>
      <PageHeader icon={TrendingUp} title="Skill Trends" subtitle="How demand for a skill has moved, and where it is likely to go next" sample={isSample} />
      <form role="search" className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); if (query.trim()) setSkill(query.trim().toLowerCase()); }}>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-2">
          Skill
          <input className={`${inputClass} w-72 max-w-full font-mono text-sm`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. snowflake" />
        </label>
        <button type="submit" className={buttonPrimary}><Search size={16} aria-hidden="true" /> Show trend</button>
      </form>
      {detail.error && <ErrorBox message={detail.error} />}
      {detail.loading && <Loading />}
      {detail.data && <TrendCard d={detail.data} />}
      <Card>
        <div role="tablist" aria-label="Trend groups" className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`min-h-11 rounded-xl border px-4 text-sm font-semibold ${tab === t.id ? "border-brand bg-tint text-brand-dark" : "border-[#d0d5dd] bg-white text-[#344054]"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {list.loading && <Loading />}
        {list.error && <div className="mt-4"><ErrorBox message={list.error} /></div>}
        {list.data && list.data.length === 0 && <p className="mt-4 text-sm text-ink-2">No skills in this group.</p>}
        {list.data && list.data.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-2">
                  <th className="py-2 pr-3 font-medium">Skill</th>
                  <th className="px-3 py-2 text-right font-medium">Share now</th>
                  <th className="px-3 py-2 text-right font-medium">Change over the year</th>
                  <th className="py-2 pl-3 text-right font-medium">Forecast in 3 months</th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((s) => (
                  <tr key={s.skill} className={`border-t border-[#f2f4f7] ${s.skill === current ? "bg-ground" : ""}`}>
                    <td className="py-2.5 pr-3"><button type="button" onClick={() => setSkill(s.skill)} className="font-mono text-[13px] font-medium text-brand hover:text-brand-dark">{s.skill}</button></td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmtPct(s.share_now, 1)}</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums ${s.label === "emerging" ? "font-semibold text-amber-ink" : ""}`}>{s.growth == null ? "–" : `${s.growth >= 1 ? "+" : ""}${Math.round((s.growth - 1) * 100)}%`}</td>
                    <td className="py-2.5 pl-3 text-right tabular-nums">{fmtPct(s.forecast[s.forecast.length - 1], 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function TrendCard({ d }: { d: TrendDetail }) {
  const s = d.skill;
  const values = [...s.history, ...s.upper];
  const top = Math.max(...values, 0.01) * 1.1;
  const n = s.history.length + s.forecast.length;
  const W = 760, H = 240, L = 48, R = 16, T = 16, B = 32;
  const X = (i: number) => L + (i / (n - 1)) * (W - L - R);
  const Y = (v: number) => T + (1 - v / top) * (H - T - B);
  const last = s.history.length - 1;
  const hist = s.history.map((v, i) => `${X(i)},${Y(v)}`).join(" ");
  const fore = [[last, s.history[last]], ...s.forecast.map((v, i) => [last + 1 + i, v])].map(([i, v]) => `${X(i)},${Y(v)}`).join(" ");
  const band = [
    [last, s.history[last]], ...s.upper.map((v, i) => [last + 1 + i, v]),
    ...s.lower.map((v, i) => [last + 1 + i, v]).reverse(), [last, s.history[last]],
  ].map(([i, v]) => `${X(i)},${Y(v)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * top);
  const labels = [...d.months, ...d.future];
  const tone = s.label === "emerging" ? "amber" : "grey";

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-mono text-xl font-medium">{s.skill}</h2>
        <SkillPill tone={tone}>{s.label}</SkillPill>
        <span className="text-[13px] text-ink-2">Share of postings that mention it, by month</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${s.skill}: ${fmtPct(s.history[0], 1)} to ${fmtPct(s.history[last], 1)}, forecast ${fmtPct(s.forecast[s.forecast.length - 1], 1)}`} className="mt-4 block h-auto w-full">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={Y(t)} y2={Y(t)} stroke="#eef0f5" />
            <text x={L - 8} y={Y(t) + 4} fontSize="11" fill="#667085" textAnchor="end">{(t * 100).toFixed(1)}%</text>
          </g>
        ))}
        <polygon points={band} fill="#fdb022" fillOpacity="0.22" />
        <line x1={X(last)} x2={X(last)} y1={T} y2={H - B} stroke="#98a2b3" strokeDasharray="3 4" />
        <text x={X(last) + 6} y={T + 10} fontSize="11" fill="#475467">Forecast</text>
        <polyline points={hist} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinejoin="round" />
        <polyline points={fore} fill="none" stroke="#b54708" strokeWidth="2.5" strokeDasharray="6 5" />
        {labels.map((m, i) => (i % 3 === 0 || i === n - 1) && (
          <text key={m} x={X(i)} y={H - 10} fontSize="11" fill="#667085" textAnchor={i === n - 1 ? "end" : i === 0 ? "start" : "middle"}>{m}</text>
        ))}
      </svg>
      <div className="mt-5 flex flex-wrap gap-3">
        {[
          { label: "Share now", value: fmtPct(s.share_now, 1) },
          { label: "Growth over the year", value: s.growth == null ? "–" : `${s.growth.toFixed(2)}×` },
          { label: "Mann-Kendall p-value", value: s.p_value.toFixed(3) },
          { label: `Forecast, ${d.future[d.future.length - 1]}`, value: `${fmtPct(s.forecast[s.forecast.length - 1], 1)} (${fmtPct(s.lower[s.lower.length - 1], 1)}–${fmtPct(s.upper[s.upper.length - 1], 1)})` },
        ].map((e) => (
          <div key={e.label} className="flex-[1_1_180px] rounded-xl bg-ground px-3.5 py-3">
            <div className="text-xs text-ink-2">{e.label}</div>
            <div className="mt-1 font-mono text-base font-medium">{e.value}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-ink-2">
        Labelled <strong className="text-ink">{s.label}</strong>: a skill is emerging when its upward trend is significant (Mann-Kendall p &lt; 0.05) and its
        demand grew at least 1.2× over the year; declining is the mirror case (≤ 0.85×). The forecast uses Holt&apos;s linear smoothing with an 80% range.
      </p>
    </Card>
  );
}
