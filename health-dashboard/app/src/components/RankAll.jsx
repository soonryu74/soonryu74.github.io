import { useEffect, useMemo, useRef, useState } from "react";
import { fmt, ranked, label, classBreaks, classOf, RBY, val } from "../data";

/* 전체 보기 — 순위 전체(최대 258개)를 스크롤 없이 한 화면에 깔고, 연도를 재생하면 각 지역이 제자리를 찾아 움직인다.
   위치 = 순위, 색 = 값 7분위(지도와 같은 팔레트), 화살표 = 전년 대비 순위 변동. 모든 지표·모든 집단 탭에 동일 적용. */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export default function RankAll({ ind, item, year, pool, poolName, rev, sel, onYear, onClose, onSelect }) {
  const years = ind.years;
  const [play, setPlay] = useState(false);
  const [speed, setSpeed] = useState(1100);
  const [big, setBig] = useState(false);          // 글자 크게(열 수를 줄이고 세로 스크롤 허용)
  const [size, setSize] = useState({ w: 1200, h: 640 });
  const wrapRef = useRef(null);

  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const read = () => { const cs = getComputedStyle(el); setSize({ w: el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), h: el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) }); };
    const ro = new ResizeObserver(read); ro.observe(el); read();
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1); if (e.key === " ") { e.preventDefault(); setPlay((p) => !p); } };
    window.addEventListener("keydown", h);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = prev; };
  }, [year]);
  useEffect(() => {
    if (!play) return;
    const t = setInterval(() => onYear(years[(years.indexOf(year) + 1) % years.length]), speed);
    return () => clearInterval(t);
  }, [play, year, speed, years]);
  const step = (d) => { const i = years.indexOf(year); onYear(years[clamp(i + d, 0, years.length - 1)]); };

  // 순위 (양호한 순 기본, 역순 토글 반영)
  const rowsFor = (y) => { const a = ranked(ind, item, y, pool); return rev ? [...a].reverse() : a; };
  const rows = useMemo(() => rowsFor(year), [ind, item, year, pool, rev]);
  const prevYear = years[years.indexOf(year) - 1];
  const prevRank = useMemo(() => {
    if (prevYear == null) return null;
    const m = new Map(); rowsFor(prevYear).forEach((x, i) => m.set(x.r.c, i + 1)); return m;
  }, [ind, item, prevYear, pool, rev]);

  const breaks = useMemo(() => classBreaks(rows.map((x) => x.v)), [rows]);
  const pal = ind.bad === true ? "seqr" : ind.bad === false ? "seq" : "seqn";
  const n = rows.length;

  // 스크롤 없이 담기: 화면에 다 들어가는 최소 열 수를 찾고, 남은 높이에 맞춰 행 높이를 정한다
  const narrow = size.w < 560;
  const minColW = big ? (narrow ? 150 : 230) : (narrow ? 92 : 158);
  const minRowH = big ? 20 : (narrow ? 14 : 15), idealRowH = big ? 26 : (narrow ? 17 : 23);
  const maxCols = clamp(Math.floor(size.w / minColW), 1, 12);
  const perIdeal = Math.max(1, Math.floor(size.h / idealRowH));
  const cols = clamp(Math.ceil(n / perIdeal), 1, maxCols);
  const perCol = Math.ceil(n / cols) || 1;
  const rowH = clamp(Math.floor(size.h / perCol), minRowH, idealRowH);
  const colW = size.w / cols;
  const gridH = perCol * rowH;
  const compact = colW < 118;
  const tiny = colW < 108;                          // 아주 좁은 칸: 변동 화살표는 색으로만                       // 좁은 칸: 시도 접두어·값 글자 축소

  const nameOf = (r, short) => (r.hc ? r.hc.replace(/보건소$/, "") : r.l === "sgg" && !short ? `${r.s} ${r.n}` : r.n);
  const mineC = sel.l === "sgg" ? sel.c : sel.c;
  const myIdx = rows.findIndex((x) => x.r.c === mineC || (x.r.l === "sub" && x.r.p === mineC));
  const my = myIdx >= 0 ? rows[myIdx] : null;
  const myPrev = my && prevRank ? prevRank.get(my.r.c) : null;
  const myDelta = my && myPrev != null ? myPrev - (myIdx + 1) : null;   // + = 순위 상승(위로)

  const first = rows[0], last = rows[n - 1];
  const dirWord = ind.bad === true ? "낮을수록 양호" : ind.bad === false ? "높을수록 양호" : "방향 없음(맥락 지표)";

  return (
    <div className="rall" role="dialog" aria-label="순위 전체 보기">
      <header className="ra-head">
        <div className="ra-t">
          <div className="ra-kick">순위 전체 보기 · {poolName} · {n}개</div>
          <h3>{ind.name} <small>{item === "std" ? "표준화율" : "조율"} · {dirWord} · {rev ? "나쁜 순" : "양호한 순"}</small></h3>
        </div>
        <div className="ra-nowyear">{year}</div>
        <div className="ra-actions">
          <button className={`ra-btn ${play ? "on" : ""}`} onClick={() => setPlay(!play)}>{play ? "■ 정지" : "▶ 연도 재생"}</button>
          <button className={`ra-btn ${big ? "on" : ""}`} onClick={() => setBig(!big)} title="열 수를 줄여 글자를 크게 (세로 스크롤)">{big ? "촘촘히" : "크게"}</button>
          <select className="ra-sel" value={speed} onChange={(e) => setSpeed(+e.target.value)} title="재생 속도">
            <option value={1800}>느리게</option><option value={1100}>보통</option><option value={600}>빠르게</option>
          </select>
          <button className="ra-btn" onClick={onClose} aria-label="닫기">✕ 닫기</button>
        </div>
      </header>

      <div className="ra-bar">
        <button className="ra-step" onClick={() => step(-1)} aria-label="이전 연도">‹</button>
        {years.map((y) => <button key={y} className={`ra-y ${y === year ? "on" : ""}`} onClick={() => { setPlay(false); onYear(y); }}>{String(y).slice(2)}</button>)}
        <button className="ra-step" onClick={() => step(1)} aria-label="다음 연도">›</button>
        {my && (
          <span className="ra-me" style={{ order: 9 }}>
            {nameOf(my.r)} <b>{myIdx + 1}위</b> / {n} · {fmt(my.v)}{ind.unit}
            {myDelta != null && myDelta !== 0 && <i className={myDelta > 0 ? "up" : "down"}>{myDelta > 0 ? `▲${myDelta}` : `▼${-myDelta}`}</i>}
          </span>
        )}
        {first && <span className="ra-ends">1위 {nameOf(first.r)} {fmt(first.v)} · {n}위 {nameOf(last.r)} {fmt(last.v)}</span>}
      </div>

      <div className="ra-grid" ref={wrapRef}>
        <div className="ra-canvas" style={{ height: gridH }}>
          {rows.map(({ r, v }, i) => {
            const col = Math.floor(i / perCol), row = i % perCol;
            const cls = classOf(v, breaks);
            const pr = prevRank ? prevRank.get(r.c) : null;
            const d = pr != null ? pr - (i + 1) : null;
            const isMe = r.c === mineC || (r.l === "sub" && r.p === mineC);
            const isKin = !isMe && sel.l === "sido" && (r.p === sel.c || r.s === sel.s);
            return (
              <div key={r.c} className={`ra-cell ${isMe ? "me" : ""} ${isKin ? "kin" : ""} ${compact ? "cmp" : ""}`} title={`${label(r)} · ${fmt(v)}${ind.unit}${d != null ? ` · 전년 대비 ${d > 0 ? "▲" + d : d < 0 ? "▼" + -d : "="}` : ""}`}
                style={{ transform: `translate3d(${col * colW}px, ${row * rowH}px, 0)`, width: colW - 4, height: rowH - 2, borderLeftColor: `var(--${pal}-${cls}00)` }}
                onClick={() => { onSelect(r.l === "sub" ? r.p : r.c); onClose(); }}>
                <span className="ra-no">{i + 1}</span>
                <span className="ra-nm">{nameOf(r, compact)}</span>
                {d != null && d !== 0 && !compact && <span className={`ra-d ${d > 0 ? "up" : "down"}`}>{d > 0 ? "▲" : "▼"}{Math.abs(d)}</span>}
                {d != null && d !== 0 && compact && !tiny && <span className={`ra-d ${d > 0 ? "up" : "down"}`}>{d > 0 ? "▲" : "▼"}</span>}
                <span className="ra-v">{fmt(v)}</span>
              </div>
            );
          })}
          {!n && <div className="empty">해당 연도 자료 없음</div>}
        </div>
      </div>

      <footer className="ra-foot">
        <span className="ra-lg">색 = 값 7분위(지도와 동일)</span>
        {[1, 2, 3, 4, 5, 6, 7].map((k) => <i key={k} className="ra-sw" style={{ background: `var(--${pal}-${k}00)` }} />)}
        <span className="ra-lg">{rev ? "오른쪽·아래로 갈수록 양호" : "왼쪽·위가 양호"} · ▲▼ = 전년 대비 순위 변동 · 칸을 누르면 그 지역으로 이동 · Space 재생, ← → 연도, Esc 닫기</span>
      </footer>
    </div>
  );
}
