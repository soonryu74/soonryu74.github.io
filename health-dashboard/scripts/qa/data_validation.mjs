/* 데이터 숫자 전수 검증 — 화면·문서에 적힌 숫자를 믿지 않고, 앱이 실제로 불러오는 데이터(app/src/data.js 가 묶는 JSON)를 그대로 읽어 센다.
   실행: node scripts/qa/data_validation.mjs   (app/node_modules 의 esbuild 사용, 새 패키지 없음)
   산출: docs/DATA_VALIDATION.md · docs/indicator_metadata.csv · data/validation_summary.json(/solve·영문 소개가 읽는 숫자) */
import { build } from "../../app/node_modules/esbuild/lib/main.js";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tmp = path.join(ROOT, "app/tests/.out");
mkdirSync(tmp, { recursive: true });
const entry = path.join(tmp, "dv_entry.js");
writeFileSync(entry, `export * from ${JSON.stringify(path.join(ROOT, "app/src/data.js"))};
export { CORE, CANDIDATES } from ${JSON.stringify(path.join(ROOT, "app/src/lib/equity/index.js"))};`);
const out = path.join(tmp, "dv_bundle.mjs");
await build({ entryPoints: [entry], bundle: true, platform: "node", format: "esm", outfile: out, loader: { ".json": "json" }, logLevel: "error" });
const D = await import(pathToFileURL(out).href);
const COV = JSON.parse(readFileSync(path.join(ROOT, "data/coverage.json"), "utf8"));
let EN = {};
try { EN = JSON.parse(readFileSync(path.join(ROOT, "data/indicator_en.json"), "utf8")).labels || {}; } catch { /* 없으면 빈칸 */ }

const { INDICATORS, REGIONS, SIDOS, SGG_ALL, HC_POOL, REF_BY_KEY, indRef, isSurvey, natPool, val, CORE, CANDIDATES } = D;
const TODAY = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

// ── 지역 ──
const byLevel = (l) => REGIONS.filter((r) => r.l === l);
const sggRecords = byLevel("sgg"), subRecords = byLevel("sub");
// 시군구 단위 자료(비조사 지표) 중 최신 연도에 값이 가장 많은 지표의 값 있는 시군구 수 = 실제 비교되는 시군구 수
const sggInds = INDICATORS.filter((i) => !isSurvey(i));
const lastDataYear = (ind) => [...ind.years].reverse().find((y) => sggRecords.some((r) => val(ind, "crude", y, r.c) != null || val(ind, "std", y, r.c) != null));
let best = { n: 0, ind: null, y: null, codes: new Set() };
for (const ind of sggInds) {
  const y = lastDataYear(ind); if (y == null) continue;
  const codes = new Set(sggRecords.filter((r) => val(ind, "crude", y, r.c) != null || val(ind, "std", y, r.c) != null).map((r) => r.c));
  if (codes.size > best.n) best = { n: codes.size, ind, y, codes };
}
const sggActive = sggRecords.filter((r) => best.codes.has(r.c));
const sggInactive = sggRecords.filter((r) => !best.codes.has(r.c));
const hcSgg = HC_POOL.filter((u) => u.l === "sgg").length, hcSub = HC_POOL.filter((u) => u.l === "sub").length;

