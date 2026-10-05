"""시간 조작 — 시간 지도(출력 시각 → 원본 시각)로 화면과 소리를 함께 바꾼다 (reference/time.md).

엔진은 «시각을 주면 그 순간을 다시 그린다» → 되감기 · 슬로 · 멈춤도 화질 손실 없이 매끄럽다.

  W = Warp([('play', 3.6), ('stop', 0.2), ('hold', 1.4), ('to', 0.0, 1.4), ('cut', 10.0), ('play', 16.6)])
  img = render(W, t, src_frame)          # src_frame(원본 시각) → 화면
  out = audio(W, src_samples, sr)        # 원본 소리를 같은 지도로 (되감기 = 거꾸로 빨리 · 멈춤 = 음이 내려가며 꺼짐)

조각 (속도는 조각마다 곧게 바뀐다):
  ('play', 끝)            1배속으로 원본 '끝'까지
  ('speed', 끝, 배속)     그 배속으로 (0.3 = 슬로 · 4 = 빨리 감기)
  ('ramp', 끝, 배속)      지금 속도 → 그 배속으로 바꾸며 '끝'까지 (쾅 직전 슬로 · 닿을 듯 느려짐)
  ('stop', 길이)          들어오던 속도 → 0 (테이프 멈춤)
  ('hold', 길이)          멈춤
  ('start', 길이, 배속)   0 → 그 배속
  ('to', 목표, 길이)      목표 시각으로 부드럽게 (앞 시각이면 되감기)
  ('cut', 시각)           그 순간 다른 원본 시각으로 (갈래 바꾸기 — A 되감은 뒤 B 로)
⛔ 나레이션은 지도에 넣지 않는다(화면 · 배경음 · 효과음만). 경고음 · 쿵 같은 «사건» 소리는 출력 시각에 따로 얹는다.
"""
import math

import numpy as np
from PIL import Image, ImageDraw


class Warp:
    def __init__(self, pieces, src0=0.0):
        self.seg = []                     # (t0, t1, s0, s1, v0, v1, 종류)
        t, s, v = 0.0, src0, 1.0

        def add(d, v0, v1, kind, s1=None):
            nonlocal t, s, v
            e = s1 if s1 is not None else s + (v0 + v1) / 2 * d
            self.seg.append((t, t + d, s, e, v0, v1, kind)); t += d; s = e; v = v1
        for p in pieces:
            k = p[0]
            if k == 'play': add(p[1] - s, 1, 1, 'play')
            elif k == 'speed': add((p[1] - s) / p[2], p[2], p[2], 'speed')
            elif k == 'ramp': add(2 * (p[1] - s) / (v + p[2]), v, p[2], 'ramp')
            elif k == 'stop': add(p[1], v, 0, 'stop')
            elif k == 'hold': add(p[1], 0, 0, 'hold')
            elif k == 'start': add(p[1], 0, p[2], 'start')
            elif k == 'to': add(p[2], 0, 0, 'rewind' if p[1] < s else 'jump', s1=p[1])
            elif k == 'cut': s = p[1]; v = 1
            else: raise ValueError(f'모르는 조각: {k}')
        self.DUR = t

    def at(self, t):
        """→ (원본 시각, 종류, 조각 안 경과 초, 조각 길이)"""
        for t0, t1, s0, s1, v0, v1, kind in self.seg:
            if t < t1 or t1 >= self.DUR - 1e-9:
                d = t1 - t0; tau = min(d, max(0.0, t - t0))
                if kind in ('rewind', 'jump'):
                    u = tau / d if d else 1; return s0 + (s1 - s0) * u * u * (3 - 2 * u), kind, tau, d
                return s0 + v0 * tau + (v1 - v0) * tau * tau / (2 * d if d else 1), kind, tau, d
        return self.seg[-1][3], self.seg[-1][6], 0, 0

    def src_of(self, ts):
        return np.array([self.at(x)[0] for x in ts])

    def start_of(self, kind, n=0):
        """n 번째 그 종류 조각이 시작하는 출력 시각 (사건 소리 자리 잡기)"""
        hits = [s[0] for s in self.seg if s[6] == kind]
        return hits[n] if len(hits) > n else None


def _vhs(img, seed=0, amt=0.18, shift=6):
    a = np.asarray(img.convert('RGB')).astype(np.int16)
    a[::4] = (a[::4] * (1 - amt)).astype(np.int16)
    o = a.copy(); o[..., 0] = np.roll(a[..., 0], shift, axis=1); o[..., 2] = np.roll(a[..., 2], -shift, axis=1)
    rng = np.random.default_rng(seed); h = a.shape[0]
    for _ in range(3):
        y = int(rng.integers(0, max(1, h - 40))); bh = int(rng.integers(8, 40)); o[y:y + bh] = np.roll(o[y:y + bh], int(rng.integers(-30, 30)), axis=1)
    return Image.fromarray(np.clip(o, 0, 255).astype(np.uint8))


