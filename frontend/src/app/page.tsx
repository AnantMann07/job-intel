"use client";

// Home: one big lavender block to tell us your skills, then three small colour blocks
// for the other ways in (a job you want, the chat helper, the market).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { getOverview, getRoles, uploadResume } from "@/lib/api";
import { fmtNum } from "@/lib/format";
import { parseSkillText, setProfile, useProfile } from "@/lib/profile";
import { useAsync } from "@/lib/useAsync";
import { SiteHeader } from "@/components/SiteHeader";
import { openAssistant } from "@/components/Assistant";
import { ErrorBox, MatchMeter, buttonPrimary, buttonSecondary, inputClass, linkClass } from "@/components/ui";

export default function Home() {
  const router = useRouter();
  const profile = useProfile();
  const roles = useAsync("roles", getRoles);
  const overview = useAsync("overview", getOverview);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const postings = overview.data?.kpis.postings;

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const r = await uploadResume(file);
      if (r.skills.length === 0) throw new Error("We couldn't find any skills we know in that file. Type them in the box instead.");
      setProfile({ ...profile, skills: r.skills, source: "resume", filename: r.filename, currentRole: r.current_role });
      router.push("/suggestions");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function showJobs(e: React.FormEvent) {
    e.preventDefault();
    const skills = parseSkillText(typed);
    if (skills.length) {
      setProfile({ ...profile, skills, source: "typed", filename: null, currentRole: null });
    } else if (!profile.skills.length) {
      setError("Type at least one skill, or upload your resume.");
      return;
    }
    router.push("/suggestions");
  }

  const chosenRole = role || roles.data?.[0]?.role || "";

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-[1120px] px-5 pb-28 sm:px-8">
        <section className="grid items-center gap-14 py-16 sm:py-24 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h1 className="max-w-[16ch] text-[36px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[46px]">Find work that fits what you already know</h1>
            <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-ink-2">
              Tell us your skills. We&apos;ll show the jobs you can go for today, what to learn next, and where to apply.
            </p>
            <form onSubmit={showJobs} className="mt-9 flex max-w-xl flex-col gap-2 sm:flex-row">
              <label htmlFor="skills" className="sr-only">Your skills, separated by commas</label>
              <input id="skills" className={`${inputClass} h-12 sm:flex-1`} value={typed} onChange={(e) => setTyped(e.target.value)}
                placeholder={profile.skills.length ? profile.skills.slice(0, 5).join(", ") : "Your skills, e.g. sql, python, excel"} />
              <button type="submit" className={`${buttonPrimary} h-12`} disabled={busy}>Show my jobs</button>
            </form>
            <p className="mt-3 text-[14.5px] text-ink-2">
              or{" "}
              <label className={`${linkClass} cursor-pointer`}>
                {busy ? "reading your resume…" : "upload your resume"}
                <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" disabled={busy} className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>{" "}
              (PDF or Word, not stored)
            </p>
            {error && <div className="mt-4 max-w-xl"><ErrorBox message={error} /></div>}
          </div>

          <div aria-hidden="true" className="card mx-auto w-full max-w-[420px] p-6">
            <p className="text-[13px] text-muted">Example result</p>
            <div className="mt-3 flex items-baseline justify-between">
              <p className="text-[19px] font-semibold">Data Analyst</p>
              <p className="text-[19px] font-semibold">72%</p>
            </div>
            <div className="mt-3"><MatchMeter value={72} /></div>
            <p className="mt-5 text-[13px] text-muted">You have</p>
            <div className="mt-2 flex flex-wrap gap-2">{["sql", "excel", "tableau"].map((s) => <span key={s} className="mark-have text-[14px]">{s}</span>)}</div>
            <p className="mt-4 text-[13px] text-muted">Learn next</p>
            <div className="mt-2 flex flex-wrap gap-2"><span className="mark-learn text-[14px]">power bi</span><span className="mark-learn text-[14px]">python</span></div>
            <div className="mt-6 flex gap-2 border-t border-line-soft pt-5">
              <span className={`${buttonPrimary} h-9 px-4 text-[14px]`}>Apply</span>
              <span className={`${buttonSecondary} h-9 px-3.5 text-[14px]`}>See the route</span>
            </div>
          </div>
        </section>

        <section className="grid gap-10 border-t border-line py-14 md:grid-cols-3">
          <div>
            <h2 className="text-[18px] font-semibold">Not sure what you want?</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">Answer a few questions about what you enjoy and discover careers you may not have considered.</p>
            <Link href="/discover" className={`${linkClass} mt-4 inline-block text-[15px]`}>Discover careers</Link>
          </div>
          <div>
            <h2 className="text-[18px] font-semibold">Know the job you want?</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">Get a step-by-step route there, with a small project for each step.</p>
            <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); router.push(`/roadmap?role=${encodeURIComponent(chosenRole)}`); }}>
              <label htmlFor="dream" className="sr-only">The job I want</label>
              <select id="dream" className={`${inputClass} h-10`} value={chosenRole} onChange={(e) => setRole(e.target.value)} disabled={!roles.data}>
                {roles.loading && <option>Loading…</option>}
                {roles.data?.map((r) => <option key={r.role} value={r.role}>{r.role}</option>)}
              </select>
              <button type="submit" className={`${buttonSecondary} h-10`} disabled={!chosenRole}>Go</button>
            </form>
          </div>
          <div>
            <h2 className="text-[18px] font-semibold">Wondering what&apos;s in demand?</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">See which skills employers ask for most, and which are rising. Or just ask our assistant.</p>
            <div className="mt-4 flex gap-5 text-[15px]">
              <Link href="/insights" className={linkClass}>The job market</Link>
              <button type="button" onClick={openAssistant} className={linkClass}>Ask JobIntel</button>
            </div>
          </div>
        </section>

        <p className="border-t border-line pt-8 text-[14px] text-muted">
          Job matches use {postings ? fmtNum(postings) : "about 775,000"} real data and tech job postings from 2023. Careers outside that data use curated skill profiles, and are labelled as such.
        </p>
      </main>
    </div>
  );
}
