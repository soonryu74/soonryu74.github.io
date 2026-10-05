# Competition Evidence Pack

Generated automatically on 2026-10-06 from the data files and test records in this repository (`node scripts/build_competition_evidence.mjs`, run by `scripts/build_dashboard.py`). **Use these numbers in applications; do not retype them from memory.** If a number here differs from any other document, this file wins until the data change.

## 1. Build
- Source repository commit at generation: `20e4810` (the site footer shows the build of the deployed page).
- Data validation date: 2026-10-06 (`docs/DATA_VALIDATION.md`).

## 2–4. Korea deployment — indicators, geography, years
| Fact | Value | Note |
|---|---|---|
| Health indicators | 171 | 41 survey + 130 administrative / derived |
| Survey indicators | 41 | Korea Community Health Survey, compared across **258 survey units** |
| Administrative / derived indicators | 130 | compared across **229 municipalities** (si·gun·gu) |
| Provinces | 17 | |
| Years | 2008–2025 | coverage differs by source |
| Directional indicators (used for priorities) | 154 | the rest are context, never judged |
| Source groups | 9 | see section 5 |

Do not combine levels (wrong: "171 indicators across 258 areas").

## 5. Source groups
| Source | Indicators | Years |
|---|---|---|
| Korea Community Health Survey (KDCA) | 41 | 2008–2025 |
| Healthy life expectancy (derived in this project) | 3 | 2017–2024 |
| Cause-of-death statistics (Statistics Korea) | 22 | 2008–2025 |
| Notifiable infectious disease reports (KDCA) | 12 | 2008–2024 |
| Health insurance, screening and medical-use statistics (NHIS) | 33 | 2008–2024 |
| Population, social and economic statistics | 24 | 2008–2024 |
| Environment and safety statistics | 28 | 2008–2024 |
| National cancer screening (NHIS) | 7 | 2015–2024 |
| Area deprivation index (derived in this project) | 1 | 2015–2020 |

## 6. Tests
All passed — 15 unit tests; 7 browser test suites with 384 checks (last run 2026-10-06 00:27 KST, commit 20e4810).

| Suite | Passed | Failed |
|---|---|---|
| Unit tests (priority engine, data, reports) | 15 | 0 |
| Korea app — routes, Health Equity Priority, mobile, dark mode | 53 | 0 |
| Judge flow at 390/430/768/1440 px, accessibility, links | 106 | 0 |
| Browser back/forward, header, feedback export | 32 | 0 |
| Community health report | 28 | 0 |
| Indicator report (national) | 44 | 0 |
| Older-adults report | 44 | 0 |
| Global prototype — values = source data, signals, trends, evidence links | 77 | 0 |

Global v0.1 comparison (all 217 economies: signals, Watch, top 3, scores unchanged): run (tag pre-global-v0.2).

## 7. Implemented functions (each file checked to exist)
| Function | File | Live |
|---|---|---|
| Health Equity Priority (priority → why → possible action) for any province or municipality, Korean/English | `app/src/components/equity/EquityPriorityCard.jsx` | [open](https://health-profile.kr/#view=profile&sido=009&sgg=00901&en=1) |
| Transparent priority engine (gap, relative position, trend, deprivation; missing parts renormalized; confidence-interval and RSE checks) | `app/src/lib/equity/calculatePriority.js` | – |
| Indicator information panel (source, years, definition, standardization, direction, update date, cautions) | `app/src/components/equity/IndInfo.jsx` | – |
| Indicator analysis: map, ranking with confidence intervals, trends, gaps | `app/src/components/ChoroplethMap.jsx` | [open](https://health-profile.kr/#view=analysis) |
| Combined-vulnerability signals (several unfavourable conditions at once) | `app/src/components/equity/EquityHotspot.jsx` | [open](https://health-profile.kr/#view=hot) |
| Region comparison with equity summary | `app/src/components/equity/CompareEquity.jsx` | [open](https://health-profile.kr/#view=compare) |
| Peer-group comparison (areas with similar ageing, fiscal capacity, density, deprivation) | `app/src/components/PeerCard.jsx` | – |
| Community health report, national indicator report and older-adults report (print / PDF / Word) | `app/src/components/RegionReport.jsx` | [open](https://health-profile.kr/#view=report&sido=009&sgg=00901) |
| Prevention knowledge base linked to WHO, national and provincial plans, NICE and CPSTF | `app/src/components/NcdView.jsx` | [open](https://health-profile.kr/#view=ncd) |
| Sources tab with per-source coverage of all survey units | `app/src/components/SourcesView.jsx` | [open](https://health-profile.kr/#view=sources) |
| In-app feedback (copy, email, .json/.txt download; no server, no personal data) | `app/src/components/UsabilityFeedback.jsx` | – |
| English overview page | `app/src/components/equity/RadarAbout.jsx` | [open](https://health-profile.kr/#view=radar) |
| Global prototype (World Bank WDI): income-group peer comparison, observed trends, verified evidence links | `global/src/main.js` | [open](https://health-profile.kr/global/) |

## 8. Known limitations
- Survey indicators carry sampling error; neighbouring ranks may not differ meaningfully.
- No programme input or output data: the tool cannot evaluate programme performance or effects.
- Healthy life expectancy and the deprivation index are approximations computed for this project, not official statistics.
- The prevention knowledge base was collected and summarized with AI assistance; original documents are linked and must be checked.
- Korean interface except /solve, the English overview and the Health Equity Priority card.
- Global prototype: national averages only (no within-country data), many values are modelled estimates, evidence relevance not yet reviewed by a domain expert.
- No user testing or impact evidence yet; 0 independent reviews published.

## 9. Global prototype (portability test)
| Fact | Value |
|---|---|
| Countries and economies | 217 (prototype applied to their data — **not** deployed in or used by them) |
| World Bank WDI indicators | 25 (16 used for signals, the rest context) |
| Latest-value records | 4,977 |
| Observed values in the time series | 115,457 (2000–2025, observed years only, no interpolation) |
| Country–indicator series / with trend classification | 4,955 / 2,837 |

## 10. Evidence sources
- Global action areas: 21 of 21 registered public sources technically verified (HTTP status, page title, key terms); linked to 40 of 48 action areas. Expert relevance review: **not yet done**.
- Korea: reference list of 27 official sources; prevention knowledge base with original-document links.
- Independent reviews published: 0.

## 11. URLs
- Judge page: https://health-profile.kr/solve/
- Korea demo (English priority card): https://health-profile.kr/#view=profile&sido=009&sgg=00901&en=1
- English overview: https://health-profile.kr/#view=radar
- Global prototype: https://health-profile.kr/global/ · methodology: https://health-profile.kr/global/methodology/
- Data validation: https://health-profile.kr/docs/DATA_VALIDATION.md · this file: https://health-profile.kr/docs/COMPETITION_EVIDENCE.md

## 12. What it does not do / claims we must not make
- Does not diagnose disease.
- Does not predict future disease.
- Does not estimate causal policy effects.
- Does not automatically recommend public-budget allocation.
- Does not claim that neighbouring ranks are meaningfully different.
- Does not replace local public-health judgement.

Never claim: deployed in / used by 217 countries (correct: prototype applied to data from 217 countries and economies); validated by governments, WHO, MIT or any partner; user numbers, adoption, impact or cost savings; AI prediction, AI diagnosis or AI-generated policy; risk map, real-time surveillance, proven impact. The build stops if these phrases appear in the English page sources (6 files checked, 0 found on 2026-10-06).
