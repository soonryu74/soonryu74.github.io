/* 지표별 보고서(전국 취약지역 현황) — 정책 담당자가 금연·절주 같은 사업을 기획할 때 「이 지표가 전국 어디에서 불리한가」를 한 문서로 본다.
   우선 검토 엔진(assess)을 비교 집단 전체(조사 단위 258곳 또는 시군구 229곳)에 돌려 얻은 판정만 쓴다.
   취약 = 비교 집단에서 불리한 쪽 상위 10%(검토 대상) / 20%(시도별 집계). 인과·처방·「최악」 표현은 쓰지 않는다. */
import { natPool, nationalMedian, quantile, SIDOS, sidoPoolOf, valSmooth, depOf, label, isSurvey, recommendFor, evidenceOf, guideOf } from "../data";
import { assess } from "./equity";
import KC from "../../../data/khepi_cases.json";

const LEGACY = { "01405": "00309" }; // 옛 코드 → 현재 코드
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const median = (a) => { const s = a.filter(isNum).sort((x, y) => x - y); return s.length ? quantile(s, 0.5) : null; };

/** 방향 보정 분위값: 불리한 쪽 상위 p 경계값 */
function unfavCut(vals, direction, p) {
  const s = vals.filter(isNum).sort((a, b) => a - b);
  if (!s.length) return null;
  return direction === "lower_is_better" ? quantile(s, 1 - p) : quantile(s, p);
}

export function buildIndicatorReport(ind, item = "std", smooth = 3) {
  const pool = natPool(ind);
  let rows = pool.map((r) => ({ r, a: assess(ind, r, item, { smooth }) })).filter((x) => isNum(x.a.v) && x.a.pos);
  // 군위군은 2023년 경북(01405)→대구(00309) 편입 — 3년 평균에서 두 코드에 모두 값이 남으면 대구 쪽 하나만 센다
  const has = new Set(rows.map((x) => x.r.c));
  rows = rows.filter((x) => !(LEGACY[x.r.c] && has.has(LEGACY[x.r.c])));
  if (!rows.length) return null;
  // 기준연도 = 가장 많은 지역이 쓰는 최신 연도
  const yc = {}; rows.forEach((x) => (yc[x.a.y] = (yc[x.a.y] || 0) + 1));
  const y = +Object.entries(yc).sort((a, b) => b[1] - a[1])[0][0];
  const vals = rows.map((x) => x.a.v);
  const dir = ind.direction;
  const ref = rows[0].a.ref;
  const p20 = quantile([...vals].sort((a, b) => a - b), 0.2), p80 = quantile([...vals].sort((a, b) => a - b), 0.8);
  const cut10 = unfavCut(vals, dir, 0.1), cut20 = unfavCut(vals, dir, 0.2);
  const worst = (x, p) => x.a.pos.u >= 1 - p;
  const withDep = (x) => ({ ...x, dep: depOf(x.r.c) || (x.r.p ? depOf(x.r.p) : null) });

  const vulnerable = rows.filter((x) => worst(x, 0.1)).map(withDep).sort((a, b) => b.a.pos.u - a.a.pos.u);
  const worsening = rows.filter((x) => x.a.trendCls?.key === "worsening" && x.a.gap?.dirAbs > 0).map(withDep).sort((a, b) => b.a.trendCls.u - a.a.trendCls.u);
  const improving = rows.filter((x) => x.a.trendCls?.key === "improving").sort((a, b) => a.a.trendCls.u - b.a.trendCls.u).slice(0, 10);

  // 시도별: 시도 값 + 그 시도 안 지역 중 불리한 쪽 20%에 든 수
  const inSet = new Set(rows.filter((x) => worst(x, 0.2)).map((x) => x.r.c));
  const sido = SIDOS.map((s) => {
    const units = sidoPoolOf(ind, s.c).filter((u) => rows.some((x) => x.r.c === u.c));
    const n20 = units.filter((u) => inSet.has(u.c)).length;
    const sv = valSmooth(ind, item, y, s.c, smooth);
    return { s, v: isNum(sv) ? sv : null, n: units.length, n20, share: units.length ? n20 / units.length : null };
  }).sort((a, b) => (b.share ?? -1) - (a.share ?? -1) || b.n20 - a.n20);

  // 박탈 분위별: 불리한 쪽 20% 비율·중앙값 (병렬 서술용, 원인 아님)
  const depRows = rows.map(withDep).filter((x) => Number.isInteger(x.dep?.q));
  const depQ = [1, 2, 3, 4, 5].map((q) => {
    const g = depRows.filter((x) => x.dep.q === q);
    return { q, n: g.length, n20: g.filter((x) => inSet.has(x.r.c)).length, med: median(g.map((x) => x.a.v)) };
  });

  // 연도별 전국 중앙값과 P80−P20(지역 간 격차)
  const series = ind.years.map((yy) => {
    const vs = pool.map((r) => valSmooth(ind, item, yy, r.c, 1)).filter(isNum).sort((a, b) => a - b);
    return vs.length >= 10 ? { y: yy, med: nationalMedian(ind, item, yy), gap: quantile(vs, 0.8) - quantile(vs, 0.2), n: vs.length } : null;
  }).filter(Boolean);

  // 사업 자료: 국가·WHO 권고 + 시도 계획 수 + NICE·CPSTF + 우수사례 수
  const recs = recommendFor(ind.name, null);
  const ev = evidenceOf(ind.id);
  return {
    ind, item, smooth, y, pool, poolName: isSurvey(ind) ? `조사 단위 ${pool.length}곳` : `시군구 ${rows.length}곳`, survey: isSurvey(ind),
    n: rows.length, hasCi: rows.some((x) => x.a.ci), ref, p20, p80, cut10, cut20, min: Math.min(...vals), max: Math.max(...vals),
    rows, vulnerable, worsening, improving, sido, depQ, series,
    evidence: {
      national: recs.filter((e) => e.level !== "sido").slice(0, 6),
      sidoPlans: recs.filter((e) => e.level === "sido").length,
      nice: (ev?.nice || []).map((x) => guideOf(x.code)).filter(Boolean).slice(0, 3),
      cpstf: (ev?.cpstf || []).filter((t) => t.n > 0).slice(0, 3),
      cases: KC.cases.filter((c) => (c.areas || []).includes(ind.domain)).length,
    },
  };
}

