"use client";

// "Ask JobIntel": a chat button on every page. It sends the question, the user's skills and
// the last few messages to /api/assistant/chat. The backend finds the facts in our data and
// (if a Gemini key is set) lets the AI phrase the answer; otherwise it answers from templates.

import Link from "next/link";
import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowUpRight, MessageCircle, SendHorizontal, X } from "lucide-react";
import { askAssistant, getAssistantStatus, type AssistantOut, type AssistantTurn } from "@/lib/api";
import { setProfile, useProfile } from "@/lib/profile";

type Message =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; out?: AssistantOut; error?: boolean };

/** Open the chat from anywhere (e.g. a button on Home). */
export function openAssistant() {
  window.dispatchEvent(new Event("jobintel:open-assistant"));
}

const START_CHIPS = ["Which jobs fit me?", "What should I learn next?", "Which skills are rising?"];

export function Assistant() {
  const profile = useProfile();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState<boolean | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      getAssistantStatus().then((s) => setAi(s.ai)).catch(() => setAi(false));
    };
    window.addEventListener("jobintel:open-assistant", onOpen);
    return () => window.removeEventListener("jobintel:open-assistant", onOpen);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && ai === null) {
      getAssistantStatus().then((s) => setAi(s.ai)).catch(() => setAi(false));
    }
  }

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    // only real exchanges go to the server, not the greeting or error bubbles
    const history: AssistantTurn[] = messages
      .filter((m) => !(m.role === "assistant" && m.error))
      .map((m) => ({ role: m.role, text: m.text }))
      .slice(-6);
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setBusy(true);
    try {
      const out = await askAssistant(question, profile.skills, history);
      if (out.skills_added.length) {
        setProfile({ ...profile, skills: [...profile.skills, ...out.skills_added], source: profile.source ?? "typed" });
      }
      if (out.source === "ai") setAi(true);
      setMessages((m) => [...m, { role: "assistant", text: out.reply, out }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: (e as Error).message, error: true }]);
    } finally {
      setBusy(false);
    }
  }

  const last = [...messages].reverse().find((m) => m.role === "assistant" && m.out) as Extract<Message, { role: "assistant" }> | undefined;
  const chips = busy ? [] : last?.out?.chips ?? START_CHIPS;

  return (
    <>
      {open && (
        <section
          id="jobintel-assistant"
          role="dialog"
          aria-label="JobIntel Assistant"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          className="no-print fixed inset-x-3 bottom-20 z-50 flex h-[min(560px,calc(100dvh-7rem))] flex-col overflow-hidden card sm:inset-x-auto sm:right-5 sm:w-[384px]"
        >
          <header className="flex items-center gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-semibold leading-tight">Ask JobIntel</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-2">
                <span className={`h-1.5 w-1.5 rounded-full ${ai ? "bg-sage-ink" : "bg-muted"}`} aria-hidden="true" />
                {ai === null ? "Connecting…" : ai ? "AI answers, using JobIntel’s job data" : "Answers from JobIntel’s job data"}
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" className="grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-paper/70 hover:text-ink">
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-paper px-4 py-4" aria-live="polite">
            <Bubble role="assistant">
              Ask me which jobs fit you, what to learn for a job, what a job pays, or whether a skill is worth learning. I answer from the same job data as the rest of the site.
              <span className="mt-2 block text-[13px] text-muted">
                {profile.skills.length ? `Using your skills: ${profile.skills.slice(0, 6).join(", ")}${profile.skills.length > 6 ? ", …" : ""}` : "Tip: tell me your skills, for example “I know sql and excel”."}
              </span>
            </Bubble>
            {messages.map((m, i) => (
              <Fragment key={i}>
                <Bubble role={m.role} error={m.role === "assistant" && m.error}>
                  <RichText text={m.text} />
                </Bubble>
                {m.role === "assistant" && m.out && (
                  <div className="flex flex-wrap items-center gap-1.5 pl-1">
                    {m.out.links.map((l) => (
                      <Link key={l.href} href={l.href} onClick={() => window.innerWidth < 640 && setOpen(false)} className="inline-flex items-center gap-1 rounded-lg bg-accent-soft px-2.5 py-1 text-[13px] font-medium text-accent hover:underline">
                        {l.label} <ArrowUpRight size={13} aria-hidden="true" />
                      </Link>
                    ))}
                    {m.out.skills_added.length > 0 && <span className="text-xs text-ink-2">Added {m.out.skills_added.join(", ")} to your skills.</span>}
                    <span className="ml-auto text-[12px] text-muted">{m.out.source === "ai" ? "AI answer" : "From job data"}</span>
                  </div>
                )}
              </Fragment>
            ))}
            {busy && (
              <Bubble role="assistant">
                <span className="flex items-center gap-1 py-1" aria-label="Thinking">
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-lavender-ink/60" style={{ animationDelay: `${d * 120}ms` }} />
                  ))}
                </span>
              </Bubble>
            )}
          </div>

          <div className="bg-paper px-3 pb-3 pt-1">
            {chips.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <button key={c} type="button" onClick={() => send(c)} className="rounded-lg border border-line px-2.5 py-1 text-[13px] text-ink-2 hover:border-accent hover:text-accent">
                    {c}
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2">
              <label htmlFor="assistant-input" className="sr-only">Ask the assistant</label>
              <input
                id="assistant-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={500}
                placeholder="Ask about jobs or skills…"
                className="h-11 min-w-0 flex-1 rounded-full bg-line-soft px-4 text-[15px] outline-none focus:ring-2 focus:ring-lavender-ink"
              />
              <button type="submit" disabled={!input.trim() || busy} aria-label="Send" className="grid h-11 w-11 place-items-center rounded-full bg-brand text-white hover:bg-brand-dark disabled:opacity-40">
                <SendHorizontal size={18} aria-hidden="true" />
              </button>
            </form>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="jobintel-assistant"
        aria-label={open ? "Close assistant" : "Ask JobIntel"}
        className="no-print fixed bottom-5 right-5 z-50 inline-flex h-12 items-center gap-2 rounded-full bg-brand px-5 text-[15px] font-medium text-white shadow-[0_10px_30px_-10px_rgba(43,37,64,0.6)] hover:bg-brand-dark"
      >
        {open ? <X size={18} aria-hidden="true" /> : <MessageCircle size={18} aria-hidden="true" />}
        {!open && <span className="hidden sm:inline" aria-hidden="true">Ask JobIntel</span>}
      </button>
    </>
  );
}

function Bubble({ role, error, children }: { role: "user" | "assistant"; error?: boolean; children: React.ReactNode }) {
  if (role === "user") {
    return <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-[15px] text-on-accent">{children}</div>;
  }
  return (
    <div className={`w-fit max-w-[92%] rounded-2xl rounded-bl-md px-4 py-3 text-[15px] leading-relaxed ${error ? "border border-line text-ink" : "bg-surface-2 text-ink"}`}>
      {children}
    </div>
  );
}

/** Plain text with "- " bullets and **bold**, nothing else (no HTML from the server is trusted). */
function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const bullet = /^\s*[-•]\s+/.test(line);
        const content = bullet ? line.replace(/^\s*[-•]\s+/, "") : line;
        const parts = content.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
          p.startsWith("**") && p.endsWith("**") ? <strong key={j} className="font-semibold">{p.slice(2, -2)}</strong> : <Fragment key={j}>{p}</Fragment>,
        );
        if (!line.trim()) return <span key={i} className="block h-1.5" />;
        return bullet ? (
          <span key={i} className="mt-1 flex gap-2"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-lavender-ink/70" aria-hidden="true" /><span>{parts}</span></span>
        ) : (
          <span key={i} className="block">{parts}</span>
        );
      })}
    </>
  );
}
