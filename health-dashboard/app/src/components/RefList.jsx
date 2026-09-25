import { REFS } from "../data";

// 주소는 한글이 보이게 풀어 쓰고(링크는 원래 주소 그대로), 너무 길면 줄인다
const shortUrl = (u) => {
  let t = u.replace(/^https?:\/\//, "");
  try { t = decodeURI(t); } catch { /* 그대로 */ }
  return t.length > 80 ? t.slice(0, 78) + "…" : t;
};

/* 화면 맨 아래 참고문헌 목록 — 번호는 모든 화면과 사용설명서에서 같다. */
export default function RefList({ collapsed = false }) {
  const head = <h3>참고문헌 <small className="muted">{collapsed ? `${REFS.length}건 · 눌러서 펼치기 · ` : ""}본문의 [번호]를 누르면 출처가 뜨고, 번호는 모든 화면·사용설명서에서 같습니다</small></h3>;
  const list = (
      <ol className="refs-ol">
        {REFS.map((r) => (
          <li key={r.key} id={`ref-${r.n}`}>
            <b className="cite-n">[{r.n}]</b>
            <span>
              {r.org}, 「{r.title}」. <span className="muted">{r.detail}{r.updated ? ` · 갱신 ${r.updated}` : ""}</span>
              {r.url && <> <a href={r.url} target="_blank" rel="noopener noreferrer" className="ref-url">{shortUrl(r.url)}</a></>}
            </span>
          </li>
        ))}
      </ol>
  );
  // 메인 화면에서는 접어 둔다 — 번호를 누르면 jumpToRef 가 펼친다
  if (collapsed) return <details className="card reflist"><summary>{head}</summary>{list}</details>;
  return <div className="card reflist">{head}{list}</div>;
}
