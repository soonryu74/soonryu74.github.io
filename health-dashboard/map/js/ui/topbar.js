import { esc } from "../format.js";
import { icon, glyph } from "./icon.js";

// 한국판: 머리글 숫자는 인구·시군구 수만 보여 주는 표시(원본의 경제 보고서 버튼은 쓰지 않음).
export function renderTopbar(nation) {
  const pop = nation?.nation?.population;
  const items = [
    ["pop", "👥", "인구", pop ? `${(pop / 1e4).toLocaleString("ko-KR", { maximumFractionDigits: 0 })}만` : "–", "주민등록 인구(2024)"],
    ["hex", "⬡", "시군구", "229", "시군구 229곳(통계청 2018 경계 + 현재 행정구역 코드)"],
  ].map(([id, emoji, name, value, tip]) => `<span class="yield" title="${esc(tip)}" aria-label="${esc(name)} ${esc(value)}">
      <span class="ico">${icon(id, emoji, { size: 17 })}</span><span>${esc(name)} ${esc(value)}</span></span>`);
  const el = document.getElementById("yields");
  el.innerHTML = items.join("");
  const check = () => el.classList.toggle("clipped", el.scrollWidth > el.clientWidth + 1);
  if (typeof ResizeObserver === "function") new ResizeObserver(check).observe(el);
  check();
  watchBarOverflow(document.getElementById("topbar"));
  document.getElementById("turn").innerHTML = `칸 = 약 16 km² · 지표 2020–2025`;
}

// Phones scroll the whole bar sideways. Mark which ends have more to show (.more-l / .more-r) so CSS can fade
// them: without a cue the yields look cut off after the second or third value.
function watchBarOverflow(bar) {
  if (!bar || bar.dataset.overflowWatch) return;
  bar.dataset.overflowWatch = "1";
  let raf = 0;
  const update = () => {
    raf = 0;
    const max = bar.scrollWidth - bar.clientWidth;
    bar.classList.toggle("more-l", max > 1 && bar.scrollLeft > 1);
    bar.classList.toggle("more-r", max > 1 && bar.scrollLeft < max - 1);
  };
  const queue = () => { if (!raf) raf = requestAnimationFrame(update); };
  bar.addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", queue);
  if (typeof ResizeObserver === "function") {
    const ro = new ResizeObserver(queue);
    ro.observe(bar);
    for (const child of bar.children) ro.observe(child);
  }
  // Extensions add top-bar buttons later.
  if (typeof MutationObserver === "function") new MutationObserver(queue).observe(bar, { childList: true, subtree: true });
  queue();
}
