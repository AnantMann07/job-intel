"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { X } from "lucide-react";
import { getGap, getRoles, getSkills, uploadResume } from "@/lib/api";
import { fmtPct } from "@/lib/format";
import { setProfile, useProfile } from "@/lib/profile";
import { useAsync } from "@/lib/useAsync";
import { useDataInfo } from "@/components/AppShell";
import { ApplyButton } from "@/components/Apply";
import { Bar, ErrorBox, Loading, MatchMeter, PageHeader, buttonPrimary, buttonSecondary, inputClass } from "@/components/ui";

export default function ResumePage() {
  return (
    <Suspense fallback={<Loading />}>
      <ResumeCheck />
    </Suspense>
  );
}

const TREND: Record<string, string> = { emerging: "Rising", stable: "Steady", declining: "Falling" };

function ResumeCheck() {
  const params = useSearchParams();
  const profile = useProfile();
  const { isSample } = useDataInfo();
  const roles = useAsync("roles", getRoles);
  const dictionary = useAsync("skills", getSkills);
  const [roleChoice, setRoleChoice] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const roleNames = roles.data?.map((r) => r.role) ?? [];
  const wanted = roleChoice ?? params.get("role") ?? profile.currentRole ?? "";
  const role = roleNames.find((r) => r.toLowerCase() === wanted.toLowerCase()) ?? roleNames[0] ?? "";
  const gap = useAsync(role ? `gap:${role}:${profile.skills.join(",")}` : null, () => getGap(profile.skills, role));

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setUploadError(null);
    try {
      const r = await uploadResume(file);
      setProfile({ ...profile, skills: r.skills, source: "resume", filename: r.filename, currentRole: r.current_role });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const remove = (s: string) => setProfile({ ...profile, skills: profile.skills.filter((x) => x !== s), learned: (profile.learned ?? []).filter((x) => x !== s) });
  function add() {
    const s = newSkill.trim().toLowerCase();
    if (s) setProfile({ ...profile, skills: [...profile.skills, s], source: profile.source ?? "typed" });
    setNewSkill("");
  }

  return (
    <>
      <PageHeader tone="peach" title="Resume check" subtitle="Your skills next to what employers ask for in one job, skill by skill." sample={isSample} />
      {uploadError && <ErrorBox message={uploadError} />}
      <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-2xl bg-paper p-6 ring-1 ring-line">
          <h2 className="text-[20px] font-semibold">Your skills</h2>
          <p className="mt-1 text-sm text-ink-2">
            {profile.filename ? <>Read from <strong className="font-medium text-ink">{profile.filename}</strong>{profile.currentRole ? <>, where your latest job looks like <strong className="font-medium text-ink">{profile.currentRole}</strong></> : null}. </> : null}
            Remove anything we got wrong.
          </p>
          {profile.skills.length === 0 && <p className="mt-4 text-ink-2">No skills yet. Upload a resume or add them below.</p>}
          <ul className="mt-4 flex flex-wrap gap-2">
            {profile.skills.map((s) => (
              <li key={s} className="flex items-center rounded-lg bg-sage pl-3 text-[14px] font-medium text-sage-ink">
                <span>{s}</span>
                <button type="button" aria-label={`Remove ${s}`} onClick={() => remove(s)} className="grid size-9 place-items-center rounded-full hover:bg-paper/60">
                  <X size={15} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
            <label className="sr-only" htmlFor="add-skill">Add a skill</label>
            <input id="add-skill" list="skill-list" className={inputClass} placeholder="Add a skill, e.g. docker" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} />
            <datalist id="skill-list">{dictionary.data?.slice(0, 400).map((s) => <option key={s.skill} value={s.skill} />)}</datalist>
            <button type="submit" className={buttonSecondary}>Add</button>
          </form>
          <label className={`${buttonSecondary} mt-6 w-full cursor-pointer`}>
            {busy ? "Reading your resume…" : profile.source === "resume" ? "Upload a different resume" : "Upload your resume"}
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" disabled={busy} className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          <p className="mt-2 text-sm text-muted">PDF or Word, up to 5 MB. Read once, not stored.</p>
        </section>

        <section className="card p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <label className="text-sm text-ink-2">
              Compare with
              <select className={`${inputClass} mt-1.5 min-w-60 text-base font-medium`} value={role} onChange={(e) => setRoleChoice(e.target.value)} disabled={!roles.data}>
                {roleNames.map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
            {role && <ApplyButton role={role} variant="secondary" />}
          </div>
          {gap.error && <div className="mt-4"><ErrorBox message={gap.error} /></div>}
          {gap.loading && <Loading />}
          {gap.data && (
            <>
              <div className="mt-6 grid gap-6 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
                <div>
                  <span className="text-[40px] font-semibold leading-none">{gap.data.match}%</span>
                  <div className="mt-3"><MatchMeter value={gap.data.match} tone="sky" /></div>
                </div>
                <p className="leading-relaxed text-ink-2">
                  You have {gap.data.matched_count} of the {gap.data.total} skills {gap.data.role} postings ask for most. Counting how often each one is asked for,
                  that covers {gap.data.match}% of what employers want. The notch on the bar marks 50%, where we call a job a fit.
                </p>
              </div>
              <div className="mt-7 overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-[15px]">
                  <thead>
                    <tr className="border-b-2 border-paper/80 text-left text-sm text-ink-2">
                      <th className="py-2 pr-3 font-normal">Skill</th>
                      <th className="px-3 py-2 font-normal">Share of postings asking for it</th>
                      <th className="px-3 py-2 font-normal">You</th>
                      <th className="py-2 pl-3 font-normal">Lately</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gap.data.skills.slice(0, 10).map((r) => (
                      <tr key={r.skill} className="border-b border-paper/70">
                        <td className="py-2.5 pr-3 font-medium">{r.skill}</td>
                        <td className="px-3 py-2.5">
                          <span className="flex items-center gap-3"><span className="w-32"><Bar value={r.share} max={gap.data!.skills[0].share} tone="sky" /></span><span className="text-sm text-ink-2">{fmtPct(r.share)}</span></span>
                        </td>
                        <td className="px-3 py-2.5 text-sm">{r.status === "matched" ? <span className="mark-have font-medium">have it</span> : <span className="mark-learn font-medium">missing</span>}</td>
                        <td className="py-2.5 pl-3 text-sm text-ink-2">{TREND[r.trend] ?? r.trend}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {gap.data.learn_first.length > 0 && (
                <div className="mt-7">
                  <h3 className="text-[18px] font-semibold">Learn these first</h3>
                  <ol className="mt-2 space-y-1.5 text-ink-2">
                    {gap.data.learn_first.map((l, i) => <li key={l.skill}>{i + 1}. <span className="mark-learn text-ink">{l.skill}</span> takes you to {l.match_after}%</li>)}
                  </ol>
                  <Link href={`/roadmap?role=${encodeURIComponent(gap.data.role)}`} className={`${buttonPrimary} mt-5`}>See the full route to {gap.data.role}</Link>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
