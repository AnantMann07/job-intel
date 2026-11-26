"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { FileText, Plus, Sparkles, Upload, X, Zap } from "lucide-react";
import { getGap, getRoles, getSkills, uploadResume } from "@/lib/api";
import { fmtPct } from "@/lib/format";
import { setProfile, useProfile } from "@/lib/profile";
import { useAsync } from "@/lib/useAsync";
import { useDataInfo } from "@/components/AppShell";
import { Bar, Card, CardTitle, ErrorBox, IconTile, Loading, PageHeader, Ring, SkillPill, buttonPrimary, inputClass } from "@/components/ui";

export default function ResumePage() {
  return (
    <Suspense fallback={<Loading />}>
      <ResumeAnalysis />
    </Suspense>
  );
}

const TREND = { emerging: "↑ Rising", stable: "Stable", declining: "↓ Falling" } as Record<string, string>;

function ResumeAnalysis() {
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
  const gapKey = role ? `gap:${role}:${profile.skills.join(",")}` : null;
  const gap = useAsync(gapKey, () => getGap(profile.skills, role));

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setUploadError(null);
    try {
      const r = await uploadResume(file);
      setProfile({ skills: r.skills, source: "resume", filename: r.filename, currentRole: r.current_role });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const remove = (s: string) => setProfile({ ...profile, skills: profile.skills.filter((x) => x !== s) });
  function add() {
    const s = newSkill.trim().toLowerCase();
    if (s) setProfile({ ...profile, skills: [...profile.skills, s], source: profile.source ?? "typed" });
    setNewSkill("");
  }

  return (
    <>
      <PageHeader icon={FileText} title="Resume Analysis" subtitle="See how your skills compare with what employers ask for in a job" sample={isSample} />
      {uploadError && <ErrorBox message={uploadError} />}
      <div className="flex flex-wrap items-start gap-6">
        <Card className="flex min-w-0 flex-[1_1_320px] flex-col gap-5">
          <CardTitle icon={FileText}>Your profile</CardTitle>
          <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-[#a5b4fc] bg-ground p-5 text-center">
            <IconTile icon={Upload} />
            <span className="text-sm font-semibold text-brand-dark">{busy ? "Reading your resume…" : profile.source === "resume" ? "Upload a different resume" : "Upload your resume"}</span>
            <span className="text-xs text-ink-2">PDF or DOCX, up to 5 MB. Read once, never stored.</span>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" disabled={busy} className="max-w-full text-xs" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {(profile.filename || profile.currentRole) && (
            <div className="flex flex-wrap justify-between gap-2 rounded-xl bg-ground px-3 py-2.5 text-[13px]">
              <span>{profile.filename ?? "Typed skills"}</span>
              {profile.currentRole && <span className="text-ink-2">Current job: <strong className="text-ink">{profile.currentRole}</strong></span>}
            </div>
          )}
          <div>
            <div className="mb-2 text-[13px] font-medium text-ink-2">Skills found (remove any that are wrong)</div>
            {profile.skills.length === 0 && <p className="text-sm text-ink-2">No skills yet. Upload a resume or add skills below.</p>}
            <ul className="flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <li key={s} className="flex items-center rounded-full bg-tint pl-3 font-mono text-xs text-brand-dark">
                  {s}
                  <button type="button" aria-label={`Remove ${s}`} onClick={() => remove(s)} className="flex size-8 items-center justify-center rounded-full hover:bg-[#e0e4ff]">
                    <X size={14} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
            <label className="sr-only" htmlFor="add-skill">Add a skill</label>
            <input id="add-skill" list="skill-list" className={`${inputClass} font-mono text-sm`} placeholder="e.g. docker" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} />
            <datalist id="skill-list">{dictionary.data?.slice(0, 400).map((s) => <option key={s.skill} value={s.skill} />)}</datalist>
            <button type="submit" className={`${buttonPrimary} px-3.5`} aria-label="Add skill"><Plus size={18} aria-hidden="true" /></button>
          </form>
        </Card>

        <Card className="min-w-0 flex-[2_1_520px]">
          <div className="flex flex-wrap items-center gap-6">
            {gap.data ? <Ring value={gap.data.match} label="match" /> : <div className="size-28 rounded-full bg-tint" />}
            <div className="flex-[1_1_260px]">
              <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-2">
                Target job
                <select className={`${inputClass} max-w-xs`} value={role} onChange={(e) => setRoleChoice(e.target.value)} disabled={!roles.data}>
                  {roleNames.map((r) => <option key={r}>{r}</option>)}
                </select>
              </label>
              {gap.data && (
                <p className="mt-2.5 text-sm leading-relaxed text-[#344054]">
                  You have {gap.data.matched_count} of the {gap.data.total} skills {gap.data.role} postings ask for most. Weighted by how often each is asked
                  for, that covers {gap.data.match}% of what employers want.
                </p>
              )}
            </div>
          </div>
          {gap.error && <div className="mt-4"><ErrorBox message={gap.error} /></div>}
          {gap.loading && <Loading />}
          {gap.data && (
            <>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink-2">
                      <th className="py-2 pr-3 font-medium">Skill</th>
                      <th className="px-3 py-2 font-medium">Asked for in</th>
                      <th className="px-3 py-2 font-medium">You</th>
                      <th className="py-2 pl-3 font-medium">Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gap.data.skills.slice(0, 8).map((r) => (
                      <tr key={r.skill} className="border-t border-[#f2f4f7]">
                        <td className="py-2.5 pr-3 font-mono text-[13px]">{r.skill}</td>
                        <td className="px-3 py-2.5">
                          <span className="flex items-center gap-2"><span className="w-28"><Bar value={r.share} max={gap.data!.skills[0].share} /></span><span className="text-[13px] tabular-nums text-ink-2">{fmtPct(r.share)}</span></span>
                        </td>
                        <td className="px-3 py-2.5">{r.status === "matched" ? <SkillPill>Matched</SkillPill> : <SkillPill tone="missing">Missing</SkillPill>}</td>
                        <td className={`py-2.5 pl-3 text-[13px] ${r.trend === "emerging" ? "font-semibold text-amber-ink" : "text-ink-2"}`}>{TREND[r.trend] ?? r.trend}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {gap.data.learn_first.length > 0 && (
                <>
                  <h3 className="mb-2 mt-6 flex items-center gap-2 text-sm font-semibold"><Zap size={18} className="text-amber-icon" aria-hidden="true" />Learn these first</h3>
                  <ol className="list-decimal pl-5 text-sm leading-8 text-[#344054]">
                    {gap.data.learn_first.map((l) => <li key={l.skill}><strong className="text-ink">{l.skill}</strong>: raises your match to {l.match_after}%</li>)}
                  </ol>
                </>
              )}
            </>
          )}
        </Card>
      </div>
      {profile.skills.length > 0 && (
        <Link href="/suggestions" className={`${buttonPrimary} self-start`}>
          <Sparkles size={18} aria-hidden="true" /> See jobs that fit these skills
        </Link>
      )}
    </>
  );
}
