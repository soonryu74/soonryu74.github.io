import { useEffect, useRef } from "react";
import { fmt, ranked, poolFor, label, SUBS_BY_SGG, val } from "../data";

/* 순위: 비교 집단(전국 시군구 / 시도 내 시군구 / 17개 시도) 막대. 선택 지역 자동 스크롤 */
export default function RankPanel({ ind, item, year, sel, scope, onSelect }) {
  const pool = poolFor(sel, scope);
  const rows = ranked(ind, item, year, pool);
  const max = rows.length ? Math.max(...rows.map((x) => x.v)) : 1;
  const listRef = useRef(null);
  useEffect(() => {
    const el = listRef.current?.querySelector(".rrow.sel");
    if (el && listRef.current) {
      const top = el.offsetTop - listRef.current.clientHeight / 2 + el.clientHeight / 2;
      listRef.current.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
  }, [ind, item, year, sel, scope]);

  const subs = sel.l === "sgg" ? SUBS_BY_SGG[sel.c] : null;

  return (
    <>
      <div className="rank scroll" ref={listRef}>
        {rows.map(({ r, v }, k) => (
          <div key={r.c} className={`rrow ${r.c === sel.c ? "sel" : ""}`} onClick={() => onSelect(r.c)}>
            <div className="rn">{k + 1}</div>
            <div className="rl" title={label(r)}>{scope === "nation" && r.l === "sgg" ? `${r.s} ${r.n}` : r.n}</div>
            <div className="bar-track"><div className="bar" style={{ width: `${((v / max) * 100).toFixed(1)}%` }} /></div>
            <div className="rv">{fmt(v)}</div>
          </div>
        ))}
        {!rows.length && <div className="empty">해당 연도 자료 없음</div>}
      </div>
      {subs && (
        <div className="subs">
          <div className="desc">보건소별 세부 단위 ({year}년)</div>
          {subs.map((s) => (
            <span key={s.c} className="subchip">{s.n} <b>{fmt(val(ind, item, year, s.c))}</b></span>
          ))}
        </div>
      )}
    </>
  );
}
