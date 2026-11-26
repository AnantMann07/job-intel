"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { accountsEnabled, friendlyAuthError, supabase, useAuth } from "@/lib/auth";
import { ErrorBox, buttonPrimary, inputClass, linkClass } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [resetNote, setResetNote] = useState<string | null>(null);

  async function forgot() {
    const sb = supabase();
    if (!sb) return;
    if (!email.trim()) return setError("Type your email above first, then press Forgot password.");
    setError(null);
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    if (error) setError(friendlyAuthError(error.message));
    else setResetNote(`If ${email.trim()} has an account, a reset link is on its way. Open it on this device.`);
  }

  if (!accountsEnabled) {
    return (
      <div className="max-w-md">
        <h1 className="text-[32px] font-semibold">Accounts aren&apos;t switched on yet</h1>
        <p className="mt-2 text-ink-2">You can use everything without an account; your skills and applications are saved in this browser.</p>
        <Link href="/" className={`${buttonPrimary} mt-5`}>Go to home</Link>
      </div>
    );
  }

  if (session) {
    return (
      <div className="max-w-md">
        <h1 className="text-[32px] font-semibold">You&apos;re logged in</h1>
        <p className="mt-2 text-ink-2">As {session.user.email}.</p>
        <Link href="/account" className={`${buttonPrimary} mt-5`}>Go to my account</Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sb = supabase();
    if (!sb) return;
    setBusy(true);
    setError(null);
    const result = mode === "login"
      ? await sb.auth.signInWithPassword({ email: email.trim(), password })
      : await sb.auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim() } } });
    setBusy(false);
    if (result.error) return setError(friendlyAuthError(result.error.message));
    if (!result.data.session) return setCheckEmail(true); // the project asks people to confirm their email first
    router.push("/account");
  }

  if (checkEmail) {
    return (
      <div className="max-w-md">
        <h1 className="text-[32px] font-semibold">Check your email</h1>
        <p className="mt-2 text-ink-2">We sent a link to {email}. Open it to confirm your account, then come back and log in.</p>
        <button type="button" className={`${linkClass} mt-4`} onClick={() => { setCheckEmail(false); setMode("login"); }}>Back to log in</button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md card p-6">
      <h1 className="text-[34px] font-semibold leading-tight">{mode === "login" ? "Log in" : "Create your account"}</h1>
      <p className="mt-2 text-ink-2">
        {mode === "login" ? "Pick up where you left off on any device." : "Keep your skills, route progress and applications on any device. It's free."}
      </p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        {mode === "signup" && (
          <label className="text-[15px] font-medium">
            Your name
            <input className={`${inputClass} mt-1.5`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          </label>
        )}
        <label className="text-[15px] font-medium">
          Email
          <input type="email" className={`${inputClass} mt-1.5`} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <label className="text-[15px] font-medium">
          Password
          <input type="password" className={`${inputClass} mt-1.5`} value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} required />
          {mode === "signup" && <span className="mt-1 block text-sm font-normal text-muted">At least 6 characters.</span>}
        </label>
        {mode === "login" && (
          <button type="button" onClick={forgot} className={`${linkClass} -mt-2 self-start text-[14px]`}>Forgot password?</button>
        )}
        {resetNote && <p className="text-[14px] text-sage-ink" role="status">{resetNote}</p>}
        {error && <ErrorBox message={error} />}
        <button type="submit" className={buttonPrimary} disabled={busy}>
          {busy ? (mode === "login" ? "Logging in…" : "Creating account…") : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-[15px] text-ink-2">
        {mode === "login" ? "New here? " : "Already have an account? "}
        <button type="button" className={linkClass} onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}>
          {mode === "login" ? "Create an account" : "Log in"}
        </button>
      </p>
      <p className="mt-2 text-sm text-muted">You can also use JobIntel without an account.</p>
    </div>
  );
}
