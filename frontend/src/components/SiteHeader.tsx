"use client";

// Top bar: wordmark, the main sections, settings and account.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";
import { accountsEnabled, displayName, useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/profile";
import { Logo } from "./Logo";

const NAV = [
  { href: "/discover", label: "Discover" },
  { href: "/suggestions", label: "Jobs" },
  { href: "/resume", label: "Resume check" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/applications", label: "Applications" },
  { href: "/insights", label: "Market" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { session } = useAuth();
  const apps = useProfile().applications?.length ?? 0;
  const active = (href: string) => pathname === href || (href === "/insights" && pathname === "/trends") || (href === "/discover" && pathname.startsWith("/careers"));

  return (
    <header className="no-print sticky top-0 z-40 border-b border-line bg-ground/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-8 px-5 sm:px-8">
        <Link href="/" aria-label="JobIntel home" className="py-4"><Logo /></Link>
        <nav aria-label="Main" className="order-3 -mx-2 flex w-full gap-1 overflow-x-auto pb-2 sm:order-none sm:w-auto sm:flex-1 sm:pb-0">
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
              className={`relative inline-flex h-10 flex-none items-center px-2.5 text-[14.5px] ${active(href) ? "font-medium text-ink after:absolute after:inset-x-2.5 after:-bottom-[9px] after:h-0.5 after:rounded after:bg-accent sm:after:-bottom-[13px]" : "text-ink-2 hover:text-ink"}`}>
              {label}
              {href === "/applications" && apps > 0 && <span className="ml-1.5 text-[13px] text-muted">{apps}</span>}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          <Link href="/settings" aria-label="Settings" className={`grid size-10 place-items-center rounded-xl hover:bg-surface-2 ${pathname === "/settings" ? "text-accent" : "text-ink-2"}`}>
            <Settings size={19} aria-hidden="true" />
          </Link>
          {accountsEnabled && (session ? (
            <Link href="/account" className="inline-flex h-10 items-center gap-2 rounded-xl px-2 text-[14.5px] text-ink hover:bg-surface-2">
              <span className="grid size-7 place-items-center rounded-full bg-accent-soft text-[13px] font-medium uppercase text-accent" aria-hidden="true">{displayName(session).slice(0, 1)}</span>
              <span className="hidden max-w-28 truncate md:inline">{displayName(session)}</span>
            </Link>
          ) : (
            <Link href="/login" className="inline-flex h-9 items-center rounded-xl border border-line px-3.5 text-[14.5px] font-medium hover:border-muted">Log in</Link>
          ))}
        </div>
      </div>
    </header>
  );
}
