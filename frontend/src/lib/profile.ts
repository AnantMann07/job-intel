"use client";

// The user's profile (their skills) is shared by every page and saved in the browser
// (localStorage), so a resume uploaded on Home is still there on Suggestions and Roadmap.
// useSyncExternalStore keeps all pages in sync and avoids hydration mismatches.

import { useSyncExternalStore } from "react";

export type Profile = {
  skills: string[];
  source: "resume" | "typed" | null;
  filename?: string | null;
  currentRole?: string | null;
};

const KEY = "jobintel.profile.v1";
const EMPTY: Profile = { skills: [], source: null };
let memory: Profile = EMPTY; // used if localStorage is blocked
let cache: { raw: string | null; value: Profile } = { raw: null, value: EMPTY };
const listeners = new Set<() => void>();

function read(): Profile {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return memory;
  }
  if (raw === cache.raw) return cache.value;
  let value = EMPTY;
  try {
    value = raw ? { ...EMPTY, ...(JSON.parse(raw) as Profile) } : EMPTY;
  } catch {
    value = EMPTY;
  }
  cache = { raw, value };
  return value;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  const onStorage = (e: StorageEvent) => e.key === KEY && callback();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function setProfile(profile: Profile) {
  const clean: Profile = { ...profile, skills: uniqueSkills(profile.skills) };
  memory = clean;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(clean));
  } catch {
    /* private mode: keep it in memory */
  }
  listeners.forEach((l) => l());
}

export function useProfile(): Profile {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function uniqueSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of skills) {
    const k = s.trim().toLowerCase();
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

/** "SQL, python;Excel" -> ["sql", "python", "excel"] */
export function parseSkillText(text: string): string[] {
  return uniqueSkills(text.split(/[,;\n]/));
}
