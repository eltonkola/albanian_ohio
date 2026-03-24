# Albanians in Ohio — Open Research Project

An open-source, cross-referenced research project on the **Albanian and Kosovar population in Ohio**, with a focus on the **Columbus metropolitan area**.

**[View the live report →](https://eltonkola.github.io/albanian-ohio/)**

---

## Why This Project Exists

Ohio is home to one of the largest Albanian communities in the United States, but official Census data dramatically undercounts this population. The ACS records approximately **4,100 people reporting "Albanian" ancestry** in Ohio, and the PUMS broad estimate (adding Albania/Kosovo-born) reaches **~4,600** — while community estimates place the true ethnic Albanian population at **10,000–25,000**.

The undercount happens because many ethnic Albanians — especially those from **Kosovo** (the largest source since the 1990s) — report their ancestry as "Kosovar," "Yugoslav," or "Serbian" rather than "Albanian." Those from **North Macedonia** often report "Macedonian." This project cross-references multiple Census variables to build a more complete picture.

## What's in This Repo

```
├── index.html              # Main report — Ohio statewide (GitHub Pages entry point)
├── columbus.html           # Columbus metro area focused page
├── css/style.css           # Site styles
├── js/
│   ├── app.js              # Main page — charts, maps, data loading
│   └── columbus-app.js     # Columbus page — charts, maps, data loading
├── data/
│   ├── raw/                # Raw Census API downloads (gitignored until you run scripts)
│   └── processed/          # JSON files consumed by the website
│       ├── albanian_*.json # Statewide data (13 files)
│       └── columbus_*.json # Columbus metro subset (11 files)
├── scripts/
│   ├── requirements.txt    # Python dependencies
│   ├── run_all.py          # ★ Unified pipeline runner (runs everything)
│   ├── 01_download_census_data.py  # Downloads ACS tables via Census API
│   └── 02_process_pums.py          # Processes PUMS microdata → JSON (incl. Columbus subset)
└── README.md               # This file
```

## Quick Start

### Just view the report
Open `index.html` in a browser. The site loads pre-generated JSON from `data/processed/` — no server needed.

### Reproduce from scratch

```bash
# 1. Clone
git clone https://github.com/eltonkola/albanian-ohio.git
cd albanian-ohio

# 2. Set up a Python virtual environment (recommended)
#    On macOS/Linux you may get "This environment is externally managed"
#    when pip-installing globally. A venv avoids that:
python3 -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate

# 3. Install Python deps
pip install -r scripts/requirements.txt

# 4. Get a free Census API key
#    https://api.census.gov/data/key_signup.html
export CENSUS_API_KEY=your_key_here

# 5. Download Ohio PUMS microdata (manual step)
#    Go to: https://www2.census.gov/programs-surveys/acs/data/pums/2023/5-Year/csv_poh.zip
#    Unzip into data/raw/ (you should have data/raw/psam_p39.csv)

# 6. Run the full pipeline (downloads Census data + processes PUMS)
python scripts/run_all.py

# 7. Open the report
open index.html
```

### Re-processing data

Once you've run the pipeline once, you can re-process at any time:

```bash
# Re-run everything (Census download + PUMS processing)
python scripts/run_all.py

# Skip Census download, just re-process PUMS
python scripts/run_all.py --process-only

# Use a specific PUMS file
python scripts/run_all.py --pums-file /path/to/psam_p39.csv
```

You can also run the individual scripts directly:
```bash
python scripts/01_download_census_data.py   # Census API only
python scripts/02_process_pums.py           # PUMS processing only
```

### Deploy to GitHub Pages
1. Push to GitHub
2. Go to Settings → Pages → Source: `main` branch, `/` (root)
3. Your site will be live at `https://eltonkola.github.io/albanian-ohio/`

## Data Sources

| Source | What | Link |
|--------|------|------|
| **ACS Table B04006** | Self-reported ancestry ("Albanian") | [data.census.gov](https://data.census.gov/table/ACSDT5Y2022.B04006) |
| **ACS Table B05006** | Place of birth (foreign-born by country) | [data.census.gov](https://data.census.gov/table/ACSDT5Y2022.B05006) |
| **ACS Table B16001** | Language spoken at home (Albanian speakers) | [data.census.gov](https://data.census.gov/table/ACSDT5Y2022.B16001) |
| **ACS PUMS Microdata** | Individual-level records (ancestry, birth, income, etc.) | [census.gov/microdata](https://www.census.gov/programs-surveys/acs/microdata.html) |
| **Harvard Growth Lab** | Statistical profiling of Albanian Americans (2015) | [Growth Lab](https://growthlab.hks.harvard.edu/publications/albanian-community-united-states-statistical-profiling-albanian-americans) |
| **IPUMS USA** | Harmonized PUMS with enhanced docs | [usa.ipums.org](https://usa.ipums.org/usa/) |

### Key PUMS Codes

| Variable | Code | Meaning |
|----------|------|---------|
| `ANC1P` / `ANC2P` | `100` | Albanian ancestry |
| `POBP` | `100` | Born in Albania |
| `POBP` | `167` | Born in Kosovo |
| `POBP` | `168` | Born in Montenegro |
| `POBP` | `152` | Born in North Macedonia |
| `POBP` | `154` | Born in Serbia |
| `POBP` | `147` | Born in Yugoslavia (older records) |

*POBP codes verified against the Census API: `api.census.gov/data/2023/acs/acs1/pums/variables/POBP.json`. CAUTION: many third-party sources list incorrect codes (e.g., 138 for Kosovo — that's actually "UK, Not Specified").*

## How the Broad Estimate Works

The "broad estimate" unions multiple Census variables:

```
Ethnic Albanian =
  (ANC1P == 100 OR ANC2P == 100)       -- self-reported Albanian ancestry
  OR POBP in (100, 167)               -- born in Albania/Kosovo (core)
  OR (POBP in (168, 152, 154, 147) AND Albanian ancestry) -- mixed countries
```

This captures people who may not check "Albanian" on the ancestry question but are ethnically Albanian by birth.

## Data Dictionary

The `data/processed/` directory contains the JSON files consumed by the website. All population numbers are PUMS-weighted estimates unless noted otherwise.

| File | Key Fields | Description |
|------|-----------|-------------|
| `albanian_population_summary.json` | `total_ohio_broad`, `total_ohio_ancestry_only` | Headline population numbers |
| `albanian_age_distribution.json` | `ohio_albanian_age` | Age brackets → population |
| `albanian_education.json` | `ohio_albanian_education` | Education levels → population (age 25+) |
| `albanian_gender.json` | `ohio_albanian_gender` | `{"Male": n, "Female": n}` |
| `albanian_income.json` | `ohio_albanian_income`, `median_income_approx` | Income brackets + weighted median |
| `albanian_citizenship.json` | `ohio_albanian_citizenship` | Citizenship categories → population |
| `albanian_year_of_entry.json` | `ohio_albanian_year_of_entry` | Decade brackets → foreign-born arrivals |
| `albanian_puma_geography.json` | `ohio_albanian_by_puma`, `puma_labels` | PUMA codes → population + human-readable labels |
| `albanian_birthplace.json` | `ohio_albanian_birthplace` | Country of birth → population |
| `albanian_occupation.json` | `ohio_albanian_occupation` | Occupation categories → population |
| `albanian_state_comparison.json` | `albanian_by_state` | Array of `{state, ancestry_count}` objects |
| `albanian_ohio_counties.json` | `ohio_albanian_by_county` | Array of `{county, ancestry_count}` objects |
| `albanian_community_institutions.json` | `columbus_institutions`, `cleveland_institutions`, `concentration_areas` | Curated (not Census-derived) institutions and concentration areas |

The `data/raw/` directory contains Census API downloads and the PUMS CSV (not committed to git due to size). See the "Reproduce from scratch" section for how to populate it.

## Contributing

Contributions are welcome! Here are some ways to help:

- **Verify POBP codes** against the latest PUMS data dictionary
- **Add PUMA reference maps** for Columbus and Cleveland
- **Improve geographic granularity** (census tract level analysis)
- **Add historical Census data** (2000, 2010 for trend analysis)
- **Add new data sources** (refugee resettlement data, school enrollment, etc.)
- **Fix estimates** if you have better data
- **Improve visualizations** (D3 chloropleth maps, etc.)

### To contribute:
1. Fork the repo
2. Create a branch: `git checkout -b my-improvement`
3. Make your changes
4. Submit a pull request with a description of what you changed and why

## Sample Data Note

If you open the site without running the PUMS processing scripts, it displays **estimated sample data** based on published ACS tables and the Harvard Growth Lab study. The sample data is clearly labeled. To get real PUMS-derived numbers, follow the "Reproduce from scratch" instructions above.

## License

MIT License. Data sourced from U.S. Census Bureau (public domain) and academic publications.

## Acknowledgments

- U.S. Census Bureau — American Community Survey
- Harvard Growth Lab / Center for International Development — Albanian diaspora research
- IPUMS USA — University of Minnesota
- Encyclopedia of Cleveland History
- CRIS Ohio (Community Refugee & Immigration Services)
