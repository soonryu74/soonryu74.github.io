import { useMemo, useState } from "react";
import REV from "../../../data/reviews.json";
import CONTACT from "../../../data/contact.json";

/* 외부 검토·자문 — 「인증 마크」가 아니라 누가·무엇을(범위)·어느 빌드를·어떻게 확인했는지 공개하는 기록.
   docs/외부검토_서명_기획안_v1.md · 소유자 결정(2026-10-04): 자료원 탭 맨 위 · 무보수 자원 검토 · 동의 후 게시.
   서버 없음: 검토자는 「의견서 서식 만들기」로 서식을 완성해 복사·이메일·인쇄(서명)한다. */
export const BUILD = typeof __BUILD__ !== "undefined" ? __BUILD__ : { commit: "dev", date: "" };
const HOW = {
  data: "지표 무작위 10칸을 각 수치 옆 [n]·ⓘ 의 KOSIS 원표와 대조",
  direction: "높을수록 좋음/나쁨 배정과 근거 문구(지표 분석 추이 카드) 확인",
  rank: "프로파일 「순위 산출 방식」과 docs/랭킹_방법론_v1.md 확인",
  hle: "프로파일 건강수명 「산출 예시」 검산행과 docs/건강수명_산출법_v1.md 확인",
  dep: "지표 분석 건강형평성 「산출 예시」와 docs/지역박탈지수_산출_v2.md 확인",
  priority: "프로파일 「우리 지역 우선 검토 항목」의 「계산 방법」과 docs/HealthEquityRadar_설계_v1.md 확인",
  wording: "화면 문구에 인과 표현·과장이 없는지 확인",
  a11y: "키보드·색 대비·휴대폰 화면에서 실제 사용",
};
const CHECK = { ok: "확인함", comment: "확인했으나 의견 있음", no: "확인하지 않음" };
const doc = (f) => `${CONTACT.docs_base || "docs/"}${encodeURIComponent(f)}`;

async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch {
    const ta = document.createElement("textarea"); ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select(); const ok = document.execCommand("copy"); ta.remove(); return ok;
  }
}

