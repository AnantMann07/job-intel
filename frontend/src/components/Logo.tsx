// The JobIntel wordmark: a small violet mark and the name.
export function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
        <rect width="22" height="22" rx="6" fill="var(--accent)" />
        <path d="M6 14.5 9.5 11l2.5 2.5L16 8" stroke="var(--on-accent)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-[17px] font-semibold tracking-[-0.01em] text-ink">JobIntel</span>
    </span>
  );
}
