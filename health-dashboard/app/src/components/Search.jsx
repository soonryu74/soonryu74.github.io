import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { INDICATORS, SIDOS, SGG_ALL, HC_POOL, NCD } from "../data";
import COV from "../../../data/coverage.json";
import CONTACT from "../../../data/contact.json";

/* 전역 검색 — 메뉴·화면 안 카드·지표 171개·지역(시도·시군구·보건소 조사 단위)·자료원·FAQ·지식베이스를 한 상자에서 찾는다.
   소유자 지시(2026-10-01) "메뉴에 검색하는 것도 넣어줘. 건강수명은 어디에 있는 거야?" — 어느 메뉴에 무엇이 있는지 몰라도 이름만 치면 그 카드로 간다.
   단축키: / 또는 Ctrl(⌘)+K 로 열기, ↑↓ 이동, Enter 선택, Esc 닫기. */

// 메뉴 12개 — 화면에 보이는 이름 + 그 화면에서 할 수 있는 일(검색어)
const VIEWS = [
  { view: "home", name: "홈", kw: "메인 첫 화면 카드 4장 시도 지도 보건소 순위 취약인구 계획 수립" },
  { view: "analysis", name: "지표 분석", kw: "현황 추이 지도 단계구분도 순위 연도별 추이표 격차 상자그림 건강형평성 박탈 근거 지침 신뢰구간 불안정값 묶음 영상 인쇄" },
  { view: "profile", name: "지역 프로파일", kw: "영역 점수 강점 개선 과제 등급 배지 순위 산출 가중치 리그 건강수명 고위험군 황금다이아몬드 동류군 우선순위" },
  { view: "kpi", name: "성과지표", kw: "통합건강증진사업 핵심성과지표 KPI 목표치 설정 달성률 득점 계산기" },
  { view: "compare", name: "지역 비교", kw: "여러 지역 최대 6곳 전국 중앙값 추이 비교표 전 지표 비교" },
  { view: "ncd", name: "예방·관리", kw: "만성질환 지식베이스 WHO 국가 시도 계획 사업 목표 전략 중재 HP2030 지역보건의료계획" },
  { view: "corr", name: "연관지표", kw: "상관 산점도 피어슨 스피어만 켄달 두 지표 관계" },
  { view: "hot", name: "핫스팟", kw: "공간 군집 Getis-Ord 콜드스팟 Mann-Kendall 추세 이웃" },
  { view: "chronicle", name: "연대기 전시관", kw: "연도별 10대 뉴스 사건 법 제도 백서 지침 변화의 벽 박물관" },
  { view: "units", name: "조사 단위", kw: "보건소 258 시군구 229 보건지소 보건진료소 지역보건의료기관 매핑" },
  { view: "sources", name: "자료원", kw: "출처 기관 갱신 주기 다음 공표 보유 현황 매트릭스 결측 산식 한계" },
  { view: "feedback", name: "의견·문의", kw: "오류 신고 질문 이메일 FAQ 사용설명서 활용법 영상 방법론 문서 PDF PPT MP4 제작" },
];

