# MIT Solve Readiness — Health Equity Radar

- Date: 2026-10-04 · Build shown in the site footer (「빌드 …」) identifies the exact code version.
- Principle: Trustworthiness > Features · Evidence > Marketing · Working prototype > Future promises.

## 1. Verified Facts
Counted from the data files the app actually loads (`node scripts/qa/data_validation.mjs` → [DATA_VALIDATION.md](DATA_VALIDATION.md)):

| Fact | Value | Meaning |
|---|---|---|
| Health indicators | **171** | 41 Korea Community Health Survey (KCHS) + 130 administrative / derived |
| Survey units | **258** | KCHS units (one per public health centre area); only the 41 survey indicators exist at this level |
| Municipalities | **229** | si·gun·gu (226 local governments + 2 Jeju administrative cities + Sejong); level of the other 130 indicators |
| Provinces | **17** | all indicators |
| Years | **2008–2025** | KCHS 2008–2025; mortality 2008–2025; most administrative data to 2024; coverage differs by source |
| Sources | 9 | KCHS 41 · NHIS 33 · environment/safety 28 · population/socioeconomic 24 · cause-of-death 22 · infectious disease 12 · cancer screening 7 · healthy life expectancy (derived) 3 · deprivation (derived) 1 |
| Source verification | 52 with original table ID + URL; 115 with original producer named via a public research database; 4 derived in this project; 0 unverified | see `indicator_metadata.csv` |
| Tests | 12 unit tests pass (`cd app && npm test`); browser checks pass at 390×844, 430×932, 768×1024, 1440×900 | `scripts/qa/equity_e2e.mjs`, `scripts/qa/solve_readiness_e2e.mjs` |

## 2. Implemented Features (working today)
- Indicator analysis for every indicator: map, ranking (with 95% confidence intervals for survey indicators), trend, year table, gap box plot, 10-year trend.
- Regional profile with **Health Equity Priority** card: ① PRIORITY (up to three indicators, one per domain) → ② WHY IT MATTERS (computed reasons: gap from national median, relative position, 5-year trend, deprivation quintile, confidence-interval check) → ③ POSSIBLE ACTION (linked official guidance: Korean national/provincial plans, WHO, NICE, CPSTF). Switchable to English (`en=1`).
- **Community health report (auto-generated draft)**: for any province or municipality, one click builds a printable report (print / PDF / Word .doc, Korean) — summary, draft situation-analysis sentences built only from computed facts, priority items with reasons and linked guidance, strengths, all 40 survey indicators, mortality and cancer screening, methods and sources. Generated in the browser; nothing is sent to a server.
- “How priorities are identified” methodology link (in the card and in the English overview).
- Combined-vulnerability signals map (hotspot screen), equity summary in region comparison, peer-group comparison.
- Sources tab with per-source cards, update dates, limitations, external-review record (0 published, requests in progress).
- 1-minute usability feedback form (“Give Feedback” / 「사용 의견 보내기」) — builds text for copy/email; no data collected by the site.
- **Global Health Equity Radar prototype** `/global/` (2026-10-05): the same screening → priority → why → action framework applied between 217 countries/economies with 25 World Bank WDI indicators (CC BY 4.0 per series metadata); income-group peer comparison using the Korean engine's percentile function, explained signals, rule-based possible action areas, two-country comparison with observation years, indicator map, methodology page. See [GLOBAL_RADAR_v0.1.md](GLOBAL_RADAR_v0.1.md).
- English landing page `/solve` (static, 18 KB, real screenshots, OpenGraph/JSON-LD metadata) and in-app English overview.

## 3. Claims We Can Safely Make
- “A working prototype, deployed at health-profile.kr, covering the Republic of Korea.”
- “171 indicators from official Korean sources: 41 Community Health Survey indicators across 258 survey units and 130 administrative indicators across 229 municipalities, 2008–2025.” (Always state the two levels separately.)
- “For a selected community it flags up to three indicators to review first, explains why using computed facts, and links official guidance.”
- “Survey uncertainty is built in: an indicator is not flagged ‘Review first’ if its 95% confidence interval includes the national median or its relative standard error exceeds 20%.”
- “The prioritization logic is a small, unit-tested set of pure functions separated from the Korean data.” (Structure only — no deployment elsewhere.)
- “Sources, update dates and limitations are disclosed in the product.”
- “A Global prototype applies the same decision framework to 217 countries and economies using World Bank open data (latest available values, each with its observation year).”
- “External review requests have been sent; no reviews have been published yet.”

