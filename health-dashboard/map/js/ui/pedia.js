// The Almanac: what every number means and exactly where it comes from.
import { resolveTables } from "../terrain.js";
import { esc } from "../format.js";
import { parseHex, luminance } from "../color.js";
import { icon, glyph } from "./icon.js";

const COVER_ICON = { forest_deciduous: "l-forest", forest_evergreen: "l-forest", forest_mixed: "l-forest", cropland: "l-farmland", pasture: "l-farmland", urban: "l-developed" };
// Glyph colour that reads on a resource medallion (dark on light faces such as nuclear yellow or silver).
const inkOn = (hex) => {
  try { return /^#[0-9a-f]{6}$/i.test(hex || "") && luminance(parseHex(hex)) > 0.4 ? "#1c1710" : "#f8f0d8"; } catch { return "#f8f0d8"; }
};
const CATEGORY = { energy: "Energy", mineral: "Minerals", agri: "Agriculture" };

export function initPedia(data) {
  const modal = document.getElementById("pedia");
  const card = modal.querySelector(".modal-card");
  const nav = document.getElementById("pedia-nav");
  const body = document.getElementById("pedia-body");
  const srcName = (id) => data.sources?.find((s) => s.id === id)?.title || id || "";
  let restoreFocus = null;

  const h2 = (ic, fb, text) => `<h2>${icon(ic, fb, { size: 24 })}<span>${esc(text)}</span></h2>`;

  // 한국판 자료 출처 창: 이 지도에 대하여 · 지형 · 지표 · 자료 출처
  const pages = {
    "이 지도에 대하여": () => `
      ${h2("pedia", "📖", "이 지도에 대하여")}
      <p>대한민국을 약 2.5 km 육각형 칸(칸 넓이 약 16 km²)으로 나누고, 실제 고도·토지피복으로 지형을 그린 뒤
      <a href="../" target="_blank" rel="noopener">health-profile.kr 대시보드</a>의 건강 지표를 시군구별로 칠한 <b>둘러보기용 지도</b>입니다.
      순위를 매기거나 사업 성과를 평가하는 도구가 아닙니다.</p>
      <h4>칸에 값을 넣는 방법</h4>
      <p>칸마다 7개 표본점을 찍어 가장 많이 들어간 시군구(통계청 2018 경계)의 값을 씁니다. 지역사회건강조사 지표는 보건소 조사 단위
      (예: 수원시 장안구·권선구)까지 나눠 칠하고, 값이 없는 칸은 회색(자료 없음)으로 둡니다 — 시도 값으로 채우지 않습니다.
      부산 중구처럼 칸 하나보다 작은 구도 최소 1칸을 갖도록 했지만, 도심 구는 칸 수가 적어 지도 위 크기가 실제 인구를 반영하지 않습니다.</p>
      <h4>지역을 누르면</h4>
      <p>시군구 배너나 땅을 누르면 건강 지표 12개의 값, 전국 중앙값, 분포 속 위치(양호한 쪽 25% · 중간 · 불리한 쪽 25%)를 보여 줍니다.
      정확한 순위 대신 구간으로만 표시합니다. 설문 지표의 차이는 표본오차 범위일 수 있습니다.</p>
      <h4>코드</h4>
      <p class="muted">지도 그리기·카메라·렌즈 화면은 Andrej Karpathy 의 usaciv(MIT License)를 고쳐 썼습니다.
      미국 경제 자료용 기능(도시 화면·자문관·도로·군사·무역 층)은 넣지 않았습니다.</p>`,
    지형: () => {
      const t = resolveTables(data.world.tables);
      const notes = data.world.tables?.notes || {};
      const row = (x) => `<tr><td class="nm">${x.color ? `<span class="swatch" style="background:${esc(x.color)}"></span>` : ""}<b>${esc(x.name)}</b></td><td>${esc(x.rule || "")}</td></tr>`;
      return `
      ${h2("terrain", "🗺️", "지형")}
      <h4>토지피복</h4><p>${esc(notes.cover || "")}</p>
      <table>${t.cover.filter((x) => x.id > 0).map(row).join("")}</table>
      <h4>산지 구분</h4><p>${esc(notes.relief || "")}</p>
      <table>${t.relief.map(row).join("")}</table>
      <h4>물</h4><p>${esc(notes.water || "")}</p>
      <table>${t.water.filter((x) => x.id > 0).map(row).join("")}</table>
      <h4>국경 밖</h4><p class="muted">북한·중국·일본 땅은 흐리게 배경으로만 그립니다(자료 없음).</p>`;
    },
    지표: () => `
      ${h2("layers", "▤", "지표")}
      <p>오른쪽 아래 「지표」에서 고르면 지도를 그 지표로 칠합니다. 범례 막대 위에 올리거나 끌면 그 구간 지역만 보입니다.
      색 범위는 칸 값의 2~98백분위입니다(그 밖의 값은 끝 색).</p>
      ${(data.lenses.groups || []).map((g) => {
        const ls = data.lenses.lenses.filter((l) => l.group === g.id);
        if (!ls.length) return "";
        return `<h3 class="grp">${esc(g.name)}</h3>${ls.map((l) => `
          <div class="lens-entry"><div>
          <h4>${esc(l.name)}</h4><p>${esc(l.description)}<br>
          <i class="le-ramp" style="background:linear-gradient(90deg, ${(l.ramp || []).map(esc).join(",")})"></i>
          <span class="muted">${l.higher_is === "good" ? "높을수록 양호" : l.higher_is === "bad" ? "높을수록 불리" : "맥락 지표(좋고 나쁨 없음)"}${l.note ? " · " + esc(l.note) : ""}</span></p></div></div>`).join("")}`;
      }).join("")}`,
    "자료 출처": () => `
      ${h2("pedia", "📖", "자료 출처")}
      ${data.sources.map((s) => `
        <h4>${esc(s.title)}</h4>
        <p>${s.used_for?.length ? `쓰인 곳: ${esc(s.used_for.join(", "))}<br>` : ""}
        <span class="muted">${esc(s.publisher)} · ${esc(s.license)}${s.vintage ? " · " + esc(s.vintage) : ""} ·
        <a href="${esc(s.homepage)}" target="_blank" rel="noopener">홈페이지</a></span></p>`).join("")}`,
  };

  const show = (name) => {
    if (!pages[name]) name = "이 지도에 대하여";
    body.innerHTML = pages[name]();
    body.scrollTop = 0;
    nav.querySelectorAll("button").forEach((b) => {
      const on = b.dataset.page === name;
      b.classList.toggle("active", on);
      b.setAttribute("aria-current", on ? "page" : "false");
    });
  };
  nav.innerHTML = `<div class="hd">자료 출처</div>` + Object.keys(pages).map((p) => `<button data-page="${esc(p)}">${esc(p)}</button>`).join("");
  nav.onclick = (e) => {
    const b = e.target.closest("button[data-page]");
    if (b) show(b.dataset.page);
  };
  const close = () => {
    if (modal.hidden) return;
    modal.hidden = true;
    if (restoreFocus && document.contains(restoreFocus)) restoreFocus.focus();
    restoreFocus = null;
  };
  modal.onclick = (e) => {
    if (e.target === modal || e.target.closest("[data-close]")) close();
  };
  // Keep Tab inside the dialog.
  modal.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const f = [...card.querySelectorAll("button, a[href], [tabindex]:not([tabindex='-1'])")].filter((x) => x.offsetParent);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  return {
    open(page = "이 지도에 대하여") {
      if (modal.hidden) restoreFocus = document.activeElement;
      show(page);
      modal.hidden = false;
      (nav.querySelector("button.active") || card.querySelector("[data-close]"))?.focus();
    },
    close,
    get isOpen() {
      return !modal.hidden;
    },
  };
}
