/* Competition Evidence Pack — 지원서(MIT Solve 등)에 쓰는 숫자가 틀리지 않도록 실제 데이터 파일과 점검 기록에서만 계산한다.
   산출: docs/COMPETITION_EVIDENCE.md · docs/MIT_SOLVE_CRITERIA_MAP.md · data/competition_evidence.json(/solve 가 읽음)
   읽는 파일: data/validation_summary.json(한국 숫자) · global/data/{wdi_compact,indicators,ts_index,evidence,evidence_registry,action_rules}.json ·
             data/qa_status.json(scripts/qa/run_all.mjs 의 점검 기록 — 없으면 "not recorded") · data/reviews.json · data/refs.json
   금지 표현 점검: 영문 화면 원본(solve/template.html · global/*.html · global/src/main.js · RadarAbout · i18n)에 과장·제휴·예측 주장이 있으면 중단(종료 코드 1).
   실행: node scripts/build_competition_evidence.mjs  (build_dashboard.py 가 /solve 생성 전에 호출) */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const J = (p) => JSON.parse(readFileSync(path.join(ROOT, p), "utf8"));
const VS = J("data/validation_summary.json");
const W = J("global/data/wdi_compact.json"), GI = J("global/data/indicators.json"), TS = J("global/data/ts_index.json");
const EV = J("global/data/evidence.json"), EVR = J("global/data/evidence_registry.json"), AR = J("global/data/action_rules.json");
const QA = existsSync(path.join(ROOT, "data/qa_status.json")) ? J("data/qa_status.json") : null;
const REV = J("data/reviews.json"), REFS = J("data/refs.json");
const git = (a) => spawnSync("git", a, { cwd: ROOT, encoding: "utf8" }).stdout.trim();
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const fmt = (n) => Number(n).toLocaleString("en-US");

// ── 숫자(모두 파일에서) ──
const R = VS.regions, I = VS.indicators, Y = VS.years;
const SRC_NAME = { chs: "Korea Community Health Survey (KDCA)", mort: "Cause-of-death statistics (Statistics Korea)", inf: "Notifiable infectious disease reports (KDCA)", nhis: "Health insurance, screening and medical-use statistics (NHIS)", cancer: "National cancer screening (NHIS)", pop: "Population, social and economic statistics", env: "Environment and safety statistics", hle: "Healthy life expectancy (derived in this project)", dep: "Area deprivation index (derived in this project)" };
const sources = Object.entries(I.by_source).map(([k, n]) => ({ key: k, name: SRC_NAME[k] || k, indicators: n, years: Y.by_source?.[k] || null }));
if (sources.some((s) => s.name === s.key)) throw new Error("이름 없는 자료원: " + sources.filter((s) => s.name === s.key).map((s) => s.key));
const gDir = Object.values(GI).filter((i) => i.direction !== "context").length;
const areas = Object.values(AR.rules).flatMap((r) => r.areas);
const okIds = new Set(EV.sources.map((s) => s.id));
const areasLinked = areas.filter((a) => typeof a !== "string" && (a.evidence || []).some((id) => okIds.has(id))).length;
const reviewsPublished = (REV.reviews || []).filter((r) => r.status !== "withdrawn").length;
const qaLine = QA ? `${QA.all_ok ? "All passed" : "FAILURES PRESENT"} — ${QA.totals.unit_tests} unit tests; ${QA.totals.browser_suites} browser test suites with ${fmt(QA.totals.browser_checks)} checks (last run ${QA.generated}, commit ${QA.commit}${QA.working_tree_clean ? "" : " + uncommitted changes"})` : "Not recorded — run node scripts/qa/run_all.mjs";

const facts = {
  generated: today, build: git(["rev-parse", "--short", "HEAD"]),
  korea: { indicators: I.total, survey_indicators: I.survey, survey_units: R.survey_units, admin_indicators: I.municipality_level, municipalities: R.municipalities_active, provinces: R.provinces, year_first: Y.first, year_last: Y.last, source_groups: sources.length, directional_indicators: I.directional, references: (REFS.refs || []).length },
  global: { economies: W.n_countries, indicators: W.n_indicators, directional_indicators: gDir, latest_records: W.n_records, observed_values_since_2000: TS.n_obs, ts_year_first: TS.year_min, ts_year_last: TS.year_max, series: TS.n_series, series_classified: TS.n_series_classified, evidence_sources_verified: EV.sources.length, evidence_sources_registered: EVR.sources.length, action_areas: areas.length, action_areas_linked: areasLinked },
  reviews_published: reviewsPublished, qa: QA ? { ...QA.totals, all_ok: QA.all_ok, last_run: QA.generated, commit: QA.commit } : null, qa_line: qaLine,
};
if (QA && !QA.all_ok) console.warn("⚠ data/qa_status.json 에 실패가 기록돼 있음 — 배포 금지");

