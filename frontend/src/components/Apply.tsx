"use client";

// "Apply" button + dialog: pick job or internship and a city, then open live listings on
// LinkedIn, Indeed, Naukri or Internshala. The job is added to My applications.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { appId, rememberLocation, savedLocation, sitesFor, track, STATUS_LABEL, type Kind } from "@/lib/apply";
import { useProfile } from "@/lib/profile";
import { buttonPrimary, buttonSecondary, inputClass } from "./ui";

export function ApplyButton({ role, variant = "primary", className = "" }: { role: string; variant?: "primary" | "secondary"; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${variant === "primary" ? buttonPrimary : buttonSecondary} ${className}`}>
        Apply
      </button>
      {open && <ApplyDialog role={role} onClose={() => setOpen(false)} />}
    </>
  );
}

function ApplyDialog({ role, onClose }: { role: string; onClose: () => void }) {
  const [kind, setKind] = useState<Kind>("job");
  const [location, setLocation] = useState(savedLocation);
  const apps = useProfile().applications ?? [];
  const current = apps.find((a) => a.id === appId(role, kind));
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.querySelector<HTMLElement>("button, input")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sites = sitesFor(role, kind, location);

  return (
    <div className="no-print fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="apply-title" className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-paper p-7 sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="apply-title" className="text-[20px] font-semibold leading-tight">Apply for {role}</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">
              The postings JobIntel learned from are from 2023 and have closed. These links open today&apos;s openings for the same work.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 flex-none place-items-center rounded-full bg-line-soft text-ink-2 hover:text-ink">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-4">
          <fieldset>
            <legend className="mb-1.5 text-sm text-ink-2">Looking for</legend>
            <div className="inline-flex rounded-xl bg-surface-2 p-1">
              {(["job", "internship"] as Kind[]).map((k) => (
                <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
                  className={`min-h-9 rounded-lg px-4 text-[15px] font-medium ${kind === k ? "bg-paper text-ink shadow-sm" : "text-ink-2 hover:text-ink"}`}>
                  {k === "job" ? "A job" : "An internship"}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="min-w-0 flex-1 text-sm text-ink-2">
            City
            <input className={`${inputClass} mt-1.5`} value={location} onChange={(e) => setLocation(e.target.value)} onBlur={() => rememberLocation(location)} placeholder="e.g. Bengaluru, or India" />
          </label>
        </div>

        <ul className="mt-4">
          {sites.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-4 border-b border-line-soft py-3 last:border-0">
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-sm text-ink-2">{s.note}</div>
              </div>
              <a href={s.url} target="_blank" rel="noopener noreferrer" onClick={() => { rememberLocation(location); track(role, kind, location, s.name); }}
                className={`${buttonSecondary} min-h-10 flex-none px-4 text-sm`}>
                Open listings <ExternalLink size={15} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {current?.status === "applied" || (current && current.status !== "saved") ? (
            <p className="text-sm text-ink-2">In <Link href="/applications" className="font-medium text-lavender-ink underline underline-offset-4">My applications</Link> as {STATUS_LABEL[current.status].toLowerCase()}.</p>
          ) : (
            <>
              <button type="button" className={buttonPrimary} onClick={() => { track(role, kind, location, current?.site ?? "", "applied"); }}>
                I&apos;ve applied
              </button>
              <span className="text-sm text-ink-2">
                {current ? <>Saved to <Link href="/applications" className="font-medium text-lavender-ink underline underline-offset-4">My applications</Link>.</> : "Opening a listing saves this job to My applications."}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