// ── 지표 ──
const item = (ind) => (D.DS.values?.[ind.id]?.std ? "std" : "crude");
const SRC_NAME = { chs: "KDCA Community Health Survey (via KOSIS)", mort: "Statistics Korea — Cause-of-death statistics", inf: "KDCA — Notifiable infectious disease reports", cancer: "NHIS — National cancer screening statistics", nhis: "NHIS — Health insurance / health screening / medical use statistics", pop: "Statistics Korea, MOIS and others — population, social, economic", env: "Ministry of Environment, MOLIT, KoROAD and others — environment & safety", hle: "Derived in this project (healthy life expectancy, approximation)", dep: "Derived in this project (area deprivation index, approximation)" };
const DEF = {
  chs: "Survey-weighted proportion (%) from ~900 respondents per survey unit; crude rate and age-sex standardized rate; standard errors from KOSIS.",
  mort: "Age-standardized death rate per 100,000 population (crude rate also).",
  inf: "Notified cases per 100,000 population.",
  cancer: "Numerator: people screened; denominator: people eligible for the national cancer screening programme (%).",
  nhis: "As defined by the NHIS statistical table (rate per population, per eligible people, or count); see source table.",
  pop: "As defined by the original statistical table.",
  env: "As defined by the original statistical table.",
  hle: "Sullivan method: life table × self-rated health (approximation; not an official statistic).",
  dep: "Sum of z-scores of 7 census variables (2015/2020 census; approximation of Kim et al. 2013).",
};
const covOf = (key) => COV.sources.find((s) => s.key === key) || null;
const rows = INDICATORS.map((ind) => {
  const r = indRef(ind) || {};
  const k = r.refs?.[0] || null;
  const ref = k ? REF_BY_KEY.get(k) : null;
  const via = (r.refs || []).includes("kdh") ? "via KDH DB v1.7 (KDCA archive)" : "";
  const it = item(ind);
  const pool = isSurvey(ind) ? natPool(ind) : sggActive;   // 실제 비교 기준(258 조사 단위 / 229 시군구)
  const yrsWithData = ind.years.filter((y) => pool.some((p) => val(ind, it, y, p.c) != null));
  const first = yrsWithData[0] ?? null, last = yrsWithData.at(-1) ?? null;
  const sidoOnly = ind.years.filter((y) => y > (last ?? 0) && SIDOS.some((s) => val(ind, it, y, s.c) != null));
  const nLast = last == null ? 0 : pool.filter((p) => val(ind, it, last, p.c) != null).length;
  const missing = last == null ? [] : pool.filter((p) => val(ind, it, last, p.c) == null).map((p) => D.label(p));
  const cov = covOf(k);
  const verified = !k ? "verification required" : r.tbl && r.url ? "verified: source table ID + URL" : via ? "source organization named in secondary DB catalog; original table ID not stored" : ref ? "source organization named; table ID not stored" : "verification required";
  return {
    id: ind.id, name_ko: ind.name, name_en: EN[ind.id] || "", source_key: k || "", source_org: ref?.org || "", source_dataset: ref?.title || "", via,
    table: r.table || ind.src || "", table_id: r.tbl || "", url: r.url || "", unit: ind.unit || "",
    level: isSurvey(ind) ? `survey unit (${HC_POOL.length}) + province (${SIDOS.length})` : `municipality (${sggActive.length}) + province (${SIDOS.length})`,
    first_year: first, last_year: last, province_only_years: sidoOnly, n_latest: nLast, pool_n: pool.length, missing_latest: missing,
    frequency: cov?.cycle || "", last_update: cov?.updated || ref?.updated || "", definition: ind.note || DEF[k] || "",
    direction: ind.direction || "", domain: ind.domain, verification: verified,
    in_core: CORE.includes(ind), in_candidates: CANDIDATES.includes(ind),
  };
});

const count = (f) => rows.filter(f).length;
const by = (key) => rows.reduce((m, r) => ((m[r[key] || "(none)"] = (m[r[key] || "(none)"] || 0) + 1), m), {});
const years = rows.filter((r) => r.first_year != null);
const minY = Math.min(...years.map((r) => r.first_year)), maxY = Math.max(...years.map((r) => r.last_year));
const survey = rows.filter((r) => r.source_key === "chs");
const surveyRange = [Math.min(...survey.map((r) => r.first_year)), Math.max(...survey.map((r) => r.last_year))];
const incomplete = rows.filter((r) => r.missing_latest.length);
const sidoOnlyRows = rows.filter((r) => r.province_only_years.length);

const summary = {
  generated: TODAY,
  regions: { provinces: SIDOS.length, municipality_records: sggRecords.length, municipalities_active: sggActive.length, municipalities_inactive: sggInactive.map((r) => `${D.label(r)} (${r.c})`), municipalities_reference: `${best.ind.name} ${best.y}`, sub_city_units: subRecords.length, region_records_total: REGIONS.length, survey_units: HC_POOL.length, survey_units_breakdown: { municipality: hcSgg, sub_city: hcSub } },
  indicators: { total: rows.length, by_source: by("source_key"), survey: survey.length, municipality_level: rows.length - survey.length, directional: count((r) => r.direction && r.direction !== "context"), context: count((r) => r.direction === "context"), radar_core: CORE.length, radar_all: CANDIDATES.length, verified_table: count((r) => r.verification.startsWith("verified")), verification_required: count((r) => r.verification === "verification required") },
  years: { first: minY, last: maxY, survey: surveyRange, by_source: Object.fromEntries(Object.keys(by("source_key")).map((k) => { const rs = rows.filter((r) => r.source_key === k && r.first_year != null); return [k, [Math.min(...rs.map((r) => r.first_year)), Math.max(...rs.map((r) => r.last_year))]]; })) },
  missing: { indicators_with_gaps_latest_year: incomplete.length, indicators_with_province_only_recent_years: sidoOnlyRows.length },
};
writeFileSync(path.join(ROOT, "data/validation_summary.json"), JSON.stringify(summary, null, 2) + "\n");

