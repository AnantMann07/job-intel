"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { accountsEnabled, displayName, supabase, useAuth } from "@/lib/auth";
import { clearProfile, useProfile } from "@/lib/profile";
import { Loading, PageHeader, Skill, SkillList, buttonPrimary, buttonSecondary, linkClass } from "@/components/ui";

export default function AccountPage() {
  const router = useRouter();
  const { ready, session } = useAuth();
  const profile = useProfile();

  if (!accountsEnabled) {
    return <PageHeader title="Accounts aren't switched on yet" subtitle="Everything you do is saved in this browser." />;
  }
  if (!ready) return <Loading />;
  if (!session) {
    return (
      <div className="max-w-md">
        <h1 className="text-[32px] font-semibold">You&apos;re not logged in</h1>
        <p className="mt-2 text-ink-2">Log in to keep your skills, route progress and applications on any device.</p>
        <Link href="/login" className={`${buttonPrimary} mt-5`}>Log in or sign up</Link>
      </div>
    );
  }

  async function signOut() {
    await supabase()?.auth.signOut();
    clearProfile(); // so the next person on this computer starts fresh
    router.push("/");
  }

  const apps = profile.applications ?? [];
  const learned = profile.learned ?? [];

  return (
    <>
      <PageHeader title={`Hi, ${displayName(session)}`} subtitle={`Logged in as ${session.user.email}. Your profile is saved to your account as you go.`}>
        <button type="button" className={buttonSecondary} onClick={signOut}>Log out</button>
      </PageHeader>
      <div className="grid gap-5 md:grid-cols-3">
        <section className="card p-6">
          <h2 className="text-[20px] font-semibold">Skills</h2>
          <p className="mt-1 text-sm text-ink-2">{profile.skills.length} saved{profile.filename ? `, from ${profile.filename}` : ""}.</p>
          <div className="mt-3"><SkillList>{profile.skills.slice(0, 18).map((s) => <Skill key={s} name={s} state="have" />)}</SkillList></div>
          <Link href="/resume" className={`${linkClass} mt-3 inline-block text-[15px]`}>Edit skills</Link>
        </section>
        <section className="card p-6">
          <h2 className="text-[20px] font-semibold">Learned on a route</h2>
          <p className="mt-1 text-sm text-ink-2">{learned.length ? `${learned.length} ${learned.length === 1 ? "skill" : "skills"} ticked off.` : "Nothing ticked yet."}</p>
          <div className="mt-3"><SkillList>{learned.map((s) => <Skill key={s} name={s} state="have" />)}</SkillList></div>
          <Link href="/roadmap" className={`${linkClass} mt-3 inline-block text-[15px]`}>Open my route</Link>
        </section>
        <section className="card p-6">
          <h2 className="text-[20px] font-semibold">Applications</h2>
          <p className="mt-1 text-sm text-ink-2">{apps.length ? `${apps.length} tracked, ${apps.filter((a) => a.status !== "saved").length} applied or further.` : "None yet."}</p>
          <ul className="mt-3 space-y-1 text-[15px]">{apps.slice(0, 5).map((a) => <li key={a.id}>{a.role} <span className="text-muted">({a.kind})</span></li>)}</ul>
          <Link href="/applications" className={`${linkClass} mt-3 inline-block text-[15px]`}>See all applications</Link>
        </section>
      </div>
    </>
  );
}
