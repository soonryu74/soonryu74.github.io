/* Global Health Equity Radar v0.1 — GLOBAL SCREENING → PRIORITY → WHY → ACTION
   Data: World Bank WDI extract (data/wdi_compact.json, built and cross-checked by scripts/build_global.py).
   The relative-position calculation reuses the Korean Health Equity Radar engine (app/src/lib/equity/calculateGap.js)
   so both products use the same direction-aware, mid-rank percentile code. No predictions, no causal claims. */
import { unfavorablePercentile, medianOf } from "../../app/src/lib/equity/calculateGap.js";
import { geoNaturalEarth1, geoPath } from "../../app/node_modules/d3-geo/src/index.js";

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ── settings (published on the methodology page) ──
export const STALE_BEFORE = 2015;          // values observed before this year are shown but not used for signals or score
export const SIGNAL_CUT = 0.8;             // less favourable than ≥80% of income-group peers → Priority signal
export const WATCH_CUT = 0.6;              // 60–80% → Watch
export const MIN_PEERS = 10;               // fewer peers with data → compare with all countries instead
export const MIN_SCORE_INDICATORS = 8;     // fewer directional indicators → no exploratory score
// explicit exclusions from signals and score (published on the methodology page)
export const SIGNAL_EXCLUSIONS = [{ code: "SI.POV.DDAY", income: "High income", why: "Not used for signals in high-income economies: values at the $3.00/day line are near zero for most of them, so small differences are not meaningful." }];
export const freshness = (y) => (y >= 2024 ? "recent" : y >= 2022 ? "moderate" : y >= STALE_BEFORE ? "caution" : "old");
const FRESH_LABEL = { recent: "Recent", moderate: "Moderate", caution: "Caution", old: "Old — not used for signals" };
const DOMAINS = ["Health outcomes", "Disease burden", "Health system", "Social determinants", "Demographic context"];
const NAME_OVERRIDE = { KOR: "Republic of Korea", PRK: "Democratic People's Republic of Korea" };
const ALIASES = { KOR: ["korea", "south korea", "korea rep", "한국", "대한민국"], VNM: ["vietnam", "viet nam", "베트남"], USA: ["usa", "us", "america", "united states of america", "미국"], JPN: ["japan", "일본"], AUS: ["australia", "호주"], GBR: ["uk", "britain", "united kingdom", "영국"], UGA: ["uganda", "우간다"], TLS: ["east timor", "timor leste", "동티모르"], CHN: ["china", "중국"], RUS: ["russia"], IRN: ["iran"], EGY: ["egypt"], LAO: ["laos"], SYR: ["syria"], VEN: ["venezuela"], YEM: ["yemen"], TUR: ["turkey"], CZE: ["czech republic"], SVK: ["slovakia"], KGZ: ["kyrgyzstan"], COD: ["congo dr", "drc"], COG: ["congo republic"], GMB: ["gambia"], BHS: ["bahamas"], FSM: ["micronesia"] };

const S = { data: null, inds: null, rules: null, world: null, sel: null, vs: null, ind: "SH.XPD.OOPC.CH.ZS", open: null };
const dirParam = (d) => (d === "higher_is_concern" ? "lower_is_better" : d === "lower_is_concern" ? "higher_is_better" : null);
export const displayName = (code, name) => NAME_OVERRIDE[code] || name;

