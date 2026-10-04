import { useMemo, useRef, useState } from "react";
import { fmt, label, DEP } from "../../data";
import { priorityFor, SCOPES, TIERS, WEIGHTS, THRESHOLDS, TREND_WINDOW, TREND_MIN } from "../../lib/equity";
import { buildReasonsEn, POOL_EN, TREND_EN } from "../../lib/equity/buildReasons.js";
import WhyThisMatters from "./WhyThisMatters";
import EvidenceActions from "./EvidenceActions";
import IndInfo from "./IndInfo";
import UsabilityFeedback from "../UsabilityFeedback";
import { T, TIER_EN, BAND_EN, DEP_EN, indName, domName, EN_STATUS } from "./i18n";

/* Health Equity Priority — 지역 프로파일 맨 위. ① PRIORITY 우선 검토 항목 3개 → ② WHY IT MATTERS 계산된 근거 → ③ POSSIBLE ACTION 참고할 공식 자료.
   진단·처방·정책효과 추정이 아니라 지역보건 검토 순서를 돕는 표시다. 점수는 화면 내부용 기술 점수(공식 지수 아님)이고 등급만 보인다.
   lang="en"(해시 en=1)이면 이 카드만 영어 — 국제 심사용. 숫자와 계산은 같다. */
const du = (u, lang) => (u === "%" ? (lang === "en" ? " pp" : "%p") : u ? ` ${u}` : "");
export const TierBadge = ({ tier, lang }) => { const t = TIERS[tier]; return <span className={`eq-tier ${t.cls}`}><span aria-hidden="true">{t.icon}</span> {lang === "en" ? TIER_EN[tier] : t.label}</span>; };
const depWord = (q) => (q == null ? null : q >= 4 ? "높음" : q === 3 ? "중간" : "낮음");

