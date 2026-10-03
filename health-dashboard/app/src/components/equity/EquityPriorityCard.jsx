import { useMemo, useState } from "react";
import { fmt, label, DEP } from "../../data";
import { priorityFor, SCOPES, TIERS, WEIGHTS, THRESHOLDS, TREND_WINDOW, TREND_MIN } from "../../lib/equity";
import WhyThisMatters from "./WhyThisMatters";
import EvidenceActions from "./EvidenceActions";
import IndInfo from "./IndInfo";

/* Health Equity Priority — 지역 프로파일 맨 위. 「우리 지역 우선 검토 항목」 3개 + 왜 우선인가 + 참고할 수 있는 자료.
   진단·처방·정책효과 추정이 아니라 지역보건 검토 순서를 돕는 표시다. 점수는 화면 내부용 기술 점수(공식 지수 아님)이고 등급만 보인다. */
const du = (u) => (u === "%" ? "%p" : u ? ` ${u}` : "");
export const TierBadge = ({ tier }) => { const t = TIERS[tier]; return <span className={`eq-tier ${t.cls}`}><span aria-hidden="true">{t.icon}</span> {t.label}</span>; };
const depWord = (q) => (q == null ? null : q >= 4 ? "높음" : q === 3 ? "중간" : "낮음");