// 화면 안 카드 — card 는 그 카드 제목(h3)의 일부. 누르면 그 메뉴로 가서 카드까지 스크롤한다.
const CARDS = [
  ["analysis", "단계구분도", "지도(단계구분도)", "지도 map 전국 시도 시군구 분위 색 지역명 라벨 애니메이션"],
  ["analysis", "추이", "추이 그래프", "연도별 선 그래프 전국 중앙값 시도"],
  ["analysis", "순위", "순위", "전국 시군구 시도 보건소 양호한 순 나쁜 순 신뢰구간 불안정값 제외 묶음 전체 보기 영상 인쇄 CSV"],
  ["analysis", "연도별 추이표", "연도별 추이표", "수치 순위 증감량 증감률"],
  ["analysis", "지역 간 격차", "지역 간 격차(상자그림)", "격차 상자그림 최댓값 최솟값 분포"],
  ["analysis", "건강형평성", "건강형평성(지역박탈 5분위)", "박탈지수 형평성 분위 산출 예시"],
  ["analysis", "현행 근거 지침", "현행 근거 지침(NICE·CPSTF)", "근거 가이드라인 영국 NICE 미국 CPSTF 권고 중재 원문"],
  ["profile", "기대수명 · 건강수명", "기대수명 · 건강수명(근사)", "건강수명 기대수명 불건강 기간 생명표 Sullivan 산출 예시 HLE"],
  ["profile", "감염병 대응 고위험군", "감염병 대응 고위험군", "취약인구 고위험군 65세 이상 독거노인 장애인 기초생활 영유아 코로나19 치명률"],
  ["profile", "황금다이아몬드", "황금다이아몬드(보건사업 우선순위)", "우선순위 시간축 공간축 3×3"],
  ["profile", "동류군 비교", "동류군 비교", "비슷한 여건 고령화율 재정자립도 인구밀도 박탈"],
  ["profile", "무엇부터 손댈 것인가", "무엇부터 손댈 것인가(우선순위 × 근거)", "우선순위 부담 격차 수단 근거 하위 지표"],
  ["profile", "순위 산출 방식", "순위 산출 방식", "가중치 균등 모의 패널 3년 평균 리그 결과지표 제외"],
  ["profile", "영역별 순위와 수치", "영역별 순위와 수치", "영역 점수 흡연 음주 신체활동 식생활 정신건강 구강 만성질환 예방 의료이용"],
  ["profile", "강점 TOP 5", "강점 TOP 5", "잘하는 지표 상위"],
  ["profile", "가장 개선된 지표", "가장 개선된 지표 TOP 5", "개선 변화"],
  ["profile", "권고 예방·관리 사업", "권고 예방·관리 사업", "하위 25% 지표 지식베이스 사업 카드"],
  ["profile", "개선 과제", "개선 과제", "약점 하위 지표 지자체 참고"],
  ["profile", "전체 지표", "전체 지표 백분위", "모든 지표 백분위 표"],
  ["kpi", "핵심성과지표", "통합건강증진사업 핵심성과지표", "KPI 16개 목표치 설정법 달성률"],
  ["compare", "비교 대상", "비교 대상 담기", "지역 담기 빼기 최대 6곳"],
  ["compare", "전 지표 비교", "전 지표 비교표", "모든 지표 지역별 비교"],
  ["corr", "연관성 통계", "연관성 통계", "상관계수 p값"],
  ["hot", "핫스팟", "핫스팟·콜드스팟 지도", "공간 군집"],
  ["chronicle", "10대 뉴스", "올해의 10대 뉴스", "연도별 뉴스 격차 축소 확대 역대 최고 최저"],
  ["units", "조사 단위 지도", "조사 단위 지도", "시군구 보건소 확인"],
  ["units", "조사 단위 목록", "조사 단위 목록(258곳)", "보건소 이름 코드 검색"],
  ["units", "지역보건의료기관", "시도별 지역보건의료기관 수", "보건소 보건지소 보건진료소 건강생활지원센터"],
  ["sources", "자료원", "자료원 카드", "출처 기관 지표 수 연도 갱신 다음 공표 한계"],
  ["sources", "보건소별 자료 보유 현황", "보건소별 자료 보유 현황(매트릭스)", "결측 ● ◐ ○ CSV"],
  ["feedback", "자주 묻는 질문", "자주 묻는 질문(FAQ)", "FAQ"],
  ["feedback", "이 대시보드에 대하여", "이 대시보드에 대하여(사용설명서·활용법·영상)", "사용설명서 활용법 발표자료 소개 영상 동영상 MP4 PDF PPT 제작 크레딧 저장소"],
  ["feedback", "방법론 문서", "방법론 문서 목록", "랭킹 방법론 건강수명 산출법 박탈지수 격차 평가이론 검토 보고서 md 문서"],
  [null, "참고문헌", "참고문헌 목록", "출처 번호 인용 레퍼런스"],
].map(([view, card, name, kw]) => ({ view, card, name, kw }));

const norm = (s) => String(s || "").toLowerCase().replace(/[\s·()\-_,.·「」]/g, "");

