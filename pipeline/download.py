"""Download the raw dataset(s) into data/raw/.

    python -m pipeline.download          # real data_jobs.csv (~231 MB, needs internet)
    python -m pipeline.download --force  # download again even if the file exists

No account or API key is needed: data_jobs is a public Hugging Face dataset.
"""
from __future__ import annotations

import argparse
from pathlib import Path

from .config import DATA_JOBS_FILE, DATA_JOBS_REPO, RAW, RAW_DATA_JOBS, ensure_dirs


def download_data_jobs(force: bool = False) -> Path:
    ensure_dirs()
    if RAW_DATA_JOBS.exists() and not force:
        print(f"Already downloaded: {RAW_DATA_JOBS} ({RAW_DATA_JOBS.stat().st_size / 1e6:.0f} MB)")
        return RAW_DATA_JOBS
    from huggingface_hub import hf_hub_download  # imported here so tests don't need it

    print(f"Downloading {DATA_JOBS_FILE} from huggingface.co/datasets/{DATA_JOBS_REPO} ...")
    path = hf_hub_download(
        repo_id=DATA_JOBS_REPO,
        filename=DATA_JOBS_FILE,
        repo_type="dataset",
        local_dir=RAW,
    )
    size_mb = Path(path).stat().st_size / 1e6
    print(f"Saved {path} ({size_mb:.0f} MB)")
    return Path(path)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="re-download even if present")
    args = parser.parse_args()
    download_data_jobs(force=args.force)


if __name__ == "__main__":
    main()
