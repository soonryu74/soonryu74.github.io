/* 지역 보고서 자동 생성 — 순수 함수(화면과 분리, 테스트 가능).
   우선 검토 엔진(priorityFor)의 판정을 그대로 써서 「계산된 사실」만으로 보고서 모델과 현황 분석 문장 초안을 만든다.
   인과·효과·처방 표현을 쓰지 않는다. 문장은 담당자가 원자료와 대조해 고쳐 쓰는 초안이다. */

const f = (v, d = 1) => (v == null || !Number.isFinite(v) ? "–" : v.toFixed(d));
const unitTxt = (u) => u || "";
export const TIER_KO = { priority: "우선 검토", watch: "관찰 필요", ok: "상대적으로 양호", insufficient: "자료 부족" };

/** 강점: 전국 중앙값보다 양호하고 비교 집단에서 양호한 쪽 25% 안(불리 백분위 u ≤ 0.25) */
export function strengthsOf(rows, n = 5) {
  return rows.filter((r) => r.tier !== "insufficient" && r.gap && r.gap.dirAbs < 0 && r.pos && r.pos.u <= 0.25)
    .sort((a, b) => a.pos.u - b.pos.u).slice(0, n);
}

/** 추세 묶음: 비교 집단 대비 악화 경향 / 개선 경향 */
export function trendGroups(rows) {
  const ok = rows.filter((r) => r.trendCls);
  return {
    worsening: ok.filter((r) => r.trendCls.key === "worsening").sort((a, b) => b.trendCls.u - a.trendCls.u),
    improving: ok.filter((r) => r.trendCls.key === "improving").sort((a, b) => a.trendCls.u - b.trendCls.u),
  };
}

/** 영역별 묶음(원래 지표 순서 유지) */
export function byDomain(rows) {
  const m = new Map();
  for (const r of rows) { if (!m.has(r.domain)) m.set(r.domain, []); m.get(r.domain).push(r); }
  return [...m.entries()];
}

const listNames = (rs, max = 5) => {
  const names = rs.slice(0, max).map((r) => `「${r.name}」`);
  return rs.length > max ? `${names.join(", ")} 등 ${rs.length}개` : names.join(", ");
};

/**
 * 현황 분석 문장 초안.
 * @param {object} m { regionName, isSido, p (core priority), strengths, trends, dep, hle, poolDesc, basis }
 * @returns {string[]} 문단 배열
 */
export function draftParagraphs(m) {
  const { regionName, p, strengths, trends, dep, hle, poolDesc, basis } = m;
  const c = p.counts, n = p.rows.length;
  const out = [];
  out.push(`${regionName}의 지역사회건강조사 지표 ${n}개를 ${poolDesc}과 비교하면 「우선 검토」 ${c.priority}개, 「관찰 필요」 ${c.watch}개, 「상대적으로 양호」 ${c.ok}개${c.insufficient ? `, 「자료 부족」 ${c.insufficient}개` : ""}로 분류된다(값: ${basis}).`);
  if (p.top.length) {
    const items = p.top.map((r) => `「${r.name}」(${r.domain}, ${f(r.v)}${unitTxt(r.unit)} · 전국 중앙값 ${f(r.ref)}${unitTxt(r.unit)} · ${TIER_KO[r.tier]})`);
    out.push(`전국 중앙값보다 불리하고 비교 집단에서 불리한 쪽에 있어 먼저 검토할 지표는 ${items.join(", ")}이다. 이는 지역보건 검토 순서를 정하기 위한 표시이며 원인이나 사업 효과를 뜻하지 않는다.`);
  } else {
    out.push("전국 중앙값보다 뚜렷이 불리한 지표는 없다.");
  }
  if (strengths.length) out.push(`전국 중앙값보다 양호하고 비교 집단에서 양호한 쪽 25% 안에 있는 지표는 ${listNames(strengths)}이다.`);
  const tw = trends.worsening, ti = trends.improving;
  if (tw.length || ti.length) {
    const parts = [];
    if (tw.length) parts.push(`비교 집단보다 악화 속도가 빠른 쪽(악화 경향)은 ${listNames(tw)}`);
    if (ti.length) parts.push(`개선 경향은 ${listNames(ti)}`);
    out.push(`최근 5년 추세에서 ${parts.join(", ")}이다.`);
  }
  const ctx = [];
  if (dep?.q) ctx.push(`지역박탈지수(근사, ${dep.year}년)는 5분위 중 ${dep.q}분위(5 = 가장 박탈)`);
  if (hle) ctx.push(`기대수명 ${f(hle.le)}세, 건강수명(주관적 건강 기반·근사) ${f(hle.hle)}세(${hle.y}년, 3년 합산)`);
  if (ctx.length) out.push(`사회경제·건강수명 맥락: ${ctx.join("; ")}. 박탈지수와 건강지표는 함께 놓고 볼 뿐 원인 관계를 뜻하지 않는다.`);
  out.push("이 문장은 공개 통계로 자동 작성한 초안이다. 계획서에 쓰기 전 원자료(KOSIS 등)와 대조하고, 표본조사 오차와 지역 여건을 반영해 담당자가 수정한다.");
  return out;
}
