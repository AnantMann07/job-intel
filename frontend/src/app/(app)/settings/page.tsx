"use client";

import Link from "next/link";
import { useState } from "react";
import { accountsEnabled, useAuth } from "@/lib/auth";
import { clearProfile } from "@/lib/profile";
import { setTheme, useTheme, type ThemeChoice } from "@/lib/theme";
import { PageHeader, buttonSecondary, linkClass } from "@/components/ui";

const THEMES: { id: ThemeChoice; label: string; note: string }[] = [
  { id: "light", label: "Light", note: "Always light" },
  { id: "dark", label: "Dark", note: "Always dark" },
  { id: "system", label: "System", note: "Follow your device" },
];

export default function SettingsPage() {
  const theme = useTheme();
  const { session } = useAuth();
  const [cleared, setCleared] = useState(false);

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" />
      <section className="mt-8 border-t border-line pt-8">
        <h2 className="text-[18px] font-semibold">Appearance</h2>
        <p className="mt-1 text-[15px] text-ink-2">{session ? "Saved to your account." : "Saved on this device."}</p>
        <div role="radiogroup" aria-label="Theme" className="mt-4 grid gap-2 sm:grid-cols-3">
          {THEMES.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={theme === t.id} onClick={() => setTheme(t.id)}
              className={`rounded-xl border px-4 py-3 text-left ${theme === t.id ? "border-accent bg-accent-soft" : "border-line bg-paper hover:border-muted"}`}>
              <span className="block text-[15px] font-medium">{t.label}</span>
              <span className="block text-[13px] text-muted">{t.note}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="mt-10 border-t border-line pt-8">
        <h2 className="text-[18px] font-semibold">Account</h2>
        {!accountsEnabled ? (
          <p className="mt-1 text-[15px] text-ink-2">Accounts aren&apos;t switched on for this site. Everything is saved on this device.</p>
        ) : session ? (
          <p className="mt-1 text-[15px] text-ink-2">Logged in as {session.user.email}. <Link href="/account" className={linkClass}>Manage account</Link></p>
        ) : (
          <p className="mt-1 text-[15px] text-ink-2"><Link href="/login" className={linkClass}>Log in or sign up</Link> to keep your skills, careers and applications on any device.</p>
        )}
      </section>
      <section className="mt-10 border-t border-line pt-8">
        <h2 className="text-[18px] font-semibold">Your data on this device</h2>
        <p className="mt-1 text-[15px] text-ink-2">Removes your skills, Discovery answers, route progress and applications from this browser.</p>
        <button type="button" className={`${buttonSecondary} mt-4`} onClick={() => { clearProfile(); setCleared(true); }}>Clear my data</button>
        {cleared && <p className="mt-3 text-[14px] text-sage-ink" role="status">Cleared.</p>}
      </section>
    </div>
  );
}
