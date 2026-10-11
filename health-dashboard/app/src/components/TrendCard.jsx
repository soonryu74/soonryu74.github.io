import { useMemo, useState } from "react";
import { fmt, label, poolFor, slopeOf, slopeGroups, TREND_START, TREND_PRE, isSurvey, HC_POOL } from "../data";
import Cite from "./Cite";

/* 10년 추세 — 2015년 이후 연간 변화(직선 기울기)와 비교 집단 속 3분위(좋음·보통·나쁨), 통합건강증진사업 도입 전(2008~2014)과 비교.
   방법: 김동현 외(2025) 「지역사회 통합건강증진사업의 건강증진 효과성 분석 연구」. 비교 집단은 상단 「비교 범위」를 따른다. */
const TIER = ["좋음", "보통", "나쁨"];
const TIER_CLS = ["tr-good", "tr-mid", "tr-bad"];

export default function TrendCard({ ind, item, sel, scope, scopeLabel, setTip }) {
  const last = ind.years[ind.years.length - 1];
  const [end, setEnd] = useState("last");
  const y1 = end === "2024" ? Math.min(2024, last) : last;
  const unitY = ind.unit === "%" ? "%p/년" : `${ind.unit}/년`;
  const dir = ind.bad == null ? null : ind.bad;   // true: 낮을수록 좋음
  const pool = poolFor(sel, scope, ind);
  const G = useMemo(() => slopeGroups(ind, item, pool, TREND_START, y1), [ind, item, pool, y1]);
  const pre = useMemo(() => slopeGroups(ind, item, pool, TREND_PRE[0], TREND_PRE[1]), [ind, item, pool]);
  const mine = slopeOf(ind, item, sel.c, TREND_START, y1);
  const minePre = slopeOf(ind, item, sel.c, TREND_PRE[0], TREND_PRE[1]);
  const tier = dir == null ? null : G.tierOf(sel.c);
  const rank = G.rankOf(sel.c);
  const hasPre = ind.years[0] <= 2010 && pre.n >= 6;

  if (G.n < 6) return <div className="empty">{TREND_START}년 이후 값이 5개 연도 이상인 지역이 부족해 추세를 계산하지 않습니다</div>;

  // 분포 막대(히스토그램) — 기울기 구간 20칸, 칸마다 3분위 색으로 쌓는다
  const W = 560, H = 150, L = 34, R = 12, T = 10, B = 30, NB = 20;
  const vals = G.rows.map((x) => x.s);
  const lo = Math.min(...vals, mine ?? Infinity, 0), hi = Math.max(...vals, mine ?? -Infinity, 0);
  const span = hi - lo || 1, bw = span / NB;
  const bins = Array.from({ length: NB }, () => [0, 0, 0]);
  G.rows.forEach((x, k) => {
    const b = Math.min(NB - 1, Math.floor((x.s - lo) / bw));
    const t = !G.groups || dir == null ? 1 : k < G.groups[0].length ? 0 : k >= G.n - G.groups[2].length ? 2 : 1;
    bins[b][t]++;
  });
  const maxC = Math.max(...bins.map((c) => c[0] + c[1] + c[2]), 1);
  const px = (v) => L + ((W - L - R) * (v - lo)) / span;
  const py = (c) => T + (H - T - B) * (1 - c / maxC);
  const barW = (W - L - R) / NB;
  const ticks = [lo, lo + span / 4, lo + span / 2, lo + (3 * span) / 4, hi];
  const sign = (v) => (v == null ? "–" : `${v > 0 ? "▲" : v < 0 ? "▼" : ""}${fmt(Math.abs(v), 2)}`);
  const verdict = (v) => (v == null || dir == null ? "" : (dir ? v < 0 : v > 0) ? "개선" : v === 0 ? "변화 없음" : "악화");
  const notInPool = mine != null && !rank;
  const multiUnit = notInPool && sel.l === "sgg" && isSurvey(ind) && HC_POOL.some((u) => u.p === sel.c);
  const sidoSelf = notInPool && sel.l === "sido";

  return (
    <div className="trendcard">
      <div className="tr-ctrls">
        <div className="seg">
          <button type="button" className={`seg-btn ${end === "last" ? "on" : ""}`} onClick={() => setEnd("last")}>{TREND_START}~{last}</button>
          {last > 2024 && <button type="button" className={`seg-btn ${end === "2024" ? "on" : ""}`} onClick={() => setEnd("2024")} title="김동현 외(2025) 연구와 같은 기간">{TREND_START}~2024 (연구 기간)</button>}
        </div>
        <span className="desc">비교 집단: <b>{scopeLabel}</b> {G.n}곳 · 값: {item === "std" ? "표준화율" : "조율"}</span>
      </div>

      <div className="tr-tiles">
        <div className="tr-tile">
          <div className="k-label">{label(sel)} 연간 변화</div>
          <div className="k-val">{sign(mine)}<small> {unitY}</small></div>
          <div className="k-sub">
            {mine == null ? "값이 5개 연도 미만이라 계산하지 않음"
              : rank ? <>{verdict(mine)}{tier != null && <> · <b className={TIER_CLS[tier]}>{TIER[tier]}</b> 그룹</>} · {G.n}곳 중 {rank}위(변화가 좋은 순)</>
              : multiUnit ? "보건소 여러 곳으로 조사되어 시 전체 순위는 없음 — 순위 카드에서 소속 보건소 확인"
              : sidoSelf ? <>{verdict(mine)} · 시도 전체 값이라 시군구 순위에는 넣지 않음 — 시도끼리 비교는 「비교 범위 → 17개 시도」</>
              : "선택 지역이 이 비교 집단에 없음"}
          </div>
        </div>
        <div className="tr-tile">
          <div className="k-label">집단 3분위 평균 기울기</div>
          {G.means && dir != null ? (
            <div className="tr-means">
              {G.means.map((m, i) => <span key={i}><b className={TIER_CLS[i]}>{TIER[i]}</b> {sign(m)}</span>)}
            </div>
          ) : <div className="k-sub">맥락 지표라 좋음·나쁨을 나누지 않습니다 · 평균 {sign(G.all)}</div>}
          <div className="k-sub">전체 평균 {sign(G.all)} {unitY} · 각 그룹 {G.groups ? G.groups[0].length : "–"}곳</div>
        </div>
        <div className="tr-tile">
          <div className="k-label">도입 전({TREND_PRE[0]}~{TREND_PRE[1]}) → 후({TREND_START}~{y1})</div>
          {hasPre ? (
            <>
              <div className="k-sub">{label(sel)} <b>{sign(minePre)}</b> → <b>{sign(mine)}</b></div>
              <div className="k-sub">집단 평균 <b>{sign(pre.all)}</b> → <b>{sign(G.all)}</b> {unitY}</div>
              <div className="k-sub muted">통합건강증진사업은 2013년 도입. 전후 차이는 사업 효과만이 아니라 조사 방법·사회 변화가 함께 들어 있습니다.</div>
            </>
          ) : <div className="k-sub">{ind.years[0]}년부터 자료라 도입 전 구간을 계산하지 않습니다</div>}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${ind.name} ${TREND_START}~${y1} 연간 변화 분포`}>
        {bins.map((c, b) => {
          let acc = 0;
          return c.map((cnt, t) => {
            if (!cnt) return null;
            const y0 = py(acc + cnt), h = py(acc) - y0; acc += cnt;
            return <rect key={`${b}-${t}`} x={L + b * barW + 1} y={y0} width={Math.max(1, barW - 2)} height={h} className={TIER_CLS[dir == null ? 1 : t]}
              onMouseMove={(ev) => setTip && setTip({ x: ev.clientX, y: ev.clientY, title: `${fmt(lo + b * bw, 2)} ~ ${fmt(lo + (b + 1) * bw, 2)} ${unitY}`, rows: [["지역 수", String(c[0] + c[1] + c[2])], ...(dir == null ? [] : TIER.map((n, i) => [n, String(c[i])]))] })}
              onMouseLeave={() => setTip && setTip(null)} />;
          });
        })}
        <line x1={px(0)} x2={px(0)} y1={T} y2={H - B} className="tr-zero" />
        {mine != null && (
          <g>
            <line x1={px(mine)} x2={px(mine)} y1={T} y2={H - B} className="tr-me" />
            <text x={Math.min(W - R - 4, Math.max(L + 4, px(mine)))} y={T + 10} className="tr-melabel" textAnchor={px(mine) > W - 120 ? "end" : "start"}>{sel.n}</text>
          </g>
        )}
        {ticks.map((v, i) => <text key={i} x={px(v)} y={H - B + 14} textAnchor="middle" className="axis">{fmt(v, 1)}</text>)}
        <text x={L + (W - L - R) / 2} y={H - 4} textAnchor="middle" className="axis">연간 변화({unitY}) · 0 왼쪽은 감소, 오른쪽은 증가</text>
      </svg>
      <div className="desc">
        방법: 지역마다 {TREND_START}~{y1}년 값에 직선을 맞춘 기울기(연간 변화량)로 줄을 세워 3등분했습니다. 연구에서는 기울기가 좋은 지역일수록 재정자립도가 높고
        고령인구·독거노인가구 비율이 낮았습니다 — 기울기 차이는 사업 효과만이 아니라 지역 여건과 함께 움직입니다. 여건과의 관계는 「연관지표」 탭에서 Y를 「10년 변화 기울기」로 바꿔 볼 수 있습니다.
        표본조사 지표는 해마다 표본오차가 있어 기울기도 오차를 품습니다.<Cite k="effect" />
      </div>
    </div>
  );
}
