import { useMemo, useRef, useState } from "react";
import { fmt, indRef, REF_BY_KEY } from "../data";
import { buildIndicatorReport, draftIndicatorParagraphs, regionLabel } from "../lib/indicatorReport";
import { BUILD } from "./ReviewsCard";
import { download, safe, saveCsvRows } from "../export";
import { copyText } from "./FeedbackView";

/* 지표별 보고서(전국 취약지역 현황) — 금연·절주 같은 사업을 기획하는 정책 담당자용. 해시 view=ireport, 지표는 위 지표 선택을 따른다.
   분석 방향: 전국 분포·추이 → 시도별 집중도 → 검토 대상 지역(불리한 쪽 10%, 신뢰구간 확인) → 불리 + 악화 → 개선 폭 큰 지역(참고) → 박탈 분위별 → 사업 참고 자료.
   순위표가 아니라 사업 대상 「검토」 목록이며, 원인·효과·처방은 쓰지 않는다. */
const du = (u) => (u === "%" ? "%p" : u ? ` ${u}` : "");
const sign = (v) => (v > 0 ? "+" : v < 0 ? "−" : "±");
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : "–");
const LEVEL = { national: "국가", regional: "WHO 서태평양", global: "WHO" };

export default function IndicatorReport({ ind, sel, item = "std", smooth = 3, onBack, onRegionReport, onNcd }) {
  const docRef = useRef(null);
  const [msg, setMsg] = useState("");
  const m = useMemo(() => (ind.direction === "context" ? null : buildIndicatorReport(ind, item, smooth)), [ind, item, smooth]);
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const lowerBetter = ind.direction === "lower_is_better";
  const ref = indRef(ind);
  const src = ref?.refs?.[0] ? REF_BY_KEY.get(ref.refs[0]) : null;

  if (!m) {
    return (
      <div className="card rpt-actions">
        <b>지표별 보고서</b>
        <div className="desc">「{ind.name}」은 {ind.direction === "context" ? "높고 낮음의 좋고 나쁨을 정하지 않은 맥락 지표라" : "값이 있는 지역이 부족해"} 취약지역을 정하지 않습니다. 위에서 흡연·음주·비만처럼 방향이 있는 지표를 고르세요.</div>
        {onBack && <div className="rev-btns"><button type="button" className="themebtn" onClick={onBack}>← 지표 분석</button></div>}
      </div>
    );
  }
  const paras = draftIndicatorParagraphs(m);
  const isMine = (x) => sel && (x.r.c === sel.c || x.r.p === sel.c);
  const fileBase = `${safe(ind.name)}_지표보고서_전국취약지역_${today}`;
  const ciTxt = (a) => (a.ci && Number.isFinite(a.ci.lo) ? `${fmt(a.ci.lo)}–${fmt(a.ci.hi)}` : "–");
  const ciFlag = (a) => (a.ciIncludesRef === false ? "뚜렷" : a.ciIncludesRef === true ? "불확실" : "–");
  const recent = m.series.slice(-10);
  let secN = 4; const no = () => ++secN; // 4절 이후 번호(빈 절은 건너뜀)
  const maxShare = Math.max(...m.sido.map((x) => x.share || 0), 0.01);

  const saveWord = () => {
    const doc = docRef.current?.cloneNode(true);
    doc?.querySelectorAll(".rpt-noprint").forEach((n) => n.remove());
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${ind.name} 지표 보고서</title>
<style>body{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;font-size:10.5pt;line-height:1.55;color:#111}h1{font-size:18pt}h2{font-size:14pt;margin-top:16pt}h3{font-size:12pt}table{border-collapse:collapse;width:100%;margin:6pt 0}th,td{border:1px solid #999;padding:3pt 5pt;font-size:9.5pt;vertical-align:top}th{background:#eef2f7}.muted{color:#555}.rpt-bar{display:none}</style></head><body>${doc?.innerHTML || ""}</body></html>`;
    download(new Blob(["﻿" + html], { type: "application/msword" }), `${fileBase}.doc`);
  };
  const saveCsv = () => saveCsvRows([
    ["구분", "지역", "값", "95% CI 하한", "95% CI 상한", "전국 중앙값과 차이", "신뢰구간 판정", "불리한 쪽 백분위(%)", "최근 추세", "박탈 분위", "불안정(RSE>20%)"],
    ...m.rows.slice().sort((a, b) => b.a.pos.u - a.a.pos.u).map((x) => [x.a.pos.u >= 0.9 ? "검토 대상(10%)" : x.a.pos.u >= 0.8 ? "불리한 쪽 20%" : "", regionLabel(x.r), fmt(x.a.v), x.a.ci?.lo ?? "", x.a.ci?.hi ?? "", x.a.gap ? fmt(x.a.gap.abs) : "", ciFlag(x.a), Math.round(x.a.pos.u * 100), x.a.trendCls?.label || "", x.dep?.q ?? "", x.a.ci?.unstable ? "예" : ""]),
  ], fileBase);
  const copyDraft = async () => setMsg((await copyText(paras.join("\n\n"))) ? "현황 문장 초안을 복사했습니다. 원자료와 대조해 고쳐 쓰세요." : "복사하지 못했습니다. 문장을 드래그해 복사해 주세요.");

  return (
    <div className="rpt-wrap">
      <div className="card rpt-actions">
        <div className="seg rpt-mode" role="group" aria-label="보고서 종류">
          <button type="button" className="seg-btn" onClick={onRegionReport} title="선택한 지역 하나의 건강 현황 보고서">지역별 보고서</button>
          <button type="button" className="seg-btn on" aria-pressed="true">지표별 보고서</button>
        </div>
        <div><b>지표별 보고서 — 전국 취약지역 현황</b> <span className="muted">— 위에서 지표를 바꾸면 보고서도 바뀝니다. 금연·절주 같은 사업 대상지 검토용 · 화면에서만 만들어집니다.</span></div>
        <div className="rev-btns">
          <button type="button" className="themebtn" onClick={() => window.print()}>🖨 인쇄 · PDF 저장</button>
          <button type="button" className="themebtn" onClick={saveWord}>⬇ 워드(.doc) 저장</button>
          <button type="button" className="themebtn" onClick={saveCsv}>⬇ 전체 지역 CSV</button>
          <button type="button" className="themebtn" onClick={copyDraft}>📋 문장 초안 복사</button>
          {onBack && <button type="button" className="themebtn" onClick={onBack}>← 지표 분석</button>}
        </div>
        {msg && <div className="desc" role="status">{msg}</div>}
      </div>

      <article className="rpt" ref={docRef} aria-label={`${ind.name} 지표 보고서`}>
        <header className="rpt-head">
          <div className="rpt-kicker">지표 보고서 · 전국 취약지역 현황 · 자동 생성 초안</div>
          <h1>{ind.name}</h1>
          <p className="muted">작성일 {today} · 기준 {m.y}년 · 값: {smooth === 3 ? "기준연도 포함 최근 3년 평균" : "단년"}({item === "std" ? "표준화율" : "조율"}) · 비교: 전국 {m.poolName} · {lowerBetter ? "낮을수록 좋은 지표" : "높을수록 좋은 지표"} · 단위 {ind.unit || "–"} · 자료 {src ? `${src.org} 「${src.title}」` : "–"} · 대시보드 빌드 {BUILD.commit}</p>
          <p className="rpt-note">공개 통계로 자동 작성한 초안입니다. 「검토 대상 지역」은 순위 발표가 아니라 사업 대상을 검토하기 위한 목록이며, 표본조사 오차 때문에 경계 근처의 순서는 바뀔 수 있습니다. 원인이나 사업 효과를 뜻하지 않습니다.</p>
        </header>

        <section>
          <h2>1. 요약</h2>
          <table className="rpt-tbl rpt-sum"><tbody>
            <tr><th scope="row">전국 중앙값</th><td>{fmt(m.ref)}{ind.unit} (비교 지역 {m.n}곳)</td></tr>
            <tr><th scope="row">지역 간 격차</th><td>하위 20% 경계 {fmt(m.p20)} · 상위 20% 경계 {fmt(m.p80)}{ind.unit} → 차이 {fmt(m.p80 - m.p20)}{du(ind.unit)} · 범위 {fmt(m.min)}–{fmt(m.max)}</td></tr>
            <tr><th scope="row">검토 대상(불리한 쪽 10%)</th><td>{m.vulnerable.length}곳 · 경계값 {lowerBetter ? "≥" : "≤"} {fmt(m.cut10)}{ind.unit}{m.hasCi ? ` · 그중 95% 신뢰구간이 전국 중앙값과 겹치지 않음 ${m.vulnerable.filter((x) => x.a.ciIncludesRef === false).length}곳` : " · 표본오차 정보 없음(행정 통계)"}</td></tr>
            <tr><th scope="row">불리 + 악화</th><td>{m.worsening.length}곳(전국 중앙값보다 불리하고 최근 5년 악화 속도가 빠른 쪽)</td></tr>
            <tr><th scope="row">취약지역이 몰린 시도</th><td>{m.sido.filter((x) => x.n20).slice(0, 5).map((x) => `${x.s.n} ${x.n20}/${x.n}곳`).join(" · ") || "–"}</td></tr>
          </tbody></table>
          <h3>현황 문장(초안)</h3>
          <div className="rpt-draft">{paras.map((t, i) => <p key={i}>{t}</p>)}</div>
        </section>

        <section>
          <h2>2. 전국 추이 — 중앙값과 지역 간 격차</h2>
          <p className="muted">격차 = 비교 지역의 상위 20% 경계 − 하위 20% 경계(P80−P20, 단년 값). 격차가 줄어도 모두 나빠져 줄어든 것인지(하향 수렴) 함께 봐야 합니다.</p>
          <table className="rpt-tbl rpt-wide"><thead><tr><th>연도</th>{recent.map((s) => <th key={s.y}>{s.y}</th>)}</tr></thead>
            <tbody>
              <tr><th scope="row">전국 중앙값</th>{recent.map((s) => <td key={s.y}>{fmt(s.med)}</td>)}</tr>
              <tr><th scope="row">P80−P20</th>{recent.map((s) => <td key={s.y}>{fmt(s.gap)}</td>)}</tr>
            </tbody></table>
        </section>

        <section>
          <h2>3. 시도별 현황 — 불리한 쪽 20%에 든 지역 수</h2>
          <table className="rpt-tbl"><thead><tr><th>시도</th><th>시도 값</th><th>비교 지역</th><th>불리한 쪽 20%</th><th>비율</th></tr></thead>
            <tbody>{m.sido.map((x) => (
              <tr key={x.s.c}><td>{x.s.n}</td><td>{x.v == null ? "–" : `${fmt(x.v)}${ind.unit}`}</td><td>{x.n}</td><td>{x.n20}</td>
                <td><span className="rpt-bar" style={{ width: `${((x.share || 0) / maxShare) * 6}em` }} aria-hidden="true" />{pct(x.n20, x.n)}</td></tr>
            ))}</tbody></table>
        </section>

        <section>
          <h2>4. 검토 대상 지역 — 불리한 쪽 상위 10% ({m.vulnerable.length}곳)</h2>
          <p className="muted">{m.hasCi ? "「신뢰구간」 뚜렷 = 95% 신뢰구간(단년)이 전국 중앙값과 겹치지 않음 · 불확실 = 겹침(표본오차 범위의 차이일 수 있음) · ⚠ = 상대표준오차 20% 초과(불안정 값)." : "행정 통계라 표본오차 정보가 없습니다. 경계 근처 지역은 해마다 바뀔 수 있습니다."} 순서는 불리한 정도 순이며 순위 발표가 아닙니다.</p>
          <table className="rpt-tbl rpt-vul"><thead><tr><th>#</th><th>지역</th><th>값</th>{m.hasCi && <th>95% CI</th>}<th>중앙값과 차이</th>{m.hasCi && <th>신뢰구간</th>}<th>최근 추세</th><th>박탈</th></tr></thead>
            <tbody>{m.vulnerable.map((x, i) => (
              <tr key={x.r.c} className={isMine(x) ? "rpt-me" : ""}><td>{i + 1}</td><td>{regionLabel(x.r)}{x.a.ci?.unstable ? " ⚠" : ""}</td><td>{fmt(x.a.v)}{ind.unit}</td>{m.hasCi && <td>{ciTxt(x.a)}</td>}
                <td>{sign(x.a.gap.abs)}{fmt(Math.abs(x.a.gap.abs))}{du(ind.unit)}</td>{m.hasCi && <td>{ciFlag(x.a)}</td>}<td>{x.a.trendCls?.label || "–"}</td><td>{x.dep?.q ? `${x.dep.q}분위` : "–"}</td></tr>
            ))}</tbody></table>
        </section>

        {m.worsening.length > 0 && (
          <section>
            <h2>{no()}. 불리하면서 악화 속도가 빠른 지역 ({m.worsening.length}곳)</h2>
            <table className="rpt-tbl"><thead><tr><th>지역</th><th>값</th><th>최근 5년 연간 변화</th><th>위치</th></tr></thead>
              <tbody>{m.worsening.slice(0, 20).map((x) => (
                <tr key={x.r.c} className={isMine(x) ? "rpt-me" : ""}><td>{regionLabel(x.r)}</td><td>{fmt(x.a.v)}{ind.unit}</td>
                  <td>{x.a.trend ? `${x.a.trend.slope > 0 ? "▲" : "▼"}${fmt(Math.abs(x.a.trend.slope), 2)}${du(ind.unit)}/년 (${x.a.trend.y0}–${x.a.trend.y1})` : "–"}</td><td>{x.a.band?.label || "–"}</td></tr>
              ))}</tbody></table>
            {m.worsening.length > 20 && <p className="muted">상위 20곳만 표시 · 전체는 CSV에 있습니다.</p>}
          </section>
        )}

        {m.improving.length > 0 && (
          <section>
            <h2>{no()}. 개선 폭이 큰 지역(참고)</h2>
            <p className="muted">비교 집단에서 개선 속도가 빠른 쪽 지역입니다. 사업 사례를 찾아볼 출발점일 뿐, 개선의 원인을 뜻하지 않습니다.</p>
            <table className="rpt-tbl"><thead><tr><th>지역</th><th>값</th><th>최근 5년 연간 변화</th></tr></thead>
              <tbody>{m.improving.map((x) => (
                <tr key={x.r.c}><td>{regionLabel(x.r)}</td><td>{fmt(x.a.v)}{ind.unit}</td><td>{x.a.trend ? `${x.a.trend.slope > 0 ? "▲" : "▼"}${fmt(Math.abs(x.a.trend.slope), 2)}${du(ind.unit)}/년` : "–"}</td></tr>
              ))}</tbody></table>
          </section>
        )}

        {m.depQ.some((d) => d.n) && (
          <section>
            <h2>{no()}. 박탈 분위별 현황</h2>
            <p className="muted">지역박탈지수(근사, 2020년 총조사) 5분위별로 불리한 쪽 20%에 든 비율입니다. 함께 놓고 본 것이며 원인 관계를 뜻하지 않습니다.</p>
            <table className="rpt-tbl rpt-wide"><thead><tr><th>박탈 분위</th>{m.depQ.map((d) => <th key={d.q}>{d.q}{d.q === 1 ? "(덜 박탈)" : d.q === 5 ? "(가장 박탈)" : ""}</th>)}</tr></thead>
              <tbody>
                <tr><th scope="row">지역 수</th>{m.depQ.map((d) => <td key={d.q}>{d.n}</td>)}</tr>
                <tr><th scope="row">불리한 쪽 20%</th>{m.depQ.map((d) => <td key={d.q}>{d.n20} ({pct(d.n20, d.n)})</td>)}</tr>
                <tr><th scope="row">중앙값</th>{m.depQ.map((d) => <td key={d.q}>{fmt(d.med)}</td>)}</tr>
              </tbody></table>
          </section>
        )}

        <section>
          <h2>{no()}. 사업 참고 자료</h2>
          <p className="muted">공식 문서 목록이며 처방이 아닙니다. 지역 여건과 전문가 검토로 판단하세요.</p>
          <ul>
            {m.evidence.national.map((e) => <li key={e.id}>[{LEVEL[e.level] || e.level}] {e.goal} — {e.source}{e.url ? <> · <a href={e.url}>{e.url}</a></> : null}</li>)}
            {m.evidence.nice.map((g) => <li key={g.code}>[NICE] {g.title_ko || g.title} ({g.code}) · <a href={g.url}>{g.url}</a></li>)}
            {m.evidence.cpstf.map((t) => <li key={t.topic}>[CPSTF] {t.topic_ko || t.topic} 권고 {t.n}건(최근 {t.latest_year}년) · <a href={t.findings_url || t.url}>{t.findings_url || t.url}</a></li>)}
            <li>17개 시도 제8기 지역보건의료계획에서 이 지표와 연결된 세부과제 {m.evidence.sidoPlans}건 · 같은 영역 시군구 우수사례 {m.evidence.cases}건(대시보드 「예방·관리」 탭)</li>
          </ul>
          {onNcd && <p className="rpt-noprint"><button type="button" className="themebtn" onClick={onNcd}>예방·관리 탭에서 이 지표 자료 모두 보기 →</button></p>}
        </section>

        <section>
          <h2>{no()}. 방법과 한계</h2>
          <ul>
            <li>지역마다 대시보드 「우선 검토」와 같은 계산(전국 중앙값 대비 방향 보정 격차, 비교 집단 안 불리한 쪽 백분위, 최근 5년 기울기의 3분위, 지역박탈지수)을 돌려 집계했습니다. 검토 대상 = 불리한 쪽 백분위 90% 이상, 시도별 집계 = 80% 이상.</li>
            <li>{m.survey ? `지역사회건강조사 지표는 조사 단위(보건소 관할) ${m.pool.length}곳과 비교합니다. 표본조사라 95% 신뢰구간을 함께 봐야 합니다.` : "시군구 단위 행정 통계로, 표본오차 정보가 없습니다."} 일반구가 있는 시는 구(보건소) 단위로 나옵니다.</li>
            <li>사업 투입·산출 자료가 없어 사업 효과를 판단할 수 없습니다. 지역 이름이 목록에 있다는 것은 「검토할 근거」이지 평가 결과가 아닙니다.</li>
            <li>출처: {src ? `${src.org} — ${src.title}` : "–"}{ref?.url ? <> · 원표 <a href={ref.url}>{ref.url}</a></> : null} · 지역 건강프로파일 대시보드(health-profile.kr) · 기획·제작 지음웍스 · 자동 생성 {today}</li>
          </ul>
        </section>
      </article>
    </div>
  );
}
