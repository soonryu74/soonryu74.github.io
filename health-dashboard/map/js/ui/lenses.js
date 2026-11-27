// Lens dock: a quick row (Terrain + the 3 most recent lenses), a grouped lens picker, and a rich legend with a
// histogram of hex values whose ramp can be hovered or dragged to highlight a band of values on the map.
import { compact, esc } from "../format.js";
import { lensScale } from "../world.js";
import { rampColor, parseHex } from "../color.js";
import { icon, glyph } from "./icon.js";

export { glyph };

// Whole numbers read as integers, but a real fractional value under 10 keeps 1–2 significant digits so a sparse
// cell (0.34 people/km²) never shows as "0".
const intish = (v) =>
  Number.isInteger(v) || Math.abs(v) >= 10 ? compact(v) : Math.abs(v) < 1 ? String(+v.toPrecision(1)) : v.toFixed(1);

export function formatLensValue(lens, v) {
  if (v == null || !Number.isFinite(v)) return "자료 없음";
  switch (lens.format) {
    case "category": return lens.categories?.[Math.round(v)]?.name ?? "자료 없음";
    case "usd": return "$" + compact(v);
    case "pct": return (v * 100).toFixed(v < 0.1 ? 1 : 0) + "%";
    case "int": return intish(v) + (lens.unit?.startsWith("people") ? " /km²" : lens.unit ? " " + lens.unit : "");
    case "minutes": return v.toFixed(0) + " min";
    case "years": return v.toFixed(1) + " yrs";
    case "float": return v.toFixed(lens.decimals ?? 1) + (lens.unit === "%" ? "%" : lens.unit ? " " + lens.unit : ""); // 한국판: 지표 소수 자리 그대로
  }
  if (lens.unit?.includes("$")) return "$" + compact(v);
  return (v < 10 ? v.toFixed(1) : compact(v)) + (lens.unit?.startsWith("people") ? " /km²" : "");
}

// A legend tick: the number alone (a long unit such as "adherents per 100 residents" is printed once on the legend's
// unit line instead, so five ticks never overprint), "0" rather than "≤ 0.0" when the scale starts at zero, and
// ≤ / ≥ on the ends because the ramp clamps values beyond its domain.
export function formatLensTick(lens, t, k = -1) {
  const raw = lensValueAt(lens, t);
  const v = lens.format === "int" && Number.isFinite(raw) ? Math.round(raw) : raw; // a count never reads "4.5"
  const short = (lens.format === "int" || lens.format === "float") && lens.unit && lens.unit.length > 4
    && !(lens.format === "int" && lens.unit.startsWith("people")) ? { ...lens, unit: null } : lens;
  let s = formatLensValue(short, v);
  const zero = Number.isFinite(v) && Math.abs(v) < 1e-9;
  if (zero) s = s.replace(/^(\$?)0\.0+(?!\d)/, (_, d) => d + "0");
  if (k === 0 && !zero) s = "≤ " + s;
  else if (k === 4) s = "≥ " + s;
  return s;
}

// Value at position t (0..1) along the lens ramp: the inverse of world.js lensScale().
export function lensValueAt(lens, t) {
  const [d0, d1] = lens.domain;
  if (lens.scale === "log") return Math.exp(Math.log(d0) + t * (Math.log(d1) - Math.log(d0)));
  return d0 + t * (d1 - d0);
}

const TERRAIN = { id: null, icon: "terrain", emoji: "🗺️", name: "지형" };
const RECENT_KEY = "civusa.recentLenses";
const DEFAULT_RECENT = ["density", "income", "bachelors"];
const BINS = 40;
const HOVER_HALF = 0.08; // half-width of the hover band, in ramp units
const QUANT = 80; // band edges snap to 1/80 of the ramp so tiny mouse moves don't re-render the map

const loadRecent = () => {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || "null");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : null;
  } catch {
    return null;
  }
};
const saveRecent = (ids) => {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(ids)); } catch { /* private mode: fine */ }
};

