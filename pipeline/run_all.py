"""Run every pipeline step in order. Re-run this after any change.

    python -m pipeline.run_all            # real data (download first)
    python -m pipeline.run_all --sample   # fake sample, runs in seconds

Steps so far (more are added as the project grows):
  1. clean   -> data/interim/postings.parquet
  2. report  -> reports/data_report.md
  3. market  -> data/processed/*.parquet + backend/artifacts/market_overview.json
"""
from __future__ import annotations

import argparse
import time

from . import clean, market, report, sample
from .config import RAW_DATA_JOBS_SAMPLE


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the whole data pipeline")
    parser.add_argument("--sample", action="store_true", help="use fake sample data")
    args = parser.parse_args()

    start = time.time()
    if args.sample and not RAW_DATA_JOBS_SAMPLE.exists():
        sample.main()
    print("[1/3] clean")
    clean.main(sample=args.sample)
    print("[2/3] report")
    report.main()
    print("[3/3] market")
    market.main()
    print(f"Done in {time.time() - start:.1f}s")


if __name__ == "__main__":
    main()
