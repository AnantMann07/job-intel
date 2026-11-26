"""Skill trends: is each skill emerging, stable or declining, and where is it heading?

For each of the most common skills we take its monthly demand share and:
  1. Theil-Sen slope: the median of all pairwise slopes. A robust trend that one odd month can't swing.
  2. Mann-Kendall test: is the trend statistically significant (p < 0.05)?
  3. Growth ratio: mean share of the last 3 months / mean share of the first 3 months.
  4. Forecast 3 months ahead with Holt's linear exponential smoothing (level + trend),
     with alpha/beta picked by grid search on one-step-ahead error.

Label rules (written down so the report can quote them):
  emerging  = significant upward trend AND growth >= 1.2
  declining = significant downward trend AND growth <= 0.85
  stable    = everything else

The forecast is backtested: fit on all but the last 3 months, forecast them, and compare the
mean absolute error with two baselines (repeat the last value; average of the last 3 months).

Writes backend/artifacts/trends.json and reports/forecast_eval.md.
"""
from __future__ import annotations

import json
import math
from itertools import product

import numpy as np
import pandas as pd

from .config import FORECAST_REPORT, SKILL_CATEGORIES, SKILLS_MONTHLY, TRENDS_ARTIFACT, ensure_dirs

TOP_SKILLS = 150
HORIZON = 3
ALPHAS = (0.2, 0.4, 0.6, 0.8)
BETAS = (0.05, 0.1, 0.2, 0.3)


# ---------- statistics (plain numpy so every line can be explained) ----------

def theil_sen(y: np.ndarray) -> float:
    slopes = [(y[j] - y[i]) / (j - i) for i in range(len(y)) for j in range(i + 1, len(y))]
    return float(np.median(slopes)) if slopes else 0.0


def mann_kendall(y: np.ndarray) -> float:
    """Two-sided p-value of the Mann-Kendall trend test (normal approximation, no tie correction)."""
    n = len(y)
    if n < 4:
        return 1.0
    s = sum(np.sign(y[j] - y[i]) for i in range(n) for j in range(i + 1, n))
    var = n * (n - 1) * (2 * n + 5) / 18
    z = 0.0 if s == 0 else (s - np.sign(s)) / math.sqrt(var)
    return float(2 * (1 - 0.5 * (1 + math.erf(abs(z) / math.sqrt(2)))))


def holt(y: np.ndarray, alpha: float, beta: float, horizon: int) -> tuple[np.ndarray, np.ndarray]:
    """Holt's linear method. Returns (one-step-ahead fitted values, forecasts)."""
    level, trend = y[0], (y[1] - y[0]) if len(y) > 1 else 0.0
    fitted = [y[0]]
    for t in range(1, len(y)):
        fitted.append(level + trend)
        prev = level
        level = alpha * y[t] + (1 - alpha) * (level + trend)
        trend = beta * (level - prev) + (1 - beta) * trend
    forecasts = np.array([level + (h + 1) * trend for h in range(horizon)])
    return np.array(fitted), np.clip(forecasts, 0, 1)


def fit_holt(y: np.ndarray, horizon: int) -> tuple[np.ndarray, float, tuple[float, float]]:
    """Grid-search alpha and beta on one-step-ahead error; return forecasts, residual std, params."""
    best = None
    for a, b in product(ALPHAS, BETAS):
        fitted, fc = holt(y, a, b, horizon)
        err = float(np.mean(np.abs(y[1:] - fitted[1:]))) if len(y) > 1 else 0.0
        if best is None or err < best[0]:
            resid_sd = float(np.std(y[1:] - fitted[1:])) if len(y) > 2 else 0.0
            best = (err, fc, resid_sd, (a, b))
    return best[1], best[2], best[3]


def label(p: float, slope: float, growth: float | None) -> str:
    if growth is None:
        return "stable"
    if p < 0.05 and slope > 0 and growth >= 1.2:
        return "emerging"
    if p < 0.05 and slope < 0 and growth <= 0.85:
        return "declining"
    return "stable"


# ---------- main build ----------