export default function ReviewsCard() {
  const published = REV.reviews.filter((r) => r.status !== "withdrawn");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", title: "", org: "", scope: {}, opinion: "", conflict: "없음 · 무보수 자원 검토", consent: false });
  const [msg, setMsg] = useState("");
  const set = (k, v) => setF((o) => ({ ...o, [k]: v }));
  const setScope = (k, v) => setF((o) => ({ ...o, scope: { ...o.scope, [k]: v } }));
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const text = useMemo(() => {
    const lines = Object.entries(REV.scopes).map(([k, n]) => `  - ${n}: ${CHECK[f.scope[k] || "no"]}`);
    return [
      "[지역 건강프로파일 대시보드 외부 검토 의견서]",
      `검토 대상: ${CONTACT.site} · 빌드 ${BUILD.commit}${BUILD.date ? ` (${BUILD.date})` : ""}`,
      `작성일: ${today}`,
      `검토자: ${f.name || "(이름)"} · ${f.title || "(직위)"} · ${f.org || "(소속)"}`,
      "검토 범위와 결과:", ...lines,
      "의견:", f.opinion || "(검토 의견 — 발견한 문제가 있으면 위치와 함께 적어 주세요)",
      `이해관계: ${f.conflict || "없음"}`,
      `공개 동의: ${f.consent ? "위 이름·직위·소속·의견을 대시보드 「외부 검토·자문」에 공개하는 데 동의합니다(언제든 철회 가능)." : "동의하지 않음(비공개 의견으로만 전달)"}`,
      "", "서명: ____________________",
      "※ 「인증」이 아니라 검토 의견입니다. 확인하지 않은 범위는 대시보드에 표시하지 않습니다.",
    ].join("\n");
  }, [f, today]);
  const ready = f.name.trim() && f.org.trim() && Object.values(f.scope).some((v) => v && v !== "no");
  const mailto = `mailto:${CONTACT.email}?subject=${encodeURIComponent(`[외부 검토 의견서] ${f.name} · ${f.org}`)}&body=${encodeURIComponent(text)}`;
  const print = () => {
    const w = window.open("", "_blank");
    if (!w) { setMsg("팝업이 막혀 인쇄 창을 열 수 없습니다. 「복사」로 붙여 넣어 인쇄해 주세요."); return; }
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    w.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>외부 검토 의견서</title><style>body{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;margin:24mm 20mm;font-size:12pt;line-height:1.7;color:#111}pre{white-space:pre-wrap;font-family:inherit}</style></head><body><pre>${esc(text)}</pre></body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  };

  return (
    <div className="card span2 rev-card">
      <h3>외부 검토·자문 <small className="muted">인증이 아니라 검토 기록입니다</small></h3>
      <div className="desc">
        이 대시보드를 외부 전문가·기관이 검토한 기록입니다. 누가, 무엇을(검토 범위), 어느 버전을(빌드 번호) 확인했는지와 발견된 문제·조치를 함께 공개합니다.
      </div>
      <div className="rev-status">
        <span className="rev-count"><b>게시된 검토 {published.length}건</b></span>
        {REV.pending?.active && <span className="rev-pending">● 검토 요청 진행 중</span>}
        <span className="muted">현재 빌드 {BUILD.commit}{BUILD.date ? ` · ${BUILD.date}` : ""}</span>
      </div>
      {REV.pending?.active && !published.length && <div className="desc">{REV.pending.text}</div>}

      {published.map((r) => (
        <section key={r.id} className="rev-item">
          <div className="rev-head"><b>{r.name}</b> {r.title} · {r.org} <span className="muted">· {r.date} · {r.status === "superseded" ? "이전 검토" : "현재 유효"}</span></div>
          <div className="rev-scopes">{(r.scope || []).map((k) => <span key={k} className="chip on">{REV.scopes[k] || k}</span>)}
            <span className="muted"> 검토 빌드 {r.build}{r.build && r.build !== BUILD.commit ? " · 검토 이후 변경 있음" : ""}</span></div>
          {r.quote && <blockquote className="rev-quote">“{r.quote}”</blockquote>}
          {!!r.findings?.length && <ul className="rev-find">{r.findings.map((x, i) => <li key={i}>{x.text}{x.fix ? <> → 조치: {x.fix}</> : null}</li>)}</ul>}
          <div className="muted rev-meta">증빙: {{ esign: "전자서명 이력 증명서 보관", scan: "서명 의견서 보관", official: "기관 공문", email: "이메일 동의" }[r.proof] || "–"}{r.pdf && <> · <a href={doc(r.pdf)} target="_blank" rel="noopener noreferrer">의견서 PDF ↗</a></>} · 이해관계: {r.conflict || "없음"}</div>
        </section>
      ))}

      <details className="rev-more">
        <summary>원칙과 검토 범위</summary>
        <ul className="rev-policy">{REV.policy.lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
        <table className="yeartbl rev-scope-tbl"><thead><tr><th>범위</th><th>확인 방법</th></tr></thead>
          <tbody>{Object.entries(REV.scopes).map(([k, n]) => <tr key={k}><td>{n}</td><td>{HOW[k]}</td></tr>)}</tbody></table>
      </details>

      <div className="rev-btns">
        <a className="themebtn" href={doc("외부검토_가이드_v1.md")} target="_blank" rel="noopener noreferrer">검토 참여 가이드 ↗</a>
        <button type="button" className={`themebtn ${open ? "on" : ""}`} onClick={() => setOpen(!open)} aria-expanded={open}>의견서 서식 만들기</button>
      </div>

      {open && (
        <div className="rev-form">
          <div className="rev-grid">
            <label>이름 <input value={f.name} onChange={(e) => set("name", e.target.value)} /></label>
            <label>직위 <input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="예: 교수" /></label>
            <label>소속 <input value={f.org} onChange={(e) => set("org", e.target.value)} placeholder="예: ○○대학교 보건대학원" /></label>
          </div>
          <div className="rev-scope-pick">
            {Object.entries(REV.scopes).map(([k, n]) => (
              <label key={k} className="rev-scope-row"><span>{n}</span>
                <select value={f.scope[k] || "no"} onChange={(e) => setScope(k, e.target.value)}>
                  {Object.entries(CHECK).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select></label>
            ))}
          </div>
          <label className="rev-wide">의견 <textarea rows={5} value={f.opinion} onChange={(e) => set("opinion", e.target.value)} placeholder="확인한 내용, 발견한 문제(화면·지표 위치), 개선 제안" /></label>
          <label className="rev-wide">이해관계 <input value={f.conflict} onChange={(e) => set("conflict", e.target.value)} /></label>
          <label className="rev-consent"><input type="checkbox" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} /> 이름·직위·소속·의견을 「외부 검토·자문」에 공개하는 데 동의합니다(언제든 철회 가능)</label>
          <pre className="rev-preview" aria-label="의견서 미리보기">{text}</pre>
          <div className="rev-btns">
            <button type="button" className="themebtn" disabled={!ready} onClick={async () => setMsg((await copyText(text)) ? "복사했습니다. 메일·메신저에 붙여 넣어 보내 주세요." : "복사하지 못했습니다. 미리보기를 드래그해 복사해 주세요.")}>복사</button>
            <a className={`themebtn ${ready ? "" : "is-off"}`} href={ready ? mailto : undefined} onClick={(e) => { if (!ready) e.preventDefault(); }}>✉ 이메일로 보내기</a>
            <button type="button" className="themebtn" disabled={!ready} onClick={print}>🖨 인쇄해서 서명</button>
            {!ready && <span className="muted">이름·소속과 확인한 범위 1개 이상을 넣으면 보낼 수 있습니다.</span>}
          </div>
          {msg && <div className="desc">{msg}</div>}
          <div className="desc muted">전자서명 서비스를 쓰시면 인쇄 창에서 PDF로 저장해 서명해 주셔도 됩니다. 서명 이미지는 화면에 싣지 않습니다.</div>
        </div>
      )}
    </div>
  );
}
