# Health Equity Radar — WHO STEPS Cross-Country Proof of Concept

- Status (2026-10-04): **preparation complete — waiting for microdata.** No reproduced values yet; nothing is shown on the site.
- Plan: Korea (existing Health Profile) → Viet Nam 2021 → Timor-Leste 2023 → Uganda 2023, same five axes: current smoking → insufficient physical activity → BMI ≥ 25 → raised blood pressure → raised fasting glucose.
- Principle: three countries reproduced exactly (weights, design-based CIs, harmonized definitions) are stronger than many countries loosely.
- Data use: WHO NCD Microdata Repository public-use datasets, for non-commercial, not-for-profit public health research and demonstration. Raw microdata are never committed or redistributed; only aggregates are published.

## 1. Datasets (checked on the public WHO catalogue and data dictionaries)
| | Viet Nam | Timor-Leste | Uganda |
|---|---|---|---|
| Survey ID | VNM_2021_STEPS_v01 ([catalog 948](https://extranet.who.int/ncdsmicrodata/index.php/catalog/948)) | TLS_2023_STEPS_v01 ([catalog 998](https://extranet.who.int/ncdsmicrodata/index.php/catalog/998)), listed 2026-07-29 | UGA_2023_STEPS_v01 ([catalog 995](https://extranet.who.int/ncdsmicrodata/index.php/catalog/995)), listed 2026-06-30 |
| File | 4,435 cases × 186 variables | tls2023 · 3,516 × 262 | uga2023 · 3,694 × 219 |
| Population | adults 18–69 | adults 18–69, response 82% | adults 18–69, response 86% |
| Design variables | stratum, psu, wstep1–3 | stratum, psu, wstep1–3 | stratum, psu, wstep1–3, wsteplab |
| Official report | report (download 6937) | report 7172, fact sheet 7171 | report 7153 (data-book tables with 95% CI) |
| Subgroups in public file | sex, age (no urban/rural variable) | sex, age (no urban/rural variable) | sex, age, urban/rural (+ region, not used for ranking) |

Microdata download requires a WHO account and acceptance of the terms of use, so the files are obtained by the project owner and placed in a private folder; the computation runs locally.

## 2. Harmonization (common schema: `data/global/schema.json`)
| Axis | Viet Nam | Timor-Leste | Uganda | Korea (concept only) |
|---|---|---|---|---|
| Smoking `t1` | same; **official headline is 15+**, so 18–69 checked only on overlapping age bands | same ("any tobacco") | same | KCHS current smoking, self-report |
| Insufficient PA (< 600 MET-min/week) | GPAQ p1–p15 | **reduced module px1–px6** (vigorous + moderate only) → approximate | GPAQ p1–p15 | different questionnaire |
| BMI ≥ 25 (measured, pregnant excluded) | same | same | same | self-reported height/weight |
| Raised BP (SBP ≥ 140/DBP ≥ 90 or medication) | same; report says mean of three readings — both "mean of readings 2–3" and "mean of three" are computed | same | same | self-reported diagnosis |
| Raised fasting glucose (or medication) | ≥ 7.0 mmol/L, b5 in mmol/L | b5 in **mg/dL**; report threshold text ambiguous (see §3) — 6.1 and 7.0 mmol/L both computed | b5 in mmol/L; threshold to confirm — both computed | self-reported diagnosis |

Korea is shown only as a **comparable public-health concept with different national data sources** (median of 258 KCHS survey units), never ranked against other countries.

## 3. Inconsistencies found in the official reports (recorded before reproduction)
- **Timor-Leste, physical activity:** executive summary 35.7% "insufficient" (< 150 min moderate/week) vs annex table "not meeting WHO recommendations" 2.4%.
- **Timor-Leste, BMI:** summary overweight 18.1% + obese 3.4% (21.5%) vs annex 14.5% + 3.4% (17.9%).
- **Timor-Leste, glucose:** summary 5.3% vs annex 5.6%; definition says "capillary ≥ 6.1 mmol/L (126 mg/dl)", but 6.1 mmol/L = 110 mg/dL.
- **Timor-Leste, raised BP:** the annex "or on medication" table shows only the 18–44 row; 18–69 = 22.3% (narrative, no CI).
- **Viet Nam, smoking:** no 18–69 headline (15+ only).
Validation targets use the data-book/annex tables with 95% CI where they exist; narrative values are kept for reference (`scripts/who/targets/*.json`).

## 4. Pipeline
1. `scripts/who/compute_steps.py <ISO3> <microdata>` — same code for every country; country settings come from the schema. Weighted prevalence with stratified-cluster Taylor-linearization 95% CI (single-PSU strata centred on the overall mean; Wald or logit CI to match each report). Self-test on synthetic data: `python3 scripts/who/compute_steps.py --selftest`.
2. Validation against the official values: **PASS if |difference| ≤ 1.0 percentage point or inside the official 95% CI**, for the 18–69 total and at least 80% of sex/age checks. Ambiguous definitions (BP averaging, glucose threshold) are computed both ways and the reproducing variant is recorded.
3. `node scripts/who/radar_who.mjs <aggregated.json>` — applies the **same functions as the Korean Radar** (`app/src/lib/equity/calculateGap.js`: direction-aware gap, CI overlap) to within-country subgroup gaps; "review first" = subgroup ≥ 20% worse than the national value with a 95% CI that excludes it. No regional ranking, trend or deprivation component.
4. Only PASS indicators are shown with numbers on a separate static page (`poc/`), outside the Korean app.

## 5. What can and cannot be claimed
- Now: "Health Equity Radar's prioritisation logic is a set of pure functions separated from the Korean data; a common schema and computation pipeline for WHO STEPS datasets (Viet Nam, Timor-Leste, Uganda) has been prepared." 
- Only after a country passes: "...its portability was subsequently tested using standardized WHO STEPS datasets from <countries that passed>."
- Only after ≥ 2 countries pass: "A portable public-health decision framework tested across multiple national health systems using standardized WHO data."
- Never: proven/validated globally, WHO partnership/endorsement/funding, province-level WHO data, real-time data, AI prediction or diagnosis, global deployment.

## 6. Next step
The project owner downloads the three public-use files (VNM, TLS, UGA) from the WHO repository and uploads them to the private Google Drive folder; then each country is computed, validated and documented in turn (Viet Nam → Timor-Leste → Uganda).
