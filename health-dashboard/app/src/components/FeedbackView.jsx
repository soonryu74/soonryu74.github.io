import { useEffect, useMemo, useState } from "react";
import CONTACT from "../../../data/contact.json";

/* 「의견·문의」 — 서버 없이도 깨지지 않게 만든 문의 창구.
   · 보내는 길 3가지: ① 이메일 앱으로 보내기(mailto) ② 내용 복사(카카오톡·메신저에 붙여넣기) ③ GitHub 이슈(개발자용)
   · 외부 요청을 하지 않으므로 네트워크·서버 장애로 실패할 일이 없다. 입력 중인 글은 localStorage 에 자동 저장(가능할 때만).
   · 현재 보고 있던 화면 링크·브라우저 정보를 자동으로 붙여 재현이 쉽게 한다. */
const CATS = ["오류 신고(숫자·화면이 이상해요)", "수정 의견(이렇게 바꿔 주세요)", "자료 문의(출처·산식·갱신)", "기타"];
const KEY = "hp_feedback_draft_v1";
const MAX = 2000;

function loadDraft() {
  try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
function saveDraft(d) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* 사생활 모드 등 — 저장 안 되어도 동작 */ }
}
function clearDraft() { try { localStorage.removeItem(KEY); } catch { /* noop */ } }

async function copyText(t) {
  try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(t); return true; } } catch { /* fallback */ }
  try {
    const ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.left = "-9999px";
    document.body.appendChild(ta); ta.select(); const ok = document.execCommand("copy"); ta.remove(); return ok;
  } catch { return false; }
}