## 4. Claims We Must NOT Make
- AI predicts disease / predictive analytics / forecasting — not built.
- AI recommends policy / optimizes health budgets — possible actions are links to official documents, not generated advice.
- Real-time surveillance — data are annual statistics.
- Causal inference / programme impact — no programme input/output data; deprivation is shown side by side only.
- User numbers, “proven impact”, adoption by health centres — no user testing yet.
- Government partnership, “KDCA official project”, WHO partnership, MIT affiliation — none exist.
- “258 areas” for all indicators, or multiplying indicators × areas — wrong unit mixing.
- Healthy life expectancy or the deprivation index as official statistics — they are approximations computed here.

## 5. Data Validation Results
See [DATA_VALIDATION.md](DATA_VALIDATION.md). Summary: regions 17 / 229 / 258 (dataset holds 233 municipality records; 4 are abolished or duplicate codes — Cheongwon-gun, Yeongi-gun, Gunwi-gun old code, a Sejong sub-record). Latest-year gaps are mostly structural (values stored at district level for multi-district cities, Sejong at province code). Ten administrative indicators have recent years with province values only; their municipality comparisons end earlier.

Errors found and fixed in this round:
1. English overview showed “171 indicators” next to “258 local health jurisdictions” — misleading; now split by level with definitions.
2. Home sub-title “171 indicators × 258 areas” — removed the multiplication.
3. `/solve` was an instant redirect (crawlers saw almost nothing) — now a standalone English landing page.
4. health-profile.kr requested `/assets/credit.js`, which exists only on the personal site → 404 console error on every load; removed (the app renders its own credit line).
5. 430 px phones: 16 px horizontal overflow on the indicator screen (year slider) — fixed.
6. Muted text colour in light mode had 3.4:1 contrast (below WCAG AA 4.5:1) — darkened to 5.1:1; dark mode unchanged (5.4:1). `/solve` text colours are 5.4–16.8:1.

## 6. Known Limitations
- Interface is Korean except `/solve`, the English overview and the Health Equity Priority card; indicator English names are unofficial working translations (40 survey indicators).
- Survey sampling error; neighbouring ranks may not differ meaningfully.
- No programme input/output data → no performance or effect evaluation.
- 115 administrative indicators came via a research database (original producers named; original table IDs not stored). Mortality 2018–2025 re-checked against Statistics Korea.
- Prevention knowledge base collected/summarized with AI assistance (2026-09-07); originals linked.
- Single 10.5 MB HTML (2.4 MB gzip) — see [PERFORMANCE_PLAN.md](PERFORMANCE_PLAN.md).
- 12 px-or-smaller text remains in some dense tables/footnotes (about 3% of text elements on the profile screen).
- One developer; no user testing yet.

## 7. Next Validation Steps
1. Practitioner testing (5–8 local public-health staff): find one priority for their area and explain it; record time and errors.
2. Usability testing on mobile and desktop using the in-app feedback form.
3. Decision-usefulness: compare the tool’s priorities with practitioners’ own judgement for their area.
4. Publish independent methodological reviews (with consent) on the Sources tab.
5. Performance step 1–2 of the plan on a separate branch.

## 8. URLs
- Main product: https://health-profile.kr/ (mirror: https://soonryu74.github.io/health-dashboard/)
- Health Equity Radar (English priority card): https://health-profile.kr/#view=profile&sido=009&sgg=00901&en=1
- English overview in the app: https://health-profile.kr/#view=radar
- Solve landing page: https://health-profile.kr/solve/
- Global prototype: https://health-profile.kr/global/ (methodology: /global/methodology/)
- Data validation: https://health-profile.kr/docs/DATA_VALIDATION.md
