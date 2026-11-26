"use client";

// One career in detail, compared with the person's skills (from /api/careers/{id}).

import Link from "next/link";
import { useParams } from "next/navigation";
import { getCareer } from "@/lib/api";
import { fmtUsd } from "@/lib/format";
import { toggleSaved, useProfile } from "@/lib/profile";
import { useAsync } from "@/lib/useAsync";
import { ErrorBox, Loading, MatchMeter, Skill, SkillList, buttonPrimary, buttonSecondary, linkClass } from "@/components/ui";

export default function CareerView() {
  const { id } = useParams<{ id: string }>();
  const profile = useProfile();
  const answers = profile.discovery?.answers ?? {};
  const skills = [...new Set([...(profile.discovery?.skills ?? []), ...profile.skills])];
  const { data: c, error, loading } = useAsync(`career:${id}:${skills.join(",")}`, () => getCareer(id, answers, skills));
  const saved = profile.discovery?.saved?.includes(id) ?? false;

  if (loading) return <Loading />;
  if (error || !c) return <ErrorBox message={error ?? "Career not found."} />;

  return (
    <>
      <div>
        <Link href="/discover" className={`${linkClass} text-[14px]`}>Back to careers</Link>
        <h1 className="mt-4 text-[32px] font-semibold leading-tight tracking-[-0.01em]">{c.title}</h1>
        <p className="mt-1 text-[14px] text-muted">
          {c.category}. {c.source === "postings" ? "Skills measured from 2023 job postings." : "Curated career profile (not in the 2023 postings data)."}
        </p>
        <p className="mt-4 max-w-[62ch] text-[17px] leading-relaxed text-ink-2">{c.description}</p>
      </div>

      <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-10">
          <section>
            <h2 className="text-[20px] font-semibold">What the work involves</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] text-ink-2">{c.involves.map((x) => <li key={x}>{x}</li>)}</ul>
          </section>

          <section>
            <h2 className="text-[20px] font-semibold">Skills</h2>
            {c.have.length > 0 && <><p className="mt-3 text-[14px] text-muted">You have</p><div className="mt-2"><SkillList>{c.have.map((s) => <Skill key={s} name={s} />)}</SkillList></div></>}
            {c.missing.length > 0 && <><p className="mt-4 text-[14px] text-muted">To learn, most important first</p><div className="mt-2"><SkillList>{c.missing.map((s) => <Skill key={s} name={s} state="learn" />)}</SkillList></div></>}
            {c.transferable.length > 0 && (
              <p className="mt-4 text-[15px] text-ink-2">
                Transferable: {c.transferable.map((t) => `your ${t.have} helps with ${t.toward}`).join("; ")}. (Based on which skills appear together in job postings.)
              </p>
            )}
          </section>

          {c.roadmap.length > 0 && (
            <section>
              <h2 className="text-[20px] font-semibold">Learning route</h2>
              <ol className="mt-3 space-y-3">
                {c.roadmap.map((s) => (
                  <li key={s.step} className="flex gap-4 text-[15px]">
                    <span className="grid size-7 flex-none place-items-center rounded-full border border-line text-[13px]">{s.step}</span>
                    <span className="pt-0.5">Learn {s.skills.join(" and ")} <span className="text-muted">to reach about {s.match_after}%</span></span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section>
            <h2 className="text-[20px] font-semibold">Projects to try</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] text-ink-2">{c.projects.map((x) => <li key={x}>{x}</li>)}</ul>
          </section>

          <section>
            <h2 className="text-[20px] font-semibold">Related careers</h2>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
              {c.related.map((r) => <Link key={r.id} href={`/careers/${r.id}`} className={linkClass}>{r.title}</Link>)}
            </div>
          </section>
        </div>

        <aside className="card p-6 lg:sticky lg:top-24">
          <p className="text-[14px] text-muted">Your skill fit</p>
          <p className="mt-1 text-[32px] font-semibold leading-none">{c.skill_fit}%</p>
          <div className="mt-3"><MatchMeter value={c.skill_fit} /></div>
          <div className="mt-6 flex flex-col gap-2">
            <Link href={`/roadmap?role=${encodeURIComponent(c.title)}`} className={buttonPrimary}>Add to my roadmap</Link>
            <button type="button" className={buttonSecondary} onClick={() => toggleSaved(c.id)}>{saved ? "Saved" : "Save career"}</button>
          </div>
          <dl className="mt-6 space-y-4 border-t border-line-soft pt-5 text-[14.5px]">
            <div><dt className="text-muted">Education</dt><dd className="mt-1 text-ink-2">{c.education}</dd></div>
            <div><dt className="text-muted">Opportunities</dt><dd className="mt-1 text-ink-2">{c.opportunities}</dd></div>
            {c.median_salary_usd ? <div><dt className="text-muted">Median pay in the postings</dt><dd className="mt-1 text-ink-2">{fmtUsd(c.median_salary_usd)} a year (US data)</dd></div> : null}
            {c.rising_skills.length > 0 && <div><dt className="text-muted">Rising skills</dt><dd className="mt-1 text-ink-2">{c.rising_skills.join(", ")}</dd></div>}
          </dl>
        </aside>
      </div>
    </>
  );
}
