// Keyboard & mouse cheat-sheet.
import { icon } from "../ui/icon.js";

const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");
const MOD = isMac ? "⌘" : "Ctrl";

const ROWS = [
  ["움직이기", [
    [["끌기", "←↑→↓", "WASD"], "지도 옮기기"],
    [["스크롤", "+", "–"], "확대·축소"],
    [["두 번 누르기"], "그 자리 확대"],
    [["두 손가락"], "모으고 벌려 확대·축소, 끌어 이동(터치)"],
    [["작은 지도"], "누르거나 끌어 이동"],
  ]],
  ["살펴보기", [
    [["시군구 배너"], "그 시군구 건강 지표"],
    [["땅 누르기"], "그 시도 건강 지표"],
    [["/", `${MOD} K`], "시군구·시도 검색"],
    [["L", "Shift L"], "다음 / 이전 지표"],
    [["범례"], "막대 위에 올리거나 끌면 그 구간 지역만"],
  ]],
  ["창", [
    [["?"], "이 도움말"],
    [["Esc"], "도움말·검색·자료 출처, 다음에 패널 닫기"],
  ]],
];

export function initHelp() {
  const modal = document.getElementById("help");
  if (!modal) return { open() {}, close() {}, get isOpen() { return false; } };
  const card = modal.querySelector(".help-card");
  let restore = null;
  card.innerHTML = `
    <button class="icon-btn help-close" data-close aria-label="도움말 닫기">${icon("close", "✕", { size: 13 })}</button>
    <h2 id="help-title">${icon("help", "?", { size: 22 })}<span>조작법</span></h2>
    <div class="help-cols">${ROWS.map(([title, rows]) => `
      <section><h3>${title}</h3>${rows.map(([keys, what]) => `
        <div class="help-row"><span class="keys">${keys.map((k) => `<kbd>${k}</kbd>`).join("")}</span><span>${what}</span></div>`).join("")}
      </section>`).join("")}</div>
    <p class="help-foot">모든 숫자는 공개 자료에서 왔습니다. <b>자료 출처</b>에서 확인하세요. 주소창 링크를 열면 지금 보는 화면이 그대로 열립니다.<br>
      지도 그리기 코드는 Andrej Karpathy 의 <a href="https://karpathy.ai/usaciv/" target="_blank" rel="noopener">usaciv</a>(MIT License, Copyright (c) 2026 Andrej Karpathy)를 고쳐 썼습니다 — <a href="LICENSE-usaciv.txt" target="_blank">라이선스 전문</a>.
      건강 지표는 <a href="../" target="_blank" rel="noopener">health-profile.kr 대시보드</a>와 같은 자료입니다.</p>`;

  const close = () => {
    if (modal.hidden) return;
    modal.hidden = true;
    if (restore && document.contains(restore)) restore.focus();
    restore = null;
  };
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.closest("[data-close]")) close();
  });
  modal.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    e.preventDefault(); // the only focusable control is the close button
    card.querySelector("[data-close]").focus();
  });

  return {
    open() {
      if (!modal.hidden) return;
      restore = document.activeElement;
      modal.hidden = false;
      card.querySelector("[data-close]").focus();
    },
    close,
    toggle() { modal.hidden ? this.open() : close(); },
    get isOpen() { return !modal.hidden; },
  };
}