export default function EquityPriorityCard({ sel, item, smooth = 3, onPick, onPeer, onGoCard, onRecommend }) {
  const [scope, setScope] = useState("core");
  const p = useMemo(() => priorityFor(sel, item, { smooth, scope }), [sel, item, smooth, scope]);
  const [showAll, setShowAll] = useState(false);
  if (!p) return null;
  const isSido = sel.l === "sido";
  const basis = smooth === 3 ? "기준연도 포함 최근 3년 평균" : "최신 연도 값";
  const nTotal = p.rows.length;
  const order = { priority: 0, watch: 1, ok: 2, insufficient: 3 };
  return (
    <div className="card eq-card">
      <h3>우리 지역 우선 검토 항목 <small className="muted">Health Equity Priority · {label(sel)}</small></h3>
      <div className="eq-summary">
        <div className="eq-sum-text">
          <b>핵심 요약</b> — {SCOPES[scope].label} {nTotal}개 중
          {" "}<TierBadge tier="priority" /> <b>{p.counts.priority}</b>
          {" "}· <TierBadge tier="watch" /> <b>{p.counts.watch}</b>
          {" "}· <TierBadge tier="ok" /> <b>{p.counts.ok}</b>
          {p.counts.insufficient > 0 && <> · <TierBadge tier="insufficient" /> <b>{p.counts.insufficient}</b></>}
          {p.dep?.q ? <> · 지역박탈지수 <b>{p.dep.q}분위</b>(5 = 가장 박탈, {DEP.year}년)</> : isSido ? <> · 시도 단위라 지역박탈지수는 계산에서 제외</> : <> · 지역박탈지수 자료 없음(계산에서 제외)</>}
        </div>
        <div className="seg eq-scope" role="group" aria-label="후보 지표 범위">
          {Object.entries(SCOPES).map(([k, s]) => <button key={k} type="button" className={`seg-btn ${scope === k ? "on" : ""}`} aria-pressed={scope === k} onClick={() => setScope(k)}>{s.label} {s.n}</button>)}
        </div>
      </div>
      <div className="desc">값: {basis} · 비교: {isSido ? "순위는 17개 시도, 격차는 전국 중앙값" : "전국 중앙값(지역사회건강조사는 조사 단위 258곳, 그 밖은 시군구)"} · 진단이나 처방이 아니라 지역보건 <b>검토 순서</b>를 돕는 표시입니다.</div>

      {p.top.length === 0 ? (
        <div className="empty">전국 중앙값보다 뚜렷이 불리한 지표가 없습니다. 아래 「전체 판정」에서 지표별 위치를 볼 수 있습니다.</div>
      ) : (
        <div className="eq-grid">
          {p.top.map((r, i) => (
            <section key={r.id} className={`eq-item ${TIERS[r.tier].cls}`} aria-label={`${i + 1}. ${r.name}`}>
              <div className="eq-head">
                <span className="eq-no">{i + 1}</span>
                <div className="eq-title">
                  <div className="eq-dom muted">{r.domain}</div>
                  <div className="eq-name">{r.name}<IndInfo ind={r.ind} /></div>
                </div>
                <TierBadge tier={r.tier} />
              </div>
              <dl className="eq-facts">
                <div><dt>지역 값</dt><dd><b>{fmt(r.v)}{r.unit}</b><small>{r.y}년{r.k === 3 ? " 기준 3년 평균" : ""}</small></dd></div>
                <div><dt>전국 중앙값</dt><dd><b>{fmt(r.ref)}{r.unit}</b><small>차이 {r.gap.abs > 0 ? "+" : r.gap.abs < 0 ? "−" : "±"}{fmt(Math.abs(r.gap.abs))}{du(r.unit)}</small></dd></div>
                <div><dt>상대 위치</dt><dd><b>{r.pos.n <= 30 ? `${r.pos.n}곳 중 ${r.pos.rank}위` : r.band?.label}</b><small>{r.pos.n <= 30 ? "양호한 순" : `${r.poolName} ${r.pos.n}곳`}</small></dd></div>
                <div><dt>최근 추세</dt><dd><b>{r.trendCls ? r.trendCls.label : "평가 안 함"}</b><small>{r.trend ? `${r.trend.y0}–${r.trend.y1} 연 ${r.trend.slope > 0 ? "▲" : r.trend.slope < 0 ? "▼" : ""}${fmt(Math.abs(r.trend.slope), 2)}${du(r.unit)}` : `유효 연도 ${TREND_MIN}개 미만`}</small></dd></div>
                <div><dt>사회경제적 취약성</dt><dd><b>{depWord(r.depQ) || (isSido ? "해당 없음" : "자료 없음")}</b><small>{r.depQ ? `지역박탈 ${r.depQ}분위` : "가중치 재정규화"}</small></dd></div>
              </dl>
              <WhyThisMatters reasons={r.reasons} />
              <EvidenceActions row={r} sel={sel} onPick={onPick} onPeer={onPeer} onGoCard={onGoCard} onRecommend={onRecommend} />
            </section>
          ))}
        </div>
      )}
      <div className="desc hc-note">표본조사 값이라 이웃한 순위의 차이는 작을 수 있습니다. 상대 위치는 정확한 순번 대신 구간(상위권·중간권·하위권·불리한 쪽 상위 10%)으로 보여 줍니다.</div>

      <details className="eq-more" open={showAll} onToggle={(e) => setShowAll(e.currentTarget.open)}>
        <summary>전체 판정 {nTotal}개 보기 <span className="muted">— 지표별 등급·차이·위치</span></summary>
        {showAll && (
          <div className="tblscroll"><table className="yeartbl eq-all">
            <thead><tr><th>등급</th><th>지표</th><th>지역 값</th><th>전국 중앙값</th><th>위치</th><th>추세</th></tr></thead>
            <tbody>
              {[...p.rows].sort((a, b) => order[a.tier] - order[b.tier] || (b.score ?? -1) - (a.score ?? -1)).map((r) => (
                <tr key={r.id}>
                  <td><TierBadge tier={r.tier} /></td>
                  <td>{r.name} <small className="muted">{r.domain}</small></td>
                  <td>{r.v == null ? "–" : `${fmt(r.v)}${r.unit}`}</td>
                  <td>{r.ref == null ? "–" : `${fmt(r.ref)}${r.unit}`}</td>
                  <td>{r.pos ? (r.pos.n <= 30 ? `${r.pos.n}곳 중 ${r.pos.rank}위` : r.band?.label) : r.why || "–"}</td>
                  <td>{r.trendCls?.label || "–"}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </details>
      <details className="eq-more">
        <summary>계산 방법</summary>
        <ul className="eq-method">
          <li><b>격차</b>(가중 {WEIGHTS.gap * 100}%): 지역 값과 전국 중앙값의 차이를 지표 방향(낮을수록/높을수록 좋음)에 맞춰 「불리한 쪽 +」로 바꾼 상대차. 불리한 쪽 30%에서 최대(작은 값 지표의 % 부풀림 상한).</li>
          <li><b>상대 위치</b>(가중 {WEIGHTS.rank * 100}%): 비교 집단에서 나보다 양호한 지역의 비율(동률은 절반). 결측 지역은 분모에서 뺍니다.</li>
          <li><b>최근 추세</b>(가중 {WEIGHTS.trend * 100}%): 최근 {TREND_WINDOW}개 연도 안에 유효 값이 {TREND_MIN}개 이상일 때만 직선 기울기를 구해 비교 집단 기울기의 3분위(악화 쪽 1/3 = 1점·가운데 0.5·개선 쪽 0)로 씁니다. 라벨은 연간 변화가 전국 중앙값의 1% 미만이면 「변화 적음」.</li>
          <li><b>사회경제적 취약성</b>(가중 {WEIGHTS.dep * 100}%): 지역박탈지수 5분위(1→0점 … 5→1점). 시도이거나 값이 없으면 0으로 두지 않고 빼고 나머지 가중치로 다시 나눕니다. 박탈 분위는 지역마다 하나라 지표 사이 순서는 바꾸지 않고 등급에만 영향을 줍니다.</li>
          <li><b>등급</b>: 우선 검토 = 불리한 쪽 · 하위 {Math.round((1 - THRESHOLDS.priorityU) * 100)}% · 점수 {THRESHOLDS.priorityScore} 이상 · 95% 신뢰구간이 전국 중앙값을 포함하지 않음 · 상대표준오차 20% 이하. 관찰 필요 = 불리한 쪽이면서 하위 50% 또는 점수 {THRESHOLDS.watchScore} 이상. 비교 집단 {THRESHOLDS.minPool}곳 미만·값 없음·최근 값이 3년 넘게 오래됨 = 자료 부족.</li>
          <li>가중치는 지시된 설계값을 쓴 <b>화면 내부용 기술 점수</b>이며 공식 지수가 아닙니다. 상위 3개는 우선 검토 → 관찰 필요 순, 같은 영역은 하나만 보여 줍니다.</li>
        </ul>
      </details>
      <details className="eq-more">
        <summary>데이터 출처와 한계</summary>
        <ul className="eq-method">
          <li>지역사회건강조사(질병관리청, 258개 조사 단위 · 표본조사), 사망원인통계(국가데이터처)·국민건강보험공단 통계 등 시군구 자료, 지역박탈지수(2020년 총조사 집계표로 근사 산출) — 각 지표의 ⓘ에서 자료원·연도·주의사항을 볼 수 있습니다.</li>
          <li>보건소 사업의 투입·산출 자료가 없으므로 사업 성과평가나 인과효과 판단에 쓸 수 없습니다. 박탈지수와 지표는 함께 놓고 볼 뿐, 원인 관계를 뜻하지 않습니다.</li>
          <li>「참고할 수 있는 예방·관리 자료」는 공식 문서 목록이며 정책 처방이 아닙니다. 실제 사업은 지역 여건과 전문가 검토가 필요합니다.</li>
        </ul>
      </details>
    </div>
  );
}
