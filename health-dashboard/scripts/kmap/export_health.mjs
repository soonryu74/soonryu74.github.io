/* 육각형 지도(map/)용 건강 지표 추출 — 앱이 실제로 쓰는 data.js 를 esbuild 로 묶어 값·출처·방향을 그대로 꺼낸다.
   실행: node scripts/kmap/export_health.mjs <out.json>   (app/node_modules 의 esbuild 사용)
   산출: { regions, geomap, lenses:[{id,name,unit,bad,item,year,src,values:{KOSIS코드:값}}] } — build_kmap.py 가 읽는다. */
import { build } from "../../app/node_modules/esbuild/lib/main.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = process.argv[2];
if (!OUT) { console.error("usage: node export_health.mjs <out.json>"); process.exit(1); }
const tmp = path.join(ROOT, "app/tests/.out");
mkdirSync(tmp, { recursive: true });
const entry = path.join(tmp, "km_entry.js");
writeFileSync(entry, `export * from ${JSON.stringify(path.join(ROOT, "app/src/data.js"))};`);
const out = path.join(tmp, "km_bundle.mjs");
await build({ entryPoints: [entry], bundle: true, platform: "node", format: "esm", outfile: out, loader: { ".json": "json" }, logLevel: "error" });
const D = await import(pathToFileURL(out).href);
const { INDICATORS, REGIONS, val, isSurvey, popOf, natPool } = D;

// 지도 렌즈로 쓸 지표(지역사회건강조사 6 · 사망 1 · 건강수명 2 · 검진 1 · 맥락 2). 순서 = 렌즈 순서.
const PICK = [
  ["DT_H_SM", "behavior"], ["DT_117075_H_DR_HIGH_WH", "behavior"], ["DT_H_OBE_OBE", "behavior"], ["DT_H_EX_WALK", "behavior"],
  ["DT_H_MENTAL_STRESS", "mind"], ["DT_H_MENTAL_DEPRESS", "mind"], ["K_MORT_SUI", "mind"],
  ["HLE_LE", "life"], ["HLE_HLE", "life"], ["CANC_ALL", "care"],
  ["K_POP_AGED", "context"], ["DEP_IDX", "context"],
];
const byId = new Map(INDICATORS.map((i) => [i.id, i]));
const codes = REGIONS.map((r) => r.c);
const lenses = [];
for (const [id, group] of PICK) {
  const ind = byId.get(id);
  if (!ind) { console.error("missing indicator", id); process.exit(1); }
  const hasStd = codes.some((c) => ind.years.some((y) => val(ind, "std", y, c) != null));
  const item = hasStd ? "std" : "crude";
  // 최신 연도: 시군구 값이 가장 많은 해의 80% 이상 채워진 마지막 해
  const cnt = (y) => REGIONS.filter((r) => r.l !== "sido" && val(ind, item, y, r.c) != null).length;
  const best = Math.max(...ind.years.map(cnt));
  const year = [...ind.years].reverse().find((y) => cnt(y) >= best * 0.8);
  const values = {};
  for (const c of codes) { const v = val(ind, item, year, c); if (v != null && Number.isFinite(v)) values[c] = v; }
  // 비교 집단: 지역사회건강조사는 조사 단위 258곳, 그 밖은 시군구 229곳(대시보드 natPool 과 같음)
  const pool = natPool(ind).map((r) => r.c).filter((c) => values[c] != null);
  lenses.push({ id, group, name: ind.name, unit: ind.unit || "", bad: ind.bad ?? null, item, year, survey: isSurvey(ind), src: ind.src || "", values, pool });
}
const regions = REGIONS.map((r) => ({ c: r.c, n: r.n, l: r.l, p: r.p, s: r.s, pop: popOf(r) ?? null }));
writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), regions, geomap: D.DS?.geo?.map || null, lenses }));
console.log(`wrote ${OUT}: ${regions.length} regions, ${lenses.length} lenses`);
for (const l of lenses) console.log(`  ${l.id} ${l.item} ${l.year} n=${Object.keys(l.values).length} pool=${l.pool.length}`);
