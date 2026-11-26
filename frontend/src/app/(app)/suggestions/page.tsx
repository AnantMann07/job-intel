"use client";

import Link from "next/link";
import { useState } from "react";
import { suggest, type SuggestedJob } from "@/lib/api";
import { demandText, fmtCompact, fmtUsd } from "@/lib/format";
import { useProfile } from "@/lib/profile";
import { useAsync } from "@/lib/useAsync";
import { useDataInfo } from "@/components/AppShell";
import { ApplyButton } from "@/components/Apply";
import { ErrorBox, Loading, MatchDots, NeedSkills, PageHeader, Skill, SkillList, TONES, buttonSecondary, linkClass, toneBg, toneInk, type Tone } from "@/components/ui";

export default function SuggestionsPage() {
  const profile = useProfile();
  const { isSample } = useDataInfo();
  const key = profile.skills.length ? `suggest:${profile.skills.join(",")}` : null;
  const { data, error, loading } = useAsync(key, () => suggest(profile.skills));

  return (
    <>
      <PageHeader title="Jobs for you" tone="lavender" sample={isSample}
        subtitle={profile.skills.length ? <>Based on <strong className="font-medium text-ink">{profile.skills.slice(0, 6).join(", ")}{profile.skills.length > 6 ? ` and ${profile.skills.length - 6} more` : ""}</strong>. <Link href="/resume" className={linkClass}>Change</Link></> : undefined} />
      {!profile.skills.length ? (
        <NeedSkills what="the jobs that fit you" />
      ) : (
        <>
          {error && <ErrorBox message={error} />}
          {loading && <Loading text="Matching your skills with every job…" />}
          {data && (
            <>
              <JobGroup title="You can apply now" sub="You already have at least half of what these employers usually ask for." jobs={data.ready} start={0}
                empty="No job is at 50% yet. The ones below are the closest; open one to see what to add." />
              <JobGroup title="A few skills away" sub="A couple of new skills would get you there." jobs={data.within_reach} start={data.ready.length} />
            </>
          )}
        </>
      )}
    </>
  );
}

function JobGroup({ title, sub, jobs, start, empty }: { title: string; sub: string; jobs: SuggestedJob[]; start: number; empty?: string }) {
  if (!jobs.length && !empty) return null;
  return (
    <section>
      <h2 className="text-[20px] font-semibold">{title}</h2>
      <p className="mt-1 text-[16px] text-ink-2">{sub}</p>
      {jobs.length === 0 && empty && <p className="mt-4 rounded-2xl bg-line-soft px-6 py-5 text-ink-2">{empty}</p>}
      <div className="mt-5 grid items-start gap-5 md:grid-cols-2">
        {jobs.map((j, i) => <JobCard key={j.role} job={j} tone={TONES[(start + i) % TONES.length]} />)}
      </div>
    </section>
  );
}

function JobCard({ job: j, tone }: { job: SuggestedJob; tone: Tone }) {
  const [open, setOpen] = useState(false);
  return (
    <article className={`rounded-2xl p-6 sm:p-7 ${toneBg[tone]}`}>
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-[20px] font-semibold leading-tight">{j.role}</h3>
        <div className="text-right">
          <div className="text-[24px] font-semibold leading-none">{j.match}%</div>
          <div className={`mt-1 text-[13px] font-medium ${toneInk[tone]}`}>match</div>
        </div>
      </div>
      <div className="mt-3"><MatchDots value={j.match} tone={tone} /></div>
      <div className="mt-5">
        <SkillList>{j.have.length ? j.have.slice(0, 3).map((s) => <Skill key={s} name={s} />) : <span className="text-ink-2">None of the top skills yet</span>}</SkillList>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <ApplyButton role={j.role} />
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className={buttonSecondary}>
          {open ? "Hide details" : "Details"}
        </button>
      </div>
      {open && (
        <div className="mt-5 space-y-4 border-t border-line-soft pt-5 text-[15px]">
          <p className="text-ink-2">
            {j.median_salary_usd ? <>Median pay <strong className="text-ink">{fmtUsd(j.median_salary_usd)}</strong> a year. </> : null}
            {fmtCompact(j.postings)} postings, {demandText[j.demand] ?? j.demand}.
          </p>
          {j.to_learn.length > 0 && (
            <div>
              <p className="mb-2 font-medium">Learn next</p>
              <SkillList>{j.to_learn.map((s) => <Skill key={s} name={s} state="learn" extra={s === j.biggest_gain ? "biggest jump" : undefined} />)}</SkillList>
            </div>
          )}
          {j.openings.length > 0 && (
            <div>
              <p className="mb-1.5 font-medium">Real postings that used your skills</p>
              <ul className="space-y-1.5 text-ink-2">
                {j.openings.map((o, i) => <li key={i}>{o.title}{o.company ? `, ${o.company}` : ""}{o.location ? ` (${o.location})` : ""}</li>)}
              </ul>
              <p className="mt-1.5 text-[13px] text-muted">From 2023, so these have closed. Apply shows today&apos;s openings.</p>
            </div>
          )}
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href={`/roadmap?role=${encodeURIComponent(j.role)}`} className={linkClass}>See the route</Link>
            <Link href={`/resume?role=${encodeURIComponent(j.role)}`} className={linkClass}>Compare skill by skill</Link>
          </div>
        </div>
      )}
    </article>
  );
}
