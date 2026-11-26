"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Briefcase, Check, Code2, Map as MapIcon, Route, Sparkles } from "lucide-react";
import { getRoadmap, getRoles } from "@/lib/api";
import { fmtPct } from "@/lib/format";
import { useProfile } from "@/lib/profile";
import { useAsync } from "@/lib/useAsync";
import { useDataInfo } from "@/components/AppShell";
import { Card, CardTitle, ErrorBox, Loading, PageHeader, Ring, SkillPill, buttonPrimary, inputClass } from "@/components/ui";

export default function RoadmapPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Roadmap />
    </Suspense>
  );
}

function Roadmap() {
  const router = useRouter();
  const params = useSearchParams();
  const profile = useProfile();
  const { isSample } = useDataInfo();
  const roles = useAsync("roles", getRoles);
  const roleNames = roles.data?.map((r) => r.role) ?? [];
  const wanted = params.get("role") ?? "";
  const role = roleNames.find((r) => r.toLowerCase() === wanted.toLowerCase()) ?? roleNames[0] ?? "";
  const plan = useAsync(role ? `roadmap:${role}:${profile.skills.join(",")}` : null, () => getRoadmap(profile.skills, role));
  const d = plan.data;

  return (
    <>
      <PageHeader
        icon={MapIcon}
        title={role ? `Your roadmap to ${role}` : "Your roadmap"}
        subtitle={profile.skills.length ? `Starting from ${profile.currentRole ? `${profile.currentRole}, ` : ""}${profile.skills.length} skills` : "Starting from scratch. Add your skills on Home to personalise this."}
        sample={isSample}
      />
      <Card className="flex flex-wrap items-center gap-x-8 gap-y-5">
        {d ? <Ring value={d.ready} label="ready" size={104} /> : <div className="size-[104px] rounded-full bg-tint" />}
        <div className="flex-[1_1_300px]">
          {d && (
            <>
              <div className="text-lg font-semibold">You have {d.have.length} of the {d.top_count} skills {d.role} postings ask for most</div>
              <div className="mt-1.5 text-sm leading-relaxed text-ink-2">
                {d.stages.length ? `Follow the ${d.stages.length === 1 ? "stage" : `${d.stages.length} stages`} below to reach about ${d.final_match}%.` : "You already have every top skill for this job."} Each stage adds the skills that raise your match the most.
              </div>
            </>
          )}
        </div>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-2">
          Target job
          <select className={`${inputClass} min-w-52`} value={role} disabled={!roles.data} onChange={(e) => router.replace(`/roadmap?role=${encodeURIComponent(e.target.value)}`)}>
            {roleNames.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
      </Card>
      {plan.error && <ErrorBox message={plan.error} />}
      {plan.loading && <Loading text="Building your roadmap…" />}
      {d && (
        <div className="flex flex-wrap items-start gap-6">
          <Card className="min-w-0 flex-[2_1_560px]">
            <CardTitle icon={MapIcon}>Your plan</CardTitle>
            <p className="mb-6 mt-1.5 text-[13px] text-ink-2">Ordered by how often employers ask for each skill. % = share of {d.role} postings that ask for it.</p>
            <ol>
              <Step marker={<Check size={18} aria-hidden="true" />} filled title="What you already have" right={`Match today: ${d.ready}%`}>
                <div className="flex flex-wrap gap-2">
                  {d.have.length ? d.have.map((h) => <SkillPill key={h.skill}>{h.skill} · {fmtPct(h.share)}</SkillPill>) : <span className="text-sm text-ink-2">None of the top skills yet. That&apos;s fine, start with stage 1.</span>}
                </div>
              </Step>
              {d.stages.map((s) => (
                <Step key={s.number} marker={s.number} title={`Stage ${s.number}: ${s.title}`} right={`Match after: ${s.match_after}%`}>
                  <div className="flex flex-wrap gap-2">
                    {s.skills.map((k) => <SkillPill key={k.skill} tone={k.rising ? "amber" : "grey"}>{k.skill} · {fmtPct(k.share)}{k.rising ? " · rising" : ""}</SkillPill>)}
                  </div>
                  <p className="mt-2.5 flex gap-2 text-sm leading-relaxed text-ink-2"><Code2 size={16} className="mt-1 flex-none text-brand" aria-hidden="true" /><span>Practice project: {s.project}</span></p>
                </Step>
              ))}
              <Step marker="→" filled last title="Apply" right={`${d.role} jobs open up`}>
                <p className="text-sm leading-relaxed text-ink-2">Add the projects above to your resume, then check <Link href="/suggestions" className="font-medium text-brand">your job suggestions</Link> again.</p>
              </Step>
            </ol>
          </Card>
          <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
            <Card>
              <CardTitle icon={Route}>{d.have.length ? "Your skills also fit" : "Other jobs to explore"}</CardTitle>
              <ul className="mt-3 flex flex-col gap-2">
                {d.also_consider.map((r) => (
                  <li key={r.role}>
                    <Link href={`/roadmap?role=${encodeURIComponent(r.role)}`} className="flex items-center justify-between gap-3 rounded-xl bg-ground px-3 py-2.5 text-sm hover:bg-tint">
                      <span className="flex items-center gap-2"><Briefcase size={16} className="text-brand" aria-hidden="true" />{r.role}</span>
                      {d.have.length > 0 && <span className="font-mono text-xs text-brand-dark">{r.match}%</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardTitle icon={Sparkles}>Ready to look?</CardTitle>
              <p className="mb-3 mt-1.5 text-[13px] leading-relaxed text-ink-2">See every job your current skills fit, with example openings.</p>
              <Link href="/suggestions" className={buttonPrimary}>See job suggestions</Link>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

function Step({ marker, title, right, filled, last, children }: { marker: React.ReactNode; title: string; right: string; filled?: boolean; last?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <div className="flex w-9 flex-none flex-col items-center">
        <span className={`flex size-9 items-center justify-center rounded-full text-sm font-semibold ${filled ? "bg-brand text-white" : "border-2 border-brand bg-white text-brand-dark"}`}>{marker}</span>
        {!last && <span className="min-h-6 w-0.5 flex-auto bg-[#d0d5dd]" />}
      </div>
      <div className={`min-w-0 flex-auto ${last ? "" : "pb-7"}`}>
        <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="font-semibold">{title}</h3>
          <span className="font-mono text-xs text-brand-dark">{right}</span>
        </div>
        {children}
      </div>
    </li>
  );
}
