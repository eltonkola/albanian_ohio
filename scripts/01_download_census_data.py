#!/usr/bin/env python3
"""
01_download_census_data.py
==========================
Downloads raw Census / ACS data for the Albanian-in-Ohio research project.

Data pulled
-----------
1. ACS 5-Year Table B04006 (People Reporting Ancestry) — Albanian line
   - National, all states, Ohio counties
2. ACS 5-Year Table B05006 (Place of Birth for the Foreign-Born Population)
   - Albania, Kosovo, North Macedonia, Montenegro, Serbia/Yugoslavia birth
   - Ohio and Ohio counties
3. ACS 5-Year Table B16001 (Language Spoken at Home)
   - Albanian language speakers — Ohio and Columbus MSA
4. PUMS person-level CSV for Ohio (link + download instructions)

All outputs go to  ../data/raw/

Usage
-----
    # Option A: with a free Census API key (recommended)
    export CENSUS_API_KEY=your_key_here
    python 01_download_census_data.py

    # Option B: without an API key (limited to 500 requests/day)
    python 01_download_census_data.py

Get a free key at: https://api.census.gov/data/key_signup.html
"""

import json
import os
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    sys.exit("ERROR: 'requests' not installed. Run: pip install requests")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
API_KEY = os.environ.get("CENSUS_API_KEY", "")
BASE_URL = "https://api.census.gov/data"
RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

OHIO_FIPS = "39"

# ACS 5-Year dataset years to try (most recent first)
ACS5_YEARS = ["2023", "2022", "2021"]

# Key variable codes
# B04006: People Reporting Ancestry
# Albanian is typically line 002 in older tables; we grab all lines and filter
B04006_VARS = [
    "NAME",
    "B04006_001E",  # Total
    "B04006_002E",  # Afghan
    "B04006_003E",  # Albanian  <-- this is what we want
]

# B05006: Place of Birth for the Foreign-Born Population
# We need specific lines for Albania, Kosovo, etc.
B05006_VARS = [
    "NAME",
    "B05006_001E",  # Total foreign-born
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def census_get(dataset_path: str, get_vars: list[str], geo: str,
               for_geo: str | None = None) -> list[list[str]] | None:
    """Call Census API and return the JSON table (list of lists)."""
    params = {
        "get": ",".join(get_vars),
        "for": geo,
    }
    if for_geo:
        params["in"] = for_geo
    if API_KEY:
        params["key"] = API_KEY

    url = f"{BASE_URL}/{dataset_path}"
    try:
        r = requests.get(url, params=params, timeout=30)
        print(f"    Status: {r.status_code} | URL: {r.url[:120]}")
        if r.status_code == 200:
            # Census API sometimes returns 200 with HTML error pages
            content_type = r.headers.get("Content-Type", "")
            if "json" not in content_type and "javascript" not in content_type:
                print(f"    WARNING: unexpected Content-Type: {content_type}")
                print(f"    Body preview: {r.text[:200]}")
                return None
            try:
                return r.json()
            except ValueError:
                print(f"    ERROR: response is not valid JSON")
                print(f"    Body preview: {r.text[:200]}")
                return None
        else:
            print(f"    WARNING: HTTP {r.status_code}")
            print(f"    Body preview: {r.text[:300]}")
            return None
    except Exception as e:
        print(f"    ERROR: {e}")
        return None


def save_json(data, filename: str):
    """Save data as JSON in the raw directory."""
    path = RAW_DIR / filename
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"  -> Saved {path}")


