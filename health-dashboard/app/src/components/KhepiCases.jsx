import { useMemo, useState } from "react";
import KC from "../../../data/khepi_cases.json";
import { DOMAINS } from "../data";

/* 한국건강증진개발원 「지역사회 통합건강증진사업 우수사례집」 — 시군구 사례 247건(2016·2018·2019·2023년 사례)과 사례집 10권 링크.
   자료: scripts/build_khepi_cases.py → data/khepi_cases.json. 영역 연결은 사업명·주영역 키워드 추정(원문 확인 필요). */
export default function KhepiCases({ area, sidoName, sggName }) {
  const years = useMemo(() => [...new Set(KC.cases.map((c) => c.y))].sort((a, b) => b - a), []);
  const [y, setY] = useState("all");
  const [q, setQ] = useState("");
  const [mine, setMine] = useState(false);
  const sidoShort = (sidoName || "").slice(0, 2).replace("전라", "전").replace("경상", "경").replace("충청", "충");
  const sidoKey = { 서울: "서울", 부산: "부산", 대구: "대구", 인천: "인천", 광주: "광주", 대전: "대전", 울산: "울산", 세종: "세종", 경기: "경기", 강원: "강원", 충청북: "충북", 충청남: "충남", 전라북: "전북", 전라남: "전남", 경상북: "경북", 경상남: "경남", 제주: "제주" }[(sidoName || "").slice(0, 3)] || sidoShort;
  const rows = useMemo(() => {
    const qq = q.trim();
    return KC.cases.filter((c) => (y === "all" || c.y === +y) && (area === "all" || (c.areas || []).includes(area)) && (!mine || c.sido === sidoKey)
      && (!qq || (c.name + c.sgg + c.sido + (c.main || "") + (c.sub || "")).includes(qq)));
  }, [y, q, mine, area, sidoKey]);
  const book = (b) => KC.books.find((x) => x.idx === b);
  return (
    <div className="card khepi">
      <h3>시군구 우수사례 — 통합건강증진사업 우수사례집 <small className="muted">{KC.org} · 사례 {KC.n}건 · 사례집 {KC.books.length}권</small></h3>
      <div className="desc">
        시도 평가단이 뽑아 한국건강증진개발원이 해마다 펴내는 우수사례집에서 <b>사업명·지자체·쪽</b>을 목차대로 옮겼습니다(2023년 사례는 대상·전략·주영역·부영역까지).
        「원문」을 누르면 KHEPI 자료실의 사례집 페이지가 열리고, 그 페이지의 「내려받기」로 PDF를 받아 적힌 쪽을 보십시오. 영역 연결은 사업명 키워드로 추정한 것이라 원문으로 확인이 필요합니다.
      </div>
      <div className="pub-ctrls">
        <label className="subchip">사례 연도 <select value={y} onChange={(e) => setY(e.target.value)}><option value="all">전체</option>{years.map((yy) => <option key={yy} value={yy}>{yy}년 사례</option>)}</select></label>
        {sidoKey && <button type="button" className={`themebtn ${mine ? "on" : ""}`} onClick={() => setMine(!mine)}>{sidoKey} 사례만</button>}
        <input className="pick-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="사업명·지자체·주영역 검색" aria-label="우수사례 검색" />
        <a className="linkbtn" href={KC.list_url} target="_blank" rel="noopener noreferrer">사례집 목록(KHEPI) ↗</a>
      </div>
      <div className="desc">{area === "all" ? "모든 영역" : `영역 「${area}」`}{mine ? ` · ${sidoKey}` : ""} · {rows.length}건{sggName ? ` · 선택 지역 ${sggName}` : ""}</div>
      <div className="pub-list">
        {rows.map((c, i) => {
          const b = book(c.b); const me = sggName && c.sgg.startsWith(sggName.replace(/시$|군$|구$/, ""));
          return (
            <div key={i} className={`pub-row kc-row ${me ? "me" : ""}`}>
              <span className="pub-no">{c.y}</span>
              <span className="pub-t">
                <b>{c.sido} {c.sgg}</b> · {c.name}
                {(c.main || c.tgt) && <small className="muted"> — {[c.main, c.sub].filter(Boolean).join("·")}{c.tgt ? ` / ${c.tgt}` : ""}{c.strat ? ` / ${c.strat}` : ""}</small>}
              </span>
              <span className="pub-d">{(c.areas || []).join("·") || "—"}</span>
              <span className="pub-dl">{b ? <a href={b.url} target="_blank" rel="noopener noreferrer" title={`${b.title} — ${c.p}쪽`}>원문 p.{c.p} ↗</a> : `p.${c.p}`}</span>
            </div>
          );
        })}
        {!rows.length && <div className="empty">해당하는 사례가 없습니다 — 연도·영역·검색어를 넓혀 보세요</div>}
      </div>
      <details className="kc-books">
        <summary>사례집 {KC.books.length}권(2014~2024년 발간) 전체 목록</summary>
        <ul className="ncdul">{KC.books.map((b) => <li key={b.idx}><a href={b.url} target="_blank" rel="noopener noreferrer">{b.title}</a> <span className="muted">({b.date}{b.file ? ` · ${b.file}` : ""})</span></li>)}</ul>
      </details>
    </div>
  );
}
