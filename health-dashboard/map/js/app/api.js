// Building blocks of the extension API (the `app` object that main.js creates and hands to ext/*/install(app)).
//
//   createEmitter()            app.on / app.off / app.emit
//   createHashState(opts)      the shareable URL hash: core keys (lens, city, state, at; see app/urlstate.js) plus
//                              keys that extensions register with app.hash.register(key, {get, set})
//   createModes(app)           app.registerMode / app.setMode (one active mode; Esc leaves it)
//   createUi(app, opts)        app.ui.dock / undock / addTopButton / toast
//   createMapToggles(opts)     app.ui.addMapToggle / mapToggles: switches for map layers, kept in the hash (layers=)
//
// main.js assembles the full `app` (see its "extension API" section); the exact surface is documented there.
import { parseHash, formatHash } from "./urlstate.js";
import { icon } from "../ui/icon.js";
import { hasIcon } from "../icons.js";
import { esc } from "../format.js";

// --- events ------------------------------------------------------------------------------------------------------

/**
 * on(name, fn) → off function; off(name, fn); emit(name, payload) → true if a handler returned true.
 * Handlers run in registration order; the first one that returns true "consumes" the event and stops the rest
 * (used by "mapclick" and "escape"; other events ignore the return value but stop the same way).
 */
export function createEmitter() {
  const handlers = new Map();
  const on = (name, fn) => {
    if (!handlers.has(name)) handlers.set(name, []);
    handlers.get(name).push(fn);
    return () => off(name, fn);
  };
  const off = (name, fn) => {
    const list = handlers.get(name);
    if (!list) return;
    const k = list.indexOf(fn);
    if (k >= 0) list.splice(k, 1);
  };
  const emit = (name, payload) => {
    const list = handlers.get(name);
    if (!list || !list.length) return false;
    for (const fn of [...list]) {
      try {
        if (fn(payload) === true) return true;
      } catch (err) {
        console.error(`app "${name}" handler failed`, err);
      }
    }
    return false;
  };
  const has = (name) => !!handlers.get(name)?.length;
  return { on, off, emit, has };
}

// --- URL hash ----------------------------------------------------------------------------------------------------

const CORE_KEYS = new Set(["lens", "city", "state", "at"]);
const DEBOUNCE_MS = 350;

/**
 * Shareable URL state:  #lens=income&city=35620&at=x,y,zoom&<extension keys>
 * Lens, selection and extension-key changes push a history entry (so Back undoes them); camera moves replace it.
 *
 * opts: {read() → {lens, city, state, at}, apply(core, {initial}), busy() → true while the camera animates}
 * Returns {schedule(), soon(), flush(), applyCurrent(initial), register(key, {get, set}) → unregister, value(key)}.
 *   get() → string | null   the key's current value (null = leave it out of the hash)
 *   set(value | null)       apply a value from the URL (on load, Back/Forward, a pasted link); null = absent.
 *   A key registered after the page loaded gets set(value) once, right away (in a microtask), if the current
 *   hash has it.
 */
