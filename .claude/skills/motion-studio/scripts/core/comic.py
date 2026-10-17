"""만화 페이지 → 영상 (모션 코믹) — 그림은 하나도 고치지 않는다. 카메라(어디를 보게 할지) · 소리(무엇을 듣게 할지) · 빛 한 겹.

  detect(path)                 페이지 → 칸 상자 [(x0, y0, x1, y1)] (흰 칸새로 가르기 · 읽는 순서 위→아래 · 왼→오)
  check_image(pages, P, out)   칸 번호를 찍은 확인 그림 (유저가 칸 자리를 본다)
  Comic(pages, P, S, …)        영상 한 편 — .frame(t) · .DUR · .SCENES · .audio(wav) · .table()

  페이지는 늘 통째로 있다 — 읽는 칸만 밝고 나머지는 어둡다(칸 크기 · 모양 · 배치 연출이 살아 있게).
  페이지에 들어서면 어둡게 모양만(펀치 칸을 미리 보이지 않게) → 읽는 순서대로 칸 → 끝에 페이지 전체를 밝혀 머문다 → 옆으로 넘김.
  칸에 «닿는» 순간 · 넘김 한가운데는 배경음 박자 위에 둔다(사이는 직전 칸에 더 머문다).

칸마다 한 줄 (S 의 dict) — 자세히 = reference/comic.md
  pg · i            페이지 번호 · 그 페이지의 칸 번호(0 부터 · P 의 순서)
  cam               '다가가기' · '맞춤' · '훑기' · '훑기←' · '올려훑기' · '내려훑기' · '물러나기' 또는 튜플(아래 _cam)
  move              'ease'(부드럽게 들어감) · 'snap'(확 당김 · 움직임 흐림)
  hold              머무는 초(대사 길이 · 칸 크기)
  hf                넓은 칸 — 칸 높이가 화면의 이만큼 차게 당긴다(옆으로 훑기 · 세로 화면에서 넓은 칸이 작게 남지 않게)
  pan_at            훑기를 머무는 동안 언제(초)부터 언제까지
  sfx               [(닿은 뒤 초, 소리 이름, 크기)] — 페이지에 그려진 효과음 글자를 소리로 (SOUNDS)
  shake             [(닿은 뒤 초, 세기 px)] — 20 이상이면 하얗게 번쩍
  hush              배경음 비우기(초) — 펀치 직전 · 얼빠진 순간 (hold 이상이면 머무는 내내)
  fx                [(이름, {옵션})] — 그림 위 빛 한 겹(칸 안에만): sparkle · glow · sweep · rain
"""
import math

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

from . import audio as AU, bake, camera
from .ease import cl, eio, eo


# ── 칸 찾기 ─────────────────────────────────────
def detect(path, white=232, gap=6, min_frac=0.03):
    """흰 칸새로 갈라 칸 상자를 찾는다 (가로 띠 → 띠 안 세로 칸 → 다시 가로 … 되풀이).
    효과선 · 효과음 글자 · 칸을 뚫고 나온 인물이 칸새를 건너면 그 칸들은 붙어서 나온다 → 확인 그림을 보고 손으로 고친다"""
    g = np.asarray(Image.open(path).convert('L'), np.int16); Hh, Ww = g.shape
    ink = g < white
    out = []

    def cut(x0, y0, x1, y1, axis, depth):
        sub = ink[y0:y1, x0:x1]
        if sub.size == 0 or not sub.any(): return
        ys, xs = np.nonzero(sub); x0, x1, y0, y1 = x0 + xs.min(), x0 + xs.max() + 1, y0 + ys.min(), y0 + ys.max() + 1   # 둘레 흰 곳은 뺀다
        if (x1 - x0) * (y1 - y0) < Ww * Hh * min_frac: return
        for ax in ((axis, 1 - axis) if depth < 6 else ()):
            prof = ink[y0:y1, x0:x1].any(axis=1 - ax) if ax == 0 else ink[y0:y1, x0:x1].any(axis=0)
            runs, st = [], None
            for k, v in enumerate(prof):
                if not v and st is None: st = k
                if v and st is not None:
                    if k - st >= gap: runs.append((st, k))
                    st = None
            if runs:
                edges = [0] + [r for a_, b_ in runs for r in (a_, b_)] + [len(prof)]
                for a_, b_ in zip(edges[::2], edges[1::2]):
                    if ax == 0: cut(x0, y0 + a_, x1, y0 + b_, 1, depth + 1)
                    else: cut(x0 + a_, y0, x0 + b_, y1, 0, depth + 1)
                return
        out.append((int(x0), int(y0), int(x1), int(y1)))
    cut(0, 0, Ww, Hh, 0, 0)
    return out


