"use client";

// Small building blocks shared by every page (see DESIGN.md for the look).

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CircleAlert, FlaskConical, LoaderCircle } from "lucide-react";

export function IconTile({ icon: Icon, tone = "indigo", size = 40 }: { icon: LucideIcon; tone?: "indigo" | "amber"; size?: number }) {
  const colors = tone === "amber" ? "bg-amber-soft text-amber-icon" : "bg-tint text-brand";
  return (
    <span className={`inline-flex flex-none items-center justify-center rounded-xl ${colors}`} style={{ width: size, height: size }}>
      <Icon size={Math.round(size / 2)} strokeWidth={1.8} aria-hidden="true" />
    </span>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-white p-6 sm:p-7 ${className}`}>{children}</section>;
}

export function CardTitle({ icon: Icon, children, tone = "indigo" }: { icon?: LucideIcon; children: React.ReactNode; tone?: "indigo" | "amber" }) {
  return (
    <h2 className="flex items-center gap-2 text-base font-semibold">
      {Icon && <Icon size={18} strokeWidth={1.8} className={tone === "amber" ? "text-amber-icon" : "text-brand"} aria-hidden="true" />}
      {children}
    </h2>
  );
}

export function SamplePill() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-soft px-2.5 py-1 font-mono text-xs text-amber-ink">
      <FlaskConical size={14} aria-hidden="true" /> sample data
    </span>
  );
}

export function PageHeader({ icon, title, subtitle, sample }: { icon: LucideIcon; title: string; subtitle?: React.ReactNode; sample?: boolean }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <IconTile icon={icon} size={44} />
        <div>
          <h1 className="font-display text-3xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-[15px] text-ink-2">{subtitle}</p>}
        </div>
      </div>
      {sample && <SamplePill />}
    </header>
  );
}

export function SkillPill({ children, tone = "indigo" }: { children: React.ReactNode; tone?: "indigo" | "amber" | "missing" | "grey" }) {
  const colors = {
    indigo: "bg-tint text-brand-dark",
    amber: "bg-amber-soft text-amber-ink",
    missing: "bg-miss-soft text-miss-ink",
    grey: "bg-[#f2f4f7] text-[#344054]",
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-xs ${colors}`}>{children}</span>;
}

export function Ring({ value, label, size = 112 }: { value: number; label: string; size?: number }) {
  const inner = size - 26;
  return (
    <div
      role="img"
      aria-label={`${value}% ${label}`}
      className="flex flex-none items-center justify-center rounded-full"
      style={{ width: size, height: size, background: `conic-gradient(var(--color-brand) 0 ${value}%, var(--color-tint) 0)` }}
    >
      <div className="flex flex-col items-center justify-center rounded-full bg-white" style={{ width: inner, height: inner }}>
        <span className="font-display text-2xl font-semibold">{value}%</span>
        <span className="text-[11px] text-ink-2">{label}</span>
      </div>
    </div>
  );
}

export function Bar({ value, max = 1, className = "h-2" }: { value: number; max?: number; className?: string }) {
  return (
    <span className={`block w-full rounded-full bg-tint ${className}`}>
      <span className={`block rounded-full bg-brand ${className}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </span>
  );
}

export function Loading({ text = "Loading…" }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-ink-2" role="status">
      <LoaderCircle size={18} className="animate-spin text-brand" aria-hidden="true" /> {text}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-sm text-[#912018]" role="alert">
      <CircleAlert size={18} className="mt-0.5 flex-none" aria-hidden="true" /> <span>{message}</span>
    </div>
  );
}

export function NeedSkills({ what }: { what: string }) {
  return (
    <Card className="text-center">
      <p className="text-base font-semibold">Add your skills first</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-2">Upload your resume or type your skills on the home page, and we&apos;ll show {what}.</p>
      <Link href="/" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark">
        Go to home
      </Link>
    </Card>
  );
}

export const buttonPrimary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60";
export const inputClass =
  "h-11 w-full rounded-xl border border-[#d0d5dd] bg-white px-3 text-[15px] text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-tint";
