"""방송 연출 넷 — 예능 자막 · 회상 · 분할 대담 · 리액션 화면 속 화면 (reference/show.md)

  예능 자막  Variety(W, H, 큰글꼴, 작은글꼴, caps=[(갈래, 글, 시작, 끝)], tag=, end=, end_at=)
             .draw(img_rgba, t)            자막 · 딱지 · 끝 도장을 얹는다
             .zoom(im_rgb, t)              쾅 순간 화면 당김 · 흔들림 (punch= 를 주었을 때)
             .sounds(트랙, Kit)            갈래마다 효과음
             갈래 = situ(상황 · 괄호) · say(말) · bang(쾅) · mood(분위기 · 하트) · wave(물결)
  회상       memory_look(im, t, k)        세피아 · 번진 빛 · 흐린 가장자리 · 입자 · 깜빡임
             ripple(im, k, t)             물결 (줄마다 옆으로)
             cross(지금, 그때, u, t, go=True)   넘어가기(go) · 돌아오기 한 장 (u 0~1)
             muffle(소리)                  먹먹하게
  분할 대담  Split(W, H, a=(경로, crop), b=(경로, crop), turns=[('A'|'B', 원본 시작, 원본 끝)], labels=, cols=)
             .frame(t) · .DUR · .SCENES · .voice(트랙)
  리액션     Pip(W, H, 얼굴 경로, src=, keys=[(원본 시각, 가로, 세로, 크기)], t_in=, t_out=, peak=(시작, 끝))
             .draw(img_rgba, t) · .voice(트랙)
             zoom_to(im, z, (가로, 세로))  큰 화면을 한 자리로 다가가기 (반응 순간에 함께)
글꼴은 작업 폴더 fonts/ 의 것을 넘긴다(예능 = 굵고 둥근 글꼴 · 회상 = 손글씨 / 명조).
"""
import math

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from . import finish
from . import video as V
from .ease import seg, eo, eio, back

INK, WHITE = (24, 22, 28), (255, 255, 255)
YEL, PINK, SKY, ORA, RED = (255, 214, 0), (255, 120, 170), (90, 190, 255), (255, 140, 40), (220, 40, 60)
_F = {}


def _font(p, s):
    k = (p, int(s))
    if k not in _F: _F[k] = ImageFont.truetype(p, max(8, int(s)))
    return _F[k]


def _fade(lay, a):
    if a < 1: lay.putalpha(lay.getchannel('A').point(lambda v: int(v * max(0.0, a))))
    return lay


def zoom_to(im, z, focus):
    """im 을 focus(가로, 세로 비율) 쪽으로 z 배 — 가장자리를 넘지 않게"""
    if z <= 1.001: return im
    W, H = im.size; cw, ch = W / z, H / z
    x0 = min(max(0, focus[0] * W - cw / 2), W - cw); y0 = min(max(0, focus[1] * H - ch / 2), H - ch)
    return im.crop((int(x0), int(y0), int(x0 + cw), int(y0 + ch))).resize((W, H), Image.LANCZOS)


