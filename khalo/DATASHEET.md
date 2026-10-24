# Datasheet for K-HALO v1.0
Structured after Gebru et al., "Datasheets for Datasets" (Commun. ACM, 2021).

## 1. Motivation
- **Purpose.** AgeTech and healthy-longevity AI needs data that describe *where* older adults age in poor health and *why*. Openly accessible, English-documented, long-run small-area panels from rapidly ageing Asian countries are scarce. K-HALO turns 18 years of official Korean small-area health statistics into a consistent, machine-learning-ready panel with benchmark tasks.
- **Problem addressed.** South Korea passed 20 % aged 65+ in December 2024. Healthy life expectancy (HLE) in K-HALO ranges from 63.9 to 78.6 years across districts, and correlates with area deprivation (r = −0.32, 2023). Planners need tools that forecast ageing-related risks and explain HLE gaps fairly across deprived and affluent areas.
- **Creator and funding.** Compiled by an independent researcher (Soonryu Seo). No external funding.

## 2. Composition
- **Instances.** Area-level records. Core instance = (unit, year, indicator). 281 units (235 districts, 46 sub-districts), 2008–2025, 41 indicators → 154,691 values with crude and age-standardised rates. Wide view: 4,878 unit-years.
- **Linked tables.** HLE and life expectancy (1,763 unit-years, 2017–2023); deprivation (228 districts, 2020); older-adult population (228 districts, 2024).
- **Benchmark set.** 245 units that do not overlap spatially (districts without sub-districts + sub-districts) and are continuously active; 74 metropolitan, 84 urban, 76 rural, 11 mixed.
- **Completeness.** Within each indicator's published years, 99.97 % of benchmark-unit cells are filled (minimum 99.2 %). Missing cells are left empty (never imputed).
- **Labels/targets.** Defined per benchmark task (next-year rate; HLE). No human annotation.
- **Confidential or personal information.** None. All values are published aggregate statistics; no individual or household records.
- **Sub-populations.** Indicators refer to adults 19+ unless stated (hypertension/diabetes 30+, chewing difficulty 65+, smoking by men). Age-standardised rates allow comparison across areas with different age structures.

## 3. Collection process
- **Sources (secondary data).** (a) KDCA Community Health Survey (CHS): annual, about 230,000 adults, roughly 900 per health-centre area, face-to-face interviews, published per area on KOSIS. (b) Statistics Korea: deaths by district, sex and 5-year age (cause-of-death statistics) and mid-year resident registration population, used to build district life tables. (c) Population and Housing Census aggregates for the deprivation index. (d) Resident registration population for older-adult counts.
- **Retrieval.** KOSIS Open API, September 2026; inventory and validation of 206 KOSIS tables (all CHS tables passed or were flagged as discontinued; only the 41 indicators still published were retained).
- **Derived variables.** Life tables: Chiang abridged method on 3-year pooled deaths (areas with <150 deaths not estimated). HLE: Sullivan method; the national age-specific unhealthy share is back-calculated from Statistics Korea's official subjective-health HLE (re-computed national HLE matches the official value to 0.1 year in all published years), and each area's curve is shifted by the odds ratio of its 3-year mean self-rated health. Deprivation: reproduction of Kim et al. (2013) with 7 census variables, z-scores summed.
- **Ethics review.** Not required: no human-subject contact, only public aggregate statistics.

## 4. Pre-processing and quality control
- Harmonised unit identifiers across administrative changes (e.g. city mergers, new health centres); `status`, `first_year`, `last_year` record changes; Statistics Korea 2018 codes provided for linkage.
- Values stored as published (one decimal). Checks (`qc/run_qc.py`): 0 values outside 0–100 %; crude vs age-standardised agreement r = 0.987; year-on-year jumps beyond 4 SD flagged for 0.20 % of 143,296 pairs (kept, as genuine small-area variation); HLE never exceeds LE.

## 5. Uses
- **Intended.** Forecasting of ageing-related risk factors and chronic disease; explaining and predicting HLE; small-area estimation research; fairness auditing of health AI across deprivation levels; prioritising AgeTech, preventive and care services.
- **Not intended.** Individual-level inference or diagnosis; ranking areas for punitive purposes; treating HLE estimates as official statistics.
- **Known limitations.** Self-reported measures; survey sampling error of about ±1.5 pp per area; HLE driven mainly by self-rated health (r ≈ 0.89); sub-districts share their parent city's census covariates; COVID-19 disruption in 2020–2021; deprivation and population tables are cross-sectional.

## 6. Distribution and maintenance
- **Licence.** CC BY 4.0. Source statistics: Korea Open Government Licence Type 1 (attribution).
- **Format.** CSV (UTF-8), SQLite, Croissant JSON-LD metadata, data dictionary.
- **Maintenance.** Annual update after each CHS release (scripts in `tools/`). Version history in `CHANGELOG`. Contact via IEEE DataPort.
