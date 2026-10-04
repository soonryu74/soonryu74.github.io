import { useMemo, useRef, useState } from "react";
import { fmt, label, DEP, hleOf, indRef, REF_BY_KEY, HC_POOL } from "../data";
import { priorityFor, WEIGHTS, THRESHOLDS } from "../lib/equity";
import { strengthsOf, trendGroups, byDomain, draftParagraphs, TIER_KO } from "../lib/report";
import { evidenceFor } from "./equity/EvidenceActions";
import { BUILD } from "./ReviewsCard";
import { download, safe } from "../export";
import { copyText } from "./FeedbackView";
import VS from "../../../data/validation_summary.json";

/* 지역 보고서 자동 생성(무료 공개 기능) — 선택한 시도·시군구의 「지역 건강 현황」 보고서를 화면에서 만들어 인쇄·PDF·워드로 저장.
   우선 검토 엔진의 판정을 그대로 쓰고, 문장은 계산된 사실만으로 만든 초안이다(인과·효과·처방 없음).
   해시 view=report. 지역은 위 시도·시군구 선택을 따른다. */
const du = (u) => (u === "%" ? "%p" : u ? ` ${u}` : "");
const sign = (v) => (v > 0 ? "+" : v < 0 ? "−" : "±");
const posTxt = (r) => (!r.pos ? r.why || "–" : r.pos.n <= 30 ? `${r.pos.n}곳 중 ${r.pos.rank}위` : r.band?.label || "–");
const LEVEL = { sido: "시도 계획", national: "국가", regional: "WHO 서태평양", global: "WHO" };
const ADMIN_DOMAINS = ["사망률(표준화)", "암검진"];

