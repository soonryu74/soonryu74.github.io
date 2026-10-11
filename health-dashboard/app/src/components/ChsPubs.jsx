import { useMemo, useState } from "react";
import PUB from "../../../data/chs_publications.json";
import Cite from "./Cite";

/* 질병관리청 지역사회건강조사 홈페이지 발간물 전체 목록(2008~) — 한눈에 보기 · 보건소별 통계집 · 월간 소식지 · 보도자료 · 홍보자료.
   자료는 scripts/build_chs_pubs.py 가 만든 data/chs_publications.json. 내려받기 주소는 질병관리청 파일 서버(fileDown.do?SEQ=). */
const dl = (id) => PUB.dl + id;
export default function ChsPubs({ sel }) {
  const tabs = [...PUB.boards.map((b) => [b.key, `${b.name} ${b.n}`]), ["rep", `${PUB.reports.name} ${PUB.reports.n}`]];
  const [tab, setTab] = useState("stats");
  const [q, setQ] = useState("");
  const [year, setYear] = useState(PUB.reports.years[0]);
  const [sido, setSido] = useState(() => {
    const nm = sel?.l === "sido" ? sel.n : sel?.s ? PUB.reports.sidos.find((s) => s.startsWith(sel.s.slice(0, 2))) : null;
    return nm && PUB.reports.sidos.includes(nm) ? nm : PUB.reports.sidos[0];
  });
  const board = PUB.boards.find((b) => b.key === tab);
  const rows = useMemo(() => {
    const qq = q.trim();
    if (board) return board.items.filter((it) => !qq || it.t.includes(qq));
    return PUB.reports.items.filter((it) => it.y === year && it.s === sido && (!qq || it.n.includes(qq)));
  }, [board, q, year, sido]);
  return (
    <div className="card span2 chspubs">
      <h3>질병관리청 지역사회건강조사 발간물 — 2008년부터 전부<Cite k="chs" /></h3>
      <div className="desc">
        질병관리청 지역사회건강조사 홈페이지(<a href={PUB.site} target="_blank" rel="noopener noreferrer">chs.kdca.go.kr</a>)에 올라온 발간물을 종류별로 모았습니다.
        「다운」을 누르면 질병관리청 파일 서버에서 원문(PDF·한글)이 바로 열립니다. 목록 수집일 {PUB.generated}.
      </div>
      <div className="seg" style={{ flexWrap: "wrap", marginBottom: 8 }}>
        {tabs.map(([k, nm]) => <button key={k} className={`seg-btn ${tab === k ? "on" : ""}`} onClick={() => { setTab(k); setQ(""); }}>{nm}</button>)}
      </div>
      <div className="pub-ctrls">
        {tab === "rep" && (
          <>
            <label className="subchip">연도 <select value={year} onChange={(e) => setYear(+e.target.value)}>{PUB.reports.years.map((y) => <option key={y} value={y}>{y}</option>)}</select></label>
            <label className="subchip">시도 <select value={sido} onChange={(e) => setSido(e.target.value)}>{PUB.reports.sidos.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
          </>
        )}
        <input className="pick-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === "rep" ? "보건소 이름 검색" : "제목 검색"} aria-label="발간물 검색" />
        <a className="linkbtn" href={PUB.site + (board ? board.page : PUB.reports.page)} target="_blank" rel="noopener noreferrer">원래 게시판 열기 ↗</a>
      </div>
      <div className="desc">{board ? board.note : PUB.reports.note} · {rows.length}건</div>
      <div className="pub-list">
        {board ? rows.map((it) => (
          <div key={it.no} className="pub-row">
            <span className="pub-no">{it.no}</span>
            <span className="pub-t">{it.t}</span>
            <span className="pub-d">{it.d}</span>
            <span className="pub-dl">{it.ids.length ? it.ids.map((id, i) => <a key={id} href={dl(id)} target="_blank" rel="noopener noreferrer">다운{it.ids.length > 1 ? i + 1 : ""}</a>) : <span className="muted">첨부 없음</span>}</span>
          </div>
        )) : rows.map((it) => (
          <div key={it.n + it.id} className="pub-row">
            <span className="pub-no">{it.y}</span>
            <span className="pub-t">{it.s} {it.n}</span>
            <span className="pub-d">지역사회 건강통계</span>
            <span className="pub-dl">{it.id ? <a href={dl(it.id)} target="_blank" rel="noopener noreferrer">다운</a> : <a href={PUB.site + PUB.reports.page} target="_blank" rel="noopener noreferrer" title="옛 파일 서버 링크가 비어 있어 게시판에서 받습니다">게시판 ↗</a>}</span>
          </div>
        ))}
        {!rows.length && <div className="empty">해당하는 발간물이 없습니다</div>}
      </div>
    </div>
  );
}
