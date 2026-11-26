"use client";

import Link from "next/link";
import { BarChart3, Briefcase, Sparkles, TrendingUp } from "lucide-react";
import { getOverview, getTrending } from "@/lib/api";
import { fmtCompact, fmtNum, fmtPct, fmtUsd } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import { Bar, Card, CardTitle, ErrorBox, Loading, PageHeader, SkillPill } from "@/components/ui";

export default function InsightsPage() {
  const ov = useAsync("overview", getOverview);
  const rising = useAsync("rising", () => getTrending("emerging", 6));
  const d = ov.data;
  const maxMonth = d ? Math.max(...d.postings_by_month.map((m) => m.postings)) : 1;

  return (
    <>
      <PageHeader
        icon={BarChart3}
        title="Market Dashboard"
        subtitle={d ? `What employers asked for in data jobs, ${d.kpis.date_min.slice(0, 7)} to ${d.kpis.date_max.slice(0, 7)}` : undefined}
        sample={d?.is_sample}
      />
      {ov.error && <ErrorBox message={ov.error} />}
      {ov.loading && <Loading />}
      {d && (
        <>
          <section aria-label="Key numbers" className="flex flex-wrap gap-4">
            {[
              { label: "Job postings", value: fmtCompact(d.kpis.postings), note: "after removing duplicates" },
              { label: "Companies", value: fmtCompact(d.kpis.companies), note: "hiring for these jobs" },
              { label: "Distinct skills", value: fmtNum(d.kpis.distinct_skills), note: "mentioned in postings" },
              { label: "Median salary", value: fmtUsd(d.kpis.median_salary_usd), note: `${fmtPct(d.kpis.pct_with_salary)} of postings list pay` },
            ].map((k) => (
              <div key={k.label} className="flex-[1_1_200px] rounded-2xl border border-line bg-white px-5 py-[18px]">
                <div className="text-[13px] text-ink-2">{k.label}</div>
                <div className="mt-1.5 font-display text-[28px] font-semibold">{k.value}</div>
                <div className="mt-1 text-xs text-muted">{k.note}</div>
              </div>
            ))}
          </section>
          <div className="flex flex-wrap gap-6">
            <Card className="min-w-0 flex-[1_1_420px]">
              <CardTitle icon={BarChart3}>Postings per month</CardTitle>
              <div role="img" aria-label="Bar chart of postings per month" className="mt-6 flex h-48 items-end gap-2 border-b border-[#d0d5dd]">
                {d.postings_by_month.map((m) => (
                  <div key={m.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-[10px] text-ink-2">{fmtCompact(m.postings)}</span>
                    <div className="w-full max-w-8 rounded-t bg-brand" style={{ height: `${(m.postings / maxMonth) * 150}px` }} />
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex gap-2">
                {d.postings_by_month.map((m) => <span key={m.month} className="flex-1 text-center text-[10px] text-muted">{m.month.slice(5)}</span>)}
              </div>
            </Card>
            <Card className="min-w-0 flex-[1_1_420px]">
              <CardTitle icon={Sparkles}>Most requested skills</CardTitle>
              <p className="mb-4 mt-1 text-[13px] text-ink-2">Share of postings that mention each skill</p>
              <ul className="flex flex-col gap-2.5">
                {d.top_skills.slice(0, 10).map((s) => (
                  <li key={s.skill} className="grid grid-cols-[96px_minmax(0,1fr)_44px] items-center gap-3 text-sm">
                    <span className="truncate font-mono text-[13px]">{s.skill}</span>
                    <Bar value={s.share ?? 0} max={d.top_skills[0].share ?? 1} className="h-2.5" />
                    <span className="text-right tabular-nums text-ink-2">{fmtPct(s.share)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
          <div className="flex flex-wrap gap-6">
            <Card className="min-w-0 flex-[1_1_300px]">
              <CardTitle icon={TrendingUp} tone="amber">Fastest-rising skills</CardTitle>
              <p className="mb-3 mt-1 text-[13px] text-ink-2">Growth in demand share over the year</p>
              {rising.data?.length === 0 && <p className="text-sm text-ink-2">No skill passed the &quot;emerging&quot; test this year.</p>}
              <ul>
                {rising.data?.map((s) => (
                  <li key={s.skill} className="flex items-center justify-between border-t border-[#f2f4f7] py-2.5 text-sm">
                    <span className="font-mono text-[13px]">{s.skill}</span>
                    <span className="flex items-center gap-2"><span className="font-semibold text-amber-ink">+{Math.round(((s.growth ?? 1) - 1) * 100)}%</span><SkillPill tone="amber">emerging</SkillPill></span>
                  </li>
                ))}
              </ul>
              <Link href="/trends" className="mt-3 inline-block text-sm font-medium text-brand hover:text-brand-dark">See all skill trends →</Link>
            </Card>
            <Card className="min-w-0 flex-[2_1_560px]">
              <CardTitle icon={Briefcase}>Jobs</CardTitle>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink-2">
                      <th className="py-2 pr-3 font-medium">Job</th>
                      <th className="px-3 py-2 text-right font-medium">Postings</th>
                      <th className="px-3 py-2 text-right font-medium">Median salary</th>
                      <th className="py-2 pl-3 font-medium">Top skills</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.top_roles.slice(0, 10).map((r) => (
                      <tr key={r.role} className="border-t border-[#f2f4f7]">
                        <td className="py-2.5 pr-3 font-medium">{r.role}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{fmtCompact(r.postings)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{fmtUsd(r.median_salary_usd)}</td>
                        <td className="py-2.5 pl-3 font-mono text-xs text-ink-2">{r.top_skills.slice(0, 4).map((s) => s.skill).join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
          <p className="text-xs text-muted">Data: {d.source_note}</p>
        </>
      )}
    </>
  );
}
