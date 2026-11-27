// 한국판 정보 패널: 시군구·시도를 누르면 건강 지표 12개(값 · 전국 중앙값 · 분포 속 위치)를 보여 준다.
// 위치는 구간으로만 말한다(정확한 순위 대신) — health-profile.kr 대시보드와 같은 원칙. 결측은 「자료 없음」(0 으로 바꾸지 않음).
import { esc } from "../format.js";

const DASH = "../"; // 같은 사이트의 대시보드(health-profile.kr/ 또는 soonryu74.github.io/health-dashboard/)

export const manwon = (n) => {
  if (!Number.isFinite(n)) return "–";
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}억`;
  if (n >= 1e4) return `${(n / 1e4).toFixed(n >= 1e5 ? 0 : 1)}만`;
  return Math.round(n).toLocaleString("ko-KR");
};
const num = (v, unit) => (v == null ? "–" : `${Number(v).toLocaleString("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${unit === "%" ? "%" : ""}`);
const BAND_CLASS = {
  "양호한 쪽 25%": "good", "상위권": "good", "불리한 쪽 25%": "bad", "하위권": "bad",
  "중간": "mid", "중위권": "mid", "높은 쪽 25%": "ctx", "낮은 쪽 25%": "ctx", "높은 편": "ctx", "낮은 편": "ctx",
};

function rowsHtml(rows, refLabel = "전국 중앙값") {
  return `<table class="hp-table"><thead><tr><th>지표</th><th>값</th><th>${refLabel}</th><th>위치</th></tr></thead><tbody>${rows
    .map((r) => {
      const unit = r.unit && r.unit !== "%" ? `<span class="hp-unit">${esc(r.unit)}</span>` : "";
      const band = r.band ? `<span class="hp-band ${BAND_CLASS[r.band] || "mid"}">${esc(r.band)}</span>` : r.subs ? `<span class="hp-band mid">보건소별</span>` : "–";
      const subs = r.subs
        ? `<tr class="hp-subs"><td colspan="4">보건소 단위 조사: ${r.subs
            .map(([n, v, b]) => `${esc(n)} ${num(v, r.unit)}${b ? ` <span class="hp-band ${BAND_CLASS[b] || "mid"}">${esc(b)}</span>` : ""}`)
            .join(" · ")}</td></tr>`
        : "";
      return `<tr><td>${esc(r.name)} <span class="hp-year">${esc(String(r.year))}</span>${unit}</td><td><b>${num(r.v, r.unit)}</b></td><td>${num(r.med, r.unit)}</td><td>${band}</td></tr>${subs}`;
    })
    .join("")}</tbody></table>`;
}

const FOOT_SGG =
  "지역사회건강조사 지표는 조사 단위 258곳, 그 밖의 지표는 시군구 229곳과 비교합니다. 「위치」는 정확한 순위가 아니라 구간입니다. " +
  "설문 지표의 차이는 표본오차 범위일 수 있습니다.";
const FOOT_SIDO = "17개 시도와 비교해 3등분(상위권 = 양호한 쪽)으로 표시합니다. 맥락 지표(고령인구비율·박탈지수)는 좋고 나쁨이 아니라 높고 낮음입니다.";

export function cityHtml(city) {
  return {
    sub: `${esc(city.full || "")}`,
    head: `<div class="cp-pop">인구 <b>${manwon(city.population)}</b>명 <span class="muted">(주민등록 2024)</span></div>`,
    sections: [
      { title: "건강 지표", html: rowsHtml(city.health || []) },
      { title: "더 보기", html: `<a class="hp-link" href="${DASH}#view=profile&sgg=${encodeURIComponent(city.id)}" target="_blank" rel="noopener">health-profile.kr 지역 프로파일에서 자세히 보기 ↗</a>` },
    ],
    foot: FOOT_SGG,
  };
}

export function stateHtml(st, cities) {
  const list = cities
    .filter((c) => c.sido === st.fips)
    .slice(0, 8)
    .map((c) => `<button class="city-row" data-city="${esc(c.id)}"><span class="cr-name">${esc(c.name)}</span><span class="cr-pop">${manwon(c.population)}</span><span class="cr-go" aria-hidden="true">›</span></button>`)
    .join("");
  return {
    sub: "",
    head: `<div class="cp-pop">인구 <b>${manwon(st.population)}</b>명 <span class="muted">(주민등록 2024)</span></div>`,
    sections: [
      { title: "건강 지표(시도 값)", html: rowsHtml(st.health || [], "17개 시도 중앙값") },
      { title: "인구가 많은 시군구", html: `<div class="city-list">${list}</div>` },
      { title: "더 보기", html: `<a class="hp-link" href="${DASH}#view=profile&sido=${encodeURIComponent(st.fips)}" target="_blank" rel="noopener">health-profile.kr 시도 프로파일에서 자세히 보기 ↗</a>` },
    ],
    foot: FOOT_SIDO,
  };
}
