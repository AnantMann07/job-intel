"use client";

// Plain, quiet charts: one colour, thin marks, light axes, a readout on hover.

import { useState } from "react";

const INK = "var(--ink)";
const MUTED = "var(--muted)";
const GRID = "var(--line-soft)";
const MARK = "var(--accent)";
const MARK_SOFT = "var(--accent-soft)";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthName = (ym: string, withYear = false) => {
  const [y, m] = ym.split("-");
  return `${MONTHS[Number(m) - 1] ?? ym}${withYear ? ` ${y}` : ""}`;
};

/** Vertical bars, one per month. */
export function MonthlyBars({ data, format }: { data: { month: string; value: number }[]; format: (v: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = 220, L = 8, R = 8, T = 24, B = 26;
  const max = Math.max(...data.map((d) => d.value), 1);
  const step = (W - L - R) / data.length;
  const bw = Math.max(10, step - 10);
  const Y = (v: number) => T + (1 - v / max) * (H - T - B);
  const shown = hover ?? data.length - 1;

  return (
    <div>
      <p className="h-6 text-sm text-ink-2" aria-live="polite">
        <span className="font-medium text-ink">{monthName(data[shown].month, true)}</span>: {format(data[shown].value)} postings
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Postings per month, from ${format(Math.min(...data.map((d) => d.value)))} to ${format(max)}`} onMouseLeave={() => setHover(null)}>
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="var(--line)" />
        {data.map((d, i) => {
          const x = L + i * step + (step - bw) / 2;
          const y = Y(d.value);
          return (
            <g key={d.month} onMouseEnter={() => setHover(i)}>
              <rect x={L + i * step} y={T} width={step} height={H - T - B} fill="transparent" />
              <path d={`M${x},${H - B} V${y + 4} q0,-4 4,-4 h${bw - 8} q4,0 4,4 V${H - B} Z`} fill={i === shown ? MARK : MARK_SOFT} />
              <text x={x + bw / 2} y={H - 8} fontSize="12" fill={MUTED} textAnchor="middle">{monthName(d.month).slice(0, 3)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Monthly share of a skill: history as a solid line, forecast dashed with a light 80% band. */
export function TrendChart({ months, future, history, forecast, lower, upper, label }: {
  months: string[]; future: string[]; history: number[]; forecast: number[]; lower: number[]; upper: number[]; label: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = 260, L = 44, R = 14, T = 14, B = 30;
  const n = history.length + forecast.length;
  const top = Math.max(...history, ...upper, 0.001) * 1.12;
  const X = (i: number) => L + (i / (n - 1)) * (W - L - R);
  const Y = (v: number) => T + (1 - v / top) * (H - T - B);
  const last = history.length - 1;
  const pts = (arr: [number, number][]) => arr.map(([i, v]) => `${X(i)},${Y(v)}`).join(" ");
  const hist = pts(history.map((v, i) => [i, v]));
  const fore = pts([[last, history[last]], ...forecast.map((v, i) => [last + 1 + i, v] as [number, number])]);
  const band = pts([[last, history[last]], ...upper.map((v, i) => [last + 1 + i, v] as [number, number]),
    ...lower.map((v, i) => [last + 1 + i, v] as [number, number]).reverse()]);
  const labels = [...months, ...future];
  const ticks = [0, 0.5, 1].map((f) => f * top);
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const i = hover ?? last;
  const isFuture = i > last;
  const value = isFuture ? forecast[i - last - 1] : history[i];

  return (
    <div>
      <p className="h-6 text-sm text-ink-2" aria-live="polite">
        <span className="font-medium text-ink">{monthName(labels[i], true)}</span>:{" "}
        {isFuture ? <>forecast {pct(value)} (likely between {pct(lower[i - last - 1])} and {pct(upper[i - last - 1])})</> : <>{pct(value)} of postings mention {label}</>}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" onMouseLeave={() => setHover(null)}
        aria-label={`${label}: ${pct(history[0])} in ${monthName(months[0])}, ${pct(history[last])} in ${monthName(months[last])}, forecast ${pct(forecast[forecast.length - 1])}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={Y(t)} y2={Y(t)} stroke={GRID} />
            <text x={L - 8} y={Y(t) + 4} fontSize="12" fill={MUTED} textAnchor="end">{(t * 100).toFixed(0)}%</text>
          </g>
        ))}
        <polygon points={band} fill="var(--accent)" fillOpacity="0.12" />
        <line x1={X(last)} x2={X(last)} y1={T} y2={H - B} stroke="var(--line)" strokeDasharray="2 4" />
        <text x={X(last) + 6} y={T + 12} fontSize="12" fill={MUTED}>forecast</text>
        <polyline points={hist} fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={fore} fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" />
        <line x1={X(i)} x2={X(i)} y1={T} y2={H - B} stroke={INK} strokeOpacity="0.25" />
        <circle cx={X(i)} cy={Y(value)} r="4.5" fill={isFuture ? MARK : INK} stroke="var(--surface)" strokeWidth="2" />
        {labels.map((m, k) => (k % 3 === 0 || k === n - 1) && (
          <text key={m} x={X(k)} y={H - 8} fontSize="12" fill={MUTED} textAnchor={k === n - 1 ? "end" : k === 0 ? "start" : "middle"}>{monthName(m)}</text>
        ))}
        {labels.map((m, k) => (
          <rect key={`h${m}`} x={X(k) - (W - L - R) / (n - 1) / 2} y={T} width={(W - L - R) / (n - 1)} height={H - T - B} fill="transparent" onMouseEnter={() => setHover(k)} />
        ))}
      </svg>
    </div>
  );
}

/** Tiny line for a table row. */
export function Sparkline({ values, rising }: { values: number[]; rising?: boolean }) {
  const W = 96, H = 26;
  const max = Math.max(...values), min = Math.min(...values);
  const span = max - min || 1;
  const p = values.map((v, i) => `${(i / (values.length - 1)) * (W - 4) + 2},${H - 3 - ((v - min) / span) * (H - 6)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true" className="inline-block align-middle">
      <polyline points={p} fill="none" stroke={rising ? "var(--accent)" : MUTED} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
