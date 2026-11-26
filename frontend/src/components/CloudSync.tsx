"use client";

// Keeps the browser's profile and the account's saved copy in step.
// - On log in: download the saved copy and merge it with what's in this browser.
// - After that: every change is uploaded (a second after the last edit).
// Nothing happens for guests or when accounts are switched off.

import { useEffect, useRef } from "react";
import { supabase, useAuth } from "@/lib/auth";
import { setTheme } from "@/lib/theme";
import { getProfile, setProfile, uniqueSkills, useProfile, type Application, type Profile } from "@/lib/profile";

function merge(cloud: Profile, local: Profile): Profile {
  const apps = new Map<string, Application>();
  for (const a of [...(local.applications ?? []), ...(cloud.applications ?? [])]) apps.set(a.id, a); // cloud wins per item
  const newer = (cloud.updatedAt ?? 0) >= (local.updatedAt ?? 0) ? cloud : local;
  return {
    ...newer,
    skills: uniqueSkills([...(cloud.skills ?? []), ...(local.skills ?? [])]),
    learned: uniqueSkills([...(cloud.learned ?? []), ...(local.learned ?? [])]),
    discovery: newer.discovery ?? cloud.discovery ?? local.discovery,
    applications: [...apps.values()].sort((a, b) => b.date.localeCompare(a.date)),
    source: newer.source ?? cloud.source ?? local.source ?? null,
  };
}

export function CloudSync() {
  const { session } = useAuth();
  const profile = useProfile();
  const userId = session?.user.id ?? null;
  const pulledFor = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. pull + merge once per login
  useEffect(() => {
    const sb = supabase();
    if (!sb || !userId || pulledFor.current === userId) return;
    let alive = true;
    (async () => {
      const { data, error } = await sb.from("profiles").select("data").eq("id", userId).maybeSingle();
      if (!alive || error) return;
      const local = getProfile();
      const merged = data?.data ? merge(data.data as Profile, local) : local;
      pulledFor.current = userId;
      setProfile({ ...merged, updatedAt: Date.now() }, { fromCloud: true });
      if (merged.theme) setTheme(merged.theme, { save: false });
      await sb.from("profiles").upsert({ id: userId, data: { ...merged, updatedAt: Date.now() }, updated_at: new Date().toISOString() });
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  // 2. push changes
  useEffect(() => {
    const sb = supabase();
    if (!sb || !userId || pulledFor.current !== userId) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      sb.from("profiles").upsert({ id: userId, data: profile, updated_at: new Date().toISOString() }).then(() => undefined);
    }, 1000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [profile, userId]);

  // forget the login when it ends, so the next person on this computer starts fresh
  useEffect(() => {
    if (!userId) pulledFor.current = null;
  }, [userId]);

  return null;
}
