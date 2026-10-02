import { useRef, useState } from "react";
import CONTACT from "../../../data/contact.json";
import POSTER from "../assets/intro_poster.jpg";

/* 「처음이세요?」 — 소개 영상 플레이어 + 사용설명서·활용법 내려받기.
   홈 카드 ⑤와 머리글 「? 도움말」 창이 같은 내용을 쓴다. 파일 주소는 contact.json(docs_base + 파일명) 한 곳에서만. */
const doc = (f) => CONTACT.docs_base + encodeURIComponent(f);

export default function HelpContent({ onGo, compact = false }) {
  const videos = CONTACT.videos || [];
  const [vi, setVi] = useState(0);
  const ref = useRef(null);
  const pick = (i) => {
    if (i === vi) return;
    setVi(i);
    // src 가 바뀌면 포스터 상태로 되돌리고 새 파일을 읽게 한다(React 는 <source> 교체만으로는 다시 읽지 않음)
    requestAnimationFrame(() => { const v = ref.current; if (v) { v.pause(); v.load(); } });
  };
  const cur = videos[vi];
  return (
    <div className={`help-wrap ${compact ? "compact" : ""}`}>
      <div className="help-video">
        {cur && (
          <video ref={ref} controls playsInline preload="none" poster={POSTER} aria-label={cur.title}>
            <source src={doc(cur.file)} type="video/mp4" />
            브라우저가 동영상을 재생하지 못합니다. <a href={doc(cur.file)} target="_blank" rel="noreferrer">파일을 내려받아 보세요</a>.
          </video>
        )}
        {videos.length > 1 && (
          <div className="seg help-switch" role="group" aria-label="영상 선택">
            {videos.map((v, i) => (
              <button key={v.file} type="button" className={`seg-btn ${i === vi ? "on" : ""}`} onClick={() => pick(i)}>
                {i === 0 ? "하이라이트" : "전체 시연"} <small>{v.len.split(" · ")[0]}</small>
              </button>
            ))}
          </div>
        )}
        <div className="desc help-cap">{cur?.title} · {cur?.len} · 모든 메뉴와 숨은 옵션(순위 산출 방식·모의 패널·직접 가중치·전체 보기)을 실제로 눌러 보여 줍니다</div>
      </div>
      <div className="help-side">
        <ol className="help-steps">
          <li><b>3분 하이라이트</b>를 먼저 보면 메뉴 12개가 무엇을 하는지 잡힙니다.</li>
          <li><b>지표 분석 → 지역 프로파일</b> 순서로 우리 지역을 골라 보세요. 주소창 링크가 곧 화면 상태라 그대로 공유됩니다.</li>
          <li>계획서 「현황 분석」은 <b>사용설명서 시나리오 1</b>, 다른 체계와의 비교·발전방안은 <b>활용법 발표자료</b>에 있습니다.</li>
        </ol>
        <div className="help-links">
          <a className="help-link" href={doc(CONTACT.manual.pdf)} target="_blank" rel="noreferrer"><b>사용설명서</b><small>PDF · {CONTACT.manual.pages}쪽</small></a>
          <a className="help-link" href={doc(CONTACT.manual.pptx)} target="_blank" rel="noreferrer"><b>사용설명서</b><small>파워포인트</small></a>
          <a className="help-link" href={doc(CONTACT.usage.pdf)} target="_blank" rel="noreferrer"><b>활용법 발표자료</b><small>PDF · {CONTACT.usage.pages}쪽</small></a>
          <a className="help-link" href={doc(CONTACT.usage.pptx)} target="_blank" rel="noreferrer"><b>활용법 발표자료</b><small>파워포인트</small></a>
          {videos.map((v, i) => (
            <a key={v.file} className="help-link" href={doc(v.file)} target="_blank" rel="noreferrer"><b>{i === 0 ? "하이라이트 영상" : "전체 시연 영상"}</b><small>MP4 · {v.len}</small></a>
          ))}
        </div>
        <div className="desc help-more">
          순위·건강수명·박탈지수 산출 방식과 검토 보고서는{" "}
          <button type="button" className="linkbtn" onClick={() => onGo && onGo({ view: "feedback", card: "방법론 문서" })}>방법론 문서 {(CONTACT.method_docs || []).length}건 →</button>
          {" "}· 오류·의견은 <button type="button" className="linkbtn" onClick={() => onGo && onGo({ view: "feedback" })}>의견·문의 →</button>
        </div>
      </div>
    </div>
  );
}
