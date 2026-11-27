// 2D camera over the map (km). Screen = (world − centre) × scale + viewport/2.
// Smooth motion: zoomBy() eases toward a target scale around an anchor, flyTo() animates centre + scale along
// a van Wijk & Nuij "optimal" path (zoom out, travel, zoom in) and `pan` (px/s, set from held keys) moves the
// view; step(dt) advances all of it. `fitScale` is the scale of the last fit() (the home view), handy for
// encoding the zoom in a URL as a multiple of it.

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export class Camera {
  constructor(worldW, worldH) {
    this.worldW = worldW;
    this.worldH = worldH;
    this.x = worldW / 2;
    this.y = worldH / 2;
    this.scale = 1; // screen px per km
    this.fitScale = 1; // scale of the home view (last successful fit())
    this.w = 1;
    this.h = 1;
    this.minScale = 0.05;
    this.maxScale = 6;
    this.zoomTarget = null; // {scale, sx, sy}: eased wheel/keyboard zoom around a screen anchor
    this.flight = null; // {path, x1, y1, s1, t, ms}
    this.pan = { x: 0, y: 0 }; // keyboard panning, screen px per second
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
  }

  // Frames the rectangle. Returns false (and changes nothing) while the viewport is too small to be real,
  // e.g. a hidden tab or an iframe that is still being laid out.
  fit(x0, y0, x1, y1, pad = 40) {
    if (!(this.w > 2 * pad + 20 && this.h > 2 * pad + 20)) return false;
    const s = Math.min((this.w - 2 * pad) / (x1 - x0), (this.h - 2 * pad) / (y1 - y0));
    if (!(s > 0) || !Number.isFinite(s)) return false;
    this.scale = s;
    this.fitScale = s;
    this.minScale = s * 0.6;
    this.x = (x0 + x1) / 2;
    this.y = (y0 + y1) / 2;
    this.stop();
    return true;
  }

  toScreen(x, y) {
    return [(x - this.x) * this.scale + this.w / 2, (y - this.y) * this.scale + this.h / 2];
  }

  toWorld(sx, sy) {
    return [(sx - this.w / 2) / this.scale + this.x, (sy - this.h / 2) / this.scale + this.y];
  }

  clampScale(s) {
    return Math.min(this.maxScale, Math.max(this.minScale, Math.max(1e-4, s)));
  }

  // Immediate zoom keeping the world point under (sx, sy) fixed.
  zoomAt(sx, sy, factor) {
    const [wx, wy] = this.toWorld(sx, sy);
    this.scale = this.clampScale(this.scale * factor);
    const [nx, ny] = this.toWorld(sx, sy);
    this.x += wx - nx;
    this.y += wy - ny;
    this.clamp();
  }

  // Eased zoom: factors accumulate into a target that step() approaches.
  zoomBy(sx, sy, factor) {
    this.flight = null;
    const base = this.zoomTarget ? this.zoomTarget.scale : this.scale;
    this.zoomTarget = { scale: this.clampScale(base * factor), sx, sy };
  }

  panBy(dx, dy) {
    this.flight = null;
    this.x -= dx / this.scale;
    this.y -= dy / this.scale;
    this.clamp();
  }

  centerOn(x, y) {
    this.flight = null;
    this.x = x;
    this.y = y;
    this.clamp();
  }

  // Animate to centre (x, y) at `scale`. `ms` is the minimum duration: long trips that need to zoom out get
  // more time (up to ~2.4 s) so the motion keeps a steady perceived speed.
  flyTo(x, y, scale = this.scale, ms = 700) {
    this.zoomTarget = null;
    const s1 = this.clampScale(scale);
    const path = zoomPath(this.x, this.y, this.w / this.scale, x, y, this.w / s1);
    const dur = Math.min(Math.max(ms, 2400), Math.max(ms, path.S * 520));
    this.flight = { path, x1: x, y1: y, s1, t: 0, ms: Math.max(1, dur) };
  }

  stop() {
    this.zoomTarget = null;
    this.flight = null;
  }

  get moving() {
    return !!(this.zoomTarget || this.flight || this.pan.x || this.pan.y);
  }

  // Advance animations by dt seconds. Returns true while anything is still moving.
  step(dt) {
    dt = Math.min(1, Math.max(0, dt)); // animations keep wall-clock time even on slow frames
    if (this.pan.x || this.pan.y) {
      const pdt = Math.min(0.1, dt); // ...but a stalled frame must not fling the view
      this.x += (this.pan.x * pdt) / this.scale;
      this.y += (this.pan.y * pdt) / this.scale;
      this.clamp();
    }
    if (this.flight) {
      const f = this.flight;
      f.t = Math.min(1, f.t + (dt * 1000) / f.ms);
      if (f.t >= 1) {
        this.x = f.x1;
        this.y = f.y1;
        this.scale = f.s1;
        this.flight = null;
      } else {
        const [px, py, pw] = f.path(easeInOut(f.t));
        this.x = px;
        this.y = py;
        this.scale = Math.max(this.minScale * 0.85, this.w / pw);
      }
      this.clamp();
    }
    if (this.zoomTarget) {
      const z = this.zoomTarget;
      const k = 1 - Math.exp(-dt * 14); // ~90% of the way in 160 ms
      const ratio = z.scale / this.scale;
      if (Math.abs(Math.log(ratio)) < 0.002) {
        this.zoomAt(z.sx, z.sy, ratio);
        this.zoomTarget = null;
      } else this.zoomAt(z.sx, z.sy, ratio ** k);
    }
    return this.moving;
  }

  clamp() {
    this.x = Math.min(this.worldW, Math.max(0, this.x));
    this.y = Math.min(this.worldH, Math.max(0, this.y));
  }

  view() {
    const [x0, y0] = this.toWorld(0, 0);
    const [x1, y1] = this.toWorld(this.w, this.h);
    return { x0, y0, x1, y1 };
  }
}

// van Wijk & Nuij, "Smooth and efficient zooming and panning" (2003): the path through (centre, view width)
// space that feels like constant speed. Returns p(t) → [x, y, viewWidth] for t in 0..1, with p.S its length.
const RHO = 1.3; // < √2 zooms out a little less than the "optimal" path, which suits a map this size
function zoomPath(x0, y0, w0, x1, y1, w1) {
  const dx = x1 - x0, dy = y1 - y0, d2 = dx * dx + dy * dy;
  const r2 = RHO * RHO, r4 = r2 * r2;
  let p;
  if (d2 < 1e-6 * w0 * w0) {
    const S = Math.log(w1 / w0) / RHO;
    p = (t) => [x0 + t * dx, y0 + t * dy, w0 * Math.exp(RHO * t * S)];
    p.S = Math.abs(S);
    return p;
  }
  const d1 = Math.sqrt(d2);
  const b0 = (w1 * w1 - w0 * w0 + r4 * d2) / (2 * w0 * r2 * d1);
  const b1 = (w1 * w1 - w0 * w0 - r4 * d2) / (2 * w1 * r2 * d1);
  const q0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
  const q1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
  const S = (q1 - q0) / RHO;
  const ch = Math.cosh(q0), sh = Math.sinh(q0);
  p = (t) => {
    const s = t * S;
    const u = (w0 / (r2 * d1)) * (ch * Math.tanh(RHO * s + q0) - sh);
    return [x0 + u * dx, y0 + u * dy, (w0 * ch) / Math.cosh(RHO * s + q0)];
  };
  p.S = Math.abs(S);
  return p;
}
