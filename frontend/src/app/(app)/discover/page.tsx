"use client";

// Career Discovery: a few short questions (one per screen), then careers grouped as strong
// matches, hidden opportunities, emerging careers and alternative paths. Scoring happens on the
// server (/api/discover); answers are saved to the profile (and the account when logged in).

import Link from "next/link";
import { useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { discoverCareers, getDiscoverQuestions, uploadResume, type Answers, type CareerCard, type DiscoverOut } from "@/lib/api";
import { parseSkillText, toggleSaved, updateProfile, useProfile } from "@/lib/profile";
import { useAsync } from "@/lib/useAsync";
import { ErrorBox, Loading, PageHeader, buttonPrimary, buttonSecondary, inputClass, linkClass } from "@/components/ui";

const GROUPS: { key: keyof DiscoverOut["groups"]; title: string; sub: string }[] = [
  { key: "strong", title: "Strong matches", sub: "Closest to your interests, preferences and skills." },
  { key: "hidden", title: "Hidden opportunities", sub: "A good fit for what you enjoy, in a field you may not have considered." },
  { key: "emerging", title: "Emerging careers", sub: "In developing fields, or needing skills that are rising in job postings." },
  { key: "alternative", title: "Alternative paths", sub: "Reachable mainly through skills you already have, plus some learning." },
];

export default function DiscoverPage() {
  const profile = useProfile();
  const qs = useAsync("discover-questions", getDiscoverQuestions);
  const saved = profile.discovery;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(saved?.answers ?? {});
  const [skillText, setSkillText] = useState((saved?.skills?.length ? saved.skills : profile.skills).join(", "));
  const [result, setResult] = useState<DiscoverOut | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [surprise, setSurprise] = useState<{ n: number; card: CareerCard | null } | null>(null);

  if (qs.loading) return <Loading />;
  if (qs.error || !qs.data) return <ErrorBox message={qs.error ?? "Could not load the questions."} />;
  const questions = qs.data.questions;
  const total = questions.length + 1;

  const pick = (qid: string, oid: string, multi: boolean, max?: number) => {
    setAnswers((a) => {
      if (!multi) return { ...a, [qid]: oid };
      const cur = (a[qid] as string[] | undefined) ?? [];
      const next = cur.includes(oid) ? cur.filter((x) => x !== oid) : max && cur.length >= max ? cur : [...cur, oid];
      return { ...a, [qid]: next };
    });
  };
  const chosen = (qid: string, oid: string) => (Array.isArray(answers[qid]) ? (answers[qid] as string[]).includes(oid) : answers[qid] === oid);

  async function run(nextSurprise = 0) {
    setBusy(true);
    setError(null);
    try {
      const skills = parseSkillText(skillText);
      const out = await discoverCareers(answers, skills, nextSurprise);
      setResult(out);
      updateProfile((p) => ({ ...p, skills: p.skills.length ? p.skills : skills, source: p.source ?? (skills.length ? "typed" : null), discovery: { answers, skills, saved: p.discovery?.saved ?? [], date: new Date().toISOString().slice(0, 10) } }));
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const r = await uploadResume(file);
      setSkillText([...new Set([...parseSkillText(skillText), ...r.skills])].join(", "));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function nextSurprise() {
    const n = (surprise?.n ?? -1) + 1;
    const out = await discoverCareers(answers, parseSkillText(skillText), n);
    setSurprise({ n, card: out.surprise });
  }

  // ---------- results ----------
  if (result) {
    const savedIds = profile.discovery?.saved ?? [];
    return (
      <>
        <PageHeader title="Careers for you"
          subtitle={<>Based on your interest in {result.top_interests.join(" and ") || "a mix of things"}{result.skills_used.length ? `, and ${result.skills_used.length} skills and strengths` : ""}.</>}>
          <div className="flex gap-2">
            <button type="button" className={buttonSecondary} onClick={() => { setResult(null); setStep(0); }}>Change answers</button>
            <button type="button" className={buttonSecondary} onClick={nextSurprise}>Surprise me</button>
          </div>
        </PageHeader>
        {surprise?.card && (
          <section aria-live="polite" className="rounded-2xl border border-dashed border-accent/50 p-6">
            <p className="text-[13px] text-muted">Something different</p>
            <CareerRow c={surprise.card} saved={savedIds.includes(surprise.card.id)} />
            <button type="button" className={`${linkClass} mt-2 text-[14px]`} onClick={nextSurprise}>Show another</button>
          </section>
        )}
        {GROUPS.map((g) => result.groups[g.key].length > 0 && (
          <section key={g.key}>
            <h2 className="text-[20px] font-semibold">{g.title}</h2>
            <p className="mt-1 text-[15px] text-ink-2">{g.sub}</p>
            <ul className="mt-4 divide-y divide-line-soft border-y border-line-soft">
              {result.groups[g.key].map((c) => <li key={c.id}><CareerRow c={c} saved={savedIds.includes(c.id)} /></li>)}
            </ul>
          </section>
        ))}
        <p className="text-[14px] text-muted">
          Match combines your interests (45%), skills including transferable ones (35%), what and where you like to work (10%) and how structured you like it (10%).
          Careers marked &ldquo;curated profile&rdquo; are outside the 2023 job-postings data.
        </p>
      </>
    );
  }

  // ---------- questions ----------
  const q = questions[step];
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex items-center justify-between text-[14px] text-muted">
        <span>Step {step + 1} of {total}</span>
        {step === 0 && saved?.date && <button type="button" className={linkClass} onClick={() => run()}>See my last results</button>}
      </div>
      <div className="mt-2 h-1 rounded-full bg-line-soft"><div className="h-1 rounded-full bg-accent transition-all" style={{ width: `${((step + 1) / total) * 100}%` }} /></div>

      {step === 0 && <p className="mt-10 text-[15px] text-ink-2">Not sure what you want to do? Answer a few quick questions and we&apos;ll suggest careers that fit you, including some you may not have thought of.</p>}

      {q ? (
        <fieldset className={step === 0 ? "mt-6" : "mt-10"}>
          <legend className="text-[24px] font-semibold leading-tight">{q.title}</legend>
          <p className="mt-1.5 text-[15px] text-ink-2">{q.hint}</p>
          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {q.options.map((o) => (
              <button key={o.id} type="button" aria-pressed={chosen(q.id, o.id)} onClick={() => pick(q.id, o.id, q.multi, q.max)}
                className={`min-h-12 rounded-xl border px-4 py-3 text-left text-[15px] ${chosen(q.id, o.id) ? "border-accent bg-accent-soft text-ink" : "border-line bg-paper text-ink hover:border-muted"}`}>
                {o.label}
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <div className="mt-10">
          <h2 className="text-[24px] font-semibold leading-tight">Your skills and background</h2>
          <p className="mt-1.5 text-[15px] text-ink-2">All optional. Skills help us find transferable strengths.</p>
          <label className="mt-6 block text-[15px] font-medium">
            Skills you have
            <input className={`${inputClass} mt-2`} value={skillText} onChange={(e) => setSkillText(e.target.value)} placeholder="e.g. excel, python, figma, teaching" />
          </label>
          <p className="mt-2 text-[14px] text-ink-2">
            Or{" "}
            <label className={`${linkClass} cursor-pointer`}>
              {busy ? "reading…" : "add them from your resume"}
              <input type="file" accept=".pdf,.docx,.txt" className="sr-only" disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
          </p>
          <p className="mt-7 text-[15px] font-medium">What are you good at?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {qs.data.strengths.map((s) => (
              <button key={s} type="button" aria-pressed={chosen("strengths", s)} onClick={() => pick("strengths", s, true)}
                className={`h-9 rounded-lg border px-3 text-[14px] ${chosen("strengths", s) ? "border-accent bg-accent-soft" : "border-line bg-paper hover:border-muted"}`}>
                {s}
              </button>
            ))}
          </div>
          <label className="mt-7 block text-[15px] font-medium">
            Education
            <select className={`${inputClass} mt-2`} value={(answers.education as string) ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, education: e.target.value }))}>
              <option value="">Prefer not to say</option>
              {qs.data.education.map((e) => <option key={e}>{e}</option>)}
            </select>
          </label>
        </div>
      )}

      {error && <div className="mt-6"><ErrorBox message={error} /></div>}
      <div className="mt-10 flex items-center justify-between">
        <button type="button" className={buttonSecondary} onClick={() => setStep(step - 1)} disabled={step === 0}>Back</button>
        {q ? (
          <button type="button" className={buttonPrimary} onClick={() => setStep(step + 1)}>{answers[q.id] && (answers[q.id] as string[]).length !== 0 ? "Next" : "Skip"}</button>
        ) : (
          <button type="button" className={buttonPrimary} onClick={() => run()} disabled={busy}>{busy ? "Finding careers…" : "Show my careers"}</button>
        )}
      </div>
    </div>
  );
}

function CareerRow({ c, saved }: { c: CareerCard; saved: boolean }) {
  return (
    <div className="flex items-start gap-5 py-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <Link href={`/careers/${c.id}`} className="text-[17px] font-semibold hover:text-accent">{c.title}</Link>
          <span className="text-[13px] text-muted">{c.category}{c.source === "curated" ? ", curated profile" : ""}</span>
        </div>
        <p className="mt-1 text-[15px] text-ink-2">{c.reasons[0]}</p>
        {c.missing.length > 0 && <p className="mt-1 text-[14px] text-muted">To learn: {c.missing.slice(0, 3).join(", ")}</p>}
      </div>
      <div className="flex flex-none items-center gap-3">
        <span className="text-[17px] font-semibold tabular-nums">{c.match}%</span>
        <button type="button" onClick={() => toggleSaved(c.id)} aria-label={saved ? `Unsave ${c.title}` : `Save ${c.title}`} aria-pressed={saved}
          className={`grid size-9 place-items-center rounded-lg hover:bg-surface-2 ${saved ? "text-accent" : "text-muted"}`}>
          {saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
        </button>
        <Link href={`/careers/${c.id}`} className={`${buttonSecondary} h-9 px-3.5 text-[14px]`}>Explore</Link>
      </div>
    </div>
  );
}