export default function Search({ view, onGo }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cur, setCur] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // 색인은 한 번만 만든다
  const INDEX = useMemo(() => {
    const out = [];
    for (const v of VIEWS) out.push({ g: "메뉴", name: v.name, sub: "메뉴", key: norm(v.name + v.kw), go: { view: v.view } });
    for (const c of CARDS) out.push({ g: "화면 안 카드", name: c.name, sub: c.view ? VIEWS.find((v) => v.view === c.view)?.name : "모든 화면 아래", key: norm(c.name + c.card + c.kw), go: { view: c.view, card: c.card } });
    for (const i of INDICATORS) out.push({ g: "지표", name: i.name, sub: `${i.domain} · ${i.years[0]}–${i.years[i.years.length - 1]}`, key: norm(i.name + i.domain + i.id), go: { view: "analysis", ind: i } });
    for (const s of SIDOS) out.push({ g: "지역", name: s.n, sub: "시도", key: norm(s.n + s.s), go: { code: s.c } });
    for (const r of SGG_ALL) out.push({ g: "지역", name: `${r.s} ${r.n}`, sub: "시군구", key: norm(r.s + r.n), go: { code: r.c } });
    for (const u of HC_POOL) if (u.l === "sub") out.push({ g: "지역", name: `${u.s} ${u.hc25 || u.n}`, sub: `보건소 조사 단위 · ${u.hc || ""}`, key: norm(u.s + (u.hc25 || "") + u.n + (u.hc || "")), go: { code: u.c } });
    for (const s of COV.sources || []) out.push({ g: "자료원", name: s.name, sub: s.org, key: norm(s.name + s.org + (s.tbl || "")), go: { view: "sources", card: s.name } });
    for (const f of CONTACT.faq || []) out.push({ g: "자주 묻는 질문", name: f.q, sub: "의견·문의", key: norm(f.q + (f.a || "")), go: { view: "feedback", card: "자주 묻는 질문" } });
    for (const e of NCD.entries || []) out.push({ g: "예방·관리 지식베이스", name: e.goal, sub: `${e.area} · ${e.sido || e.level}`, key: norm(e.goal + e.area + (e.linked || []).join("")), go: { view: "ncd", ncdQ: e.goal } });
    for (const d of NCD.documents || []) if (d.url) out.push({ g: "원문 문서(새 창)", name: d.title, sub: `${d.org} · ${d.year}`, key: norm(d.title + d.org), go: { url: d.url } });
    return out;
  }, []);

  const LIMIT = { "메뉴": 6, "화면 안 카드": 6, "지표": 8, "지역": 8, "자료원": 4, "자주 묻는 질문": 3, "예방·관리 지식베이스": 5, "원문 문서(새 창)": 4 };
  const results = useMemo(() => {
    const toks = q.trim().split(/\s+/).map(norm).filter(Boolean);
    if (!toks.length) return [];
    const scored = [];
    for (const it of INDEX) {
      if (!toks.every((t) => it.key.includes(t))) continue;
      const nm = norm(it.name);
      const s = toks.reduce((a, t) => a + (nm === t ? 3 : nm.startsWith(t) ? 2 : nm.includes(t) ? 1 : 0), 0);
      scored.push({ ...it, s });
    }
    scored.sort((a, b) => b.s - a.s);
    const cnt = {}, out = [];
    for (const it of scored) { cnt[it.g] = (cnt[it.g] || 0) + 1; if (cnt[it.g] <= (LIMIT[it.g] || 5)) out.push(it); }
    // 묶음 순서: 이동 대상(메뉴·카드·지표·지역)이 내용(자료원·FAQ·지식베이스·문서)보다 먼저, 그 안에서는 이름이 더 잘 맞는 묶음이 위로
    // (「격차」→ 카드 「지역 간 격차」가 메뉴보다, 지식베이스의 긴 목표 문장보다 먼저). 같으면 고정 순서, 같은 묶음 안은 점수 → 짧은 이름 순.
    const order = Object.keys(LIMIT), TIER = { "메뉴": 2, "화면 안 카드": 2, "지표": 2, "지역": 2 }, best = {};
    for (const it of out) best[it.g] = Math.max(best[it.g] || 0, (TIER[it.g] || 1) * 10 + it.s);
    return out.sort((a, b) => (best[b.g] - best[a.g]) || (order.indexOf(a.g) - order.indexOf(b.g)) || (b.s - a.s) || (a.name.length - b.name.length));
  }, [q, INDEX]);

  const pick = (it) => {
    if (!it) return;
    setOpen(false); setQ("");
    if (it.go.url) { window.open(it.go.url, "_blank", "noopener"); return; }
    onGo(it.go);
  };

  // 단축키: / 또는 Ctrl(⌘)+K — 글 입력 중이 아닐 때만
  useEffect(() => {
    const h = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || tag === "select" || e.target?.isContentEditable;
      if ((e.key === "/" && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  useEffect(() => { if (open) { setCur(0); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);
  useEffect(() => setCur(0), [q]);
  useEffect(() => { listRef.current?.querySelector(".srch-item.on")?.scrollIntoView({ block: "nearest" }); }, [cur]);

  const onKey = (e) => {
    if (e.key === "Escape") { setOpen(false); setQ(""); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setCur((c) => Math.min(results.length - 1, c + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCur((c) => Math.max(0, c - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); pick(results[cur]); }
  };

  const groups = [];
  for (const it of results) { const g = groups.find((x) => x.g === it.g); if (g) g.items.push(it); else groups.push({ g: it.g, items: [it] }); }
  let k = -1;
  const EX = ["건강수명", "강릉", "흡연", "격차", "고위험군", "자료원", "참고문헌", "사용설명서"];

  return (
    <>
      <button type="button" className="themebtn srch-btn" onClick={() => setOpen(true)} title="메뉴·지표·지역·카드 검색 (단축키 / 또는 Ctrl+K)" aria-label="검색">
        <span aria-hidden="true">⌕</span> 검색
      </button>
      {open && createPortal(
        <div className="srch-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) { setOpen(false); setQ(""); } }} role="dialog" aria-modal="true" aria-label="검색">
          <div className="srch-panel">
            <input ref={inputRef} className="srch-input" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
              placeholder="메뉴 · 지표 · 지역 · 카드 이름을 입력하세요 (예: 건강수명, 강릉, 흡연율)" aria-label="검색어" autoComplete="off" autoFocus />
            <div className="srch-list" ref={listRef}>
              {!q.trim() && (
                <div className="srch-hint">
                  <div className="srch-g">이런 것을 찾을 수 있습니다</div>
                  <div className="srch-ex">{EX.map((x) => <button key={x} type="button" className="chip" onClick={() => setQ(x)}>{x}</button>)}</div>
                  <div className="srch-g">메뉴</div>
                  {VIEWS.map((v) => (
                    <button key={v.view} type="button" className={`srch-item ${view === v.view ? "cur" : ""}`} onClick={() => pick({ go: { view: v.view } })}>
                      <span>{v.name}</span><span className="si-sub">{v.kw.split(" ").slice(0, 4).join(" · ")}</span>
                    </button>
                  ))}
                </div>
              )}
              {!!q.trim() && !results.length && <div className="pick-empty">「{q}」에 맞는 메뉴·지표·지역·카드가 없습니다. 다른 말로 찾아보세요(예: 비만 → 비만율, 보건소 이름).</div>}
              {groups.map((g) => (
                <div key={g.g}>
                  <div className="srch-g">{g.g}</div>
                  {g.items.map((it) => { k++; const i = k;
                    return (
                      <button key={i} type="button" className={`srch-item ${i === cur ? "on" : ""}`} onMouseMove={() => { if (cur !== i) setCur(i); }} onClick={() => pick(it)}>
                        <span>{it.name}</span><span className="si-sub">{it.sub}</span>
                      </button>
                    ); })}
                </div>
              ))}
            </div>
            <div className="srch-foot"><span>↑↓ 이동 · Enter 열기 · Esc 닫기</span><span>단축키 <kbd>/</kbd> 또는 <kbd>Ctrl</kbd>+<kbd>K</kbd></span></div>
          </div>
        </div>,
        document.querySelector(".viz-root") || document.body)}
    </>
  );
}