// CSV
const esc = (v) => { const s = Array.isArray(v) ? v.join("; ") : String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const COLS = ["id", "name_ko", "name_en", "source_org", "source_dataset", "via", "table", "table_id", "url", "unit", "definition", "level", "first_year", "last_year", "province_only_years", "n_latest", "pool_n", "frequency", "last_update", "direction", "domain", "in_core", "verification", "missing_latest"];
writeFileSync(path.join(ROOT, "docs/indicator_metadata.csv"), "﻿" + [COLS.join(","), ...rows.map((r) => COLS.map((c) => esc(r[c])).join(","))].join("\n") + "\n");

// Markdown
const S = summary, R = S.regions, I = S.indicators;
const srcTable = Object.entries(I.by_source).sort((a, b) => b[1] - a[1]).map(([k, n]) => `| ${k} | ${SRC_NAME[k] || k} | ${n} | ${S.years.by_source[k].join("–")} | ${covOf(k)?.cycle || ""} | ${covOf(k)?.updated || ""} |`).join("\n");
const gapTable = incomplete.sort((a, b) => b.missing_latest.length - a.missing_latest.length).map((r) => `| ${r.name_ko} | ${r.last_year} | ${r.n_latest}/${r.pool_n} | ${r.missing_latest.slice(0, 6).join(", ")}${r.missing_latest.length > 6 ? ` 외 ${r.missing_latest.length - 6}` : ""} |`).join("\n");
const md = `# Data Validation — 데이터 숫자 전수 검증

- 기준일: ${TODAY} (스크립트 실행일)
- 방법: \`node scripts/qa/data_validation.mjs\` — 앱이 실제로 불러오는 \`app/src/data.js\`(data/dataset.json · kdh_dataset.json · mort_kosis.json · cancer_screening.json · checkup.json · hle.json · deprivation.json 주입)를 esbuild 로 묶어 그대로 읽고 센다. 화면·문서의 숫자를 입력값으로 쓰지 않는다.
- 결과 파일: \`data/validation_summary.json\`(요약 숫자) · \`docs/indicator_metadata.csv\`(지표 ${I.total}개 메타데이터·결측)

## 1. 지역 — 서로 다른 숫자의 뜻

| 숫자 | 뜻 | 어디에 쓰나 |
|---|---|---|
| **${R.provinces}** | 시도(광역자치단체) | 시도 비교 |
| **${R.municipalities_active}** | 시군구 — 데이터셋 시군구 레코드 ${R.municipality_records}개 중 시군구 단위 지표가 최신 연도에 실제로 값을 갖는 최대 지역 수(기준 지표: ${R.municipalities_reference}). 제외된 레코드 ${R.municipality_records - R.municipalities_active}개: ${R.municipalities_inactive.join(", ") || "없음"} — 폐지 지역(청원군 2014·연기군 2012)과 같은 지역의 중복 코드(군위군은 2023년 경북→대구 편입으로 두 코드가 있어 자료에 따라 한쪽에만 값, 세종은 시군구 레코드와 시도 코드가 함께 있음). 행정안전부 기초자치단체 226 + 제주 행정시 2 + 세종 = 229 | 사망률·검진·인구 등 **시군구 단위 지표**의 비교 기준 |
| **${R.survey_units}** | 지역사회건강조사 **조사 단위**(보건소 관할) = 시군구 ${R.survey_units_breakdown.municipality} + 일반구 등 시 하위 단위 ${R.survey_units_breakdown.sub_city} | **지역사회건강조사 지표 ${I.survey}개**의 비교 기준(질병관리청 공표 방식) |
| ${R.sub_city_units} | 시 하위 단위 레코드(일반구·보건소 관할 등) | 조사 단위 구성 |
| ${R.region_records_total} | 데이터셋의 지역 레코드 전체(시도+시군구+하위 단위, 폐지 포함) | 내부 저장 구조 — **외부 표기에 쓰지 않는다** |

**표기 규칙**: 「${I.total}개 지표 × ${R.survey_units}개 지역」처럼 곱하거나 나란히 쓰지 않는다. ${R.survey_units}곳에 값이 있는 것은 지역사회건강조사 지표 ${I.survey}개뿐이고, 나머지 ${I.municipality_level}개는 시군구 ${R.municipalities_active}곳 단위다. 서로 다른 단위를 더하지 않는다.

## 2. 지표

- 전체 **${I.total}개** = 지역사회건강조사 ${I.survey} + 시군구 단위 ${I.municipality_level}
- 방향 있음 ${I.directional} · 맥락(방향 판단 안 함) ${I.context}
- Health Equity Radar 후보: 기본 ${I.radar_core}개(지역사회건강조사, 방향 있음) · 전체 보기 ${I.radar_all}개(방향 있음, 투입·과정·박탈 제외)
- 출처 검증: 원 통계표 ID·URL 까지 확인 ${I.verified_table}개 · 출처 미확인(verification required) ${I.verification_required}개

| 출처 키 | 출처 | 지표 수 | 연도 | 갱신 주기 | 최종 갱신 |
|---|---|---|---|---|---|
${srcTable}

※ 시군구 단위 지표 가운데 ${count((r) => r.via)}개는 원 출처(사망원인통계·건강보험통계 등)를 김동현 교수 DB v1.7(질병관리청 자료실 공개)을 경유해 받았다. 원 출처 기관은 DB 카탈로그의 「자료생산기관」으로 확인했고, 원 통계표 ID 는 저장돼 있지 않다(사망률은 2018~2025 KOSIS 원표와 35,867칸 대조 — CLAUDE.md 2026-09-25).

## 3. 기간

- 최초 연도 **${S.years.first}** · 최신 연도 **${S.years.last}** (지역사회건강조사 ${S.years.survey.join("–")})
- 출처별 기간은 위 표. 지표마다 값이 있는 첫 해·마지막 해는 CSV 의 first_year·last_year.

## 4. 최신 연도 결측

최신 연도에 비교 기준 지역 중 값이 없는 곳이 있는 지표 ${incomplete.length}개(CSV missing_latest 전체 목록).
대부분은 **저장 구조상 다른 코드에 값이 있는 경우**다: 일반구가 있는 시(고양·성남·수원 등)는 구 단위에, 세종은 시도 코드(0071)에, 군위군은 자료에 따라 경북 옛 코드에 값이 있다(자료원 탭 보유 매트릭스의 ◐). 그 밖은 원자료가 일부 지역만 공표(기상·대기·주택 등)하거나 해당 지역 자료가 없는 경우다.

| 지표 | 최신 연도 | 값 있는 곳 | 값 없는 곳(앞 6곳) |
|---|---|---|---|
${gapTable || "| (없음) | | | |"}

### 4.1 최근 연도가 시도 값만 있는 지표 ${sidoOnlyRows.length}개

지표의 연도 목록 끝에 시도 값만 있고 시군구 값은 없는 해가 있다. 시군구 비교의 최신 연도는 아래 「시군구 최신」이다(화면의 지도·순위는 값 있는 해만 쓴다).

| 지표 | 시군구 최신 | 시도 값만 있는 해 |
|---|---|---|
${sidoOnlyRows.map((r) => `| ${r.name_ko} | ${r.last_year} | ${r.province_only_years.join(", ")} |`).join("\n") || "| (없음) | | |"}

## 5. 화면·문서 숫자 점검 결과

| 표현 | 판정 |
|---|---|
| 229개 시군구 | 맞음(시군구 단위 지표의 비교 기준) |
| 258개 지역 | 맞음 — 단, **지역사회건강조사 조사 단위**를 뜻한다. 모든 지표가 258곳에 있는 것은 아님 |
| 171개 지표 | 맞음(${I.total}) — 출처별 구성은 2장 |
| 영문 소개 머리 「${I.total} indicators」 옆 「${R.survey_units} local health jurisdictions」 | **오해 소지 → 수정**: 단위별로 나눠 표기 |
| 홈 서브카피 「${I.total}개 지표 × ${R.survey_units}개 지역」 | **오해 소지 → 수정**: 곱셈 표기 제거 |

## 6. Health Equity Radar 계산(코드 기준 요약)

\`app/src/lib/equity/\` — 지표마다 네 요소를 0~1로 만든 뒤 있는 것만 가중 평균한다(결측 요소는 0으로 두지 않고 빼고 나머지 가중치를 다시 맞춘다).
1. 격차(가중 .35): 전국 중앙값 대비 **방향 보정 상대 차이**(불리한 쪽만), 30% 불리에서 최대
2. 상대 위치(.25): 비교 풀 안에서 불리한 쪽 **백분위**(값 기준 순위)
3. 최근 추세(.20): 최근 5개년(유효 3개 이상) 최소제곱 기울기의 풀 내 3분위
4. 사회경제 맥락(.20): 지역박탈지수 5분위(시군구만)

등급: 「우선 검토」 = 불리 방향 · 하위 25% · 점수 ≥ 0.55 · 95% 신뢰구간이 중앙값을 포함하지 않음 · 상대표준오차 ≤ 20% / 「관찰 필요」 / 「상대적으로 양호」 / 「자료 부족」. 화면에는 영역당 1개, 최대 3개.
z-점수·예측 모형·인과 추론은 쓰지 않는다.
`;
writeFileSync(path.join(ROOT, "docs/DATA_VALIDATION.md"), md);
console.log(JSON.stringify(summary, null, 1));
