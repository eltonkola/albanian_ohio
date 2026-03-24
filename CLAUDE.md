# CLAUDE.md — Project Context for AI Assistants

This file captures critical context, hard-won discoveries, and gotchas from building this project. Read this before making changes.

## Project Overview

Static website researching the Albanian population in Ohio using U.S. Census data. Hosted on GitHub Pages at `eltonkola.github.io/albanian-ohio/`. Two pages: Ohio statewide (`index.html`) and Columbus metro (`columbus.html`).

Owner: Elton Kola (GitHub: eltonkola)

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS, Chart.js 4.4.1 for charts, Leaflet 1.9.4 for maps
- **Data pipeline**: Python 3 + pandas, reads PUMS CSV → outputs JSON to `data/processed/`
- **Hosting**: GitHub Pages (static, no server)
- **Fonts**: Inter (Google Fonts)
- **CDN**: cdnjs.cloudflare.com for Chart.js, Leaflet

## CRITICAL: POBP Code Verification

**This was the biggest bug in the project.** Many third-party sources (data dictionaries, blog posts, Stack Overflow) list WRONG POBP (Place of Birth) codes for Balkan countries.

### Correct POBP codes (verified against Census API)

| Code | Country | Verification Source |
|------|---------|-------------------|
| 100  | Albania | `api.census.gov/data/2023/acs/acs1/pums/variables/POBP.json` |
| 167  | Kosovo | Same |
| 168  | Montenegro | Same |
| 152  | North Macedonia | Same |
| 154  | Serbia | Same |
| 147  | Yugoslavia | Same |

### WRONG codes that were previously used (DO NOT USE)

| Code | Actually Is | Was Wrongly Used For |
|------|------------|---------------------|
| 130  | Azores Islands | Albania |
| 136  | Sweden | Yugoslavia |
| 137  | Switzerland | Serbia |
| 138  | UK, Not Specified | Kosovo |
| 139  | England | Montenegro |
| 140  | Scotland | North Macedonia |

### How to verify POBP codes

The **only reliable source** is the Census API variable endpoint. Navigate to:
```
https://api.census.gov/data/2023/acs/acs1/pums/variables/POBP.json
```
This returns the complete POBP codebook as JSON. Do NOT trust IPUMS documentation, random data dictionaries, or AI-generated code for these codes — they are frequently wrong.

If the ACS vintage changes (e.g., 2024), update the URL year accordingly.

## Albanian Ancestry Code

- `ANC1P = 100` and `ANC2P = 100` → Albanian ancestry
- This is correct and stable across ACS vintages

## Filtering Algorithm (Three-Tier)

The script uses a tiered approach to identify ethnic Albanians:

```
TIER 1 (STRICT): ANC1P == 100 OR ANC2P == 100
  → Self-reported Albanian ancestry
  → 183 unweighted records, 4,107 weighted

TIER 2 (CORE):   Tier 1 OR POBP in (100, 167)
  → Adds Albania/Kosovo-born regardless of ancestry response
  → +22 records (people born in Albania/Kosovo who didn't write "Albanian")

TIER 3 (BROAD):  Tier 2 OR (POBP in (168, 152, 154, 147) AND Albanian ancestry)
  → Adds Montenegro/N.Macedonia/Serbia/Yugoslavia-born ONLY if they also
    report Albanian ancestry (these countries have mixed populations)
  → +0 additional records in current data
  → Total: 205 unweighted records, 4,570 weighted
```

**Why the mixed-country filter matters**: Without the ancestry check, POBP 147/154/168/152 would add ~259 people who are Serbian, Macedonian, German, etc. — not Albanian. The filter correctly requires Albanian ancestry as a secondary check.

## Current Data Numbers (ACS 2019-2023 5-Year)

| Metric | Value |
|--------|-------|
| Ohio broad estimate | 4,570 |
| Ohio ancestry only | 4,107 |
| Unweighted PUMS records | 205 |
| ACS B04006 Ohio ancestry | 3,835 |
| PUMS vs ACS difference | 7.1% (within sampling variance) |
| Columbus metro broad | 376 |
| Columbus unweighted records | 13 |
| Largest county | Cuyahoga (Cleveland): 2,277 |
| Largest foreign birthplace | Albania: 2,460 |

## File Architecture

### Data pipeline
```
scripts/run_all.py          → Orchestrator (--process-only, --skip-download, --pums-file)
scripts/01_download_census_data.py → Census API → data/raw/*.json
scripts/02_process_pums.py  → data/raw/psam_p39.csv → data/processed/*.json
```

### Processing steps in 02_process_pums.py
1. Population Summary
2. Age Distribution
3. Education (age 25+ only)
4. Gender
5. Income (age 16+ only, weighted median)
6. Citizenship
7. Year of Entry (foreign-born only)
8. Occupation (SOC-based OCCP groupings)
9. PUMA Geography (with human-readable labels)
10. Place of Birth breakdown
11. State comparison (from raw B04006 data)
12. County breakdown (from raw B04006 data)
13. Community institutions (curated, not Census-derived)
14. Columbus metro subset (filters to PUMA prefixes 034/037/038)

### Output files
- `data/processed/albanian_*.json` — 13 statewide files
- `data/processed/columbus_*.json` — 11 Columbus metro files
- All population numbers are PWGTP-weighted

### Frontend
- `index.html` + `js/app.js` → Ohio statewide page
- `columbus.html` + `js/columbus-app.js` → Columbus metro page
- `css/style.css` → Shared styles
- Charts use Canvas IDs matching function names in JS

