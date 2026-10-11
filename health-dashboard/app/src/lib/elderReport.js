/* 고령층(65세 이상) 취약 보고서 — 노인보건·방문건강관리·낙상 예방·치매 사업 담당자가 「전국에서 고령층이 취약한 곳」을 한 문서로 본다.
   분석 단위 = 시군구 229곳(감염병 고위험군 자료 risk.json·행정 지표와 같은 단위). 새 수집 없이 이미 가진 자료만 쓴다.
   묶음: A 인구 구조(규모 — 좋고 나쁨을 판정하지 않음) · B 사회·경제적 취약 · C 건강 결과 · D 돌봄·여가 자원.
   「복합 고령 취약 신호」 = B·C 6개 항목 중 불리한 쪽 20%에 든 개수. 필요(B·C)와 자원(D)은 섞지 않는다. 원인·효과·처방은 쓰지 않는다. */
import { INDICATORS, SGG_ALL, SIDOS, RBY, valSmooth, quantile, riskOf, depOf, hleOf, unitsOfCity, isSurvey, label, NCD, COVID, DEP } from "../data";
import { unfavorablePercentile } from "./equity/calculateGap.js";
import { LEGACY } from "./indicatorReport";
import KC from "../../../data/khepi_cases.json";
import CPSTF from "../../../data/cpstf_findings.json";

export const ELDER_RE = /노인|고령|65세|어르신|치매|낙상|노쇠|독거|장기요양|요양/;
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const IND = (id) => INDICATORS.find((i) => i.id === id);
const pct = (a, b) => (isNum(a) && isNum(b) && b > 0 ? (a / b) * 100 : null);
const perK = (a, b) => (isNum(a) && isNum(b) && b > 0 ? (a / b) * 1000 : null);
// 세종은 risk.json 에 시도 코드(0071)로만 있다
const riskFor = (code) => riskOf(code) || (code.startsWith("0071") ? riskOf("0071") : null);
const rv = (x, k) => (x && x[k] && isNum(x[k].v) ? x[k].v : null);
const ry = (x, k) => (x && x[k] ? x[k].y : null);

/** 항목 정의: risk.json 에서 계산하는 비율 또는 기존 지표 */
export const ELDER_ITEMS = [
  { key: "aged", grp: "A", name: "65세 이상 인구 비율", unit: "%", dir: "context", get: (x) => pct(rv(x, "age65"), x?.pop), year: (x) => ry(x, "age65"), src: "통계청 주민등록 연앙인구" },
  { key: "aged75", grp: "A", name: "75세 이상 인구 비율", unit: "%", dir: "context", get: (x) => pct(rv(x, "age75"), x?.pop), year: (x) => ry(x, "age75"), src: "통계청 주민등록 연앙인구" },
  { key: "aged85", grp: "A", name: "85세 이상 인구 비율", unit: "%", dir: "context", get: (x) => pct(rv(x, "age85"), x?.pop), year: (x) => ry(x, "age85"), src: "통계청 주민등록 연앙인구" },
  { key: "alone", grp: "B", name: "독거노인 비율(65세 이상 중)", unit: "%", dir: "lower_is_better", get: (x) => pct(rv(x, "alone_n"), rv(x, "age65")), year: (x) => ry(x, "alone_n"), src: "통계청(독거노인 수) ÷ 65세 이상 인구" },
  { key: "bpen", grp: "B", name: "기초연금 수급률(65세 이상 중)", unit: "%", dir: "lower_is_better", get: (x) => pct(rv(x, "bpen"), rv(x, "age65")), year: (x) => ry(x, "bpen"), src: "보건복지부(기초연금 수급자) ÷ 65세 이상 인구", note: "소득 하위 70% 대상 제도라 값이 높을수록 저소득 고령층 비중이 크다는 뜻" },
  { key: "chew", grp: "C", ind: "DT_H_OR_INCONV" },
  { key: "pneu", grp: "C", ind: "K_MORT_PNEU" },
  { key: "fall", grp: "C", ind: "K_MORT_FALL" },
  { key: "traffic", grp: "C", ind: "K_SAF_ELD" },
  { key: "ltcfac", grp: "D", name: "장기요양 시설 정원(65세 이상 1천 명당)", unit: "명/천명", dir: "higher_is_better", get: (x) => perK(rv(x, "ltc_fac_cap"), rv(x, "age65")), year: (x) => ry(x, "ltc_fac_cap"), src: "국민건강보험공단(시설급여 정원) ÷ 65세 이상 인구", note: "시설 소재지 기준 — 다른 지역 시설을 이용하는 경우가 있다" },
  { key: "ltchome", grp: "D", name: "장기요양 재가 정원(65세 이상 1천 명당)", unit: "명/천명", dir: "higher_is_better", get: (x) => perK(rv(x, "ltc_home_cap"), rv(x, "age65")), year: (x) => ry(x, "ltc_home_cap"), src: "국민건강보험공단(재가급여 정원) ÷ 65세 이상 인구" },
  { key: "welf", grp: "D", ind: "K_RES_WELF" },
];
export const GROUPS = { A: "인구 구조(규모)", B: "사회·경제적 취약", C: "건강 결과", D: "돌봄·여가 자원" };
export const SIGNAL_KEYS = ELDER_ITEMS.filter((it) => it.grp === "B" || it.grp === "C").map((it) => it.key);
export const SIGNAL_MIN = 3; // 6개 중 3개 이상
export const CUT = 0.8; // 불리한 쪽 20%
export const SIGNAL_AVAIL_MIN = 4; // 6개 중 값이 있는 항목이 4개 이상인 곳만 판정