export function createHashState(opts) {
  const extras = new Map(); // key -> {get, set}
  let timer = 0;
  let lastWritten = location.hash;
  let applying = false;

  const params = (hash) => new URLSearchParams(String(hash || "").replace(/^#/, ""));
  const readExtras = () => {
    const out = [];
    for (const [key, h] of extras) {
      let v = null;
      try {
        v = h.get();
      } catch (err) {
        console.error(`hash key "${key}" get() failed`, err);
      }
      if (v != null && v !== "") out.push([key, String(v)]);
    }
    return out;
  };
  const format = (core, ex) => {
    const base = formatHash(core);
    const tail = ex.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
    if (!tail) return base;
    return base ? `${base}&${tail}` : `#${tail}`;
  };
  const sig = (core, ex) => `${core.lens || ""}|${core.city || ""}|${core.state || ""}|${ex.map((e) => e.join("=")).join("&")}`;
  const hashSig = (hash) => {
    const p = params(hash);
    const ex = [...extras.keys()].filter((k) => p.get(k)).map((k) => [k, p.get(k)]);
    return sig(parseHash(hash), ex);
  };
  let entrySig = hashSig(location.hash);

  function write(force = false) {
    timer = 0;
    if (applying) return;
    if (!force && opts.busy?.()) return schedule(); // wait for the camera to settle
    const core = opts.read();
    const ex = readExtras();
    const hash = format(core, ex);
    if (hash === location.hash || (!hash && !location.hash)) {
      lastWritten = location.hash;
      return;
    }
    const url = location.pathname + location.search + (hash || "");
    const s = sig(core, ex);
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

  function setExtra(key, h, value) {
    try {
      h.set(value);
    } catch (err) {
      console.error(`hash key "${key}" set() failed`, err);
    }
  }

  function applyCurrent(initial = false) {
    const p = params(location.hash);
    applying = true;
    try {
      opts.apply(parseHash(location.hash), { initial });
      for (const [key, h] of extras) setExtra(key, h, p.get(key));
    } finally {
      applying = false;
    }
    entrySig = hashSig(location.hash);
    lastWritten = location.hash;
  }

  const onNav = () => {
    if (location.hash === lastWritten) return;
    clearTimeout(timer);
    applyCurrent(false);
  };
  window.addEventListener("popstate", onNav);
  window.addEventListener("hashchange", onNav);

  function register(key, h) {
    if (CORE_KEYS.has(key)) throw new Error(`hash key "${key}" is reserved`);
    if (!h || typeof h.get !== "function" || typeof h.set !== "function") throw new Error("hash.register needs {get, set}");
    extras.set(key, h);
    const v = params(location.hash).get(key);
    if (v != null) {
      queueMicrotask(() => {
        if (extras.get(key) !== h) return;
        applying = true;
        try {
          setExtra(key, h, v);
        } finally {
          applying = false;
        }
        entrySig = hashSig(location.hash);
      });
    }
    return () => {
      if (extras.get(key) === h) extras.delete(key);
    };
  }

  return {
    schedule,
    /** Write on the next task (coalesces several changes made in one go, e.g. setMode(null) then setMode(x)). */
    soon() {
      clearTimeout(timer);
      timer = setTimeout(() => write(), 0);
    },
    applyCurrent,
    register,
    flush() {
      clearTimeout(timer);
      write(true);
    },
    /** The key's value in the current location hash (string or null). */
    value: (key) => params(location.hash).get(key),
  };
}

// --- modes -------------------------------------------------------------------------------------------------------

/**
 * Modes: named, mutually exclusive app states owned by extensions (e.g. "city" for the City view).
 *   registerMode(name, {enter(params), exit(), onEscape?()}) → unregister
 *   setMode(name | null, params = {})   exits the active mode (exit()), enters the new one (enter(params)),
 *                                       emits "mode" {name, prev, params} and schedules a URL update.
 *   Esc: the active mode's onEscape() runs first; unless it returns true, the mode is left (setMode(null)).
 */
export function createModes(app) {
  const modes = new Map();
  let current = null, params = null;
  function registerMode(name, def) {
    if (!name || !def || typeof def.enter !== "function") throw new Error("registerMode(name, {enter, exit})");
    modes.set(name, def);
    return () => {
      if (current === name) setMode(null);
      modes.delete(name);
    };
  }
  function setMode(name, p = {}) {
    if (name != null && !modes.has(name)) {
      console.warn(`unknown mode "${name}"`);
      return false;
    }
    const prev = current;
    if (prev) {
      try {
        modes.get(prev)?.exit?.();
      } catch (err) {
        console.error(`mode "${prev}" exit() failed`, err);
      }
    }
    current = name ?? null;
    params = name ? p || {} : null;
    if (current) {
      try {
        modes.get(current).enter(params);
      } catch (err) {
        console.error(`mode "${current}" enter() failed`, err);
      }
    }
    app.emit("mode", { name: current, prev, params });
    // Write the link now rather than after the debounce, so a copied URL already names the new mode.
    (app.hash?.soon || app.hash?.update)?.();
    app.requestDraw?.();
    return true;
  }
  /** Esc handling for main.js: true if the active mode handled the key. */
  function escape() {
    if (!current) return false;
    const def = modes.get(current);
    let keep = false;
    try {
      keep = def?.onEscape?.() === true;
    } catch (err) {
      console.error(`mode "${current}" onEscape() failed`, err);
    }
    if (!keep) setMode(null);
    return true;
  }
  return {
    registerMode,
    setMode,
    escape,
    get mode() { return current; },
    get modeParams() { return params; },
    hasMode: (name) => modes.has(name),
  };
}

// --- UI hosts ----------------------------------------------------------------------------------------------------

/**
 * app.ui:
 *   dock(side = "left" | "right", {width = 380, label}) → HTMLElement
 *     A docked dashboard container below the top bar (a bottom sheet on phones). One per side: calling it again
 *     returns the same element (re-shown, with the new width). While a dock is visible the map's usable area
 *     shrinks: app.visibleArea(), app.flyTo() and app.fitBounds() frame inside what is left, and the city panel,
 *     lens dock and minimap move aside. The element is empty; fill it yourself (it scrolls vertically).
 *     When a dock opens or closes and nothing is flying the camera, main.js re-frames: from the home view it fits
 *     the whole land into the remaining area (and returns home when the last dock closes); otherwise it keeps the
 *     point at the centre of the usable area centred. Call app.fitBounds()/app.flyTo() right after dock() to
 *     frame your own view instead.
 *   undock(side)            hide and empty that dock
 *   dockWidth(side) → px    its current width (0 when hidden)
 *   addTopButton({id, icon, label, onClick, title}) → HTMLButtonElement
 *     A top-bar button before Share / Help / Almanac. `icon` is an icons.js id (or a short text / emoji);
 *     the label hides on narrow screens like the other buttons'. Calling it again with the same id replaces it.
 *   toast(msg)              a short message under the top bar
 */
export function createUi(app, { toast, onLayout }) {
  const docks = { left: null, right: null };
  const widths = { left: 0, right: 0 };
  const isPhone = () => matchMedia("(max-width: 700px)").matches;

  const open = { left: false, right: false };
  function layout() {
    let changed = false;
    for (const side of ["left", "right"]) {
      const el = docks[side];
      const isOpen = !!(el && !el.hidden);
      const wpx = isOpen && !isPhone() ? Math.round(el.getBoundingClientRect().width) : 0;
      // Phones report width 0 (docks are bottom sheets), so opening / closing counts as a change too.
      if (wpx !== widths[side] || isOpen !== open[side]) changed = true;
      widths[side] = wpx;
      open[side] = isOpen;
      document.body.style.setProperty(`--dock-${side}`, `${wpx}px`);
    }
    document.body.classList.toggle("dock-open", !!(docks.left && !docks.left.hidden) || !!(docks.right && !docks.right.hidden));
    if (changed) onLayout?.();
  }
  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => layout()) : null;

  function dock(side = "left", { width = 380, label = "" } = {}) {
    if (side !== "left" && side !== "right") throw new Error('dock side must be "left" or "right"');
    let el = docks[side];
    if (!el) {
      el = document.createElement("aside");
      el.className = `panel app-dock app-dock-${side}`;
      el.dataset.side = side;
      el.setAttribute("role", "region");
      document.body.appendChild(el);
      docks[side] = el;
      ro?.observe(el);
    }
    if (label) el.setAttribute("aria-label", label);
    el.style.setProperty("--dock-w", `${Math.max(200, Math.round(width))}px`);
    el.hidden = false;
    layout();
    return el;
  }

  function undock(side) {
    const el = docks[side];
    if (!el || el.hidden) return;
    el.hidden = true;
    el.innerHTML = "";
    layout();
  }

  function addTopButton({ id, icon: ic, label = "", onClick, title = "" } = {}) {
    const host = document.querySelector("#topbar .tb-buttons");
    if (!host) return null;
    if (id) document.getElementById(id)?.remove();
    const b = document.createElement("button");
    if (id) b.id = id;
    b.type = "button";
    b.className = "btn btn-ext" + (label ? "" : " btn-icon");
    if (title) b.title = title;
    b.setAttribute("aria-label", title || label || id || "button");
    const glyph = ic ? (hasIcon(ic) ? icon(ic, "•", { size: 15 }) : `<span class="emoji" aria-hidden="true">${esc(ic)}</span>`) : "";
    b.innerHTML = `${glyph}${label ? `<span class="lbl">${esc(label)}</span>` : ""}`;
    if (onClick) b.addEventListener("click", (e) => onClick(e, b));
    // Extension buttons go before the built-in ones (Share, Help, Almanac), in the order they were added.
    const firstBuiltIn = host.querySelector("#btn-share") || host.firstChild;
    host.insertBefore(b, firstBuiltIn);
    document.body.classList.add("tb-ext");
    return b;
  }

  addEventListener("resize", layout);
  return {
    dock,
    undock,
    dockWidth: (side) => widths[side] || 0,
    isDockOpen: (side) => !!(docks[side] && !docks[side].hidden),
    addTopButton,
    toast,
    _layout: layout,
  };
}

// --- map layer toggles -------------------------------------------------------------------------------------------

/**
 * app.ui.addMapToggle({id, label, icon, get() → bool, set(on), title?, default?}) → remove function
 *   A switch for a map layer, listed in the "Map layers" menu next to the Resources toggle in the lens dock (one
 *   button that opens a small menu, so any number of layers fits on a phone). `icon` is an icons.js id or a short
 *   text / emoji. `set(on)` is yours: flip your layer's state (its visible()/sig() then change and the static map
 *   re-renders; main also calls app.requestDraw()). `default` is the state when the URL says nothing (defaults to
 *   get() at the time of adding).
 *   The URL hash key `layers` lists the toggles that are on (`#layers=roads,rail,military`; `layers=none` = all
 *   off) and is written only while some toggle differs from its default; a toggle added after the page loaded is
 *   set from the current hash right away. Calling it again with the same id replaces the toggle.
 * app.ui.setMapToggle(id, on) → bool       switch one from code, as the menu would (false if no such toggle)
 * app.ui.mapToggles() → [{id, label, on}]   for debugging and tests
 *
 * opts: {dock (the #lens-dock element), after (element to insert the button after), area (#lens-area),
 *        hash: {register, update, value}, onChange()}
 */
export function createMapToggles({ dock, after, area, hash, onChange }) {
  const toggles = new Map(); // id → {id, label, icon, title, get, set, def}
  let btn = null, pop = null, restoreFocus = null;
  // The ids the URL asked for (a Set), or null when the URL has no layers= key. Ids of toggles that are not
  // registered yet (an extension still loading) stay in the hash until their toggle arrives.
  let wanted = null;

  const isOn = (t) => {
    try { return !!t.get(); } catch (err) { console.error(`map toggle "${t.id}" get() failed`, err); return false; }
  };
  const setOn = (t, on) => {
    if (isOn(t) === !!on) return;
    try { t.set(!!on); } catch (err) { console.error(`map toggle "${t.id}" set() failed`, err); }
  };
  const glyph = (ic, size) => (ic ? (hasIcon(ic) ? icon(ic, "•", { size }) : `<span class="emoji" aria-hidden="true">${esc(ic)}</span>`) : "");

  // URL: layers=a,b (the ones on) while anything differs from its default; "none" = every toggle off.
  const pending = () => (wanted ? [...wanted].filter((id) => id !== "none" && !toggles.has(id)) : []);
  function hashGet() {
    const list = [...toggles.values()];
    const waiting = pending();
    if (!waiting.length && list.every((t) => isOn(t) === t.def)) return wanted && !list.length ? [...wanted].join(",") : null;
    const on = [...list.filter(isOn).map((t) => t.id), ...waiting];
    return on.length ? on.join(",") : "none";
  }
  const parse = (v) => new Set(String(v).split(",").map((s) => s.trim()).filter(Boolean));
  function hashSet(v) {
    wanted = v == null ? null : parse(v);
    for (const t of toggles.values()) setOn(t, wanted ? wanted.has(t.id) : t.def);
    render();
    onChange?.();
  }
  // After a change in the menu the URL follows the switches (plus ids still waiting for their toggle).
  const syncWanted = () => {
    if (wanted) wanted = new Set([...[...toggles.values()].filter(isOn).map((t) => t.id), ...pending()]);
  };
  hash.register("layers", { get: hashGet, set: hashSet });

  function ensureDom() {
    if (btn) return;
    btn = document.createElement("button");
    btn.id = "btn-maplayers";
    btn.type = "button";
    btn.className = "lens-btn res-toggle map-layers-btn";
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", "map-layers-pop");
    btn.title = "Map layers: roads, rail, military and more";
    dock.insertBefore(btn, after && after.parentNode === dock ? after.nextSibling : dock.firstChild);
    pop = document.createElement("div");
    pop.id = "map-layers-pop";
    pop.className = "panel map-layers-pop";
    pop.hidden = true;
    pop.setAttribute("role", "menu");
    pop.setAttribute("aria-label", "Map layers");
    (area || document.body).insertBefore(pop, (area || document.body).firstChild);
    btn.onclick = () => (pop.hidden ? open() : close());
    pop.onclick = (e) => {
      const row = e.target.closest("[data-toggle]");
      if (!row) return;
      const t = toggles.get(row.dataset.toggle);
      if (!t) return;
      setOn(t, !isOn(t));
      syncWanted();
      render();
      onChange?.();
      hash.update();
    };
    pop.addEventListener("keydown", (e) => {
      const rows = [...pop.querySelectorAll("[data-toggle]")];
      const k = rows.indexOf(document.activeElement);
      const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
      if (step && k >= 0) {
        e.preventDefault();
        rows[(k + step + rows.length) % rows.length].focus();
      }
    });
    document.addEventListener("pointerdown", (e) => {
      if (!pop.hidden && !pop.contains(e.target) && !btn.contains(e.target)) close(false);
    });
  }

  function render() {
    if (!btn) return;
    const list = [...toggles.values()];
    btn.hidden = !list.length;
    const nOn = list.filter(isOn).length;
    btn.classList.toggle("active", nOn > 0);
    btn.setAttribute("aria-label", `Map layers (${nOn} of ${list.length} on)`);
    btn.innerHTML = `${glyph("terrain", 15)}<span>Map</span>${nOn ? `<b class="ml-count">${nOn}</b>` : ""}`;
    if (pop.hidden) return;
    pop.innerHTML = `<div class="ml-head">Map layers</div>` + list.map((t) => {
      const on = isOn(t);
      return `<button type="button" class="ml-row${on ? " on" : ""}" role="menuitemcheckbox" aria-checked="${on}" data-toggle="${esc(t.id)}"
        ${t.title ? `title="${esc(t.title)}"` : ""}><span class="ml-ic">${glyph(t.icon, 16)}</span><span class="ml-lbl">${esc(t.label)}</span>
        <span class="ml-switch" aria-hidden="true"></span></button>`;
    }).join("");
  }

  function open() {
    if (!pop) return;
    restoreFocus = document.activeElement;
    pop.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    render();
    pop.querySelector("[data-toggle]")?.focus();
  }
  function close(restore = true) {
    if (!pop || pop.hidden) return false;
    pop.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    if (restore) (restoreFocus && document.contains(restoreFocus) ? restoreFocus : btn).focus();
    return true;
  }

  function add({ id, label, icon: ic = "", get, set, title = "", default: def } = {}) {
    if (!id || typeof get !== "function" || typeof set !== "function") throw new Error("addMapToggle({id, label, icon, get, set})");
    const t = { id: String(id), label: label || String(id), icon: ic, title, get, set, def: false };
    t.def = def === undefined ? isOn(t) : !!def;
    toggles.set(t.id, t);
    ensureDom();
    if (wanted) {
      setOn(t, wanted.has(t.id));
      onChange?.();
    }
    render();
    return () => {
      if (toggles.get(t.id) !== t) return;
      toggles.delete(t.id);
      render();
      hash.update();
    };
  }

  /** Switch a toggle from code (e.g. an advisor's "show forts" button), exactly as the menu would. false if unknown. */
  function setToggle(id, on) {
    const t = toggles.get(String(id));
    if (!t) return false;
    setOn(t, !!on);
    syncWanted();
    render();
    onChange?.();
    hash.update();
    return true;
  }

  return {
    add,
    set: setToggle,
    list: () => [...toggles.values()].map((t) => ({ id: t.id, label: t.label, on: isOn(t) })),
    close,
    get isOpen() { return !!pop && !pop.hidden; },
    refresh: render,
  };
}
