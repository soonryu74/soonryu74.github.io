import { useEffect, useRef, useState } from "react";
import { fmt, ranked, poolFor, label, SUBS_BY_SGG, val, SIDOS, SGG_ALL, SGG_BY_SIDO, RBY, HC_POOL,
         ci, hasSe, unstableRows, RSE_UNSTABLE } from "../data";
import RankAll from "./RankAll";

/* 순위: 비교 집단(전국 시군구 / 시도 내 시군구 / 17개 시도) 막대. 선택 지역 자동 스크롤 */
export default function RankPanel({ ind, item, year, sel, scope, onSelect, onYear }) {
  // 순위 집단 탭: 17개 시도 · 전국 시군구 · 시도 내 시군구 (기본은 선택 지역에 따라 자동)
  const sidoCode = sel.l === "sido" ? sel.c : sel.p;
  const sidoName = RBY.get(sidoCode)?.n || "";
  const [mode, setMode] = useState("auto");
  useEffect(() => setMode("auto"), [sel.c, scope]);
  // 기본: 시도를 고르면 그 시도의 시군구 순위, 시군구를 고르면 비교 범위(전국/시도)에 따라. 17개 시도 순위는 탭으로.
  const auto = sel.l === "sido" ? "insido" : scope === "sido" ? "insido" : "nation";
  const m = mode === "auto" ? auto : mode;
  const pool = m === "sido" ? SIDOS : m === "nation" ? SGG_ALL : m === "insido" ? SGG_BY_SIDO[sidoCode] : m === "hc" ? HC_POOL : poolFor(sel, scope);
  const [rev, setRev] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  // 표본오차가 있는 지표(지역사회건강조사)만 신뢰구간·불안정값 제외를 적용한다.
  const se = hasSe(ind);
  const [drop, setDrop] = useState(true);
  const [showCi, setShowCi] = useState(true);
  const rowsAsc = ranked(ind, item, year, pool, { dropUnstable: se && drop });
  const rows = rev ? [...rowsAsc].reverse() : rowsAsc;
  const dropped = se && drop ? unstableRows(ind, item, year, pool) : [];
  // 신뢰구간 겹침 비교는 선택 지역이 이 순위 목록에 들어 있을 때만 의미가 있다
  const selInPool = rowsAsc.some((x) => x.r.c === sel.c);
  const selCi = se && selInPool ? ci(ind, item, year, sel.c) : null;
  const rankNo = (k) => (rev ? rows.length - k : k + 1);
  const TABS = [["sido", "17개 시도"], ["nation", "전국 시군구"], ["insido", `${sidoName} 시군구`], ["hc", "보건소 단위"]];
  const hcOf = (c) => HC_POOL.find((u) => u.c === c);
  // 오차막대가 트랙을 넘지 않도록 상한은 신뢰구간 상단까지 포함해 잡는다.
  const max = rows.length ? Math.max(...rows.map((x) => (showCi && x.ci ? x.ci.hi : x.v))) : 1;
  const listRef = useRef(null);
  useEffect(() => {
    const el = listRef.current?.querySelector(".rrow.sel");
    if (el && listRef.current) {
      const top = el.offsetTop - listRef.current.clientHeight / 2 + el.clientHeight / 2;
      listRef.current.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
  }, [ind, item, year, sel, scope, m]);

  const subs = sel.l === "sgg" ? SUBS_BY_SGG[sel.c] : null;

  const mine = (r) => r.c === sel.c || (sel.l === "sido" && m !== "insido" && (r.p === sel.c || r.s === sel.s)) || (m === "hc" && sel.l === "sgg" && r.l === "sub" && r.p === sel.c);
  const rowLabel = (r) => m === "hc" ? (r.hc || label(r)) : m === "nation" && r.l === "sgg" ? `${r.s} ${r.n}` : r.n;
  return (
    <>
      <div className="seg" style={{ marginBottom: 8, flexWrap: "wrap" }}>
        {TABS.map(([k, name]) => <button key={k} className={`seg-btn ${m === k ? "on" : ""}`} onClick={() => setMode(k)}>{name}</button>)}
        <span className="muted" style={{ alignSelf: "center", fontSize: "13px", marginLeft: 6 }}>{rows.length}개</span>
        <button className="seg-btn" style={{ marginLeft: "auto" }} onClick={() => setAllOpen(true)} title="순위 전체를 한 화면에 펼치고 연도별 변동을 애니메이션으로 보기">⛶ 전체 보기</button>
        <button className={`seg-btn ${rev ? "on" : ""}`} onClick={() => setRev(!rev)} title="양호한 순 ↔ 나쁜 순">{rev ? "나쁜 순 ▲" : "양호한 순 ▼"}</button>
      </div>
      {se && (
        <div className="seg ci-bar" style={{ marginBottom: 8, flexWrap: "wrap" }}>
          <button className={`seg-btn ${showCi ? "on" : ""}`} onClick={() => setShowCi(!showCi)}
            title="표본조사 값의 95% 신뢰구간(±1.96×표준오차)을 막대 위에 표시합니다">⟺ 신뢰구간</button>
          <button className={`seg-btn ${drop ? "on" : ""}`} onClick={() => setDrop(!drop)}
            title={`표준오차가 추정값의 ${RSE_UNSTABLE * 100}%를 넘는 값은 불안정으로 보고 순위에서 제외합니다 (County Health Rankings 규칙)`}>
            불안정값 제외{dropped.length ? ` (${dropped.length})` : ""}</button>
          <span className="muted ci-note">표본조사 값입니다. 신뢰구간이 겹치면 순위 차이를 확신할 수 없습니다.</span>
        </div>
      )}
      {m === "hc" && <div className="desc" style={{ marginBottom: 6 }}>조사 단위(보건소)별 순위 — 질병관리청 「2025 지역건강통계 한눈에 보기」 부록의 시군구별 표 기준 258개 조사 단위(일반구가 있는 시는 보건소별 행, 시 전체 행 제외, 세종은 세종특별자치시보건소)</div>}
      <div className="rank scroll" ref={listRef}>
        {rows.map((x, k) => { const { r, v } = x;
          const blur = showCi && selCi && x.ci && r.c !== sel.c && x.ci.lo <= selCi.hi && selCi.lo <= x.ci.hi;
          return (
          <div key={r.c} className={`rrow ${r.c === sel.c ? "sel" : ""} ${mine(r) ? "mine" : ""} ${blur ? "blur" : ""}`} onClick={() => onSelect(r.l === "sub" ? r.p : r.c)} title={r.l === "sub" ? `${label(r)} → 소속 시군구 선택` : undefined}>
            <div className="rn">{rankNo(k)}</div>
            <div className="rl" title={label(r)}>{rowLabel(r)}</div>
            <div className="bar-track">
              <div className="bar" style={{ width: `${((v / max) * 100).toFixed(1)}%` }} />
              {showCi && x.ci && (
                <span className="err" style={{ left: `${(Math.max(0, x.ci.lo) / max * 100).toFixed(1)}%`,
                  width: `${((Math.min(max, x.ci.hi) - Math.max(0, x.ci.lo)) / max * 100).toFixed(1)}%` }} />
              )}
            </div>
            <div className="rv">
              {fmt(v)}
              {showCi && x.ci && <small className="moe">±{fmt(x.ci.moe)}</small>}
            </div>
          </div>
        ); })}
        {!rows.length && <div className="empty">해당 연도 자료 없음</div>}
      </div>
      {se && showCi && (selCi || dropped.length > 0) && (
        <div className="desc ci-legend">
          {selCi && <>{label(sel)} {fmt(selCi.v)} <b>(95% 신뢰구간 {fmt(selCi.lo)}~{fmt(selCi.hi)})</b></>}
          {selCi?.unstable && <span className="warn-chip">표본오차가 커서 불안정</span>}
          {selCi && <span className="muted"> · 흐리게 표시된 지역은 {label(sel)}와 신뢰구간이 겹쳐 차이를 확신할 수 없는 곳입니다.</span>}
          {!!dropped.length && <span className="muted"> · 불안정으로 순위에서 제외: {dropped.length}곳</span>}
        </div>
      )}
      {allOpen && (
        <RankAll ind={ind} item={item} year={year} pool={pool} poolName={TABS.find(([k]) => k === m)?.[1] || ""} rev={rev} sel={sel}
          onYear={(y) => onYear && onYear(y)} onClose={() => setAllOpen(false)} onSelect={onSelect} />
      )}
      {subs && (
        <div className="subs">
          <div className="desc">보건소별 세부 단위 ({year}년)</div>
          {subs.map((s) => (
            <span key={s.c} className="subchip">{s.n} <b>{fmt(val(ind, item, year, s.c))}</b></span>
          ))}
        </div>
      )}
    </>
  );
}
