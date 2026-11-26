"use client";

// The link in the password-reset email opens this page; Supabase signs the person in
// from the link, then they choose a new password.

import Link from "next/link";
import { useState } from "react";
import { friendlyAuthError, supabase, useAuth } from "@/lib/auth";
import { ErrorBox, Loading, buttonPrimary, inputClass, linkClass } from "@/components/ui";

export default function ResetPasswordPage() {
  const { ready, session } = useAuth();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!ready) return <Loading />;
  if (done) {
    return (
      <div className="max-w-md">
        <h1 className="text-[28px] font-semibold">Password changed</h1>
        <p className="mt-2 text-ink-2">You&apos;re logged in with your new password.</p>
        <Link href="/account" className={`${buttonPrimary} mt-5`}>Go to my account</Link>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="max-w-md">
        <h1 className="text-[28px] font-semibold">This link has expired</h1>
        <p className="mt-2 text-ink-2">Reset links work once and for a limited time. Ask for a new one from the log-in page.</p>
        <Link href="/login" className={`${linkClass} mt-4 inline-block`}>Back to log in</Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase()!.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(friendlyAuthError(error.message));
    else setDone(true);
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-md">
      <h1 className="text-[28px] font-semibold">Choose a new password</h1>
      <label className="mt-6 block text-[15px] font-medium">
        New password
        <input type="password" className={`${inputClass} mt-2`} value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required autoComplete="new-password" />
      </label>
      {error && <div className="mt-4"><ErrorBox message={error} /></div>}
      <button type="submit" className={`${buttonPrimary} mt-6 w-full`} disabled={busy}>{busy ? "Saving…" : "Save new password"}</button>
    </form>
  );
}
