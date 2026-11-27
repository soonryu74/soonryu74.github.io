import { Camera } from "./camera.js";
import { prepareWorld, applyLens, stateIndex } from "./world.js";
import * as mapRender from "./render/map.js";
import { drawBanners } from "./render/banners.js";
import { renderTopbar } from "./ui/topbar.js";
import { showCellTooltip, showCityTooltip, showHtmlTooltip, hideTooltip } from "./ui/tooltip.js";
import { initLensDock, formatLensValue, lensValueAt } from "./ui/lenses.js";
import { openCityPanel, closeCityPanel } from "./ui/cityPanel.js";
import { openStatePanel } from "./ui/statePanel.js";
import { installSheetSwipe } from "./ui/infoPanel.js";
import { initPedia } from "./ui/pedia.js";
import { initYieldReports } from "./ui/yieldReport.js";
import { Minimap } from "./ui/minimap.js";
import { icon } from "./ui/icon.js";
import { initSearch } from "./app/search.js";
import { createEmitter, createHashState, createModes, createUi, createMapToggles } from "./app/api.js";
import { drawHighlight, drawOverlays, invalidateHighlight, highlightBounds } from "./render/overlays.js";
import { resourceFilterSig, layerActive, layerError, Z as LAYER_Z } from "./render/map.js";
import { installExtensions } from "./ext/index.js";
import { initShare } from "./app/share.js";
import { initHelp } from "./app/help.js";

const { drawStatic, drawOverlay, OCEAN_BG } = mapRender;

async function loadJSON(name, optional = false) {
  try {
    const r = await fetch(`data/${name}.json`);
    if (!r.ok) throw new Error(`data/${name}.json: HTTP ${r.status}`);
    return await r.json();
  } catch (err) {
    if (optional) return null;
    throw err;
  }
}

// Optional data files (docs/DATA_CONTRACTS.md). Small map-layer files are fetched right after the first frame; the
// others only when something asks for them (app.loadData(name)). A missing file (404) loads as null.
const EAGER_DATA = ["infrastructure", "military", "wonders", "trade"];
const DATA_NAME = /^[a-z0-9_-]+$/;

// render/snapshot.js draws a whole view into any canvas; optional, with a local fallback.
const snapshotModule = import("./render/snapshot.js").catch(() => null);

const PANEL_W = 394; // city panel width + margins (css #city-panel)
const TOPBAR_H = 40;
const CACHE_MARGIN = 160; // css px of map rendered beyond each edge of the viewport, so short pans are a blit
const PAN_LEAD = 0.6; // a pan that runs off the cache re-renders it shifted this share of the margin ahead
const DOUBLE_MS = 260;
const SELECT_ANIM_MS = 33; // ~30 fps while a state's border highlight animates
const isMobile = () => matchMedia("(max-width: 700px)").matches;