// ── 금지 표현 점검(영문 화면 원본) ──
const FORBIDDEN = [
  [/deployed (in|across|to) \d+ countr/i, "deployed in N countries"], [/used by \d+ (countr|government|health)/i, "used by N countries"],
  [/validated by (the )?(government|ministr|WHO)/i, "validated by governments"], [/WHO[- ](supported|approved|endorsed|partner)/i, "WHO-supported/approved"],
  [/MIT[- ](supported|funded|affiliated|endorsed)/i, "MIT-supported"], [/in (official )?partnership with/i, "partnership claim"],
  [/\b\d[\d,]* (active )?(users|practitioners|health centres) (use|used|rely)/i, "user numbers"], [/AI[- ](predicts|recommends|diagnoses|powered)/i, "AI claim"],
  [/real-time surveillance/i, "real-time surveillance"], [/proven (impact|globally|effective)/i, "proven impact"], [/(reduces?|will reduce|lowers?) (smoking|mortality|obesity|disease) by/i, "effect claim"],
  [/risk map/i, "risk map"],
];
const SCAN = ["solve/template.html", "global/index.html", "global/methodology/index.html", "global/src/main.js", "app/src/components/equity/RadarAbout.jsx", "app/src/components/equity/i18n.js"];
const hits = [];
for (const f of SCAN) { const t = readFileSync(path.join(ROOT, f), "utf8"); for (const [re, label] of FORBIDDEN) { const m = t.match(re); if (m) hits.push(`${f}: "${m[0]}" (${label})`); } }
if (hits.length) { console.error("금지 표현 발견 — 중단\n" + hits.join("\n")); process.exit(1); }

// ── 구현 기능(파일이 실제로 있는지 확인) ──
const FEATURES = [
  ["Health Equity Priority (priority → why → possible action) for any province or municipality, Korean/English", "app/src/components/equity/EquityPriorityCard.jsx", "#view=profile&sido=009&sgg=00901&en=1"],
  ["Transparent priority engine (gap, relative position, trend, deprivation; missing parts renormalized; confidence-interval and RSE checks)", "app/src/lib/equity/calculatePriority.js", null],
  ["Indicator information panel (source, years, definition, standardization, direction, update date, cautions)", "app/src/components/equity/IndInfo.jsx", null],
  ["Indicator analysis: map, ranking with confidence intervals, trends, gaps", "app/src/components/ChoroplethMap.jsx", "#view=analysis"],
  ["Combined-vulnerability signals (several unfavourable conditions at once)", "app/src/components/equity/EquityHotspot.jsx", "#view=hot"],
  ["Region comparison with equity summary", "app/src/components/equity/CompareEquity.jsx", "#view=compare"],
  ["Peer-group comparison (areas with similar ageing, fiscal capacity, density, deprivation)", "app/src/components/PeerCard.jsx", null],
  ["Community health report, national indicator report and older-adults report (print / PDF / Word)", "app/src/components/RegionReport.jsx", "#view=report&sido=009&sgg=00901"],
  ["Prevention knowledge base linked to WHO, national and provincial plans, NICE and CPSTF", "app/src/components/NcdView.jsx", "#view=ncd"],
  ["Sources tab with per-source coverage of all survey units", "app/src/components/SourcesView.jsx", "#view=sources"],
  ["In-app feedback (copy, email, .json/.txt download; no server, no personal data)", "app/src/components/UsabilityFeedback.jsx", null],
  ["English overview page", "app/src/components/equity/RadarAbout.jsx", "#view=radar"],
  ["Global prototype (World Bank WDI): income-group peer comparison, observed trends, verified evidence links", "global/src/main.js", "global/"],
];
for (const [, f] of FEATURES) if (!existsSync(path.join(ROOT, f))) throw new Error("기능 파일 없음: " + f);
const SITE = "https://health-profile.kr/";
const LIMITS = [
  "Survey indicators carry sampling error; neighbouring ranks may not differ meaningfully.",
  "No programme input or output data: the tool cannot evaluate programme performance or effects.",
  "Healthy life expectancy and the deprivation index are approximations computed for this project, not official statistics.",
  "The prevention knowledge base was collected and summarized with AI assistance; original documents are linked and must be checked.",
  "Korean interface except /solve, the English overview and the Health Equity Priority card.",
  "Global prototype: national averages only (no within-country data), many values are modelled estimates, evidence relevance not yet reviewed by a domain expert.",
  `No user testing or impact evidence yet; ${reviewsPublished} independent reviews published.`,
];
const NOT_DO = ["Does not diagnose disease.", "Does not predict future disease.", "Does not estimate causal policy effects.", "Does not automatically recommend public-budget allocation.", "Does not claim that neighbouring ranks are meaningfully different.", "Does not replace local public-health judgement."];
const CLAIMS_NO = ["deployed in / used by 217 countries (correct: prototype applied to data from 217 countries and economies)", "validated by governments, WHO, MIT or any partner", "user numbers, adoption, impact or cost savings", "AI prediction, AI diagnosis or AI-generated policy", "risk map, real-time surveillance, proven impact"];

