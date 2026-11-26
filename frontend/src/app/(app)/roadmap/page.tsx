"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { getCareers, getRoadmap, getRoles, type RoadmapOut } from "@/lib/api";
import { fmtPct } from "@/lib/format";
import { updateProfile, useProfile } from "@/lib/profile";
import { useAsync } from "@/lib/useAsync";
import { useDataInfo } from "@/components/AppShell";
import { ApplyButton } from "@/components/Apply";
import { Card, ErrorBox, Loading, MatchMeter, PageHeader, Skill, SkillList, buttonSecondary, inputClass, linkClass, toneInk } from "@/components/ui";

export default function RoadmapPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Roadmap />
    </Suspense>
  );
}

/** Match % for a set of skills, using the job's top skills that came with the roadmap. */
function matchFor(d: RoadmapOut, skills: Set<string>) {
  const total = d.top.reduce((a, s) => a + s.share, 0);
  const have = d.top.reduce((a, s) => a + (skills.has(s.skill) ? s.share : 0), 0);
  return total ? Math.round((100 * have) / total) : d.ready;
}

function toggleLearned(skill: string, on: boolean) {
  updateProfile((p) => ({
    ...p,
    skills: on ? [...p.skills, skill] : p.skills.filter((s) => s !== skill),
    learned: on ? [...(p.learned ?? []), skill] : (p.learned ?? []).filter((s) => s !== skill),
  }));
}

function Roadmap() {
  const router = useRouter();
  const params = useSearchParams();
  const profile = useProfile();
  const { isSample } = useDataInfo();
  const roles = useAsync("roles", getRoles);
  const careers = useAsync("careers", getCareers);
  const roleNames = [...new Set([...(roles.data?.map((r) => r.role) ?? []), ...(careers.data?.map((c) => c.title) ?? [])])];
  const wanted = params.get("role") ?? "";
  const role = roleNames.find((r) => r.toLowerCase() === wanted.toLowerCase()) ?? roleNames[0] ?? "";

  // The plan is built from the skills you had before ticking anything, so the stages stay put while you tick.
  const learned = new Set(profile.learned ?? []);
  const base = profile.skills.filter((s) => !learned.has(s));
  const plan = useAsync(role ? `roadmap:${role}:${base.join(",")}` : null, () => getRoadmap(base, role));
  const d = plan.data;
  const mine = new Set(profile.skills);
  const now = d ? matchFor(d, mine) : 0;
  const planned = d ? d.stages.flatMap((s) => s.skills.map((k) => k.skill)) : [];
  const done = planned.filter((s) => mine.has(s)).length;

  return (
    <>
      <PageHeader
        tone="mint"
        title={role ? `Your route to ${role}` : "Your route"}
        subtitle={base.length ? `Starting from your ${base.length} skills. Tick skills off as you learn them.` : "Starting from scratch. Add your skills on the home page to make this yours."}
        sample={isSample}
      >
        <div className="no-print flex flex-wrap items-center gap-2">
          <label htmlFor="route-job" className="sr-only">Job</label>
          <select id="route-job" className={`${inputClass} min-w-56`} value={role} disabled={!roles.data} onChange={(e) => router.replace(`/roadmap?role=${encodeURIComponent(e.target.value)}`)}>
            {roleNames.map((r) => <option key={r}>{r}</option>)}
          </select>
          <button type="button" className={buttonSecondary} onClick={() => window.print()} disabled={!d}>Download PDF</button>
        </div>
      </PageHeader>
      {plan.error && <ErrorBox message={plan.error} />}
      {plan.loading && <Loading text="Planning your route…" />}
      {d && (
        <>
          <Card tone="lavender" className="print-plain">
            <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-4">
              <div>
                <p className="font-medium text-lavender-ink">{done > 0 ? `Started at ${d.ready}%, now` : "Where you are"}</p>
                <p className="text-[40px] font-semibold leading-none">{now}%</p>
              </div>
              <p className="max-w-md text-[16px] text-ink-2">
                {d.stages.length === 0
                  ? "You already have every skill this job asks for most. Time to apply!"
                  : done === planned.length
                    ? "Every skill on the route is ticked. Put the projects on your resume and apply."
                    : `${done} of ${planned.length} skills ticked. Finish the route to reach about ${d.final_match}%.`}
              </p>
            </div>
            <div className="mt-5"><MatchMeter value={now} /></div>
          </Card>

          <div className="grid items-start gap-5 md:grid-cols-2">
            <Card tone="white">
              <h2 className="text-[20px] font-semibold">Already have</h2>
              <div className="mt-3">
                <SkillList>{d.have.length ? d.have.map((h) => <Skill key={h.skill} name={h.skill} />) : <span className="text-ink-2">Nothing yet, and that&apos;s fine. Start with step 1.</span>}</SkillList>
              </div>
            </Card>
            {d.stages.map((s, i) => {
              const tone = (["peach", "sky", "mint", "lavender"] as const)[i % 4];
              const complete = s.skills.every((k) => mine.has(k.skill));
              return (
                <Card key={s.number} tone={tone} className="break-inside-avoid">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-[20px] font-semibold">Step {s.number}{complete ? " ✓" : ""}</h2>
                    <span className={`text-sm font-medium ${toneInk[tone]}`}>takes you to {s.match_after}%</span>
                  </div>
                  <ul className="mt-3 flex flex-col gap-1">
                    {s.skills.map((k) => (
                      <li key={k.skill}>
                        <label className="inline-flex min-h-10 cursor-pointer items-center gap-3">
                          <input type="checkbox" className="size-5 accent-accent" checked={mine.has(k.skill)} onChange={(e) => toggleLearned(k.skill, e.target.checked)} />
                          <span className={`text-[17px] font-medium ${mine.has(k.skill) ? "line-through decoration-2 opacity-60" : ""}`}>{k.skill}</span>
                          <span className="text-sm text-ink-2">{fmtPct(k.share)} of postings{k.rising ? ", rising" : ""}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-2"><strong className="text-ink">Try this:</strong> {s.project}</p>
                </Card>
              );
            })}
            <Card tone="white">
              <h2 className="text-[20px] font-semibold">Then apply</h2>
              <p className="mt-2 text-ink-2">Put your projects on your resume and look at today&apos;s {d.role} openings.</p>
              <div className="no-print mt-4"><ApplyButton role={d.role} /></div>
            </Card>
          </div>

          {d.also_consider.length > 0 && (
            <p className="no-print text-[16px] text-ink-2">
              {d.have.length ? "Your skills also fit " : "Other jobs to look at: "}
              {d.also_consider.map((r, i) => (
                <span key={r.role}>{i > 0 && (i === d.also_consider.length - 1 ? " and " : ", ")}<Link href={`/roadmap?role=${encodeURIComponent(r.role)}`} className={linkClass}>{r.role}</Link>{d.have.length ? ` (${r.match}%)` : ""}</span>
              ))}.
            </p>
          )}
        </>
      )}
      <p className="hidden text-sm text-muted print:block">From JobIntel, printed {new Date().toLocaleDateString("en-GB")}. Match % = share of what {role} postings usually ask for.</p>
    </>
  );
}