/** 지표의 기준연도: 시군구 값이 가장 많은 연도 중 최신(최대의 80% 이상 채워진 마지막 해) */
function baseYear(ind, item, rows) {
  const cnt = ind.years.map((y) => [y, rows.filter((r) => isNum(valSmooth(ind, item, y, r.c, 1))).length]);
  const mx = Math.max(...cnt.map((c) => c[1]));
  return cnt.filter((c) => c[1] >= mx * 0.8).map((c) => c[0]).pop();
}

/** 시군구 r 의 지표 값 — 조사 지표인데 시 전체 값이 없으면(다보건소 시) 소속 조사 단위 평균으로 근사 */
function indVal(ind, item, y, r, smooth) {
  const v = valSmooth(ind, item, y, r.c, smooth);
  if (isNum(v)) return { v, approx: false };
  if (isSurvey(ind)) {
    const us = unitsOfCity(r.c).map((u) => valSmooth(ind, item, y, u.c, smooth)).filter(isNum);
    if (us.length) return { v: us.reduce((a, b) => a + b, 0) / us.length, approx: true };
  }
  return { v: null, approx: false };
}

export function buildElderReport(item = "std", smooth = 3) {
  // 항목 메타(지표형은 지표에서 이름·단위·방향을 가져온다)
  const items = ELDER_ITEMS.map((it) => {
    if (!it.ind) return { ...it };
    const ind = IND(it.ind);
    return ind ? { ...it, ind, name: ind.name, unit: ind.unit || "", dir: ind.direction, src: null } : null;
  }).filter(Boolean);

  // 행 = 시군구(폐지·중복 제외): 값이 하나라도 있는 곳
  let rows = SGG_ALL.map((r) => ({ r, x: riskFor(r.c), v: {}, approx: {} }));
  for (const it of items) {
    if (it.ind) {
      it.y = baseYear(it.ind, item, SGG_ALL);
      rows.forEach((o) => { const z = indVal(it.ind, item, it.y, o.r, smooth); o.v[it.key] = z.v; if (z.approx) o.approx[it.key] = true; });
    } else {
      const ys = {};
      rows.forEach((o) => { o.v[it.key] = it.get(o.x); const yy = it.year(o.x); if (yy) ys[yy] = (ys[yy] || 0) + 1; });
      it.y = +Object.entries(ys).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] || null;
    }
  }
  rows = rows.filter((o) => Object.values(o.v).filter(isNum).length >= 3);
  const has = new Set(rows.map((o) => o.r.c));
  rows = rows.filter((o) => !(LEGACY[o.r.c] && has.has(LEGACY[o.r.c])));
  // 같은 이름 중복 레코드(세종 등)는 값이 많은 쪽 하나만
  const byName = new Map();
  for (const o of rows) { const k = label(o.r), p = byName.get(k); if (!p || Object.values(o.v).filter(isNum).length > Object.values(p.v).filter(isNum).length) byName.set(k, o); }
  rows = [...byName.values()];

  // 항목별 분포와 각 지역의 위치(context 는 「높은 쪽」 위치로만 기록)
  for (const it of items) {
    const vals = rows.map((o) => o.v[it.key]).filter(isNum);
    const s = [...vals].sort((a, b) => a - b);
    it.n = s.length; it.med = quantile(s, 0.5); it.p20 = quantile(s, 0.2); it.p80 = quantile(s, 0.8); it.min = s[0]; it.max = s[s.length - 1];
    const d = it.dir === "context" ? "lower_is_better" : it.dir;
    it.cut = d === "lower_is_better" ? it.p80 : it.p20; // 불리한(context 는 높은) 쪽 20% 경계
    rows.forEach((o) => { const p = isNum(o.v[it.key]) ? unfavorablePercentile(o.v[it.key], vals, d) : null; o.u = o.u || {}; o.u[it.key] = p?.u ?? null; });
  }
  const itemBy = Object.fromEntries(items.map((it) => [it.key, it]));

  // 복합 고령 취약 신호
  rows.forEach((o) => {
    const avail = SIGNAL_KEYS.filter((k) => isNum(o.u[k]));
    o.flags = avail.filter((k) => o.u[k] >= CUT);
    o.nAvail = avail.length;
    o.sig = avail.length >= SIGNAL_AVAIL_MIN ? o.flags.length : null;
    o.dep = depOf(o.r.c);
    o.age65 = rv(o.x, "age65");
    o.lowRes = ["ltcfac", "ltchome", "welf"].filter((k) => isNum(o.u[k]) && o.u[k] >= CUT);
  });
  const signal = rows.filter((o) => o.sig != null && o.sig >= SIGNAL_MIN).sort((a, b) => b.sig - a.sig || (b.age65 || 0) - (a.age65 || 0));
  const sigDist = [0, 1, 2, 3, 4, 5, 6].map((k) => rows.filter((o) => o.sig === k).length);
  const demand = rows.filter((o) => isNum(o.u.aged) && o.u.aged >= CUT && o.lowRes.length).sort((a, b) => b.lowRes.length - a.lowRes.length || b.v.aged - a.v.aged);

  // 시도별: 인구 규모(시도 risk 행) + 신호 지역 수
  const sido = SIDOS.map((s) => {
    const x = riskOf(s.c);
    const units = rows.filter((o) => o.r.p === s.c || (s.c === "0071" && o.r.c.startsWith("0071")));
    return {
      s, pop: x?.pop ?? null, age65: rv(x, "age65"), age75: rv(x, "age75"), alone: rv(x, "alone_n"),
      aged: pct(rv(x, "age65"), x?.pop), aloneShare: pct(rv(x, "alone_n"), rv(x, "age65")),
      n: units.length, nSig: units.filter((o) => o.sig != null && o.sig >= SIGNAL_MIN).length,
    };
  });
  const sum = (k) => sido.reduce((a, b) => a + (b[k] || 0), 0);
  const nat = { pop: sum("pop"), age65: sum("age65"), age75: sum("age75"), alone: sum("alone") };
  nat.aged = pct(nat.age65, nat.pop); nat.aloneShare = pct(nat.alone, nat.age65);
  sido.sort((a, b) => (b.n ? b.nSig / b.n : 0) - (a.n ? a.nSig / a.n : 0) || b.nSig - a.nSig);

  // 박탈 분위별 신호 지역 비율(병렬 서술 — 박탈지수 구성 변수에 고령인구 비율이 들어 있다)
  const depQ = [1, 2, 3, 4, 5].map((q) => {
    const g = rows.filter((o) => o.dep?.q === q && o.sig != null);
    return { q, n: g.length, nSig: g.filter((o) => o.sig >= SIGNAL_MIN).length };
  });

  // 사업 참고 자료
  const ncd = NCD.entries.filter((e) => ELDER_RE.test(`${e.goal} ${e.area} ${(e.strategies || []).join(" ")} ${(e.interventions || []).join(" ")}`));
  const evidence = {
    national: ncd.filter((e) => e.level !== "sido").slice(0, 8),
    sidoPlans: ncd.filter((e) => e.level === "sido").length,
    cpstf: (CPSTF.items || []).filter((f) => /older adult|aged 65|55 years and older|elderly|\bfalls?\b/i.test(f.name)),
    cases: KC.cases.filter((c) => ELDER_RE.test(c.name)).sort((a, b) => b.y - a.y),
  };

  return { item, smooth, items, itemBy, rows, signal, sigDist, demand, sido, nat, depQ, depYear: DEP.year, covid: { q: COVID.age65_quartiles || [], s: COVID.summary }, evidence, n: rows.length };
}

