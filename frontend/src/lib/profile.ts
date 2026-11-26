"use client";

// The user's profile (their skills) is shared by every page and saved in the browser
// (localStorage), so a resume uploaded on Home is still there on Suggestions and Roadmap.
// useSyncExternalStore keeps all pages in sync and avoids hydration mismatches.

import { useSyncExternalStore } from "react";

export type ApplicationStatus = "saved" | "applied" | "interview" | "offer" | "rejected";
export type Application = {
  id: string;
  role: string;
  kind: "job" | "internship";
  location: string;
  site: string;
  date: string; // YYYY-MM-DD, when it was added
  status: ApplicationStatus;
  note?: string;
};

export type Profile = {
  skills: string[];
  source: "resume" | "typed" | null;
  filename?: string | null;
  currentRole?: string | null;
  learned?: string[]; // skills ticked off on a roadmap (also in `skills`)
  applications?: Application[];
  theme?: "light" | "dark" | "system";
  discovery?: { answers: Record<string, string | string[]>; skills: string[]; saved: string[]; date: string };
  updatedAt?: number; // ms; decides which copy wins when syncing with an account
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

export function setProfile(profile: Profile, options: { fromCloud?: boolean } = {}) {
  const clean: Profile = {
    ...profile,
    skills: uniqueSkills(profile.skills),
    learned: uniqueSkills(profile.learned ?? []),
    updatedAt: options.fromCloud ? profile.updatedAt : Date.now(),
  };
  memory = clean;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(clean));
  } catch {
    /* private mode: keep it in memory */
  }
  listeners.forEach((l) => l());
}

/** The profile as it is right now (outside React). */
export function getProfile(): Profile {
  return typeof window === "undefined" ? EMPTY : read();
}

/** Change part of the profile, e.g. updateProfile((p) => ({ ...p, skills: [...p.skills, "sql"] })). */
export function updateProfile(change: (p: Profile) => Profile) {
  setProfile(change(getProfile()));
}

export function clearProfile() {
  setProfile({ ...EMPTY, updatedAt: 0 }, { fromCloud: true });
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

/** Save or unsave a career from Career Discovery. */
export function toggleSaved(id: string) {
  updateProfile((p) => {
    const d = p.discovery ?? { answers: {}, skills: [], saved: [], date: "" };
    const saved = d.saved.includes(id) ? d.saved.filter((x) => x !== id) : [...d.saved, id];
    return { ...p, discovery: { ...d, saved } };
  });
}

