// "Apply" links. Our postings are from 2023 and closed, so Apply opens LIVE listings
// for the same job (or internship) on the big job sites, already searched for you.

import { updateProfile, type Application, type ApplicationStatus } from "./profile";

export type Kind = "job" | "internship";
export type Site = { id: string; name: string; note: string; url: string };

const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const isCountryWide = (loc: string) => !loc.trim() || /^(india|anywhere|all india)$/i.test(loc.trim());

export function sitesFor(role: string, kind: Kind, location: string): Site[] {
  const loc = location.trim();
  const q = kind === "internship" ? `${role} intern` : role;
  const sites: Site[] = [
    {
      id: "linkedin",
      name: "LinkedIn",
      note: kind === "internship" ? "Internships, filtered by experience level" : "Largest number of listings",
      url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(role)}&location=${encodeURIComponent(loc || "India")}${kind === "internship" ? "&f_E=1" : ""}`,
    },
    {
      id: "indeed",
      name: "Indeed",
      note: "Many company career pages in one place",
      url: `https://in.indeed.com/jobs?q=${encodeURIComponent(q)}${isCountryWide(loc) ? "" : `&l=${encodeURIComponent(loc)}`}`,
    },
  ];
  if (kind === "job") {
    sites.push({
      id: "naukri",
      name: "Naukri",
      note: "Most used by Indian employers",
      url: `https://www.naukri.com/${slug(role)}-jobs${isCountryWide(loc) ? "" : `-in-${slug(loc)}`}`,
    });
  }
  sites.push({
    id: "internshala",
    name: "Internshala",
    note: kind === "internship" ? "Best for student internships" : "Fresher jobs",
    url: `https://internshala.com/${kind === "internship" ? "internships" : "jobs"}/keywords-${slug(role)}/`,
  });
  return sites;
}

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Not selected",
};

export const appId = (role: string, kind: Kind) => `${role.toLowerCase()}|${kind}`;
const today = () => new Date().toISOString().slice(0, 10);

/** Add the job to My applications (or update where it was opened). Keeps an existing status. */
export function track(role: string, kind: Kind, location: string, site: string, status?: ApplicationStatus) {
  updateProfile((p) => {
    const list = p.applications ?? [];
    const id = appId(role, kind);
    const old = list.find((a) => a.id === id);
    const next: Application = {
      id, role, kind, location: location.trim() || "India", site,
      date: old?.date ?? today(),
      status: status ?? old?.status ?? "saved",
      note: old?.note,
    };
    return { ...p, applications: [next, ...list.filter((a) => a.id !== id)] };
  });
}

export function setStatus(id: string, status: ApplicationStatus) {
  updateProfile((p) => ({ ...p, applications: (p.applications ?? []).map((a) => (a.id === id ? { ...a, status } : a)) }));
}

export function setNote(id: string, note: string) {
  updateProfile((p) => ({ ...p, applications: (p.applications ?? []).map((a) => (a.id === id ? { ...a, note } : a)) }));
}

export function removeApplication(id: string) {
  updateProfile((p) => ({ ...p, applications: (p.applications ?? []).filter((a) => a.id !== id) }));
}

const LOC_KEY = "jobintel.location";
export function savedLocation(): string {
  try {
    return window.localStorage.getItem(LOC_KEY) ?? "India";
  } catch {
    return "India";
  }
}
export function rememberLocation(loc: string) {
  try {
    window.localStorage.setItem(LOC_KEY, loc);
  } catch {
    /* ignore */
  }
}
