import { useEffect, useRef, useState } from "react";
import CONTACT from "../../../data/contact.json";
import { copyText } from "./FeedbackView";

/* 사용 의견(사용성) 1분 설문 — 「사용 의견 보내기 / Give Feedback」.
   서버·외부 서비스 없음: 답을 글로 만들어 복사하거나 메일 앱으로 보낸다. 개인정보·환자정보는 받지 않는다.
   나중에 설문 서비스(폼)를 붙일 때는 buildPayload() 의 객체를 그대로 보내면 된다. */
const Q = {
  ko: {
    btn: "사용 의견 보내기", title: "사용 의견 (1분)", role: "역할",
    roles: ["보건소 담당자", "시도·지원단 연구원", "연구자·교수", "학생", "기타"],
    q: ["우선 검토할 건강 문제를 찾기 쉬웠나요?", "「왜 강조됐나」 설명이 이해에 도움이 됐나요?", "업무(계획·보고·교육)에 도움이 될 것 같나요?"],
    scale: ["전혀 아니다", "아니다", "보통", "그렇다", "매우 그렇다"], improve: "무엇을 고치면 좋을까요?",
    privacy: "이름·연락처·환자 정보 등 개인정보는 적지 마세요. 답은 화면에서 글로 만들어지며 자동으로 전송되지 않습니다.",
    copy: "복사", mail: "✉ 메일로 보내기", close: "닫기", copied: "복사했습니다. 메일·메신저에 붙여 넣어 보내 주세요.", fail: "복사하지 못했습니다. 아래 글을 드래그해 복사해 주세요.",
  },
  en: {
    btn: "Give Feedback", title: "Feedback (1 minute)", role: "Your role",
    roles: ["Local public-health practitioner", "Provincial support team / analyst", "Researcher / academic", "Student", "Other"],
    q: ["Was it easy to identify a priority health issue?", "Did the explanation help you understand why it matters?", "Would this help your work (planning, reporting, training)?"],
    scale: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"], improve: "What should be improved?",
    privacy: "Please do not include names, contact details or patient information. Your answers are turned into text on this page and are not sent automatically.",
    copy: "Copy", mail: "✉ Send by email", close: "Close", copied: "Copied. Paste it into an email or message.", fail: "Could not copy. Please select the text below and copy it.",
  },
};

export function buildPayload({ lang, role, ratings, improve, context }) {
  return { form: "usability-v1", lang, role, q1_easy_to_find: ratings[0] ?? null, q2_explanation_helpful: ratings[1] ?? null, q3_useful_for_work: ratings[2] ?? null, improve: improve.trim(), context, page: typeof location !== "undefined" ? location.href : "" };
}

export default function UsabilityFeedback({ lang = "ko", context = "" }) {
  const L = Q[lang] || Q.ko;
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("");
  const [ratings, setRatings] = useState([null, null, null]);
  const [improve, setImprove] = useState("");
  const [msg, setMsg] = useState("");
  const boxRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    setTimeout(() => boxRef.current?.querySelector("select")?.focus(), 30);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const p = buildPayload({ lang, role, ratings, improve, context });
  const text = [
    `[${L.title}] health-profile.kr`,
    `${L.role}: ${role || "-"}`,
    ...L.q.map((q, i) => `${i + 1}. ${q} ${ratings[i] ? `${ratings[i]}/5 (${L.scale[ratings[i] - 1]})` : "-"}`),
    `4. ${L.improve} ${improve.trim() || "-"}`,
    `(${lang === "en" ? "Area viewed" : "보던 지역"}: ${context})`,
    "", JSON.stringify(p),
  ].join("\n");
  const mailto = `mailto:${CONTACT.email}?subject=${encodeURIComponent(`[${lang === "en" ? "Feedback" : "사용 의견"}] Health Equity Radar`)}&body=${encodeURIComponent(text)}`;
  return (
    <>
      <button type="button" className="themebtn uf-btn" onClick={() => { setOpen(true); setMsg(""); }} aria-haspopup="dialog">{L.btn}</button>
      {open && (
        <div className="help-modal uf-modal" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="card help-box uf-box" role="dialog" aria-modal="true" aria-labelledby="uf-title" lang={lang} ref={boxRef}>
            <div className="help-head"><h3 id="uf-title">{L.title}</h3><button type="button" className="themebtn" onClick={() => setOpen(false)} aria-label={L.close}>✕</button></div>
            <p className="desc">{L.privacy}</p>
            <label className="uf-row">{L.role}
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">—</option>
                {L.roles.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            {L.q.map((q, i) => (
              <fieldset key={i} className="uf-q">
                <legend>{i + 1}. {q}</legend>
                <div className="uf-scale">
                  {L.scale.map((s, k) => (
                    <label key={k} className={`uf-opt ${ratings[i] === k + 1 ? "on" : ""}`}>
                      <input type="radio" name={`uf-q${i}`} value={k + 1} checked={ratings[i] === k + 1} onChange={() => setRatings((o) => o.map((v, j) => (j === i ? k + 1 : v)))} />
                      <span><b>{k + 1}</b> {s}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <label className="uf-row">4. {L.improve}
              <textarea rows={3} maxLength={800} value={improve} onChange={(e) => setImprove(e.target.value)} />
            </label>
            <div className="rev-btns">
              <button type="button" className="themebtn" onClick={async () => setMsg((await copyText(text)) ? L.copied : L.fail)}>{L.copy}</button>
              <a className="themebtn" href={mailto}>{L.mail}</a>
            </div>
            {msg && <div className="desc" role="status">{msg}</div>}
            <pre className="rev-preview uf-preview" aria-label="preview">{text}</pre>
          </div>
        </div>
      )}
    </>
  );
}
