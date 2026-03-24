#!/usr/bin/env python3
"""
run_all.py
==========
Unified pipeline runner for the Albanian-in-Ohio research project.
Runs all data processing steps in the correct order.

Usage
-----
    # Full pipeline (download Census data + process PUMS)
    python scripts/run_all.py

    # Skip Census API download (if you already have raw data)
    python scripts/run_all.py --skip-download

    # Process only (just re-generate JSON from existing raw data)
    python scripts/run_all.py --process-only

    # Specify a custom PUMS file path
    python scripts/run_all.py --pums-file /path/to/psam_p39.csv

Environment
-----------
    CENSUS_API_KEY  — optional but recommended for Census API downloads.
                      Get a free key: https://api.census.gov/data/key_signup.html
"""

import argparse
import subprocess
import sys
import time
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPTS_DIR.parent


def run_script(script_name: str, extra_args: list[str] | None = None):
    """Run a Python script in the scripts directory."""
    script_path = SCRIPTS_DIR / script_name
    if not script_path.exists():
        print(f"ERROR: {script_path} not found!")
        return False

    cmd = [sys.executable, str(script_path)]
    if extra_args:
        cmd.extend(extra_args)

    print(f"\n{'='*60}")
    print(f"RUNNING: {script_name}")
    print(f"{'='*60}\n")

    result = subprocess.run(cmd, cwd=str(PROJECT_ROOT))
    return result.returncode == 0


def check_raw_data():
    """Check what raw data is available."""
    raw_dir = PROJECT_ROOT / "data" / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    census_files = list(raw_dir.glob("b04006_*.json"))
    pums_files = list(raw_dir.glob("psam_p*.csv"))

    print("\nRaw data check:")
    print(f"  Census API downloads: {len(census_files)} files")
    print(f"  PUMS CSV files:       {len(pums_files)} files")

    if pums_files:
        for f in pums_files:
            size_mb = f.stat().st_size / (1024 * 1024)
            print(f"    {f.name}: {size_mb:.0f} MB")

    return len(census_files) > 0, len(pums_files) > 0


def check_processed_data():
    """Summarize what processed data was generated."""
    out_dir = PROJECT_ROOT / "data" / "processed"
    if not out_dir.exists():
        print("\nNo processed data directory found.")
        return

    files = sorted(out_dir.glob("*.json"))
    print(f"\nProcessed data: {len(files)} JSON files")
    for f in files:
        size_kb = f.stat().st_size / 1024
        print(f"  {f.name} ({size_kb:.1f} KB)")


def main():
    parser = argparse.ArgumentParser(
        description="Run the full Albanian-in-Ohio data pipeline")
    parser.add_argument("--skip-download", action="store_true",
                        help="Skip Census API download (use existing raw data)")
    parser.add_argument("--process-only", action="store_true",
                        help="Only run PUMS processing (same as --skip-download)")
    parser.add_argument("--pums-file", type=str, default=None,
                        help="Path to Ohio PUMS person CSV file")
    args = parser.parse_args()

    skip_download = args.skip_download or args.process_only

    print("=" * 60)
    print("ALBANIAN-IN-OHIO DATA PIPELINE")
    print("=" * 60)

    start = time.time()

    has_census, has_pums = check_raw_data()

    # Step 1: Download Census data
    if not skip_download:
        print("\n" + "=" * 60)
        print("STEP 1/2: DOWNLOADING CENSUS DATA")
        print("=" * 60)
        ok = run_script("01_download_census_data.py")
        if not ok:
            print("\nWARNING: Census download had errors. Continuing anyway...")
    else:
        print("\nSkipping Census download (--skip-download / --process-only)")
        if not has_census:
            print("  NOTE: No raw Census data found. State/county comparisons")
            print("  won't be generated. Run without --skip-download first.")

    # Step 2: Process PUMS
    print("\n" + "=" * 60)
    print(f"STEP 2/2: PROCESSING PUMS DATA")
    print("=" * 60)

    pums_args = []
    if args.pums_file:
        pums_args = ["--pums-file", args.pums_file]

    ok = run_script("02_process_pums.py", pums_args)
    if not ok:
        print("\nWARNING: PUMS processing had errors.")

    # Summary
    elapsed = time.time() - start
    check_processed_data()

    print(f"\n{'='*60}")
    print(f"PIPELINE COMPLETE ({elapsed:.1f}s)")
    print(f"{'='*60}")
    print()
    print("To view the report:")
    print("  python -m http.server 8000")
    print("  Then open http://localhost:8000 in your browser")
    print()


if __name__ == "__main__":
    main()
