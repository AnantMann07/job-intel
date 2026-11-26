"use client";

// Light / dark / system theme. Saved in this browser and, when logged in, in the account
// profile (profile.theme), so it follows the person to other devices.

import { useSyncExternalStore } from "react";
import { getProfile, updateProfile } from "./profile";

export type ThemeChoice = "light" | "dark" | "system";
const KEY = "jobintel.theme";
const listeners = new Set<() => void>();

export function readTheme(): ThemeChoice {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(choice: ThemeChoice) {
  const dark = choice === "dark" || (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export function setTheme(choice: ThemeChoice, options: { save?: boolean } = { save: true }) {
  try {
    window.localStorage.setItem(KEY, choice);
  } catch {
    /* ignore */
  }
  applyTheme(choice);
  if (options.save && getProfile().theme !== choice) updateProfile((p) => ({ ...p, theme: choice }));
  listeners.forEach((l) => l());
}

export function useTheme(): ThemeChoice {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const onSystem = () => readTheme() === "system" && applyTheme("system");
      mq.addEventListener("change", onSystem);
      return () => {
        listeners.delete(cb);
        mq.removeEventListener("change", onSystem);
      };
    },
    readTheme,
    () => "system",
  );
}

