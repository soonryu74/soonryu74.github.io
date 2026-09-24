import { useEffect, useMemo, useRef, useState } from "react";
import Cite from "./Cite";
import { createPortal } from "react-dom";
import { fmt, ranked, label, val, RBY } from "../data";
import { saveSvgString, savePngFromSvg, saveCsvRows } from "../export";
import { renderRankVideo, saveBlob } from "../video";
import { safe } from "../export";

/* 전체 보기 — 순위 전체를 막대그래프로 펼치고, 연도를 재생하면 막대 길이와 자리(순위)가 함께 움직인다.
   막대 길이 = 값(0 기준, 모든 연도 공통 척도라 늘고 줌이 그대로 보임) · 선택 지역 = 붉은 막대 · ▲▼ = 전년 대비 순위 변동.
   2026-09-23 소유자 지시: 좌우로 나누지 말고 **항상 한 줄(1열)** 로, 258개라도 위에서 아래로. 막대가 화면 폭 전체를 쓰므로 격차가 한눈에 보인다.
   인쇄(🖨)하면 이 화면만 세로로 길게 나온다(styles.css @media print). SVG·PNG·CSV 내려받기 지원. 모든 지표·모든 집단 탭 공통. */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export default function RankAll({ ind, item, year, pool, poolName, rev, sel, onYear, onClose, onSelect }) {
  const years = ind.years;
  const [play, setPlay] = useState(false);
  const [speed, setSpeed] = useState(1100);
  const [big, setBig] = useState(false);
  const [size, setSize] = useState({ w: 1200, h: 620 });
  const [vid, setVid] = useState(null);           // {pct, msg} 영상 생성 진행 상태
  const [vidTop, setVidTop] = useState("auto");   // 영상에 담을 순위 수: auto(≤40이면 전체, 아니면 상위 30) | all | 30 | 50
  const wrapRef = useRef(null);

  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const read = () => { const cs = getComputedStyle(el); setSize({ w: el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), h: el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) }); };
    const ro = new ResizeObserver(read); ro.observe(el); read();
    return () => ro.disconnect();
  }, []);
  const step = (d) => { const i = years.indexOf(year); onYear(years[clamp(i + d, 0, years.length - 1)]); };
  // ▶ 를 누르면 마지막 연도에 있을 때는 처음(2008)부터 다시 시작한다
  const togglePlay = () => { if (!play && year === years[years.length - 1]) onYear(years[0]); setPlay(!play); };
  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === " ") { e.preventDefault(); setPlay((p) => !p); }
    };
    window.addEventListener("keydown", h);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    document.body.classList.add("rall-open");                       // 인쇄 시 이 화면만 남기기 위한 표식
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = prev; document.body.classList.remove("rall-open"); };
  }, [year]);
  // 열릴 때 선택 지역이 보이도록 스크롤
  useEffect(() => {
    const t = setTimeout(() => wrapRef.current?.querySelector(".ra-cell.me")?.scrollIntoView({ block: "center" }), 60);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!play) return;
    const t = setInterval(() => onYear(years[(years.indexOf(year) + 1) % years.length]), speed);
    return () => clearInterval(t);
  }, [play, year, speed, years]);

  const rowsFor = (y) => { const a = ranked(ind, item, y, pool); return rev ? [...a].reverse() : a; };
  const rows = useMemo(() => rowsFor(year), [ind, item, year, pool, rev]);
  const prevYear = years[years.indexOf(year) - 1];
  const prevRank = useMemo(() => {
    if (prevYear == null) return null;
    const m = new Map(); rowsFor(prevYear).forEach((x, i) => m.set(x.r.c, i + 1)); return m;
  }, [ind, item, prevYear, pool, rev]);

  // 척도는 모든 연도 공통(최댓값 고정) — 그래야 해마다 막대가 늘고 주는 게 보인다
  const gmax = useMemo(() => {
    let mx = 0;
    for (const y of years) for (const r of pool) { const v = val(ind, item, y, r.c); if (v != null && v > mx) mx = v; }
    return mx || 1;
  }, [ind, item, pool, years]);

  const n = rows.length;
  const narrow = size.w < 560;
  // 항상 1열: 개수와 상관없이 위에서 아래로 한 줄. 길면 세로 스크롤(인쇄 시에는 전부 펼침).
  const perCol = n || 1;
  const rowH = big ? 30 : (narrow ? 22 : 24);
  const colW = size.w;
  const gridH = perCol * rowH;
  const compact = narrow;
  const tiny = size.w < 340;

  const nameOf = (r, short) => (r.hc ? r.hc.replace(/보건소$/, "") : r.l === "sgg" && !short ? `${r.s} ${r.n}` : r.n);
  const isMineC = (r) => r.c === sel.c || (r.l === "sub" && r.p === sel.c);
  const myIdx = rows.findIndex((x) => isMineC(x.r));
  const my = myIdx >= 0 ? rows[myIdx] : null;
  const myPrev = my && prevRank ? prevRank.get(my.r.c) : null;
  const myDelta = my && myPrev != null ? myPrev - (myIdx + 1) : null;
  const first = rows[0], last = rows[n - 1];
  const med = n ? [...rows].map((x) => x.v).sort((a, b) => a - b)[Math.floor(n / 2)] : null;
  const dirWord = ind.bad === true ? "낮을수록 양호" : ind.bad === false ? "높을수록 양호" : "방향 없음(맥락 지표)";
  const fileBase = `${ind.name}_${poolName}_순위전체_${year}`;

  /* ── 영상 저장: 연도별 순위 목록을 캔버스 애니메이션으로 그려 MP4(H.264)로 인코딩 ── */
  const makeVideo = async () => {
    if (vid) return;
    setPlay(false);
    const frames = {}; for (const y of years) frames[y] = rowsFor(y).map(({ r, v }) => ({ c: r.c, name: nameOf(r, false), v }));
    const nAll = Math.max(...years.map((y) => frames[y].length));
    const topN = vidTop === "all" ? 0 : vidTop === "auto" ? (nAll <= 40 ? 0 : 30) : +vidTop;
    const rowsShown = (topN || nAll) + 1;
    const height = rowsShown <= 26 ? 720 : rowsShown <= 40 ? 1080 : Math.min(2160, Math.ceil((118 + 48 + rowsShown * 12) / 2) * 2);
    setVid({ pct: 0, msg: "영상 만드는 중" });
    try {
      const out = await renderRankVideo({
        title: ind.name, subtitle: `${item === "std" ? "표준화율" : "조율"} · ${dirWord} · ${rev ? "나쁜 순" : "양호한 순"}`, poolName, years, frames,
        selCode: sel.l === "sgg" || sel.l === "sido" ? sel.c : null, gmax, unit: ind.unit, topN, width: 1280, height, fps: 30,
        holdMs: Math.round(speed * 0.55), moveMs: Math.round(speed * 0.75),
        source: `자료: 질병관리청 지역사회건강조사(KOSIS) 등 · 지역 건강프로파일 대시보드 health-profile.kr`,
        onProgress: (p) => setVid({ pct: p, msg: "영상 만드는 중" }),
      });
      saveBlob(out.blob, safe(`${ind.name}_${poolName}_순위변화_${years[0]}-${years[years.length - 1]}`) + `.${out.ext}`);
      setVid({ pct: 1, msg: `저장 완료 · ${out.ext.toUpperCase()} ${out.width}×${out.height} · ${Math.round(out.seconds)}초${out.ext === "webm" ? " (이 브라우저는 MP4 인코딩을 지원하지 않아 WebM으로 저장)" : ""}` });
    } catch (e) {
      setVid({ pct: 0, msg: `실패: ${e.message || e}` });
    }
    setTimeout(() => setVid(null), 6000);
  };

  /* ── 내려받기: 화면과 같은 막대 순위표를 독립 SVG로 생성 ── */
  const buildSvg = () => {
    const C = 6, R = Math.ceil(n / C), RH = 21, CW = 268, PAD = 18, TOP = 84;
    const W = PAD * 2 + C * CW, H = TOP + R * RH + 54;
    const ink = "#141413", mut = "#6b7280", line = "#e5e7eb", bar = "#cfe3fb", barMe = "#f5a58f", meLine = "#d8402a";
    const font = "'Malgun Gothic','Apple SD Gothic Neo',system-ui,sans-serif";
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${font}">
<rect width="${W}" height="${H}" fill="#ffffff"/>
<text x="${PAD}" y="30" font-size="19" font-weight="700" fill="${ink}">${esc(ind.name)} — ${esc(poolName)} 순위 (${year}년)</text>
<text x="${PAD}" y="50" font-size="12" fill="${mut}">${item === "std" ? "표준화율" : "조율"} · ${dirWord} · ${rev ? "나쁜 순" : "양호한 순"} · ${n}개 · 막대 길이 = 값(0 기준, 전 연도 공통 척도 최대 ${fmt(gmax)}${esc(ind.unit)})</text>
<text x="${PAD}" y="68" font-size="12" fill="${mut}">중앙값 ${fmt(med)}${esc(ind.unit)} · 1위 ${esc(nameOf(first?.r || {}, false))} ${fmt(first?.v)} · ${n}위 ${esc(nameOf(last?.r || {}, false))} ${fmt(last?.v)}${my ? ` · 선택 ${esc(nameOf(my.r, false))} ${myIdx + 1}위 ${fmt(my.v)}` : ""}</text>`;
    rows.forEach(({ r, v }, i) => {
      const col = Math.floor(i / R), row = i % R;
      const x = PAD + col * CW, y = TOP + row * RH;
      const bw = Math.max(1, ((CW - 12) * v) / gmax);
      const me = isMineC(r);
      const pr = prevRank ? prevRank.get(r.c) : null, d = pr != null ? pr - (i + 1) : null;
      s += `<rect x="${x}" y="${y}" width="${CW - 8}" height="${RH - 3}" rx="3" fill="#f6f7f9"/>` +
        `<rect x="${x}" y="${y}" width="${bw.toFixed(1)}" height="${RH - 3}" rx="3" fill="${me ? barMe : bar}"/>` +
        (me ? `<rect x="${x + 0.5}" y="${y + 0.5}" width="${CW - 9}" height="${RH - 4}" rx="3" fill="none" stroke="${meLine}" stroke-width="1.5"/>` : "") +
        `<text x="${x + 24}" y="${y + 13}" font-size="10.5" text-anchor="end" fill="${mut}">${i + 1}</text>` +
        `<text x="${x + 29}" y="${y + 13}" font-size="11" fill="${ink}"${me ? ' font-weight="700"' : ""}>${esc(nameOf(r, false))}</text>` +
        (d ? `<text x="${x + CW - 44}" y="${y + 13}" font-size="9" text-anchor="end" fill="${d > 0 ? "#184f95" : "#ab2a19"}">${d > 0 ? "▲" : "▼"}${Math.abs(d)}</text>` : "") +
        `<text x="${x + CW - 14}" y="${y + 13}" font-size="11" text-anchor="end" fill="${ink}"${me ? ' font-weight="700"' : ""}>${fmt(v)}</text>`;
    });
    s += `<text x="${PAD}" y="${H - 18}" font-size="11" fill="${mut}">붉은 막대 = 선택 지역 · ▲▼ = 전년 대비 순위 변동 · 자료: 질병관리청 지역사회건강조사 (KOSIS) · 지역 건강프로파일 대시보드</text></svg>`;
    return s;
  };
  const dlCsv = () => {
    const head = ["순위", "지역", "코드", "시도", `${year} 값(${ind.unit})`, "전년 순위", "순위 변동", ...years.flatMap((y) => [`${y} 값`, `${y} 순위`])];
    const rankByYear = Object.fromEntries(years.map((y) => [y, new Map(rowsFor(y).map((x, i) => [x.r.c, i + 1]))]));
    const body = rows.map(({ r, v }, i) => {
      const pr = prevRank ? prevRank.get(r.c) : null;
      return [i + 1, nameOf(r, false), r.c, r.s || "", fmt(v), pr ?? "", pr != null ? pr - (i + 1) : "",
        ...years.flatMap((y) => [fmt(val(ind, item, y, r.c)), rankByYear[y].get(r.c) ?? ""])];
    });
    saveCsvRows([head, ...body], fileBase);
  };

  return createPortal(
    <div className="rall" role="dialog" aria-label="순위 전체 보기">
      <header className="ra-head">
        <div className="ra-t">
          <div className="ra-kick">순위 전체 보기 · {poolName} · {n}개</div>
          <h3>{ind.name}<Cite ind={ind} /> <small>{item === "std" ? "표준화율" : "조율"} · {dirWord} · {rev ? "나쁜 순" : "양호한 순"}</small></h3>
        </div>
        <div className="ra-nowyear">{year}</div>
        <div className="ra-actions">
          <button className={`ra-btn ${play ? "on" : ""}`} onClick={togglePlay}>{play ? "■ 정지" : `▶ ${years[0]}년부터 재생`}</button>
          <button className={`ra-btn ${big ? "on" : ""}`} onClick={() => setBig(!big)} title="줄 높이를 키워 보기">{big ? "촘촘히" : "크게"}</button>
          <button className="ra-btn" onClick={() => window.print()} title="이 화면만 세로로 길게 인쇄(전체 순위가 한 줄로 나옵니다)">🖨 인쇄</button>
          <select className="ra-sel" value={speed} onChange={(e) => setSpeed(+e.target.value)} title="재생 속도">
            <option value={1800}>느리게</option><option value={1100}>보통</option><option value={600}>빠르게</option>
          </select>
          <span className="ra-dl">
            <select className="ra-sel sm" value={vidTop} onChange={(e) => setVidTop(e.target.value)} title="영상에 담을 지역 수">
              <option value="auto">영상: 자동</option><option value="all">영상: 전체</option><option value="30">영상: 상위 30</option><option value="50">영상: 상위 50</option>
            </select>
            <button className={`ra-btn sm ${vid ? "on" : ""}`} onClick={makeVideo} disabled={!!vid} title={`${years[0]}년부터 ${years[years.length - 1]}년까지 순위·막대 변화를 MP4 영상으로 저장(발표용)`}>
              {vid && vid.pct < 1 && !vid.msg.startsWith("실패") ? `🎬 ${Math.round(vid.pct * 100)}%` : "🎬 영상 저장"}
            </button>
            <button className="ra-btn sm" onClick={() => saveSvgString(buildSvg(), fileBase)} title="편집 가능한 벡터(PPT용)">↓ SVG</button>
            <button className="ra-btn sm" onClick={() => savePngFromSvg(buildSvg(), fileBase)} title="이미지">↓ PNG</button>
            <button className="ra-btn sm" onClick={dlCsv} title="전 연도 값·순위 표">↓ CSV</button>
          </span>
          <button className="ra-btn" onClick={onClose} aria-label="닫기">✕ 닫기</button>
        </div>
      </header>

      {vid && <div className={`ra-vid ${vid.msg.startsWith("실패") ? "err" : ""}`}><i style={{ width: `${Math.round(vid.pct * 100)}%` }} /><span>{vid.msg}{vid.pct < 1 && !vid.msg.startsWith("실패") ? ` ${Math.round(vid.pct * 100)}% — 창을 닫지 마세요` : ""}</span></div>}
      <div className="ra-bar">
        <button className="ra-step" onClick={() => step(-1)} aria-label="이전 연도">‹</button>
        {years.map((y) => <button key={y} className={`ra-y ${y === year ? "on" : ""}`} onClick={() => { setPlay(false); onYear(y); }}>{String(y).slice(2)}</button>)}
        <button className="ra-step" onClick={() => step(1)} aria-label="다음 연도">›</button>
        {my && (
          <span className="ra-me">
            {nameOf(my.r)} <b>{myIdx + 1}위</b> / {n} · {fmt(my.v)}{ind.unit}
            {myDelta != null && myDelta !== 0 && <i className={myDelta > 0 ? "up" : "down"}>{myDelta > 0 ? `▲${myDelta}` : `▼${-myDelta}`}</i>}
          </span>
        )}
        {first && <span className="ra-ends">중앙값 {fmt(med)} · 1위 {nameOf(first.r)} {fmt(first.v)} · {n}위 {nameOf(last.r)} {fmt(last.v)}</span>}
      </div>

      <div className="ra-grid" ref={wrapRef}>
        <div className="ra-canvas" style={{ height: gridH }}>
          {rows.map(({ r, v }, i) => {
            const col = 0, row = i;
            const pr = prevRank ? prevRank.get(r.c) : null;
            const d = pr != null ? pr - (i + 1) : null;
            const me = isMineC(r);
            const kin = !me && sel.l === "sido" && (r.p === sel.c || r.s === sel.s);
            return (
              <div key={r.c} className={`ra-cell ${me ? "me" : ""} ${kin ? "kin" : ""} ${compact ? "cmp" : ""}`}
                title={`${label(r)} · ${fmt(v)}${ind.unit}${d != null ? ` · 전년 대비 ${d > 0 ? "▲" + d : d < 0 ? "▼" + -d : "="}` : ""}`}
                style={{ transform: `translate3d(${col * colW}px, ${row * rowH}px, 0)`, width: colW - 4, height: rowH - 2 }}
                onClick={() => { onSelect(r.l === "sub" ? r.p : r.c); onClose(); }}>
                <span className="ra-fill" style={{ width: `${((v / gmax) * 100).toFixed(1)}%` }} />
                <span className="ra-no">{i + 1}</span>
                <span className="ra-nm">{nameOf(r, compact)}</span>
                {d != null && d !== 0 && <span className={`ra-d ${d > 0 ? "up" : "down"}`}>{d > 0 ? "▲" : "▼"}{tiny ? "" : Math.abs(d)}</span>}
                <span className="ra-v">{fmt(v)}</span>
              </div>
            );
          })}
          {!n && <div className="empty">해당 연도 자료 없음</div>}
        </div>
      </div>

      <footer className="ra-foot">
        <span className="ra-swbar" /><span className="ra-lg">막대 길이 = 값 (0 기준 · 모든 연도 공통 척도, 최대 {fmt(gmax)}{ind.unit})</span>
        <span className="ra-swbar me" /><span className="ra-lg">선택 지역</span>
        <span className="ra-lg">{rev ? "오른쪽·아래로 갈수록 양호" : "왼쪽·위가 양호"} · ▲▼ = 전년 대비 순위 변동 · 칸을 누르면 그 지역으로 이동 · Space 재생, ← → 연도, Esc 닫기</span>
      </footer>
    </div>,
    document.querySelector(".viz-root") || document.body     // 테마 변수(--page 등)가 .viz-root 에 있어 그 안에 띄운다
  );
}
