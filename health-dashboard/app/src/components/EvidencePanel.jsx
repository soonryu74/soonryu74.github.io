import { useState } from "react";
import Cite from "./Cite";
import { EVIDENCE, evidenceOf, guideOf, evidenceVerdict } from "../data";

const G = { "권고": "ev-ok", "강력 권고": "ev-ok", "고려": "ev-co", "반대": "ev-no", "반대 권고": "ev-no", "근거 불충분": "ev-in" };
export const Badge = ({ k, n }) => <span className={`evbadge ${G[k] || "ev-in"}`}>{k}{n != null ? ` ${n}` : ""}</span>;
const ym = (d) => (d ? d.slice(0, 7) : "–");
const age = (d) => EVIDENCE.now_year - Number(d.slice(0, 4));

function Guide({ code, level }) {
  const g = guideOf(code);
  const [open, setOpen] = useState(false);
  const fresh = age(g.last_updated) <= 5;
  return (
    <div className={`evguide ${level}`}>
      <div className="evhead">
        <span className="evcode">{g.code}</span>
        <b className="evtitle">{g.title_ko}</b>
        <span className={`evlv ${level}`}>{level === "direct" ? "직접" : "부분"}</span>
      </div>
      <div className="evmeta">
        <span className="evchip">발표 {ym(g.published)}</span>
        <span className={`evchip ${fresh ? "fresh" : ""}`}>최종 갱신 {ym(g.last_updated)}{fresh ? "" : ` · ${age(g.last_updated)}년 경과`}</span>
        <span className="evchip">권고문 {g.recs.n}</span>
        <Badge k="권고" n={g.recs["권고"]} /><Badge k="고려" n={g.recs["고려"]} /><Badge k="반대" n={g.recs["반대"]} />
        {g.recs["연구권고"] > 0 && <Badge k="근거 불충분" n={g.recs["연구권고"]} />}
        <a className="evlink" href={g.url} target="_blank" rel="noopener">원문 ↗</a>
      </div>
      {g.samples.length > 0 && (
        <button className="xbtn" onClick={() => setOpen(!open)}>{open ? "권고문 예시 접기" : `권고문 예시 ${g.samples.length}개 보기`}</button>
      )}
      {open && <ul className="evsamples">
        {g.samples.map((s, i) => (
          <li key={i}><Badge k={s.grade} />{s.year && <span className="evyear" title="권고문 작성 연도 — 지침 갱신일과 다를 수 있음">{s.year}{s.amended ? `→${s.amended} 수정` : ""}</span>}
            <span className="evtext">{s.text}</span></li>
        ))}
      </ul>}
    </div>
  );
}

// CPSTF 개별 권고 목록 — 개별 원문 주소를 확신할 수 없는 항목은 주제별 권고 목록 페이지로 보낸다
function CpstfList({ cp }) {
  const [open, setOpen] = useState(false);
  const items = (EVIDENCE.cpstf_items || {})[cp.topic] || [];
  if (!items.length) return null;
  const order = { "강력 권고": 0, "권고": 1, "근거 불충분": 2, "반대 권고": 3 };
  const sorted = [...items].sort((a, b) => (order[a.g] ?? 9) - (order[b.g] ?? 9) || (b.y || 0) - (a.y || 0));
  return (
    <>
      <button className="xbtn" onClick={() => setOpen(!open)}>{open ? "CPSTF 권고 접기" : `CPSTF 권고 ${items.length}건 보기`}</button>
      {open && <ul className="evsamples">
        {sorted.map((x, i) => (
          <li key={i}><Badge k={x.g} />{x.y && <span className="evyear" title="CPSTF 판정 연도">{x.y}</span>}
            <a className="evtext" href={x.url || cp.findings_url || cp.url} target="_blank" rel="noopener noreferrer"
              title={x.url ? "CPSTF 권고 원문" : "주제별 권고 목록(개별 페이지 주소 미확인)"}>{x.name} ↗</a></li>
        ))}
      </ul>}
    </>
  );
}

export default function EvidencePanel({ ind }) {
  const e = evidenceOf(ind.id), v = evidenceVerdict(ind.id);
  const cp = e.cpstf[0];
  return (
    <div className={`card span2 evpanel v-${v.key}`}>
      <h3>이 지표의 현행 근거 지침<Cite k={["nice", "cpstf"]} /> <span className={`evverdict v-${v.key}`}>{v.label}</span></h3>
      <div className="desc">
        영국 NICE 현행 지침(NG)을 주 근거로, 미국 CPSTF를 보조로 둡니다. 배지는 권고문 동사 규칙으로 자동 분류한 것입니다 —
        <b> offer·should</b>=권고 · <b>consider</b>=고려 · <b>do not</b>=반대 · 연구 권고=근거 불충분. 개별 문장은 원문 확인이 필요합니다.
      </div>
      {e.nice.length ? e.nice.map((x) => <Guide key={x.code} code={x.code} level={x.level} />)
        : <div className="empty">NICE 현행 지침에 이 지표와 연결되는 항목이 없습니다</div>}
      <div className="evcp">
        <div className="evcphead"><b>보조 · 미국 CPSTF</b>{cp ? <span className="muted"> 「{cp.topic_ko}」 {cp.n}건</span> : <span className="muted"> 해당 주제 없음</span>}</div>
        {cp && <div className="evmeta">
          <span className="evchip">강력 권고 {cp.strong}</span><span className="evchip">권고 {cp.sufficient}</span>
          <span className="evchip">근거 불충분 {cp.insufficient}</span>{cp.against > 0 && <span className="evchip">반대 {cp.against}</span>}
          <span className={`evchip ${EVIDENCE.now_year - cp.median_year > 15 ? "stale" : ""}`}>판정 중앙 {cp.median_year}년 · 최근 10년 내 {cp.recent10}건</span>
          {(cp.findings_url || cp.url) && <a className="evlink" href={cp.findings_url || cp.url} target="_blank" rel="noopener noreferrer">원문 ↗</a>}
        </div>}
        {cp && <CpstfList cp={cp} />}
        {cp && EVIDENCE.now_year - cp.median_year > 15 && (
          <div className="evnote">판정이 오래돼 「무엇을 새로 할지」의 근거로는 약합니다. 주류세·금연구역처럼 기전이 변하지 않는 제도형 중재에 한해 참고하십시오.</div>
        )}
      </div>
    </div>
  );
}
