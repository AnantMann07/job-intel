"""Run every pipeline step in order. Re-run this after any change.

    python -m pipeline.run_all            # real data (download first)
    python -m pipeline.run_all --sample   # fake sample, runs in seconds

Steps:
  1. clean     -> data/interim/postings.parquet
  2. report    -> reports/data_report.md
  3. market    -> data/processed/*.parquet + backend/artifacts/market_overview.json
  4. profiles  -> backend/artifacts/roles.json + skills.json (job profiles, skill dictionary)
  5. trends    -> backend/artifacts/trends.json + reports/forecast_eval.md
  6. evaluate  -> reports/suggestions_eval.md + data/processed/eval_metrics.json
"""
from __future__ import annotations

import argparse
import time

from . import clean, evaluate, market, profiles, report, sample, trends
from .config import RAW_DATA_JOBS_SAMPLE


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the whole data pipeline")
    parser.add_argument("--sample", action="store_true", help="use fake sample data")
    args = parser.parse_args()

    start = time.time()
    if args.sample and not RAW_DATA_JOBS_SAMPLE.exists():
        sample.main()
    print("[1/6] clean")
    clean.main(sample=args.sample)
    print("[2/6] report")
    report.main()
    print("[3/6] market")
    market.main()
    print("[4/6] job profiles")
    profiles.main()
    print("[5/6] skill trends + forecasts")
    trend_metrics = trends.main()
    print("[6/6] evaluate job suggestions")
    evaluate.main(trend_metrics)
    print(f"Done in {time.time() - start:.1f}s")


if __name__ == "__main__":
    main()