export default function RegionReport({ sel, item = "std", smooth = 3, onBack }) {
  const docRef = useRef(null);
  const [msg, setMsg] = useState("");
  const p = useMemo(() => priorityFor(sel, item, { smooth, scope: "core" }), [sel, item, smooth]);
  const pAll = useMemo(() => priorityFor(sel, item, { smooth, scope: "all" }), [sel, item, smooth]);
  if (!sel || !p) return null;
  const isSido = sel.l === "sido";
  const regionName = label(sel);
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const basis = smooth === 3 ? "기준연도 포함 최근 3년 평균" : "최신 연도 단년 값";
  const poolDesc = isSido ? "17개 시도(격차는 전국 중앙값)" : `전국 중앙값(조사 단위 ${HC_POOL.length}곳)`;
  const strengths = strengthsOf(p.rows);
  const trends = trendGroups(p.rows);
  const dep = !isSido && p.dep?.q ? { q: p.dep.q, year: DEP.year } : null;
  const hRec = hleOf(sel.c);
  const hY = hRec ? Object.keys(hRec.y).map(Number).sort((a, b) => a - b).pop() : null;
  const hle = hRec && hY ? { ...hRec.y[hY], y: hY } : null;
  const paras = draftParagraphs({ regionName, isSido, p, strengths, trends, dep, hle, poolDesc, basis });
  const admin = (pAll?.rows || []).filter((r) => ADMIN_DOMAINS.includes(r.domain) && r.v != null && r.gap);
  const yRange = [Math.min(...p.rows.filter((r) => r.y).map((r) => r.y)), Math.max(...p.rows.filter((r) => r.y).map((r) => r.y))];
  // 이 보고서에 쓰인 지표의 원 출처(참고문헌 번호와 같은 목록)
  const srcKeys = [...new Set([...p.rows, ...admin].map((r) => indRef(r.ind)?.refs?.[0]).filter(Boolean)), "dep", "hle"].filter((k, i, a) => a.indexOf(k) === i);
  const sources = srcKeys.map((k) => REF_BY_KEY.get(k)).filter(Boolean);
  const fileBase = `${safe(regionName)}_지역건강현황보고서_${today}`;

  const saveWord = () => {
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${regionName} 지역 건강 현황 보고서</title>
<style>body{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;font-size:10.5pt;line-height:1.55;color:#111}h1{font-size:18pt}h2{font-size:14pt;margin-top:16pt}h3{font-size:12pt}table{border-collapse:collapse;width:100%;margin:6pt 0}th,td{border:1px solid #999;padding:3pt 5pt;font-size:9.5pt;vertical-align:top}th{background:#eef2f7}.muted{color:#555}</style></head><body>${docRef.current?.innerHTML || ""}</body></html>`;
    download(new Blob(["﻿" + html], { type: "application/msword" }), `${fileBase}.doc`);
  };
  const copyDraft = async () => setMsg((await copyText(paras.join("\n\n"))) ? "현황 분석 문장 초안을 복사했습니다. 계획서에 붙여 넣고 원자료와 대조해 고쳐 쓰세요." : "복사하지 못했습니다. 문장을 드래그해 복사해 주세요.");

  return (
    <div className="rpt-wrap">
      <div className="card rpt-actions">
        <div>
          <b>지역 보고서 자동 생성</b> <span className="muted">— 위에서 시도·시군구를 바꾸면 보고서도 바뀝니다. 무료 · 로그인 없음 · 화면에서만 만들어지며 서버로 보내지 않습니다.</span>
        </div>
        <div className="rev-btns">
          <button type="button" className="themebtn" onClick={() => window.print()}>🖨 인쇄 · PDF 저장</button>
          <button type="button" className="themebtn" onClick={saveWord}>⬇ 워드(.doc) 저장</button>
          <button type="button" className="themebtn" onClick={copyDraft}>📋 문장 초안 복사</button>
          {onBack && <button type="button" className="themebtn" onClick={onBack}>← 지역 프로파일</button>}
        </div>
        {msg && <div className="desc" role="status">{msg}</div>}
      </div>

      <article className="rpt" ref={docRef} aria-label={`${regionName} 지역 건강 현황 보고서`}>
        <header className="rpt-head">
          <div className="rpt-kicker">지역 건강 현황 보고서 · 자동 생성 초안</div>
          <h1>{regionName}</h1>
          <p className="muted">작성일 {today} · 자료 기준 {yRange[0] === yRange[1] ? yRange[0] : `${yRange[0]}–${yRange[1]}`}년(지표별 최신 연도) · 값: {basis} · 비교: {poolDesc} · 대시보드 빌드 {BUILD.commit}{BUILD.date ? ` (${BUILD.date})` : ""} · 데이터 검증 {VS.generated}</p>
          <p className="rpt-note">공개 통계로 자동 작성한 초안입니다. 공식 통계 보고서가 아니며, 진단·처방·사업 효과 판단이 아니라 지역보건 <b>검토 순서</b>를 돕는 자료입니다. 계획서에 쓰기 전 원자료와 대조해 주세요.</p>
        </header>

        <section>
          <h2>1. 요약</h2>
          <table className="rpt-tbl rpt-sum"><tbody>
            <tr><th scope="row">지역사회건강조사 지표</th><td>{p.rows.length}개 — 우선 검토 <b>{p.counts.priority}</b> · 관찰 필요 <b>{p.counts.watch}</b> · 상대적으로 양호 <b>{p.counts.ok}</b>{p.counts.insufficient ? ` · 자료 부족 ${p.counts.insufficient}` : ""}</td></tr>
            <tr><th scope="row">먼저 검토할 지표</th><td>{p.top.length ? p.top.map((r) => `${r.name}(${TIER_KO[r.tier]})`).join(", ") : "뚜렷이 불리한 지표 없음"}</td></tr>
            <tr><th scope="row">강점 지표</th><td>{strengths.length ? strengths.map((r) => r.name).join(", ") : "해당 없음(양호한 쪽 25% 안 지표 없음)"}</td></tr>
            <tr><th scope="row">사회경제 맥락</th><td>{dep ? `지역박탈지수(근사, ${dep.year}년) ${dep.q}분위(5 = 가장 박탈)` : isSido ? "시도 단위라 지역박탈지수는 쓰지 않음" : "지역박탈지수 자료 없음"}</td></tr>
            <tr><th scope="row">기대수명·건강수명</th><td>{hle ? `기대수명 ${fmt(hle.le)}세 · 건강수명(주관적 건강 기반·근사) ${fmt(hle.hle)}세 (${hle.y}년, 3년 합산)` : "산출 자료 없음"}</td></tr>
          </tbody></table>
          <h3>현황 분석 문장(초안)</h3>
          <div className="rpt-draft">{paras.map((t, i) => <p key={i}>{t}</p>)}</div>
        </section>

        <section>
          <h2>2. 우선 검토 항목 — 왜 강조됐고, 무엇을 검토할 수 있나</h2>
          {p.top.length === 0 ? <p>전국 중앙값보다 뚜렷이 불리한 지표가 없습니다.</p> : p.top.map((r, i) => {
            const e = evidenceFor(r.ind, sel);
            return (
              <div key={r.id} className="rpt-item">
                <h3>2-{i + 1}. {r.name} <span className="muted">· {r.domain} · {TIER_KO[r.tier]}</span></h3>
                <table className="rpt-tbl"><thead><tr><th>지역 값</th><th>전국 중앙값</th><th>차이</th><th>상대 위치</th><th>최근 추세</th></tr></thead>
                  <tbody><tr>
                    <td>{fmt(r.v)}{r.unit} <span className="muted">({r.y}년{r.k === 3 ? " 기준 3년 평균" : ""})</span></td>
                    <td>{fmt(r.ref)}{r.unit}</td>
                    <td>{sign(r.gap.abs)}{fmt(Math.abs(r.gap.abs))}{du(r.unit)}</td>
                    <td>{posTxt(r)}</td>
                    <td>{r.trendCls ? r.trendCls.label : "평가 안 함"}{r.trend ? ` (${r.trend.y0}–${r.trend.y1})` : ""}</td>
                  </tr></tbody></table>
                <p><b>왜 강조됐나</b></p>
                <ul>{r.reasons.map((x, k) => <li key={k}>{x.t}</li>)}</ul>
                <p><b>검토해 볼 수 있는 공중보건 대응</b> <span className="muted">(공식 문서 목록 — 처방이 아님)</span></p>
                {!e.any ? <p className="muted">연결된 공식 자료 없음 — 근거 부족 · 추가 검토 필요</p> : (
                  <ul>
                    {e.recs.map((x) => <li key={x.id}>[{LEVEL[x.level] || x.level}] {x.goal} — {x.source}{x.url ? <> · <a href={x.url}>{x.url}</a></> : null}</li>)}
                    {e.nice && <li>[NICE] {e.nice.title_ko || e.nice.title} ({e.nice.code}, 최종 갱신 {e.nice.last_updated || e.nice.published}) · <a href={e.nice.url}>{e.nice.url}</a></li>}
                    {e.cp && <li>[CPSTF] {e.cp.topic_ko || e.cp.topic} 권고 {e.cp.n}건(최근 {e.cp.latest_year}년) · <a href={e.cp.findings_url || e.cp.url}>{e.cp.findings_url || e.cp.url}</a></li>}
                  </ul>
                )}
              </div>
            );
          })}
        </section>

        {strengths.length > 0 && (
          <section>
            <h2>3. 강점 지표</h2>
            <table className="rpt-tbl"><thead><tr><th>지표</th><th>영역</th><th>지역 값</th><th>전국 중앙값</th><th>상대 위치</th></tr></thead>
              <tbody>{strengths.map((r) => <tr key={r.id}><td>{r.name}</td><td>{r.domain}</td><td>{fmt(r.v)}{r.unit}</td><td>{fmt(r.ref)}{r.unit}</td><td>{posTxt(r)}</td></tr>)}</tbody></table>
          </section>
        )}

        <section>
          <h2>{strengths.length ? 4 : 3}. 지역사회건강조사 지표 전체</h2>
          <p className="muted">{p.rows.length}개 · 값: {basis} · 차이는 지역 값 − 전국 중앙값 · 위치는 비교 집단에서의 구간(30곳 이하는 순위).</p>
          <table className="rpt-tbl rpt-all"><thead><tr><th>영역</th><th>지표</th><th>지역 값</th><th>전국 중앙값</th><th>차이</th><th>위치</th><th>추세</th><th>판정</th></tr></thead>
            <tbody>{byDomain(p.rows).flatMap(([d, rs]) => rs.map((r, i) => (
              <tr key={r.id}>{i === 0 && <td rowSpan={rs.length}>{d}</td>}<td>{r.name}</td>
                <td>{r.v == null ? "–" : `${fmt(r.v)}${r.unit}`}</td><td>{r.ref == null ? "–" : `${fmt(r.ref)}${r.unit}`}</td>
                <td>{r.gap ? `${sign(r.gap.abs)}${fmt(Math.abs(r.gap.abs))}${du(r.unit)}` : "–"}</td><td>{posTxt(r)}</td>
                <td>{r.trendCls?.label || "–"}</td><td>{TIER_KO[r.tier]}</td></tr>
            )))}</tbody></table>
        </section>

        {admin.length > 0 && (
          <section>
            <h2>{strengths.length ? 5 : 4}. 사망률·암검진(시군구 단위 자료)</h2>
            <p className="muted">비교 집단: {isSido ? "17개 시도" : `전국 시군구 ${VS.regions.municipalities_active}곳`} · 표본오차가 없는 행정 통계입니다.</p>
            <table className="rpt-tbl"><thead><tr><th>지표</th><th>지역 값</th><th>전국 중앙값</th><th>차이</th><th>위치</th><th>추세</th></tr></thead>
              <tbody>{admin.map((r) => <tr key={r.id}><td>{r.name} <span className="muted">({r.y}년)</span></td><td>{fmt(r.v)} {r.unit}</td><td>{fmt(r.ref)} {r.unit}</td><td>{sign(r.gap.abs)}{fmt(Math.abs(r.gap.abs))}{du(r.unit)}</td><td>{posTxt(r)}</td><td>{r.trendCls?.label || "–"}</td></tr>)}</tbody></table>
          </section>
        )}

        <section>
          <h2>방법</h2>
          <ul>
            <li>판정은 대시보드 「우리 지역 우선 검토 항목」과 같은 계산입니다: 전국 중앙값 대비 방향 보정 격차 {WEIGHTS.gap * 100}% · 비교 집단 안 위치 {WEIGHTS.rank * 100}% · 최근 5년 추세 {WEIGHTS.trend * 100}% · 지역박탈지수 {WEIGHTS.dep * 100}%(없으면 빼고 나머지 가중치로 다시 나눔).</li>
            <li>「우선 검토」는 불리한 쪽 · 하위 {Math.round((1 - THRESHOLDS.priorityU) * 100)}% · 점수 {THRESHOLDS.priorityScore} 이상 · 95% 신뢰구간이 전국 중앙값을 포함하지 않음 · 상대표준오차 20% 이하일 때만 붙습니다. 점수는 화면 내부용이며 공식 지수가 아닙니다.</li>
            <li>지역사회건강조사는 표본조사라 이웃한 순위의 차이는 작을 수 있습니다. 지역사회건강조사 지표는 조사 단위 {HC_POOL.length}곳, 행정 지표는 시군구 {VS.regions.municipalities_active}곳과 비교합니다.</li>
            <li>예방·관리 자료는 지식베이스(AI 수집·요약, 원문 링크)와 NICE·CPSTF 목록이며, 실제 사업은 지역 여건과 전문가 검토가 필요합니다.</li>
          </ul>
        </section>
        <section>
          <h2>자료원과 한계</h2>
          <ul>{sources.map((s) => <li key={s.key}>{s.org} — {s.title}{s.updated ? ` (갱신 ${s.updated})` : ""}{s.url ? <> · <a href={s.url}>{s.url}</a></> : null}</li>)}</ul>
          <p className="muted">보건소 사업의 투입·산출 자료가 없으므로 사업 성과평가나 인과효과 판단에 쓸 수 없습니다. 건강수명과 지역박탈지수는 이 대시보드의 근사 산출값이며 공식 통계가 아닙니다. 지표별 출처·정의는 대시보드 각 지표의 ⓘ와 「자료원」 탭, 데이터 검증 문서(docs/DATA_VALIDATION.md)에서 확인할 수 있습니다.</p>
          <p className="muted">출처: 지역 건강프로파일 대시보드(health-profile.kr) · 기획·제작 지음웍스 · 자동 생성 {today}</p>
        </section>
      </article>
    </div>
  );
}
