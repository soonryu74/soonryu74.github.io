// Off-screen rendering of a full map frame (for share images, OG cards, downloads).
// It never touches main.js's on-screen cache: the static layer is drawn fresh, straight into the target canvas,
// through a temporary camera sized to that canvas.
import { Camera } from "../camera.js";
import { drawStatic, drawOverlay } from "./map.js";
import { drawBanners } from "./banners.js";
import { drawHighlight, drawOverlays } from "./overlays.js";

/**
 * Render the map as seen by `cam` into `target` (a canvas, OffscreenCanvas or its 2D context).
 *
 * opts:
 *   banners = true    city banners on top
 *   overlay = true    selection / hover highlights (hover is left out)
 *   dpr = 1           device pixels per css px in the target; the frame is laid out at width/dpr × height/dpr
 *   fit = "contain"   how the target relates to the live view: "contain" shows at least everything `cam` shows,
 *                     "cover" fills the target with the middle of the view, "same" keeps cam.scale as is
 *   scale, x, y       explicit camera (km per css px scale and centre), overriding `fit`
 *   overlays = []     registered overlays (app.registerOverlay) to include, e.g. those marked {snapshot: true}
 *   staticLayers = [] registered static layers (app.registerStaticLayer) to draw inside the static map, e.g.
 *                     app.staticLayers().filter((l) => l.snapshot !== false); they see o.snapshot = true
 *   app               passed to the overlays' draw(ctx, cam, app) and the layers' o.app; its data also feeds the
 *                     highlight rings
 * Returns the temporary camera and the banner hit boxes (in target css px).
 */
export function renderToCanvas(target, cam, w, state, nation, opts = {}) {
  const { banners = true, overlay = true, dpr = 1, fit = "contain" } = opts;
  const ctx = typeof target.getContext === "function" ? target.getContext("2d") : target;
  const canvas = ctx.canvas;
  const cssW = canvas.width / dpr, cssH = canvas.height / dpr;

  const tmp = new Camera(cam.worldW, cam.worldH);
  tmp.resize(cssW, cssH);
  tmp.minScale = 1e-4;
  tmp.maxScale = Infinity;
  tmp.fitScale = cam.fitScale;
  const kx = cssW / Math.max(1, cam.w), ky = cssH / Math.max(1, cam.h);
  const k = fit === "same" ? 1 : fit === "cover" ? Math.max(kx, ky) : Math.min(kx, ky);
  tmp.scale = opts.scale ?? cam.scale * k;
  tmp.x = opts.x ?? cam.x;
  tmp.y = opts.y ?? cam.y;

  const v = tmp.view();
  const vp = { ...v, s: tmp.scale, dpr, cssW, cssH };
  ctx.save();
  const hitsOut = {};
  const app = opts.app ?? null;
  drawStatic(ctx, vp, w, {
    lens: state.lens, showResources: state.showResources, resourceFilter: state.resourceFilter, selectedCity: state.selectedCity, hits: hitsOut,
    layers: opts.staticLayers || [], app, snapshot: true,
  });

  const s = tmp.scale;
  if (overlay) {
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (cssW / 2 - tmp.x * s), dpr * (cssH / 2 - tmp.y * s));
    drawOverlay(ctx, tmp, w, { ...state, hoverCell: -1 }, 0);
    if (state.highlight) {
      drawHighlight(ctx, tmp, w, state, {
        resourceHits: hitsOut.resources, items: app?.data?.resources?.items, cityById: app?.cityById,
      });
    }
  }
  const overlays = opts.overlays || [];
  if (overlays.length) drawOverlays(ctx, tmp, overlays, app, { dpr, zMax: 100 });
  let hits = [];
  if (banners) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    hits = drawBanners(ctx, tmp, w, state, nation?.yields ?? [], nation ?? state.nation);
  }
  if (overlays.length) drawOverlays(ctx, tmp, overlays, app, { dpr, zMin: 100 });
  ctx.restore();
  return { cam: tmp, hits };
}
