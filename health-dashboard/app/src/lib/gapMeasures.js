/* 지역 간 격차 측정 — 노은정(2026-09-29 질병관리청 수도권질병대응센터 세미나) 「지역사회건강조사 기반 지역 간 건강격차 지표의 활용」 기준.
   docs/건강격차_지표_검토_v1.md P1~P3. 데이터 import 없는 순수 함수(Node 테스트 가능).
   - 격차 3방식: 최댓값−최솟값 / 상·하위 20% 경계값 차이(P80−P20, HP2030 지역 건강수명 방식) / 상·하위 20% 평균 차이(분위 평균, HP2030 소득 방식)
   - 절대(%p·단위)와 상대(배)를 함께. 비교 지역이 30곳 이하면 분위 방식은 쓰지 않는다(WHO HEAT Technical Notes v4.0).
   - 격차 변화는 「누가 움직였나」로 판정(Whitehead·Dahlgren 2006 levelling up, Lee 2025 OPHRP 16(6)). */

export const QUANTILE_MIN_N = 30;      // 이 수 이하이면 분위 기반 격차를 쓰지 않음
export const RSE_CITE = 0.3;           // 통계청 권고: 변동계수(상대표준오차) 30% 미만이면 신뢰성 있는 통계로 활용

function q(sorted, p) {
  const pos = (sorted.length - 1) * p, lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const ratio = (hi, lo) => (lo > 0 && hi != null ? hi / lo : null);

/** 값 배열 → 격차 요약. 결측(null)은 빼고 계산(0으로 바꾸지 않음).
 *  → { n, min, max, med, p20, p80, maxMin:{abs,rel}, boundary:{abs,rel}|null, quintile:{lo,hi,k,abs,rel}|null } */
export function gapMeasures(values) {
  const a = values.filter((v) => v != null && Number.isFinite(v)).sort((x, y) => x - y);
  const n = a.length;
  if (n < 2) return null;
  const min = a[0], max = a[n - 1], med = q(a, 0.5);
  const out = { n, min, max, med, p20: null, p80: null, maxMin: { abs: max - min, rel: ratio(max, min) }, boundary: null, quintile: null };
  if (n > QUANTILE_MIN_N) {
    out.p20 = q(a, 0.2); out.p80 = q(a, 0.8);
    out.boundary = { abs: out.p80 - out.p20, rel: ratio(out.p80, out.p20) };
    const k = Math.max(1, Math.round(n * 0.2));
    const lo = mean(a.slice(0, k)), hi = mean(a.slice(-k));
    out.quintile = { lo, hi, k, abs: hi - lo, rel: ratio(hi, lo) };
  }
  return out;
}

/** 방향(bad: true=낮을수록 좋음, false=높을수록 좋음)에 따른 양호한 쪽·불리한 쪽 값.
 *  side: "boundary"(20% 경계값) | "quintile"(20% 평균) */
export function sides(g, bad, side = "boundary") {
  if (!g || bad == null) return null;
  const lo = side === "quintile" ? g.quintile?.lo : g.p20, hi = side === "quintile" ? g.quintile?.hi : g.p80;
  if (lo == null || hi == null) return null;
  return bad ? { fav: lo, unfav: hi } : { fav: hi, unfav: lo };
}

/** 한 지역 값의 분포 속 위치(값이 높은 순 k번째, 상위 약 x%)와 불리한 쪽 20% 여부. 목록 밖 지역(다보건소 시 전체 등)도 값으로 자리를 매긴다. */
export function positionIn(values, v, bad) {
  const a = values.filter((x) => x != null && Number.isFinite(x));
  if (v == null || !a.length) return null;
  const higher = a.filter((x) => x > v).length;
  const k = higher + 1, n = a.length;
  const g = gapMeasures(a);
  let unfav20 = null;
  if (g?.p80 != null && bad != null) unfav20 = bad ? v > g.p80 : v < g.p20;
  return { k, n, topPct: Math.round((k / n) * 100), unfav20, g };
}

/** 우리 지역 vs 기준값: 절대 차이와 상대비(우리 ÷ 기준). */
export function versus(v, ref) {
  if (v == null || ref == null) return null;
  return { abs: v - ref, rel: ref > 0 ? v / ref : null };
}

/** 격차 변화의 4유형 판정(노은정 발표 15쪽 표).
 *  a, b = 두 시점의 { fav, unfav }(양호한 쪽·불리한 쪽 대표값), bad = 지표 방향.
 *  → { type, good, label, why } */
export function gapChangeType(a, b, bad) {
  if (!a || !b || bad == null) return null;
  const imp = (d) => (bad ? -d : d);                // 좋아진 양(+)
  const dFav = imp(b.fav - a.fav), dUnf = imp(b.unfav - a.unfav);
  const g0 = Math.abs(a.unfav - a.fav), g1 = Math.abs(b.unfav - b.fav);
  const dGap = g1 - g0;
  const eps = Math.max(0.1, g0 * 0.05);             // 이보다 작은 변화는 「유지」로 본다
  const up = (d) => d > eps, down = (d) => d < -eps;
  if (Math.abs(dGap) <= eps) {
    if (up(dFav) && up(dUnf)) return { type: "shift", good: true, label: "전체 이동", why: "양쪽 모두 비슷하게 좋아져 수준은 개선, 격차는 그대로" };
    if (down(dFav) && down(dUnf)) return { type: "shift_down", good: false, label: "전체 악화", why: "양쪽 모두 비슷하게 나빠져 격차는 그대로" };
    return { type: "flat", good: null, label: "변화 적음", why: "격차와 수준 모두 큰 변화 없음" };
  }
  if (dGap < 0) {
    if (down(dFav) && down(dUnf)) return { type: "both_worse", good: false, label: "동반 악화", why: "양쪽 모두 나빠졌는데 양호한 쪽이 더 나빠져 격차가 줄어듦 — 성과로 보지 않음" };
    if (down(dFav)) return { type: "level_down", good: false, label: "하향 수렴", why: "양호한 쪽이 나빠져 격차가 줄어듦 — 성과로 보지 않음" };
    return { type: "level_up", good: true, label: "끌어올림", why: "불리한 쪽이 더 크게 좋아져 격차가 줄어듦 — 바람직한 축소" };
  }
  if (down(dUnf)) return { type: "widen_worse", good: false, label: "격차 확대", why: "불리한 쪽이 나빠져 격차가 벌어짐" };
  if (up(dFav)) return { type: "widen_fav", good: false, label: "격차 확대", why: "양호한 쪽만 좋아져 격차가 벌어짐" };
  return { type: "widen", good: false, label: "격차 확대", why: "격차가 벌어짐" };
}

/** 정밀도 판정(지역사회건강조사 표본오차): RSE 20% 초과는 대시보드 순위 제외 기준(CHR&R), 30% 이상은 통계청 인용 주의 기준. */
export function precisionNote(rse) {
  if (rse == null) return null;
  if (rse >= RSE_CITE) return { level: "bad", text: `상대표준오차 ${(rse * 100).toFixed(1)}% — 통계청 권고 기준(30%) 이상이라 값 인용·해석에 주의` };
  if (rse > 0.2) return { level: "warn", text: `상대표준오차 ${(rse * 100).toFixed(1)}% — 인용은 가능(30% 미만)하나 대시보드 순위 제외 기준(20%)을 넘어 순위에서는 뺌` };
  return { level: "ok", text: `상대표준오차 ${(rse * 100).toFixed(1)}% — 30% 미만이라 값 자체는 인용 가능` };
}