# ═══ 예능 자막 ═══════════════════════════════════════════
class Variety:
    """caps = [(갈래, 글, 시작, 끝)] · punch = [(시작, 끝, (가로, 세로), 배율)] — 쾅 구간 화면 당김 (쾅 시각마다 흔들림)
    tag = 왼쪽 위 딱지 글 · end = 끝 도장 글 · end_at = 도장 시각 · end_pos = 도장 자리(비율 — 얼굴을 피해)"""

    def __init__(self, W, H, f_big, f_txt, caps, tag=None, end=None, end_at=None, end_pos=(0.64, 0.17), punch=(), scale=None):
        self.W, self.H, self.fb, self.ft = W, H, f_big, f_txt
        self.caps = sorted(caps, key=lambda c: c[2]); self.tag, self.end, self.end_at, self.end_pos = tag, end, end_at, end_pos
        self.punch = list(punch); self.s = scale or (min(W, H) / 1080)
        self.bangs = [a for k, _, a, _ in self.caps if k == 'bang']

    # ── 화면 당김 · 흔들림 ──
    def zoom(self, im, t):
        zz, fc = 1.0, (0.5, 0.5)
        for a, b, f, z in self.punch:
            k = eo(seg(t, a, a + 0.25)) * (1 - eio(seg(t, b - 0.4, b)))
            if k > 0: zz, fc = 1 + (z - 1) * k, f
        for bt in self.bangs:
            u = seg(t, bt, bt + 0.3)
            if 0 < u < 1 and zz > 1.001: zz += 0.04 * math.sin(u * math.pi)
        im = zoom_to(im, zz, fc)
        for bt in self.bangs:
            u = t - bt
            if 0 <= u < 0.32:
                a2 = 18 * self.s * (1 - u / 0.32); dx = int(a2 * math.sin(u * 90)); dy = int(a2 * 0.6 * math.cos(u * 70))
                im2 = Image.new('RGB', im.size, (0, 0, 0)); im2.paste(im, (dx, dy)); im = im2
        return im

    # ── 갈래 ──
    def _st(self, d, xy, s, f, fill, sw, sc=INK, anchor='mm'):
        d.text(xy, s, font=f, fill=fill, anchor=anchor, stroke_width=int(sw), stroke_fill=sc)

    def _tag(self, img, t):
        if not self.tag: return
        S = self.s; d = ImageDraw.Draw(img); k = eo(seg(t, 0.1, 0.5)); f = _font(self.fb, 38 * S)
        w = d.textlength(self.tag, font=f) + 56 * S; x0 = 48 * S - 40 * S * (1 - k)
        d.rounded_rectangle([x0, 40 * S, x0 + w, 104 * S], int(32 * S), fill=ORA + (int(235 * k),))
        d.text((x0 + w / 2, 72 * S), self.tag, font=f, fill=WHITE + (int(255 * k),), anchor='mm')

    def situ(self, img, s, lt, dur):
        S = self.s; k = eo(seg(lt, 0, 0.3)) * (1 - seg(lt, dur - 0.25, dur)); d = ImageDraw.Draw(img); f = _font(self.ft, 46 * S)
        w = d.textlength(s, font=f) + 52 * S; x0 = 70 * S - 30 * S * (1 - k); y0 = self.H - 200 * S
        d.rounded_rectangle([x0, y0, x0 + w, y0 + 78 * S], int(14 * S), fill=(40, 40, 46, int(190 * k)))
        d.text((x0 + 26 * S, y0 + 39 * S), s, font=f, fill=(235, 235, 240, int(255 * k)), anchor='lm')

    def say(self, img, s, lt, dur):
        S = self.s; a = 1 - seg(lt, dur - 0.25, dur); f = _font(self.fb, 92 * S); n = len(s)
        shown = s[:max(0, min(n, int(lt / 0.06) + 1))]
        lay = Image.new('RGBA', img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
        full = d.textlength(s, font=f); x0 = (self.W - full) / 2; y = self.H - 150 * S
        u = eo(seg(lt, 0.1, 0.6)); d.rounded_rectangle([x0 - 20 * S, y + 26 * S, x0 - 20 * S + (full + 40 * S) * u, y + 52 * S], int(12 * S), fill=YEL + (255,))
        self._st(d, (x0, y), shown, f, WHITE, 9 * S, anchor='lm')
        img.alpha_composite(_fade(lay, a))

    def _lines(self, d, cx, cy, k, col, seed):
        rng = np.random.default_rng(seed); S = self.s
        for i in range(34):
            ang = i / 34 * 2 * math.pi + rng.uniform(-0.05, 0.05); r0 = (420 + rng.uniform(0, 140)) * S; r1 = r0 + (260 + rng.uniform(0, 200)) * S * k
            d.line([(cx + math.cos(ang) * r0, cy + math.sin(ang) * r0 * 0.6), (cx + math.cos(ang) * r1, cy + math.sin(ang) * r1 * 0.6)],
                   fill=col + (int(200 * k),), width=int(rng.uniform(4, 12) * S))

    def bang(self, img, s, lt, dur, big=False):
        S = self.s; k = back(min(1.0, seg(lt, 0, 0.22)), 2.2); out = seg(lt, dur - (0.25 if big else 0.18), dur)
        if out >= 1: return
        lay = Image.new('RGBA', img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
        cx, cy = self.W / 2, self.H * (0.44 if big else 0.40)
        self._lines(d, cx, cy, min(1.0, seg(lt, 0, 0.15)) * (1 - out), YEL if big else WHITE, 7 if big else 5)
        size = (230 if big else 190) * S * max(0.05, k) * (1 + 0.3 * out); f = _font(self.fb, size)
        self._st(d, (cx + 10 * S, cy + 12 * S), s, f, INK, size * 0.08)
        self._st(d, (cx, cy), s, f, YEL if big else WHITE, size * 0.07, sc=(200, 30, 60) if big else INK)
        lay = lay.rotate(5 if big else -6, resample=Image.BICUBIC, center=(cx, cy))
        img.alpha_composite(_fade(lay, 1 - out))

    def _heart(self, d, cx, cy, s, col):
        pts = [(cx + s * math.sin(a) ** 3, cy - s * (13 * math.cos(a) - 5 * math.cos(2 * a) - 2 * math.cos(3 * a) - math.cos(4 * a)) / 16)
               for a in np.linspace(0, 2 * math.pi, 40)]
        d.polygon(pts, fill=col)

    def mood(self, img, s, lt, dur):
        S = self.s; k = eo(seg(lt, 0, 0.5)); a = k * (1 - seg(lt, dur - 0.3, dur))
        lay = Image.new('RGBA', img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay); f = _font(self.fb, 86 * S)
        cx, cy = self.W / 2, self.H - 170 * S + 40 * S * (1 - k)
        self._st(d, (cx, cy), s, f, PINK, 8 * S, sc=WHITE)
        for i, (dx, ph) in enumerate([(-360, 0.0), (330, 0.25), (-250, 0.5), (260, 0.7)]):
            u = seg(lt, ph * 0.6, ph * 0.6 + 0.9)
            if 0 < u: self._heart(d, cx + dx * S + 10 * S * math.sin(u * 6), cy - (60 + 120 * u) * S, (18 + 6 * (i % 2)) * S, PINK + (int(230 * (1 - u * 0.7)),))
        img.alpha_composite(_fade(lay, a))

    def wave(self, img, s, lt, dur):
        S = self.s; a = eo(seg(lt, 0, 0.2)) * (1 - seg(lt, dur - 0.25, dur)); f = _font(self.fb, 96 * S)
        lay = Image.new('RGBA', img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
        full = d.textlength(s, font=f); x = (self.W - full) / 2; y = self.H - 150 * S; cols = [YEL, SKY, PINK, WHITE]
        for i, ch in enumerate(s):
            w = d.textlength(ch, font=f)
            if ch.strip(): self._st(d, (x + w / 2, y - abs(math.sin(lt * 7.5 - i * 0.55)) * 34 * S), ch, f, cols[i % 4], 9 * S)
            x += w
        img.alpha_composite(_fade(lay, a))

    def stamp(self, img, lt):
        k = back(min(1.0, seg(lt, 0.15, 0.45)), 2.5)
        if k <= 0 or not self.end: return
        S = self.s; lay = Image.new('RGBA', img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
        cx, cy = self.W * self.end_pos[0], self.H * self.end_pos[1]
        sc = 1 + 1.4 * (1 - min(1.0, seg(lt, 0.15, 0.4))); f = _font(self.fb, 120 * S * sc)
        tw = d.textlength(self.end, font=f); pad = 50 * S * sc
        d.rounded_rectangle([cx - tw / 2 - pad, cy - 90 * S * sc, cx + tw / 2 + pad, cy + 90 * S * sc], int(40 * S * sc), outline=RED + (255,), width=int(12 * S * sc), fill=(255, 255, 255, 120))
        d.text((cx, cy), self.end, font=f, fill=RED + (255,), anchor='mm')
        img.alpha_composite(lay.rotate(8, resample=Image.BICUBIC, center=(cx, cy)))

    def draw(self, img, t):
        """img = RGBA · 자막 · 딱지 · 도장을 얹어 그대로 돌려준다"""
        last = max(self.bangs) if self.bangs else None
        for i, (kind, s, a, b) in enumerate(self.caps):
            nxt = next((c[2] for c in self.caps[i + 1:] if c[0] == 'bang'), None) if kind == 'bang' else None
            tail = 0.25 if (kind == 'bang' and (nxt is None or nxt > b + 0.3)) else 0.0   # 쾅이 바로 이어지면 앞 것은 그 순간 사라진다
            if a <= t < b + tail:
                if kind == 'bang': self.bang(img, s, t - a, b - a + tail, big=(a == last and len(self.bangs) > 1))
                else: getattr(self, kind)(img, s, t - a, b - a)
        self._tag(img, t)
        if self.end and self.end_at is not None and t >= self.end_at: self.stamp(img, t - self.end_at)
        return img

    def sounds(self, track, kit):
        """갈래마다 효과음 — 쾅 = impact · 상황 · 말 · 물결 = enter · 분위기 = done · 도장 = emph"""
        for kind, s, a, b in self.caps:
            if kind == 'bang': kit.put(track, 'impact', a, 0.55)
            elif kind in ('situ', 'say', 'wave'): kit.put(track, 'enter', a, 0.3)
            elif kind == 'mood': kit.put(track, 'done', a, 0.3)
        if self.end and self.end_at is not None: kit.put(track, 'emph', self.end_at + 0.15, 0.5)


# ═══ 회상 ═══════════════════════════════════════════════
SEPIA = np.array([[255, 236, 196], [112, 70, 32]], np.float32)
_EM = {}


def _edge_mask(W, H):
    if (W, H) not in _EM:
        yy, xx = np.mgrid[0:H, 0:W]; d = np.sqrt(((xx - W / 2) / (W * 0.5)) ** 2 + ((yy - H / 2) / (H * 0.5)) ** 2)
        _EM[(W, H)] = Image.fromarray((np.clip(1.25 - d, 0, 1) ** 0.8 * 255).astype(np.uint8))
    return _EM[(W, H)]


def memory_look(im, t, k=1.0, grain=0.04):
    """그때의 색 — k = 얼마나(0 = 그대로 · 1 = 다 바램)"""
    if k <= 0.01: return im
    g = np.asarray(im.convert('L'), np.float32)[..., None] / 255.0; sep = SEPIA[1] + (SEPIA[0] - SEPIA[1]) * g
    col = np.asarray(im, np.float32) * (1 - 0.78 * k) + sep * 0.78 * k; col *= 1 + 0.025 * math.sin(t * 23) * k
    out = Image.fromarray(np.clip(col, 0, 255).astype(np.uint8))
    out = Image.blend(out, out.filter(ImageFilter.GaussianBlur(10)), 0.28 * k)
    out = Image.composite(out, out.filter(ImageFilter.GaussianBlur(9)), _edge_mask(*im.size))
    return finish.grain(finish.vignette(out, 0.55 * k), grain * k, t)


def ripple(im, k, t):
    if k <= 0.01: return im
    a = np.asarray(im); out = np.empty_like(a); H = a.shape[0]; ys = np.arange(H); s = H / 1080
    sh = (np.sin(ys / (38.0 * s) + t * 14) * 42 * s * k + np.sin(ys / (11.0 * s) - t * 9) * 10 * s * k).astype(int)
    for y in range(H): out[y] = np.roll(a[y], sh[y], axis=0)
    return Image.fromarray(out)


def cross(now_img, mem_img, u, t, go=True, glow=(255, 246, 228)):
    """넘어가기(go=True · 지금 → 그때) / 돌아오기(go=False · 그때 → 지금) 한 장 — u 0~1"""
    w = math.sin(u * math.pi)
    if go:
        a = ripple(memory_look(now_img, t, eo(u)), w, t); b = ripple(memory_look(mem_img, t), w, t); im = Image.blend(a, b, eio(seg(u, 0.35, 0.85)))
    else:
        a = ripple(memory_look(mem_img, t), w, t); b = ripple(memory_look(now_img, t, 1 - eo(u)), w, t); im = Image.blend(a, b, eio(seg(u, 0.25, 0.8)))
    return Image.blend(im, Image.new('RGB', im.size, glow), 0.55 * w)


def muffle(x, a=0.08, gain=1.8):
    """먹먹하게 — 한 겹 저역 통과"""
    x = np.asarray(x, np.float32); y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += a * (x[i] - acc); y[i] = acc
    return y * gain


# ═══ 분할 대담 ═══════════════════════════════════════════
class Split:
    """a, b = (영상 경로, crop(x, y, w, h) 또는 None) · turns = [('A'|'B', 원본 시작, 원본 끝)] — 이어 붙일 순서
    말하는 쪽 = 넓어지고(share) · 밝고 · 테두리 · 소리 막대 / 듣는 쪽 = 좁고 · 어둡고 · 멈춤"""

    def __init__(self, W, H, a, b, turns, labels=('', ''), cols=((255, 176, 59), (90, 190, 255)), font=None,
                 intro=0.9, outro=1.4, xf=0.35, share=0.6, bg=(18, 20, 26)):
        self.W, self.H, self.src, self.turns, self.labels, self.cols, self.font = W, H, {'A': a, 'B': b}, turns, labels, cols, font
        self.intro, self.xf, self.sh, self.bg = intro, xf, share, bg; self.s = min(W, H) / 1080
        self.spans, t = [], intro
        for who, x0, x1 in turns: self.spans.append((who, t, t + x1 - x0, x0)); t += x1 - x0
        self.DUR = t + outro; self.SCENES = [(0, intro)] + [(a0, a1) for _, a0, a1, _ in self.spans] + [(t, self.DUR)]
        self.cl = {}

    def _clip(self, who):
        if who not in self.cl: p, crop = self.src[who]; self.cl[who] = V.Clip(p, 0, None, crop=crop, loop=False)
        return self.cl[who]

    def _state(self, t):
        last = {w: next(x0 for ww, x0, _ in self.turns if ww == w) for w in ('A', 'B') if any(ww == w for ww, _, _ in self.turns)}
        cur = None
        for who, a0, a1, src in self.spans:
            if t >= a0:
                last[who] = src + min(t, a1) - a0
                if t < a1: cur = who
        hi, lo = self.sh, 1 - self.sh; share = 0.5
        for i, (who, a0, _, _) in enumerate(self.spans):
            k = eio(seg(t, a0 - self.xf / 2, a0 + self.xf / 2)); tgt = hi if who == 'A' else lo
            prev = 0.5 if i == 0 else (hi if self.spans[i - 1][0] == 'A' else lo)
            if t >= a0 - self.xf / 2: share = prev + (tgt - prev) * k
        share += (0.5 - share) * eio(seg(t, self.spans[-1][2], self.spans[-1][2] + self.xf))
        return cur, last, share

    def _panel(self, who, src, w, h, light):
        im = self._clip(who).frame(src); s = max(w / im.width, h / im.height)
        im = im.resize((int(im.width * s) + 1, int(im.height * s) + 1), Image.LANCZOS)
        x0, y0 = (im.width - w) // 2, (im.height - h) // 2; im = im.crop((x0, y0, x0 + w, y0 + h))
        if light < 1:
            g = im.convert('L').convert('RGB'); im = Image.blend(Image.blend(g, im, 0.35 + 0.65 * light), Image.new('RGB', im.size, self.bg), 0.45 * (1 - light))
        return im

    def frame(self, t):
        S = self.s; cur, last, share = self._state(t); W, H = self.W, self.H
        img = Image.new('RGB', (W, H), self.bg); d = ImageDraw.Draw(img, 'RGBA')
        gap, m = int(16 * S), int(40 * S); inner = W - 2 * m - gap; ph = H - 2 * m; wa = int(inner * share); wb = inner - wa
        slide = eo(seg(t, 0.0, self.intro)); xa = m - int((1 - slide) * 300 * S); xb = m + wa + gap + int((1 - slide) * 300 * S)
        hi, lo = self.sh, 1 - self.sh
        la = min(1.0, max(0.0, (share - lo) / (hi - lo))) if cur else 1.0; lb = min(1.0, max(0.0, (hi - share) / (hi - lo))) if cur else 1.0
        img.paste(self._panel('A', last['A'], wa, ph, la), (xa, m)); img.paste(self._panel('B', last['B'], wb, ph, lb), (xb, m))
        for x, w, col, lab, lt in ((xa, wa, self.cols[0], self.labels[0], la), (xb, wb, self.cols[1], self.labels[1], lb)):
            if lt > 0.05: d.rounded_rectangle([x - 6 * S, m - 6 * S, x + w + 6 * S, m + ph + 6 * S], int(18 * S), outline=col + (int(255 * lt),), width=int(6 * S))
            if lab and self.font:
                f = _font(self.font, 40 * S); tw = d.textlength(lab, font=f)
                d.rounded_rectangle([x + 24 * S, m + 24 * S, x + 68 * S + tw, m + 90 * S], int(33 * S), fill=(col if lt > 0.5 else (70, 72, 80)) + (230,))
                d.text((x + 46 * S + tw / 2, m + 57 * S), lab, font=f, fill=WHITE, anchor='mm')
            if lt > 0.5 and cur:
                cx, by = x + w / 2, m + ph - 50 * S
                for i in range(7):
                    hgt = (14 + 40 * abs(math.sin(t * 9 + i * 1.3)) * (0.6 + 0.4 * math.sin(t * 3 + i))) * S
                    d.rounded_rectangle([cx + (-84 + i * 26) * S, by - hgt, cx + (-70 + i * 26) * S, by], int(7 * S), fill=(255, 255, 255, 220))
        return Image.blend(Image.new('RGB', (W, H), self.bg), img, slide) if slide < 1 else img

    def voice(self, track):
        """말하는 쪽 소리만 — 바뀔 때 짧게 겹쳐 잇는다"""
        for who, a0, a1, src in self.spans:
            p = self.src[who][0]; V.put_sound(track, V.sound(p, max(0, src - 0.1), src + (a1 - a0) + 0.15), a0 - 0.1, fade=0.12)
        return track


# ═══ 리액션 화면 속 화면 ═════════════════════════════════
class Pip:
    """얼굴 영상을 동그란 창으로 — src = 창이 뜰 때의 얼굴 원본 시각 · keys = [(원본 시각, 가로, 세로, 크기 = 높이 대비)]
    peak = (시작, 끝) 반응 순간 → 창이 커지고 반응 선 · corner = 창이 붙는 구석('rb' · 'lb' · 'rt' · 'lt')"""

    def __init__(self, W, H, face, src, keys, t_in=0.8, t_out=None, peak=None, r=(180, 270), corner='rb', margin=70):
        self.W, self.H, self.face, self.src, self.keys = W, H, face, src, keys
        self.t_in, self.t_out, self.peak, self.corner, self.s = t_in, t_out, peak, corner, min(W, H) / 1080
        self.r0, self.r1, self.m = r[0] * self.s, r[1] * self.s, margin * self.s; self.cl = None; self._mask = {}

    def _box(self, src):
        for (t0, x0, y0, s0), (t1, x1, y1, s1) in zip(self.keys, self.keys[1:]):
            if src <= t1: u = eio(seg(src, t0, t1)); return x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, s0 + (s1 - s0) * u
        return self.keys[-1][1:]

    def _circle(self, r):
        if r not in self._mask:
            m = Image.new('L', (4 * r, 4 * r), 0); ImageDraw.Draw(m).ellipse([0, 0, 4 * r - 1, 4 * r - 1], fill=255)
            self._mask[r] = m.resize((2 * r, 2 * r), Image.LANCZOS)
        return self._mask[r]

    def kpeak(self, t):
        if not self.peak: return 0.0
        a, b = self.peak; return eo(seg(t, a + 0.15, a + 0.45)) * (1 - eio(seg(t, b - 0.5, b)))

    def draw(self, img, t):
        end = self.t_out or 1e9
        k_in = back(min(1.0, seg(t, self.t_in, self.t_in + 0.4)), 1.6); k_out = 1 - eio(seg(t, end - 0.4, end)); kp = self.kpeak(t)
        r = int((self.r0 + (self.r1 - self.r0) * kp) * max(0.01, k_in) * k_out)
        if r <= 8: return img
        cx = self.W - self.m - r if 'r' in self.corner else self.m + r; cy = self.H - self.m - r if 'b' in self.corner else self.m + r
        if self.cl is None: self.cl = V.Clip(self.face, 0, None, loop=False)
        src = self.src + (t - self.t_in); fr = self.cl.frame(max(0, src)); fx, fy, fs = self._box(src); side = fs * fr.height
        x0 = min(max(0, fx * fr.width - side / 2), fr.width - side); y0 = min(max(0, fy * fr.height - side / 2), fr.height - side)
        fc = fr.crop((int(x0), int(y0), int(x0 + side), int(y0 + side))).resize((2 * r, 2 * r), Image.LANCZOS)
        S = self.s; sh = Image.new('RGBA', img.size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).ellipse([cx - r + 6 * S, cy - r + 14 * S, cx + r + 6 * S, cy + r + 14 * S], fill=(0, 0, 0, 120))
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(14 * S)))
        d = ImageDraw.Draw(img); d.ellipse([cx - r - 9 * S, cy - r - 9 * S, cx + r + 9 * S, cy + r + 9 * S], fill=(255, 255, 255, 255))
        img.paste(fc, (int(cx - r), int(cy - r)), self._circle(r))
        if kp > 0.05:
            sgn = -1 if 'r' in self.corner else 1
            for ang in (-2.4, -1.95, -1.5):
                ang = ang if sgn < 0 else math.pi - ang; r0 = r + 20 * S; r1 = r0 + 70 * S * kp
                d.line([(cx + math.cos(ang) * r0, cy + math.sin(ang) * r0), (cx + math.cos(ang) * r1, cy + math.sin(ang) * r1)], fill=YEL + (255,), width=int(14 * S))
        if t >= self.t_in + 0.4:
            px, py = cx - r * 0.72 * (1 if 'r' in self.corner else -1), cy - r * 0.72
            d.ellipse([px - 14 * S, py - 14 * S, px + 14 * S, py + 14 * S], fill=(235, 60, 60, int(255 * (0.6 + 0.4 * math.sin(t * 5)))))
        return img

    def voice(self, track, dur, gain=1.0):
        """반응하는 쪽 소리 (창이 떠 있는 동안)"""
        end = self.t_out or dur
        V.put_sound(track, gain * V.sound(self.face, self.src, self.src + end - self.t_in), self.t_in, fade=0.2)
        return track
