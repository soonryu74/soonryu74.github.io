"""원테이크 줌 — 컷 없이 카메라 하나. 사진 속 한 점으로 빨려 들어가면 그 점의 색 공간에 다음 사진들이 떠 있다 (reference/onetake.md)

★규칙 (어기면 «속임수»가 보인다)
  1. 바탕색은 줌인으로만 바뀐다 — 들어간 점의 색이 다음 공간 바탕
  2. 줌아웃은 바탕색을 바꾸지 않는다 — 지금 바탕색과 같은 색 점이 있는 사진에서 빠져나온다(near_spot)
  3. 설계도 먼저 — 공간마다 바탕 · 사진 · 다음으로 가는 점을 표로(plan) → check · blueprint 로 확인 → 짠다. 맞는 색 점이 없으면 사진을 바꾼다
  4. 줌 · 팬만 쓰지 않는다 — 공간마다 하나 이상 섞는다: 둘레 돌기(orbit) · 툭 떨어지기(drop) · 박자 넘기기(flip) · 휙 넘기기(pan_blur) · 카드 기울기(tilt)

  ST = onetake.Stage(W, H, dirs=['재료'])
  A = onetake.Card('사진1', 0, 0)                          세상 좌표(카드 폭 = 1) · size · rot
  uv, col = ST.color_spot('사진1')                         들어갈 점(색이 뚜렷하고 고른 곳) · 그 색 = 다음 공간
  uv, col = ST.near_spot('사진9', 지금 바탕색)              빠져나올 점(지금 바탕색에 가장 가까운 고른 곳)
  cam = onetake.zoom_to(점, 시작 cam, 끝 배율, u)          빨려 들어가기 (점이 먼저 가운데로 · 배율은 나중에 가속)
  cam = onetake.zoom_from(점, 끝 cam, 시작 배율, u)        빠져나오기
  img = ST.render(바탕색, [카드…], cam) → ST.fill(img, 색, k) · ST.zoom_blur(img, 양) · ST.pan_blur(img, dx, dy)
  ST.check(PLAN) · ST.blueprint(PLAN, 'out/설계도.png')
"""
import math
import os

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps

from .ease import cl, eio, eo, seg

HERE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FONT = os.path.join(HERE, 'assets', 'fonts', 'Pretendard-Bold.otf')


# ── 움직임 도구 ─────────────────────────────────────
def lerp(a, b, k): return a + (b - a) * k
def lgs(s0, s1, k): return math.exp(lerp(math.log(s0), math.log(s1), k))      # 배율은 로그로 (같은 빠르기로 느껴지게)
def ein(u, p=2.6): return cl(u) ** p                                           # 가속 (빨려 들어감)
def eout(u, p=2.6): return 1 - (1 - cl(u)) ** p                                # 감속 (도착)


def zoom_to(p, cam0, s1, u, pin=1.6):
    """점 p 로 빨려 들어가기 — 그 점이 화면 가운데로 먼저 오고 배율은 가속(나중) → 엉뚱한 곳을 키우지 않는다 · cam = (cx, cy, s)"""
    cx0, cy0, s0 = cam0; ox, oy = (p[0] - cx0) * s0, (p[1] - cy0) * s0
    k = 1 - eout(u, pin); s = lgs(s0, s1, ein(u))
    return (p[0] - ox * k / s, p[1] - oy * k / s, s)


def zoom_from(p, cam1, s0, u, pin=1.6):
    """점 p 에서 빠져나오기 — 처음엔 p 가 화면 가운데(아주 크게) → 배율이 줄며 p 가 제자리로 · 끝 = cam1"""
    cx1, cy1, s1 = cam1; ox, oy = (p[0] - cx1) * s1, (p[1] - cy1) * s1
    k = eout(u, pin); s = lgs(s0, s1, eout(u))
    return (p[0] - ox * k / s, p[1] - oy * k / s, s)


def arrive(target, s_end, u, start=(0, 0), from_scale=60):
    """새 공간에 도착 — 점처럼 작던 사진들이 커지며 target 으로 감속 (줌인 끝과 배율이 이어진다)"""
    k = eout(u); return (lerp(start[0], target[0], eout(u, 1.8)), lerp(start[1], target[1], eout(u, 1.8)), lgs(s_end / from_scale, s_end, k))


