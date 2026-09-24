import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { REF_BY_KEY, indRef } from "../data";

/* 논문식 참고문헌 번호 — 숫자·카드 제목 옆의 작은 [n].
   누르면 출처 카드(기관·통계명·표·갱신일·원문 링크)가 뜨고, 「목록 ↓」로 화면 하단 참고문헌으로 이동한다.
   · k   : 참고문헌 key(문자열 또는 배열) — data/refs.json
   · ind : 지표를 넘기면 그 지표의 출처와 원 통계표(표 이름·KOSIS 링크)를 함께 보여 준다
   앱은 주소의 # 뒤를 화면 상태로 쓰므로 #ref-n 링크 대신 스크롤로 이동한다. */
export function jumpToRef(n) {
  const el = document.getElementById(`ref-${n}`);
  if (!el) return;
  el.closest("details")?.setAttribute("open", "");
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.remove("ref-hit"); void el.offsetWidth; el.classList.add("ref-hit");
}

export default function Cite({ k, ind }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const box = useRef(null), btn = useRef(null), pop = useRef(null);
  const t = indRef(ind);
  const keys = [...new Set([...(t?.refs || []), ...[].concat(k || [])])].filter((x) => REF_BY_KEY.has(x));
  const refs = keys.map((x) => REF_BY_KEY.get(x)).sort((a, b) => a.n - b.n);

  useEffect(() => {
    if (!open) return;
    const out = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    const close = () => setOpen(false);
    document.addEventListener("pointerdown", out);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", out);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  // 화면 밖으로 넘치지 않게 버튼 위치 기준으로 자리를 잡는다(좁은 화면에서도 가로 스크롤이 생기지 않도록)
  useLayoutEffect(() => {
    if (!open || !btn.current || !pop.current) return;
    const b = btn.current.getBoundingClientRect(), p = pop.current.getBoundingClientRect();
    const W = window.innerWidth, H = window.innerHeight, m = 8;
    const w = Math.min(380, W - m * 2);
    const left = Math.max(m, Math.min(b.left, W - w - m));
    // 아래 공간이 모자라면 위로, 위아래 모두 모자라면 더 넓은 쪽에 두고 카드 안에서 스크롤
    const spaceBelow = H - m - (b.bottom + 6), spaceAbove = b.top - 6 - m;
    const below = p.height <= spaceBelow || spaceBelow >= spaceAbove;
    const top = below ? b.bottom + 6 : Math.max(m, b.top - 6 - Math.min(p.height, spaceAbove));
    setPos({ left, width: w, top, maxHeight: Math.max(120, below ? spaceBelow : spaceAbove) });
  }, [open]);

  if (!refs.length) return null;
  const nums = refs.map((r) => r.n).join(",");
  return (
    <span className="cite" ref={box}>
      <button type="button" ref={btn} className="cite-btn" aria-expanded={open} aria-haspopup="dialog"
        title={`출처 ${nums}번 — 눌러서 보기`} aria-label={`출처 ${nums}번 보기`}
        onClick={(e) => { e.stopPropagation(); setPos(null); setOpen((o) => !o); }}>[{nums}]</button>
      {open && (
        <span className="cite-pop" role="dialog" aria-label="출처" ref={pop}
          style={pos ? { left: pos.left, top: pos.top, width: pos.width, maxHeight: pos.maxHeight } : { visibility: "hidden", left: 0, top: 0, width: Math.min(380, window.innerWidth - 16) }}
          onClick={(e) => e.stopPropagation()}>
          {t && (
            <span className="cite-tbl">
              <b>이 지표의 원 통계표</b>
              <span>{t.table}</span>
              {t.url && <a href={t.url} target="_blank" rel="noopener noreferrer">원표 열기 ↗</a>}
            </span>
          )}
          {refs.map((r) => (
            <span className="cite-item" key={r.key}>
              <b className="cite-n">[{r.n}]</b>
              <span>
                {r.org}, 「{r.title}」. <span className="muted">{r.detail}{r.updated ? ` · 갱신 ${r.updated}` : ""}</span>
                <span className="cite-acts">
                  {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer">원문 ↗</a>}
                  <button type="button" className="linkbtn" onClick={() => { setOpen(false); jumpToRef(r.n); }}>참고문헌 목록 ↓</button>
                </span>
              </span>
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
