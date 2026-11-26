"use client";

// Sidebar layout for every page except Home. It also checks that the API is awake and
// tells pages whether the data is the fake sample (to show the "sample data" pill).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { BarChart3, FileText, House, Map as MapIcon, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";
import { getHealth } from "@/lib/api";
import { Logo } from "./Logo";

const NAV: { href: string; label: string; icon: LucideIcon }[][] = [
  [{ href: "/", label: "Home", icon: House }],
  [
    { href: "/suggestions", label: "Job Suggestions", icon: Sparkles },
    { href: "/resume", label: "Resume Analysis", icon: FileText },
    { href: "/roadmap", label: "My Roadmap", icon: MapIcon },
  ],
  [
    { href: "/insights", label: "Market Dashboard", icon: BarChart3 },
    { href: "/trends", label: "Skill Trends", icon: TrendingUp },
  ],
];

type ApiState = "checking" | "waking" | "online" | "offline";
const DataInfo = createContext<{ isSample: boolean; api: ApiState }>({ isSample: false, api: "checking" });
export const useDataInfo = () => useContext(DataInfo);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [info, setInfo] = useState<{ isSample: boolean; api: ApiState }>({ isSample: false, api: "checking" });

  useEffect(() => {
    let alive = true;
    const slow = setTimeout(() => alive && setInfo((i) => (i.api === "checking" ? { ...i, api: "waking" } : i)), 3000);
    getHealth().then(
      (h) => alive && setInfo({ isSample: !!h.is_sample, api: "online" }),
      () => alive && setInfo((i) => ({ ...i, api: "offline" })),
    ).finally(() => clearTimeout(slow));
    return () => {
      alive = false;
      clearTimeout(slow);
    };
  }, []);

  return (
    <DataInfo.Provider value={info}>
      <div className="flex min-h-screen flex-wrap">
        <aside className="flex-[1_1_232px] border-b border-line bg-white px-4 py-4 sm:border-b-0 sm:border-r sm:py-7">
          <Link href="/" className="flex items-center gap-2.5 px-2 text-ink" aria-label="JobIntel home">
            <Logo />
            <span className="font-display text-lg font-semibold">JobIntel</span>
          </Link>
          <nav aria-label="Main" className="mt-3 flex flex-row flex-wrap gap-0.5 sm:mt-6 sm:flex-col">
            {NAV.map((group, gi) => (
              <div key={gi} className="flex flex-row flex-wrap gap-0.5 sm:flex-col">
                {gi > 0 && <hr className="mx-3 my-2.5 hidden border-0 border-t border-[#eef0f5] sm:block" />}
                {group.map(({ href, label, icon: Icon }) => {
                  const on = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={on ? "page" : undefined}
                      className={`flex min-h-11 items-center gap-2 rounded-xl px-2.5 text-[13px] font-medium sm:gap-2.5 sm:px-3 sm:text-sm ${
                        on ? "bg-tint text-brand-dark" : "text-[#344054] hover:bg-[#f2f4f7] hover:text-ink"
                      }`}
                    >
                      <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                      {label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 max-w-[1240px] flex-[999_1_560px] px-6 py-10 sm:px-12">
          {info.api === "waking" && (
            <p className="mb-6 rounded-xl border border-[#c7d2fe] bg-tint px-4 py-3 text-sm text-brand-dark" role="status">
              Waking up the server. Free hosting sleeps when idle, so this can take up to a minute.
            </p>
          )}
          {info.api === "offline" && (
            <p className="mb-6 rounded-xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-sm text-[#912018]" role="alert">
              Can&apos;t reach the API. If you are running locally, start it with <code>uvicorn app.main:app --reload</code> in the
              backend folder.
            </p>
          )}
          <div className="flex flex-col gap-8">{children}</div>
        </main>
      </div>
    </DataInfo.Provider>
  );
}
