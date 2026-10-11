import { useMemo, useState } from "react";
import { SIDOS, SGG_ALL, HC_POOL, RBY, fmt, label, val } from "../../data";
import { priorityFor, mostImproved, CORE } from "../../lib/equity";
import { TierBadge } from "./EquityPriorityCard";

/* 홈 「내 지역 건강격차 빠르게 보기」 — 지역을 고르면 미니 카드 3개(우선 검토 지표 · 최근 개선 지표 · 지역 간 격차가 큰 지표) + 프로파일로 이동.
   검색 대상은 시도·시군구·보건소 이름(보건소는 소속 시군구 프로파일로 연결). */
const du = (u) => (u === "%" ? "%p" : u ? ` ${u}` : "");

// 전국 조사 단위 사이 격차가 가장 큰 지표: 최신 연도 상위 10% 평균 − 하위 10% 평균(절대 격차, %p).
// 상대비(배)는 값이 0에 가까운 지표에서 부풀므로(예: 0.2% vs 6.0% = 29배) 순서는 절대 격차로 정하고 상대비는 함께 적기만 한다.
const WIDEST = (() => {
  let best = null;
  for (const ind of CORE) {
    if (ind.unit !== "%") continue;
    const y = ind.years[ind.years.length - 1];
    const v = HC_POOL.map((r) => val(ind, "std", y, r.c)).filter((x) => x != null).sort((a, b) => a - b);
    if (v.length < 100) continue;
    const k = Math.round(v.length * 0.1), mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
    const lo = mean(v.slice(0, k)), hi = mean(v.slice(-k)), gap = hi - lo;
    if (!best || gap > best.gap) best = { ind, y, lo, hi, gap, ratio: lo > 0 ? hi / lo : null };
  }
  return best;
})();

function search(q) {
  const t = q.replace(/\s/g, "");
  if (!t) return [];
  const out = [], seen = new Set();
  const push = (code, text) => { if (!seen.has(code) && RBY.get(code)) { seen.add(code); out.push({ code, text }); } };
  for (const r of SIDOS) if (r.n.replace(/\s/g, "").includes(t)) push(r.c, r.n);
  for (const r of SGG_ALL) if (`${r.s}${r.n}`.replace(/\s/g, "").includes(t)) push(r.c, `${r.s} ${r.n}`);
  for (const u of HC_POOL) if (u.l === "sub" && (u.hc || "").replace(/\s/g, "").includes(t)) push(u.p, `${u.hc} → ${label(RBY.get(u.p))}`);
  return out.slice(0, 6);
}

export default function HomeEquityQuick({ sel, onGo }) {
  const [q, setQ] = useState("");
  const [pick, setPick] = useState(null);
  const code = pick || (sel ? sel.c : null);
  const reg = code ? RBY.get(code) : null;
  const hits = useMemo(() => search(q), [q]);
  const p = useMemo(() => (reg ? priorityFor(reg, "std", { smooth: 3 }) : null), [reg]);
  const top = p?.top[0] || null, imp = p ? mostImproved(p) : null;
  const wide = WIDEST && p ? p.rows.find((r) => r.id === WIDEST.ind.id) : null;
  return (
    <div className="heq">
      <div className="heq-search">
        <label className="heq-label" htmlFor="heq-q">지역 고르기</label>
        <input id="heq-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="보건소 또는 시군구를 검색하세요" autoComplete="off" />
        {hits.length > 0 && (
          <div className="heq-hits" role="listbox" aria-label="검색 결과">
            {hits.map((h) => <button key={h.code} type="button" role="option" aria-selected={h.code === code} className="chip" onClick={() => { setPick(h.code); setQ(""); }}>{h.text}</button>)}
          </div>
        )}
        <div className="heq-cur">선택: <b>{reg ? label(reg) : "–"}</b>{!pick && sel && <span className="muted"> (현재 선택 지역)</span>}</div>
      </div>
      {p && (
        <div className="heq-cards">
          <div className="heq-mini">
            <div className="heq-k">우선 검토 지표</div>
            {top ? <><div className="heq-v">{top.name}</div><div className="heq-s"><TierBadge tier={top.tier} /> {fmt(top.v)}{top.unit} · 전국 중앙값 {fmt(top.ref)}{top.unit}</div></>
              : <div className="heq-s">전국 중앙값보다 뚜렷이 불리한 지표 없음</div>}
          </div>
          <div className="heq-mini">
            <div className="heq-k">최근 개선 지표</div>
            {imp ? <><div className="heq-v">{imp.name}</div><div className="heq-s">✓ 개선 경향 · {imp.trend.y0}–{imp.trend.y1} 연 {imp.trend.slope > 0 ? "▲" : "▼"}{fmt(Math.abs(imp.trend.slope), 2)}{du(imp.unit)}</div></>
              : <div className="heq-s">최근 5년 「개선 경향」 지표 없음(또는 자료 부족)</div>}
          </div>
          <div className="heq-mini">
            <div className="heq-k">지역 간 격차가 큰 지표</div>
            {WIDEST ? <><div className="heq-v">{WIDEST.ind.name}</div><div className="heq-s">전국 조사 단위 상위 10% 평균 {fmt(WIDEST.hi)}% vs 하위 10% {fmt(WIDEST.lo)}% — 차이 {fmt(WIDEST.gap)}%p({WIDEST.y}년){wide?.band ? ` · 우리 지역 ${wide.pos.n <= 30 ? `${wide.pos.n}곳 중 ${wide.pos.rank}위` : wide.band.label}` : ""}</div></> : <div className="heq-s">–</div>}
          </div>
        </div>
      )}
      <div className="hc-ctas">
        <button type="button" className="hc-cta" disabled={!reg} onClick={() => reg && onGo({ view: "profile", code: reg.c })}>우리 지역 Health Equity Profile 보기 →</button>
        <button type="button" className="hc-cta hc-cta2" disabled={!reg} onClick={() => reg && onGo({ view: "report", code: reg.c })}>📄 지역 보고서 만들기</button>
      </div>
    </div>
  );
}
