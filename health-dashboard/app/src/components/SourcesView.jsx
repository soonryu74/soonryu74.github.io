import { useMemo, useState } from "react";
import COV from "../../../data/coverage.json";
import { saveCsvRows } from "../export";

/* 자료원 — 보건소 258개소 기준표와 자료원별 보유 현황.
   소유자 지시(2026-09-19): 보건소 수를 지역사회건강조사 258개 조사 단위로 통일하고,
   기준 옆 칸에 자료가 있고 없고를 표기하며, 자료원을 마지막 메뉴에 정리한다. */

const MARK = { O: { t: "●", c: "mk-o", d: "이 보건소 단위로 값이 있음" },
               P: { t: "◐", c: "mk-p", d: "소속 시군구 값으로 대체" },
               X: { t: "○", c: "mk-x", d: "없음" } };

export default function SourcesView() {
  const [q, setQ] = useState("");
  const [only, setOnly] = useState("all");     // all | gap
  const srcs = COV.sources;
  const rows = useMemo(() => {
    const qq = q.trim();
    return COV.units.filter((u) => {
      if (qq && !(u.n.includes(qq) || u.s.includes(qq) || (u.hc || "").includes(qq))) return false;
      if (only === "gap" && srcs.every((s) => u[s.key] !== "X")) return false;
      return true;
    });
  }, [q, only, srcs]);

  const tally = (key) => {
    const c = { O: 0, P: 0, X: 0 };
    for (const u of COV.units) c[u[key]] = (c[u[key]] || 0) + 1;
    return c;
  };

  const csv = () => saveCsvRows(
    [["시도", "보건소", "단위코드", "단위", "2025 표본수", ...srcs.map((s) => s.name)],
     ...COV.units.map((u) => [u.s, u.hc, u.c, u.l === "sub" ? "보건소 세부" : "시군구", u.n2025 ?? "",
       ...srcs.map((s) => ({ O: "있음", P: "시군구 대체", X: "없음" }[u[s.key]]))])],
    "보건소258_자료보유현황");

  return (
    <div className="srcview">
      <div className="card span2">
        <h3>기준 보건소 수 — {COV.standard}개소</h3>
        <div className="desc">
          이 대시보드의 지역 기준은 <b>지역사회건강조사 {COV.standard}개 조사 단위</b>입니다. 출처: {COV.standard_source}
        </div>
        <div className="cnt-rows">
          {COV.counts.map((c) => (
            <div key={c.label} className={`cnt-row ${c.std ? "std" : ""}`}>
              <div className="cnt-n">{c.n}</div>
              <div className="cnt-l">{c.label}{c.std && <span className="std-chip">기준</span>}</div>
              <div className="cnt-note">{c.note}</div>
            </div>
          ))}
        </div>
        <div className="desc" style={{ marginTop: 8 }}>
          숫자가 서로 다른 이유 — <b>보건소 수(258)</b>는 조사·사업 단위이고, <b>시군구 수(229)</b>는 행정 단위입니다(기초자치단체 226곳 + 제주 행정시 2곳 + 세종시).
          일반구가 있는 시(수원·성남·창원 등)는 시 하나에 보건소가 여러 곳이라 보건소가 더 많습니다.
          <b> 지역보건의료계획은 시·군·구와 시·도가 수립</b>하므로 보건소 수와 일치하지 않습니다.
        </div>
      </div>

      <div className="card span2">
        <h3>자료원 {srcs.length}종</h3>
        <div className="desc">
          각 자료원이 {COV.standard}개 보건소 중 몇 곳을 덮는지 — ● 단위 그대로 · ◐ 소속 시군구 값으로 대체 · ○ 없음.
          기관은 <b>원 출처 기준</b>입니다. 여러 국가통계를 모아 둔 2차 가공본을 통해 받은 것은 「경유」로 따로 적었습니다.
        </div>
        <div className="srclist">
          {srcs.map((s) => {
            const c = tally(s.key);
            return (
              <div key={s.key} className="srccard">
                <div className="sc-head">
                  <b>{s.name}{s.approx && <span className="approx-chip">근사·공식 아님</span>}</b>
                  <span className="sc-n">{s.n}개 지표</span>
                </div>
                <div className="sc-org">{s.org}</div>
                <div className="sc-meta">
                  <span>{s.years[0]}–{s.years[1]}</span><span>{s.unit} 단위</span><span>{s.cycle}</span>
                  {s.next && <span className="sc-next">다음 {s.next}</span>}
                </div>
                <div className="sc-bar" title={`단위 그대로 ${c.O} · 시군구 대체 ${c.P} · 없음 ${c.X}`}>
                  <i className="b-o" style={{ width: `${(c.O / COV.standard) * 100}%` }} />
                  <i className="b-p" style={{ width: `${(c.P / COV.standard) * 100}%` }} />
                  <i className="b-x" style={{ width: `${(c.X / COV.standard) * 100}%` }} />
                </div>
                <div className="sc-cnt">● {c.O} · ◐ {c.P} · ○ {c.X}</div>
                <div className="sc-tbl">{s.tbl}{s.updated && ` · 최종갱신 ${s.updated}`}</div>
                {s.via && <div className="sc-via">경유 · {s.via}</div>}
                {s.formula && (
                  <div className="sc-formula">
                    <code>{s.formula}</code>
                    {s.formula_note && <small>{s.formula_note}</small>}
                  </div>
                )}
                {s.note && <div className="sc-note">{s.note}</div>}
                {s.limits && (
                  <details className="sc-lim">
                    <summary>한계 {s.limits.length}가지</summary>
                    <ul>{s.limits.map((l, i) => <li key={i}>{l}</li>)}</ul>
                  </details>
                )}
                {s.url && <a className="sc-url" href={s.url} target="_blank" rel="noreferrer">원본 바로가기 ↗</a>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card span2">
        <h3>보건소별 자료 보유 현황 <small className="muted">({rows.length}/{COV.standard})</small></h3>
        <div className="seg" style={{ margin: "6px 0 10px", flexWrap: "wrap" }}>
          <input className="pick-search" style={{ maxWidth: 220 }} placeholder="보건소·지역 검색"
            value={q} onChange={(e) => setQ(e.target.value)} />
          <button className={`seg-btn ${only === "all" ? "on" : ""}`} onClick={() => setOnly("all")}>전체</button>
          <button className={`seg-btn ${only === "gap" ? "on" : ""}`} onClick={() => setOnly("gap")}>결측 있는 곳만</button>
          <button className="seg-btn" style={{ marginLeft: "auto" }} onClick={csv}>↓ CSV</button>
        </div>
        <div className="covwrap">
          <table className="covtbl">
            <thead>
              <tr>
                <th className="cv-s">시도</th><th className="cv-n">보건소</th><th className="cv-u">단위</th>
                {srcs.map((s) => <th key={s.key} className="cv-m" title={`${s.name} — ${s.org}`}>{s.name.slice(0, 5)}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.c} className={srcs.some((s) => u[s.key] === "X") ? "has-gap" : ""}>
                  <td className="cv-s">{u.s}</td>
                  <td className="cv-n">{u.hc}{u.n2025 ? <small> n={u.n2025}</small> : null}</td>
                  <td className="cv-u">{u.l === "sub" ? "세부" : "시군구"}</td>
                  {srcs.map((s) => (
                    <td key={s.key} className={`cv-m ${MARK[u[s.key]].c}`} title={`${s.name} — ${MARK[u[s.key]].d}`}>
                      {MARK[u[s.key]].t}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="desc" style={{ marginTop: 8 }}>
          ● 그 보건소 단위로 값이 있음 · ◐ 보건소 단위 값은 없고 <b>소속 시군구 값으로 대체</b> · ○ 없음.
          일반구가 있는 시의 보건소(고양시 덕양·일산동·일산서 등)는 사망률·암검진 같은 시군구 단위 통계가 보건소별로 나뉘지 않아 ◐ 입니다.
        </div>
      </div>
    </div>
  );
}
