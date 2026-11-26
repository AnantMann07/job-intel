export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <rect width="30" height="30" rx="9" fill="#4F46E5" />
      <path d="M7.5 20l5-5.5 3.5 3 6-7" stroke="#FFFFFF" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22.5 5.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z" fill="#FDE68A" />
    </svg>
  );
}
