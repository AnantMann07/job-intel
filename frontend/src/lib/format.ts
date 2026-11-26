const num = new Intl.NumberFormat("en-US");
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 0 });

export const fmtNum = (n?: number | null) => (n == null ? "–" : num.format(n));
export const fmtCompact = (n?: number | null) => (n == null ? "–" : compact.format(n));
export const fmtUsd = (n?: number | null) => (n == null ? "–" : usd.format(n));
/** 0.413 -> "41%"  (digits = decimals) */
export const fmtPct = (x?: number | null, digits = 0) => (x == null ? "–" : `${(x * 100).toFixed(digits)}%`);

export const demandText: Record<string, string> = {
  growing: "demand growing",
  stable: "demand stable",
  shrinking: "demand falling",
};
