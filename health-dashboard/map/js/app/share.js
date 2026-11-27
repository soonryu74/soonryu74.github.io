// Share popover: copy a link to the current view, or download a 1600×900 PNG of it with a caption strip.
import { drawIcon, hasIcon } from "../icons.js";
import { icon } from "../ui/icon.js";

// The address printed on shared images. Set it to the published site (e.g. "example.com/us-atlas"); when left
// empty, the page's own host and path are used, except on a local dev server, where SITE_FALLBACK is printed.
export const SITE_URL = "health-profile.kr/map";
const SITE_FALLBACK = "usaciv";

export function siteLabel() {
  if (SITE_URL) return SITE_URL;
  try {
    const { hostname, host, pathname } = location;
    const local = !hostname || /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/.test(hostname) || /\.(localhost|test|local)$/.test(hostname);
    if (local || !/^https?:$/.test(location.protocol)) return SITE_FALLBACK;
    const path = pathname.replace(/\/index\.html?$/, "/").replace(/\/$/, "");
    return (host.replace(/^www\./, "") + path).slice(0, 60);
  } catch {
    return SITE_FALLBACK;
  }
}

export const IMG_W = 1600;
export const IMG_H = 900;
export const CAPTION_H = 118;
const SERIF = '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif';
const SANS = '-apple-system, "Segoe UI", system-ui, sans-serif';
const CREDIT = "Data: Census ACS, BEA, NOAA, USGS/MRLC, EIA, Natural Earth";

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through to the legacy path */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

function spaced(ctx, px) {
  if ("letterSpacing" in ctx) ctx.letterSpacing = px + "px";
}

/**
 * Compose the share image.
 * info: {renderMap(canvas, w, h) → bool, lens (lens object or null), formatValue(lens, t) → string,
 *        selection: {kind, name, sub} | null}
 */
export function composeImage(info, { height = IMG_H } = {}) {
  const imgH = Math.max(CAPTION_H + 100, Math.round(height)); // a shorter frame serves 1.91:1 social cards
  const cv = document.createElement("canvas");
  cv.width = IMG_W;
  cv.height = imgH;
  const ctx = cv.getContext("2d");
  const mapH = imgH - CAPTION_H;

  // --- map ---
  ctx.fillStyle = "#0d2a47";
  ctx.fillRect(0, 0, IMG_W, mapH);
  const map = document.createElement("canvas");
  map.width = IMG_W;
  map.height = mapH;
  let ok = false;
  try {
    ok = info.renderMap(map, IMG_W, mapH);
  } catch (err) {
    console.warn("share: map render failed", err);
  }
  if (ok) ctx.drawImage(map, 0, 0);

  // --- caption strip ---
  const y0 = mapH;
  const g = ctx.createLinearGradient(0, y0, 0, imgH);
  g.addColorStop(0, "#24364a");
  g.addColorStop(1, "#111a25");
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, IMG_W, CAPTION_H);
  ctx.fillStyle = "#c9a45c";
  ctx.fillRect(0, y0, IMG_W, 3);
  ctx.fillStyle = "rgba(0,0,0,.6)";
  ctx.fillRect(0, y0 + 3, IMG_W, 1);
  ctx.fillStyle = "rgba(236,208,142,.25)";
  ctx.fillRect(0, y0 + 7, IMG_W, 1);
  const cy = y0 + CAPTION_H / 2 + 3;

  // Emblem + title
  const ex = 64;
  ctx.beginPath();
  ctx.arc(ex, cy, 30, 0, Math.PI * 2);
  ctx.fillStyle = "#120d06";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ex, cy, 28, 0, Math.PI * 2);
  ctx.fillStyle = "#c9a45c";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(ex, cy, 24.5, 0, Math.PI * 2);
  ctx.fillStyle = "#2a4d8f";
  ctx.fill();
  star(ctx, ex, cy + 1, 14, 6, "#f8f0d8");

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ecd08e";
  ctx.font = `bold 36px ${SERIF}`;
  spaced(ctx, 5);
  ctx.fillText("UNITED STATES", 112, cy + 2);
  spaced(ctx, 0);
  ctx.fillStyle = "#b9ab88";
  ctx.font = `italic 17px ${SERIF}`;
  ctx.fillText("A strategy-map atlas of the real economy", 114, cy + 28);

  // Lens + legend ramp
  const mx = 640;
  const lens = info.lens;
  const iconOk = (id) => id && hasIcon(id);
  const lensIcon = lens ? (iconOk(lens.icon) ? lens.icon : null) : "terrain";
  if (lensIcon) drawIcon(ctx, lensIcon, mx + 20, cy - 16, 40, { shadow: true });
  ctx.fillStyle = "#ecd08e";
  ctx.font = `24px ${SERIF}`;
  spaced(ctx, 1.5);
  ctx.fillText((lens ? lens.name : "지형"), mx + 50, cy - 8);
  spaced(ctx, 0);
  if (lens?.ramp?.length) {
    const rx = mx + 50, ry = cy + 4, rw = 330, rh = 12;
    const rg = ctx.createLinearGradient(rx, 0, rx + rw, 0);
    lens.ramp.forEach((c, i) => rg.addColorStop(i / (lens.ramp.length - 1), c));
    ctx.fillStyle = "rgba(0,0,0,.6)";
    ctx.fillRect(rx - 1, ry - 1, rw + 2, rh + 2);
    ctx.fillStyle = rg;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.font = `14px ${SANS}`;
    ctx.fillStyle = "#d8cba8";
    ctx.textAlign = "left";
    ctx.fillText("≤ " + info.formatValue(lens, 0), rx, ry + rh + 18);
    ctx.textAlign = "right";
    ctx.fillText("≥ " + info.formatValue(lens, 1), rx + rw, ry + rh + 18);
    ctx.textAlign = "left";
  } else {
    ctx.font = `15px ${SANS}`;
    ctx.fillStyle = "#b9ab88";
    ctx.fillText("Land cover, relief, rivers and resources", mx + 50, cy + 16);
  }

  // Selection, credits, site
  const rx = IMG_W - 44;
  ctx.textAlign = "right";
  const sel = info.selection;
  if (sel?.name) {
    ctx.font = `13px ${SANS}`;
    ctx.fillStyle = "#b9ab88";
    spaced(ctx, 2);
    ctx.fillText(sel.kind === "state" ? "STATE" : "CITY", rx, cy - 30);
    spaced(ctx, 0);
    ctx.font = `bold 24px ${SERIF}`;
    ctx.fillStyle = "#f3e6c4";
    ctx.fillText(fit(ctx, sel.name, 460), rx, cy - 6);
  }
  ctx.font = `14px ${SANS}`;
  ctx.fillStyle = "#b9ab88";
  ctx.fillText(CREDIT, rx, cy + 20);
  ctx.font = `bold 17px ${SERIF}`;
  ctx.fillStyle = "#c9a45c";
  spaced(ctx, 1);
  ctx.fillText(siteLabel(), rx, cy + 42);
  spaced(ctx, 0);
  ctx.textAlign = "left";

  // Thin gold frame around the whole picture
  ctx.strokeStyle = "rgba(201,164,92,.85)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, IMG_W - 2, imgH - 2);
  return cv;
}