/**
 * opts: {lenses (lenses.json), sources (sources.json list), w (prepared world), onPick(lens|null), onBand(band|null)}
 */
export function initLensDock(opts) {
  const { lenses: lensFile, w } = opts;
  const lenses = lensFile?.lenses || [];
  const sources = opts.sources || [];
  const byId = new Map(lenses.map((l) => [l.id, l]));
  const quick = document.getElementById("lens-quick");
  const moreBtn = document.getElementById("btn-lenses");
  const picker = document.getElementById("lens-picker");
  const legend = document.getElementById("legend");
  let active = null;
  let band = null;
  let recent = (loadRecent() || DEFAULT_RECENT).filter((id) => byId.has(id));
  for (const l of lenses) if (recent.length < 3 && !recent.includes(l.id)) recent.push(l.id);
  recent = recent.slice(0, 3);
  let restoreFocus = null;
  const histCache = new Map();

  // ---- quick row + picker -------------------------------------------------------------------------------------
  // CSS gradient stops: a smooth ramp, or hard-edged blocks for a categorical lens.
  const rampStops = (l) => (l.format === "category"
    ? l.ramp.map((c, k, a) => `${esc(c)} ${(k / a.length) * 100}% ${((k + 1) / a.length) * 100}%`).join(",")
    : l.ramp.map(esc).join(","));
  const isActive = (l) => (l.id ?? null) === (active?.id ?? null);
  const quickBtn = (l) =>
    `<button class="lens-btn ${isActive(l) ? "active" : ""}" data-id="${esc(l.id ?? "")}" aria-pressed="${isActive(l)}"
      title="${esc(l.name)}${l.id ? " lens" : " (no lens)"}">${glyph(l, 15)}<span>${esc(l.name)}</span></button>`;

  function renderQuick() {
    const row = [TERRAIN, ...recent.map((id) => byId.get(id)).filter(Boolean)];
    quick.innerHTML = row.map(quickBtn).join("");
    const inRow = !active || recent.includes(active.id);
    moreBtn.classList.toggle("active", !inRow);
    moreBtn.innerHTML = `${icon("layers", "▤", { size: 15 })}<span>${inRow ? "지표" : esc(active.name)}</span><span class="caret" aria-hidden="true">▾</span>`;
    moreBtn.title = "All lenses (L cycles)";
    moreBtn.hidden = !lenses.length;
  }

  function renderPicker() {
    const groups = [...(lensFile?.groups || [])];
    const known = new Set(groups.map((g) => g.id));
    if (lenses.some((l) => !known.has(l.group))) groups.push({ id: "__other", name: "기타" });
    const tile = (l) => `<button class="lp-tile ${isActive(l) ? "active" : ""}" data-id="${esc(l.id ?? "")}" aria-pressed="${isActive(l)}"
        title="${esc(l.description || l.name)}">
        <span class="lp-ic">${glyph(l, 20)}</span><span class="lp-nm">${esc(l.name)}</span>
        ${l.ramp ? `<i class="lp-ramp" style="background:linear-gradient(90deg, ${rampStops(l)})"></i>` : `<i class="lp-ramp terrain"></i>`}
      </button>`;
    const sec = (g, items) => !items.length ? "" : `<section class="lp-group"><h4>${icon(g.icon || `g-${g.id}`, "", { size: 14 })}${esc(g.name)}</h4>
        <div class="lp-tiles">${items.map(tile).join("")}</div></section>`;
    picker.innerHTML = `<div class="lp-head"><span>지도에 칠할 지표</span><button class="icon-btn lp-close" aria-label="지표 고르기 닫기">${icon("close", "✕", { size: 12 })}</button></div>
      <div class="lp-body">
      ${sec({ id: "base", name: "기본 지도", icon: "terrain" }, [TERRAIN])}
      ${groups.map((g) => sec(g, lenses.filter((l) => (g.id === "__other" ? !known.has(l.group) : l.group === g.id)))).join("")}
      </div>`;
  }

  function pick(id, fromPicker) {
    const lens = id ? byId.get(id) || null : null;
    if (lens && fromPicker && !recent.includes(lens.id)) {
      recent = [lens.id, ...recent].slice(0, 3);
      saveRecent(recent);
    }
    opts.onPick(lens);
  }

  quick.onclick = (e) => {
    const b = e.target.closest("button[data-id]");
    if (b) pick(b.dataset.id, false);
  };
  picker.onclick = (e) => {
    if (e.target.closest(".lp-close")) return closePicker();
    const b = e.target.closest("button[data-id]");
    if (!b) return;
    pick(b.dataset.id, true);
    closePicker();
  };
  moreBtn.onclick = () => (picker.hidden ? openPicker() : closePicker());
  document.addEventListener("pointerdown", (e) => {
    if (!picker.hidden && !picker.contains(e.target) && !moreBtn.contains(e.target)) closePicker(false);
  });
  picker.addEventListener("keydown", (e) => {
    const tiles = [...picker.querySelectorAll(".lp-tile")];
    const i = tiles.indexOf(document.activeElement);
    if (i < 0) return;
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (step) {
      e.preventDefault();
      tiles[(i + step + tiles.length) % tiles.length].focus();
    }
  });

  function openPicker() {
    renderPicker();
    restoreFocus = document.activeElement;
    picker.hidden = false;
    legend.classList.add("behind");
    moreBtn.setAttribute("aria-expanded", "true");
    (picker.querySelector(".lp-tile.active") || picker.querySelector(".lp-tile"))?.focus();
  }
  function closePicker(restore = true) {
    if (picker.hidden) return;
    picker.hidden = true;
    legend.classList.remove("behind");
    moreBtn.setAttribute("aria-expanded", "false");
    if (restore && restoreFocus && document.contains(restoreFocus)) restoreFocus.focus();
    else if (restore) moreBtn.focus();
  }

  // ---- legend ---------------------------------------------------------------------------------------------------
  function histogram(lens) {
    if (histCache.has(lens.id)) return histCache.get(lens.id);
    const counts = new Array(BINS).fill(0);
    const t = lensScale(lens);
    const owner = w.raw.owner;
    let n = 0;
    for (let i = 0; i < lens.values.length; i++) {
      const v = lens.values[i];
      if (v == null || owner[i] < 0) continue;
      const tv = t(v);
      if (!Number.isFinite(tv)) continue;
      counts[Math.max(0, Math.min(BINS - 1, Math.floor(tv * BINS)))]++;
      n++;
    }
    const h = { counts, n, max: Math.max(1, ...counts) };
    histCache.set(lens.id, h);
    return h;
  }

  function sourceLine(lens) {
    const src = sources.find((s) => s.id === lens.source);
    const name = src ? src.publisher && src.title.length > 44 ? src.publisher : src.title : lens.source;
    const vintage = lens.year ? `${lens.year}년` : src?.vintage || lensFile?.vintage || "";
    return [name, vintage].filter(Boolean).map(esc).join(" · ");
  }

  // Categorical lenses (format "category"): values are indices into lens.categories, whose colours are the ramp
  // stops (domain [0, n-1], linear), so world.js colours them exactly. The legend is a row of swatches; clicking
  // one shows only that category (the same band mechanism as the histogram).
  const isCategorical = (l) => l?.format === "category" && Array.isArray(l.categories) && l.categories.length > 0;
  const catBand = (l, k) => {
    const n = l.categories.length;
    if (n < 2) return [-Infinity, Infinity];
    const h = 0.5 / (n - 1);
    return [k === 0 ? -Infinity : k / (n - 1) - h, k === n - 1 ? Infinity : k / (n - 1) + h];
  };
  const catCounts = (l) => {
    const key = `cat:${l.id}`;
    if (histCache.has(key)) return histCache.get(key);
    const counts = new Array(l.categories.length).fill(0);
    const owner = w.raw.owner;
    for (let i = 0; i < l.values.length; i++) {
      const v = l.values[i];
      if (v == null || owner[i] < 0) continue;
      const k = Math.round(v);
      if (k >= 0 && k < counts.length) counts[k]++;
    }
    histCache.set(key, counts);
    return counts;
  };
  const noteHtml = (l) => (l.note ? `<div class="lg-note">${esc(l.note)}</div>` : "");

  function renderCategoricalLegend(l) {
    const counts = catCounts(l);
    const sw = l.categories.map((c, k) => `<button type="button" class="lg-cat" data-k="${k}" aria-pressed="false"
        title="${esc(c.description || c.name)} (${counts[k]} hexes)"><i style="background:${esc(c.color || l.ramp[k] || "#888")}"></i><span>${esc(c.name)}</span></button>`).join("");
    legend.hidden = false;
    legend.innerHTML = `
      <div class="lg-head"><span class="lg-ic">${glyph(l, 18)}</span><span class="title">${esc(l.name)}</span>
        <button class="icon-btn lg-more" aria-expanded="${legendExpanded}" aria-label="범례 전체 보기" title="자세히">${legendExpanded ? "−" : "+"}</button>
        <button class="icon-btn lg-close" aria-label="지표 끄기(지형으로)" title="지형으로">${icon("close", "✕", { size: 11 })}</button></div>
      <div class="desc">${esc(l.description || l.unit || "")}</div>
      ${noteHtml(l)}
      <div class="lg-cats" role="group" aria-label="${esc(l.name)} categories: click one to show only it">${sw}</div>
      <div class="lg-meta"><span class="src">${sourceLine(l)}</span></div>
      <div class="lg-hint" aria-live="polite">항목을 누르면 그 항목만 보입니다</div>`;
    legend.querySelector(".lg-close").onclick = () => opts.onPick(null);
    legend.classList.toggle("expanded", legendExpanded);
    legend.querySelector(".lg-more").onclick = () => {
      legendExpanded = !legendExpanded;
      renderLegend();
    };
    legend.querySelector(".lg-cats").onclick = (e) => {
      const b = e.target.closest(".lg-cat");
      if (!b) return;
      const nb = catBand(l, +b.dataset.k);
      setBand(same(nb, band) ? null : nb);
    };
  }

  function showCategoricalBand() {
    const l = active;
    const hint = legend.querySelector(".lg-hint");
    let picked = -1;
    legend.querySelectorAll(".lg-cat").forEach((b) => {
      const on = !!band && same(catBand(l, +b.dataset.k), band);
      if (on) picked = +b.dataset.k;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", String(on));
    });
    legend.querySelector(".lg-cats")?.classList.toggle("filtered", !!band);
    if (hint) {
      hint.textContent = picked >= 0 ? `${l.categories[picked].name}만 표시 중` : "항목을 누르면 그 항목만 보입니다";
      hint.classList.toggle("on", picked >= 0);
    }
  }

  let legendExpanded = false;
  function renderLegend() {
    if (!active) {
      legend.hidden = true;
      legend.innerHTML = "";
      return;
    }
    const l = active;
    if (isCategorical(l)) return renderCategoricalLegend(l);
    const ticks = [0, 0.25, 0.5, 0.75, 1]
      .map((t, k) => `<span style="left:${t * 100}%;transform:translateX(-${t * 100}%)">${esc(formatLensTick(l, t, k))}</span>`)
      .join("");
    const hib = l.higher_is === "good" ? `<span class="hib good">▲ 높을수록 양호</span>`
      : l.higher_is === "bad" ? `<span class="hib bad">▲ 높을수록 불리</span>` : "";
    legend.hidden = false;
    legend.innerHTML = `
      <div class="lg-head"><span class="lg-ic">${glyph(l, 18)}</span><span class="title">${esc(l.name)}</span>
        <button class="icon-btn lg-more" aria-expanded="${legendExpanded}" aria-label="범례 전체 보기" title="자세히">${legendExpanded ? "−" : "+"}</button>
        <button class="icon-btn lg-close" aria-label="지표 끄기(지형으로)" title="지형으로">${icon("close", "✕", { size: 11 })}</button></div>
      <div class="desc">${esc(l.description || l.unit || "")}</div>
      ${noteHtml(l)}
      <div class="lg-scale" role="slider" tabindex="0" aria-label="Highlight a range of ${esc(l.name)} values. Hover or drag; arrow keys move the highlight, Escape clears it."
        aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">
        <canvas class="lg-hist" aria-hidden="true"></canvas>
        <div class="ramp" style="background:linear-gradient(90deg, ${l.ramp.map(esc).join(",")})"><div class="band-mark" hidden></div></div>
      </div>
      <div class="ticks">${ticks}</div>
      ${l.unit ? `<div class="lg-unit">${esc(l.unit)}</div>` : ""}
      <div class="lg-meta">${hib}<span class="src">${l.unit ? esc(l.unit) + " · " : ""}${sourceLine(l)}</span></div>
      <div class="lg-hint" aria-live="polite">막대 위에 올리거나 끌면 그 구간 지역만 보입니다</div>`;
    legend.querySelector(".lg-close").onclick = () => opts.onPick(null);
    legend.classList.toggle("expanded", legendExpanded);
    legend.querySelector(".lg-more").onclick = () => {
      // Beside a docked dashboard the legend is a compact strip; this expands it (and remembers it for the session).
      legendExpanded = !legendExpanded;
      renderLegend();
    };
    wireScale(legend.querySelector(".lg-scale"));
    drawHist();
  }

  function drawHist() {
    const cv = legend.querySelector(".lg-hist");
    if (!cv || !active) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = cv.clientWidth || 256, cssH = cv.clientHeight || 38;
    if (cv.width !== Math.round(cssW * dpr)) cv.width = Math.round(cssW * dpr);
    if (cv.height !== Math.round(cssH * dpr)) cv.height = Math.round(cssH * dpr);
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!active.ramp) return;
    ctx.clearRect(0, 0, cssW, cssH);
    const h = histogram(active);
    const stops = active.ramp.map(parseHex);
    const bw = cssW / BINS;
    for (let b = 0; b < BINS; b++) {
      const c = h.counts[b];
      if (!c) continue;
      const tc = (b + 0.5) / BINS;
      const hh = Math.max(1.5, Math.sqrt(c / h.max) * (cssH - 2));
      const inBand = !band || (tc >= band[0] && tc <= band[1]);
      const [r, g, bl] = rampColor(stops, tc);
      ctx.fillStyle = `rgba(${r | 0},${g | 0},${bl | 0},${inBand ? 1 : 0.22})`;
      ctx.fillRect(b * bw + 0.5, cssH - hh, Math.max(1, bw - 1), hh);
    }
    ctx.fillStyle = "rgba(201,164,92,.45)";
    ctx.fillRect(0, cssH - 1, cssW, 1);
  }

  function showBand() {
    if (isCategorical(active)) return showCategoricalBand();
    const mark = legend.querySelector(".band-mark");
    const hint = legend.querySelector(".lg-hint");
    const scale = legend.querySelector(".lg-scale");
    if (!mark || !active) return;
    if (!band) {
      mark.hidden = true;
      hint.textContent = "막대 위에 올리거나 끌면 그 구간 지역만 보입니다";
      hint.classList.remove("on");
    } else {
      const a = Math.max(0, band[0]), b = Math.min(1, band[1]);
      mark.hidden = false;
      mark.style.left = a * 100 + "%";
      mark.style.width = Math.max(0.5, (b - a) * 100) + "%";
      const lo = band[0] <= 0 ? "≤ " + formatLensValue(active, lensValueAt(active, b)) : null;
      const hi = band[1] >= 1 ? "≥ " + formatLensValue(active, lensValueAt(active, a)) : null;
      const txt = band[0] <= 0 && band[1] >= 1 ? "all values"
        : lo || hi || `${formatLensValue(active, lensValueAt(active, a))} – ${formatLensValue(active, lensValueAt(active, b))}`;
      hint.textContent = `${txt} 구간만 표시 중`;
      hint.classList.add("on");
      scale.setAttribute("aria-valuenow", String(Math.round(((a + b) / 2) * 100)));
    }
    drawHist();
  }

  // Normalise a raw [t0, t1] into a quantised band that reaches past the ends of the ramp when it touches them
  // (so "the top" includes values above the domain).
  function normBand(t0, t1) {
    let a = Math.min(t0, t1), b = Math.max(t0, t1);
    a = Math.round(a * QUANT) / QUANT;
    b = Math.round(b * QUANT) / QUANT;
    if (b - a < 1 / QUANT) b = a + 1 / QUANT;
    return [a <= 0 ? -Infinity : a, b >= 1 ? Infinity : b];
  }
  const same = (p, q) => (p === q) || (p && q && p[0] === q[0] && p[1] === q[1]);
  function setBand(b) {
    if (same(b, band)) return;
    band = b;
    showBand();
    opts.onBand(b);
  }

  function wireScale(el) {
    let dragFrom = null;
    let center = 0.5;
    const tAt = (e) => {
      const r = el.getBoundingClientRect();
      return Math.max(0, Math.min(1, (e.clientX - r.left) / Math.max(1, r.width)));
    };
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      dragFrom = tAt(e);
      setBand(normBand(dragFrom - HOVER_HALF / 2, dragFrom + HOVER_HALF / 2));
    });
    el.addEventListener("pointermove", (e) => {
      const t = tAt(e);
      center = t;
      if (dragFrom != null) {
        if (Math.abs(t - dragFrom) > 0.01) setBand(normBand(dragFrom, t));
      } else if (e.pointerType === "mouse") {
        // Near either end the band runs off the ramp, so "the top" includes values above the domain.
        let a = t - HOVER_HALF, b = t + HOVER_HALF;
        if (b > 0.96) b = 1;
        if (a < 0.04) a = 0;
        setBand(normBand(a, b));
      }
    });
    const end = (e) => {
      if (dragFrom == null) return;
      const wasTap = Math.abs(tAt(e) - dragFrom) <= 0.01;
      dragFrom = null;
      // Touch: a tap with no drag clears the highlight; a drag keeps it until the next tap.
      if (e.pointerType !== "mouse" && wasTap) setBand(null);
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", () => (dragFrom = null));
    el.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse" && dragFrom == null) setBand(null);
    });
    el.addEventListener("keydown", (e) => {
      const step = { ArrowRight: 0.05, ArrowUp: 0.05, ArrowLeft: -0.05, ArrowDown: -0.05 }[e.key];
      if (step) {
        e.preventDefault();
        center = Math.max(0, Math.min(1, center + step));
        setBand(normBand(center - HOVER_HALF, center + HOVER_HALF));
      } else if (e.key === "Escape" && band) {
        e.stopPropagation();
        setBand(null);
      }
    });
    el.addEventListener("blur", () => band && dragFrom == null && setBand(null));
  }

  window.addEventListener("resize", () => drawHist());

  return {
    // Called by main whenever the lens changes (band is reset by main at the same time).
    render(lens, b = null) {
      active = lens;
      band = b;
      renderQuick();
      if (!picker.hidden) renderPicker();
      renderLegend();
      showBand();
    },
    remember(id) {
      if (!byId.has(id) || recent.includes(id)) return;
      recent = [id, ...recent].slice(0, 3);
      saveRecent(recent);
      renderQuick();
    },
    openPicker,
    closePicker,
    clearBand() { setBand(null); },
    get pickerOpen() { return !picker.hidden; },
    get band() { return band; },
  };
}
