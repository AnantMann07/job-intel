"use client";

import Link from "next/link";
import { getOverview, getTrending } from "@/lib/api";
import { fmtCompact, fmtNum, fmtPct, fmtUsd } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import { MonthlyBars, monthName } from "@/components/charts";
import { Bar, Card, ErrorBox, Loading, PageHeader, linkClass } from "@/components/ui";

export default function InsightsPage() {
  const ov = useAsync("overview", getOverview);
  const rising = useAsync("rising", () => getTrending("emerging", 6));
  const d = ov.data;

  return (
    <>
      <PageHeader
        tone="sky"
        title="The job market"
        subtitle={d ? `What employers asked for in data and tech job postings from ${monthName(d.kpis.date_min.slice(0, 7), true)} to ${monthName(d.kpis.date_max.slice(0, 7), true)}.` : undefined}
        sample={d?.is_sample}
      />
      {ov.error && <ErrorBox message={ov.error} />}
      {ov.loading && <Loading />}
      {d && (
        <>
          <p className="max-w-[70ch] card p-6 text-[19px] leading-relaxed">
            After removing duplicates there are <strong className="font-semibold">{fmtNum(d.kpis.postings)}</strong> postings from{" "}
            <strong className="font-semibold">{fmtNum(d.kpis.companies)}</strong> companies, mentioning <strong className="font-semibold">{fmtNum(d.kpis.distinct_skills)}</strong> different skills.
            Only {fmtPct(d.kpis.pct_with_salary)} of postings list pay; among those, the median is <strong className="font-semibold">{fmtUsd(d.kpis.median_salary_usd)}</strong> a year.
          </p>

          <div className="grid items-start gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="text-[20px] font-semibold">Postings each month</h2>
              <p className="mb-3 mt-1 text-sm text-ink-2">Point at a month to see its count.</p>
              <MonthlyBars data={d.postings_by_month.map((m) => ({ month: m.month, value: m.postings }))} format={fmtNum} />
            </Card>

            <Card>
              <h2 className="text-[20px] font-semibold">Most asked-for skills</h2>
              <p className="mb-3 mt-1 text-sm text-ink-2">Share of all postings that mention each one.</p>
              <table className="w-full border-collapse text-[15px]">
                <tbody>
                  {d.top_skills.slice(0, 10).map((s, i) => (
                    <tr key={s.skill} className="border-b border-line-soft">
                      <td className="w-8 py-2 text-sm text-muted">{i + 1}</td>
                      <td className="py-2 pr-3">{s.skill}</td>
                      <td className="w-[45%] py-2"><Bar value={s.share ?? 0} max={d.top_skills[0].share ?? 1} /></td>
                      <td className="w-14 py-2 text-right text-ink-2">{fmtPct(s.share)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-[1fr_2fr]">
            <Card tone="mint">
              <h2 className="text-[20px] font-semibold">Rising fastest</h2>
              <p className="mb-3 mt-1 text-sm text-ink-2">Skills whose share grew clearly over the year.</p>
              {rising.data?.length === 0 && <p className="text-ink-2">No skill passed the test for a clear rise this year.</p>}
              <ul className="divide-y divide-paper/80">
                {rising.data?.map((s) => (
                  <li key={s.skill} className="flex items-baseline justify-between py-2.5 text-[15px]">
                    <span>{s.skill}</span>
                    <span className="font-medium text-mint-ink">up {Math.round(((s.growth ?? 1) - 1) * 100)}%</span>
                  </li>
                ))}
              </ul>
              <Link href="/trends" className={`${linkClass} mt-3 inline-block text-[15px]`}>All skill trends and forecasts</Link>
            </Card>

            <Card>
              <h2 className="text-[20px] font-semibold">Jobs</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-[15px]">
                  <thead>
                    <tr className="border-b border-line text-left text-sm text-ink-2">
                      <th className="py-2 pr-3 font-normal">Job</th>
                      <th className="px-3 py-2 text-right font-normal">Postings</th>
                      <th className="px-3 py-2 text-right font-normal">Median pay</th>
                      <th className="py-2 pl-3 font-normal">Asked for most</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.top_roles.slice(0, 10).map((r) => (
                      <tr key={r.role} className="border-b border-line-soft">
                        <td className="py-2.5 pr-3"><Link href={`/roadmap?role=${encodeURIComponent(r.role)}`} className="hover:text-brand">{r.role}</Link></td>
                        <td className="px-3 py-2.5 text-right">{fmtCompact(r.postings)}</td>
                        <td className="px-3 py-2.5 text-right">{fmtUsd(r.median_salary_usd)}</td>
                        <td className="py-2.5 pl-3 text-ink-2">{r.top_skills.slice(0, 4).map((s) => s.skill).join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
          <p className="text-sm text-muted">Source: {d.source_note}</p>
        </>
      )}
    </>
  );
}
