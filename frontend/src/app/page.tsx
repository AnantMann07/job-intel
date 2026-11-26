"use client";

// Home: the two ways in. "I have skills" -> job suggestions; "I know the job I want" -> roadmap.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  ArrowRight, BarChart3, Briefcase, Code2, FileText, Map as MapIcon, Route, Sparkles, Target, TrendingUp, Upload,
} from "lucide-react";
import { getRoles, uploadResume } from "@/lib/api";
import { parseSkillText, setProfile, useProfile } from "@/lib/profile";
import { useAsync } from "@/lib/useAsync";
import { Logo } from "@/components/Logo";
import { ErrorBox, IconTile, buttonPrimary, inputClass } from "@/components/ui";

export default function Home() {
  const router = useRouter();
  const profile = useProfile();
  const roles = useAsync("roles", getRoles);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const r = await uploadResume(file);
      if (r.skills.length === 0) throw new Error("We couldn't find any known skills in that file. Try typing your skills instead.");
      setProfile({ skills: r.skills, source: "resume", filename: r.filename, currentRole: r.current_role });
      router.push("/suggestions");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onSuggest() {
    const skills = parseSkillText(typed);
    if (skills.length) {
      setProfile({ skills, source: "typed", filename: null, currentRole: null });
    } else if (!profile.skills.length) {
      setError("Upload a resume or type at least one skill.");
      return;
    }
    router.push("/suggestions");
  }

  const chosenRole = role || roles.data?.[0]?.role || "";

  return (
    <div className="min-h-screen bg-ground">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5 text-ink" aria-label="JobIntel home">
            <Logo />
            <span className="font-display text-[19px] font-semibold">JobIntel</span>
          </Link>
          <nav aria-label="Main" className="flex flex-auto flex-wrap gap-1 text-sm font-medium">
            {[
              { href: "/suggestions", label: "Job Suggestions", icon: Sparkles },
              { href: "/resume", label: "Resume Analysis", icon: FileText },
              { href: "/roadmap", label: "My Roadmap", icon: MapIcon },
              { href: "/insights", label: "Market Insights", icon: BarChart3 },
            ].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2.5 text-[#344054] hover:bg-tint hover:text-brand-dark">
                <Icon size={17} strokeWidth={1.8} aria-hidden="true" /> {label}
              </Link>
            ))}
          </nav>
          <Link href="#start" className={buttonPrimary}>
            Get started <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section className="dots border-b border-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-14 px-6 py-[72px]">
          <div className="min-w-0 flex-[1_1_520px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5 text-[13px] font-medium text-brand-dark">
              <Sparkles size={14} className="text-[#f59e0b]" aria-hidden="true" /> AI career guide · built on 775k real job postings
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-[46px]">
              Find the job that fits your skills, and a clear roadmap to the one you want.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-ink-2">
              Upload your resume or list your skills. JobIntel compares them with hundreds of thousands of real job postings to suggest
              jobs you are ready for, show what is missing, and plan how to get there.
            </p>
          </div>
          <div aria-hidden="true" className="relative min-w-0 max-w-[520px] flex-[1_1_400px]">
            <Sparkles size={28} className="absolute -top-5 right-2 text-[#f59e0b]" />
            <div className="rounded-2xl bg-[#1e1b4b] px-5 pb-5 pt-4 font-mono text-[13px] leading-8 text-[#e0e7ff]">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[#fca5a5]" />
                <span className="size-2.5 rounded-full bg-[#fde68a]" />
                <span className="size-2.5 rounded-full bg-[#a7f3d0]" />
                <span className="ml-2 text-xs text-[#a5b4fc]">jobintel · analyze</span>
              </div>
              <div><span className="text-[#a5b4fc]">$</span> jobintel analyze resume.pdf</div>
              <div className="text-[#a7f3d0]">✓ parsed 2 pages</div>
              <div className="text-[#a7f3d0]">✓ found 7 skills</div>
              <div>skills = [<span className="text-[#fde68a]">&quot;sql&quot;</span>, <span className="text-[#fde68a]">&quot;python&quot;</span>, <span className="text-[#fde68a]">&quot;excel&quot;</span>, …]</div>
              <div><span className="text-[#a5b4fc]">→</span> best match: Data Analyst <span className="text-[#fde68a]">81%</span></div>
            </div>
            <div className="relative -mt-5 ml-12 flex flex-col gap-2.5 rounded-2xl border border-line bg-white px-5 py-4">
              <div className="flex items-center gap-3">
                <IconTile icon={Briefcase} />
                <div className="flex-auto"><div className="font-semibold">Data Analyst</div><div className="text-xs text-ink-2">Ready to apply</div></div>
                <span className="rounded-full bg-brand px-2.5 py-1 font-mono text-xs text-white">81% match</span>
              </div>
              <span className="block h-2 rounded-full bg-tint"><span className="block h-2 w-[81%] rounded-full bg-brand" /></span>
            </div>
          </div>
        </div>
      </section>

      <main id="start" className="mx-auto flex max-w-[1200px] flex-col gap-16 px-6 pb-[72px] pt-16">
        {error && <ErrorBox message={error} />}
        <div className="flex flex-wrap gap-5">
          <section className="flex min-w-0 flex-[1_1_420px] flex-col gap-4 rounded-[20px] border-2 border-brand bg-white p-7">
            <div className="flex items-center gap-3"><IconTile icon={Upload} size={44} /><span className="text-sm font-semibold text-brand-dark">I have skills</span></div>
            <h2 className="font-display text-[26px] font-semibold">Suggest jobs for me</h2>
            <p className="text-[15px] leading-relaxed text-ink-2">Get jobs you can apply for now, jobs you are one or two skills away from, and what to learn for each.</p>
            <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-[#a5b4fc] bg-ground p-5 text-center">
              <Upload size={24} className="text-brand" aria-hidden="true" />
              <span className="text-[15px] font-semibold text-brand-dark">{busy ? "Reading your resume…" : "Upload your resume"}</span>
              <span className="text-[13px] text-ink-2">PDF or DOCX, up to 5 MB. Read once, never stored.</span>
              <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" disabled={busy} className="max-w-full text-[13px]" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink-2">
              Or type your skills, separated by commas
              <input className={`${inputClass} font-mono text-sm`} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="sql, python, excel, tableau" />
            </label>
            {profile.skills.length > 0 && !typed && (
              <p className="text-[13px] text-ink-2">Saved from last time: {profile.skills.slice(0, 6).join(", ")}{profile.skills.length > 6 ? "…" : ""}</p>
            )}
            <button type="button" className={buttonPrimary} onClick={onSuggest} disabled={busy}>
              <Sparkles size={18} aria-hidden="true" /> Get job suggestions
            </button>
          </section>

          <section className="flex min-w-0 flex-[1_1_420px] flex-col gap-4 rounded-[20px] border border-line bg-white p-7">
            <div className="flex items-center gap-3"><IconTile icon={Target} tone="amber" size={44} /><span className="text-sm font-semibold text-amber-ink">I know the job I want</span></div>
            <h2 className="font-display text-[26px] font-semibold">Build my roadmap</h2>
            <p className="text-[15px] leading-relaxed text-ink-2">Pick a job. See how ready you are today and a step-by-step plan of skills to learn, in the order that helps most.</p>
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink-2">
              Dream job
              <select className={inputClass} value={chosenRole} onChange={(e) => setRole(e.target.value)} disabled={!roles.data}>
                {roles.loading && <option>Loading jobs…</option>}
                {roles.data?.map((r) => <option key={r.role} value={r.role}>{r.role}</option>)}
              </select>
            </label>
            <ul className="flex flex-col gap-2.5 text-sm text-[#344054]">
              <li className="flex items-center gap-2.5"><Target size={18} className="text-brand" aria-hidden="true" />Readiness score for that job</li>
              <li className="flex items-center gap-2.5"><Code2 size={18} className="text-brand" aria-hidden="true" />Skills to learn, stage by stage, with a practice project each</li>
              <li className="flex items-center gap-2.5"><Route size={18} className="text-brand" aria-hidden="true" />Other jobs your skills lead to</li>
            </ul>
            <Link href={chosenRole ? `/roadmap?role=${encodeURIComponent(chosenRole)}` : "/roadmap"} className={`${buttonPrimary} mt-auto`}>
              <MapIcon size={18} aria-hidden="true" /> Build my roadmap
            </Link>
          </section>
        </div>

        <section aria-labelledby="how">
          <h2 id="how" className="mb-4 text-xl font-semibold">How it works</h2>
          <ol className="flex flex-wrap gap-4">
            {[
              { icon: FileText, n: "01", t: "Tell us your skills", d: "Upload a resume or type your skills. You can fix anything we read wrong." },
              { icon: Sparkles, n: "02", t: "See where you stand", d: "Matching jobs with a match score, the skills you have and the ones you are missing, all based on real postings." },
              { icon: MapIcon, n: "03", t: "Follow your roadmap", d: "Learn skills in the order that raises your chances most, with a practice project for each stage." },
            ].map((s) => (
              <li key={s.n} className="flex-[1_1_260px] rounded-2xl border border-line bg-white p-5">
                <div className="flex items-center justify-between"><IconTile icon={s.icon} /><span className="font-mono text-[13px] font-medium text-[#a5b4fc]">{s.n}</span></div>
                <h3 className="mb-1.5 mt-3.5 font-semibold">{s.t}</h3>
                <p className="text-sm leading-relaxed text-ink-2">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="more">
          <h2 id="more" className="mb-4 text-xl font-semibold">Also in JobIntel</h2>
          <div className="flex flex-wrap gap-4">
            {[
              { href: "/resume", icon: FileText, t: "Resume Analysis", d: "Your skills compared one by one with any job." },
              { href: "/insights", icon: BarChart3, t: "Market Dashboard", d: "Top skills, jobs and salaries across all postings." },
              { href: "/trends", icon: TrendingUp, t: "Skill Trends", d: "Which skills are rising or falling, with forecasts." },
            ].map((c) => (
              <Link key={c.href} href={c.href} className="flex flex-[1_1_240px] items-start gap-3 rounded-2xl border border-line bg-white px-5 py-[18px] text-ink hover:border-brand">
                <IconTile icon={c.icon} />
                <span><span className="block text-[15px] font-semibold">{c.t}</span><span className="mt-1 block text-[13px] leading-normal text-ink-2">{c.d}</span></span>
              </Link>
            ))}
          </div>
        </section>
        <footer className="text-center font-mono text-[11px] text-muted">built with python · pandas · fastapi · next.js</footer>
      </main>
    </div>
  );
}
