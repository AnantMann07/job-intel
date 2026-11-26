"use client";

// Layout for every page except Home: the top bar, a "waking up" note while the free API
// server starts, and whether the data is the fake sample.

import { Suspense, createContext, useContext, useEffect, useState } from "react";
import { getHealth } from "@/lib/api";
import { SiteHeader } from "./SiteHeader";

type ApiState = "checking" | "waking" | "online" | "offline";
const DataInfo = createContext<{ isSample: boolean; api: ApiState }>({ isSample: false, api: "checking" });
export const useDataInfo = () => useContext(DataInfo);

export function AppShell({ children }: { children: React.ReactNode }) {
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
      <Suspense fallback={<div className="h-[57px] border-b border-line" />}>
        <SiteHeader />
      </Suspense>
      <main className="mx-auto max-w-[1120px] px-5 pb-28 pt-10 sm:px-8">
        {info.api === "waking" && (
          <p className="no-print mb-6 card p-6.5 text-[15px] font-semibold text-sky-ink" role="status">
            Starting the server. The free hosting sleeps when nobody is using it, so the first visit can take up to a minute.
          </p>
        )}
        {info.api === "offline" && (
          <p className="no-print mb-6 card p-6.5 text-[15px] font-semibold text-peach-ink" role="alert">
            Can&apos;t reach the server. If you&apos;re running JobIntel on your computer, start the API with{" "}
            <code>uvicorn app.main:app --reload</code> in the backend folder.
          </p>
        )}
        <div className="flex flex-col gap-10">{children}</div>
      </main>
    </DataInfo.Provider>
  );
}
