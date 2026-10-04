import { recommendFor, evidenceOf, guideOf, NCD, RBY } from "../../data";
import KC from "../../../../data/khepi_cases.json";
import { T } from "./i18n";

/* 「참고할 수 있는 예방·관리 자료」 — 예방·관리 지식베이스·NICE·CPSTF·우수사례를 다시 쓴다.
   정책 처방이 아니라 검토 가능한 근거·참고 가능한 중재 목록이다. 자료가 없으면 「근거 부족 · 추가 검토 필요」. */
const LEVEL = { sido: "시도 계획", national: "국가", regional: "WHO 서태평양", global: "WHO" };
const LEVEL_EN = { sido: "Provincial plan (KR)", national: "National (KR)", regional: "WHO Western Pacific", global: "WHO" };
const cut = (s, n = 70) => (s && s.length > n ? s.slice(0, n) + "…" : s);

export function evidenceFor(ind, sel) {
  const sidoFull = sel.l === "sido" ? sel.n : RBY.get(sel.p)?.n;
  const recs = recommendFor(ind.name, sidoFull).slice(0, 2);
  const ev = evidenceOf(ind.id);
  const nice = (ev?.nice || []).map((x) => guideOf(x.code)).filter(Boolean)[0] || null;
  const cp = (ev?.cpstf || []).filter((t) => t.n > 0)[0] || null;
  const cases = KC.cases.filter((c) => (c.areas || []).includes(ind.domain)).length;
  const firstUrl = recs.find((r) => r.url)?.url || nice?.url || cp?.findings_url || cp?.url || null;
  return { recs, nice, cp, cases, firstUrl, any: !!(recs.length || nice || cp) };
}

export default function EvidenceActions({ row, sel, onPick, onPeer, onGoCard, onRecommend, lang = "ko" }) {
  const ind = row.ind;
  const e = evidenceFor(ind, sel);
  const en = lang === "en", L = T[lang] || T.ko;
  return (
    <div className="eq-act">
      <div className="eq-sub">{L.act}</div>
      <div className="eq-actnote muted">{L.actNote}</div>
      {!e.any ? <div className="eq-none">{en ? "No linked official source — insufficient evidence; further review needed" : "연결된 공식 자료 없음 — 근거 부족 · 추가 검토 필요"}</div> : (
        <ul className="eq-res">
          {e.recs.map((r) => (
            <li key={r.id}><span className="eq-lv">{(en ? LEVEL_EN : LEVEL)[r.level] || r.level}</span>{en && <span className="muted">Consider (Korean source): </span>}<span lang="ko">{cut(r.goal)}</span> <span className="muted">· {cut(r.source, 40)}</span>{r.url && <> · <a href={r.url} target="_blank" rel="noopener noreferrer">{en ? "source ↗" : "원문 ↗"}</a></>}</li>
          ))}
          {e.nice && <li><span className="eq-lv">NICE</span>{en ? <>Consider: NICE guideline “{e.nice.title}”</> : (e.nice.title_ko || e.nice.title)} <span className="muted">· {e.nice.code} · {en ? "last updated" : "최종 갱신"} {e.nice.last_updated || e.nice.published}</span> · <a href={e.nice.url} target="_blank" rel="noopener noreferrer">{en ? "source ↗" : "원문 ↗"}</a></li>}
          {e.cp && <li><span className="eq-lv">CPSTF</span>{en ? <>Consider: community interventions reviewed by the US Community Preventive Services Task Force — {e.cp.topic} ({e.cp.n} findings)</> : <>{e.cp.topic_ko || e.cp.topic} 권고 {e.cp.n}건</>} <span className="muted">· {en ? "latest" : "최근"} {e.cp.latest_year}{en ? "" : "년"}</span> · <a href={e.cp.findings_url || e.cp.url} target="_blank" rel="noopener noreferrer">{en ? "source ↗" : "원문 ↗"}</a></li>}
        </ul>
      )}
      <div className="eq-meta muted">{en ? `Prevention knowledge base collected ${NCD.generated} · AI-assisted collection and summary — check the original document${e.cases ? ` · ${e.cases} Korean local good-practice cases in this domain` : ""}` : `예방·관리 지식베이스 수집 ${NCD.generated} · AI 수집·요약이므로 원문 확인 필요${e.cases ? ` · 같은 영역 시군구 우수사례 ${e.cases}건` : ""}`}</div>
      <div className="eq-btns">
        <a className={`themebtn ${e.firstUrl ? "" : "is-off"}`} href={e.firstUrl || undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!e.firstUrl} onClick={(ev) => { if (!e.firstUrl) ev.preventDefault(); }}>{en ? "Official source ↗" : "공식 자료 보기 ↗"}</a>
        <button type="button" className="themebtn" onClick={() => onPick && onPick(ind, row.y)}>{en ? "Indicator analysis (KR)" : "관련 지표 보기"}</button>
        {sel.l === "sgg" && onPeer && <button type="button" className="themebtn" onClick={() => onPeer(ind.id)}>{en ? "Compare similar areas" : "유사 지역 비교"}</button>}
        <button type="button" className="themebtn" onClick={() => onGoCard && onGoCard({ view: "analysis", ind, code: sel.c, card: "연도별 추이표" })}>{en ? "Year-by-year (KR)" : "연도별 변화 보기"}</button>
        {e.recs.length > 0 && onRecommend && <button type="button" className="themebtn" onClick={() => onRecommend(ind.name)}>{en ? "More prevention resources (KR)" : "예방·관리에서 더 보기"}</button>}
      </div>
    </div>
  );
}
