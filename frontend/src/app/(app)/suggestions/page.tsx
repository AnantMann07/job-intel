"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, Briefcase, Check, Map as MapIcon, MapPin, Sparkles } from "lucide-react";
import { suggest, type SuggestedJob } from "@/lib/api";
import { demandText, fmtCompact, fmtUsd } from "@/lib/format";
import { useProfile } from "@/lib/profile";
import { useAsync } from "@/lib/useAsync";
import { useDataInfo } from "@/components/AppShell";
import { Card, CardTitle, ErrorBox, IconTile, Loading, NeedSkills, PageHeader, SkillPill, buttonPrimary } from "@/components/ui";

export default function SuggestionsPage() {
  const profile = useProfile();
  const { isSample } = useDataInfo();
  const key = profile.skills.length ? `suggest:${profile.skills.join(",")}` : null;
  const { data, error, loading } = useAsync(key, () => suggest(profile.skills));
  const [picked, setPicked] = useState<string | null>(null);

  const all = data ? [...data.ready, ...data.within_reach] : [];
  const selected = all.find((j) => j.role === picked) ?? all[0];
  const source = profile.source === "resume" && profile.filename ? `from ${profile.filename}` : "you entered";

  return (
    <>
      <PageHeader
        icon={Sparkles}
        title="Jobs that fit you"
        subtitle={profile.skills.length ? `${profile.skills.length} skills ${source}, ranked by how well they match each job and how much it is in demand` : undefined}
        sample={isSample}
      />
      {!profile.skills.length ? (
        <NeedSkills what="the jobs that fit you" />
      ) : (
        <>
          <Card>
            <div className="mb-2.5 text-xs font-medium text-ink-2">Your skills</div>
            <div className="flex flex-wrap gap-1.5">{profile.skills.map((s) => <SkillPill key={s}>{s}</SkillPill>)}</div>
            <Link href="/resume" className="mt-3 inline-block text-[13px] font-medium text-brand hover:text-brand-dark">Edit skills</Link>
          </Card>
          {error && <ErrorBox message={error} />}
          {loading && <Loading text="Finding jobs that fit you…" />}
          {data && (
            <div className="flex flex-wrap items-start gap-6">
              <div className="flex min-w-0 flex-[2_1_560px] flex-col gap-8">
                <JobGroup title="Ready to apply" sub="You already have most of what employers ask for" jobs={data.ready} onPick={setPicked} empty="No job is above 70% yet. The jobs below are close." />
                <JobGroup title="Within reach" sub="A few skills away" jobs={data.within_reach} onPick={setPicked} />
              </div>
              {selected && (
                <Card className="min-w-0 flex-[1_1_300px]">
                  <CardTitle icon={Briefcase}>Example openings · {selected.role}</CardTitle>
                  <p className="mb-2 mt-1 text-[13px] text-ink-2">Postings for this job that use the most of your skills</p>
                  <ul>
                    {selected.openings.map((o, i) => (
                      <li key={i} className="border-t border-[#f2f4f7] py-3">
                        <div className="text-sm font-medium">{o.title}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-2">
                          <MapPin size={14} aria-hidden="true" /> {[o.company, o.location].filter(Boolean).join(" · ") || "Location not listed"}
                        </div>
                        <div className="mt-1 font-mono text-[11px] text-brand-dark">uses {o.uses} of your {o.of} skills · {o.date}</div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs leading-normal text-muted">Openings come from the dataset, so they are examples, not live jobs. Click a job name on the left to see its openings.</p>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}

function JobGroup({ title, sub, jobs, onPick, empty }: { title: string; sub: string; jobs: SuggestedJob[]; onPick: (r: string) => void; empty?: string }) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mb-3 mt-1 text-[13px] text-ink-2">{sub}</p>
      {jobs.length === 0 && empty && <p className="rounded-2xl border border-dashed border-line bg-white p-5 text-sm text-ink-2">{empty}</p>}
      <div className="flex flex-col gap-3">
        {jobs.map((j) => (
          <article key={j.role} className="flex flex-col gap-3.5 rounded-2xl border border-line bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <IconTile icon={Briefcase} size={42} />
                <div>
                  <h3><button type="button" onClick={() => onPick(j.role)} className="text-left text-[17px] font-semibold hover:text-brand">{j.role}</button></h3>
                  <div className="mt-1 text-[13px] text-ink-2">
                    {j.median_salary_usd ? `Median ${fmtUsd(j.median_salary_usd)} · ` : ""}{fmtCompact(j.postings)} postings · {demandText[j.demand] ?? j.demand}
                  </div>
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 font-mono text-[13px] ${j.ready ? "bg-brand text-white" : "bg-tint text-brand-dark"}`}>{j.match}% match</span>
            </div>
            <div className="flex gap-2 text-sm leading-relaxed text-[#344054]">
              <Check size={16} className="mt-1 flex-none text-brand" aria-hidden="true" />
              <span><strong className="font-semibold">You have:</strong> {j.have.length ? j.have.join(", ") : "none of the top skills yet"}</span>
            </div>
            {j.to_learn.length > 0 && (
              <div className="flex gap-2 text-sm leading-relaxed text-[#344054]">
                <BookOpen size={16} className="mt-1 flex-none text-amber-icon" aria-hidden="true" />
                <span>
                  <strong className="font-semibold">To learn:</strong>{" "}
                  {j.to_learn.map((s, i) => (
                    <span key={s}>{i > 0 && ", "}{s === j.biggest_gain ? <strong className="font-semibold">{s} (biggest gain)</strong> : s}</span>
                  ))}
                </span>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/roadmap?role=${encodeURIComponent(j.role)}`} className={`${buttonPrimary} min-h-10 px-3.5`}>
                <MapIcon size={16} aria-hidden="true" /> Roadmap to this job
              </Link>
              <Link href={`/resume?role=${encodeURIComponent(j.role)}`} className="inline-flex min-h-10 items-center px-1.5 text-sm font-medium text-brand hover:text-brand-dark">
                See skill details
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
