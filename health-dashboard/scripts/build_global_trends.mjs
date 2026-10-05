/* Global Health Equity Radar v0.2 — 2000년 이후 관측 시계열 → 국가별 추세 파일
   입력: health-dashboard/private/wdi/health_equity_wdi_timeseries_2000_latest.csv (World Bank WDI 추출본, 커밋하지 않음 — 원본 전체 CSV 를 웹에 올리지 않는다)
         global/data/health_equity_wdi_latest.json (v0.1 원본, 교차 검증용) · global/data/indicators.json (방향)
   산출: global/data/ts/<ISO3>.json   — 그 나라 지표별 관측점 [연도, 값] 원본 그대로 + 추세 요약 (국가 선택 시에만 불러옴)
         global/data/ts_peer_median.json — 소득그룹별 연도 중앙값(그해 관측한 나라만, n ≥ 10 인 해만)
         global/data/ts_index.json     — 건수·검증 결과 요약(방법론 페이지·문서가 읽음)
   원칙: 관측된 해만 쓴다. 빈 해를 보간하거나 값을 만들지 않는다. 결측은 0 이 아니라 「관측 없음」.
         추세는 과거 관측값의 요약이며 원인 설명이나 예측이 아니다. 신호(현재 위치)는 v0.1 그대로 latest 값만으로 정한다.
   교차 검증: 국가×지표마다 시계열의 마지막 관측(연도·값)이 latest.json 과 같아야 한다 — 하나라도 다르면 중단.
   사용: node scripts/build_global_trends.mjs  (CSV 가 없으면 기존 산출물을 그대로 두고 건너뜀) */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { olsSlope, trendClass } from "../app/src/lib/equity/calculateTrend.js";
import { medianOf } from "../app/src/lib/equity/calculateGap.js";

const ROOT = new URL("../", import.meta.url).pathname;
const CSV = ROOT + "private/wdi/health_equity_wdi_timeseries_2000_latest.csv";
const D = ROOT + "global/data/";
const TS = D + "ts/";

// 공개 설정(방법론 10절과 같음)
export const TREND_WINDOW = 10;     // 마지막 관측 연도를 포함한 최근 10년 창
export const TREND_MIN_POINTS = 4;  // 창 안 관측 연도가 4개 이상일 때만 기울기
export const STALE_BEFORE = 2015;   // v0.1 과 같음: 마지막 관측이 2015년 이전이면 추세를 분류하지 않음
export const MIN_PEERS = 10;        // v0.1 과 같음: 소득그룹 안 비교 대상이 10 미만이면 전 세계
export const PEER_MEDIAN_MIN_N = 10;
export const LABEL = { improving: "Improving", stable: "No clear change", worsening: "Worsening" };
// 95% 양측 t 임계값(df 1–30)
const T95 = [NaN, 12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.160, 2.145, 2.131, 2.120, 2.110, 2.101, 2.093, 2.086, 2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042];

if (!existsSync(CSV)) {
  console.log(`추세: 원본 CSV 없음(${CSV.replace(ROOT, "")}) — 기존 global/data/ts* 를 그대로 둠`);
  if (!existsSync(D + "ts_index.json")) console.log("  ⚠ ts_index.json 도 없음 — CSV 를 private/wdi/ 에 두고 다시 실행할 것");
  process.exit(0);
}

// ── CSV 읽기(RFC 4180: 따옴표 안 쉼표·줄바꿈·"" 처리) ──
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(f); f = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(f); f = ""; rows.push(row); row = [];
    } else f += ch;
  }
  if (f !== "" || row.length) { row.push(f); rows.push(row); }
  return rows.filter((r) => r.length > 1 || r[0] !== "");
}
const buf = readFileSync(CSV);
const sha256 = createHash("sha256").update(buf).digest("hex");
const rows = parseCsv(buf.toString("utf8"));
const head = rows.shift();
const col = Object.fromEntries(head.map((h, i) => [h, i]));
for (const need of ["Country Code", "Country Name", "Indicator Code", "year", "value", "Income Group", "Region", "License Type"]) if (!(need in col)) throw new Error(`CSV 열 없음: ${need}`);