def check_image(pages, P, out, thumb=540):
    """칸 번호 확인 그림 — 페이지마다 칸 상자 + 번호(읽는 순서)"""
    tiles = []
    for pg in sorted(P):
        im = Image.open(pages[pg]).convert('RGB'); d = ImageDraw.Draw(im)
        try: f = ImageFont.truetype(_font(), max(28, im.width // 18))
        except Exception: f = ImageFont.load_default()
        for i, (x0, y0, x1, y1) in enumerate(P[pg]):
            d.rectangle([x0, y0, x1, y1], outline=(255, 40, 80), width=max(4, im.width // 200))
            d.rounded_rectangle([x0 + 8, y0 + 8, x0 + 8 + im.width // 10, y0 + 8 + im.width // 13], 10, fill=(255, 40, 80))
            d.text((x0 + 8 + im.width // 20, y0 + 8 + im.width // 26), f'{pg}-{i + 1}', font=f, fill='white', anchor='mm')
        tiles.append(im.resize((thumb, int(im.height * thumb / im.width))))
    th = max(t.height for t in tiles); sheet = Image.new('RGB', (thumb * len(tiles) + 12 * (len(tiles) - 1), th), 'white')
    for k, t in enumerate(tiles): sheet.paste(t, (k * (thumb + 12), 0))
    import os
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True); sheet.save(out); return out


def _font():
    import os
    from .canvas import SKILL
    return os.path.join(SKILL, 'assets', 'fonts', 'Pretendard-Bold.otf')


# ── 그림 위 빛 한 겹 ─────────────────────────────
def _star(d, x, y, r, col):
    k = r * 0.28
    d.polygon([(x, y - r), (x + k, y - k), (x + r, y), (x + k, y + k), (x, y + r), (x - k, y + k), (x - r, y), (x - k, y - k)], fill=col)


def fx_layer(name, w, h, q, o, seed):
    """칸 크기 (w, h) 의 빛 (RGB · 검정 = 없음) — q = 칸에 닿은 뒤 초. screen 으로 얹는다(밝은 쪽만 더해진다)
    sparkle 반짝(제자리 깜빡) · glow 빛 번짐(숨 쉬듯 · rise = 모이는 빛) · sweep 빛 훑기 · rain 반짝이 가루가 흩날려 떨어짐
    옵션: col 색 · area (칸 비율 x0 y0 x1 y1) · n 개수 · r 크기 · at 자리 · amt 세기 · pulse 박동 · per 주기 · cols 여러 색 · life 수명"""
    rng = np.random.default_rng(seed); L = Image.new('RGB', (w, h), (0, 0, 0)); d = ImageDraw.Draw(L)
    col = tuple(o.get('col', (255, 245, 210))); area = o.get('area', (0, 0, 1, 1))
    ax0, ay0, ax1, ay1 = area[0] * w, area[1] * h, area[2] * w, area[3] * h
    if name == 'sparkle':
        for _ in range(o.get('n', 14)):
            x, y = rng.uniform(ax0, ax1), rng.uniform(ay0, ay1); ph = rng.uniform(0, 6.3); sp = rng.uniform(3, 6)
            v = max(0.0, math.sin(q * sp + ph)) ** 3
            if v > 0.05: _star(d, x, y, o.get('r', 16) * (0.5 + v), tuple(int(c * v) for c in col))
        L = ImageChops.add(L, L.filter(ImageFilter.GaussianBlur(6)))
    elif name == 'glow':
        cx, cy = o.get('at', (0.5, 0.5)); r = o.get('r', 0.35) * max(w, h)
        v = o.get('amt', 0.55) * (0.75 + 0.25 * math.sin(q * o.get('pulse', 3.0)))
        if o.get('rise'): v *= min(1.0, q / o['rise'])
        d.ellipse([cx * w - r, cy * h - r, cx * w + r, cy * h + r], fill=tuple(int(c * v) for c in col))
        L = L.filter(ImageFilter.GaussianBlur(r * 0.45))
    elif name == 'sweep':
        per = o.get('per', 2.4); u = (q % per) / per; bw = o.get('bw', 0.18) * w
        x = -bw + (w + 2 * bw + h * 0.6) * u
        d.polygon([(x, 0), (x + bw, 0), (x + bw - h * 0.6, h), (x - h * 0.6, h)], fill=tuple(int(c * o.get('amt', 0.35)) for c in col))
        L = L.filter(ImageFilter.GaussianBlur(bw * 0.4))
    elif name == 'rain':
        cols = [tuple(c) for c in o.get('cols', [col])]
        for _ in range(o.get('n', 40)):
            x0, y0 = rng.uniform(ax0, ax1), rng.uniform(ay0 - h * 0.3, ay1 * 0.6); vy = rng.uniform(60, 160); vx = rng.uniform(-40, 40)
            ph = rng.uniform(0, 6.3); x, y = x0 + vx * q, y0 + vy * q + 30 * q * q
            v = max(0.0, 1 - q / o.get('life', 2.2)) * (0.6 + 0.4 * math.sin(q * 9 + ph))
            c = cols[int(rng.integers(len(cols)))]
            if v > 0.05 and 0 <= y < h: _star(d, x, y, rng.uniform(4, 9), tuple(int(cc * v) for cc in c))
        L = ImageChops.add(L, L.filter(ImageFilter.GaussianBlur(4)))
    return L


# ── 소리 (페이지에 그려진 효과음 글자 → 소리) ─────────
SR = AU.SR


# 만화 효과음 글자 → 소리 재료(sfx · crowd)의 이름. 옛 이름도 그대로 받는다. 효과음 재료 이름(sfx.LIB)을 바로 써도 된다.
SOUNDS = {   # 이름: (재료, 어떤 효과음 글자에)
    'swish': ('blade_swish', '붕붕 · 휙 (휘두르기)'), 'twinkle': ('tinkerbell', '반짝 (눈빛 · 작은 반짝)'), 'shimmer': ('sparkle_dust', '촤르르 (마법 · 빛줄기)'),
    'aurora': ('windchime', '스으으 (큰 장관 · 길게)'), 'boom': ('orch_hit', '펑 · 쾅'), 'mega': ('explosion', '콰과광 (가장 큰 폭발)'),
    'sparkle_rain': ('sparkle_dust', '흩날리는 반짝이'), 'thud': ('soft_thud', '털썩 · 쿵(작게)'), 'boing': ('boing', '통 (튕김 · 코믹)'),
    'heart': ('heartbeat', '두근두근'), 'pop': ('cork_pop', '뻥 (터짐)'), 'hiss': ('breath_swish', '치이익 (연기)'), 'charge': ('riser', '위이잉 (힘 모으기)'),
    'rumble': ('thunder', '고오오 (낮게 차오름)'), 'scream': ('whistle_wow', '비명 · 꺅'), 'crowd': ('~murmur', '웅성웅성'), 'laugh': ('~laugh_crowd', '술렁 · 웃음'),
    'punch': ('punch', '퍽'), 'slash': ('blade_swish', '쉭 · 베기'), 'door': ('door', '쾅 (문)'), 'step': ('footsteps', '터벅터벅'),
}


def sound(name, rng):
    """효과음 글자 이름 → 소리 (SOUNDS 의 옛 이름 · sfx.LIB 이름 · ~긴 소리 이름)"""
    from . import sfx, crowd
    src = SOUNDS.get(name, (name, ''))[0]
    if src.startswith('~'): return getattr(crowd, src[1:])(3.0, seed=int(rng.integers(0, 999)))
    if src in sfx.LIB: return sfx.make(src, int(rng.integers(0, 999)))
    print(f'⚠ 모르는 소리 «{name}» — 쓸 수 있는 것: {" · ".join(SOUNDS)} 또는 sfx.LIB 이름')
    return np.zeros(10)


# ── 카메라 이름 → 튜플 ───────────────────────────
CAMS = {   # 이름: (튜플, 쓰는 자리)
    '다가가기': (('push', 0.95, 0.06), '감정 · 클로즈업 · 결심 — 아주 천천히 다가간다'),
    '맞춤': (('fit', 0.98), '칸 전체를 보여 주고 머문다 — 확 당기기(snap)와 같이 쓰면 코메디컷 · 리액션'),
    '훑기': (('pan', (0, 0, .5, 1), (.5, 0, 1, 1), 1.0), '넓은 칸 · 대화(왼쪽 사람 → 오른쪽 사람) — 왼→오'),
    '훑기←': (('pan', (.5, 0, 1, 1), (0, 0, .5, 1), 1.0), '오른→왼 (말하는 사람이 오른쪽에 먼저)'),
    '올려훑기': (('tilt', (0, .55, 1, 1), (0, 0, 1, .45), 1.0), '세로로 긴 칸 — 발끝에서 머리 · 지팡이 끝까지'),
    '내려훑기': (('tilt', (0, 0, 1, .45), (0, .55, 1, 1), 1.0), '위에서 아래로 떨어지는 것 · 내려다보기'),
    '물러나기': (('pull', (.3, .15, .7, .75), 1.0, 1.0), '큰 장관 · 반전 — 바짝 붙었다 물러나며 공개'),
}


class Comic:
    """만화 한 편. pages = {페이지: 파일} · P = {페이지: [칸 상자 …]} · S = [칸마다 한 줄 …] (읽는 순서)"""
    INTRO, OUTRO, XF, MOVE, SNAP = 0.85, 1.25, 0.55, 0.45, 0.16

    def __init__(self, pages, P, S, W=1080, H=1920, bpm=98, margin=90, bg=(17, 15, 28), dim=0.68, beat=True):
        self.pages, self.P, self.S, self.W, self.H = pages, P, S, W, H
        self.M, self.BG, self.DIM, self.bpm = margin, bg, dim, bpm
        self.BEAT = 60 / bpm if (bpm and beat) else None
        for s in S:
            if isinstance(s.get('cam'), str):
                if s['cam'] not in CAMS: raise KeyError(f'모르는 카메라 «{s["cam"]}» — {" · ".join(CAMS)}')
                s['cam'] = CAMS[s['cam']][0]
            s.setdefault('move', 'ease'); s.setdefault('hold', 2.0)
        self._timeline()

    # 시간표 — 칸에 닿는 순간 · 넘김 한가운데 = 박자
    def _on_beat(self, t, lead=0.0):
        if not self.BEAT: return t
        q = math.ceil((t + lead - 1e-6) / self.BEAT) * self.BEAT - lead
        if self.TL and q > t:
            a, b_, k, pg, i, sh = self.TL[-1]; self.TL[-1] = (a, q, k, pg, i, sh)
            if sh is not None: sh['t1'] = q; sh['hold'] = q - sh['t_land']
        return max(q, t)

    def _timeline(self):
        self.TL = []; t = 0.0; pgs = sorted(self.P)
        for pg in pgs:
            self.TL.append((t, t + self.INTRO, 'intro', pg, None, None)); t += self.INTRO
            for s in [s for s in self.S if s['pg'] == pg]:
                mv = self.SNAP if s['move'] == 'snap' else self.MOVE
                t = self._on_beat(t, mv)
                s['t0'] = t; s['t_land'] = t + mv; s['t1'] = t + mv + s['hold']
                self.TL.append((t, s['t1'], 'shot', pg, s['i'], s)); t = s['t1']
            self.TL.append((t, t + self.OUTRO, 'outro', pg, None, None)); t += self.OUTRO
            if pg != pgs[-1]:
                t = self._on_beat(t, self.XF / 2)
                self.TL.append((t, t + self.XF, 'turn', pg, None, None)); t += self.XF
        self.DUR = t + 0.8
        st = [a for a, b, k, *_ in self.TL if k == 'intro']
        self.SCENES = [(st[i], st[i + 1] if i + 1 < len(st) else self.DUR) for i in range(len(st))]
        self.page_start = {pg: [a for a, b, k, p, *_ in self.TL if k == 'intro' and p == pg][0] for pg in pgs}

    def table(self):
        """컷 연출표 — 유저가 보고 말로 고친다(«3장 2컷 더 오래» → 그 줄의 hold)"""
        name = {v[0]: k for k, v in CAMS.items()}
        rows = ['| 컷 | 시각 | 카메라 | 들어감 | 머묾 | 소리 | 흔들 | 무음 | 빛 |', '|---|---|---|---|---|---|---|---|---|']
        for s in self.S:
            cam = name.get(s['cam'], s['cam'][0])
            rows.append(f"| {s['pg']}-{s['i'] + 1} | {s['t_land']:.1f}초 | {cam} | {'확' if s['move'] == 'snap' else '부드럽게'} | {s['hold']:.1f}초 | "
                        f"{' · '.join(x[1] for x in s.get('sfx', [])) or '—'} | {' · '.join(str(x[1]) for x in s.get('shake', [])) or '—'} | "
                        f"{s.get('hush') or '—'} | {' · '.join(x[0] for x in s.get('fx', [])) or '—'} |")
        return '\n'.join(rows) + f'\n\n길이 {self.DUR:.1f}초 · 박자 {self.bpm if self.BEAT else "끔"}'

    # 무대 · 좌표
    def stage(self, pg):
        def mk():
            pic = Image.open(self.pages[pg]).convert('RGB'); M = self.M
            st = Image.new('RGB', (pic.width + 2 * M, pic.height + 2 * M), self.BG)
            sh = Image.new('L', st.size, 0); ImageDraw.Draw(sh).rectangle([M + 10, M + 14, M + pic.width + 10, M + pic.height + 14], fill=120)
            st.paste((0, 0, 0), (0, 0), sh.filter(ImageFilter.GaussianBlur(18))); st.paste(pic, (M, M)); return st
        return bake.memo(('comic-stage', id(self), pg), mk)

    def sb(self, pg, i):
        x0, y0, x1, y1 = self.P[pg][i]; return (x0 + self.M, y0 + self.M, x1 - x0, y1 - y0)

    @staticmethod
    def _sub(box, f):
        x, y, w, h = box; return (x + w * f[0], y + h * f[1], w * (f[2] - f[0]), h * (f[3] - f[1]))

    def full(self, pg):
        st = self.stage(pg); return camera.on((0, 0, st.width, st.height), st, fill=1.0, out=(self.W, self.H))

    def zcam(self, box, z):
        x, y, w, h = box; base = min(self.W / w, self.H / h); return camera.at(x + w / 2, y + h / 2, base * z)

    def shot_cam(self, s, u):
        W, H = self.W, self.H; box = self.sb(s['pg'], s['i']); c = s['cam']; sc = s.get('scale', 1.0)
        if s.get('hf'): sc = s['hf'] * H / box[3] / min(W / box[2], H / box[3])
        if c[0] == 'fit': return self.zcam(box, sc * c[1])
        if c[0] == 'push':
            b = self.zcam(box, c[1] * sc); return camera.Cam(b.cx, b.cy, b.z * (1 + c[2] * eio(u)), 0)
        if c[0] in ('pan', 'tilt'):
            a, b_ = self._sub(box, c[1]), self._sub(box, c[2]); z = min(W / box[2], H / box[3]) * sc * c[3]
            pa, pb = s.get('pan_at', (0.0, s['hold'])); v = cl((u * s['hold'] - pa) / max(0.01, pb - pa))
            return camera.lerp(camera.at(a[0] + a[2] / 2, a[1] + a[3] / 2, z), camera.at(b_[0] + b_[2] / 2, b_[1] + b_[3] / 2, z), eio(v))
        if c[0] == 'pull':
            a = self._sub(box, c[1]); z1 = min(W / box[2], H / box[3]) * c[3]
            return camera.lerp(camera.at(a[0] + a[2] / 2, a[1] + a[3] / 2, z1 * 1.9), camera.at(box[0] + box[2] / 2, box[1] + box[3] / 2, z1), eio(cl(u * 1.15)))
        return self.zcam(box, 1.0)

    def clamp(self, c, pg):
        st = self.stage(pg); vw, vh = self.W / c.z, self.H / c.z
        cx = st.width / 2 if vw >= st.width else min(max(c.cx, vw / 2), st.width - vw / 2)
        cy = st.height / 2 if vh >= st.height else min(max(c.cy, vh / 2), st.height - vh / 2)
        return camera.Cam(cx, cy, c.z, c.rot)

    # 밝힘 · 빛
    def lit_of(self, pg, tt):
        L = [0.0] * len(self.P[pg])
        for a, b, k, p, i, s in self.TL:
            if p != pg: continue
            if k == 'outro' and tt >= a: return [min(1.0, (tt - a) / 0.5)] * len(L)
            if k == 'shot' and a - 0.05 <= tt:
                L[i] = max(L[i], cl((tt - a) / 0.3) * (1 - cl((tt - b) / 0.3)))
        return L

    def lighting(self, img, pg, L, base):
        if base <= 0: return img
        m = Image.new('L', img.size, int(255 * self.DIM * base)); d = ImageDraw.Draw(m)
        for i, v in enumerate(L):
            if v <= 0: continue
            x, y, w, h = self.sb(pg, i); d.rectangle([x - 2, y - 2, x + w + 2, y + h + 2], fill=int(255 * self.DIM * base * (1 - v)))
        return Image.composite(Image.new('RGB', img.size, (8, 6, 16)), img, m)

    def overlay(self, img, pg, tt):
        for s in self.S:
            if s['pg'] != pg or not s.get('fx') or not (s['t0'] <= tt < s['t1'] + 0.3): continue
            q = tt - s['t_land']
            if q < 0: continue
            fade = min(1.0, (s['t1'] + 0.3 - tt) / 0.3)
            x, y, w, h = [int(v) for v in self.sb(pg, s['i'])]
            acc = Image.new('RGB', (w, h), (0, 0, 0))
            for j, (name, o) in enumerate(s['fx']): acc = ImageChops.add(acc, fx_layer(name, w, h, q, o, seed=pg * 100 + s['i'] * 10 + j))
            if fade < 1: acc = Image.eval(acc, lambda v, f=fade: int(v * f))
            img.paste(ImageChops.screen(img.crop((x, y, x + w, y + h)), acc), (x, y))
        return img

    # 한 장
    def page_frame(self, pg, tt):
        W, H = self.W, self.H; st = self.stage(pg)
        seg = [x for x in self.TL if x[3] == pg and x[0] <= tt < x[1] + (1e9 if x[2] == 'outro' else 0)]
        seg = seg[-1] if seg else [x for x in self.TL if x[3] == pg][0]
        a, b, k, _, i, s = seg
        shots = [x[5] for x in self.TL if x[3] == pg and x[2] == 'shot']
        if k == 'intro':
            base = 0.55 + 0.45 * cl((tt - a) / 0.5)
            img = self.lighting(st, pg, [0.0] * len(self.P[pg]), min(base, 1.0) * 0.8 + 0.2 * (1 - cl((tt - a) / self.INTRO)))
            return camera.shoot(img, camera.drift(self.full(pg), tt - a, self.INTRO, 0.015), (W, H))
        L = self.lit_of(pg, tt)
        if k == 'outro':
            c = camera.lerp(self.clamp(self.shot_cam(shots[-1], 1.0), pg), self.full(pg), eio(cl((tt - a) / 0.7)))
            return camera.shoot(self.lighting(st, pg, L, 1.0), self.clamp(c, pg), (W, H))
        j = shots.index(s); prev = self.clamp(self.shot_cam(shots[j - 1], 1.0), pg) if j > 0 else self.full(pg)
        if tt < s['t_land']:
            u = (tt - a) / max(1e-3, s['t_land'] - a); tgt = self.clamp(self.shot_cam(s, 0.0), pg)
            c = camera.lerp(prev, tgt, (eo if s['move'] == 'snap' else eio)(u))
            img = self.overlay(self.lighting(st, pg, L, 1.0), pg, tt)
            if s['move'] == 'snap': return camera.shoot(img, c, (W, H), mblur=camera.lerp(prev, tgt, max(0, (eo(u) - 0.35))), n=4)
            return camera.shoot(img, c, (W, H))
        u = (tt - s['t_land']) / max(1e-3, s['hold']); c = self.clamp(self.shot_cam(s, u), pg)
        for at, amp in s.get('shake', []):
            q = tt - s['t_land'] - at
            if 0 <= q < 0.45:
                e = amp * (1 - q / 0.45) ** 2
                c = camera.Cam(c.cx + e * math.sin(q * 90) / c.z, c.cy + e * math.cos(q * 73) / c.z, c.z, c.rot + 0.15 * e / 30 * math.sin(q * 50))
        out = camera.shoot(self.overlay(self.lighting(st, pg, L, 1.0), pg, tt), c, (W, H))
        for at, amp in s.get('shake', []):
            q = tt - s['t_land'] - at
            if 0 <= q < 0.14 and amp >= 20: out = Image.blend(out, Image.new('RGB', out.size, (255, 250, 240)), 0.45 * (1 - q / 0.14))
        return out

    def frame(self, tt):
        seg = [x for x in self.TL if x[0] <= tt < x[1]]
        if not seg: return self.page_frame(max(self.P), tt)
        a, b, k, pg, *_ = seg[-1]
        if k == 'turn':
            return camera.push(self.page_frame(pg, a - 1e-3), self.page_frame(pg + 1 if pg + 1 in self.P else sorted(p for p in self.P if p > pg)[0], b + 1e-3), eio((tt - a) / self.XF), 'left')
        return self.page_frame(pg, tt)

    # 소리
    def audio(self, path, sections=None, palette='tale', bgm_gain=0.28, sfx_gain=0.75):
        """효과음 + 장 넘김 + 배경음(sections 없으면 경쾌 → 마지막 장 잔잔 → 끝) · hush 자리는 배경음을 비운다"""
        rng = np.random.default_rng(11); sfx = AU.new_track(self.DUR)
        for s in self.S:
            for at, nm, g in s.get('sfx', []): AU._put(sfx, sound(nm, rng), s['t_land'] + at, g)
        for a, b, k, *_ in self.TL:
            if k == 'turn': AU._put(sfx, AU.whoosh(rng, 0.45, 0.25, fc=3200, bw=2200, pw=1.4), a + 0.05)
        bg = None
        try:
            if sections is None:
                last = self.page_start[max(self.P)]
                sections = [(0, last, 'bouncy', {}), (last, self.DUR - 3, 'calm', {}), (self.DUR - 3, self.DUR, 'outro', {})]
            bg = AU.bgm(sections, self.DUR, bpm=self.bpm or 98, palette=palette)
            env = np.ones(len(bg))
            for s in self.S:
                if s.get('hush'):
                    a = int((s['t0'] - 0.05) * SR); b = int((s['t_land'] + (s['hold'] if s['hush'] >= s['hold'] else 0.15)) * SR)
                    a0 = max(0, a - int(s['hush'] * SR)); r = int(0.12 * SR)
                    env[a0:a] = np.minimum(env[a0:a], np.linspace(1, 0.05, a - a0)); env[a:b] = 0.05
                    env[b:b + r] = np.minimum(env[b:b + r], np.linspace(0.05, 1, len(env[b:b + r])))
            bg = bg * env
        except BaseException as e:
            print('배경음 없이:', e)
        return AU.mixdown(self.DUR, path, bg, sfx, [], bgm_gain=bgm_gain, sfx_gain=sfx_gain)
