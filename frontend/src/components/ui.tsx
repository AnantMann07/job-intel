"use client";

// Shared building blocks. One look everywhere: white surfaces, thin borders, violet for actions,
// sage only for good news (skills you have). Type scale: page title 30/36, section 20, body 15-16.

import Link from "next/link";
import { LoaderCircle } from "lucide-react";

export type Tone = "lavender" | "peach" | "mint" | "sky" | "white";
export const TONES: Tone[] = ["white", "white", "white", "white"];
export const toneBg: Record<Tone, string> = { lavender: "card", peach: "card", mint: "card", sky: "card", white: "card" };
export const toneInk: Record<Tone, string> = { lavender: "text-muted", peach: "text-muted", mint: "text-muted", sky: "text-muted", white: "text-muted" };
export const toneDot: Record<Tone, string> = { lavender: "bg-accent", peach: "bg-accent", mint: "bg-accent", sky: "bg-accent", white: "bg-accent" };

export function Card({ children, className = "", as: Tag = "section" }: { children: React.ReactNode; className?: string; tone?: Tone; as?: "section" | "div" | "article" }) {
  return <Tag className={`card p-6 ${className}`}>{children}</Tag>;
}

export function PageHeader({ title, subtitle, sample, children }: { title: string; subtitle?: React.ReactNode; sample?: boolean; tone?: Tone; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-5 pb-2">
      <div className="max-w-2xl">
        <h1 className="text-[20px] font-semibold leading-tight tracking-[-0.01em] sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-2 text-[16px] leading-relaxed text-ink-2">{subtitle}</p>}
        {sample && <p className="mt-2 text-sm text-muted">Showing fake sample data, for testing only.</p>}
      </div>
      {children}
    </header>
  );
}

export function Skill({ name, state = "have", extra }: { name: string; state?: "have" | "learn" | "plain"; extra?: React.ReactNode }) {
  return (
    <span className="whitespace-nowrap text-[14px]">
      <span className={state === "have" ? "mark-have" : "mark-learn"}>{name}</span>
      {extra && <span className="ml-1.5 text-[13px] text-muted">{extra}</span>}
    </span>
  );
}

export function SkillList({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

/** Match % as a thin bar (kept for older call sites). */
export function MatchDots({ value }: { value: number; tone?: Tone }) {
  return <div className="w-28"><MatchMeter value={value} /></div>;
}

/** Match % as a thin bar with a notch at the 50% "fit" line. */
export function MatchMeter({ value, ready = 50 }: { value: number; ready?: number; tone?: Tone; size?: "sm" | "md" }) {
  return (
    <div className="relative h-1.5 w-full rounded-full bg-line-soft" role="img" aria-label={`${value}% match; ${ready}% counts as a fit`}>
      <div className="h-1.5 rounded-full bg-accent" style={{ width: `${Math.min(100, value)}%` }} />
      <span className="absolute -bottom-1 -top-1 w-px bg-muted" style={{ left: `${ready}%` }} aria-hidden="true" />
    </div>
  );
}

export function Bar({ value, max = 1 }: { value: number; max?: number; tone?: Tone; className?: string }) {
  return (
    <span className="block h-1.5 w-full rounded-full bg-line-soft">
      <span className="block h-1.5 rounded-full bg-accent" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </span>
  );
}

export function Loading({ text = "Loading…" }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-[15px] text-ink-2" role="status">
      <LoaderCircle size={18} className="animate-spin text-accent" aria-hidden="true" /> {text}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-[15px] text-ink" role="alert">{message}</p>;
}

export function NeedSkills({ what }: { what: string }) {
  return (
    <div className="max-w-lg py-6">
      <p className="text-lg font-semibold">First, tell us what you know</p>
      <p className="mt-1.5 text-ink-2">Add your skills or upload your resume, and we&apos;ll show {what}.</p>
      <Link href="/" className={`${buttonPrimary} mt-5`}>Add my skills</Link>
    </div>
  );
}

export const buttonPrimary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-[15px] font-medium text-on-accent hover:bg-brand-dark disabled:opacity-50";
export const buttonSecondary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-paper px-4 text-[15px] font-medium text-ink hover:border-muted disabled:opacity-50";
export const linkClass = "font-medium text-accent underline-offset-4 hover:underline";
export const inputClass =
  "h-11 w-full rounded-xl border border-line bg-paper px-3.5 text-[15px] text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft";