# ---------------------------------------------------------------------------
# 1. B04006 — Albanian Ancestry
# ---------------------------------------------------------------------------
def download_ancestry_data():
    print("\n" + "="*60)
    print("1. DOWNLOADING ACS B04006 — PEOPLE REPORTING ANCESTRY")
    print("="*60)

    for year in ACS5_YEARS:
        dataset = f"{year}/acs/acs5"
        print(f"\nTrying ACS 5-Year {year}...")

        # --- National total ---
        print("  National total...")
        data = census_get(dataset, ["NAME", "B04006_001E", "B04006_003E"],
                          "us:*")
        if data:
            save_json(data, f"b04006_national_{year}.json")

        # --- All states ---
        print("  All states...")
        data = census_get(dataset, ["NAME", "B04006_001E", "B04006_003E"],
                          "state:*")
        if data:
            save_json(data, f"b04006_states_{year}.json")

        # --- Ohio counties ---
        print("  Ohio counties...")
        data = census_get(dataset,
                          ["NAME", "B04006_001E", "B04006_003E"],
                          "county:*", f"state:{OHIO_FIPS}")
        if data:
            save_json(data, f"b04006_ohio_counties_{year}.json")

        # --- Columbus MSA (CBSA 18140) ---
        print("  Columbus MSA...")
        data = census_get(dataset,
                          ["NAME", "B04006_001E", "B04006_003E"],
                          "metropolitan statistical area/micropolitan statistical area:18140")
        if data:
            save_json(data, f"b04006_columbus_msa_{year}.json")

        time.sleep(0.5)  # be polite to the API

        # If we got state data, no need to try older years
        if (RAW_DIR / f"b04006_states_{year}.json").exists():
            print(f"  SUCCESS with {year} data.")
            break
    else:
        print("  WARNING: Could not retrieve B04006 data from any year.")


# ---------------------------------------------------------------------------
# 2. B05006 — Place of Birth (Foreign-Born)
# ---------------------------------------------------------------------------
def download_birthplace_data():
    print("\n" + "="*60)
    print("2. DOWNLOADING ACS B05006 — PLACE OF BIRTH (FOREIGN-BORN)")
    print("="*60)

    # B05006 has many lines; Albanian-relevant ones vary by year.
    # We'll grab a broad set and filter in processing.
    # Key lines (2022 ACS 5-Year numbering):
    #   B05006_031E  Europe total
    #   Lines for specific countries vary — we grab all of Europe block

    europe_vars = ["NAME", "B05006_001E"]  # Total foreign-born
    # Add a range of European country lines (031-055 covers most of Europe)
    for i in range(31, 56):
        europe_vars.append(f"B05006_{i:03d}E")

    for year in ACS5_YEARS:
        dataset = f"{year}/acs/acs5"
        print(f"\nTrying ACS 5-Year {year}...")

        # Ohio level
        print("  Ohio state-level...")
        data = census_get(dataset, europe_vars,
                          f"state:{OHIO_FIPS}")
        if data:
            save_json(data, f"b05006_ohio_{year}.json")
            print(f"  SUCCESS with {year} data.")
            break

        time.sleep(0.5)
    else:
        print("  WARNING: Could not retrieve B05006 data.")


# ---------------------------------------------------------------------------
# 3. B16001 — Language Spoken at Home
# ---------------------------------------------------------------------------
def download_language_data():
    print("\n" + "="*60)
    print("3. DOWNLOADING ACS B16001 — LANGUAGE SPOKEN AT HOME")
    print("="*60)

    # Albanian language is typically in the "Other Indo-European" block
    # We grab a broad set of language lines
    lang_vars = ["NAME", "B16001_001E"]  # Total population 5+
    for i in range(2, 120):
        lang_vars.append(f"B16001_{i:03d}E")

    for year in ACS5_YEARS:
        dataset = f"{year}/acs/acs5"
        print(f"\nTrying ACS 5-Year {year}...")

        # Ohio level
        print("  Ohio state-level...")
        # API may reject too many vars — split if needed
        try:
            data = census_get(dataset, lang_vars[:50],
                              f"state:{OHIO_FIPS}")
            if data:
                save_json(data, f"b16001_ohio_{year}.json")
                print(f"  SUCCESS with {year} data.")
                break
        except Exception as e:
            print(f"  Error: {e}")

        time.sleep(0.5)
    else:
        print("  WARNING: Could not retrieve B16001 data.")