/** 선택 지역(시군구·조사 단위·시도) → 보고서 행 또는 시도 요약 */
export function elderRowFor(m, sel) {
  if (!sel) return null;
  if (sel.l === "sido") return { sido: m.sido.find((x) => x.s.c === sel.c) || null };
  const code = sel.l === "sub" ? sel.p : sel.c;
  const row = m.rows.find((o) => o.r.c === code) || m.rows.find((o) => label(o.r) === label(RBY.get(code)));
  return row ? { row } : null;
}

const f = (v, d = 1) => (isNum(v) ? v.toFixed(d) : "–");
const man = (v) => (isNum(v) ? (v >= 10000 ? `${(v / 10000).toFixed(1)}만` : Math.round(v).toLocaleString("ko-KR")) : "–");
const du = (u) => (u === "%" ? "%p" : u ? ` ${u}` : "");

/** 고령층 보고서 문장 초안 — 계산된 사실만 */
export function draftElderParagraphs(m) {
  const I = m.itemBy, out = [];
  const a = I.aged;
  out.push(`${a.y}년 전국 65세 이상 인구는 ${man(m.nat.age65)}명으로 전체 인구의 ${f(m.nat.aged)}%이고, 75세 이상은 ${man(m.nat.age75)}명이다. 시군구별 65세 이상 비율은 중앙값 ${f(a.med)}%, 하위 20%·상위 20% 경계 ${f(a.p20)}–${f(a.p80)}%(범위 ${f(a.min)}–${f(a.max)}%)로 차이가 크다.`);
  out.push(`65세 이상 중 독거노인 비율은 시군구 중앙값 ${f(I.alone.med)}%이며 높은 쪽 20% 경계는 ${f(I.alone.p80)}%이다. 기초연금 수급률(소득 하위 70% 대상 제도)은 중앙값 ${f(I.bpen.med)}%이다.`);
  const c = ["chew", "pneu", "fall", "traffic"].map((k) => I[k]).filter(Boolean).map((it) => `${it.name} ${f(it.med)}${it.unit}(${it.y}년)`);
  if (c.length) out.push(`건강 결과 항목의 시군구 중앙값은 ${c.join(", ")}이다. 사망률은 연령 표준화 값이라 고령화 정도의 차이를 뺀 비교다.`);
  const top = m.sido.filter((x) => x.nSig).slice(0, 3).map((x) => `${x.s.n}(${x.nSig}/${x.n}곳)`);
  out.push(`사회·경제적 취약 2개와 건강 결과 4개, 모두 6개 항목 가운데 ${SIGNAL_MIN}개 이상에서 불리한 쪽 20%에 든 「복합 고령 취약 신호」 시군구는 ${m.signal.length}곳이다${top.length ? `. 이런 지역의 비율이 높은 시도는 ${top.join(", ")}이다.` : "."}`);
  if (m.demand.length) out.push(`65세 이상 비율이 높은 쪽 20%이면서 장기요양 정원이나 노인여가복지시설이 적은 쪽 20%에 든 시군구는 ${m.demand.length}곳이다(시설 소재지 기준 자원이라 인근 지역 이용을 함께 봐야 한다).`);
  const d1 = m.depQ[0], d5 = m.depQ[4];
  if (d1.n && d5.n) out.push(`지역박탈지수 1분위 지역의 ${f((d1.nSig / d1.n) * 100, 0)}%, 5분위 지역의 ${f((d5.nSig / d5.n) * 100, 0)}%가 복합 고령 취약 신호 지역이다(박탈지수 구성 변수에 고령인구 비율이 들어 있고, 함께 놓고 본 것이며 원인 관계를 뜻하지 않는다).`);
  out.push("이 문장은 공개 통계로 자동 작성한 초안이다. 사업 대상지 선정에 쓰기 전 원자료와 지역 여건을 확인한다.");
  return out;
}

export { du as elderDu, man as elderMan };