const f = (v, d = 1) => (isNum(v) ? v.toFixed(d) : "–");
export const regionLabel = (r) => label(r);

/** 지표 보고서 문장 초안 — 계산된 사실만 */
export function draftIndicatorParagraphs(m) {
  const u = m.ind.unit || "", lower = m.ind.direction === "lower_is_better";
  const out = [];
  out.push(`「${m.ind.name}」의 ${m.y}년 값(${m.smooth === 3 ? "기준연도 포함 최근 3년 평균" : "단년"})을 ${m.poolName}에서 보면 전국 중앙값은 ${f(m.ref)}${u}, 하위 20%·상위 20% 경계는 ${f(m.p20)}–${f(m.p80)}${u}(차이 ${f(m.p80 - m.p20)}${u === "%" ? "%p" : u})이다.`);
  const s = m.series;
  if (s.length >= 2) {
    const a = s[0], b = s[s.length - 1];
    out.push(`단년 값으로 보면 ${a.y}년 이후 전국 중앙값은 ${f(a.med)}에서 ${f(b.med)}${u}로, 지역 간 격차(P80−P20)는 ${f(a.gap)}에서 ${f(b.gap)}${u === "%" ? "%p" : u}로 바뀌었다.`);
  }
  const clear = m.vulnerable.filter((x) => x.a.ciIncludesRef === false).length;
  out.push(`${lower ? "값이 높은" : "값이 낮은"} 쪽 상위 10%(검토 대상) ${m.vulnerable.length}곳의 경계값은 ${f(m.cut10)}${u}${m.hasCi ? `이며, 이 가운데 95% 신뢰구간이 전국 중앙값과 겹치지 않는 곳은 ${clear}곳이다.` : "이다(표본오차 정보가 없는 행정 통계)."}`);
  const topSido = m.sido.filter((x) => x.n20 > 0).slice(0, 3);
  if (topSido.length) out.push(`불리한 쪽 20%에 든 지역의 비율이 높은 시도는 ${topSido.map((x) => `${x.s.n}(${x.n20}/${x.n}곳)`).join(", ")}이다.`);
  if (m.worsening.length) out.push(`전국 중앙값보다 불리하면서 최근 5년 악화 속도가 빠른 쪽에 있는 지역은 ${m.worsening.length}곳이다.`);
  const d1 = m.depQ.find((d) => d.q === 1), d5 = m.depQ.find((d) => d.q === 5);
  if (d1?.n && d5?.n) out.push(`지역박탈지수 1분위(덜 박탈) 지역의 ${f((d1.n20 / d1.n) * 100, 0)}%, 5분위(가장 박탈) 지역의 ${f((d5.n20 / d5.n) * 100, 0)}%가 불리한 쪽 20%에 들었다(함께 놓고 본 것이며 원인 관계를 뜻하지 않는다).`);
  out.push("이 문장은 공개 통계로 자동 작성한 초안이다. 사업 대상지 선정에 쓰기 전 원자료와 표본오차, 지역 여건을 확인한다.");
  return out;
}
