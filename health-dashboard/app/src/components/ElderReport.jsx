import { useMemo, useRef, useState } from "react";
import { fmt, label } from "../data";
import { buildElderReport, draftElderParagraphs, elderRowFor, GROUPS, SIGNAL_MIN, SIGNAL_KEYS, SIGNAL_AVAIL_MIN, CUT, elderMan as man } from "../lib/elderReport";
import { BUILD } from "./ReviewsCard";
import { download, saveCsvRows } from "../export";
import { copyText } from "./FeedbackView";
import ReportMode from "./ReportMode";

/* 고령층(65세 이상) 취약 보고서 — 해시 view=elder. 노인보건·방문건강관리·낙상 예방·치매 사업의 대상지 검토용.
   분석 방향: 전국 고령 인구 규모 → 항목별 전국 분포 → 복합 고령 취약 신호(B·C 6개 중 3개 이상이 불리한 쪽 20%) → 시도별 → 수요 대비 자원 부족 → 코로나19 참고 → 사업 참고 자료.
   「고위험 지역」이 아니라 「복합 고령 취약 신호 지역」이며, 순위 발표·원인·효과·처방이 아니다. */
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const pctOf = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : "–");
const posTxt = (it, u) => (!isNum(u) ? "–" : it.dir === "context" ? `높은 쪽 ${Math.max(1, Math.round((1 - u) * 100))}%` : u >= 0.8 ? "불리한 쪽 20%" : u <= 0.2 ? "양호한 쪽 20%" : "중간");

// 「복합 고령 취약 신호 시군구」 정의 — 2절·4절 공통. 숫자·항목명은 lib/elderReport.js 상수와 m.items 에서 읽는다.
function SignalDef({ m }) {
  const its = SIGNAL_KEYS.map((k) => m.itemBy[k]).filter(Boolean);
  const byGrp = ["B", "C"].map((g) => [g, its.filter((it) => it.grp === g)]).filter(([, a]) => a.length);
  const top = Math.round((1 - CUT) * 100);
  return (
    <div className="rpt-def">
      <span className="rpt-def-lab">정의</span>
      <p><b>복합 고령 취약 신호 시군구</b> = 아래 {its.length}개 항목 중 <b>{SIGNAL_MIN}개 이상</b>이 전국 시군구 {m.n}곳 가운데 불리한 쪽 {top}%에 든 곳</p>
      <ul>
        {byGrp.map(([g, a]) => <li key={g}>{GROUPS[g]}({a.length}개): {a.map((it) => it.name).join(" · ")}</li>)}
      </ul>
      <p className="muted">불리한 쪽 {top}% = 그 항목 값이 다른 시군구의 {100 - top}%보다 불리한 곳(값이 높을수록 불리한 항목들). 값이 있는 항목이 {SIGNAL_AVAIL_MIN}개 미만인 시군구는 판정하지 않습니다. 65세 이상 비율(인구 구조)과 돌봄·여가 자원은 개수에 넣지 않습니다. 고위험 판정이나 순위가 아닙니다.</p>
    </div>
  );
}

