"use client";

// Accounts (sign up / log in) use Supabase. The site works without accounts: if the two
// NEXT_PUBLIC_SUPABASE_* settings are missing, `accountsEnabled` is false and the login
// links are hidden. The publishable key is meant to be public; Row Level Security in the
// database (supabase/schema.sql) makes sure each person can only read their own data.

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const accountsEnabled = Boolean(URL && KEY);

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient | null {
  if (!accountsEnabled || typeof window === "undefined") return null;
  client ??= createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}

// ---- the current session, shared by every component ----
type AuthState = { ready: boolean; session: Session | null };
let state: AuthState = { ready: !accountsEnabled, session: null };
const listeners = new Set<() => void>();
let started = false;

function start() {
  const sb = supabase();
  if (started || !sb) return;
  started = true;
  sb.auth.getSession().then(({ data }) => emit({ ready: true, session: data.session }));
  sb.auth.onAuthStateChange((_event, session) => emit({ ready: true, session }));
}

function emit(next: AuthState) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  start();
  return () => listeners.delete(callback);
}

const SERVER_STATE: AuthState = { ready: false, session: null };

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
}

export function displayName(session: Session | null): string {
  const meta = session?.user.user_metadata as { name?: string } | undefined;
  return meta?.name?.trim() || session?.user.email?.split("@")[0] || "";
}

/** Plain-language versions of Supabase's error messages. */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That email and password don't match an account. Check them, or sign up.";
  if (m.includes("already registered") || m.includes("already exists")) return "There's already an account with this email. Log in instead.";
  if (m.includes("password") && m.includes("6")) return "Use a password with at least 6 characters.";
  if (m.includes("email not confirmed")) return "Confirm your email first: open the link we sent you, then log in.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Wait a minute and try again.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Can't reach the account server. Check your internet connection.";
  return message;
}
