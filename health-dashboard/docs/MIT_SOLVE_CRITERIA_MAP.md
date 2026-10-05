# MIT Solve — criteria map (current evidence and gaps)

Generated automatically on 2026-10-06 with the Competition Evidence Pack (numbers from data files; see `docs/COMPETITION_EVIDENCE.md`). Missing evidence is written as “Not yet demonstrated”. Criterion names follow the general Solve judging themes; check the exact wording of the current challenge before submission.

| Criterion | Current evidence | URL / file | Gap |
|---|---|---|---|
| Impact (alignment with the problem; potential to improve lives) | Working tool for local health plans: 171 indicators, priorities with computed reasons, reports for planning | /solve/ · docs/MIT_SOLVE_READINESS.md | Not yet demonstrated: no measured change in decisions or health outcomes; practitioner test planned (docs/PRACTITIONER_TEST_PROTOCOL.md) |
| Feasibility (can it be built and run) | Live at health-profile.kr; static site, no server or login; annual data refresh scripts in the repository | https://health-profile.kr/ · scripts/ | Single maintainer; no funded operations plan yet |
| Innovation | Connects official data → priority → explanation → linked official evidence for one community, with uncertainty on the same screen; same engine reused for the global prototype | app/src/lib/equity/ · global/src/main.js | Not yet demonstrated: no external comparison study |
| Human-centered design | Korean public-health terms, English mode for judges, mobile layout, accessibility checks, in-app feedback with file export | scripts/qa/solve_readiness_e2e.mjs · UsabilityFeedback | User testing needed — Not yet demonstrated (0 sessions run) |
| Scalability | Global prototype applied to data from 217 countries and economies, 25 WDI indicators, 115,457 observed values | /global/ · docs/GLOBAL_RADAR_v0.2.md | External pilot needed; within-country data outside Korea not tested |
| Partnership potential | External review requests sent; 0 reviews published | Sources tab → External review | No formal partners |
| Technical feasibility | All passed — 15 unit tests; 7 browser test suites with 384 checks (last run 2026-10-06 00:27 KST, commit 20e4810) | data/qa_status.json · docs/DATA_VALIDATION.md · docs/COMPETITION_EVIDENCE.md | Single-file build is 10 MB (gzip ~2.4 MB); lazy-loading plan not yet executed (docs/PERFORMANCE_PLAN.md) |
| Equity focus | Gap from the national median, deprivation shown side by side (never as cause), combined-vulnerability signals, older-adults report | #view=profile · #view=hot · #view=elder | Within-area (sex, income) breakdowns limited by public data |

Owner actions that would close the largest gaps: run the practitioner test (5–8 people) and record results; obtain at least one independent methodological review with consent to publish; identify one organisation willing to pilot (no partnership may be claimed before a written agreement).