export default function ElderReport({ sel, item = "std", smooth = 3, onBack, onMode, onNcd }) {
  const docRef = useRef(null);
  const [msg, setMsg] = useState("");
  const m = useMemo(() => buildElderReport(item, smooth), [item, smooth]);
  const me = elderRowFor(m, sel);
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const paras = draftElderParagraphs(m);
  const I = m.itemBy;
  const isMine = (o) => me?.row && o.r.c === me.row.r.c;
  const fileBase = `고령층_65세이상_취약보고서_${today}`;
  const shortName = (k) => ({ alone: "독거", bpen: "기초연금", chew: "저작불편", pneu: "폐렴 사망", fall: "낙상 사망", traffic: "노인 교통사고", ltcfac: "시설 정원", ltchome: "재가 정원", welf: "여가복지시설" }[k] || k);
  const val = (o, k) => (isNum(o.v[k]) ? `${fmt(o.v[k])}${I[k].unit === "%" ? "%" : ""}` : "–");
  const years = [...new Set(m.items.map((it) => it.y).filter(Boolean))].sort();
  const maxShare = Math.max(...m.sido.map((x) => (x.n ? x.nSig / x.n : 0)), 0.01);

  const saveWord = () => {
    const doc = docRef.current?.cloneNode(true);
    doc?.querySelectorAll(".rpt-noprint").forEach((n) => n.remove());
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>고령층 취약 보고서</title>
<style>body{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;font-size:10.5pt;line-height:1.55;color:#111}h1{font-size:18pt}h2{font-size:14pt;margin-top:16pt}h3{font-size:12pt}table{border-collapse:collapse;width:100%;margin:6pt 0}th,td{border:1px solid #999;padding:3pt 5pt;font-size:9.5pt;vertical-align:top}th{background:#eef2f7}.muted{color:#555}.rpt-bar{display:none}.rpt-def{border:1px solid #2a6fdb;padding:6pt 8pt;margin:6pt 0;background:#f4f7fc}.rpt-def-lab{font-weight:bold;color:#2a6fdb}.rpt-th-sub{font-weight:normal;font-size:8.5pt}</style></head><body>${doc?.innerHTML || ""}</body></html>`;
    download(new Blob(["﻿" + html], { type: "application/msword" }), `${fileBase}.doc`);
  };
  const saveCsv = () => saveCsvRows([
    ["지역", "65세 이상 인구(명)", ...m.items.map((it) => `${it.name}${it.unit && it.unit !== "%" ? `(${it.unit})` : it.unit === "%" ? "(%)" : ""} ${it.y || ""}`), "복합 신호 개수(6개 중)", "불리한 쪽 20% 항목", "박탈 분위"],
    ...m.rows.slice().sort((a, b) => (b.sig ?? -1) - (a.sig ?? -1)).map((o) => [label(o.r), o.age65 ?? "", ...m.items.map((it) => (isNum(o.v[it.key]) ? +o.v[it.key].toFixed(2) : "")), o.sig ?? "", o.flags.map(shortName).join(" "), o.dep?.q ?? ""]),
  ], fileBase);
  const copyDraft = async () => setMsg((await copyText(paras.join("\n\n"))) ? "현황 문장 초안을 복사했습니다. 원자료와 대조해 고쳐 쓰세요." : "복사하지 못했습니다. 문장을 드래그해 복사해 주세요.");

  return (
    <div className="rpt-wrap">
      <div className="card rpt-actions">
        <ReportMode cur="elder" onMode={onMode} />
        <div><b>고령층(65세 이상) 취약 보고서</b> <span className="muted">— 전국 시군구 {m.n}곳 · 노인보건·방문건강관리·낙상 예방·치매 사업 대상지 검토용 · 화면에서만 만들어집니다.</span></div>
        <div className="rev-btns">
          <button type="button" className="themebtn" onClick={() => window.print()}>🖨 인쇄 · PDF 저장</button>
          <button type="button" className="themebtn" onClick={saveWord}>⬇ 워드(.doc) 저장</button>
          <button type="button" className="themebtn" onClick={saveCsv}>⬇ 전체 시군구 CSV</button>
          <button type="button" className="themebtn" onClick={copyDraft}>📋 문장 초안 복사</button>
          {onBack && <button type="button" className="themebtn" onClick={onBack}>← 지역 프로파일</button>}
        </div>
        {msg && <div className="desc" role="status">{msg}</div>}
      </div>

      <article className="rpt" ref={docRef} aria-label="고령층 취약 보고서">
        <header className="rpt-head">
          <div className="rpt-kicker">대상 집단 보고서 · 고령층(65세 이상) · 자동 생성 초안</div>
          <h1>고령층 취약 현황 — 전국 시군구</h1>
          <p className="muted">작성일 {today} · 비교: 전국 시군구 {m.n}곳 · 자료 연도 {years[0]}–{years[years.length - 1]}(항목마다 다름) · 지표 값: {smooth === 3 ? "기준연도 포함 최근 3년 평균" : "단년"} · 대시보드 빌드 {BUILD.commit}{me?.row ? ` · 선택 지역 ${label(me.row.r)}` : me?.sido ? ` · 선택 지역 ${me.sido.s.n}` : ""}</p>
          <p className="rpt-note">공개 통계로 자동 작성한 초안입니다. 「복합 고령 취약 신호 지역」은 여러 항목이 함께 불리한 쪽에 있다는 뜻이며 고위험 판정이나 순위 발표가 아닙니다. 원인이나 사업 효과를 뜻하지 않습니다.</p>
        </header>

        <section>
          <h2><span className="rpt-no">1</span>요약</h2>
          <table className="rpt-tbl rpt-sum"><tbody>
            <tr><th scope="row">고령 인구</th><td>65세 이상 {man(m.nat.age65)}명(전체의 {fmt(m.nat.aged)}%) · 75세 이상 {man(m.nat.age75)}명 · 독거노인 {man(m.nat.alone)}명(65세 이상의 {fmt(m.nat.aloneShare)}%) · {I.aged.y}년</td></tr>
            <tr><th scope="row">시군구 간 차이</th><td>65세 이상 비율 중앙값 {fmt(I.aged.med)}% · 하위 20%·상위 20% 경계 {fmt(I.aged.p20)}–{fmt(I.aged.p80)}% · 범위 {fmt(I.aged.min)}–{fmt(I.aged.max)}%</td></tr>
            <tr><th scope="row">복합 고령 취약 신호</th><td>{m.signal.length}곳({SIGNAL_KEYS.length}개 항목 중 {SIGNAL_MIN}개 이상이 불리한 쪽 {Math.round((1 - CUT) * 100)}% — 정의는 2절) · 신호 개수별 지역 수 {m.sigDist.map((n, k) => `${k}개 ${n}`).join(" · ")}</td></tr>
            <tr><th scope="row">수요 대비 자원 부족</th><td>{m.demand.length}곳(65세 이상 비율 높은 쪽 20% + 돌봄·여가 자원 적은 쪽 20%)</td></tr>
            {me?.row && <tr><th scope="row">{label(me.row.r)}</th><td>65세 이상 {fmt(me.row.v.aged)}%({man(me.row.age65)}명) · 신호 {me.row.sig ?? "–"}개{me.row.flags.length ? `(${me.row.flags.map(shortName).join("·")})` : ""}{me.row.lowRes.length ? ` · 자원 적은 쪽: ${me.row.lowRes.map(shortName).join("·")}` : ""}</td></tr>}
            {me?.sido && <tr><th scope="row">{me.sido.s.n}</th><td>65세 이상 {fmt(me.sido.aged)}%({man(me.sido.age65)}명) · 독거노인 {fmt(me.sido.aloneShare)}% · 복합 신호 시군구 {me.sido.nSig}/{me.sido.n}곳</td></tr>}
          </tbody></table>
          <h3>현황 문장(초안)</h3>
          <div className="rpt-draft">{paras.map((t, i) => <p key={i}>{t}</p>)}</div>
        </section>

        <section>
          <h2><span className="rpt-no">2</span>시도별 고령 인구와 복합 신호 지역</h2>
          <SignalDef m={m} />
          <table className="rpt-tbl rpt-wide"><thead><tr><th>시도</th><th>65세 이상</th><th>비율</th><th>75세 이상</th><th>독거노인 비율</th><th>복합 신호 시군구<div className="rpt-th-sub">신호 지역 수 / 시도 안 시군구 수</div></th></tr></thead>
            <tbody>{m.sido.map((x) => (
              <tr key={x.s.c} className={me?.sido?.s.c === x.s.c || me?.row?.r.p === x.s.c ? "rpt-me" : ""}><td>{x.s.n}</td><td>{man(x.age65)}명</td><td>{fmt(x.aged)}%</td><td>{man(x.age75)}명</td><td>{fmt(x.aloneShare)}%</td>
                <td><span className="rpt-bar" style={{ width: `${((x.n ? x.nSig / x.n : 0) / maxShare) * 5}em` }} aria-hidden="true" />{x.nSig}/{x.n}곳 ({pctOf(x.nSig, x.n)})</td></tr>
            ))}</tbody></table>
          <p className="muted">예: 「11/22곳(50%)」 = 그 시도 시군구 22곳 중 11곳이 복합 신호 시군구. 괄호 % = 그 비율 · 막대 길이 = 그 비율(시도 간 비교용).</p>
        </section>

        <section>
          <h2><span className="rpt-no">3</span>항목별 전국 분포</h2>
          <p className="muted">값이 있는 시군구의 중앙값과 하위 20%·상위 20% 경계입니다. 인구 구조는 크기만 보여 주고 좋고 나쁨을 판정하지 않습니다.</p>
          <table className="rpt-tbl rpt-wide"><thead><tr><th>묶음</th><th>항목</th><th>연도</th><th>중앙값</th><th>P20–P80</th><th>불리한 쪽 20% 경계</th>{me?.row && <th>{me.row.r.n}</th>}</tr></thead>
            <tbody>{m.items.map((it) => (
              <tr key={it.key}><td>{GROUPS[it.grp]}</td><td>{it.name}{it.note ? <div className="muted">{it.note}</div> : null}</td><td>{it.y || "–"}</td>
                <td>{fmt(it.med)}{it.unit}</td><td>{fmt(it.p20)}–{fmt(it.p80)}</td>
                <td>{it.dir === "context" ? "—" : `${it.dir === "lower_is_better" ? "≥" : "≤"} ${fmt(it.cut)}`}</td>
                {me?.row && <td>{isNum(me.row.v[it.key]) ? `${fmt(me.row.v[it.key])}${it.unit} · ${posTxt(it, me.row.u[it.key])}` : "–"}</td>}</tr>
            ))}</tbody></table>
        </section>

        <section>
          <h2><span className="rpt-no">4</span>복합 고령 취약 신호 지역 ({m.signal.length}곳)</h2>
          <SignalDef m={m} />
          <p className="muted">신호 개수 → 65세 이상 인구 순으로 놓았으며 순위가 아닙니다.</p>
          <table className="rpt-tbl rpt-vul"><thead><tr><th>신호</th><th>지역</th><th>65세 이상</th><th>독거노인</th><th>불리한 쪽 20% 항목</th><th>박탈</th></tr></thead>
            <tbody>{m.signal.map((o) => (
              <tr key={o.r.c} className={isMine(o) ? "rpt-me" : ""}><td><span className="el-sig">{o.sig}/{o.nAvail}</span></td><td>{label(o.r)}</td><td>{fmt(o.v.aged)}% · {man(o.age65)}명</td><td>{val(o, "alone")}</td>
                <td>{o.flags.map(shortName).join(" · ")}</td><td>{o.dep?.q ? `${o.dep.q}분위` : "–"}</td></tr>
            ))}</tbody></table>
          {me?.row && !m.signal.some(isMine) && <p className="muted">{label(me.row.r)}은 신호 {me.row.sig ?? "–"}개로 이 목록에 없습니다{me.row.flags.length ? `(불리한 쪽 20%: ${me.row.flags.map(shortName).join("·")})` : ""}.</p>}
        </section>

        {m.demand.length > 0 && (
          <section>
            <h2><span className="rpt-no">5</span>수요 대비 자원 부족 <small>고령 인구 비중이 큰데 돌봄·여가 자원이 적은 지역 ({m.demand.length}곳)</small></h2>
            <p className="muted">65세 이상 비율이 높은 쪽 20%이면서 장기요양 시설·재가 정원(65세 이상 1천 명당)이나 노인여가복지시설 중 하나 이상이 적은 쪽 20%인 시군구입니다. 정원은 시설 소재지 기준이라 인근 지역 시설 이용을 함께 봐야 합니다.</p>
            <table className="rpt-tbl rpt-wide"><thead><tr><th>지역</th><th>65세 이상</th><th>시설 정원</th><th>재가 정원</th><th>여가복지시설</th><th>적은 쪽 20%</th></tr></thead>
              <tbody>{m.demand.map((o) => (
                <tr key={o.r.c} className={isMine(o) ? "rpt-me" : ""}><td>{label(o.r)}</td><td>{fmt(o.v.aged)}%</td><td>{val(o, "ltcfac")}</td><td>{val(o, "ltchome")}</td><td>{val(o, "welf")}</td><td>{o.lowRes.map(shortName).join(" · ")}</td></tr>
              ))}</tbody></table>
          </section>
        )}

        <section>
          <h2><span className="rpt-no">{m.demand.length ? 6 : 5}</span>박탈 분위별 · 코로나19 참고</h2>
          <p className="muted">지역박탈지수(근사, {m.depYear}년 총조사) 5분위별 복합 신호 지역 비율입니다. 박탈지수 구성 변수 7개에 고령인구 비율이 들어 있어 고령 지역에서 박탈 분위가 높게 나오는 경향이 있습니다. 함께 놓고 본 것이며 원인 관계를 뜻하지 않습니다.</p>
          <table className="rpt-tbl rpt-wide"><thead><tr><th>박탈 분위</th>{m.depQ.map((d) => <th key={d.q}>{d.q}{d.q === 1 ? "(덜 박탈)" : d.q === 5 ? "(가장 박탈)" : ""}</th>)}</tr></thead>
            <tbody>
              <tr><th scope="row">시군구 수</th>{m.depQ.map((d) => <td key={d.q}>{d.n}</td>)}</tr>
              <tr><th scope="row">복합 신호</th>{m.depQ.map((d) => <td key={d.q}>{d.nSig} ({pctOf(d.nSig, d.n)})</td>)}</tr>
            </tbody></table>
          {m.covid.q.length > 0 && (<>
            <h3>코로나19(2020.1–2023.8) 65세 이상 비율 4분위별</h3>
            <table className="rpt-tbl rpt-wide"><thead><tr><th>65세 이상 비율</th><th>누적 확진율</th><th>사망(10만 명당)</th><th>치명률</th></tr></thead>
              <tbody>{m.covid.q.map((q) => <tr key={q.lo}><td>{fmt(q.lo)}–{fmt(q.hi)}%</td><td>{fmt(q.case_rate)}%</td><td>{fmt(q.death_rate)}명</td><td>{q.cfr.toFixed(3)}%</td></tr>)}</tbody></table>
            <p className="muted">질병관리청 시군구별 확진·사망(신고 보건소 관할 기준 — 상급종합병원 소재지에 사망이 몰릴 수 있음). 시군구별 순위로 쓰지 않습니다.</p>
          </>)}
        </section>

        <section>
          <h2><span className="rpt-no">{m.demand.length ? 7 : 6}</span>사업 참고 자료</h2>
          <p className="muted">공식 문서와 사례 목록이며 처방이 아닙니다. 지역 여건과 전문가 검토로 판단하세요.</p>
          <ul>
            {m.evidence.national.map((e) => <li key={e.id}>[{{ national: "국가", regional: "WHO 서태평양", global: "WHO" }[e.level] || e.level}] {e.goal} — {e.source}{e.url ? <> · <a href={e.url}>{e.url}</a></> : null}</li>)}
            {m.evidence.cpstf.map((f) => <li key={f.name}>[CPSTF] {f.name} — {f.finding_ko || f.finding} ({f.date}){f.url ? <> · <a href={f.url}>{f.url}</a></> : null}</li>)}
            <li>17개 시도 제8기 지역보건의료계획의 고령층 관련 세부과제 {m.evidence.sidoPlans}건(대시보드 「예방·관리」 탭)</li>
          </ul>
          {m.evidence.cases.length > 0 && (<>
            <h3>통합건강증진사업 우수사례 중 고령층 사업 ({m.evidence.cases.length}건)</h3>
            <p className="muted">한국건강증진개발원 우수사례집(공공누리 제4유형) — 사업명·지자체·쪽만 옮깁니다. 내용은 원문에서 확인하세요.</p>
            <ul>{m.evidence.cases.map((c, i) => <li key={i}>{c.y}년 사례 · {c.sido} {c.sgg} — {c.name} (p.{c.p})</li>)}</ul>
          </>)}
          {onNcd && <p className="rpt-noprint"><button type="button" className="themebtn" onClick={onNcd}>예방·관리 탭에서 고령층 자료 찾기 →</button></p>}
        </section>

        <section>
          <h2><span className="rpt-no">{m.demand.length ? 8 : 7}</span>방법과 한계</h2>
          <ul>
            <li>분석 단위는 시군구 {m.n}곳입니다(감염병 고위험군 자료와 행정 통계가 시군구 단위). 저작불편호소율은 지역사회건강조사의 시군구 값입니다.</li>
            <li>독거노인 비율 = 독거노인(65세 이상 1인가구) 수 ÷ 65세 이상 주민등록 연앙인구, 기초연금 수급률 = 수급자 수 ÷ 65세 이상 인구(소득 하위 70% 대상 제도), 장기요양 정원 = 시설·재가급여 기관 정원 ÷ 65세 이상 인구 × 1,000(시설 소재지 기준).</li>
            <li>폐렴·낙상 사망률은 연령 표준화 값이라 고령화 정도의 차이를 뺀 비교입니다. 낙상·노인 교통사고 사망은 건수가 적어 해마다 출렁일 수 있습니다{smooth === 3 ? "(3년 평균 사용)" : ""}.</li>
            <li>사회·경제 항목(독거·기초연금)은 농어촌 군 지역에서 높게 나오는 경향이 있어 신호가 군 지역에 몰릴 수 있습니다. 항목마다 연도가 다릅니다({years.join(", ")}).</li>
            <li>신호 개수에는 자원(D)을 넣지 않았습니다 — 필요와 자원을 섞으면 해석이 어려워지기 때문입니다. 치매·노쇠·노인 우울·장기요양 등급자 비율·65세 이상 예방접종률은 시군구 공표 통계를 확보하지 못해 빠져 있습니다.</li>
            <li>사업 투입·산출 자료가 없어 사업 효과를 판단할 수 없습니다. 출처: 통계청 주민등록 연앙인구 · 독거노인 · 보건복지부 기초연금 · 국민건강보험공단 장기요양 · 질병관리청 지역사회건강조사·코로나19 · 국가데이터처 사망원인통계 · 도로교통공단 · 지역 건강프로파일 대시보드(health-profile.kr) · 기획·제작 지음웍스 · 자동 생성 {today}</li>
          </ul>
        </section>
      </article>
    </div>
  );
}