## PUMA Geography Notes

- PUMA = Public Use Microdata Area (~100K-200K people)
- Ohio PUMA prefixes (2020 vintage):
  - `007xx` = Cuyahoga County (Cleveland)
  - `008xx` = Lake County
  - `010xx` = Summit County (Akron)
  - `012xx` = Stark County (Canton)
  - `027xx` = Hamilton County (Cincinnati)
  - `034xx` = Franklin County (Columbus) ← confirmed
  - `037xx` = Delaware/Union County area (Columbus metro ring)
  - `038xx` = Fairfield/Licking County area (Columbus metro ring)
- PUMA-to-county mapping is approximate for prefixes other than Cleveland/Columbus
- The 2020 PUMA delineation file from Census would give exact mappings

## Occupation Code Ranges (OCCP)

Based on 2020 ACS PUMS SOC-based codes:

| Range | Category |
|-------|----------|
| 10-439 | Management, Business, Finance |
| 500-959 | Computer, Engineering, Science |
| 1000-1239 | Community & Social Services |
| 1300-1559 | Legal |
| 1600-1979 | Education, Library, Arts, Media |
| 2000-2179 | Healthcare |
| 3000-3549 | Protective Service |
| 3600-3659 | Food Preparation & Serving |
| 3700-3769 | Building & Grounds Maintenance |
| 4000-4159 | Personal Care & Service |
| 4200-4259 | Sales |
| 4300-4659 | Office & Administrative Support |
| 4700-4759 | Farming, Fishing, Forestry |
| 4800-5939 | Construction & Extraction |
| 5940-6199 | Installation, Maintenance, Repair |
| 6200-6949 | Production |
| 7000-7639 | Transportation & Material Moving |
| 7700-7749 | Transportation & Material Moving |
| 9800-9839 | Military |

**Past bug**: Military was 7700-9800 (way too broad, caught Production/Transport workers). Fixed to 9800-9839.

## Education Code Map (SCHL)

| SCHL Range | Category |
|------------|----------|
| 0-15 | Less than High School |
| 16-17 | High School / GED |
| 18-20 | Some College / Associate's |
| 21 | Bachelor's Degree |
| 22-24 | Master's, Professional, or Doctorate |

## Community Institutions Data

The `albanian_community_institutions.json` file is **manually curated**, not Census-derived. It contains:
- Columbus restaurants: Velca Grill, Cafe Illyria, Gooo Restaurant
- Cleveland landmarks: Albanian Cultural Garden, Lakewood community
- Religious: Macedonian Orthodox Cathedral (Reynoldsburg)
- Concentration areas with lat/lng and intensity scores (0-100)

These need periodic manual verification and updates.

## Known Limitations

1. **Small sample sizes**: 205 unweighted PUMS records statewide, only 13 for Columbus metro. All breakdowns have wide confidence intervals.
2. **PUMA geography is coarse**: Can't identify neighborhoods, only regions of ~100K-200K people.
3. **Census undercounting**: The real Albanian population is likely 2-5x the Census numbers. Kosovars, Macedonian Albanians, and 2nd/3rd generation often don't report "Albanian" ancestry.
4. **No language data in PUMS output**: The LANP (language) variable is loaded but not currently processed into a separate output file. The language chart in `app.js` uses hardcoded estimates from Harvard Growth Lab.
5. **Columbus metro PUMA definition is approximate**: Prefixes 037/038 may extend beyond the official Columbus MSA boundary.
6. **Sample data mode**: If PUMS file is missing, `02_process_pums.py` generates estimated sample data. This is clearly labeled in the UI but uses very different (higher) numbers.

## PUMS Download URLs

- ACS 5-Year 2019-2023: `https://www2.census.gov/programs-surveys/acs/data/pums/2023/5-Year/csv_poh.zip`
- ACS 5-Year 2020-2024: `https://www2.census.gov/programs-surveys/acs/data/pums/2024/5-Year/csv_poh.zip`
- Ohio state FIPS: 39, so the person file is `psam_p39.csv`
- File is ~150MB compressed, ~1.5GB uncompressed, ~584K records

## Census API

- Free API key: `https://api.census.gov/data/key_signup.html`
- B04006 (ancestry): `https://api.census.gov/data/2023/acs/acs5?get=NAME,B04006_001E,B04006_003E&for=state:*&key=YOUR_KEY`
- B05006 (place of birth): similar pattern
- Variable endpoint for code lookups: `https://api.census.gov/data/2023/acs/acs1/pums/variables/{VARIABLE}.json`

## Audit Results (Last Run)

Full automated audit passed 40/40 checks with 0 errors:
- All 6 correct POBP codes present, all 6 wrong codes absent
- Filtering algorithm correctly includes 183 ancestry + 22 core-only, excludes 259 non-Albanian mixed-country records
- All demographic breakdowns sum correctly to population totals
- Columbus subset is internally consistent
- PUMS ancestry estimate within 7.1% of ACS published table
- No overlapping occupation ranges, military range correct
- Education map covers all SCHL values 0-24

## Future Ideas

- Add Cleveland metro page (similar to Columbus)
- Process LANP variable for real language data
- Add 2020-2024 PUMS when available for trend comparison
- Add census tract-level analysis using ACS summary tables
- Improve PUMA labels with official delineation file
- Add refugee resettlement data from CRIS Ohio
- D3.js choropleth map for county-level visualization