const IND = JSON.parse(readFileSync(D + "indicators.json", "utf8"));
const LATEST = JSON.parse(readFileSync(D + "health_equity_wdi_latest.json", "utf8"));
const dirParam = (d) => (d === "higher_is_concern" ? "lower_is_better" : d === "lower_is_concern" ? "higher_is_better" : null);

// ── 원본 점검 ──
const series = {};           // c → code → [[y, v], …]
const meta = {};             // c → {name, income, region}
const seen = new Set();
let empty = 0, badLic = 0;
for (const r of rows) {
  const c = r[col["Country Code"]], code = r[col["Indicator Code"]], ys = r[col.year], vs = r[col.value];
  if (vs.trim() === "") { empty++; continue; }                 // 빈 값은 관측 없음 — 0 으로 바꾸지 않음
  if (r[col["License Type"]] !== "CC BY-4.0") badLic++;
  const y = Number(ys), v = Number(vs);
  if (!Number.isInteger(y) || !Number.isFinite(v)) throw new Error(`숫자 아님: ${c} ${code} ${ys} ${vs}`);
  if (!IND[code]) throw new Error(`indicators.json 에 없는 지표 ${code}`);
  const k = `${c}|${code}|${y}`;
  if (seen.has(k)) throw new Error(`중복 관측 ${k}`);
  seen.add(k);
  const m = { name: r[col["Country Name"]], income: r[col["Income Group"]], region: r[col.Region] };
  if (meta[c] && (meta[c].income !== m.income || meta[c].region !== m.region)) throw new Error(`국가 속성 불일치 ${c}`);
  meta[c] = m;
  ((series[c] ||= {})[code] ||= []).push([y, v]);
}
if (badLic) throw new Error(`CC BY-4.0 이 아닌 행 ${badLic}`);
for (const c in series) for (const code in series[c]) series[c][code].sort((a, b) => a[0] - b[0]);
const nObs = seen.size;
const years = [...seen].map((k) => +k.split("|")[2]);

// ── 교차 검증: 마지막 관측 = latest.json ──
let mism = 0, noSeries = 0, pre2000 = 0; const mismList = [];
const latestKeys = new Set();
for (const r of LATEST) {
  const c = r["Country Code"], code = r["Indicator Code"]; latestKeys.add(`${c}|${code}`);
  const s = series[c]?.[code];
  if (!s) { noSeries++; if (r.year < 2000) pre2000++; continue; }
  const [y, v] = s[s.length - 1];
  if (y !== r.year || v !== r.value) { mism++; if (mismList.length < 10) mismList.push(`${c} ${code}: ts ${y}=${v} vs latest ${r.year}=${r.value}`); }
}
let extra = 0;
for (const c in series) for (const code in series[c]) if (!latestKeys.has(`${c}|${code}`)) extra++;
const latestMeta = {}; for (const r of LATEST) latestMeta[r["Country Code"]] = { income: r["Income Group"], region: r.Region };
const metaMism = Object.keys(meta).filter((c) => !latestMeta[c] || latestMeta[c].income !== meta[c].income || latestMeta[c].region !== meta[c].region);
if (mism || extra || metaMism.length || noSeries !== pre2000) {
  console.error("교차 검증 실패 — 빌드 중단", { mism, extra, metaMism, noSeries, pre2000, mismList });
  process.exit(1);
}