function fit(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 3 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}

function star(ctx, x, y, R, r, color) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r : R;
    ctx[i ? "lineTo" : "moveTo"](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * opts: {button, getInfo() → composeImage info, fileName() → string, onToast(msg)}
 */
export function initShare(opts) {
  const btn = opts.button;
  const pop = document.getElementById("share-pop");
  if (!btn || !pop) return { close() {}, get isOpen() { return false; } };
  let restore = null;

  pop.innerHTML = `
    <div class="sp-title">이 화면 공유</div>
    <button class="sp-item" data-act="copy">${icon("share", "🔗", { size: 16 })}<span>링크 복사</span></button>
    <button class="sp-item" data-act="image">${icon("terrain", "🖼️", { size: 16 })}<span>그림 내려받기 <span class="muted">1600×900 PNG</span></span></button>
    <div class="sp-status" role="status" aria-live="polite"></div>
    <input class="sp-url" type="text" readonly hidden aria-label="이 화면 링크">`;
  const status = pop.querySelector(".sp-status");
  const urlBox = pop.querySelector(".sp-url");

  function position() {
    const r = btn.getBoundingClientRect();
    const w = pop.offsetWidth || 250;
    pop.style.top = r.bottom + 8 + "px";
    pop.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + "px";
  }
  function open() {
    restore = document.activeElement;
    status.textContent = "";
    urlBox.hidden = true;
    pop.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    position();
    pop.querySelector(".sp-item")?.focus();
  }
  function close(restoreFocus = true) {
    if (pop.hidden) return;
    pop.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    if (restoreFocus && restore && document.contains(restore)) restore.focus();
  }
  btn.addEventListener("click", () => (pop.hidden ? open() : close()));
  document.addEventListener("pointerdown", (e) => {
    if (!pop.hidden && !pop.contains(e.target) && !btn.contains(e.target)) close(false);
  });
  window.addEventListener("resize", () => !pop.hidden && position());

  pop.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    if (b.dataset.act === "copy") {
      opts.beforeCopy?.();
      const link = location.href;
      if (await copyText(link)) {
        status.textContent = "링크를 복사했습니다";
        opts.onToast?.("링크 복사됨");
      } else {
        status.textContent = "Copy this link:";
        urlBox.hidden = false;
        urlBox.value = link;
        urlBox.focus();
        urlBox.select();
      }
    } else if (b.dataset.act === "image") {
      status.textContent = "Drawing the map…";
      await new Promise((r) => setTimeout(r, 30)); // let the status paint
      try {
        const cv = composeImage(opts.getInfo());
        const blob = await new Promise((r) => cv.toBlob(r, "image/png"));
        if (!blob) throw new Error("toBlob failed");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = opts.fileName();
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        status.textContent = `Saved ${a.download}`;
      } catch (err) {
        console.warn(err);
        status.textContent = "Could not create the image in this browser.";
      }
    }
  });

  return {
    open,
    close,
    get isOpen() { return !pop.hidden; },
  };
}
