# Global Health Equity Radar v0.1 — build notes

- URL: https://health-profile.kr/global/ (mirror: https://soonryu74.github.io/health-dashboard/global/) · Methodology: /global/methodology/
- Purpose: test whether the Korean Health Equity Radar decision framework (screening → priority → why → action) operates between countries on standardized open data. Independent static pages; the Korean app is unchanged apart from one link on the English pages.

## Data
- World Bank WDI extract (file date 2026-10-01) supplied as `health_equity_wdi_latest.json` + `indicator_metadata.csv` (kept unmodified in `global/data/`).
- Verified by `scripts/build_global.py`: 4,977 records · 217 countries/economies (no regional aggregates) · 25 indicators · observation years 1980–2025 (most recent year per indicator 2023–2025) · 0 nulls · 0 duplicates · every series `License Type` = CC BY-4.0 and `license_check` = PASS. The compact file used by the page matches every original value and year (0 mismatches).
- Map: Natural Earth 1:110m (public domain), 176 shapes, 170 of 217 economies drawable; 47 small economies are search-only.

## Rules (also on the methodology page)
- Direction: 7 higher-is-concern, 9 lower-is-concern, 9 context (never judged). Defined explicitly in `scripts/build_global.py`.
- Comparison: same World Bank income group with data from 2015 or later (all countries if < 10 peers); mid-rank percentile using the Korean engine's `unfavorablePercentile` (`app/src/lib/equity/calculateGap.js`). Worldwide position shown alongside.
- Priority signal ≥ 80% less favourable than peers; Watch 60–80%; top 3 preferring different domains. Exclusion: poverty at $3.00/day is not used for signals/score in high-income economies (near-zero values).
- Exploratory Priority Score: equal-weight mean of relative positions × 100, ≥ 8 indicators required; "for screening and prioritization, not clinical or causal inference".
- Freshness: recent 2024–25 · moderate 2022–23 · caution 2015–21 · old < 2015 (shown, not compared). Missing → "No data available", never 0.
- Possible action areas: `global/data/action_rules.json`, shown only for highlighted priority signals.

## Verification (`scripts/qa/global_e2e.mjs`, all passing on 2026-10-05)
- 390/430/768/1440 px, light and dark: no JS errors, no horizontal overflow.
- KOR, VNM, USA, JPN, AUS, TLS, UGA: all 25 rows match the original JSON (value and year); missing indicators shown as "No data available" (AUS 1, TLS 2); priority signals equal an independent recomputation from the original JSON; direction checked against the peer median; source shown for every indicator.
- 10 random data points (fixed seed): UI = original 10/10.
- WHY text, action areas, KOR vs VNM comparison (7 indicators with different years flagged), search (Vietnam / korea / united st), map (indicator switch, click to select), methodology 9 sections, banned-phrase scan.

## Known limitations / TODO
- National averages only — no within-country equity (the Korean implementation's core). Modelled estimates carry no uncertainty in this extract.
- Income-group framing: a low-income country can show few signals while its absolute levels are far from other groups — the worldwide context line under the signals addresses this.
- Indicator names and UI are English only; no time series yet (time-series CSV exists in the WDI package but is not used).
- Action areas are generic rules, not linked to evidence sources yet.
