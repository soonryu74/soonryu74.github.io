// Shareable URL state:  #lens=income&city=35620&state=06&at=x,y,zoom
//   at = map-km centre (rounded) and zoom as log2(scale / home-fit scale), so a link frames the same area on any screen.
// Lens or selection changes push a history entry (so Back undoes them); camera moves replace the current one.

const DEBOUNCE_MS = 350;

export function parseHash(hash) {
  const p = new URLSearchParams(String(hash || "").replace(/^#/, ""));
  const out = { lens: p.get("lens") || null, city: p.get("city") || null, state: p.get("state") || null, at: null };
  const at = (p.get("at") || "").split(",").map(Number);
  if (at.length === 3 && at.every(Number.isFinite)) out.at = at;
  return out;
}

export function formatHash(o) {
  const parts = [];
  if (o.lens) parts.push(`lens=${encodeURIComponent(o.lens)}`);
  if (o.city) parts.push(`city=${encodeURIComponent(o.city)}`);
  if (o.state) parts.push(`state=${encodeURIComponent(o.state)}`);
  if (o.at) parts.push(`at=${Math.round(o.at[0])},${Math.round(o.at[1])},${(+o.at[2]).toFixed(2).replace(/\.?0+$/, "") || "0"}`);
  return parts.length ? "#" + parts.join("&") : "";
}

const sig = (o) => `${o.lens || ""}|${o.city || ""}|${o.state || ""}`;

/**
 * opts: {read() → {lens, city, state, at}, apply(parsed, {initial}), busy() → true while the camera is animating}
 * Returns {schedule(), applyCurrent(initial), flush()}.
 */
export function initUrlState(opts) {
  let timer = 0;
  let lastWritten = location.hash;
  let entrySig = sig(parseHash(location.hash));
  let applying = false;

  function write(force = false) {
    timer = 0;
    if (applying) return;
    if (!force && opts.busy?.()) return schedule(); // wait for the camera to settle
    const o = opts.read();
    const hash = formatHash(o);
    if (hash === location.hash || (!hash && !location.hash)) {
      lastWritten = location.hash;
      return;
    }
    const url = location.pathname + location.search + (hash || "");
    const s = sig(o);
    try {
      if (s !== entrySig) history.pushState(null, "", url);
      else history.replaceState(null, "", url);
    } catch {
      /* some sandboxes forbid history writes: the app still works, the link just doesn't update */
    }
    entrySig = s;
    lastWritten = location.hash;
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => write(), DEBOUNCE_MS);
  }

  function applyCurrent(initial = false) {
    const parsed = parseHash(location.hash);
    applying = true;
    try {
      opts.apply(parsed, { initial });
    } finally {
      applying = false;
    }
    entrySig = sig(parsed);
    lastWritten = location.hash;
  }

  const onNav = () => {
    if (location.hash === lastWritten) return;
    clearTimeout(timer);
    applyCurrent(false);
  };
  window.addEventListener("popstate", onNav);
  window.addEventListener("hashchange", onNav);

  return {
    schedule,
    applyCurrent,
    flush() {
      clearTimeout(timer);
      write(true);
    },
  };
}
