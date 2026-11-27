// Top-bar search over cities and states: prefix matches first, then word-prefix, then substring; ties by population.
import { esc, popShort } from "../format.js";
import { icon } from "../ui/icon.js";

const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const MAX = 8;

/**
 * opts: {cities, states (list of {name, abbr, population?}), onPick({kind:'city'|'state', city?, index?})}
 */
export function initSearch(opts) {
  const input = document.getElementById("search-input");
  const box = document.getElementById("search-results");
  if (!input || !box) return { focus() {}, close() {}, get isOpen() { return false; } };
  // The full placeholder only fits the wide search box; narrower ones say just "Search".
  const narrow = matchMedia("(max-width: 1120px)");
  const setPlaceholder = () => (input.placeholder = narrow.matches ? "검색" : "시군구·시도 검색");
  setPlaceholder();
  narrow.addEventListener?.("change", setPlaceholder);

  const entries = [];
  for (const c of opts.cities || []) {
    entries.push({ kind: "city", city: c, name: c.name, n: norm(c.name), full: norm(c.full), pop: c.population || 0,
      sub: c.full || "", label: c.name });
  }
  (opts.states || []).forEach((s, index) => {
    if (!s) return;
    entries.push({ kind: "state", index, name: s.name, n: norm(s.name), full: norm(s.abbr), abbr: (s.abbr || "").toLowerCase(),
      pop: s.population || 0, sub: "시도", label: s.name });
  });

  let results = [];
  let sel = -1;

  function score(e, q) {
    if (e.abbr && e.abbr === q) return 0;
    if (e.n.startsWith(q)) return e.n === q ? 0 : 1;
    if ((" " + e.n).includes(" " + q)) return 2;
    if ((" " + e.full).includes(" " + q)) return 3;
    if (e.n.includes(q)) return 4;
    if (e.full.includes(q)) return 5;
    return -1;
  }

  function query(q) {
    q = norm(q);
    if (!q) return [];
    const out = [];
    for (const e of entries) {
      const s = score(e, q);
      if (s >= 0) out.push([s, e]);
    }
    out.sort((a, b) => a[0] - b[0] || b[1].pop - a[1].pop);
    return out.slice(0, MAX).map((x) => x[1]);
  }

  function position() {
    const r = input.getBoundingClientRect();
    const width = Math.min(Math.max(r.width, 320), window.innerWidth - 16);
    box.style.top = r.bottom + 6 + "px";
    box.style.left = Math.max(8, Math.min(window.innerWidth - width - 8, r.left)) + "px";
    box.style.width = width + "px";
  }

  function render() {
    if (!results.length) {
      box.innerHTML = input.value.trim() ? `<div class="sr-empty">No city or state matches “${esc(input.value.trim())}”</div>` : "";
      box.hidden = !input.value.trim();
      input.setAttribute("aria-expanded", String(!box.hidden));
      input.removeAttribute("aria-activedescendant");
      if (!box.hidden) position();
      return;
    }
    box.innerHTML = results
      .map((e, i) => `<div class="sr-item ${i === sel ? "sel" : ""}" role="option" id="sr-${i}" aria-selected="${i === sel}" data-i="${i}">
        <span class="sr-ic">${e.kind === "state" ? icon("terrain", "🗺️", { size: 16 }) : icon("pop", "🏙️", { size: 16 })}</span>
        <span class="sr-main"><b>${esc(e.label)}</b><span class="sr-sub">${esc(e.sub)}</span></span>
        <span class="sr-pop">${e.pop ? popShort(e.pop) : ""}</span></div>`)
      .join("");
    box.hidden = false;
    input.setAttribute("aria-expanded", "true");
    if (sel >= 0) input.setAttribute("aria-activedescendant", `sr-${sel}`);
    else input.removeAttribute("aria-activedescendant");
    position();
  }

  function choose(i) {
    const e = results[i];
    if (!e) return;
    close();
    input.value = "";
    input.blur();
    opts.onPick(e.kind === "city" ? { kind: "city", city: e.city } : { kind: "state", index: e.index });
  }

  function close() {
    box.hidden = true;
    results = [];
    sel = -1;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }

  input.addEventListener("input", () => {
    results = query(input.value);
    sel = results.length ? 0 : -1;
    render();
  });
  input.addEventListener("focus", () => {
    if (input.value.trim()) {
      results = query(input.value);
      sel = results.length ? 0 : -1;
      render();
    }
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!results.length) return;
      sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length;
      render();
      box.querySelector(".sel")?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results.length) choose(Math.max(0, sel));
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (!box.hidden && input.value) { input.value = ""; close(); }
      else { close(); input.blur(); }
    }
  });
  input.addEventListener("blur", () => setTimeout(() => {
    if (document.activeElement !== input) close();
  }, 150));
  box.addEventListener("pointerdown", (e) => e.preventDefault()); // keep focus in the input
  box.addEventListener("click", (e) => {
    const it = e.target.closest(".sr-item");
    if (it) choose(+it.dataset.i);
  });
  box.addEventListener("pointermove", (e) => {
    const it = e.target.closest(".sr-item");
    if (it && +it.dataset.i !== sel) {
      sel = +it.dataset.i;
      box.querySelectorAll(".sr-item").forEach((x, i) => {
        x.classList.toggle("sel", i === sel);
        x.setAttribute("aria-selected", String(i === sel));
      });
    }
  });
  window.addEventListener("resize", () => !box.hidden && position());

  return {
    focus() {
      input.focus();
      input.select();
    },
    close() {
      close();
      input.blur();
    },
    query,
    get isOpen() { return document.activeElement === input || !box.hidden; },
  };
}