// ── COMPETITION_EVIDENCE.md ──
const K = facts.korea, G = facts.global;
const md = `# Competition Evidence Pack

Generated automatically on ${today} from the data files and test records in this repository (\`node scripts/build_competition_evidence.mjs\`, run by \`scripts/build_dashboard.py\`). **Use these numbers in applications; do not retype them from memory.** If a number here differs from any other document, this file wins until the data change.

## 1. Build
- Source repository commit at generation: \`${facts.build}\` (the site footer shows the build of the deployed page).
- Data validation date: ${VS.generated} (\`docs/DATA_VALIDATION.md\`).

## 2–4. Korea deployment — indicators, geography, years
| Fact | Value | Note |
|---|---|---|
| Health indicators | ${K.indicators} | ${K.survey_indicators} survey + ${K.admin_indicators} administrative / derived |
| Survey indicators | ${K.survey_indicators} | Korea Community Health Survey, compared across **${K.survey_units} survey units** |
| Administrative / derived indicators | ${K.admin_indicators} | compared across **${K.municipalities} municipalities** (si·gun·gu) |
| Provinces | ${K.provinces} | |
| Years | ${K.year_first}–${K.year_last} | coverage differs by source |
| Directional indicators (used for priorities) | ${K.directional_indicators} | the rest are context, never judged |
| Source groups | ${K.source_groups} | see section 5 |

Do not combine levels (wrong: "${K.indicators} indicators across ${K.survey_units} areas").

## 5. Source groups
| Source | Indicators | Years |
|---|---|---|
${sources.map((s) => `| ${s.name} | ${s.indicators} | ${s.years ? s.years.join("–") : "–"} |`).join("\n")}

## 6. Tests
${qaLine}.
${QA ? `\n| Suite | Passed | Failed |\n|---|---|---|\n${QA.suites.map((s) => `| ${s.name} | ${s.passed} | ${s.failed} |`).join("\n")}\n\nGlobal v0.1 comparison (all 217 economies: signals, Watch, top 3, scores unchanged): ${QA.global_v01_comparison}.` : ""}

## 7. Implemented functions (each file checked to exist)
| Function | File | Live |
|---|---|---|
${FEATURES.map(([t, f, u]) => `| ${t} | \`${f}\` | ${u ? `[open](${SITE}${u})` : "–"} |`).join("\n")}

## 8. Known limitations
${LIMITS.map((l) => `- ${l}`).join("\n")}

## 9. Global prototype (portability test)
| Fact | Value |
|---|---|
| Countries and economies | ${G.economies} (prototype applied to their data — **not** deployed in or used by them) |
| World Bank WDI indicators | ${G.indicators} (${G.directional_indicators} used for signals, the rest context) |
| Latest-value records | ${fmt(G.latest_records)} |
| Observed values in the time series | ${fmt(G.observed_values_since_2000)} (${G.ts_year_first}–${G.ts_year_last}, observed years only, no interpolation) |
| Country–indicator series / with trend classification | ${fmt(G.series)} / ${fmt(G.series_classified)} |

## 10. Evidence sources
- Global action areas: ${G.evidence_sources_verified} of ${G.evidence_sources_registered} registered public sources technically verified (HTTP status, page title, key terms); linked to ${G.action_areas_linked} of ${G.action_areas} action areas. Expert relevance review: **not yet done**.
- Korea: reference list of ${K.references} official sources; prevention knowledge base with original-document links.
- Independent reviews published: ${reviewsPublished}.