def build_trends(sm: pd.DataFrame, categories: dict[str, str] | None = None) -> tuple[dict, dict]:
    categories = categories or {}
    pivot = sm.pivot_table(index="month", columns="skill", values="share", fill_value=0.0).sort_index()
    totals = sm.groupby("skill")["postings"].sum().sort_values(ascending=False)
    months = [m.strftime("%Y-%m") for m in pivot.index]
    last = pivot.index.max()
    future = [(last + pd.DateOffset(months=h + 1)).strftime("%Y-%m") for h in range(HORIZON)]
    skills_out, errors = [], {"holt": [], "naive": [], "moving_average": []}
    for skill in totals.index[:TOP_SKILLS]:
        y = pivot[skill].to_numpy(dtype=float)
        slope = theil_sen(y)
        p = mann_kendall(y)
        first, last3 = y[:3].mean(), y[-3:].mean()
        growth = float(last3 / first) if first > 0 else None
        fc, sd, (a, b) = fit_holt(y, HORIZON)
        band = [1.28 * sd * math.sqrt(h + 1) for h in range(HORIZON)]  # ~80% interval
        skills_out.append({
            "skill": skill, "category": categories.get(skill, "other"),
            "label": label(p, slope, growth),
            "share_now": round(float(y[-1]), 5), "growth": None if growth is None else round(growth, 3),
            "slope_per_month": round(slope, 6), "p_value": round(p, 4), "alpha": a, "beta": b,
            "history": [round(float(v), 5) for v in y],
            "forecast": [round(float(v), 5) for v in fc],
            "lower": [round(max(0.0, float(v - w)), 5) for v, w in zip(fc, band)],
            "upper": [round(min(1.0, float(v + w)), 5) for v, w in zip(fc, band)],
        })
        if len(y) >= HORIZON + 4:  # backtest
            train, test = y[:-HORIZON], y[-HORIZON:]
            fc_bt, _, _ = fit_holt(train, HORIZON)
            errors["holt"].append(float(np.mean(np.abs(test - fc_bt))))
            errors["naive"].append(float(np.mean(np.abs(test - train[-1]))))
            errors["moving_average"].append(float(np.mean(np.abs(test - train[-3:].mean()))))
    counts = pd.Series([s["label"] for s in skills_out]).value_counts().to_dict()
    metrics = {k: (round(float(np.mean(v)) * 100, 4) if v else None) for k, v in errors.items()}
    metrics.update({"skills_tested": len(errors["holt"]), "labels": counts})
    return {"months": months, "future": future, "skills": skills_out}, metrics


def write_report(metrics: dict, n_months: int) -> None:
    rows = [("Holt's linear smoothing (ours)", metrics["holt"]), ("Naive: repeat the last month", metrics["naive"]),
            ("Average of the last 3 months", metrics["moving_average"])]
    best = min((r for r in rows if r[1] is not None), key=lambda r: r[1], default=None)
    lines = [
        "# Forecast evaluation", "",
        f"Backtest on the top {metrics['skills_tested']} skills: each model sees all months except the last 3 "
        f"({n_months} months of data in total), forecasts those 3 months, and we measure the mean absolute error "
        "in percentage points of demand share (lower is better).", "",
        "| Model | Mean absolute error (percentage points) |", "| --- | --- |",
    ]
    lines += [f"| {name} | {'' if v is None else f'{v:.3f}'} |" for name, v in rows]
    lines += ["", f"Best: **{best[0]}**." if best else "", "",
              "## Trend labels", "",
              "Rules: emerging = significant upward trend (Mann-Kendall p < 0.05) and growth ≥ 1.2×; "
              "declining = significant downward trend and growth ≤ 0.85×; otherwise stable.", "",
              "| Label | Skills |", "| --- | --- |"]
    lines += [f"| {k} | {v} |" for k, v in sorted(metrics["labels"].items())]
    FORECAST_REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> dict:
    ensure_dirs()
    sm = pd.read_parquet(SKILLS_MONTHLY)
    cats = {}
    if SKILL_CATEGORIES.exists():
        c = pd.read_csv(SKILL_CATEGORIES)
        cats = dict(zip(c["skill"], c["category"]))
    trends, metrics = build_trends(sm, cats)
    TRENDS_ARTIFACT.write_text(json.dumps(trends))
    write_report(metrics, len(trends["months"]))
    print(f"  wrote {len(trends['skills'])} skill trends -> {TRENDS_ARTIFACT.name}; labels {metrics['labels']}")
    return metrics


if __name__ == "__main__":
    main()
