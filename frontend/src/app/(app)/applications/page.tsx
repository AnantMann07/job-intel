"use client";

import Link from "next/link";
import { removeApplication, setNote, setStatus, STATUS_LABEL } from "@/lib/apply";
import { accountsEnabled, useAuth } from "@/lib/auth";
import { useProfile, type ApplicationStatus } from "@/lib/profile";
import { ApplyButton } from "@/components/Apply";
import { PageHeader, buttonPrimary, inputClass, linkClass } from "@/components/ui";

const ORDER: ApplicationStatus[] = ["saved", "applied", "interview", "offer", "rejected"];
const STATUS_BG: Record<ApplicationStatus, string> = {
  saved: "card", applied: "card", interview: "card", offer: "card ring-1 ring-sage-ink/30", rejected: "card opacity-70",
};

export default function ApplicationsPage() {
  const apps = useProfile().applications ?? [];
  const { session } = useAuth();
  const counts = ORDER.map((s) => [s, apps.filter((a) => a.status === s).length] as const).filter(([, n]) => n > 0);

  return (
    <>
      <PageHeader
        tone="sky"
        title="My applications"
        subtitle={apps.length ? counts.map(([s, n]) => `${n} ${STATUS_LABEL[s].toLowerCase()}`).join(", ") + "." : "Keep track of the jobs and internships you go for."}
      />
      {accountsEnabled && !session && apps.length > 0 && (
        <p className="card p-6.5 text-[15px] font-semibold text-ink-2">
          This list is saved in this browser only. <Link href="/login" className={linkClass}>Log in or sign up</Link> to keep it on any device.
        </p>
      )}
      {apps.length === 0 ? (
        <div className="max-w-xl card p-6">
          <p className="text-xl font-semibold">Nothing here yet</p>
          <p className="mt-1.5 text-ink-2">Press Apply on any job. When you open its listings, the job is saved here and you can mark how it&apos;s going.</p>
          <Link href="/suggestions" className={`${buttonPrimary} mt-5`}>See jobs for you</Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {apps.map((a) => (
            <li key={a.id} className={`grid gap-4 rounded-2xl p-6 md:grid-cols-[minmax(0,1.4fr)_180px_minmax(0,1fr)_auto] md:items-center ${STATUS_BG[a.status]}`}>
              <div className="min-w-0">
                <p className="text-[20px] font-semibold leading-tight">{a.role}</p>
                <p className="mt-1 text-sm text-ink-2">
                  {a.kind === "internship" ? "Internship" : "Job"} in {a.location}
                  {a.site ? `, opened on ${a.site}` : ""}. Added {new Date(a.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}.
                </p>
              </div>
              <label className="text-sm text-ink-2">
                <span className="sr-only">Status for {a.role}</span>
                <select className={`${inputClass} ${a.status === "offer" ? "font-medium text-mint-ink" : a.status === "rejected" ? "text-muted" : ""}`}
                  value={a.status} onChange={(e) => setStatus(a.id, e.target.value as ApplicationStatus)}>
                  {ORDER.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </label>
              <label className="text-sm text-ink-2">
                <span className="sr-only">Note for {a.role}</span>
                <input className={inputClass} placeholder="Note, e.g. company or interview date" defaultValue={a.note ?? ""} onBlur={(e) => setNote(a.id, e.target.value)} />
              </label>
              <div className="flex items-center gap-1">
                <ApplyButton role={a.role} variant="secondary" />
                <button type="button" onClick={() => removeApplication(a.id)} className="min-h-11 rounded-full px-4 text-[15px] font-medium text-ink-2 hover:bg-paper/70 hover:text-ink">
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
