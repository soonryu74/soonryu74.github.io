import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { REF_BY_KEY, indRef, hasSe, isSurvey, TIER_INFO } from "../../data";
import { DIRECTION_LABEL } from "../../lib/equity/normalizeIndicator.js";

/* 지표 정보 창(ⓘ) — 자료원·조사연도·지표 정의·표준화 여부·방향·업데이트 날짜·주의사항.
   지표 정의문 필드는 따로 없으므로 원 통계표 이름과 원표 링크로 안내한다(지어내지 않음). Esc·바깥 클릭으로 닫힘. */
export function indMeta(ind) {
  const t = indRef(ind);
  const src = t?.refs?.[0] ? REF_BY_KEY.get(t.refs[0]) : null;
  const last = ind.years[ind.years.length - 1];
  const std = hasSe(ind) ? "조율과 성·연령 표준화율을 모두 제공(화면 상단 「값」에서 선택)"
    : /표준화/.test(ind.name) ? "원자료의 연령 표준화 값" : "원자료 값(조율·표준화 구분 없음)";
  const cautions = [];
  if (ind.note) cautions.push(ind.note);
  if (ind.spliced) cautions.push("두 원표를 이어 붙인 시계열 — 연결 연도 전후 비교 주의");
  if (ind.mortSpliced) cautions.push("최근 연도는 국가데이터처 사망원인통계 원표 값으로 이어 붙임");
  if (hasSe(ind)) cautions.push("표본조사 값 — 95% 신뢰구간을 함께 보고, 상대표준오차 20% 초과 값은 불안정으로 봅니다");
  if (!hasSe(ind)) cautions.push("표준오차 정보가 없어 신뢰구간을 표시할 수 없습니다");
  if (ind.tier && TIER_INFO[ind.tier]) cautions.push(`결과사슬 「${ind.tier}」 · 권장 측정 주기 ${TIER_INFO[ind.tier].cycle} · 순위 비교 ${TIER_INFO[ind.tier].rankable === true ? "가능" : TIER_INFO[ind.tier].rankable === false ? "부적합" : TIER_INFO[ind.tier].rankable}`);
  return {
    source: src ? `${src.org} 「${src.title}」` : ind.src || "–",
    years: `${ind.years[0]}–${last} (${ind.years.length}개 연도)`,
    def: t?.table || null, defUrl: t?.url || null, formula: ind.formula || null,
    std, direction: DIRECTION_LABEL[ind.direction] || "–", dirNote: ind.dirNote || null,
    updated: src?.updated || null, survey: isSurvey(ind), cautions,
  };
}

export default function IndInfo({ ind, label = "지표 정보" }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const box = useRef(null), btn = useRef(null), pop = useRef(null);
  useEffect(() => {
    if (!open) return;
    const out = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    const close = () => setOpen(false);
    document.addEventListener("pointerdown", out); document.addEventListener("keydown", esc);
    window.addEventListener("scroll", close, true); window.addEventListener("resize", close);
    return () => { document.removeEventListener("pointerdown", out); document.removeEventListener("keydown", esc); window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close); };
  }, [open]);
  useLayoutEffect(() => {
    if (!open || !btn.current || !pop.current) return;
    const b = btn.current.getBoundingClientRect(), p = pop.current.getBoundingClientRect();
    const W = window.innerWidth, H = window.innerHeight, m = 8, w = Math.min(400, W - m * 2);
    const left = Math.max(m, Math.min(b.left, W - w - m));
    const below = H - m - (b.bottom + 6), above = b.top - 6 - m, down = p.height <= below || below >= above;
    setPos({ left, width: w, top: down ? b.bottom + 6 : Math.max(m, b.top - 6 - Math.min(p.height, above)), maxHeight: Math.max(140, down ? below : above) });
  }, [open]);
  const m = open ? indMeta(ind) : null;
  return (
    <span className="cite indinfo" ref={box}>
      <button type="button" ref={btn} className="info-btn" aria-expanded={open} aria-haspopup="dialog" aria-label={`${ind.name} ${label}`} title={`${label} — 자료원·정의·방향·주의사항`}
        onClick={(e) => { e.stopPropagation(); setPos(null); setOpen((o) => !o); }}>ⓘ</button>
      {open && (
        <span className="cite-pop info-pop" role="dialog" aria-label={`${ind.name} ${label}`} ref={pop}
          style={pos ? { left: pos.left, top: pos.top, width: pos.width, maxHeight: pos.maxHeight } : { visibility: "hidden", left: 0, top: 0, width: Math.min(400, window.innerWidth - 16) }}
          onClick={(e) => e.stopPropagation()}>
          <b className="info-title">{ind.name} <small className="muted">({ind.unit})</small></b>
          <dl className="info-dl">
            <dt>자료원</dt><dd>{m.source}</dd>
            <dt>조사연도</dt><dd>{m.years}</dd>
            <dt>지표 정의</dt><dd>{m.def ? <>원 통계표 「{m.def}」{m.defUrl && <> · <a href={m.defUrl} target="_blank" rel="noopener noreferrer">원표 열기 ↗</a></>}</> : "원 출처 정의를 따릅니다"}{m.formula && <><br /><span className="muted">산식: {m.formula}</span></>}</dd>
            <dt>표준화 여부</dt><dd>{m.std}</dd>
            <dt>방향</dt><dd>{m.direction}{m.dirNote && <><br /><span className="muted">{m.dirNote}</span></>}</dd>
            <dt>업데이트</dt><dd>{m.updated || "–"}</dd>
            <dt>주의사항</dt><dd><ul>{m.cautions.map((c, i) => <li key={i}>{c}</li>)}</ul></dd>
          </dl>
        </span>
      )}
    </span>
  );
}