# ---------------------------------------------------------------------------
# 4. Generate PUMS download instructions
# ---------------------------------------------------------------------------
def generate_pums_instructions():
    print("\n" + "="*60)
    print("4. GENERATING PUMS DOWNLOAD INSTRUCTIONS")
    print("="*60)

    instructions = {
        "description": "Instructions for downloading PUMS microdata for Ohio",
        "what_is_pums": (
            "The Public Use Microdata Sample (PUMS) contains individual-level "
            "records from the American Community Survey. Each record represents "
            "one person with detailed attributes including ancestry, place of "
            "birth, language, education, occupation, income, and more."
        ),
        "recommended_dataset": "ACS 5-Year PUMS 2020-2024 (or 2019-2023)",
        "download_urls": {
            "2020_2024_ohio_person": (
                "https://www2.census.gov/programs-surveys/acs/data/pums/"
                "2024/5-Year/csv_poh.zip"
            ),
            "2019_2023_ohio_person": (
                "https://www2.census.gov/programs-surveys/acs/data/pums/"
                "2023/5-Year/csv_poh.zip"
            ),
            "2022_1year_ohio_person": (
                "https://www2.census.gov/programs-surveys/acs/data/pums/"
                "2022/1-Year/csv_poh.zip"
            ),
            "data_dictionary_2020_2024": (
                "https://www2.census.gov/programs-surveys/acs/tech_docs/"
                "pums/data_dict/PUMS_Data_Dictionary_2020-2024.pdf"
            ),
            "data_dictionary_2023": (
                "https://www2.census.gov/programs-surveys/acs/tech_docs/"
                "pums/data_dict/PUMS_Data_Dictionary_2023.pdf"
            ),
            "ipums_alternative": "https://usa.ipums.org/usa/",
        },
        "key_variables": {
            "ANC1P": {
                "description": "Recoded Detailed Ancestry - first entry",
                "albanian_code": 100,
                "note": "Primary filter for Albanian ancestry",
            },
            "ANC2P": {
                "description": "Recoded Detailed Ancestry - second entry",
                "albanian_code": 100,
                "note": "Captures people who list Albanian as second ancestry",
            },
            "POBP": {
                "description": "Place of Birth",
                "relevant_codes": {
                    "Albania": "Check data dictionary — typically in 400-series",
                    "Kosovo": 45790,
                    "North_Macedonia": "Check data dictionary",
                    "Montenegro": "Check data dictionary",
                    "Serbia": "Check data dictionary",
                    "Yugoslavia": "Check data dictionary (older records)",
                },
            },
            "LANP": {
                "description": "Language spoken at home",
                "albanian_code": "Check data dictionary for Albanian language code",
            },
            "PUMA": {
                "description": "Public Use Microdata Area",
                "note": (
                    "Geographic identifier. Columbus metro PUMAs cover "
                    "Franklin County and surrounding areas. See PUMA reference "
                    "maps at census.gov/geographies/reference-maps/"
                ),
            },
            "AGEP": "Age",
            "SEX": "Sex (1=Male, 2=Female)",
            "SCHL": "Educational attainment",
            "OCCP": "Occupation code",
            "INDP": "Industry code",
            "PINCP": "Total person income",
            "HINCP": "Household income (on housing record)",
            "ENG": "Ability to speak English",
            "CIT": "Citizenship status",
            "YOEP": "Year of entry to the US",
            "NATIVITY": "Nativity (1=Native, 2=Foreign born)",
            "PWGTP": "Person weight (MUST use for population estimates)",
        },
        "filtering_strategy": (
            "To capture the broadest ethnic Albanian population, use a UNION: "
            "(ANC1P == 100 OR ANC2P == 100) OR "
            "(POBP in Albania/Kosovo codes) OR "
            "(LANP == Albanian language code). "
            "This captures self-identified Albanians, Albania/Kosovo-born, "
            "and Albanian speakers regardless of how they reported ancestry."
        ),
        "ohio_columbus_pumas_2020": {
            "note": (
                "2020 PUMAs for Franklin County / Columbus metro. "
                "Verify against the official PUMA reference maps."
            ),
            "franklin_county_approx": [
                "03901", "03902", "03903", "03904", "03905",
                "03906", "03907", "03908", "03909", "03910",
            ],
            "delaware_county": ["03801"],
            "fairfield_county": ["03802"],
            "licking_county": ["03803"],
            "reference_map_url": (
                "https://www.census.gov/geographies/reference-maps/"
                "2020/geo/pumas.html"
            ),
        },
    }

    save_json(instructions, "pums_download_instructions.json")
    print("  -> PUMS instructions saved.")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("Albanian-in-Ohio Census Data Downloader")
    print("=" * 60)

    if API_KEY:
        print(f"Using Census API key: {API_KEY[:4]}...{API_KEY[-4:]}")
    else:
        print("No CENSUS_API_KEY set. Using unauthenticated access.")
        print("Get a free key: https://api.census.gov/data/key_signup.html")

    download_ancestry_data()
    download_birthplace_data()
    download_language_data()
    generate_pums_instructions()

    print("\n" + "=" * 60)
    print("DONE. Raw data saved to:", RAW_DIR)
    print("Next step: run 02_process_pums.py (after downloading PUMS data)")
    print("=" * 60)
