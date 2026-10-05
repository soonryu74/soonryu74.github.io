# Global Health Equity Radar v0.2 — build notes

- URL: https://health-profile.kr/global/ (mirror: https://soonryu74.github.io/health-dashboard/global/) · Methodology sections 10–11: /global/methodology/#trends, #evidence
- Scope: v0.1 kept intact (same signals, Watch, top 3, scores for all 217 economies — verified). Added: historical trends from observed values since 2000, shown separately from the current position, and an evidence structure for possible action areas.

## Time-series data
- File: `health_equity_wdi_timeseries_2000_latest.csv` (World Bank WDI extract, CC BY-4.0 per series metadata), 56,371,689 bytes, SHA-256 `a73dc5e2c6f92041480e0e6c5822834169a7f5df5ec65bc2fe9c42efa840c8fa`. Kept in `private/wdi/` (not committed; the full CSV is not published).
- Checked by `scripts/build_global_trends.mjs`: 115,457 rows = 115,457 observations · 0 empty values · 0 duplicate country–indicator–year · 217 economies · 25 indicators · years 2000–2025 · every row CC BY-4.0 · country region/income identical to the latest file.
- Cross-check with v0.1 `health_equity_wdi_latest.json`: last observation (year and value) of each series = latest record for 4,955 of 4,977 records, 0 mismatches; the other 22 latest values were observed before 2000 and have no series. Any mismatch stops the build.
- Output: `global/data/ts/<ISO3>.json` (217 files, observed `[year, value]` exactly as recorded + trend summary; loaded only when a country is selected) · `ts_peer_median.json` (income-group median per year from economies observed that year, years with n ≥ 10 only) · `ts_index.json` (counts, checks, settings).

## Trend rules (methodology section 10)
- Observed years only: no interpolation, carry-forward, smoothing or imputation; missing is never 0. Lines join consecutive observed years only.
- Recent trend: OLS slope (Korean engine `olsSlope`) over the 10 years up to the country's last observation, ≥ 4 observed years.
- Classification (16 signal indicators, last observation ≥ 2015, high-income poverty excluded as in v0.1): Improving / Worsening when the 95% range of the slope is entirely on one side of zero (direction-adjusted), else No clear change. The Korean rule "change < 1% of the median per year = little change" was not reused because it would label almost every life-expectancy trend as flat (scale-dependent); the 95%-range rule is scale-free.
- Peer comparison of the slope: Korean engine `trendClass` tertile within the income group (all economies if < 10).
- Long-term change: first observation since 2000 → last observation, both years shown.
- Signals and the score are unchanged (latest value only). "Trend watch" lists Worsening signal indicators and is not part of signals or the score. Every trend block carries: "Trend describes past observed values; it does not explain why they changed or predict future values."

### Coverage
- Time series shown: 25 indicators × 217 economies = 4,955 country–indicator series; slope computed for 4,792.
- Trend classified: 16 signal indicators, 2,837 series in 217 economies — Improving 1,408 · No clear change 1,142 · Worsening 287.
- Classified series per indicator: life expectancy 217 · electricity 215 · TB 208 · under-5 196 · infant 196 · maternal 194 · measles 193 · OOP 193 · UHC 193 · unemployment 187 · secondary enrolment 176 · nurses 170 · physicians 166 · water 151 · sanitation 146 · poverty 36.

## Screen
- Signal card: "Current position" and "Historical trend" labelled separately in the header; the "Why" panel has two blocks — CURRENT POSITION (v0.1 text, the basis of the signal) and HISTORICAL TREND (chart with peer median and shaded window, factual lines, note).
- Indicator table: new "Trend since 2000 (observed)" column with a sparkline (dots = observed years) and classification; the chart is inside each indicator's details.
- Trend watch section; compare table shows each country's trend; coverage adds "115,457 observed values since 2000".

## Evidence structure (methodology section 11)
- `global/data/evidence_registry.json`: `sources[{id, title, publisher, url, type, language, expect_title, key_terms, verified{date, http_status, final_url, title_seen, terms_found, ok}, relevance_review}]`.
- `global/data/action_rules.json` v0.2: each area is `{text, evidence:[ids]}` (plain strings still read).
- `scripts/verify_global_evidence.py` GETs every URL and requires HTTP 200, no redirect, `expect_title` in the page title and all `key_terms` in the page text. `build_global.py` writes only `ok` sources to `global/data/evidence.json` (the file the site reads) and stops if a rule cites an unknown id.
- 2026-10-05: 21 sources registered, 21 verified (WHO fact sheets, guidelines and reports; World Bank poverty page); linked to 40 of 48 action areas. 8 areas show "No verified evidence linked yet". One candidate (Tracking SDG7 site) returned 403 and was not registered. Relevance: "not yet reviewed by a domain expert" on every source.

## Verification (2026-10-05, all passing)
- `scripts/qa/global_e2e.mjs` (77 checks, with `BASE_V01` pointing at the v0.1 build): all v0.1 checks (4 viewports light/dark with all chart details open, 7 countries × 25 values, independent signal recomputation, 10 random points, compare, search, map, methodology, banned phrases) + 12 countries' time-series points = CSV (no extra years, segments only between consecutive years, last point = latest) + 10 random time-series points + no causal/predictive wording in trend text + current/trend separation + evidence links only from verified sources + compare trends + **217 economies: signals, Watch, top 3, score and domain scores identical to v0.1**.
- Korean app regressions: `npm test` (15), `equity_e2e.mjs`, `solve_readiness_e2e.mjs`, region / indicator / elder report checks — all passing.

## Limitations
- Windows end at each country's last observation, so they differ between countries.
- Many WDI series are modelled estimates revised as a whole; the 95% range describes the straight-line fit to the published points, not measurement uncertainty.
- Evidence links confirm address and title only; relevance needs expert review.