def _rew_mark(img):
    """◀◀ 표시 — 도형으로 그린다(글꼴에 기호가 없어도 된다)"""
    d = ImageDraw.Draw(img); s = max(28, img.width // 30); x, y = s * 2, s * 2
    for dx in (0, s):
        pts = [(x + dx + s, y), (x + dx, y + s / 2), (x + dx + s, y + s)]
        d.polygon([(px + 3, py + 3) for px, py in pts], fill=(0, 0, 0)); d.polygon(pts, fill=(255, 255, 255))
    return img


def render(W, t, src_frame, fps=30, blur_from=1.8, nmax=6, rewind_look='vhs', hold_look=True, flash=(255, 255, 255)):
    """출력 시각 t 의 화면. 빠른 구간은 한 프레임에 여러 원본 시각을 겹친다(셔터).
    rewind_look: 'vhs'(줄무늬 · 색 번짐 · ◀◀) · 'clean'(흐림만) · hold_look: 멈춤 때 바랜 색 · 느린 다가가기 · 번쩍(flash 색)"""
    s, kind, tau, d = W.at(t); dt = 1 / fps
    v = (W.at(min(W.DUR, t + dt / 2))[0] - W.at(max(0, t - dt / 2))[0]) / dt
    if abs(v) > blur_from:
        n = min(nmax, int(math.ceil(abs(v) / 1.5)) + 1); acc = None
        for i in range(n):
            st = s + v * dt * 0.9 * (i / (n - 1) - 0.5)
            a = np.asarray(src_frame(st).convert('RGB'), dtype=np.uint16); acc = a if acc is None else acc + a
        img = Image.fromarray((acc // n).astype(np.uint8))
    else:
        img = src_frame(s).convert('RGB')
    if kind == 'rewind' and rewind_look == 'vhs':
        img = _vhs(img, seed=int(t * 30) % 7)
        if int(t * 4) % 2 == 0: img = _rew_mark(img)
    elif kind == 'hold' and hold_look:
        g = img.convert('L').convert('RGB'); img = Image.blend(img, g, 0.35)
        w, h = img.size; z = 1 + 0.04 * (tau / d if d else 0); nw, nh = int(w * z), int(h * z)
        if z > 1.001: img = img.resize((nw, nh), Image.BILINEAR).crop(((nw - w) // 2, (nh - h) // 2, (nw - w) // 2 + w, (nh - h) // 2 + h))
        if flash and tau < 0.18: img = Image.blend(img, Image.new('RGB', img.size, flash), 0.7 * (1 - tau / 0.18))
    return img


def audio(W, src, sr, fade=0.03):
    """원본 소리(표본 × 채널, float -1~1)를 같은 시간 지도로 읽는다 — 속도만큼 음높이가 따라간다(테이프처럼)"""
    if src.ndim == 1: src = src[:, None]
    n = int(W.DUR * sr); step = max(1, sr // 200)
    grid = np.arange(0, n + step, step); pos = np.interp(np.arange(n), grid, W.src_of(grid / sr)) * sr
    idx = np.arange(src.shape[0])
    out = np.stack([np.interp(pos, idx, src[:, c]) for c in range(src.shape[1])], 1)
    gain = np.clip(np.abs(np.gradient(pos)) / 0.25, 0, 1)            # 멈출 때 사그라짐
    sm = max(1, int(fade * sr)); gain = np.convolve(gain, np.ones(sm) / sm, mode='same')
    return (out * gain[:, None]).astype(np.float32)


def buzzer(sr=44100, dur=0.6, g=0.16):
    """«삐—» 경고음 (사건 소리 — 출력 시각에 얹는다)"""
    t = np.arange(int(dur * sr)) / sr
    sq = np.sign(np.sin(2 * np.pi * 740 * t)) + 0.8 * np.sign(np.sin(2 * np.pi * 784 * t))
    env = np.minimum(1, t / 0.01) * np.where(t < dur - 0.08, 1, (dur - t) / 0.08)
    return (g * sq * env).astype(np.float32)


def stamp_x(img, k, alpha=1.0, center=None, r=300, col=(255, 45, 85)):
    """빨간 ✕ 쾅 — k: 0→1 찍힘 (크게 → 제자리) · alpha: 사라짐"""
    from .ease import back
    o = Image.new('RGBA', img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(o)
    s = 1 + 0.8 * (1 - back(min(1, k), 1.6)) if k < 1 else 1.0
    cx, cy = center or (img.width / 2, img.height / 2); rr = r * s
    a = int(255 * alpha)
    for x0, y0, x1, y1 in [(-1, -1, 1, 1), (-1, 1, 1, -1)]:
        p0 = (cx + x0 * rr, cy + y0 * rr); p1 = (cx + x1 * rr, cy + y1 * rr)
        d.line([p0, p1], fill=(255, 255, 255, a), width=int(r * 0.39 * s)); d.line([p0, p1], fill=col + (a,), width=int(r * 0.3 * s))
    o = o.rotate(-6, center=(cx, cy)); base = img.convert('RGBA'); base.alpha_composite(o); return base.convert('RGB')
