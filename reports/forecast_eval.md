# Forecast evaluation

Backtest on the top 150 skills: each model sees all months except the last 3 (12 months of data in total), forecasts those 3 months, and we measure the mean absolute error in percentage points of demand share (lower is better).

| Model | Mean absolute error (percentage points) |
| --- | --- |
| Holt's linear smoothing (ours) | 0.141 |
| Naive: repeat the last month | 0.122 |
| Average of the last 3 months | 0.153 |

Best: **Naive: repeat the last month**.

## Trend labels

Rules: emerging = significant upward trend (Mann-Kendall p < 0.05) and growth ≥ 1.2×; declining = significant downward trend and growth ≤ 0.85×; otherwise stable.

| Label | Skills |
| --- | --- |
| declining | 26 |
| emerging | 4 |
| stable | 120 |