// ── formatting ──
const nf = (d) => new Intl.NumberFormat("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });
export function fmtValue(v, ind) {
  if (v == null || !Number.isFinite(v)) return "No data available";
  const u = ind.unit;
  if (ind.code === "SP.POP.TOTL") return v >= 1e9 ? `${nf(2).format(v / 1e9)} billion` : v >= 1e7 ? `${nf(1).format(v / 1e6)} million` : v >= 1e6 ? `${nf(2).format(v / 1e6)} million` : nf(0).format(v);
  if (u === "US$") return `US$ ${nf(0).format(v)}`;
  if (u === "%") return `${nf(1).format(v)}%`;
  if (u.startsWith("index")) return `${nf(0).format(v)}`;
  if (u === "years") return `${nf(1).format(v)} years`;
  if (u === "births per woman") return `${nf(2).format(v)}`;
  return nf(v < 10 ? 2 : 1).format(v);
}
const unitAfter = (ind) => (["%", "US$", "years"].includes(ind.unit) || ind.code === "SP.POP.TOTL" ? "" : ind.unit.startsWith("index") ? "index points (0–100)" : ind.unit);
const incomeShort = (g) => g.replace(" income", "-income").toLowerCase();

// ── comparison pools (computed once) ──
let POOLS = null;
function buildPools() {
  POOLS = {};
  for (const code of Object.keys(S.inds)) {
    const all = [];
    for (const [c, vals] of Object.entries(S.data.values)) {
      const x = vals[code];
      if (x && Number.isFinite(x[0]) && x[1] >= STALE_BEFORE) all.push({ c, v: x[0], y: x[1], inc: S.data.countries[c].income });
    }
    const byInc = {};
    for (const r of all) (byInc[r.inc] ||= []).push(r);
    POOLS[code] = { all, byInc };
  }
}

/** Relative position of one country on one indicator */
export function positionOf(c, code) {
  const ind = S.inds[code], x = S.data.values[c]?.[code];
  if (!x) return { code, ind, missing: true };
  const [v, y] = x, fr = freshness(y), inc = S.data.countries[c].income;
  const out = { code, ind, v, y, fresh: fr, inc };
  if (fr === "old") return { ...out, notCompared: `Observed in ${y}; values before ${STALE_BEFORE} are not compared.` };
  const ex = SIGNAL_EXCLUSIONS.find((e) => e.code === code && e.income === inc);
  if (ex) return { ...out, notCompared: ex.why };
  const P = POOLS[code];
  const peers = P.byInc[inc] || [];
  const usePeers = peers.length >= MIN_PEERS;
  const grp = usePeers ? peers : P.all;
  const d = dirParam(ind.direction);
  const calc = (pool) => {
    const vals = pool.map((r) => r.v);
    const p = unfavorablePercentile(v, vals, d || "lower_is_better"); // for context: share of countries with a LOWER value
    const ys = pool.map((r) => r.y);
    return p && { u: p.u, n: p.n, median: medianOf(vals), yMin: Math.min(...ys), yMax: Math.max(...ys) };
  };
  const peer = calc(grp), world = calc(P.all);
  const tier = !d ? "context" : peer.u >= SIGNAL_CUT ? "priority" : peer.u >= WATCH_CUT ? "watch" : "none";
  return { ...out, peer, world, peerName: usePeers ? `${incomeShort(inc)} economies` : "economies worldwide", peerIsIncome: usePeers, tier, directional: !!d };
}

export function profileOf(c) {
  const rows = Object.keys(S.inds).map((code) => positionOf(c, code));
  const dirRows = rows.filter((r) => r.directional && r.peer);
  const signals = rows.filter((r) => r.tier === "priority").sort((a, b) => b.peer.u - a.peer.u);
  const watch = rows.filter((r) => r.tier === "watch").sort((a, b) => b.peer.u - a.peer.u);
  // top three, preferring different domains
  const top = [], seen = new Set();
  for (const r of signals) if (top.length < 3 && !seen.has(r.ind.domain)) { top.push(r); seen.add(r.ind.domain); }
  for (const r of signals) if (top.length < 3 && !top.includes(r)) top.push(r);
  const score = dirRows.length >= MIN_SCORE_INDICATORS ? Math.round((100 * dirRows.reduce((s, r) => s + r.peer.u, 0)) / dirRows.length) : null;
  const byDomain = {};
  for (const r of dirRows) (byDomain[r.ind.domain] ||= []).push(r.peer.u);
  const domainScores = Object.fromEntries(Object.entries(byDomain).map(([k, us]) => [k, { score: Math.round((100 * us.reduce((a, b) => a + b, 0)) / us.length), n: us.length }]));
  const fresh = { recent: 0, moderate: 0, caution: 0, old: 0, missing: 0 };
  for (const r of rows) r.missing ? fresh.missing++ : fresh[r.fresh]++;
  return { c, rows, signals, watch, top, score, nScore: dirRows.length, nDir: rows.filter((r) => r.ind.direction !== "context").length, domainScores, fresh };
}

export function whyText(r, countryName) {
  const ind = r.ind, high = ind.direction === "higher_is_concern";
  const pct = Math.round(r.peer.u * 100);
  const lines = [
    `${ind.label} in ${countryName} is ${fmtValue(r.v, ind)}${unitAfter(ind) ? " " + unitAfter(ind) : ""} (latest available: ${r.y}).`,
    `This is ${high ? "higher" : "lower"} — the less favourable direction for this indicator — than in about ${pct}% of the ${r.peer.n} ${r.peerName} with data (median ${fmtValue(r.peer.median, ind)}; their observation years ${r.peer.yMin}–${r.peer.yMax}).`,
    `Across all ${r.world.n} economies with data, it is less favourable than about ${Math.round(r.world.u * 100)}% (world median ${fmtValue(r.world.median, ind)}).`,
  ];
  if (r.fresh === "caution") lines.push(`The latest value is from ${r.y}; it may not reflect the current situation.`);
  lines.push("This describes a relative position in published statistics. It does not establish a cause, predict outcomes or evaluate a policy.");
  return lines;
}

// ── search ──
function norm(s) { return s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim(); }
let INDEX = [];
function buildIndex() {
  INDEX = Object.entries(S.data.countries).map(([c, x]) => ({ c, name: displayName(c, x.name), keys: [norm(displayName(c, x.name)), norm(x.name), c.toLowerCase(), ...(ALIASES[c] || []).map(norm)], x }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
function searchCountries(q) {
  const n = norm(q); if (!n) return [];
  const score = (e) => Math.max(...e.keys.map((k) => (k === n ? 3 : k.startsWith(n) ? 2 : k.includes(n) ? 1 : 0)));
  return INDEX.map((e) => [e, score(e)]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1] || a[0].name.localeCompare(b[0].name)).slice(0, 8).map(([e]) => e);
}
function wireSearch() {
  const inp = $("#q"), list = $("#q-list");
  let hits = [], cur = -1;
  const draw = () => {
    list.innerHTML = hits.map((e, i) => `<li role="option" id="opt-${e.c}" aria-selected="${i === cur}" data-c="${e.c}"><b>${esc(e.name)}</b><span>${esc(e.x.income)} · ${esc(e.x.region)}</span></li>`).join("");
    list.hidden = !hits.length; inp.setAttribute("aria-expanded", String(!!hits.length));
    if (cur >= 0 && hits[cur]) inp.setAttribute("aria-activedescendant", `opt-${hits[cur].c}`); else inp.removeAttribute("aria-activedescendant");
  };
  const pick = (c) => { inp.value = ""; hits = []; cur = -1; draw(); select(c, { scroll: true }); };
  inp.addEventListener("input", () => { hits = searchCountries(inp.value); cur = hits.length ? 0 : -1; draw(); });
  inp.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { cur = Math.min(cur + 1, hits.length - 1); draw(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { cur = Math.max(cur - 1, 0); draw(); e.preventDefault(); }
    else if (e.key === "Enter" && hits[cur]) { pick(hits[cur].c); e.preventDefault(); }
    else if (e.key === "Escape") { hits = []; cur = -1; draw(); }
  });
  list.addEventListener("mousedown", (e) => { const li = e.target.closest("li"); if (li) { e.preventDefault(); pick(li.dataset.c); } });
  inp.addEventListener("blur", () => setTimeout(() => { hits = []; cur = -1; draw(); }, 120));
  document.querySelectorAll("[data-quick]").forEach((b) => b.addEventListener("click", () => select(b.dataset.quick, { scroll: true })));
}

// ── rendering ──
const badge = (fr, y) => `<span class="fresh f-${fr}" title="${esc(FRESH_LABEL[fr])}">${y}</span>`;
const tierChip = (t) => (t === "priority" ? `<span class="tier t-priority">Priority signal</span>` : t === "watch" ? `<span class="tier t-watch">Watch</span>` : "");
function bar(u, label) {
  return `<span class="pbar" role="img" aria-label="${esc(label)}"><i style="left:${(u * 100).toFixed(1)}%"></i></span>`;
}

function renderCoverage() {
  const d = S.data, inds = Object.values(S.inds);
  const latestYears = inds.map((i) => i.year_max);
  $("#cov").innerHTML = `
    <div><b>${d.n_countries}</b><span>countries and economies</span></div>
    <div><b>${d.n_indicators}</b><span>indicators (${inds.filter((i) => i.direction !== "context").length} used for signals)</span></div>
    <div><b>${Math.min(...latestYears)}–${Math.max(...latestYears)}</b><span>most recent observation year, by indicator</span><small>${inds.filter((i) => i.year_max >= 2024).length} of ${inds.length} indicators reach 2024 or later. Individual country values range ${d.year_min}–${d.year_max}; values before ${STALE_BEFORE} are shown but not compared.</small></div>
    <div><b>${d.n_records.toLocaleString("en-US")}</b><span>latest observations</span></div>`;
}

function renderCountry() {
  const c = S.sel, box = $("#country");
  if (!c) { box.innerHTML = ""; return; }
  const cx = S.data.countries[c], name = displayName(c, cx.name), P = profileOf(c);
  const pop = positionOf(c, "SP.POP.TOTL"), le = positionOf(c, "SP.DYN.LE00.IN"), uhc = positionOf(c, "SH_UHC_SCI");
  const kv = (r) => (r.missing ? `<b>No data</b>` : `<b>${esc(fmtValue(r.v, r.ind))}</b><small>${r.y}</small>`);
  const sigCard = (r) => {
    const open = S.open === r.code;
    return `<li class="sig">
      <button type="button" class="sig-head" aria-expanded="${open}" aria-controls="why-${r.code.replace(/\./g, "_")}" data-why="${r.code}">
        <span class="sig-name">${esc(r.ind.label)}</span>${tierChip(r.tier)}
        <span class="sig-val">${esc(fmtValue(r.v, r.ind))} ${esc(unitAfter(r.ind))} ${badge(r.fresh, r.y)}</span>
        <span class="sig-pos">Less favourable than ${Math.round(r.peer.u * 100)}% of ${r.peer.n} ${esc(r.peerName)}</span>
        <span class="sig-cta">${open ? "Hide why" : "Why this signal?"}</span>
      </button>
      <div class="why" id="why-${r.code.replace(/\./g, "_")}" ${open ? "" : "hidden"}>
        <h4>WHY THIS SIGNAL?</h4>
        ${whyText(r, name).map((t) => `<p>${esc(t)}</p>`).join("")}
        <p class="muted small">Definition: ${esc(r.ind.definition)}</p>
        <p class="muted small">Source: ${esc(r.ind.source)} — via World Bank WDI.</p>
      </div></li>`;
  };
  const actions = P.top.map((r) => ({ r, rule: S.rules.rules[r.code] })).filter((x) => x.rule);
  const domRows = DOMAINS.map((dname) => {
    const rows = P.rows.filter((r) => r.ind.domain === dname);
    if (!rows.length) return "";
    return `<tbody><tr class="dom"><th colspan="5" scope="colgroup">${esc(dname)}${dname === "Disease burden" ? ' <span class="muted small">(tuberculosis incidence only)</span>' : ""}${dname === "Demographic context" ? ' <span class="muted small">(context — not judged)</span>' : ""}</th></tr>
      ${rows.map((r) => {
        const ind = r.ind;
        const val = r.missing ? `<span class="nodata">No data available</span>` : `${esc(fmtValue(r.v, ind))} <span class="unit">${esc(unitAfter(ind))}</span>`;
        const yr = r.missing ? "—" : badge(r.fresh, r.y);
        let pos;
        if (r.missing) pos = "—";
        else if (r.notCompared) pos = `<span class="muted small">${esc(r.notCompared)}</span>`;
        else if (r.directional) pos = `${bar(r.peer.u, `Less favourable than ${Math.round(r.peer.u * 100)}% of ${r.peerName}`)} <span class="small">Less favourable than ${Math.round(r.peer.u * 100)}% of ${r.peer.n} ${esc(r.peerName)}</span> ${tierChip(r.tier)}`;
        else pos = `<span class="small muted">Higher than ${Math.round(r.peer.u * 100)}% of ${r.peer.n} ${esc(r.peerName)} · context, not judged${ind.context_note ? ` (${esc(ind.context_note)})` : ""}</span>`;
        return `<tr><th scope="row"><details><summary>${esc(ind.label)}</summary><div class="ind-info"><p>${esc(ind.definition)}</p>${ind.limitations ? `<p class="muted"><b>Limitations:</b> ${esc(ind.limitations.slice(0, 420))}${ind.limitations.length > 420 ? "…" : ""}</p>` : ""}<p class="muted"><b>Source:</b> ${esc(ind.source)} · WDI code ${esc(ind.code)} · ${esc(ind.license)}</p></div></details></th>
          <td data-label="Value">${val}</td><td data-label="Year">${yr}</td><td data-label="Relative position">${pos}</td><td data-label="Direction" class="small muted">${ind.direction === "higher_is_concern" ? "Higher = concern" : ind.direction === "lower_is_concern" ? "Lower = concern" : "Context"}</td></tr>`;
      }).join("")}</tbody>`;
  }).join("");
  const missing = P.rows.filter((r) => r.missing).map((r) => r.ind.label);
  const oldest = P.rows.filter((r) => !r.missing).sort((a, b) => a.y - b.y).slice(0, 3);
  box.innerHTML = `
  <section class="ov" aria-labelledby="ov-h">
    <p class="kicker">Country overview</p>
    <h2 id="ov-h">${esc(name)}</h2>
    <p class="muted">${esc(cx.region)} · ${esc(cx.income)} (World Bank classification in this dataset)</p>
    <div class="kpis">
      <div><span>Population</span>${kv(pop)}</div>
      <div><span>Life expectancy at birth</span>${kv(le)}</div>
      <div><span>UHC service coverage index</span>${kv(uhc)}</div>
      <div class="score"><span>Exploratory Priority Score</span>${P.score == null ? `<b>—</b><small>fewer than ${MIN_SCORE_INDICATORS} comparable indicators</small>` : `<b>${P.score}</b><small>/100 · ${P.nScore} of ${P.nDir} signal indicators</small>`}</div>
    </div>
    <p class="note">The exploratory score is the average relative position across the signal indicators compared with ${esc(incomeShort(cx.income))} peers (0 = most favourable, 100 = least favourable). It is intended for screening and prioritization, not clinical or causal inference.</p>
    ${P.score != null ? `<div class="domscores">${Object.entries(P.domainScores).map(([k, v]) => `<div><span>${esc(k)}</span><span class="dbar" role="img" aria-label="${esc(k)} ${v.score} of 100"><i style="width:${v.score}%"></i></span><b>${v.score}</b><small>${v.n} ind.</small></div>`).join("")}</div>` : ""}
  </section>
  <section aria-labelledby="sig-h">
    <p class="kicker">Priority signals</p>
    <h2 id="sig-h">${P.signals.length ? `${P.signals.length} indicator${P.signals.length > 1 ? "s" : ""} on the less favourable side of income-group peers` : "No priority signal at the 80th-percentile threshold"}</h2>
    <p class="muted small">Priority signal = less favourable than at least ${SIGNAL_CUT * 100}% of ${esc(incomeShort(cx.income))} economies with data · Watch = ${WATCH_CUT * 100}–${SIGNAL_CUT * 100}%. Select a signal to see why.</p>
    ${(() => { const w = P.rows.filter((r) => r.directional && r.world && r.world.u >= SIGNAL_CUT); return `<p class="note">Worldwide context: ${w.length} of ${P.nScore} compared indicators are less favourable than at least ${SIGNAL_CUT * 100}% of all economies with data${w.length ? ` (${w.map((r) => esc(r.ind.label)).join(", ")})` : ""}. Signals above use ${esc(incomeShort(cx.income))} peers, so a country can show few signals while its absolute levels differ greatly from other income groups.</p>`; })()}
    ${P.signals.length ? `<ol class="sigs">${P.signals.map(sigCard).join("")}</ol>` : ""}
    ${P.watch.length ? `<details class="watch"><summary>Watch (${P.watch.length})</summary><ol class="sigs">${P.watch.map(sigCard).join("")}</ol></details>` : ""}
  </section>
  <section aria-labelledby="act-h">
    <p class="kicker">Possible action areas</p>
    <h2 id="act-h">${actions.length ? "Areas a national or local team may wish to review" : "No mapped action areas"}</h2>
    ${actions.length ? `<div class="acts">${actions.map(({ r, rule }) => `<div class="act"><h3>${esc(rule.title)}</h3><p class="muted small">From: ${esc(r.ind.label)} (${r.y})</p><ul>${rule.areas.map((a) => `<li>${esc(a)}</li>`).join("")}</ul></div>`).join("")}</div>
      <p class="note">${esc(S.rules.note)}</p>` : `<p class="muted">Action areas are shown only for priority signals.</p>`}
  </section>
  <section aria-labelledby="ind-h">
    <p class="kicker">Indicators</p>
    <h2 id="ind-h">All ${P.rows.length} indicators — latest available values</h2>
    <p class="muted small">Each value shows its own observation year. Values are compared with ${esc(incomeShort(cx.income))} economies that have data from ${STALE_BEFORE} or later. Select an indicator name for its definition, limitations and source.</p>
    <div class="tblwrap"><table class="itbl"><thead><tr><th scope="col">Indicator</th><th scope="col">Value</th><th scope="col">Year</th><th scope="col">Relative position</th><th scope="col">Direction</th></tr></thead>${domRows}</table></div>
  </section>
  <section aria-labelledby="dq-h">
    <p class="kicker">Data quality / year</p>
    <h2 id="dq-h">How recent is this profile?</h2>
    <div class="fresh-sum">
      <div>${badge("recent", "2024–25")}<b>${P.fresh.recent}</b><span>recent</span></div>
      <div>${badge("moderate", "2022–23")}<b>${P.fresh.moderate}</b><span>moderate</span></div>
      <div>${badge("caution", `${STALE_BEFORE}–21`)}<b>${P.fresh.caution}</b><span>caution</span></div>
      <div>${badge("old", `&lt;${STALE_BEFORE}`)}<b>${P.fresh.old}</b><span>not used for signals</span></div>
      <div><span class="fresh f-none">—</span><b>${P.fresh.missing}</b><span>no data available</span></div>
    </div>
    ${missing.length ? `<p class="small">No data available: ${missing.map(esc).join(", ")}.</p>` : ""}
    ${oldest.length ? `<p class="small muted">Oldest values in this profile: ${oldest.map((r) => `${esc(r.ind.label)} (${r.y})`).join(", ")}.</p>` : ""}
  </section>`;
  box.querySelectorAll("[data-why]").forEach((b) => b.addEventListener("click", () => { S.open = S.open === b.dataset.why ? null : b.dataset.why; renderCountry(); const el = document.querySelector(`[data-why="${b.dataset.why}"]`); el?.focus(); }));
}

function countryOptions(selected) {
  return INDEX.map((e) => `<option value="${e.c}"${e.c === selected ? " selected" : ""}>${esc(e.name)}</option>`).join("");
}
function renderCompare() {
  const a = S.sel || "KOR", b = S.vs || (a === "VNM" ? "KOR" : "VNM");
  const A = profileOf(a), B = profileOf(b);
  const na = displayName(a, S.data.countries[a].name), nb = displayName(b, S.data.countries[b].name);
  const cell = (r) => (r.missing ? `<span class="nodata">No data available</span>` : `${esc(fmtValue(r.v, r.ind))} <span class="unit">${esc(unitAfter(r.ind))}</span> ${badge(r.fresh, r.y)} ${tierChip(r.tier)}`);
  const rows = Object.keys(S.inds).sort((x, y) => DOMAINS.indexOf(S.inds[x].domain) - DOMAINS.indexOf(S.inds[y].domain)).map((code) => {
    const ra = A.rows.find((r) => r.code === code), rb = B.rows.find((r) => r.code === code);
    const diffYear = !ra.missing && !rb.missing && ra.y !== rb.y;
    return `<tr><th scope="row">${esc(S.inds[code].label)}<div class="small muted">${esc(S.inds[code].domain)}</div></th><td data-label="${esc(na)}">${cell(ra)}</td><td data-label="${esc(nb)}">${cell(rb)}</td><td ${diffYear ? 'data-label="Note"' : ""} class="small">${diffYear ? `<span class="warn">Different years (${ra.y} vs ${rb.y})</span>` : ""}</td></tr>`;
  }).join("");
  $("#compare-body").innerHTML = `
    <div class="cmp-pick">
      <label>Country A <select id="cmp-a">${countryOptions(a)}</select></label>
      <label>Country B <select id="cmp-b">${countryOptions(b)}</select></label>
    </div>
    <p class="muted small">Each value keeps its own observation year; values from different years are flagged and should not be read as the same point in time. Signals are relative to each country's own income group (${esc(S.data.countries[a].income)} / ${esc(S.data.countries[b].income)}).</p>
    <div class="tblwrap"><table class="itbl ctbl"><thead><tr><th scope="col">Indicator</th><th scope="col">${esc(na)}</th><th scope="col">${esc(nb)}</th><th scope="col">Note</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  $("#cmp-a").addEventListener("change", (e) => { S.sel = e.target.value; writeHash(); renderAll(); });
  $("#cmp-b").addEventListener("change", (e) => { S.vs = e.target.value; writeHash(); renderCompare(); });
}

// ── map (lazy) ──
const W = 960, H = 500;
function initMapSelect() {
  const sel = $("#map-ind");
  if (!sel.options.length) {
    sel.innerHTML = Object.values(S.inds).sort((a, b) => DOMAINS.indexOf(a.domain) - DOMAINS.indexOf(b.domain) || a.label.localeCompare(b.label))
      .map((i) => `<option value="${i.code}"${i.code === S.ind ? " selected" : ""}>${esc(i.label)}${i.direction === "context" ? " (context)" : ""}</option>`).join("");
    sel.addEventListener("change", () => { S.ind = sel.value; writeHash(); mapShown = true; renderMap(); });
  }
}
async function renderMap() {
  const box = $("#map-body");
  initMapSelect();
  if (!S.world) {
    box.innerHTML = `<p class="muted">Loading map…</p>`;
    try { S.world = await (await fetch("data/world_110m.json")).json(); } catch { box.innerHTML = `<p class="muted">Map could not be loaded. Use the country search above.</p>`; return; }
  }
  const ind = S.inds[S.ind], d = dirParam(ind.direction);
  const all = POOLS[S.ind].all, vals = all.map((r) => r.v);
  const posBy = Object.fromEntries(all.map((r) => [r.c, unfavorablePercentile(r.v, vals, d || "lower_is_better").u]));
  const proj = geoNaturalEarth1().fitExtent([[4, 4], [W - 4, H - 4]], S.world);
  const path = geoPath(proj);
  const ramp = d ? ["var(--q1)", "var(--q2)", "var(--q3)", "var(--q4)", "var(--q5)"] : ["var(--n1)", "var(--n2)", "var(--n3)", "var(--n4)", "var(--n5)"];
  const bin = (u) => Math.min(4, Math.floor(u * 5));
  const paths = S.world.features.map((f) => {
    const c = f.id, u = posBy[c], has = u != null, x = S.data.countries[c];
    const r = has ? positionOf(c, S.ind) : null;
    const tip = x ? `${displayName(c, x.name)} — ${has ? `${fmtValue(r.v, ind)} ${unitAfter(ind)} (${r.y})` : S.data.values[c]?.[S.ind] ? `observed ${S.data.values[c][S.ind][1]}, not compared` : "No data available"}` : `${f.properties.name} — not in dataset`;
    return `<path d="${path(f)}" class="${has ? "has" : "nodata"}${c === S.sel ? " me" : ""}" ${has ? `style="fill:${ramp[bin(u)]}"` : ""} data-c="${x ? c : ""}" tabindex="${x ? 0 : -1}"><title>${esc(tip)}</title></path>`;
  }).join("");
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Indicator map: ${esc(ind.label)}">${paths}</svg>
    <div class="legend"><span>${d ? "More favourable" : "Lower"}</span>${ramp.map((c) => `<i style="background:${c}"></i>`).join("")}<span>${d ? "Less favourable" : "Higher"}</span><i class="nd"></i><span>No data / not compared</span></div>
    <p class="muted small">Indicator Map — relative position among ${all.length} economies with data from ${STALE_BEFORE} or later (latest available year differs by country). ${d ? "" : "Context indicator: shading shows level only, not concern."} ${(() => { const ids = new Set(S.world.features.map((f) => f.id)); const n = Object.keys(S.data.countries).filter((c) => !ids.has(c)).length; return n ? `${n} small economies (e.g. Singapore, Maldives) are too small to draw at this scale — use the search.` : ""; })()} Boundaries: Natural Earth (public domain); they do not imply any judgement on the legal status of any territory.</p>`;
  box.querySelectorAll("path[data-c]").forEach((p) => {
    if (!p.dataset.c) return;
    const go = () => select(p.dataset.c, { scroll: true });
    p.addEventListener("click", go); p.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  });
}

// ── state ──
function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  const ok = (c) => c && S.data.countries[c] ? c : null;
  S.sel = ok(h.get("c")) || S.sel || "KOR";
  S.vs = ok(h.get("vs")) || S.vs;
  if (h.get("ind") && S.inds[h.get("ind")]) S.ind = h.get("ind");
}
function writeHash() {
  const h = new URLSearchParams();
  if (S.sel) h.set("c", S.sel); if (S.vs) h.set("vs", S.vs); if (S.ind) h.set("ind", S.ind);
  history.replaceState(null, "", "#" + h.toString());
}
function select(c, { scroll } = {}) {
  S.sel = c; S.open = null; writeHash(); renderAll();
  if (scroll) $("#country").scrollIntoView({ behavior: "smooth", block: "start" });
}
let mapShown = false;
function renderAll() {
  renderCountry(); renderCompare();
  if (mapShown) renderMap();
  document.title = `${displayName(S.sel, S.data.countries[S.sel].name)} — Global Health Equity Radar`;
}

async function main() {
  const [data, inds, rules] = await Promise.all(["data/wdi_compact.json", "data/indicators.json", "data/action_rules.json"].map((u) => fetch(u).then((r) => r.json())));
  Object.assign(S, { data, inds, rules });
  buildPools(); buildIndex(); readHash();
  renderCoverage(); wireSearch(); initMapSelect(); renderAll();
  const mapSec = $("#map");
  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting) && !mapShown) { mapShown = true; renderMap(); io.disconnect(); } }, { rootMargin: "200px" }) : null;
  io ? io.observe(mapSec) : (mapShown = true, renderMap());
  window.addEventListener("hashchange", () => { readHash(); renderAll(); });
  window.__GHER = { S, profileOf, positionOf, fmtValue }; // for automated checks
  document.documentElement.dataset.ready = "1";
}
if (typeof document !== "undefined") main().catch((e) => { const b = document.getElementById("country"); if (b) b.innerHTML = `<p class="warn">Data could not be loaded (${esc(e.message)}).</p>`; console.error(e); });