## 11. URLs
- Judge page: ${SITE}solve/
- Korea demo (English priority card): ${SITE}#view=profile&sido=009&sgg=00901&en=1
- English overview: ${SITE}#view=radar
- Global prototype: ${SITE}global/ · methodology: ${SITE}global/methodology/
- Data validation: ${SITE}docs/DATA_VALIDATION.md · this file: ${SITE}docs/COMPETITION_EVIDENCE.md

## 12. What it does not do / claims we must not make
${NOT_DO.map((l) => `- ${l}`).join("\n")}

Never claim: ${CLAIMS_NO.join("; ")}. The build stops if these phrases appear in the English page sources (${SCAN.length} files checked, 0 found on ${today}).
`;
writeFileSync(path.join(ROOT, "docs/COMPETITION_EVIDENCE.md"), md);

// ── MIT_SOLVE_CRITERIA_MAP.md ──
const ND = "Not yet demonstrated";
const rows = [
  ["Impact (alignment with the problem; potential to improve lives)", `Working tool for local health plans: ${K.indicators} indicators, priorities with computed reasons, reports for planning`, "/solve/ · docs/MIT_SOLVE_READINESS.md", `${ND}: no measured change in decisions or health outcomes; practitioner test planned (docs/PRACTITIONER_TEST_PROTOCOL.md)`],
  ["Feasibility (can it be built and run)", "Live at health-profile.kr; static site, no server or login; annual data refresh scripts in the repository", "https://health-profile.kr/ · scripts/", "Single maintainer; no funded operations plan yet"],
  ["Innovation", "Connects official data → priority → explanation → linked official evidence for one community, with uncertainty on the same screen; same engine reused for the global prototype", "app/src/lib/equity/ · global/src/main.js", `${ND}: no external comparison study`],
  ["Human-centered design", "Korean public-health terms, English mode for judges, mobile layout, accessibility checks, in-app feedback with file export", "scripts/qa/solve_readiness_e2e.mjs · UsabilityFeedback", `User testing needed — ${ND} (0 sessions run)`],
  ["Scalability", `Global prototype applied to data from ${G.economies} countries and economies, ${G.indicators} WDI indicators, ${fmt(G.observed_values_since_2000)} observed values`, "/global/ · docs/GLOBAL_RADAR_v0.2.md", "External pilot needed; within-country data outside Korea not tested"],
  ["Partnership potential", `External review requests sent; ${reviewsPublished} reviews published`, "Sources tab → External review", "No formal partners"],
  ["Technical feasibility", qaLine, "data/qa_status.json · docs/DATA_VALIDATION.md · docs/COMPETITION_EVIDENCE.md", "Single-file build is 10 MB (gzip ~2.4 MB); lazy-loading plan not yet executed (docs/PERFORMANCE_PLAN.md)"],
  ["Equity focus", "Gap from the national median, deprivation shown side by side (never as cause), combined-vulnerability signals, older-adults report", "#view=profile · #view=hot · #view=elder", "Within-area (sex, income) breakdowns limited by public data"],
];
const cm = `# MIT Solve — criteria map (current evidence and gaps)

Generated automatically on ${today} with the Competition Evidence Pack (numbers from data files; see \`docs/COMPETITION_EVIDENCE.md\`). Missing evidence is written as “${ND}”. Criterion names follow the general Solve judging themes; check the exact wording of the current challenge before submission.

| Criterion | Current evidence | URL / file | Gap |
|---|---|---|---|
${rows.map((r) => `| ${r.join(" | ")} |`).join("\n")}

Owner actions that would close the largest gaps: run the practitioner test (5–8 people) and record results; obtain at least one independent methodological review with consent to publish; identify one organisation willing to pilot (no partnership may be claimed before a written agreement).
`;
writeFileSync(path.join(ROOT, "docs/MIT_SOLVE_CRITERIA_MAP.md"), cm);
writeFileSync(path.join(ROOT, "data/competition_evidence.json"), JSON.stringify(facts, null, 1));
console.log(`증거 묶음: 한국 지표 ${K.indicators}(${K.survey_indicators}/${K.survey_units} · ${K.admin_indicators}/${K.municipalities}) · Global ${G.economies}개 경제권·${G.indicators}지표·관측 ${fmt(G.observed_values_since_2000)} · 근거 ${G.evidence_sources_verified}건 · 점검 ${QA ? (QA.all_ok ? "통과" : "실패 있음") : "기록 없음"} · 금지 표현 0`);