export default function FeedbackView({ currentUrl }) {
  const d0 = useMemo(() => loadDraft() || {}, []);
  const [cat, setCat] = useState(d0.cat || CATS[0]);
  const [msg, setMsg] = useState(d0.msg || "");
  const [email, setEmail] = useState(d0.email || "");
  const [name, setName] = useState(d0.name || "");
  const [includeUrl, setIncludeUrl] = useState(d0.includeUrl !== false);
  const [status, setStatus] = useState(null);      // {kind:'ok'|'err'|'info', text}
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => { saveDraft({ cat, msg, email, name, includeUrl }); }, [cat, msg, email, name, includeUrl]);

  const env = useMemo(() => {
    try {
      const ua = navigator.userAgent || "";
      const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "기타";
      const os = /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : "기타";
      return `${br} · ${os} · 화면 ${window.innerWidth}×${window.innerHeight}`;
    } catch { return ""; }
  }, []);
  const url = includeUrl ? (currentUrl || (typeof window !== "undefined" ? window.location.href : "")) : "";
  const emailOk = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const ready = msg.trim().length >= 5 && emailOk;

  const subject = `[건강프로파일 대시보드] ${cat.split("(")[0]}`;
  const body = [
    `구분: ${cat}`, name ? `보낸 사람: ${name}` : null, email ? `회신 이메일: ${email}` : null, "",
    "내용:", msg.trim(), "",
    url ? `보고 있던 화면: ${url}` : null, env ? `환경: ${env}` : null,
    `보낸 시각: ${new Date().toLocaleString("ko-KR")}`,
  ].filter((x) => x != null).join("\n");

  const mailto = `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const issueUrl = CONTACT.github_repo
    ? `https://github.com/${CONTACT.github_repo}/issues/new?title=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : null;

  const onMail = (e) => {
    if (!ready) { e.preventDefault(); setStatus({ kind: "err", text: "내용을 5자 이상 적어 주세요." + (!emailOk ? " 회신 이메일 형식도 확인해 주세요." : "") }); return; }
    // mailto 가 너무 길면 일부 메일 앱이 본문을 자릅니다 → 안내
    if (mailto.length > 1800) setStatus({ kind: "info", text: "내용이 길어 메일 앱에서 본문이 잘릴 수 있습니다. 잘렸다면 「내용 복사」로 붙여 넣어 주세요." });
    else setStatus({ kind: "ok", text: "메일 앱이 열립니다. 메일 앱이 열리지 않으면 「내용 복사」를 눌러 직접 보내 주세요." });
  };
  const onCopy = async () => {
    if (!ready) { setStatus({ kind: "err", text: "내용을 5자 이상 적어 주세요." }); return; }
    const ok = await copyText(`받는 곳: ${CONTACT.email}\n제목: ${subject}\n\n${body}`);
    setStatus(ok ? { kind: "ok", text: `복사했습니다. 메일·카카오톡 등에 붙여 넣어 ${CONTACT.email} 로 보내 주세요.` }
                 : { kind: "err", text: "복사가 막혀 있습니다. 아래 미리보기 글을 직접 드래그해서 복사해 주세요." });
  };
  const onReset = () => { setMsg(""); setEmail(""); setName(""); setCat(CATS[0]); clearDraft(); setStatus({ kind: "info", text: "지웠습니다." }); };

  return (
    <div className="feedback">
      <div className="card">
        <h3>의견·문의 <small className="muted">서버 없이 이메일로 받습니다 · 입력 중인 글은 이 브라우저에 자동 저장</small></h3>
        <div className="desc">숫자가 이상하거나, 화면이 깨지거나, 이렇게 바꿔 달라는 의견, 자료 출처가 궁금한 점을 보내 주세요. 보고 있던 화면 링크가 자동으로 붙어 재현이 쉽습니다.</div>

        <div className="fb-form">
          <label className="fb-row"><span>구분</span>
            <select value={cat} onChange={(e) => setCat(e.target.value)}>{CATS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </label>
          <label className="fb-row fb-msg"><span>내용 <b className="req">필수</b></span>
            <textarea value={msg} maxLength={MAX} rows={7} placeholder={"예) 지표 분석 → 비만율 → 2023년 강남구 값이 지도와 순위에서 다르게 보입니다.\n예) 순위 전체 보기 영상에 지역명이 잘립니다."}
              onChange={(e) => setMsg(e.target.value)} />
            <small className={`fb-cnt ${msg.length > MAX - 100 ? "warn" : ""}`}>{msg.length.toLocaleString()} / {MAX.toLocaleString()}자</small>
          </label>
          <div className="fb-two">
            <label className="fb-row"><span>이름·소속 <i className="muted">(선택)</i></span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="예) ○○보건소 건강증진팀" maxLength={60} /></label>
            <label className="fb-row"><span>회신 이메일 <i className="muted">(선택)</i></span><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="답장을 받으실 주소" inputMode="email" maxLength={100} className={emailOk ? "" : "bad"} /></label>
          </div>
          <label className="fb-chk"><input type="checkbox" checked={includeUrl} onChange={(e) => setIncludeUrl(e.target.checked)} /> 보고 있던 화면 링크와 브라우저 정보를 함께 보냅니다 <span className="muted">({env || "정보 없음"})</span></label>

          <div className="fb-actions">
            <a className={`fb-btn primary ${ready ? "" : "dim"}`} href={mailto} onClick={onMail}>✉ 이메일 앱으로 보내기</a>
            <button type="button" className="fb-btn" onClick={onCopy}>📋 내용 복사</button>
            {issueUrl && <a className="fb-btn" href={ready ? issueUrl : "#"} target={ready ? "_blank" : undefined} rel="noreferrer" onClick={(e) => { if (!ready) { e.preventDefault(); setStatus({ kind: "err", text: "내용을 5자 이상 적어 주세요." }); } }} title="GitHub 계정이 있는 분(개발자)용">🐙 GitHub 이슈로 올리기</a>}
            <button type="button" className="fb-btn ghost" onClick={onReset}>지우기</button>
          </div>
          {status && <div className={`fb-status ${status.kind}`} role="status">{status.text}</div>}

          <details className="fb-preview">
            <summary>보낼 내용 미리보기 (받는 곳 {CONTACT.email})</summary>
            <pre>{body}</pre>
          </details>
        </div>
        <div className="desc" style={{ marginTop: 10 }}>{CONTACT.response_note}</div>
      </div>

      <div className="card">
        <h3>자주 묻는 질문</h3>
        <div className="fb-faq">
          {(CONTACT.faq || []).map((f, i) => (
            <details key={i} open={openFaq === i} onToggle={(e) => setOpenFaq(e.currentTarget.open ? i : (openFaq === i ? null : openFaq))}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>이 대시보드에 대하여</h3>
        <div className="desc">
          지역 건강프로파일 대시보드는 질병관리청 지역사회건강조사(KOSIS)·사망원인통계·국민건강보험공단 검진통계 등 공표 자료를 모아 시군구·보건소 단위 건강수준을 보여 주는 <b>모니터링·목표치 설정 지원 도구</b>입니다. 보건소 사업 실적 자료는 담고 있지 않아 사업 성과 평가 도구가 아닙니다.
          자료별 출처·산식·갱신 주기·한계는 「자료원」 탭에, 지표 방향·계층·근거는 각 지표 화면에 적혀 있습니다. 주소: <a href={CONTACT.site} target="_blank" rel="noreferrer">{CONTACT.site}</a>
        </div>
        <div className="desc" style={{ marginTop: 6 }}>
          <b>사용설명서(66쪽)</b> — 자료 소개·기본 조작·메뉴별 설명과 활용 팁·활용 시나리오·해석 주의:{" "}
          <a href={CONTACT.manual_pdf} target="_blank" rel="noreferrer">PDF 보기</a> · <a href={CONTACT.manual_pptx} target="_blank" rel="noreferrer">파워포인트 내려받기</a>
        </div>
      </div>
    </div>
  );
}