def dive_blur(u, amt=0.5):
    """급줌 동안의 흐림 양 (zoom_blur 에 넘긴다)"""
    return amt * math.sin(math.pi * cl(u * 1.15)) * ein(u)


def drop(lt, t0, dur=0.42, height=1.4):
    """툭 떨어지기 → (보이는 정도, 위로 뜬 높이(세상 단위), 화면 흔들림 (dx, dy))"""
    k = seg(lt, t0, t0 + dur)
    if lt < t0: return 0.0, height, (0, 0)
    fall = 1 - (k / 0.7) ** 2 if k < 0.7 else -0.06 * math.sin((k - 0.7) / 0.3 * math.pi)
    land = lt - t0 - dur * 0.7; sh = (0, 0)
    if 0 <= land < 0.16: am = 16 * (1 - land / 0.16); sh = (am * math.sin(land * 90), am * math.cos(land * 70))
    return min(1.0, k * 4), height * fall, sh


def orbit(cards, center, t, t_set, t0, t1, r=(0.62, 0.78), start=0.75):
    """둘레 돌기 — cards 가 center 카드 둘레로 자리 잡고(t_set~t0) 한 바퀴(t0~t1) · 앞쪽은 크게 · 뒤쪽은 작게 · 기운다"""
    ang = 2 * math.pi * eio(seg(t, t0, t1)); k0 = eio(seg(t, t_set, t0))
    for j, c in enumerate(cards):
        a0 = math.pi * (start + j * 2 / max(1, len(cards)))
        ox, oy = center.x + r[0] * math.cos(a0 + ang), center.y + r[1] * math.sin(a0 + ang)
        c.x, c.y = lerp(c.x, ox, k0), lerp(c.y, oy, k0); dep = math.sin(a0 + ang)
        c.size = lerp(c.size, 0.62 + 0.16 * dep, k0); c.z = dep * k0; c.rot = 8 * math.cos(a0 + ang) * k0
    center.z = 0
    return cards