// ── 최근 추세(관측점만) ──
function recentFit(s) {
  const end = s[s.length - 1][0];
  const pts = s.filter(([y]) => y > end - TREND_WINDOW && y <= end);
  if (pts.length < TREND_MIN_POINTS) return { reason: `fewer than ${TREND_MIN_POINTS} observed years in ${end - TREND_WINDOW + 1}–${end}`, n: pts.length, y0: end - TREND_WINDOW + 1, y1: end };
  const slope = olsSlope(pts);
  const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
  let sxx = 0, sse = 0;
  for (const [x] of pts) sxx += (x - mx) ** 2;
  for (const [x, y] of pts) sse += (y - (my + slope * (x - mx))) ** 2;
  const se = Math.sqrt(sse / (n - 2) / sxx);
  const t = T95[Math.min(n - 2, 30)];
  return { slope, se, lo: slope - t * se, hi: slope + t * se, n, y0: pts[0][0], y1: pts[n - 1][0] };
}
const sig = (x) => +x.toPrecision(6); // 요약 통계만 6자리(관측값은 원본 그대로)
const fits = {}; // c → code → fit
for (const c in series) for (const code in series[c]) (fits[c] ||= {})[code] = recentFit(series[c][code]);

// 분류: 방향 지표 · 마지막 관측 ≥ 2015 · 기울기 있음.
//  - 방향(Improving/Worsening/No clear change) = 직선 기울기의 95% 구간이 0 을 포함하는지 + 방향 보정 부호(척도와 무관한 규칙).
//  - 또래와 비교한 위치 = 한국 엔진 trendClass 의 3분위(같은 소득그룹 기울기 분포, 10 미만이면 전 세계).
// v0.1 과 같은 공개 제외 규칙: 고소득국 빈곤($3.00) 은 값이 거의 0 이라 신호·점수에서 빼므로 추세 분류에서도 뺀다(관측점은 표시)
export const TREND_EXCLUSIONS = [{ code: "SI.POV.DDAY", income: "High income" }];
const excluded = (c, code) => TREND_EXCLUSIONS.some((e) => e.code === code && e.income === meta[c].income);
const classifiable = (c, code) => { const f = fits[c][code], s = series[c][code]; return dirParam(IND[code].direction) && f.slope != null && s[s.length - 1][0] >= STALE_BEFORE && !excluded(c, code); };
const poolSlopes = {}; // code → {all:[], byInc:{}}
for (const c in fits) for (const code in fits[c]) if (classifiable(c, code)) {
  const P = (poolSlopes[code] ||= { all: [], byInc: {} });
  P.all.push(fits[c][code].slope); (P.byInc[meta[c].income] ||= []).push(fits[c][code].slope);
}
function classify(c, code) {
  const f = fits[c][code], d = dirParam(IND[code].direction);
  const sign = d === "lower_is_better" ? 1 : -1;           // 불리한 쪽이 +
  const loU = Math.min(sign * f.lo, sign * f.hi), hiU = Math.max(sign * f.lo, sign * f.hi);
  const key = f.se === 0 ? (f.slope === 0 ? "stable" : sign * f.slope > 0 ? "worsening" : "improving")
    : loU > 0 ? "worsening" : hiU < 0 ? "improving" : "stable";
  const P = poolSlopes[code], peers = P.byInc[meta[c].income] || [];
  const usePeers = peers.length >= MIN_PEERS, pool = usePeers ? peers : P.all;
  const tc = trendClass(f.slope, d, pool, null);
  return { key, label: LABEL[key], peerU: tc ? +tc.u.toFixed(4) : null, peerTertile: tc ? tc.tertile : null, peerN: pool.length, peerIsIncome: usePeers };
}

// ── 소득그룹 연도 중앙값(그해 관측한 나라만) ──
const peerMed = {};
for (const code in IND) {
  const by = {}; // inc → y → [v]
  for (const c in series) { const s = series[c][code]; if (!s) continue; for (const [y, v] of s) ((by[meta[c].income] ||= {})[y] ||= []).push(v); }
  for (const inc in by) {
    const arr = Object.entries(by[inc]).map(([y, vs]) => [+y, vs.length >= PEER_MEDIAN_MIN_N ? medianOf(vs) : null, vs.length]).filter((r) => r[1] != null).sort((a, b) => a[0] - b[0]);
    if (arr.length) ((peerMed[inc] ||= {})[code] = arr);
  }
}