async function main() {
  const [world, cities, nation, lenses, sources, resources, statesData] = await Promise.all([
    loadJSON("world"), loadJSON("cities"), loadJSON("nation"),
    loadJSON("lenses", true), loadJSON("sources", true), loadJSON("resources", true), loadJSON("states", true),
  ]);
  const lensFile = lenses && Array.isArray(lenses.lenses) ? lenses : { vintage: "", groups: [], lenses: [] };
  const w = prepareWorld(world, cities, { resources });
  const state = {
    cities, lens: null, band: null, hoverCell: -1, selectedCity: null, selectedState: null, showResources: !!w.resources,
    highlight: null, // {cells?, cities?, states?, resources?, dimOthers?, color?} (render/overlays.js)
    resourceFilter: null, // {types?: Set<typeId>, minValue?: number}
  };
  const states = Array.isArray(statesData) ? statesData : null;
  const lensById = new Map(lensFile.lenses.map((l) => [l.id, l]));
  const cityById = new Map(cities.map((c) => [c.id, c]));
  const overlays = []; // app.registerOverlay(), sorted by z
  const staticLayers = []; // app.registerStaticLayer(), sorted by z (stable): drawn inside the cached static map
  const events = createEmitter();
  const panelEl = document.getElementById("city-panel");
  // The extension API object; filled in under "extension API" below, before anything can run against it.
  const app = {};
  const modes = createModes(app);
  events.on("mode", () => hideTooltip()); // a stale tooltip must not float over a mode's panels
  let ui = null;
  const snapshot = await snapshotModule;

  const canvas = document.getElementById("map");
  const ctx = canvas.getContext("2d");
  const cam = new Camera(world.width, world.height);
  let dpr = 1;
  let hits = [];
  let queued = false;
  let userMoved = false;
  let gestureZoom = false; // a two-finger pinch is in progress: keep blitting the scaled cache, render at the end
  let dockFramed = false; // the camera was framed for open docks (onDocksChanged) and the user has not moved it since
  let lastFrame = 0;
  let animTimer = 0;
  let lastCamSig = "";
  let lastUrlCamSig = "";
  const perf = { static: [], frame: [], warm: [] }; // ms per static render / frame / idle warm-up strip

  const minimap = new Minimap(document.getElementById("minimap"), w, cam, (x, y) => {
    userMoved = true;
    cam.centerOn(x, y);
    requestDraw();
    url.schedule();
  });
  const pedia = initPedia({ world, nation, lenses: lensFile, sources: sources || [], w, resources, states });
  const help = initHelp();

  // --- static layer cache ----------------------------------------------------------------------------------------
  // Tiles, glyphs, rivers, borders, labels and resources are rendered into an offscreen canvas covering the view
  // plus a margin. Panning blits it; zooming blits it scaled and re-renders once the camera settles.
  const cache = { cv: document.createElement("canvas"), key: null, vp: null, hits: { resources: [] } };
  const cctx = cache.cv.getContext("2d");
  // Each registered layer's id, visibility and own sig() are part of the key, so toggling or restyling a layer
  // re-renders the cache (and nothing else does).
  const layersSig = () => staticLayers.map((l) => {
    let vis = 1, sig = "";
    try {
      vis = typeof l.visible !== "function" || l.visible() !== false ? 1 : 0;
      sig = vis && typeof l.sig === "function" ? String(l.sig() ?? "") : "";
    } catch (err) {
      layerError(l, "sig", err);
    }
    return `${l.id}:${vis}:${sig}`;
  }).join(";");
  const cacheKey = () =>
    `${state.lens?.id ?? "terrain"}|${state.band ? state.band.join(",") : ""}|${state.showResources ? 1 : 0}|${dpr}|${cam.w}x${cam.h}` +
    `|${state.selectedCity?.id ?? ""}|${resourceFilterSig(state.resourceFilter)}|${layersSig()}`;

  // lead: [-1|0|1, -1|0|1], the direction a pan ran off the cache; the new cache reaches further that way (and less
  // the other way, same size), so a steady pan re-renders less often.
  function renderStatic(lead = null) {
    const t0 = performance.now();
    const s = cam.scale;
    const v = cam.view();
    const m = CACHE_MARGIN / s;
    const ox = lead ? lead[0] * PAN_LEAD * m : 0, oy = lead ? lead[1] * PAN_LEAD * m : 0;
    const vp = {
      x0: v.x0 - m + ox, y0: v.y0 - m + oy, x1: v.x1 + m + ox, y1: v.y1 + m + oy, s, dpr,
      cssW: cam.w + 2 * CACHE_MARGIN, cssH: cam.h + 2 * CACHE_MARGIN,
    };
    const W = Math.ceil(vp.cssW * dpr), H = Math.ceil(vp.cssH * dpr);
    if (cache.cv.width !== W || cache.cv.height !== H) {
      cache.cv.width = W;
      cache.cv.height = H;
    }
    const hitsOut = {};
    drawStatic(cctx, vp, w, {
      lens: state.lens, showResources: state.showResources, resourceFilter: state.resourceFilter, selectedCity: state.selectedCity, hits: hitsOut,
      layers: staticLayers, app,
    });
    cache.hits = { resources: hitsOut.resources || [] };
    cache.vp = vp;
    cache.key = cacheKey();
    record(perf.static, performance.now() - t0);
  }

  // --- sprite warm-up ----------------------------------------------------------------------------------------
  // The first render at a new zoom paints that zoom's terrain and city sprites (150-300 ms when zoomed in). Once the
  // view settles, idle time paints them for the next zoom step in and out, a strip at a time, so a wheel notch or a
  // +/- key lands on warm caches. Any camera move, lens or toggle change abandons the remaining work.
  const WARM_STEPS = [1.25, 0.8]; // ~one wheel notch (e^±0.22) and one sprite bucket (2^±0.25) in, then out
  const WARM_STRIPS = 6;
  const warm = { cv: null, ctx: null, handle: 0, jobs: [], sig: "" };
  const idle = typeof requestIdleCallback === "function"
    ? (fn) => requestIdleCallback(fn, { timeout: 2000 })
    : (fn) => setTimeout(() => fn({ timeRemaining: () => 12, didTimeout: false }), 250);
  const cancelIdle = typeof cancelIdleCallback === "function" ? cancelIdleCallback : clearTimeout;
  const warmSig = () => `${cam.x},${cam.y},${cam.scale}|${cacheKey()}`;
  function scheduleWarm() {
    if (typeof mapRender.warmSprites !== "function") return;
    if (warm.handle) cancelIdle(warm.handle);
    warm.handle = 0;
    warm.jobs = [];
    warm.sig = warmSig();
    const v = cam.view();
    const cx = (v.x0 + v.x1) / 2, cy = (v.y0 + v.y1) / 2;
    for (const f of WARM_STEPS) {
      const s = cam.clampScale(cam.scale * f);
      if (Math.abs(s / cam.scale - 1) < 0.05) continue; // at a zoom limit
      const hw = (cam.w / 2 + CACHE_MARGIN) / s, hh = (cam.h / 2 + CACHE_MARGIN) / s;
      const y0 = cy - hh, sh = (2 * hh) / WARM_STRIPS;
      for (let k = 0; k < WARM_STRIPS; k++) {
        warm.jobs.push({ x0: cx - hw, x1: cx + hw, y0: y0 + k * sh, y1: y0 + (k + 1) * sh, s, dpr });
      }
    }
    if (warm.jobs.length) warm.handle = idle(runWarm);
  }
  function runWarm(deadline) {
    warm.handle = 0;
    if (document.hidden || cam.moving || gestureZoom || warm.sig !== warmSig()) { warm.jobs = []; return; }
    if (!warm.cv) {
      warm.cv = document.createElement("canvas");
      warm.cv.width = warm.cv.height = 8; // stamps land off-canvas; only the sprite caches get painted
      warm.ctx = warm.cv.getContext("2d");
    }
    do {
      const vp = warm.jobs.shift();
      try {
        const t0 = performance.now();
        mapRender.warmSprites(warm.ctx, vp, w, { lens: state.lens, selectedCity: state.selectedCity, layers: staticLayers, app });
        record(perf.warm, performance.now() - t0);
      } catch (err) {
        console.warn("sprite warm-up failed", err);
        warm.jobs = [];
      }
    } while (warm.jobs.length && deadline.timeRemaining() > 6);
    if (warm.jobs.length) warm.handle = idle(runWarm);
  }

  function record(list, ms) {
    list.push(ms);
    if (list.length > 60) list.shift();
  }

  function draw(moving) {
    const t0 = performance.now();
    const v = cam.view();
    const c = cache.vp;
    const sameKey = c && cache.key === cacheKey();
    const covers = sameKey && v.x0 >= c.x0 && v.y0 >= c.y0 && v.x1 <= c.x1 && v.y1 <= c.y1;
    const ratio = c ? cam.scale / c.s : 1;
    // Re-render when the cache misses the view, when the zoom has settled, or when a zoom-in gets too blurry.
    // A pinch counts as moving: the scale changes every pointer event, and re-rendering each one would stall.
    const settling = moving || gestureZoom;
    if (!covers || (!settling && Math.abs(ratio - 1) > 1e-3) || ratio > 2) {
      // A pure pan (same layer, same zoom) that ran off an edge: lead the new cache in that direction.
      const pan = sameKey && cam.scale === c.s && !gestureZoom
        ? [v.x0 < c.x0 ? -1 : v.x1 > c.x1 ? 1 : 0, v.y0 < c.y0 ? -1 : v.y1 > c.y1 ? 1 : 0] : null;
      renderStatic(pan);
      if (!settling) scheduleWarm();
    }

    const vp = cache.vp;
    const k = cam.scale / vp.s;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = OCEAN_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    const [dx, dy] = cam.toScreen(vp.x0, vp.y0);
    ctx.drawImage(cache.cv, dx, dy, vp.cssW * k, vp.cssH * k);

    const s = cam.scale;
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (cam.w / 2 - cam.x * s), dpr * (cam.h / 2 - cam.y * s));
    drawOverlay(ctx, cam, w, state);
    if (state.highlight) drawHighlight(ctx, cam, w, state, { resourceHits: cache.hits.resources, items: resources?.items, cityById });
    if (overlays.length) drawOverlays(ctx, cam, overlays, app, { dpr, zMax: 100 });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Plates of cities beside an open dock stay clear of it (desktop docks only; phones use a bottom sheet).
    const d = isMobile() ? null : dockState();
    state.bannerBounds = d && d.open ? { x0: d.l, x1: cam.w - d.r } : null;
    hits = drawBanners(ctx, cam, w, state, nation.yields, nation);
    if (overlays.length) drawOverlays(ctx, cam, overlays, app, { dpr, zMin: 100 });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    minimap.draw();
    record(perf.frame, performance.now() - t0);
  }

  function frame(now) {
    queued = false;
    const dt = lastFrame ? (now - lastFrame) / 1000 : 1 / 60;
    const moving = cam.step(dt);
    draw(moving);
    lastFrame = moving ? now : 0;
    const camSig = `${cam.x},${cam.y},${cam.scale}`;
    if (camSig !== lastCamSig) {
      lastCamSig = camSig;
      emitCamera();
    }
    // The link follows a flight's destination (written right away), and otherwise the camera itself, debounced so
    // it catches up once a pan or zoom settles. Re-scheduling on every flight frame would hold it back until landing.
    const f = cam.flight;
    const urlCamSig = f ? `f${f.x1},${f.y1},${f.s1}` : camSig;
    if (urlCamSig !== lastUrlCamSig) {
      lastUrlCamSig = urlCamSig;
      url.schedule();
    }
    if (moving) requestDraw();
    else if (selectionAnimates() && !document.hidden && !animTimer) {
      // Keep the selected state's border highlight animating, at a gentle frame rate.
      animTimer = setTimeout(() => { animTimer = 0; requestDraw(); }, SELECT_ANIM_MS);
    }
  }
  // render/map.js says whether the selected state's border pulses (off with prefers-reduced-motion).
  function selectionAnimates() {
    if (typeof mapRender.isAnimating === "function") return !!mapRender.isAnimating(state);
    return state.selectedState != null && !matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function requestDraw() {
    if (!queued) {
      queued = true;
      requestAnimationFrame(frame);
    }
  }

  // --- view ----------------------------------------------------------------------------------------------------
  // Home view: the land's bounding box framed in the visible area (below the top bar, above the mobile dock), with
  // extra room left and right so the coastal city banners (~120 px, centred on the city) are not clipped.
  const HOME_M = 190; // fallback frame if the world has no owned cells: world.json margin is 200 km
  const HOME_PAD_X = 92;
  const HOME_PAD_Y = 26;
  const landBox = (() => {
    const g = w.grid, own = w.raw.owner;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < g.size; i++) {
      if (!(own[i] >= 0)) continue;
      const x = g.cx(i), y = g.cy(i);
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    if (!Number.isFinite(x0)) return { x0: HOME_M, y0: HOME_M, x1: world.width - HOME_M, y1: world.height - HOME_M };
    return { x0: x0 - g.R, y0: y0 - g.R, x1: x1 + g.R, y1: y1 + g.R };
  })();
  // Portrait phones: the whole country would be a thin strip between big bands of fog, so start closer in.
  const isPortraitPhone = () => cam.w <= 700 && cam.h > cam.w * 1.15;
  const PORTRAIT_ZOOM = 1.3; // the country fills the width (Maine and Washington crop a little; banners stay on screen)
  // The scale that frames the whole land in the visible area (URL zoom levels are relative to it).
  const fitIn = (a, padFrac = 0.1) => {
    const padX = Math.min(HOME_PAD_X, (a.x1 - a.x0) * padFrac);
    const s = Math.min((a.x1 - a.x0 - 2 * padX) / (landBox.x1 - landBox.x0), (a.y1 - a.y0 - 2 * HOME_PAD_Y) / (landBox.y1 - landBox.y0));
    return s > 0 && Number.isFinite(s) ? s : cam.scale || 1;
  };
  const fitScale = () => fitIn(visibleArea(false, false));
  // The furthest zoom-out allowed: a bit beyond the home view, and always far enough that the whole country fits
  // beside open docks (an advisor dashboard at 1024 px leaves only ~560 px of map).
  function updateMinScale(fs = fitScale()) {
    const base = fs * (isPortraitPhone() ? 0.9 : 0.6);
    const d = dockState();
    const docked = d.open ? fitIn(visibleArea(false, d), 0.08) * 0.9 : Infinity;
    cam.minScale = Math.min(base, docked);
  }
  // Centre and scale of the home view.
  function homeView() {
    const fs = fitScale();
    const s = isPortraitPhone() ? fs * PORTRAIT_ZOOM : fs;
    const a = visibleArea(false, false);
    const cx = (landBox.x0 + landBox.x1) / 2, cy = (landBox.y0 + landBox.y1) / 2;
    // Put the land's centre in the middle of the visible area, not of the whole canvas.
    return { x: cx - ((a.x0 + a.x1) / 2 - cam.w / 2) / s, y: cy - ((a.y0 + a.y1) / 2 - cam.h / 2) / s, s, fs };
  }
  function home() {
    if (!(cam.w > 160 && cam.h > 160)) return false; // hidden or still being laid out
    const h = homeView();
    cam.stop();
    cam.scale = h.s;
    cam.fitScale = h.fs;
    updateMinScale(h.fs);
    cam.x = h.x;
    cam.y = h.y;
    return true;
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    const cw = Math.max(1, innerWidth), ch = Math.max(1, innerHeight);
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    cam.resize(cw, ch);
    // Keep refitting until the user has moved the map (the first layout may be tiny or hidden).
    if (!userMoved || !(cam.scale > 0)) home();
    else updateMinScale();
    requestDraw();
    events.emit("resize", { w: cam.w, h: cam.h, dpr });
  }

  function moved() {
    userMoved = true;
    dockFramed = false;
    hideTooltip();
    url.schedule();
  }

  // The part of the screen not covered by the top bar, the docks (app.ui.dock) and an open panel / bottom sheet
  // (css px). Open docks always count (an extension's dashboard covers the map whether or not a panel is open);
  // only the home fit calls visibleArea(false, false), so URL zoom levels stay comparable.
  const panelShown = () => !!panelEl && !panelEl.hidden;
  const NO_DOCKS = { l: 0, r: 0, open: false };
  const dockState = () => (ui
    ? { l: ui.dockWidth("left") || 0, r: ui.dockWidth("right") || 0, open: !!(ui.isDockOpen("left") || ui.isDockOpen("right")) }
    : NO_DOCKS);

  // Docks opening, closing or changing width change the usable map area. Unless something is already flying the
  // camera (an extension framing its own view right after docking), keep the map readable:
  //  * from the home view (or a view this function framed), fit the whole land into what is left, and go back home
  //    when the last dock closes;
  //  * otherwise keep whatever was in the middle of the usable area in the middle (on phones this lifts the map
  //    above the bottom sheet).
  let lastDocks = NO_DOCKS;
  function onDocksChanged() {
    const prevD = lastDocks, now = dockState();
    lastDocks = now;
    if (prevD.l === now.l && prevD.r === now.r && prevD.open === now.open) return;
    updateMinScale();
    if (cam.moving || !(cam.w > 160 && cam.h > 160) || !(cam.scale > 0)) return;
    const panel = panelShown();
    const a = visibleArea(panel, now);
    const acx = (a.x0 + a.x1) / 2, acy = (a.y0 + a.y1) / 2;
    if (!userMoved || dockFramed) {
      if (now.open) {
        const h = homeView();
        const fit = fitIn(a, 0.08);
        const s = cam.clampScale(Math.min(h.s, fit));
        const cx = (landBox.x0 + landBox.x1) / 2, cy = (landBox.y0 + landBox.y1) / 2;
        cam.flyTo(cx - (acx - cam.w / 2) / s, cy - (acy - cam.h / 2) / s, s, 450);
        userMoved = true;
        dockFramed = true;
      } else if (dockFramed) {
        const h = homeView();
        cam.flyTo(h.x, h.y, h.s, 450);
        userMoved = false;
        dockFramed = false;
      }
    } else {
      const p = visibleArea(panel, prevD);
      const [wx, wy] = cam.toWorld((p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2);
      const s = cam.scale;
      cam.flyTo(wx - (acx - cam.w / 2) / s, wy - (acy - cam.h / 2) / s, s, 350);
    }
    requestDraw();
  }
  // `docks`: true = the docks as they are now, false = none, or a dockState()-shaped object.
  function visibleArea(panelOpen = panelShown(), docks = true) {
    const d = docks === true ? dockState() : docks || NO_DOCKS;
    if (isMobile()) {
      const sheet = panelOpen || d.open;
      return { x0: 0, y0: TOPBAR_H, x1: cam.w, y1: sheet ? cam.h * 0.45 : cam.h - 56 };
    }
    const dl = d.l, dr = d.r;
    const x1 = cam.w - dr - (panelOpen && cam.w > 760 ? PANEL_W : 0);
    return { x0: Math.min(dl, x1 - 100), y0: TOPBAR_H, x1, y1: cam.h };
  }

  // Fly so that world point (x, y) lands in the middle of the visible area at scale s.
  function flyToVisible(x, y, s, ms = 750) {
    updateMinScale();
    s = cam.clampScale(s);
    hideTooltip();
    const a = visibleArea();
    const vx = (a.x0 + a.x1) / 2, vy = (a.y0 + a.y1) / 2;
    cam.flyTo(x - (vx - cam.w / 2) / s, y - (vy - cam.h / 2) / s, s, ms);
    userMoved = true;
    dockFramed = false;
    requestDraw();
  }

  function focusCity(city) {
    const s = Math.min(cam.maxScale, Math.max(cam.scale, 0.8));
    flyToVisible(w.grid.cx(city.cell), w.grid.cy(city.cell), s);
  }

  const stateBoxes = new Map();
  function stateBox(idx) {
    if (stateBoxes.has(idx)) return stateBoxes.get(idx);
    const g = w.grid;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < g.size; i++) {
      if (w.raw.owner[i] !== idx) continue;
      const x = g.cx(i), y = g.cy(i);
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    const box = Number.isFinite(x0) ? { x0: x0 - g.R, y0: y0 - g.R, x1: x1 + g.R, y1: y1 + g.R } : null;
    stateBoxes.set(idx, box);
    return box;
  }

  // Frame a km rectangle in the visible area, with extra css-px padding on each side. Returns the target scale.
  function fitBounds(x0, y0, x1, y1, { padLeft = 24, padRight = 24, padTop = 24, padBottom = 24, maxScale = cam.maxScale, ms = 750 } = {}) {
    hideTooltip();
    updateMinScale();
    const a = visibleArea();
    const ax0 = a.x0 + padLeft, ax1 = a.x1 - padRight, ay0 = a.y0 + padTop, ay1 = a.y1 - padBottom;
    const bw = Math.max(1e-6, x1 - x0), bh = Math.max(1e-6, y1 - y0);
    let s = Math.min(Math.max(20, ax1 - ax0) / bw, Math.max(20, ay1 - ay0) / bh);
    s = cam.clampScale(Math.min(maxScale, s));
    const vx = (ax0 + ax1) / 2, vy = (ay0 + ay1) / 2;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    cam.flyTo(cx - (vx - cam.w / 2) / s, cy - (vy - cam.h / 2) / s, s, ms);
    userMoved = true;
    dockFramed = false;
    requestDraw();
    return s;
  }

  function focusState(idx) {
    const b = stateBox(idx);
    if (!b) return;
    const a = visibleArea(true);
    const pad = 36;
    const s = Math.min((a.x1 - a.x0 - 2 * pad) / (b.x1 - b.x0), (a.y1 - a.y0 - 2 * pad) / (b.y1 - b.y0));
    flyToVisible((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, Math.min(2.2, Math.max(fitScale(), s * 0.85))); // a little context around it
  }

  // --- lens ------------------------------------------------------------------------------------------------------
  const dock = initLensDock({
    lenses: lensFile, sources: sources || [], w,
    onPick: (lens) => setLens(lens),
    onBand: (band) => setBand(band),
  });

  let minimapQueued = false;
  const rebuildMinimap = () => {
    if (minimapQueued) return;
    minimapQueued = true;
    requestAnimationFrame(() => { minimapQueued = false; minimap.rebuild(); });
  };

  function setLens(lens) {
    const changed = lens !== state.lens;
    state.lens = lens;
    state.band = null;
    applyLens(w, lens, null);
    dock.render(lens, null);
    rebuildMinimap();
    describeCanvas();
    requestDraw();
    url.schedule();
    if (changed) events.emit("lens", lens);
  }

  function setBand(band) {
    if (!state.lens) return;
    state.band = band;
    applyLens(w, state.lens, band);
    rebuildMinimap();
    requestDraw(); // the cache key includes the band, so the static layer re-renders
  }

  // --- selection -------------------------------------------------------------------------------------------------
  const announceEl = document.getElementById("announce");
  const announce = (text) => {
    announceEl.textContent = "";
    setTimeout(() => (announceEl.textContent = text), 30);
  };
  const stateName = (idx) => states?.[idx]?.name || w.raw.states[idx]?.name || "시도";

  function describeCanvas() {
    const parts = ["Hex map of the contiguous United States", state.lens ? `coloured by the ${state.lens.name} lens` : "showing terrain"];
    if (state.selectedCity) parts.push(`${state.selectedCity.name} selected`);
    else if (state.selectedState != null) parts.push(`${stateName(state.selectedState)} selected`);
    canvas.setAttribute("aria-label", parts.join(", "));
  }

  const panelCtx = () => ({
    w, nation, states, cities,
    onClose: () => clearSelection(),
    onPedia: () => pedia.open("지표"),
    onState: (idx) => selectState(idx, { fly: true }),
    onCity: (city) => selectCity(city, { fly: true }),
  });

  function selectCity(city, { fly = true } = {}) {
    if (!city) return clearSelection();
    state.selectedCity = city;
    state.selectedState = null;
    app.panels.city(city, panelCtx());
    if (fly && city.cell != null) focusCity(city);
    announce(`${city.name} selected. ${city.full || ""}`);
    afterSelect();
  }

  function selectState(idx, { fly = false } = {}) {
    if (idx == null || !w.raw.states[idx]) return clearSelection();
    state.selectedCity = null;
    state.selectedState = idx;
    app.panels.state(idx, panelCtx());
    if (fly) focusState(idx);
    announce(`${stateName(idx)} selected.`);
    afterSelect();
  }

  function clearSelection() {
    const had = state.selectedCity || state.selectedState != null;
    state.selectedCity = null;
    state.selectedState = null;
    app.panels.close();
    if (had) announce("Selection closed.");
    afterSelect();
  }

  let lastSelSig = "";
  function afterSelect() {
    hideTooltip();
    describeCanvas();
    requestDraw();
    url.schedule();
    const sig = state.selectedCity ? `c${state.selectedCity.id}` : state.selectedState != null ? `s${state.selectedState}` : "";
    if (sig !== lastSelSig) {
      lastSelSig = sig;
      events.emit("select", state.selectedCity ? { kind: "city", city: state.selectedCity }
        : state.selectedState != null ? { kind: "state", index: state.selectedState, state: states?.[state.selectedState] ?? null, info: w.raw.states[state.selectedState] }
          : null);
    }
  }

  installSheetSwipe(() => clearSelection());

  // --- URL state -------------------------------------------------------------------------------------------------
  // #state= accepts a FIPS code ("48", "6"), a postal code ("TX", "tx") or a name ("Texas"). Links keep the form
  // they were opened with; the app itself writes FIPS.
  function stateFromHash(ref) {
    const t = String(ref ?? "").trim();
    if (!t) return -1;
    if (/^\d{1,2}$/.test(t)) return stateIndex(w, t.padStart(2, "0"));
    const k = stateIndex(w, t.toUpperCase());
    if (k >= 0) return k;
    const name = t.toLowerCase().replace(/[_+]/g, " ");
    return w.raw.states.findIndex((st, i) => (states?.[i]?.name || st.name || "").toLowerCase() === name);
  }
  let stateHashRef = null; // {idx, raw}: the form of the #state value the current selection came from
  const url = createHashState({
    // A flight is not "busy": read() reports its destination. Pans and wheel zooms are, until they settle.
    busy: () => cam.moving && !cam.flight && !held.size,
    read() {
      const sel = state.selectedCity ? { city: state.selectedCity.id }
        : state.selectedState != null ? {
          state: stateHashRef && stateHashRef.idx === state.selectedState ? stateHashRef.raw : w.raw.states[state.selectedState]?.fips,
        } : {};
      return {
        lens: state.lens?.id || null,
        ...sel,
        // at = [x km, y km, log2(scale / home-fit scale)]; during a flight, where it will land.
        at: userMoved ? (cam.flight ? [cam.flight.x1, cam.flight.y1, Math.log2(cam.flight.s1 / fitScale())]
          : [cam.x, cam.y, Math.log2(cam.scale / fitScale())]) : null,
      };
    },
    apply(p, { initial }) {
      const lens = p.lens ? lensById.get(p.lens) || null : null;
      if (lens !== state.lens || state.band) setLens(lens);
      if (lens) dock.remember(lens.id);
      const city = p.city ? cities.find((c) => c.id === p.city) : null;
      const sIdx = p.state ? stateFromHash(p.state) : -1;
      stateHashRef = sIdx >= 0 ? { idx: sIdx, raw: p.state } : null;
      if (city) {
        if (city !== state.selectedCity) selectCity(city, { fly: !p.at });
      } else if (sIdx >= 0) {
        if (sIdx !== state.selectedState) selectState(sIdx, { fly: !p.at });
      } else if (state.selectedCity || state.selectedState != null) clearSelection();
      if (p.at) {
        const [x, y, z] = p.at;
        const s = cam.clampScale(fitScale() * 2 ** z);
        if (initial) {
          cam.stop();
          cam.x = x;
          cam.y = y;
          cam.scale = s;
          cam.clamp();
        } else cam.flyTo(x, y, s, 650);
        userMoved = true;
      } else if (!initial && !city && sIdx < 0) {
        const h = homeView();
        cam.flyTo(h.x, h.y, h.s, 650);
        userMoved = false;
      }
      requestDraw();
    },
  });

  // --- top bar, search, share, help ------------------------------------------------------------------------------
  const setBtn = (id, html) => {
    const b = document.getElementById(id);
    if (b) b.innerHTML = html;
    return b;
  };
  setBtn("btn-share", `${icon("share", "🔗", { size: 15 })}<span class="lbl">공유</span>`);
  setBtn("btn-help", icon("help", "?", { size: 15 }));
  setBtn("btn-pedia", `${icon("pedia", "📖", { size: 16 })}<span class="lbl">자료 출처</span>`);
  const searchIc = document.querySelector(".search-ic");
  if (searchIc) searchIc.innerHTML = icon("search", "🔍", { size: 14 });
  document.querySelector(".search-kbd")?.setAttribute("title", "Press / or Ctrl K to search");

  const search = initSearch({
    cities,
    states: w.raw.states.map((s, i) => ({ name: states?.[i]?.name || s.name, abbr: s.abbr, population: states?.[i]?.population })),
    onPick(r) {
      if (r.kind === "city") selectCity(r.city, { fly: true });
      else selectState(r.index, { fly: true });
    },
  });

  const toastEl = document.getElementById("toast");
  let toastTimer = 0;
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.hidden = true), 1800);
  };
  ui = createUi(app, {
    toast,
    // A dock opened, closed or changed width: the usable map area changed.
    onLayout: () => { onDocksChanged(); requestDraw(); events.emit("resize", { w: cam.w, h: cam.h, dpr, docks: true }); },
  });

  // Renders the current view (minus panels) into an offscreen canvas for the share image.
  function renderShareMap(target, W, H) {
    const a = visibleArea();
    const [cx, cy] = cam.toWorld((a.x0 + a.x1) / 2, (a.y0 + a.y1) / 2);
    const vw = (a.x1 - a.x0) / cam.scale, vh = (a.y1 - a.y0) / cam.scale;
    // Lay the frame out at about the on-screen size and render it at a higher pixel ratio, so banners and labels
    // keep the proportions they have on screen instead of shrinking on a 1600 px canvas.
    const k = Math.min(2, Math.max(1, W / Math.max(1, a.x1 - a.x0)));
    const cssW = W / k, cssH = H / k;
    const snap = new Camera(world.width, world.height);
    snap.resize(cssW, cssH);
    snap.minScale = 1e-6;
    snap.maxScale = 1e6;
    // The image (about 2:1) is wider than most screens. "Contain" framing would pad it with wide bands of
    // off-world fog, "cover" would crop a lot of the view: zoom in from contain until the frame is no wider than
    // the world plus a little (the whole country still fits at home; the vignette sinks the rest into deep
    // water), but never past cover.
    const sContain = Math.min(cssW / vw, cssH / vh), sCover = Math.max(cssW / vw, cssH / vh);
    // ...and, zoomed out, keep the whole height of the land (with the northern banners) in the frame.
    const sNoFog = Math.min(cssW / (world.width * 1.2), (cssH - 16) / (landBox.y1 - landBox.y0));
    snap.scale = Math.min(sCover, Math.max(sContain, sNoFog));
    // Keep the frame (nearly) inside the world rectangle: it may overhang by a tenth of its size, which the
    // vignette turns into open water, so a coastal selection is not shoved against the image edge.
    const fw = cssW / snap.scale, fh = cssH / snap.scale;
    const inside = (c, f, W) => {
      const m = f * 0.1;
      return f >= W + 2 * m ? W / 2 : Math.min(W - f / 2 + m, Math.max(f / 2 - m, c));
    };
    snap.x = inside(cx, fw, world.width);
    snap.y = inside(cy - 14 / snap.scale, fh, world.height); // nudged up: banners stand above their cities
    const shot = { ...state, hoverCell: -1 };
    const c = target.getContext("2d");
    c.fillStyle = OCEAN_BG;
    c.fillRect(0, 0, W, H);
    // Map first, then a vignette that sinks any off-world fog at the frame edges into deep water, then banners.
    const s = snap.scale;
    if (typeof snapshot?.renderToCanvas === "function") {
      snapshot.renderToCanvas(target, snap, w, shot, nation, {
        banners: false, dpr: k, scale: s, x: snap.x, y: snap.y, app, overlays: overlays.filter((o) => o.snapshot && (o.z ?? 0) < 100),
        staticLayers: staticLayers.filter((l) => l.snapshot !== false),
      });
    } else {
      const v = snap.view();
      drawStatic(c, { x0: v.x0, y0: v.y0, x1: v.x1, y1: v.y1, s, dpr: k, cssW, cssH }, w, {
        lens: state.lens, showResources: state.showResources, layers: staticLayers.filter((l) => l.snapshot !== false), app, snapshot: true,
      });
      c.setTransform(k * s, 0, 0, k * s, k * (cssW / 2 - snap.x * s), k * (cssH / 2 - snap.y * s));
      drawOverlay(c, snap, w, shot, 0);
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
    shareVignette(c, W, H, snap, k);
    c.setTransform(k, 0, 0, k, 0, 0);
    drawBanners(c, snap, w, shot, nation.yields, nation);
    c.setTransform(1, 0, 0, 1, 0, 0);
    return true;
  }

  // Edge treatment for the share image (device px). Where the frame reaches past the world rectangle, the flat
  // off-world fog fades into deep water; elsewhere a light vignette frames the picture.
  function shareVignette(c, W, H, snap, k) {
    const deep = (a) => `rgba(9,24,42,${a})`;
    const [wx0, wy0] = snap.toScreen(0, 0).map((v) => v * k);
    const [wx1, wy1] = snap.toScreen(world.width, world.height).map((v) => v * k);
    const fade = 70; // px the fade reaches into the world
    const band = (x0, y0, x1, y1, rx, ry, rw, rh) => {
      const g = c.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, deep(0.92));
      g.addColorStop(1, deep(0));
      c.fillStyle = g;
      c.fillRect(rx, ry, rw, rh);
    };
    if (wx0 > -fade) band(0, 0, wx0 + fade, 0, 0, 0, Math.max(0, wx0 + fade), H);
    if (wx1 < W + fade) band(W, 0, wx1 - fade, 0, wx1 - fade, 0, W - (wx1 - fade), H);
    if (wy0 > -fade) band(0, 0, 0, wy0 + fade, 0, 0, W, Math.max(0, wy0 + fade));
    if (wy1 < H + fade) band(0, H, 0, wy1 - fade, 0, wy1 - fade, W, H - (wy1 - fade));
    const r = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.55, W / 2, H / 2, Math.hypot(W, H) / 2);
    r.addColorStop(0, deep(0));
    r.addColorStop(1, deep(0.38));
    c.fillStyle = r;
    c.fillRect(0, 0, W, H);
  }

  const shareInfo = () => ({
    renderMap: renderShareMap,
    lens: state.lens,
    formatValue: (lens, t) => formatLensValue(lens, lensValueAt(lens, t)),
    selection: state.selectedCity ? { kind: "city", name: state.selectedCity.name }
      : state.selectedState != null ? { kind: "state", name: stateName(state.selectedState) } : null,
  });
  const slug = (s) => String(s).toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const share = initShare({
    button: document.getElementById("btn-share"),
    getInfo: shareInfo,
    beforeCopy: () => url.flush(),
    fileName: () => {
      const sel = shareInfo().selection;
      return `united-states-${state.lens?.id || "terrain"}${sel ? "-" + slug(sel.name) : ""}.png`;
    },
    onToast: toast,
  });

  function focusPanel() {
    const p = document.getElementById("city-panel");
    if (!p || p.hidden) return;
    if (!p.hasAttribute("tabindex")) p.tabIndex = -1;
    p.focus({ preventScroll: true });
  }

  // National reports under the top-bar stats.
  const reports = initYieldReports({
    nation, states, cities, lenses: lensFile.lenses, lensVintage: lensFile.vintage,
    // A row picked from a report opens the place's panel; keyboard focus follows it there.
    onState: (idx) => { selectState(idx, { fly: true }); focusPanel(); },
    onCity: (city) => { selectCity(city, { fly: true }); focusPanel(); },
    onLens: (id) => {
      const lens = lensById.get(id);
      if (!lens) return;
      if (lens !== state.lens) setLens(lens);
      dock.remember(lens.id);
    },
  });

  document.getElementById("btn-help").onclick = () => help.toggle();
  document.getElementById("btn-pedia").onclick = () => pedia.open();

  // --- resources toggle + minimap toggle -------------------------------------------------------------------------
  const resBtn = document.getElementById("btn-res");
  if (resBtn) {
    resBtn.hidden = !w.resources;
    resBtn.innerHTML = `${icon("resources", "⛏️", { size: 15 })}<span>자원</span>`;
    const sync = () => {
      resBtn.classList.toggle("active", state.showResources);
      resBtn.setAttribute("aria-pressed", String(state.showResources));
    };
    resBtn.onclick = () => {
      state.showResources = !state.showResources;
      sync();
      requestDraw();
    };
    sync();
  }
  const mmBtn = document.getElementById("btn-minimap");
  if (mmBtn) {
    mmBtn.innerHTML = icon("terrain", "🗺️", { size: 18 });
    mmBtn.onclick = () => {
      const on = !document.body.classList.contains("minimap-on");
      document.body.classList.toggle("minimap-on", on);
      mmBtn.setAttribute("aria-pressed", String(on));
      mmBtn.setAttribute("aria-label", on ? "작은 지도 숨기기" : "작은 지도 보기");
      minimap.draw();
    };
  }

  // Map layer switches (app.ui.addMapToggle), in a menu next to the Resources toggle; kept in the hash (layers=).
  const mapToggles = createMapToggles({
    dock: document.getElementById("lens-dock"), after: resBtn, area: document.getElementById("lens-area"),
    hash: { register: url.register, update: url.schedule, value: url.value },
    onChange: () => requestDraw(),
  });
  ui.addMapToggle = mapToggles.add;
  ui.mapToggles = mapToggles.list;
  ui.setMapToggle = mapToggles.set;

  // --- input -----------------------------------------------------------------------------------------------------
  const hitCity = (mx, my) => hits.find((h) => mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h)?.city;
  const cellAt = (mx, my) => w.grid.cellAt(...cam.toWorld(mx, my));
  // The resource icon under a screen point (css px), from where the cached static layer placed the icons.
  function hitResource(mx, my) {
    if (!state.showResources || !cache.vp) return null;
    const k = cam.scale / cache.vp.s; // the cache is blitted scaled while a zoom settles
    for (const p of cache.hits.resources) {
      const [sx, sy] = cam.toScreen(p.x, p.y);
      const r = p.r * k + 1;
      if ((mx - sx) ** 2 + (my - sy) ** 2 <= r * r) return p.item;
    }
    return null;
  }
  // The topmost registered static layer item under a screen point (css px): {layer, item} or null. Layers are asked
  // from the highest z down, only when drawn at the current zoom, with the pointer in world km.
  function hitLayer(mx, my) {
    if (!staticLayers.length) return null;
    const Rpx = w.grid.R * cam.scale;
    let xy = null;
    for (let k = staticLayers.length - 1; k >= 0; k--) {
      const l = staticLayers[k];
      if (typeof l.hit !== "function" || !layerActive(l, Rpx)) continue;
      xy ??= cam.toWorld(mx, my);
      let item = null;
      try {
        item = l.hit(xy[0], xy[1], Rpx);
      } catch (err) {
        layerError(l, "hit", err);
      }
      if (item != null) return { layer: l, item };
    }
    return null;
  }
  let lastHover = { cell: -1, city: null, resource: null, layer: null, item: null };
  function emitHover(cell, city, resource, x = null, y = null, lh = null) {
    const layer = lh?.layer.id ?? null, item = lh?.item ?? null;
    if (cell === lastHover.cell && city === lastHover.city && resource === lastHover.resource && layer === lastHover.layer && item === lastHover.item) return;
    // x, y: screen css px of the pointer (null when it left the map); layer / item: a static layer's hit, or null
    lastHover = { cell, city, resource, x, y, layer, item };
    events.emit("hover", lastHover);
  }
  // "camera" events: at most every 100 ms while moving, plus once when the camera settles.
  let camEmitAt = 0, camTimer = 0;
  function emitCamera() {
    const now = performance.now();
    const fire = () => {
      camEmitAt = performance.now();
      camTimer = 0;
      events.emit("camera", { x: cam.x, y: cam.y, scale: cam.scale, Rpx: w.grid.R * cam.scale, moving: cam.moving });
    };
    if (now - camEmitAt >= 100) {
      clearTimeout(camTimer);
      fire();
    } else if (!camTimer) camTimer = setTimeout(fire, 100 - (now - camEmitAt));
    if (!cam.moving) {
      clearTimeout(camTimer);
      camTimer = setTimeout(fire, 120); // trailing event with the settled view
    }
  }
  const pointers = new Map(); // pointerId -> {x, y}
  let drag = null; // {moved}
  let pinch = null; // {dist, cx, cy}
  let lastTap = null; // {t, x, y}
  let pendingTap = 0;

  function hover(mx, my) {
    const city = hitCity(mx, my);
    const cell = cellAt(mx, my);
    if (cell !== state.hoverCell) {
      state.hoverCell = cell;
      requestDraw();
    }
    const lh = city ? null : hitLayer(mx, my);
    let tip = null;
    if (lh && typeof lh.layer.tooltip === "function") {
      try {
        tip = lh.layer.tooltip(lh.item);
      } catch (err) {
        layerError(lh.layer, "tooltip", err);
      }
    }
    if (city) showCityTooltip(mx, my, city);
    else if (tip != null && tip !== "") showHtmlTooltip(mx, my, tip);
    else if (cell >= 0) showCellTooltip(mx, my, w, cell, state.lens, state.showResources);
    else hideTooltip();
    if (events.has("hover")) emitHover(cell, city || w.cityByCell.get(cell) || null, hitResource(mx, my), mx, my, lh);
  }

  canvas.addEventListener("pointerdown", (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
    cam.stop();
    if (pointers.size === 1) drag = { moved: 0 };
    else if (pointers.size === 2) {
      drag = { moved: 99 }; // a two-finger gesture is never a tap
      const [a, b] = [...pointers.values()];
      pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      hideTooltip();
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) {
      if (e.pointerType === "mouse") hover(e.clientX, e.clientY);
      return;
    }
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (pinch && pointers.size >= 2) {
      // Two pointers: zoom about their midpoint and pan with it.
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      if (pinch.dist > 0 && dist > 0) cam.zoomAt(cx, cy, dist / pinch.dist);
      gestureZoom = true;
      cam.panBy(cx - pinch.cx, cy - pinch.cy);
      pinch = { dist, cx, cy };
      moved();
      requestDraw();
      return;
    }
    if (drag) {
      drag.moved += Math.abs(dx) + Math.abs(dy);
      if (drag.moved > 4) {
        canvas.classList.add("dragging");
        cam.panBy(dx, dy);
        moved();
        requestDraw();
      }
    }
  });
  canvas.addEventListener("pointerup", (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (gestureZoom && pointers.size < 2) { gestureZoom = false; requestDraw(); } // render the settled zoom
    if (pointers.size > 0) return;
    canvas.classList.remove("dragging");
    const wasTap = drag && drag.moved <= 4;
    drag = null;
    if (!wasTap) return;
    const mx = e.clientX, my = e.clientY;
    const now = performance.now();
    if (lastTap && now - lastTap.t < DOUBLE_MS && Math.hypot(mx - lastTap.x, my - lastTap.y) < 12) {
      // Double click / double tap: zoom in, never select.
      clearTimeout(pendingTap);
      lastTap = null;
      cam.zoomBy(mx, my, 2);
      moved();
      requestDraw();
      return;
    }
    lastTap = { t: now, x: mx, y: my };
    // Resolve the target from the release position now; act once we know it was not a double click.
    const cell = cellAt(mx, my);
    const banner = hitCity(mx, my);
    const lh = banner ? null : hitLayer(mx, my); // a layer's site wins over the city tile under it, not its banner
    const city = banner || w.cityByCell.get(cell);
    const owner = cell >= 0 ? w.raw.owner[cell] : -1;
    const resource = hitResource(mx, my);
    clearTimeout(pendingTap);
    pendingTap = setTimeout(() => {
      // Extensions (e.g. a mode) may take the click: a "mapclick" handler that returns true consumes it.
      const ev = {
        cell, city: city || null, resource, state: owner >= 0 ? owner : null, x: mx, y: my, pointerType: e.pointerType,
        layer: lh?.layer.id ?? null, item: lh?.item ?? null,
      };
      // A static layer's click(item, ev) returning true consumes the click (e.g. opening its own card). It goes
      // before the "mapclick" handlers, except while a mode (City View, advisors) is active: the mode owns clicks.
      const layerClick = () => {
        if (!lh || typeof lh.layer.click !== "function") return false;
        try {
          return lh.layer.click(lh.item, ev) === true;
        } catch (err) {
          layerError(lh.layer, "click", err);
          return false;
        }
      };
      if (!modes.mode && layerClick()) return;
      if (events.emit("mapclick", ev)) return;
      if (modes.mode && layerClick()) return;
      if (city) selectCity(city);
      else if (owner >= 0) {
        // On phones the bottom sheet would hide the state, so bring it into the visible part of the map.
        if (owner !== state.selectedState) selectState(owner, { fly: isMobile() });
      } else if (state.selectedCity || state.selectedState != null) clearSelection();
    }, DOUBLE_MS);
    // A click changes what is on screen (a panel, a mode, a flight), so drop the tooltip until the pointer moves again.
    hideTooltip();
  });
  canvas.addEventListener("pointercancel", (e) => {
    pointers.delete(e.pointerId);
    pinch = null;
    if (gestureZoom) { gestureZoom = false; requestDraw(); }
    drag = null;
    canvas.classList.remove("dragging");
  });
  canvas.addEventListener("pointerleave", () => {
    if (pointers.size) return;
    state.hoverCell = -1;
    hideTooltip();
    requestDraw();
    if (events.has("hover")) emitHover(-1, null, null);
  });
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
    cam.zoomBy(e.clientX, e.clientY, Math.exp(-Math.max(-300, Math.min(300, delta)) * 0.0022));
    moved();
    requestDraw();
  }, { passive: false });
  canvas.addEventListener("dblclick", (e) => e.preventDefault()); // handled in pointerup

  // Keyboard: held arrows / WASD pan smoothly; +/- zoom with easing.
  const PAN_SPEED = 750; // px per second
  const PAN_KEYS = {
    ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0], ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1],
  };
  const held = new Set();
  const updatePan = () => {
    let x = 0, y = 0;
    for (const k of held) { x += PAN_KEYS[k][0]; y += PAN_KEYS[k][1]; }
    cam.pan.x = Math.sign(x) * PAN_SPEED;
    cam.pan.y = Math.sign(y) * PAN_SPEED;
    if (x || y) { moved(); requestDraw(); }
  };
  const typing = (t) => t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
  // Focus on a control (a button, the legend slider) should keep arrow keys for that control.
  const ownsArrows = (t) => t && t !== document.body && (t.getAttribute?.("role") === "slider" || t.closest?.("#lens-picker, #share-pop, #yield-report"));

  // Esc closes the topmost thing: help, search, share, a top-bar report, lens picker, Almanac, then the panel.
  function escape() {
    if (help.isOpen) return help.close();
    if (search.isOpen) return search.close();
    if (share.isOpen) return share.close();
    if (reports.isOpen) return reports.close();
    if (dock.pickerOpen) return dock.closePicker();
    if (mapToggles.isOpen) return mapToggles.close();
    if (pedia.isOpen) return pedia.close();
    if (modes.escape()) return; // the active mode (e.g. the City view) goes before the panels
    if (events.emit("escape", {})) return;
    if (state.selectedCity || state.selectedState != null) return clearSelection();
  }

  window.addEventListener("keydown", (e) => {
    if (e.defaultPrevented) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if ((e.metaKey || e.ctrlKey) && !e.altKey && k === "k") {
      e.preventDefault();
      if (!help.isOpen && !pedia.isOpen) search.focus();
      return;
    }
    if (k === "Escape") { escape(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
    if (k === "?") { e.preventDefault(); help.toggle(); return; }
    if (help.isOpen || pedia.isOpen) return;
    if (k === "/") {
      e.preventDefault();
      search.focus();
    } else if (PAN_KEYS[k] && !(k.startsWith("Arrow") && ownsArrows(e.target))) {
      e.preventDefault();
      held.add(k);
      updatePan();
    } else if (k === "+" || k === "=") { cam.zoomBy(cam.w / 2, cam.h / 2, 1.5); moved(); requestDraw(); }
    else if (k === "-" || k === "_") { cam.zoomBy(cam.w / 2, cam.h / 2, 1 / 1.5); moved(); requestDraw(); }
    else if (k === "l") {
      const all = [null, ...lensFile.lenses];
      const step = e.shiftKey ? -1 : 1;
      setLens(all[(all.indexOf(state.lens) + step + all.length) % all.length]);
    } else if (k === "r" && w.resources) resBtn?.click();
  });
  window.addEventListener("keyup", (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (held.delete(k)) updatePan();
  });
  window.addEventListener("blur", () => { held.clear(); updatePan(); });
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => !document.hidden && resize());

  // --- extension API ---------------------------------------------------------------------------------------------
  // The `app` object handed to ext/*/install(app) and exposed as window.__app. See the README of this API in
  // app/api.js and the summary below; names here are a stable contract with the extensions in ext/.
  const dataLoads = new Map(); // name → Promise<data | null>
  function loadData(name) {
    if (!DATA_NAME.test(String(name))) return Promise.reject(new Error(`loadData: bad name "${name}"`));
    if (!dataLoads.has(name)) {
      dataLoads.set(name, loadJSON(name, true).then((d) => {
        app.data[name] = d ?? null;
        events.emit("data", { name, data: app.data[name] });
        return app.data[name];
      }));
    }
    return dataLoads.get(name);
  }
  function registerStaticLayer(l) {
    if (!l || !l.id || typeof l.draw !== "function") throw new Error("registerStaticLayer({id, z, draw(ctx, vp, w, o)})");
    const k = staticLayers.findIndex((x) => x.id === l.id);
    if (k >= 0) staticLayers.splice(k, 1);
    staticLayers.push(l);
    staticLayers.sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
    cache.key = null;
    scheduleWarm();
    requestDraw();
    return () => unregisterStaticLayer(l);
  }
  function unregisterStaticLayer(idOrLayer) {
    const k = staticLayers.findIndex((x) => x === idOrLayer || x.id === idOrLayer);
    if (k < 0) return false;
    staticLayers.splice(k, 1);
    cache.key = null;
    requestDraw();
    return true;
  }
  Object.assign(app, {
    // data. Optional files arrive via loadData(name) (and the "data" event); see docs/DATA_CONTRACTS.md.
    data: { world, cities, states, nation, lenses: lensFile, resources, sources: sources || [], counties: null },
    loadData,
    loadCounties: () => loadData("counties"),
    w, cam, state, cityById, lensById,
    // drawing
    requestDraw,
    invalidate() { cache.key = null; invalidateHighlight(); requestDraw(); },
    registerOverlay(o) {
      if (!o || typeof o.draw !== "function") throw new Error("registerOverlay({id, z, space, draw})");
      const k = overlays.findIndex((x) => x.id === o.id && o.id != null);
      if (k >= 0) overlays.splice(k, 1);
      overlays.push(o);
      overlays.sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
      requestDraw();
      return () => app.unregisterOverlay(o.id ?? o);
    },
    unregisterOverlay(idOrOverlay) {
      const k = overlays.findIndex((x) => x === idOrOverlay || x.id === idOrOverlay);
      if (k >= 0) overlays.splice(k, 1);
      requestDraw();
    },
    // static map layers (drawn into the cached map; see render/map.js Z for the slots)
    registerStaticLayer,
    unregisterStaticLayer,
    staticLayers: () => [...staticLayers],
    layerZ: LAYER_Z,
    hitLayer: (mx, my) => {
      const h = hitLayer(mx, my);
      return h ? { layer: h.layer.id, item: h.item } : null;
    },
    setHighlight(h) { state.highlight = h || null; requestDraw(); },
    highlightBounds: (h = state.highlight) => highlightBounds(w, h),
    setResourceFilter(f) { state.resourceFilter = f || null; requestDraw(); },
    setShowResources(on) {
      if (!!on !== state.showResources && w.resources) resBtn?.click();
    },
    // selection, lenses, camera
    selectCity(city, { fly = true } = {}) {
      if (typeof city === "string") city = cityById.get(city) || null;
      return city ? selectCity(city, { fly }) : clearSelection();
    },
    selectState(ref, { fly = true } = {}) {
      const idx = stateIndex(w, ref);
      return idx >= 0 ? selectState(idx, { fly }) : clearSelection();
    },
    clearSelection,
    setLens(ref) {
      const lens = ref == null ? null : typeof ref === "string" ? lensById.get(ref) || null : ref;
      if (lens !== state.lens) setLens(lens);
      // A mode's own lens (an advisor colouring the map) shows on the lens button but does not take a quick slot.
      if (lens && !modes.mode) dock.remember(lens.id);
    },
    setBand,
    flyTo(x, y, scale = cam.scale, ms = 750) { flyToVisible(x, y, scale, ms); },
    fitBounds,
    home() { const h = homeView(); cam.flyTo(h.x, h.y, h.s, 750); userMoved = false; requestDraw(); },
    visibleArea: () => visibleArea(),
    isMobile,
    // hit testing (screen css px)
    cellAt,
    hitResource,
    hitCity: (mx, my) => hitCity(mx, my) || null,
    // events
    on: events.on, off: events.off, emit: events.emit,
    // modes + URL
    registerMode: modes.registerMode,
    setMode: modes.setMode,
    hasMode: modes.hasMode,
    hash: { register: url.register, update: url.schedule, soon: url.soon, flush: url.flush, value: url.value },
    // DOM hosts; panels can be replaced by an extension (e.g. the City view)
    ui,
    panels: { city: openCityPanel, state: openStatePanel, close: closeCityPanel, element: panelEl },
    // the built-in modules, for poking at things from the console
    search, share, help, lensDock: dock, reports, pedia, minimap, shareInfo, url, perf,
    stats() {
      const avg = (a) => (a.length ? a.reduce((p, q) => p + q, 0) / a.length : 0);
      return { staticAvg: avg(perf.static), staticLast: perf.static.at(-1), frameAvg: avg(perf.frame), frameLast: perf.frame.at(-1) };
    },
  });
  Object.defineProperties(app, {
    mode: { get: () => modes.mode, enumerable: true }, // name of the active mode or null
    modeParams: { get: () => modes.modeParams, enumerable: true },
  });
  window.__app = app;

  // --- go --------------------------------------------------------------------------------------------------------
  renderTopbar(nation);
  resize();
  setLens(null);
  dock.render(null, null);
  url.applyCurrent(true); // after the home fit, so "at" zoom is relative to it
  document.getElementById("loading").remove();
  // Small optional map-layer files load once the first frame is on screen (extensions can await app.loadData).
  // (A timer backs up the frame callback, which never fires while the page is in a background tab.)
  let eagerKicked = false;
  const kickEager = () => { if (!eagerKicked) { eagerKicked = true; EAGER_DATA.forEach((n) => loadData(n)); } };
  requestAnimationFrame(() => setTimeout(kickEager, 0));
  setTimeout(kickEager, 400);
  // Extensions load after the first frame is on its way; a missing extension folder is fine.
  installExtensions(app);
}

main().catch((err) => {
  console.error(err);
  const el = document.getElementById("loading");
  if (!el) return;
  el.classList.add("error");
  el.textContent = `Could not load the map data (${err.message}). Run "uv run python -m pipeline all" and serve web/ over HTTP.`;
});
