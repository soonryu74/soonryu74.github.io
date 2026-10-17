"""껍데기 — 다 만든 영상(어떤 영상이든)을 손대지 않고 창에 넣고 위아래 띠를 씌운 9:16 쇼츠 (reference/onetake.md §4)

★가운데가 주인공 — 띠는 «심심하지 않을 만큼만» 움직인다(motion='약하게' 기본 · '없음' · '보통')
  띠 바탕 = 지금 색(colors)이 어둡게 배어든 색 · 옅은 빛 덩어리 · 작은 점이 위로 · 위 이미지가 숨 쉬듯
  위 = 받은 타이틀 이미지(투명 배경 · 있으면 이걸 — 직접 쓴 제목보다 깔끔) 또는 title 글자 + chip(«관람기» 같은 칩) + sub
  아래 = notes 한 줄(시각마다 바뀌며 밀려 올라옴 · 문장은 유저 말로) + 진행 막대 + info 흐르는 정보 줄
  창 = 둥근 모서리 + 얇은 테두리 + 그림자 · 창 비율 1:1 또는 4:5

  SH = shell.Shell(dur, win='1:1', top='재료/타이틀.png', chip='관람기', sub='…', notes=[(0, '…'), (5.2, '…')],
                   info='날짜 · 장소 · …', colors=[(0, (246, 244, 240)), (2.0, (60, 160, 90))])
  inner = SH.inner        → 안쪽 영상을 이 크기로 그린다 (W, H)
  frame(t) = SH.frame(t, 안쪽 그림)
  SH.wrap_video('out/원본.mp4', 'out/쇼츠.mp4')   이미 구운 mp4 에 씌우기 (소리 그대로 · colors='auto' 면 띠가 영상 색을 따른다)
"""
import math
import os
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from .ease import cl, eio, eo, seg

HERE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BOLD = os.path.join(HERE, 'assets', 'fonts', 'Pretendard-Bold.otf')
INK = (16, 17, 22)
MOTION = {'없음': 0.0, '약하게': 1.0, '보통': 1.8}


def _mix(a, b, k): return tuple(int(a[i] * (1 - k) + b[i] * k) for i in range(3))