// ── 쓰기 ──
mkdirSync(TS, { recursive: true });
for (const f of readdirSync(TS)) if (f.endsWith(".json")) unlinkSync(TS + f);
const count = { improving: 0, stable: 0, worsening: 0 }; let nClassified = 0, nSlope = 0, nSeries = 0;
const indCounts = {}; // code → 관측 국가 수
for (const c of Object.keys(series).sort()) {
  const out = {};
  for (const code of Object.keys(series[c]).sort()) {
    const s = series[c][code], f = fits[c][code]; nSeries++; indCounts[code] = (indCounts[code] || 0) + 1;
    const first = s[0], last = s[s.length - 1];
    const rec = f.slope == null ? { n: f.n, y0: f.y0, y1: f.y1, reason: f.reason } : { slope: sig(f.slope), se: sig(f.se), lo: sig(f.lo), hi: sig(f.hi), n: f.n, y0: f.y0, y1: f.y1 };
    if (f.slope != null) nSlope++;
    if (f.slope != null && classifiable(c, code)) { Object.assign(rec, classify(c, code)); count[rec.key]++; nClassified++; }
    else if (f.slope != null && dirParam(IND[code].direction)) rec.reason = excluded(c, code) ? "not classified for high-income economies — values at the $3.00/day line are near zero for most of them" : `last observation ${last[0]} is before ${STALE_BEFORE}; trend not classified`;
    out[code] = { obs: s, recent: rec, long: s.length >= 2 ? { y0: first[0], v0: first[1], y1: last[0], v1: last[1] } : null };
  }
  writeFileSync(TS + `${c}.json`, JSON.stringify({ c, income: meta[c].income, series: out }));
}
writeFileSync(D + "ts_peer_median.json", JSON.stringify({ note: `Median of the countries in each World Bank income group that have an observed value in that year; years with fewer than ${PEER_MEDIAN_MIN_N} observing countries are omitted. No interpolation.`, min_n: PEER_MEDIAN_MIN_N, groups: peerMed }));
const index = {
  source: "World Bank, World Development Indicators (WDI) — Health Equity Radar time-series extract, 2000–latest (CC BY-4.0 per series metadata)",
  file: "health_equity_wdi_timeseries_2000_latest.csv (not published; derived per-country files only)", sha256, bytes: buf.length,
  n_rows: rows.length, n_obs: nObs, n_empty_values: empty, n_countries: Object.keys(series).length, n_indicators: Object.keys(indCounts).length,
  n_directional_indicators: Object.keys(indCounts).filter((k) => dirParam(IND[k].direction)).length,
  year_min: Math.min(...years), year_max: Math.max(...years), n_series: nSeries, n_series_with_slope: nSlope, n_series_classified: nClassified, classified: count,
  cross_check: { latest_records: LATEST.length, matched_last_observation: LATEST.length - noSeries, mismatches: mism, latest_before_2000_without_series: pre2000, series_not_in_latest: extra },
  settings: { window_years: TREND_WINDOW, min_points: TREND_MIN_POINTS, stale_before: STALE_BEFORE, min_peers: MIN_PEERS, peer_median_min_n: PEER_MEDIAN_MIN_N, classification: "95% interval of the straight-line slope excludes zero (direction-adjusted); peer position = tertile of income-group slopes (trendClass)" },
  countries_per_indicator: indCounts,
};
writeFileSync(D + "ts_index.json", JSON.stringify(index, null, 1));
console.log(`추세: CSV ${rows.length.toLocaleString()}행 = 관측 ${nObs.toLocaleString()}개(빈 값 ${empty}) · ${index.n_countries}개국 · 지표 ${index.n_indicators}개(방향 ${index.n_directional_indicators}) · ${index.year_min}–${index.year_max}`);
console.log(`  교차 검증: latest ${LATEST.length}개 중 마지막 관측 일치 ${LATEST.length - noSeries} · 불일치 ${mism} · 2000년 이전 latest(시계열 없음) ${pre2000}`);
console.log(`  시계열 ${nSeries}개 · 기울기 ${nSlope} · 분류 ${nClassified} (Improving ${count.improving} / No clear change ${count.stable} / Worsening ${count.worsening}) · sha256 ${sha256.slice(0, 16)}…`);
