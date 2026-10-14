import { useState } from "react";
import { fmt, val, ci, hasSe, isSurvey, label, ITEMS, natPool, sidoPoolOf, SIDOS, RBY, sidoCodeOfRegion, kdcaRegionOf, kdcaPoolOf } from "../data";
import { gapMeasures, positionIn, sides, versus, precisionNote, QUANTILE_MIN_N } from "../lib/gapMeasures";
import IndInfo from "./equity/IndInfo";

/* 우리 지역 읽기 — 노은정(2026-09-29) 발표 「우리 지역 지표 읽기」 5단계(정의 → 분포 속 위치 → 정밀도 → 격차 판단 → 해석 문장)를
   선택한 지역·지표·연도로 자동 작성한다. 계산된 사실만 쓰고 원인·효과는 쓰지 않는다. */
export default function ReadMyRegion({ ind, item, year, sel }) {
  const [copied, setCopied] = useState("");
  const v = val(ind, item, year, sel.c);
  const unit = ind.unit === "%" ? "%" : ind.unit ? ` ${ind.unit}` : "";
  const du = ind.unit === "%" ? "%p" : ind.unit ? ` ${ind.unit}` : "";
  const dirTxt = ind.bad === true ? "높을수록 나쁜 지표(낮을수록 양호)" : ind.bad === false ? "높을수록 좋은 지표" : "방향을 정하지 않는 맥락 지표";
  const favWord = ind.bad === true ? "하위 20% 경계(값이 낮은 쪽)" : "상위 20% 경계(값이 높은 쪽)";
  const isSido = sel.l === "sido";

  if (v == null) return <div className="desc">{label(sel)}은(는) {year}년 {ind.name} 값이 없습니다. 위에서 연도나 지역을 바꿔 보세요.</div>;

  // 2. 분포 속 위치 — 전국 · 권역 · 시도
  const sidoC = sidoCodeOfRegion(sel);
  const region = kdcaRegionOf(sidoC);
  const vals = (pool) => pool.map((r) => val(ind, item, year, r.c));
  const basis = isSido
    ? [{ key: "nat", name: "전국 17개 시도", pool: SIDOS }]
    : [
        { key: "nat", name: `전국 ${isSurvey(ind) ? "조사 단위(보건소)" : "시군구"}`, pool: natPool(ind) },
        region && { key: "reg", name: `${region.n}(질병대응센터 권역)`, pool: kdcaPoolOf(ind, region) },
        { key: "sido", name: RBY.get(sidoC)?.n || "시도", pool: sidoPoolOf(ind, sidoC) },
      ].filter(Boolean);
  const pos = basis.map((b) => ({ ...b, inList: b.pool.some((r) => r.c === sel.c), p: positionIn(vals(b.pool), v, ind.bad) }));
  const nat = pos[0], reg = pos.find((x) => x.key === "reg");
  const natG = nat.p?.g;

  // 3. 정밀도
  const c = hasSe(ind) ? ci(ind, item, year, sel.c) : null;
  const pn = c ? precisionNote(c.rse) : null;
  const med = natG?.med;
  const ciHasMed = c && med != null ? c.lo <= med && med <= c.hi : null;

  // 4. 격차 판단 — 우리 지역 vs 양호한 쪽 20% 경계
  const natFav = !isSido ? sides(natG, ind.bad) : null;
  const regFav = !isSido && reg ? sides(reg.p?.g, ind.bad) : null;
  const vsNat = natFav ? versus(v, natFav.fav) : null, vsReg = regFav ? versus(v, regFav.fav) : null;
  const inFav = (fav) => fav != null && (ind.bad ? v <= fav : v >= fav);

  // 5. 해석 문장
  const posTxt = (x) => `${x.name.replace(/\(.*?\)/g, "")} ${x.p.n}곳 중 값이 높은 순 ${x.p.k}번째(상위 약 ${x.p.topPct}%)`;
  const parts = [];
  const nameRate = /\)$/.test(ind.name) ? `${ind.name.slice(0, -1)}, ${ITEMS[item] || item})` : `${ind.name}(${ITEMS[item] || item})`;
  parts.push(`${label(sel)}의 ${year}년 ${nameRate}은 ${fmt(v)}${unit}${c ? `(95% 신뢰구간 ${fmt(c.lo)}~${fmt(c.hi)}${unit})` : ""}로, ${posTxt(nat)}${reg?.p ? `이며 ${posTxt(reg)}` : ""}이다.`);
  if (med != null && !isSido) {
    const d = v - med, word = d >= 0 ? "높" : "낮";
    parts.push(`이는 전국 중앙값(${fmt(med)}${unit})보다 ${fmt(Math.abs(d))}${du} ${word}${ciHasMed == null ? "다(표본오차 정보가 없는 행정 통계)." : ciHasMed ? "지만, 95% 신뢰구간이 전국 중앙값을 포함하므로 이 차이는 통계적으로 유의하지 않다." : "고, 95% 신뢰구간이 전국 중앙값을 포함하지 않는다."}`);
  }
  if (vsNat) parts.push(inFav(natFav.fav) ? `전국 양호한 쪽 20% 경계(${fmt(natFav.fav)}${unit}) 안에 있다.` : `전국 양호한 쪽 20% 경계(${fmt(natFav.fav)}${unit})와는 ${fmt(Math.abs(vsNat.abs))}${du}${vsNat.rel != null ? `(${fmt(vsNat.rel, 2)}배)` : ""} 차이가 있다.`);
  parts.push(`(자료: ${isSurvey(ind) ? "질병관리청 지역사회건강조사" + (ind.src ? `, ${ind.src}` : "") : ind.src || "자료원 탭 참고"})`);
  const sentence = parts.join(" ");

  const copy = async () => {
    try { await navigator.clipboard.writeText(sentence); setCopied("복사했습니다"); }
    catch { setCopied("복사가 막혀 있습니다 — 문장을 길게 눌러 복사하세요"); }
    setTimeout(() => setCopied(""), 2500);
  };

  return (
    <div className="rmr">
      <ol className="rmr-steps">
        <li>
          <div className="rmr-h">정의 확인</div>
          <div className="rmr-b">
            <div><b>{ind.name}</b> <IndInfo ind={ind} /> · {ITEMS[item] || item} · 단위 {ind.unit || "–"} · {dirTxt}{ind.src ? ` · ${ind.src}` : ""}</div>
            {item === "crude" && <div className="desc">지금은 <b>조율</b>입니다. 조율은 실제 규모를 볼 때 쓰고, 연령 구조가 다른 지역끼리 비교할 때는 <b>표준화율</b>을 씁니다(위 「값 유형」에서 바꿈).</div>}
            <div className="desc">분자·분모 정의는 ⓘ의 원 통계표에서 확인하세요.</div>
          </div>
        </li>
        <li>
          <div className="rmr-h">분포 속 위치</div>
          <div className="rmr-b">
            <div className="tbl-wrap"><table className="rmr-tbl">
              <thead><tr><th>기준</th><th className="num">지역 수</th><th className="num">하위 20% 경계</th><th className="num">중앙값</th><th className="num">상위 20% 경계</th><th>{label(sel)}의 위치</th><th>불리한 쪽 20%?</th></tr></thead>
              <tbody>{pos.map((x) => { const g = x.p?.g; return (
                <tr key={x.key}><th scope="row">{x.name}</th><td className="num">{x.p?.n ?? "–"}</td>
                  <td className="num">{g?.p20 != null ? fmt(g.p20) : "–"}</td><td className="num">{g ? fmt(g.med) : "–"}</td><td className="num">{g?.p80 != null ? fmt(g.p80) : "–"}</td>
                  <td>{x.p ? `값이 높은 순 ${x.p.k}번째(상위 약 ${x.p.topPct}%)` : "–"}{x.p && !x.inList ? <span className="muted"> · 목록 밖, 값으로 자리 매김</span> : null}</td>
                  <td>{x.p?.unfav20 == null ? <span className="muted">{g && g.p80 == null ? `${QUANTILE_MIN_N}곳 이하라 생략` : "–"}</span> : x.p.unfav20 ? <span className="rmr-pill bad">예</span> : <span className="rmr-pill">아니오</span>}</td></tr>); })}</tbody>
            </table></div>
            <div className="desc">같은 값도 기준(전국·권역·시도)에 따라 위치가 달라집니다. 보고할 때는 기준과 몇 번째인지를 함께 적습니다. 「불리한 쪽 20%」는 {ind.bad == null ? "맥락 지표라 판정하지 않습니다" : ind.bad ? "상위 20% 경계보다 높은 경우" : "하위 20% 경계보다 낮은 경우"}.</div>
          </div>
        </li>
        <li>
          <div className="rmr-h">정밀도 확인</div>
          <div className="rmr-b">
            {c ? <>
              <div>{label(sel)} {fmt(v)}{unit} · 표준오차 {fmt(c.se)}{du} · 95% 신뢰구간 <b>{fmt(c.lo)}~{fmt(c.hi)}{unit}</b></div>
              <div className={`desc rmr-note ${pn?.level}`}>{pn?.text}</div>
              {!isSido && ciHasMed != null && <div className="desc">{ciHasMed
                ? <>신뢰구간이 전국 중앙값({fmt(med)})을 <b>포함</b>합니다 → 전국 중앙값과 다르다고 <b>단정할 수 없습니다</b>(같다는 뜻도 아님 — 차이를 말할 근거가 부족한 것).</>
                : <>신뢰구간이 전국 중앙값({fmt(med)})을 <b>포함하지 않습니다</b> → 표본오차를 감안해도 전국 중앙값과 다르다고 말할 수 있습니다.</>}</div>}
            </> : <span className="muted">표본오차 정보가 없는 행정 통계입니다(사망원인통계·검진 통계 등) — 신뢰구간 판단은 생략합니다.</span>}
          </div>
        </li>
        <li>
          <div className="rmr-h">격차 판단</div>
          <div className="rmr-b">
            {isSido ? <span className="muted">17개 시도는 {QUANTILE_MIN_N}곳 이하라 20% 경계 비교를 하지 않습니다. 시군구(보건소)를 고르면 나옵니다.</span>
              : ind.bad == null ? <span className="muted">맥락 지표라 「양호한 쪽」이 없어 격차 판단을 하지 않습니다.</span>
              : <div className="tbl-wrap"><table className="rmr-tbl">
                  <thead><tr><th>비교</th><th className="num">기준값</th><th className="num">절대 격차</th><th className="num">상대 격차</th></tr></thead>
                  <tbody>
                    {vsNat && <tr><th scope="row">{label(sel)} vs 전국 양호한 쪽 20% 경계<div className="muted small">{favWord}</div></th><td className="num">{fmt(natFav.fav)}</td>
                      {inFav(natFav.fav) ? <td colSpan={2} className="muted">이미 양호한 쪽 20% 안</td> : <><td className="num"><b>{fmt(Math.abs(vsNat.abs))}{du}</b></td><td className="num">{vsNat.rel != null ? `${fmt(vsNat.rel, 2)}배` : "–"}</td></>}</tr>}
                    {vsReg && <tr><th scope="row">{label(sel)} vs {region.n} 양호한 쪽 20% 경계</th><td className="num">{fmt(regFav.fav)}</td>
                      {inFav(regFav.fav) ? <td colSpan={2} className="muted">이미 양호한 쪽 20% 안</td> : <><td className="num"><b>{fmt(Math.abs(vsReg.abs))}{du}</b></td><td className="num">{vsReg.rel != null ? `${fmt(vsReg.rel, 2)}배` : "–"}</td></>}</tr>}
                    {natG?.boundary && <tr className="muted"><th scope="row">(참고) 전국 격차 — 상·하위 20% 경계값</th><td className="num">{fmt(natG.p80)} / {fmt(natG.p20)}</td><td className="num">{fmt(natG.boundary.abs)}{du}</td><td className="num">{natG.boundary.rel != null ? `${fmt(natG.boundary.rel, 2)}배` : "–"}</td></tr>}
                    {natG && <tr className="muted"><th scope="row">(참고) 전국 격차 — 최댓값·최솟값</th><td className="num">{fmt(natG.max)} / {fmt(natG.min)}</td><td className="num">{fmt(natG.maxMin.abs)}{du}</td><td className="num">{natG.maxMin.rel != null ? `${fmt(natG.maxMin.rel, 2)}배` : "–"}</td></tr>}
                  </tbody>
                </table></div>}
            <div className="desc">비교 기준과 계산 방식에 따라 격차 값이 달라집니다. 절대(%p)와 상대(배)를 함께 적습니다.</div>
          </div>
        </li>
        <li>
          <div className="rmr-h">해석 문장</div>
          <div className="rmr-b">
            <p className="rmr-sentence">{sentence}</p>
            <div className="rmr-actions"><button type="button" className="themebtn" onClick={copy}>📋 문장 복사</button> <span className="muted small" role="status">{copied}</span></div>
            <div className="desc">피할 표현: 「전국에서 매우 높은 수준」(위치 과장), 「전국 대비 10% 높다」(%와 %p 혼동), 비교 기준·율의 종류·신뢰구간 누락.</div>
          </div>
        </li>
      </ol>
    </div>
  );
}