class Shell:
    def __init__(self, dur, W=1080, H=1920, win='1:1', top=None, title=None, chip=None, sub=None, notes=(), info=None,
                 colors=((0, (246, 244, 240)),), motion='약하게', font=None, title_font=None, accent=None, seed=9):
        self.dur, self.W, self.H = dur, W, H
        cw = W - 80; ch = cw if win == '1:1' else int(cw * 5 / 4)
        self.cw, self.ch = cw - cw % 2, ch - ch % 2
        top_h = int((H - self.ch) * 0.51); self.wx, self.wy = (W - self.cw) // 2, top_h
        self.inner = (self.cw, self.ch)
        self.top, self.title, self.chip, self.sub, self.notes, self.info = top, title, chip, sub, list(notes), info
        self.colors = colors if (colors == 'auto' or callable(colors)) else list(colors); self.mv, self.accent = MOTION.get(motion, 1.0), accent
        self.font, self.title_font = font or BOLD, title_font or font or BOLD
        self._f, self._top, self._tick, self._mask = {}, None, None, None
        rng = np.random.default_rng(seed)
        self.blobs = [(rng.uniform(0, W), rng.uniform(0, 1), rng.uniform(140, 260), rng.uniform(0.15, 0.35), rng.uniform(0, 6.28)) for _ in range(6)]
        self.dots = [(rng.uniform(0, W), rng.uniform(0, H), rng.uniform(2, 4.5), rng.uniform(8, 22)) for _ in range(46)]

    def F(self, sz, p=None):
        k = (p or self.font, sz)
        if k not in self._f: self._f[k] = ImageFont.truetype(k[0], sz)
        return self._f[k]

    def text(self, d, xy, s, f, col, a=1.0, anchor='ls'):
        from . import canvas
        canvas.draw_text(d, xy, s, f, tuple(col) + (int(255 * cl(a)),), anchor=anchor)

    def color(self, t):
        """지금 색 — 바뀔 때 0.5초에 걸쳐 섞는다 · 'auto' = 안쪽 영상의 평균 색"""
        if self.colors == 'auto': return np.array(getattr(self, '_auto', (246, 244, 240)), float)
        if callable(self.colors): return np.array(self.colors(t), float)
        col = np.array(self.colors[0][1], float)
        for t0, c in self.colors[1:]:
            k = eio(seg(t, t0 - 0.1, t0 + 0.4)); col = col * (1 - k) + np.array(c, float) * k
        return col

    def mask(self):
        if self._mask is None:
            m = Image.new('L', (self.cw * 2, self.ch * 2), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, self.cw * 2 - 1, self.ch * 2 - 1], 56, fill=255)
            self._mask = m.resize((self.cw, self.ch), Image.LANCZOS)
        return self._mask

    def bands(self, t):
        W, H, wy = self.W, self.H, self.wy; sc = self.color(t); bright = sc.mean() > 200
        img = Image.new('RGBA', (W, H), _mix(INK, sc, 0.10 if bright else 0.16) + (255,))
        if self.mv > 0:
            glow = Image.new('RGBA', (W // 4, H // 4), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
            acc = tuple(int(v) for v in sc) if not bright else (120, 200, 255); m = self.mv
            for x0, yb, r, sp, ph in self.blobs:
                x = (x0 + 40 * m * math.sin(t * sp + ph)) / 4
                y = ((yb * wy) if yb < 0.5 else (wy + self.ch + (yb - 0.5) * 2 * (H - wy - self.ch))) / 4 + 10 * m * math.cos(t * sp * 1.3 + ph)
                gd.ellipse([x - r / 4, y - r / 4, x + r / 4, y + r / 4], fill=acc + (int(46 * min(1.5, m)),))
            img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(18)).resize((W, H), Image.BILINEAR))
            d = ImageDraw.Draw(img)
            for x, y0, r, sp in self.dots:
                y = (y0 - t * sp * m) % H
                if wy - 10 < y < wy + self.ch + 10: continue
                d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, 34))
        return img, sc

    def _accent(self, sc):
        if self.accent: return tuple(self.accent)
        a = tuple(int(v) for v in sc)
        return (255, 214, 64) if min(a) > 200 else a                   # 흰 공간 땐 노랑

    def _top_img(self):
        if self._top is None: self._top = Image.open(self.top).convert('RGBA')
        return self._top

    def _ticker(self):
        if self._tick is None:
            f = self.F(30); tmp = Image.new('RGBA', (4000, 60), (0, 0, 0, 0)); self.text(ImageDraw.Draw(tmp), (0, 42), self.info, f, (255, 255, 255), 0.62)
            x1 = (tmp.getchannel('A').getbbox() or (0, 0, 400, 0))[2]; self._tick = tmp.crop((0, 0, x1 + 140, 60))
        return self._tick

    def frame(self, t, content):
        W, H, wx, wy, cw, ch, m = self.W, self.H, self.wx, self.wy, self.cw, self.ch, self.mv
        if self.colors == 'auto':
            c = np.asarray(content.convert('RGB').resize((8, 8), Image.BILINEAR), float).reshape(-1, 3)
            c = c[np.argsort(c.std(1))[-24:]].mean(0)                   # 색이 있는 칸 위주로
            self._auto = tuple(c * 1.15 + 10)
        img, sc = self.bands(t); acc = self._accent(sc)
        fl = 4 * m * math.sin(t * 1.6); k = eo(seg(t, 0.05, 0.6)); br = 1 + 0.008 * m * math.sin(t * 1.1)
        TW = W - 112; chip_y = None
        if self.top:                                                   # 위 — 받은 타이틀 이미지
            ti = self._top_img(); maxh = wy - 150; tw0 = min(TW, int(maxh * ti.width / ti.height))
            tw = int(tw0 * (0.92 + 0.08 * k) * br); th = int(tw * ti.height / ti.width); tl = ti.resize((tw, th), Image.LANCZOS)
            if k < 1: tl.putalpha(tl.getchannel('A').point(lambda q: int(q * k)))
            th0 = tw0 * ti.height / ti.width; y0 = (wy - 90 - th0) / 2
            img.alpha_composite(tl, (int((W - tw) / 2), int(y0 + (th0 - th) / 2 + fl))); chip_y = y0 + th0 + 8 + fl
        elif self.title:
            d = ImageDraw.Draw(img); f = self.F(84, self.title_font); y0 = wy * 0.42 + fl
            self.text(d, (W / 2, y0), self.title, f, (255, 255, 255), k, 'ms'); chip_y = y0 + 26
        else: chip_y = wy * 0.45
        d = ImageDraw.Draw(img); a = eo(seg(t, 0.4, 0.9))
        if (self.chip or self.sub) and chip_y is not None:
            f = self.F(30); fsub = self.F(26); cw_ = (f.getlength(self.chip) + 48) if self.chip else 0
            total = cw_ + (18 + fsub.getlength(self.sub) if self.sub else 0); bx = (W - total) / 2; by = min(chip_y, wy - 70)
            if self.chip:
                d.rounded_rectangle([bx, by, bx + cw_, by + 48], 24, fill=acc + (int(255 * a),))
                self.text(d, (bx + cw_ / 2, by + 35), self.chip, f, INK if sum(acc) > 380 else (255, 255, 255), a, 'ms')
            if self.sub: self.text(d, (bx + cw_ + (18 if self.chip else 0), by + 35), self.sub, fsub, (255, 255, 255), 0.75 * a)
        sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle([wx, wy + 16, wx + cw, wy + ch + 16], 30, fill=(0, 0, 0, 120))
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(22)))
        c = content.convert('RGB')
        if c.size != (cw, ch): c = c.resize((cw, ch), Image.LANCZOS)
        img.paste(c, (wx, wy), self.mask()); d = ImageDraw.Draw(img)
        d.rounded_rectangle([wx, wy, wx + cw - 1, wy + ch - 1], 28, outline=(255, 255, 255, 60), width=2)
        y0 = wy + ch + (H - wy - ch) * 0.30                             # 아래 — 한 줄 · 진행 막대 · 정보 줄
        for i, (t0, note) in enumerate(self.notes):
            t1 = self.notes[i + 1][0] if i + 1 < len(self.notes) else self.dur + 1
            kin = eo(seg(t, t0 + 0.15, t0 + 0.55)); kout = eio(seg(t, t1 - 0.1, t1 + 0.25))
            if kin <= 0 or kout >= 1: continue
            self.text(d, (70, y0 + 40 * (1 - kin) - 40 * kout), note, self.F(50), (255, 255, 255), kin * (1 - kout))
        pr = cl(t / self.dur)
        d.rounded_rectangle([70, y0 + 52, W - 70, y0 + 58], 3, fill=(255, 255, 255, 40))
        d.rounded_rectangle([70, y0 + 52, 70 + (W - 140) * pr, y0 + 58], 3, fill=acc + (220,))
        if self.info:
            strip = self._ticker(); tw = strip.width; off = (t * 46) % tw
            for kk in range(int(W / tw) + 2): img.alpha_composite(strip, (int(70 - off + kk * tw), H - 140))
        return img.convert('RGB')

    def wrap_video(self, src, out, workers=None):
        """이미 구운 mp4 에 껍데기 씌우기 — 프레임을 꺼내 씌우고 원래 소리를 그대로 붙인다 (python3 <스킬>/scripts/wrap.py 로도)"""
        import types
        from . import bake, video as V
        info = V.probe(src); clip = V.Clip(src, loop=False, max_w=self.cw * 2)
        self.dur = info['dur']
        M = types.SimpleNamespace(W=self.W, H=self.H, FPS=round(info['fps']) or 30, DUR=info['dur'],
                                  frame=lambda t: self.frame(t, V.fit(clip.frame(t), (self.cw, self.ch))))
        silent = bake.frames(M, 0, bake.total(M), out[:-4] + '_silent.mp4', workers=workers)
        if info['audio']:
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', silent, '-i', src, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac',
                            '-b:a', '192k', '-shortest', out], check=True); os.remove(silent)
        else: os.replace(silent, out)
        return out