export default function EquityPriorityCard({ sel, item, smooth = 3, onPick, onPeer, onGoCard, onRecommend, lang = "ko", onLang }) {
  const [scope, setScope] = useState("core");
  const p = useMemo(() => priorityFor(sel, item, { smooth, scope }), [sel, item, smooth, scope]);
  const [showAll, setShowAll] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const methodRef = useRef(null);
  if (!p) return null;
  const en = lang === "en", L = T[lang] || T.ko;
  const isSido = sel.l === "sido";
  const basis = en ? (smooth === 3 ? "3-year average including the reference year" : "latest single year") : smooth === 3 ? "기준연도 포함 최근 3년 평균" : "최신 연도 값";
  const nTotal = p.rows.length;
  const order = { priority: 0, watch: 1, ok: 2, insufficient: 3 };
  const openMethod = () => { setMethodOpen(true); setTimeout(() => methodRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60); };
  const posText = (r) => (r.pos.n <= 30 ? (en ? `#${r.pos.rank} of ${r.pos.n}` : `${r.pos.n}곳 중 ${r.pos.rank}위`) : en ? BAND_EN[r.band?.key] || r.band?.label : r.band?.label);
  const regionName = en ? `${label(sel)} (Korea)` : label(sel);
  return (
    <div className="card eq-card" lang={en ? "en" : "ko"}>
      <div className="eq-titlebar">
        <h3>{L.title} <small className="muted">{en ? "" : "Health Equity Priority · "}{regionName}</small></h3>
        <div className="eq-tools">
          <button type="button" className="linkbtn eq-method-link" onClick={openMethod}>{L.method}</button>
          {onLang && (
            <div className="seg eq-lang" role="group" aria-label={en ? "Language" : "언어"}>
              <button type="button" className={`seg-btn ${!en ? "on" : ""}`} aria-pressed={!en} onClick={() => onLang("ko")} lang="ko">한국어</button>
              <button type="button" className={`seg-btn ${en ? "on" : ""}`} aria-pressed={en} onClick={() => onLang("en")} lang="en">EN</button>
            </div>
          )}
          <UsabilityFeedback lang={lang} context={`${sel.c} ${label(sel)}`} />
        </div>
      </div>
      <div className="eq-summary">
        <div className="eq-sum-text">
          <b>{L.summary}</b> — {L.of(en ? (scope === "core" ? L.scopeCore : L.scopeAll) : SCOPES[scope].label, nTotal)}
          {" "}<TierBadge tier="priority" lang={lang} /> <b>{p.counts.priority}</b>
          {" "}· <TierBadge tier="watch" lang={lang} /> <b>{p.counts.watch}</b>
          {" "}· <TierBadge tier="ok" lang={lang} /> <b>{p.counts.ok}</b>
          {p.counts.insufficient > 0 && <> · <TierBadge tier="insufficient" lang={lang} /> <b>{p.counts.insufficient}</b></>}
          {en
            ? (p.dep?.q ? <> · area deprivation quintile <b>{p.dep.q}</b> (5 = most deprived, {DEP.year})</> : isSido ? <> · province level, so deprivation is excluded from the calculation</> : <> · no deprivation data (excluded from the calculation)</>)
            : (p.dep?.q ? <> · 지역박탈지수 <b>{p.dep.q}분위</b>(5 = 가장 박탈, {DEP.year}년)</> : isSido ? <> · 시도 단위라 지역박탈지수는 계산에서 제외</> : <> · 지역박탈지수 자료 없음(계산에서 제외)</>)}
        </div>
        <div className="seg eq-scope" role="group" aria-label={en ? "Candidate indicators" : "후보 지표 범위"}>
          {Object.entries(SCOPES).map(([k, s]) => <button key={k} type="button" className={`seg-btn ${scope === k ? "on" : ""}`} aria-pressed={scope === k} onClick={() => setScope(k)}>{en ? (k === "core" ? "Survey indicators" : "All directional") : s.label} {s.n}</button>)}
        </div>
      </div>
      <div className="desc">
        {en
          ? <>Value: {basis} · Comparison: {isSido ? "rank among 17 provinces, gap vs national median" : "national median (survey indicators: 258 survey units; others: municipalities)"} · This is not a diagnosis or prescription; it helps decide the <b>order of local review</b>. Indicator names are {EN_STATUS}s; other screens of the site are in Korean.</>
          : <>값: {basis} · 비교: {isSido ? "순위는 17개 시도, 격차는 전국 중앙값" : "전국 중앙값(지역사회건강조사는 조사 단위 258곳, 그 밖은 시군구)"} · 진단이나 처방이 아니라 지역보건 <b>검토 순서</b>를 돕는 표시입니다.</>}
      </div>

      <div className="eq-step"><b>{L.p1}</b><span className="muted"> — {L.p1d}</span></div>
      {p.top.length === 0 ? (
        <div className="empty">{en ? "No indicator is clearly worse than the national median. See “All results” below for each indicator." : "전국 중앙값보다 뚜렷이 불리한 지표가 없습니다. 아래 「전체 판정」에서 지표별 위치를 볼 수 있습니다."}</div>
      ) : (
        <div className="eq-grid">
          {p.top.map((r, i) => (
            <section key={r.id} className={`eq-item ${TIERS[r.tier].cls}`} aria-label={`${i + 1}. ${indName(r.ind, lang)}`}>
              <div className="eq-head">
                <span className="eq-no">{i + 1}</span>
                <div className="eq-title">
                  <div className="eq-dom muted">{domName(r.domain, lang)}</div>
                  <div className="eq-name">{indName(r.ind, lang)}<IndInfo ind={r.ind} /></div>
                  {en && indName(r.ind, lang) !== r.name && <div className="eq-ko muted" lang="ko">{r.name}</div>}
                </div>
                <TierBadge tier={r.tier} lang={lang} />
              </div>
              <dl className="eq-facts">
                <div><dt>{L.local}</dt><dd><b>{fmt(r.v)}{r.unit}</b><small>{en ? `${r.y}${r.k === 3 ? ", 3-year average" : ""}` : `${r.y}년${r.k === 3 ? " 기준 3년 평균" : ""}`}</small></dd></div>
                <div><dt>{L.median}</dt><dd><b>{fmt(r.ref)}{r.unit}</b><small>{en ? "difference " : "차이 "}{r.gap.abs > 0 ? "+" : r.gap.abs < 0 ? "−" : "±"}{fmt(Math.abs(r.gap.abs))}{du(r.unit, lang)}</small></dd></div>
                <div><dt>{L.pos}</dt><dd><b>{posText(r)}</b><small>{r.pos.n <= 30 ? (en ? "best first" : "양호한 순") : en ? `${r.pos.n} ${POOL_EN[r.poolName] || r.poolName}` : `${r.poolName} ${r.pos.n}곳`}</small></dd></div>
                <div><dt>{L.trend}</dt><dd><b>{r.trendCls ? (en ? TREND_EN[r.trendCls.label] : r.trendCls.label) : en ? "Not assessed" : "평가 안 함"}</b><small>{r.trend ? `${r.trend.y0}–${r.trend.y1} ${en ? "per year" : "연"} ${r.trend.slope > 0 ? "▲" : r.trend.slope < 0 ? "▼" : ""}${fmt(Math.abs(r.trend.slope), 2)}${du(r.unit, lang)}` : en ? `fewer than ${TREND_MIN} valid years` : `유효 연도 ${TREND_MIN}개 미만`}</small></dd></div>
                <div><dt>{L.dep}</dt><dd><b>{depWord(r.depQ) ? (en ? DEP_EN[depWord(r.depQ)] : depWord(r.depQ)) : isSido ? (en ? "Not applicable" : "해당 없음") : en ? "No data" : "자료 없음"}</b><small>{r.depQ ? (en ? `deprivation quintile ${r.depQ}` : `지역박탈 ${r.depQ}분위`) : en ? "weights renormalized" : "가중치 재정규화"}</small></dd></div>
              </dl>
              <WhyThisMatters reasons={en ? buildReasonsEn(r) : r.reasons} title={L.why} />
              <EvidenceActions row={r} sel={sel} onPick={onPick} onPeer={onPeer} onGoCard={onGoCard} onRecommend={onRecommend} lang={lang} />
            </section>
          ))}
        </div>
      )}
      <div className="desc hc-note">{en ? "Survey estimates: differences between neighbouring ranks may be small. Relative position is shown as a band (upper, middle, lower, least favourable 10%) rather than an exact rank." : "표본조사 값이라 이웃한 순위의 차이는 작을 수 있습니다. 상대 위치는 정확한 순번 대신 구간(상위권·중간권·하위권·불리한 쪽 상위 10%)으로 보여 줍니다."}</div>

      <details className="eq-more" open={showAll} onToggle={(e) => setShowAll(e.currentTarget.open)}>
        <summary>{en ? `All results (${nTotal})` : `전체 판정 ${nTotal}개 보기`} <span className="muted">{en ? "— tier, difference and position for each indicator" : "— 지표별 등급·차이·위치"}</span></summary>
        {showAll && (
          <div className="tblscroll"><table className="yeartbl eq-all">
            <thead><tr>{(en ? ["Tier", "Indicator", "Local value", "National median", "Position", "Trend"] : ["등급", "지표", "지역 값", "전국 중앙값", "위치", "추세"]).map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {[...p.rows].sort((a, b) => order[a.tier] - order[b.tier] || (b.score ?? -1) - (a.score ?? -1)).map((r) => (
                <tr key={r.id}>
                  <td><TierBadge tier={r.tier} lang={lang} /></td>
                  <td>{indName(r.ind, lang)} <small className="muted">{domName(r.domain, lang)}</small></td>
                  <td>{r.v == null ? "–" : `${fmt(r.v)}${r.unit}`}</td>
                  <td>{r.ref == null ? "–" : `${fmt(r.ref)}${r.unit}`}</td>
                  <td>{r.pos ? posText(r) : r.why || "–"}</td>
                  <td>{r.trendCls ? (en ? TREND_EN[r.trendCls.label] : r.trendCls.label) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </details>
      <details className="eq-more eq-method-box" ref={methodRef} open={methodOpen} onToggle={(e) => setMethodOpen(e.currentTarget.open)}>
        <summary>{en ? "How priorities are identified (methodology)" : "계산 방법 — 우선순위를 정하는 방법"}</summary>
        {en ? (
          <ul className="eq-method">
            <li>Each indicator gets four component scores between 0 and 1, and a weighted average of the available components (missing components are dropped and the remaining weights renormalized — never set to zero). No z-scores, prediction models or causal inference are used.</li>
            <li><b>Gap</b> ({WEIGHTS.gap * 100}%): relative difference from the national median, flipped by indicator direction so that “unfavourable” is positive; capped at 30% unfavourable (limits inflation for small values).</li>
            <li><b>Relative position</b> ({WEIGHTS.rank * 100}%): share of areas in the comparison group with a better value (ties count half); missing areas are left out of the denominator.</li>
            <li><b>Recent trend</b> ({WEIGHTS.trend * 100}%): straight-line slope over the last {TREND_WINDOW} years when at least {TREND_MIN} valid years exist, scored by tertile of the comparison group (worsening third = 1, middle = 0.5, improving = 0). Labelled “Little change” when the yearly change is below 1% of the national median.</li>
            <li><b>Socioeconomic context</b> ({WEIGHTS.dep * 100}%): area deprivation quintile (1 → 0 … 5 → 1). Not available for provinces. It is shown side by side with the indicator and never implies cause.</li>
            <li><b>Tiers</b>: Review first = unfavourable direction · lower {Math.round((1 - THRESHOLDS.priorityU) * 100)}% · score ≥ {THRESHOLDS.priorityScore} · 95% confidence interval excludes the national median · relative standard error ≤ 20%. Monitor = unfavourable and lower half, or score ≥ {THRESHOLDS.watchScore}. Fewer than {THRESHOLDS.minPool} comparison areas, no value, or a value more than 3 years old = insufficient data.</li>
            <li>The score is an internal technical score, not an official index; only the tier is shown. Top three = Review first, then Monitor, one per domain.</li>
          </ul>
        ) : (
          <ul className="eq-method">
            <li>지표마다 네 요소를 0~1 점수로 만들고, 있는 요소만 가중 평균합니다(빠진 요소는 0으로 두지 않고 빼고 나머지 가중치로 다시 나눔). z-점수·예측 모형·인과 추론은 쓰지 않습니다.</li>
            <li><b>격차</b>(가중 {WEIGHTS.gap * 100}%): 지역 값과 전국 중앙값의 차이를 지표 방향(낮을수록/높을수록 좋음)에 맞춰 「불리한 쪽 +」로 바꾼 상대차. 불리한 쪽 30%에서 최대(작은 값 지표의 % 부풀림 상한).</li>
            <li><b>상대 위치</b>(가중 {WEIGHTS.rank * 100}%): 비교 집단에서 나보다 양호한 지역의 비율(동률은 절반). 결측 지역은 분모에서 뺍니다.</li>
            <li><b>최근 추세</b>(가중 {WEIGHTS.trend * 100}%): 최근 {TREND_WINDOW}개 연도 안에 유효 값이 {TREND_MIN}개 이상일 때만 직선 기울기를 구해 비교 집단 기울기의 3분위(악화 쪽 1/3 = 1점·가운데 0.5·개선 쪽 0)로 씁니다. 라벨은 연간 변화가 전국 중앙값의 1% 미만이면 「변화 적음」.</li>
            <li><b>사회경제적 취약성</b>(가중 {WEIGHTS.dep * 100}%): 지역박탈지수 5분위(1→0점 … 5→1점). 시도이거나 값이 없으면 0으로 두지 않고 빼고 나머지 가중치로 다시 나눕니다. 박탈 분위는 지역마다 하나라 지표 사이 순서는 바꾸지 않고 등급에만 영향을 줍니다.</li>
            <li><b>등급</b>: 우선 검토 = 불리한 쪽 · 하위 {Math.round((1 - THRESHOLDS.priorityU) * 100)}% · 점수 {THRESHOLDS.priorityScore} 이상 · 95% 신뢰구간이 전국 중앙값을 포함하지 않음 · 상대표준오차 20% 이하. 관찰 필요 = 불리한 쪽이면서 하위 50% 또는 점수 {THRESHOLDS.watchScore} 이상. 비교 집단 {THRESHOLDS.minPool}곳 미만·값 없음·최근 값이 3년 넘게 오래됨 = 자료 부족.</li>
            <li>가중치는 지시된 설계값을 쓴 <b>화면 내부용 기술 점수</b>이며 공식 지수가 아닙니다. 상위 3개는 우선 검토 → 관찰 필요 순, 같은 영역은 하나만 보여 줍니다.</li>
          </ul>
        )}
      </details>
      <details className="eq-more">
        <summary>{en ? "Data sources and limitations" : "데이터 출처와 한계"}</summary>
        {en ? (
          <ul className="eq-method">
            <li>Korea Community Health Survey (KDCA; 258 survey units; sample survey), cause-of-death statistics (Statistics Korea), National Health Insurance Service statistics and other municipality data, and an area deprivation index approximated from the 2020 census tables. Each indicator’s ⓘ shows source, years and caveats.</li>
            <li>No programme input/output data are included, so the tool cannot evaluate programme performance or causal effects. Deprivation and indicators are shown side by side only.</li>
            <li>Possible actions list official documents; they are not prescriptions. Local programmes need local context and professional review.</li>
          </ul>
        ) : (
          <ul className="eq-method">
            <li>지역사회건강조사(질병관리청, 258개 조사 단위 · 표본조사), 사망원인통계(국가데이터처)·국민건강보험공단 통계 등 시군구 자료, 지역박탈지수(2020년 총조사 집계표로 근사 산출) — 각 지표의 ⓘ에서 자료원·연도·주의사항을 볼 수 있습니다.</li>
            <li>보건소 사업의 투입·산출 자료가 없으므로 사업 성과평가나 인과효과 판단에 쓸 수 없습니다. 박탈지수와 지표는 함께 놓고 볼 뿐, 원인 관계를 뜻하지 않습니다.</li>
            <li>「검토해 볼 수 있는 공중보건 대응」은 공식 문서 목록이며 정책 처방이 아닙니다. 실제 사업은 지역 여건과 전문가 검토가 필요합니다.</li>
          </ul>
        )}
      </details>
    </div>
  );
}