def flip(names, lt, t0, beat=0.25):
    """박자 넘기기 — 같은 자리에서 사진이 박자마다 바뀐다 → (지금 이름, 튀는 양 0~1, 마지막이면 True)"""
    n = min(len(names) - 1, max(0, int((lt - t0) // beat))); pop = 1 - eo(cl(((lt - t0) % beat) / 0.08)) if lt >= t0 else 0
    return names[n], pop, n == len(names) - 1


def tilt(cards, cam, amt=6):
    """카메라가 지나가는 쪽으로 카드를 살짝 기울인다 (깊이감)"""
    for c in cards: c.rot = getattr(c, 'rot', 0) + amt * math.tanh((c.x - cam[0]) * 1.5)
    return cards


# ── 공간 · 카드 ─────────────────────────────────────
class Card:
    def __init__(self, name, x=0.0, y=0.0, size=1.0, rot=0.0, a=1.0, z=0.0):
        self.name, self.x, self.y, self.size, self.rot, self.a, self.z = name, x, y, size, rot, a, z

    def copy(self, **kw):
        c = Card(self.name, self.x, self.y, self.size, self.rot, self.a, self.z)
        for k, v in kw.items(): setattr(c, k, v)
        return c

    def world_pt(self, u, v, card_h=2 / 3):
        return self.x + (u - 0.5) * self.size, self.y + (v - 0.5) * self.size * card_h


class Stage:
    def __init__(self, W, H, dirs=('재료',), card_h=2 / 3, border=0.035, frame_col=(250, 248, 244), tex_w=1800):
        self.W, self.H, self.dirs, self.card_h, self.border, self.frame_col, self.tex_w = W, H, list(dirs), card_h, border, frame_col, tex_w

    def _memo(self, key, fn, keep=40):
        from . import bake
        return bake.memo(key, fn, keep=keep)

    def photo(self, name):
        def load():
            for d in self.dirs:
                for ext in ('', '.jpg', '.jpeg', '.png', '.webp', '.JPG', '.PNG'):
                    p = os.path.join(d, name + ext)
                    if os.path.isfile(p):
                        im = ImageOps.exif_transpose(Image.open(p)).convert('RGB')
                        if im.width > 2000: im = im.resize((2000, int(im.height * 2000 / im.width)), Image.LANCZOS)
                        return im
            raise FileNotFoundError(f'사진 {name} 을 {self.dirs} 에서 못 찾았어요')
        return self._memo('ot_ph_' + name, load)

    def card_tex(self, name):
        """흰 테두리 카드 그림 (가운데 맞춰 자르기)"""
        def make():
            ph = self.photo(name); w = self.tex_w; h = int(w * self.card_h); b = int(w * self.border); iw, ih = w - 2 * b, h - 2 * b
            s = max(iw / ph.width, ih / ph.height); p2 = ph.resize((int(ph.width * s) + 1, int(ph.height * s) + 1), Image.LANCZOS)
            p2 = p2.crop(((p2.width - iw) // 2, (p2.height - ih) // 2, (p2.width - iw) // 2 + iw, (p2.height - ih) // 2 + ih))
            c = Image.new('RGB', (w, h), self.frame_col); c.paste(p2, (b, b)); return c
        return self._memo('ot_card_' + name, make)

    def _grid(self, name):
        from numpy.lib.stride_tricks import sliding_window_view as sw
        tex = self.card_tex(name); a = np.asarray(tex.resize((90, 60), Image.BILINEAR)).astype(np.float32)
        sd = sw(np.pad(a, ((2, 2), (2, 2), (0, 0)), mode='edge'), (5, 5), axis=(0, 1)).std(axis=(-1, -2)).mean(-1)
        return tex, a, sd

    def _col_at(self, tex, x, y):
        big = np.asarray(tex).astype(np.float32); cy, cx = int((y + 0.5) / 60 * tex.height), int((x + 0.5) / 90 * tex.width)
        return tuple(int(v) for v in big[max(0, cy - 12):cy + 12, max(0, cx - 12):cx + 12].reshape(-1, 3).mean(0))

    def color_spot(self, name):
        """«색이 뚜렷하고 고른» 점 → ((u, v) 카드 안 0~1, 색) · 그 색이 다음 공간의 바탕"""
        def find():
            tex, a, sd = self._grid(name); a = a / 255; mx, mn = a.max(2), a.min(2); sat = (mx - mn) / (mx + 1e-6)
            sc = sat * mx * np.clip(1 - sd / 255 * 6, 0, 1); sc[:6], sc[-6:], sc[:, :8], sc[:, -8:] = 0, 0, 0, 0
            y, x = np.unravel_index(sc.argmax(), sc.shape)
            return ((x + 0.5) / 90, (y + 0.5) / 60), self._col_at(tex, x, y)
        return self._memo('ot_spot_' + name, find)

    def near_spot(self, name, col):
        """col 에 가장 가까운 «고른» 점 → ((u, v), 실제 색) — 줌아웃이 여기서 시작(지금 화면 색 = 그 점 색 → 끊김 없이)"""
        def find():
            tex, a, sd = self._grid(name)
            d = np.linalg.norm(a - np.array(col, np.float32), axis=2) + sd * 3
            d[:5], d[-5:], d[:, :6], d[:, -6:] = 1e9, 1e9, 1e9, 1e9
            y, x = np.unravel_index(d.argmin(), d.shape)
            return ((x + 0.5) / 90, (y + 0.5) / 60), self._col_at(tex, x, y)
        return self._memo(f'ot_near_{name}_{tuple(col)}', find)

    def spot_pt(self, card, uv): return card.world_pt(*uv, card_h=self.card_h)

    def draw_card(self, img, tex, cx, cy, wpx, rot=0.0, a=1.0, shadow=True):
        """화면 (cx, cy) 가운데 · 폭 wpx — 화면에 보이는 부분만 원본에서 떠서 키운다(아주 크게 다가가도 가볍다)"""
        W, H = self.W, self.H; hpx = wpx * self.card_h
        if wpx < 2 or a <= 0: return
        if rot and wpx < 2600:
            im = tex.resize((max(1, int(wpx)), max(1, int(hpx))), Image.BILINEAR).convert('RGBA')
            if shadow:
                sh = Image.new('RGBA', (im.width + 80, im.height + 80), (0, 0, 0, 0))
                ImageDraw.Draw(sh).rectangle([40, 52, 40 + im.width, 52 + im.height], fill=(0, 0, 0, int(70 * a)))
                sh = sh.filter(ImageFilter.GaussianBlur(14)).rotate(-rot, Image.BICUBIC, expand=True)
                img.alpha_composite(sh, (int(cx - sh.width / 2), int(cy - sh.height / 2 + 6)))
            im = im.rotate(-rot, Image.BICUBIC, expand=True)
            if a < 1: im.putalpha(im.getchannel('A').point(lambda q: int(q * a)))
            img.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2))); return
        x0, y0 = cx - wpx / 2, cy - hpx / 2
        vx0, vy0, vx1, vy1 = max(0, x0), max(0, y0), min(W, x0 + wpx), min(H, y0 + hpx)
        if vx1 <= vx0 or vy1 <= vy0: return
        if shadow and wpx < 3000:
            sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            ImageDraw.Draw(sh).rectangle([x0 + 6, y0 + 14, x0 + wpx + 6, y0 + hpx + 14], fill=(0, 0, 0, int(60 * a)))
            img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(max(4, wpx / 60))))
        tw = tex.size[0]; k = tw / wpx
        box = ((vx0 - x0) * k, (vy0 - y0) * k, (vx1 - x0) * k, (vy1 - y0) * k)
        piece = tex.resize((int(math.ceil(vx1 - vx0)), int(math.ceil(vy1 - vy0))), Image.BILINEAR, box=box).convert('RGBA')
        if a < 1: piece.putalpha(int(255 * a))
        img.alpha_composite(piece, (int(vx0), int(vy0)))

    def render(self, bg, cards, cam):
        """cam = (cx, cy, s) — 세상 (cx, cy) 가 화면 가운데 · s = 세상 1 단위가 몇 px · 카드는 z 순서로"""
        cx, cy, s = cam; img = Image.new('RGBA', (self.W, self.H), tuple(bg) + (255,))
        for c in sorted(cards, key=lambda c: getattr(c, 'z', 0)):
            self.draw_card(img, self.card_tex(c.name), self.W / 2 + (c.x - cx) * s, self.H / 2 + (c.y - cy) * s, c.size * s, c.rot, c.a)
        return img

    def fill(self, img, col, k):
        """줌인 마지막에 화면을 그 점 색으로 덮는다 (공간 이음매)"""
        return img if k <= 0 else Image.blend(img.convert('RGBA'), Image.new('RGBA', img.size, tuple(col) + (255,)), eio(cl(k)))

    def zoom_blur(self, img, amt, center=None):
        if amt < 0.01: return img
        W, H = self.W, self.H; cx, cy = center or (W / 2, H / 2); img = img.convert('RGB'); out = np.asarray(img).astype(np.float32); n = 5
        for i in range(1, n):
            f = 1 + amt * i / n; w2, h2 = W / f, H / f
            out += np.asarray(img.resize((W, H), Image.BILINEAR, box=(cx - w2 / 2, cy - h2 / 2, cx + w2 / 2, cy + h2 / 2))).astype(np.float32)
        return Image.fromarray((out / n).astype(np.uint8))

    def pan_blur(self, img, dx, dy):
        if math.hypot(dx, dy) < 6: return img
        img = img.convert('RGB'); out = np.asarray(img).astype(np.float32); n = 5
        for i in range(1, n): out += np.asarray(ImageChops.offset(img, int(-dx * i / n), int(-dy * i / n))).astype(np.float32)
        return Image.fromarray((out / n).astype(np.uint8))

    # ── 설계도 ──
    def check(self, plan, tol=40):
        """PLAN = [{'bg': 색 또는 None(앞 공간에서 정해짐), 'photos': [...], 'go': ('in', 사진) | ('out', 사진) | None, 'mix': '섞는 기법'}]
        규칙 1 · 2 · 4 를 본다 → 문제 줄 목록(비면 통과) · 공간마다 실제 바탕색을 채워 돌려준다"""
        bad, bg = [], tuple(plan[0].get('bg') or (246, 244, 240))
        for i, sp in enumerate(plan):
            sp['bg'] = tuple(sp.get('bg') or bg); bg = sp['bg']
            if not sp.get('mix'): bad.append(f'공간 {i + 1}: 줌 · 팬 말고 섞는 기법이 없어요 (orbit · drop · flip · 휙 넘기기 · tilt 중 하나 이상)')
            go = sp.get('go')
            if not go: continue
            kind, ph = go
            if ph not in sp['photos'] and kind == 'in': bad.append(f'공간 {i + 1}: 들어갈 사진 {ph} 가 이 공간 사진에 없어요')
            if kind == 'in':
                _, col = self.color_spot(ph); sp['next_bg'] = col
                if i + 1 < len(plan) and plan[i + 1].get('bg') and np.linalg.norm(np.subtract(plan[i + 1]['bg'], col)) > tol:
                    bad.append(f'공간 {i + 2}: 바탕은 줌인한 점 색 {col} 이어야 해요(적힌 {plan[i + 1]["bg"]})')
                bg = col
            else:
                _, col = self.near_spot(ph, sp['bg']); sp['next_bg'] = sp['bg']; dist = float(np.linalg.norm(np.subtract(col, sp['bg'])))
                if dist > tol: bad.append(f'공간 {i + 1} → 줌아웃: {ph} 에 지금 바탕 {sp["bg"]} 과 같은 색 점이 없어요(가장 가까운 {col}) — 사진을 바꾸세요')
                if i + 1 < len(plan) and plan[i + 1].get('bg') and np.linalg.norm(np.subtract(plan[i + 1]['bg'], sp['bg'])) > tol:
                    bad.append(f'공간 {i + 2}: 줌아웃은 바탕을 바꾸지 않아요 — {sp["bg"]} 그대로')
        return bad

    def blueprint(self, plan, out, thumb=200):
        """설계도 그림 — 공간마다 한 줄: 바탕색 칸 · 사진 · 다음으로 가는 점(색 동그라미) · 섞는 기법 → 유저에게 먼저 보인다"""
        bad = self.check(plan); fs = ImageFont.truetype(FONT, 20)
        rows = len(plan); th = int(thumb * self.card_h); rh = th + 96; X0 = 300
        Wd = X0 + max(len(sp['photos']) for sp in plan) * (thumb + 20) + 400
        img = Image.new('RGB', (Wd, rows * rh + 40 + 34 * len(bad)), (250, 250, 248)); d = ImageDraw.Draw(img)
        for i, sp in enumerate(plan):
            y = 20 + i * rh; d.rounded_rectangle([20, y, 260, y + th], 14, fill=tuple(sp['bg']), outline=(60, 60, 60), width=2)
            d.text((24, y + th + 8), f'공간 {i + 1}', font=fs, fill=(30, 30, 30))
            d.text((24, y + th + 36), (sp.get('mix') or '— 섞는 기법 없음')[:24], font=fs, fill=(90, 90, 90))
            prev = plan[i - 1].get('go') if i else None
            for j, ph in enumerate(sp['photos']):
                x = X0 + j * (thumb + 20); img.paste(self.card_tex(ph).resize((thumb, th)), (x, y))
                go = sp.get('go'); uv = None
                if go and go[0] == 'in' and go[1] == ph: uv, col = self.color_spot(ph)          # 들어갈 점
                if prev and prev[0] == 'out' and prev[1] == ph: uv, col = self.near_spot(ph, sp['bg'])   # 빠져나올 점
                if uv:
                    px, py = x + uv[0] * thumb, y + uv[1] * th
                    d.ellipse([px - 14, py - 14, px + 14, py + 14], fill=tuple(col), outline=(235, 64, 52), width=4)
                d.text((x, y + th + 8), ph, font=fs, fill=(90, 90, 90))
            go = sp.get('go')
            if go: d.text((Wd - 380, y + th / 2 - 14), '줌인 → 점 색이 다음 바탕' if go[0] == 'in' else f'줌아웃 → {go[1]} 점에서 (바탕 그대로)', font=fs, fill=(40, 40, 40))
        for k, b in enumerate(bad): d.text((20, rows * rh + 30 + 34 * k), 'X  ' + b, font=fs, fill=(200, 40, 40))
        os.makedirs(os.path.dirname(out) or '.', exist_ok=True); img.save(out)
        return out, bad
