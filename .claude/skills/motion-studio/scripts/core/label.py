"""이름표 · 화살표 · 튀어나오는 글귀 — 영상 위에 얹는 짚기 표시 (reference/video-shorts.md)

캔버스의 이름표(둥근 칩)와 화살표(SVG 곡선)를 그 좌표 그대로 그리고, 시간에 맞춰 나타나고 사라지게 한다.
  chip(d, x, top, '이름', font, bg, a, h=100, pad=48)        둥근 칩 이름표 (a = 0~1 보임)
  m = svg_map(left, top, w, h, (vw, vh))                     캔버스 <svg> 상자 + viewBox → 아트보드 좌표로 바꾸는 함수
  arrow(d, m, p0, p1, p2, heads, col, k)                     2차 곡선 화살표 — 선이 그어지고(k 0~0.8) 끝에 머리(0.8~1) · 흰 테두리
  pop(d, xy, '건배!', font_path, size, col, k)               튀어나오는 글귀 (k 0~1 · 살짝 넘쳤다 제자리)
  swap(d, xy, a_txt, b_txt, font_path, size, col, lt, t_in, t_swap)   글귀가 튀어나왔다가 → 접히며 사라지고 → 다른 글귀로
  fade_layer(layer, k)                                       얹은 층 전체를 k 만큼만 보이게 (이름표가 함께 사라질 때)
멈춤 → 이름표 → 사라지고 다시 재생은 video.hold_time(장면 안 시각, [(멈출 시각, 멈춤 길이)]) 과 함께 쓴다.

짚기 — 스포트라이트 · 돋보기 (자리 · 시각을 받는 형태 · 영상 · 사진 · 화면 녹화 어디든 · 매 프레임 «지금 어디 · 얼마나(k)»)
  spot(img, rect, k, dark=0.72, pad=14, grow=60, radius=22, shape='rect', clip=None)
      rect(x0, y0, x1, y1) 만 남기고 어둡게 — k 가 오르며 어둠이 짙어지고 구멍이 grow 만큼 줄어들며 맞는다
      rect 여러 개 = 리스트 · shape='ellipse' = 둥근 구멍 · clip = 어둡게 할 범위(화면 속 창만 등)
  m = lens(img, pic, pic_box, center, k, r=175, zoom=2.4, ring=흰색, handle=노랑, shadow=True)
      pic = 화면 pic_box(x, y, w, h) 에 보이는 그림의 원본(고해상도면 더 선명) · center = 렌즈 가운데
      반환 m(화면 점) → 렌즈 안에서 그 점이 보이는 자리(렌즈 밖이면 None) — 렌즈 안 대상에 X · 동그라미를 그릴 때
  path([(x, y), …], u)      점 목록을 따라 u(0~1) 만큼 간 자리(곡선) — 미끄러져 오는 렌즈
  box_path([rect, …], u)    상자 사이를 u 만큼 옮겨 간 상자 — 스포트라이트가 다음 대상으로
  흐름: hold_time 으로 화면을 붙잡고 → 그 동안 k 를 seg 로 올리고 → 끝나며 내린다
  (fx.spotlight · fx.magnifier 는 효과 사전 시연판 — 속은 이 두 함수)

손그림 짚기 표시 — 기하 도형 ⛔ · 손으로 그은 중심선 + 굵기 · 떨림 (canvas-rules §4 «짚기 표시»)
  st = mark('arrow' | 'circle' | 'box' | 'x' | 'underline' | 'check', …)   획 목록 (영상 · 캔버스 같은 모양)
  draw_mark(d, st, k, col, halo=8)          k 0~1 만큼 획 차례로 그려지며 · 흰 테두리
  mark_svg(st, col, tag=…) · scripts/mark.py   캔버스용 <svg data-mark> · mark_from_tag(꼬리표) → 영상에서 같은 획
  finger(d, fx, fy, k, tap)                 손가락 포인터 + «톡»
  png, org = bold_arrow(꼬리, 휨, 끝, 색들) · bold_reveal(img, png, org, 꼬리, 끝, k)   질감 덩어리 화살표 (강조)
"""
import math

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from .ease import back, cl, eio, eo, seg

WHITE = (255, 255, 255)
_F = {}


def _font(path, size):
    k = (path, int(size))
    if k not in _F: _F[k] = ImageFont.truetype(path, max(8, int(size)))
    return _F[k]


def chip(d, x, top, text, font, bg, a=1.0, h=100, pad=48, fg=WHITE):
    """캔버스의 둥근 칩(height · padding · border-radius = h/2)을 그대로 · a = 보임(0~1)"""
    if a <= 0: return
    w = d.textlength(text, font=font) + pad * 2; A = int(255 * min(1.0, a))
    d.rounded_rectangle([x, top, x + w, top + h], h // 2, fill=tuple(bg) + (A,))
    d.text((x + pad, top + h / 2), text, font=font, fill=tuple(fg) + (A,), anchor='lm')


def svg_map(left, top, w, h, viewbox):
    """캔버스 <svg style="left top width height" viewBox="0 0 vw vh"> → 점 변환 함수
    (기본 preserveAspectRatio = 가운데 맞춤 · 가로세로 같은 배율 — 상자 비율이 viewBox 와 달라도 캔버스와 같은 자리)"""
    vw, vh = viewbox; s = min(w / vw, h / vh); ox = left + (w - vw * s) / 2; oy = top + (h - vh * s) / 2
    return lambda p: (ox + p[0] * s, oy + p[1] * s)


def _qbez(p0, p1, p2, k, n=48):
    ts = np.linspace(0, k, max(2, int(n * max(k, 0.05))))
    return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
             (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in ts]


def _dot(d, q, wdt, c):
    d.ellipse([q[0] - wdt / 2, q[1] - wdt / 2, q[0] + wdt / 2, q[1] + wdt / 2], fill=c)


def arrow(d, m, p0, p1, p2, heads, col, k, width=8, edge=16):
    """캔버스 화살표 path «M p0 Q p1 p2 M p2 L h1 M p2 L h2» 를 viewBox 좌표 그대로 받는다 (m = svg_map)
    k 0~0.8 = 선이 그어지고 · 0.8~1 = 머리가 펴진다 · 흰 테두리(edge)가 영상 위에서 선을 띄운다"""
    if k <= 0: return
    pts = [m(p) for p in _qbez(p0, p1, p2, min(1.0, k / 0.8))]
    tip = m(p2); hk = eo(seg(k, 0.8, 1.0))
    for wdt, c in ((edge, WHITE + (255,)), (width, tuple(col) + (255,))):
        d.line(pts, fill=c, width=wdt, joint='curve'); _dot(d, pts[0], wdt, c); _dot(d, pts[-1], wdt, c)
        if hk > 0:
            for h_ in heads:
                hp = m(h_); q = (tip[0] + (hp[0] - tip[0]) * hk, tip[1] + (hp[1] - tip[1]) * hk)
                d.line([tip, q], fill=c, width=wdt); _dot(d, q, wdt, c)


def pop(d, xy, text, font_path, size, col, k, over=1.8, anchor='mm'):
    """튀어나오는 글귀 — k 0~1 (seg 로 잘라 넘긴다) · over = 넘쳤다 돌아오는 정도"""
    if k <= 0: return
    sc = back(min(1.0, k), over)
    if sc <= 0.02: return
    d.text(xy, text, font=_font(font_path, size * sc), fill=tuple(col) + (int(255 * min(1.0, k * 2)),), anchor=anchor)


def swap(d, xy, a_txt, b_txt, font_path, size, col, lt, t_in, t_swap, dur=0.35, out=0.2):
    """글귀 A 가 t_in 에 튀어나오고 → t_swap 에 접히며 사라지고 → B 가 튀어나온다 (lt = 장면 안 시각)"""
    ko = seg(lt, t_swap, t_swap + out)
    if ko < 1:
        k = seg(lt, t_in, t_in + dur)
        if k > 0:
            sc = back(k, 1.8) * (1 - eio(ko))
            if sc > 0.02:
                d.text(xy, a_txt, font=_font(font_path, size * sc), fill=tuple(col) + (int(255 * min(1, k * 2) * (1 - ko)),), anchor='mm')
    pop(d, xy, b_txt, font_path, size, col, seg(lt, t_swap + out, t_swap + out + dur))


def fade_layer(layer, k):
    """RGBA 층 전체 보임을 k(0~1) 로 — 이름표 · 화살표를 한꺼번에 사라지게"""
    if k >= 1: return layer
    layer.putalpha(layer.getchannel('A').point(lambda v: int(v * max(0.0, k))))
    return layer


def blank(size):
    return Image.new('RGBA', size, (0, 0, 0, 0))


# ── 짚기: 스포트라이트 · 돋보기 ──


def _rgba(img):
    return img if img.mode == 'RGBA' else img.convert('RGBA')


def spot(img, rect, k, dark=0.72, pad=14, grow=60, radius=22, shape='rect', clip=None, col=(0, 0, 0)):
    """rect 만 남기고 어둡게 — img 를 고쳐서 돌려준다(RGB 면 RGB 로)"""
    if k <= 0: return img
    k = cl(k); W, H = img.size
    m = Image.new('L', (W, H), int(255 * dark * k)); d = ImageDraw.Draw(m)
    p = pad + grow * (1 - k)
    for r in (rect if rect and isinstance(rect[0], (list, tuple)) else [rect]):
        b = [r[0] - p, r[1] - p, r[2] + p, r[3] + p]
        if shape == 'ellipse': d.ellipse(b, fill=0)
        else: d.rounded_rectangle(b, radius, fill=0)
    if clip is not None:                                                    # 어둡게 할 범위만 (화면 속 창 등)
        cm = Image.new('L', (W, H), 0); ImageDraw.Draw(cm).rectangle(clip, fill=255)
        m = Image.fromarray(np.minimum(np.asarray(m), np.asarray(cm)))
    img.paste(Image.new(img.mode, (W, H), col if img.mode == 'RGB' else col + (255,)), (0, 0), m)
    return img


def lens(img, pic, pic_box, center, k, r=175, zoom=2.4, ring=WHITE, handle=(255, 214, 107), shadow=True, ring_w=9):
    """돋보기 — 렌즈 밑 자리를 원본(pic)에서 zoom 배로. 반환 = 화면 점 → 렌즈 안 자리 함수"""
    bx, by, bw, bh = pic_box; cx, cy = center
    sx, sy = pic.width / bw, pic.height / bh                                # 화면 px → 원본 px
    if k <= 0: return lambda p: None
    a = cl(k); base = _rgba(img) if img.mode != 'RGBA' else img
    u, v = (cx - bx) * sx, (cy - by) * sy; ru, rv = r / zoom * sx, r / zoom * sy
    crop = pic.crop((int(u - ru), int(v - rv), int(u + ru), int(v + rv))).resize((2 * r, 2 * r), Image.LANCZOS).convert('RGBA')
    m = Image.new('L', (2 * r, 2 * r), 0); ImageDraw.Draw(m).ellipse([0, 0, 2 * r - 1, 2 * r - 1], fill=int(255 * a))
    lay = Image.new('RGBA', base.size, (0, 0, 0, 0))
    if shadow:
        ImageDraw.Draw(lay).ellipse([cx - r + 8, cy - r + 14, cx + r + 8, cy + r + 14], fill=(0, 0, 0, int(120 * a)))
        lay = lay.filter(ImageFilter.GaussianBlur(12))
    lay.paste(crop, (int(cx - r), int(cy - r)), m); d = ImageDraw.Draw(lay)
    h0, h1 = (cx + r * 0.72, cy + r * 0.72), (cx + r * 1.3, cy + r * 1.3)
    d.line([h0, h1], fill=WHITE + (int(255 * a),), width=26); d.line([h0, h1], fill=tuple(handle) + (int(255 * a),), width=14)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=tuple(ring) + (int(255 * a),), width=ring_w)
    base.alpha_composite(lay)
    if img.mode != 'RGBA': img.paste(base.convert(img.mode))

    def m_(p):
        qx, qy = cx + (p[0] - cx) * zoom, cy + (p[1] - cy) * zoom          # 렌즈 가운데 기준 zoom 배
        return (qx, qy) if math.hypot(qx - cx, qy - cy) <= r else None
    return m_


def path(pts, u):
    """점 목록을 따라 u(0~1) 만큼 — 2점 = 직선 · 3점 이상 = 지나가는 곡선(Catmull-Rom)"""
    u = cl(u); n = len(pts)
    if n == 1: return tuple(pts[0])
    if n == 2: return (pts[0][0] + (pts[1][0] - pts[0][0]) * u, pts[0][1] + (pts[1][1] - pts[0][1]) * u)
    f = u * (n - 1); i = min(int(f), n - 2); t = f - i
    p0, p1, p2, p3 = pts[max(i - 1, 0)], pts[i], pts[i + 1], pts[min(i + 2, n - 1)]
    t2, t3 = t * t, t * t * t
    return tuple(0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2
                        + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1))


def box_path(rects, u, ease=eio):
    """상자 목록 사이를 u(0~1) 만큼 — 구간마다 ease 로 옮겨 간다"""
    u = cl(u); n = len(rects)
    if n == 1: return tuple(rects[0])
    f = u * (n - 1); i = min(int(f), n - 2); t = ease(f - i)
    return tuple(rects[i][j] + (rects[i + 1][j] - rects[i][j]) * t for j in range(4))


# ── 손그림 짚기 표시: 화살표 · 동그라미 · 네모 · X · 밑줄 · 체크 · 손가락 · 질감 화살표 ──
# 원칙: 중심선을 계산하고 → 굵기(들어갈 때 가늘게 · 가운데 굵게 · 빠질 때 가늘게) · 떨림을 입힌다.
#       머리 방향은 곡선 끝 방향으로 계산(눈대중 ⛔) · 끝은 대상 가장자리에서 멈춘다 · X 를 사각형 두 개로 짓지 않는다.
# 한 번 계산한 획(mark)을 영상(draw_mark · k 로 그려지며)과 캔버스(mark_svg · 같은 모양의 SVG)에 함께 쓴다.

def _quad(p0, c, p1, u):
    return ((1 - u) ** 2 * p0[0] + 2 * (1 - u) * u * c[0] + u * u * p1[0], (1 - u) ** 2 * p0[1] + 2 * (1 - u) * u * c[1] + u * u * p1[1])


def _catmull(P, per=10):
    out = []
    for i in range(len(P) - 1):
        p0 = P[i - 1] if i else P[0]; p1, p2 = P[i], P[i + 1]; p3 = P[i + 2] if i + 2 < len(P) else P[-1]
        for s in range(per):
            t = s / per; t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2
                                    + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    out.append(tuple(P[-1])); return out


def hand_curve(p0, tip, bend=0.25, side=1, wob=3, seed=1, n=7):
    """p0 → tip 손으로 그은 곡선 점 목록 (bend = 휨 · side = 휘는 쪽 ±1 · wob = 떨림 px)"""
    import random
    rnd = random.Random(seed); dx, dy = tip[0] - p0[0], tip[1] - p0[1]
    c = ((p0[0] + tip[0]) / 2 - side * dy * bend, (p0[1] + tip[1]) / 2 + side * dx * bend)
    ph = rnd.uniform(0, 6.28); P = []
    for j in range(n):
        u = j / (n - 1); x, y = _quad(p0, c, tip, u)
        if 0 < j < n - 1:
            a, b = _quad(p0, c, tip, max(0, u - .02)), _quad(p0, c, tip, min(1, u + .02)); tx, ty = b[0] - a[0], b[1] - a[1]; tl = math.hypot(tx, ty) or 1
            w = wob * math.sin(j * 1.7 + ph) + rnd.uniform(-wob, wob) * 0.4; x += -ty / tl * w; y += tx / tl * w
        P.append((x, y))
    return _catmull(P)


def _head(pts, size, ang=29):
    """곡선 끝 방향으로 계산한 열린 V 머리 두 획"""
    p3 = pts[-1]; p2 = pts[max(0, len(pts) - 6)]; a = math.atan2(p3[1] - p2[1], p3[0] - p2[0]); out = []
    for sgn, L, da in ((-1, size, 4), (1, size * 0.86, 0)):
        aa = a + sgn * math.radians(ang + da); out.append([p3, (p3[0] - L * math.cos(aa), p3[1] - L * math.sin(aa))])
    return out


def _ring(cx, cy, rx, ry, rot=-8, over=0.22, seed=3, wob=0.04):
    import random
    rnd = random.Random(seed); a0 = math.radians(rnd.uniform(-160, -110)); P = []; n = 90; ro = math.radians(rot)
    for i in range(n + 1):
        t = a0 + i / n * 2 * math.pi * (1 + over); g = 1 + wob * math.sin(t * 3 + seed) + 0.06 * (i / n)
        x, y = rx * g * math.cos(t), ry * g * math.sin(t)
        P.append((cx + x * math.cos(ro) - y * math.sin(ro), cy + x * math.sin(ro) + y * math.cos(ro)))
    return P


def _box(x0, y0, x1, y1, seed=5, over=18, wob=3):
    import random
    rnd = random.Random(seed); j = lambda: rnd.uniform(-wob, wob)
    P = [(x0 - over * 0.3, y0 + j()), (x1 + over, y0 + j()), (x1 + j(), y0 - over * 0.4), (x1 + j(), y1 + over * 0.6),
         (x1 + over * 0.2, y1 + j()), (x0 - over, y1 + j()), (x0 + j(), y1 + over * 0.3), (x0 + j(), y0 - over)]
    return [[(a[0] + (b[0] - a[0]) * t / 30 + rnd.uniform(-0.6, 0.6), a[1] + (b[1] - a[1]) * t / 30 + rnd.uniform(-0.6, 0.6)) for t in range(31)]
            for a, b in ((P[0], P[1]), (P[2], P[3]), (P[4], P[5]), (P[6], P[7]))]


def mark(kind, *a, pen=None, w=12, seed=1, **kw):
    """손그림 짚기 표시 → 획 목록 [{'pts', 'pen'(일정 굵기 w) 또는 'brush'(w0→w1→w0)}] — draw_mark · mark_svg 에 넘긴다
      mark('arrow', 꼬리(x, y), 끝(x, y), bend=0.25, side=1, head=46, brush=False)   펜 한 획 + 열린 V 머리 (brush=True 면 붓 끝 가늘게)
      mark('circle', cx, cy, rx, ry, rot=-8)        붓 동그라미 — 한 바퀴 조금 넘게 · 기울기
      mark('box', x0, y0, x1, y1)                   네 변을 따로 그은 네모 (모서리 살짝 넘김)
      mark('x', cx, cy, size)                       붓 두 획 X (살짝 휘고 길이가 다르다)
      mark('underline', x0, x1, y)                  살짝 휜 붓 밑줄
      mark('check', x, y, size)                     붓 두 획 체크
    끝은 대상 가장자리에서 멈추게 좌표를 준다(대상 한가운데를 찌르지 않는다)."""
    S = []
    if kind == 'arrow':                                       # 머리는 굵기에 비례 — 굵은 붓 몸통에 작은 머리면 뭉개져 보인다
        p0, tip = a; head = kw.get('head', max(64, w * 5.5) if kw.get('brush') else max(46, w * 3.8)); body = hand_curve(p0, tip, kw.get('bend', 0.25), kw.get('side', 1), kw.get('wob', 3), seed)
        if kw.get('brush'):
            S.append(dict(pts=body, brush=(4, w * 2))); S += [dict(pts=hand_curve(h[0], h[1], 0.05, 1, 1, seed + i + 2, 4), brush=(w * 2.2, 4)) for i, h in enumerate(_head(body, head))]
        else:
            S.append(dict(pts=body, pen=w)); S += [dict(pts=h, pen=w) for h in _head(body, head)]
    elif kind == 'circle':
        cx, cy, rx, ry = a; S.append(dict(pts=_ring(cx, cy, rx, ry, kw.get('rot', -8), kw.get('over', 0.22), seed + 2), brush=(3, w * 1.3)))
    elif kind == 'box':
        S += [dict(pts=s, pen=w * 0.6) for s in _box(*a, seed=seed + 4)]
    elif kind == 'x':
        cx, cy, size = a; h = size / 2
        S.append(dict(pts=hand_curve((cx - h * 0.95, cy - h), (cx + h * 1.05, cy + h * 0.9), 0.06, 1, 1.5, seed + 6, 5), brush=(4, w * 1.5)))
        S.append(dict(pts=hand_curve((cx + h * 0.9, cy - h * 1.05), (cx - h, cy + h), 0.07, -1, 1.5, seed + 7, 5), brush=(4, w * 1.5)))
    elif kind == 'underline':
        x0, x1, y = a; S.append(dict(pts=hand_curve((x0, y + 4), (x1, y - 6), 0.04, 1, 2, seed + 8, 6), brush=(4, w * 1.4)))
    elif kind == 'check':
        x, y, size = a
        S.append(dict(pts=hand_curve((x - size * 0.5, y - size * 0.05), (x - size * 0.12, y + size * 0.4), 0.05, -1, 1, seed + 9, 4), brush=(4, w * 1.4)))
        S.append(dict(pts=hand_curve((x - size * 0.12, y + size * 0.4), (x + size * 0.55, y - size * 0.5), 0.08, 1, 1.5, seed + 10, 5), brush=(w * 1.4, 4)))
    else:
        raise ValueError(f'mark: 모르는 종류 {kind}')
    return S


def _cut(pts, k):
    return pts if k >= 1 else pts[:max(2, int(len(pts) * k))]


def _taper(pts, w0, w1, n=None):
    """붓 획 외곽 다각형 — brush=(시작 굵기, 가운데 굵기) 이면 가운데 굵게 / (굵게, 가늘게) 면 빠지며 가늘게"""
    n = n or len(pts); L, R = [], []
    for i, (x, y) in enumerate(pts):
        a, b = pts[max(0, i - 1)], pts[min(len(pts) - 1, i + 1)]; tx, ty = b[0] - a[0], b[1] - a[1]; tl = math.hypot(tx, ty) or 1
        u = i / max(1, n - 1)
        w = (w0 + (w1 - w0) * math.sin(math.pi * u) ** 0.55) / 2 if w1 >= w0 else (w0 + (w1 - w0) * u) / 2
        L.append((x - ty / tl * w, y + tx / tl * w)); R.append((x + ty / tl * w, y - tx / tl * w))
    return L + R[::-1]


def _stroke_polys(s, k, halo):
    """한 획 → [(다각형 또는 선, 굵기)] (halo = 테두리 덧 굵기)"""
    p = _cut(s['pts'], k)
    if len(p) < 2: return []
    if 'pen' in s: return [('line', p, s['pen'] + halo)]
    w0, w1 = s['brush']; return [('poly', _taper(p, w0 + halo, w1 + halo, len(s['pts'])), 0)] if len(p) >= 3 else []


def draw_mark(d, strokes, k, col, halo=8, halo_col=WHITE):
    """획 목록을 k(0~1)만큼 차례로 그린다 — 획마다 순서대로 · 흰 테두리(halo)가 영상 위에서 띄운다"""
    if k <= 0: return
    n = len(strokes)
    for c, hw in (((halo_col, halo),) if halo > 0 and halo_col is not None else ()) + ((col, 0),):
        for i, s in enumerate(strokes):
            kk = cl(k * n - i)
            if kk <= 0: continue
            for typ, p, w in _stroke_polys(s, kk, hw):
                if typ == 'line':
                    d.line(p, fill=tuple(c) + (255,), width=int(w), joint='curve')
                    for x, y in (p[0], p[-1]): d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=tuple(c) + (255,))
                else:
                    d.polygon(p, fill=tuple(c) + (255,))


def mark_svg(strokes, col, halo=8, halo_col=WHITE, size=(1080, 1920), tag=''):
    """캔버스용 — 같은 획을 SVG 로 (아트보드 전체 크기 · position absolute). tag 는 data-mark 꼬리표(영상 코드가 읽을 값)"""
    hx = lambda c: '#%02x%02x%02x' % tuple(c[:3])
    out = [f'<svg data-mark="{tag}" style="position: absolute; left: 0px; top: 0px; width: {size[0]}px; height: {size[1]}px; pointer-events: none" viewBox="0 0 {size[0]} {size[1]}">']
    for c, hw in (((halo_col, halo),) if halo > 0 and halo_col is not None else ()) + ((col, 0),):
        for s in strokes:
            for typ, p, w in _stroke_polys(s, 1, hw):
                pts = ' '.join(f'{x:.1f},{y:.1f}' for x, y in p)
                out.append(f'<polyline points="{pts}" fill="none" stroke="{hx(c)}" stroke-width="{w:.1f}" stroke-linecap="round" stroke-linejoin="round"/>'
                           if typ == 'line' else f'<polygon points="{pts}" fill="{hx(c)}"/>')
    return '\n'.join(out + ['</svg>'])


def finger(d, fx, fy, k, tap=0.0, col=(255, 214, 107), ink=(40, 32, 26), s=1.0):
    """손가락 포인터 — 손가락 끝(fx, fy) · k 0~1 들어옴 · tap 0~1 «톡» 표시 세 줄"""
    if k <= 0: return
    oy = (1 - k) * 120 * s; ox = (1 - k) * 60 * s
    X = lambda x: fx - 52 * s + x * s + ox; Y = lambda y: fy - 4 * s + y * s + oy
    shapes = [(24, 70, 112, 144, 26), (96, 66, 112, 96, 8), (80, 58, 100, 94, 10), (62, 52, 84, 92, 11), (40, 4, 64, 86, 12)]
    thumb = [(44, 108), (30, 112), (12, 104), (8, 94), (14, 86), (26, 86), (36, 92), (46, 98)]
    for pass_ in (0, 1):
        fill = WHITE + (255,) if pass_ == 0 else tuple(col) + (255,); out = WHITE + (255,) if pass_ == 0 else tuple(ink) + (255,)
        wid = int(16 * s) if pass_ == 0 else int(5 * s)
        d.polygon([(X(x), Y(y)) for x, y in thumb], fill=fill, outline=out, width=wid)
        for x0, y0, x1, y1, r in shapes: d.rounded_rectangle([X(x0), Y(y0), X(x1), Y(y1)], r * s, fill=fill, outline=out, width=wid)
    if tap > 0:
        L = 24 * s * math.sin(math.pi * min(1, tap))
        for ax, ay, bx, by in ((52, -10, 52, -10 - L), (30, -4, 30 - L * 0.7, -4 - L * 0.7), (74, -4, 74 + L * 0.7, -4 - L * 0.7)):
            for c2, ww in ((WHITE + (255,), int(13 * s)), (tuple(ink) + (255,), int(6 * s))):
                d.line([(X(ax), Y(ay)), (X(ax) + (bx - ax) * s, Y(ay) + (by - ay) * s)], fill=c2, width=ww)


def bold_arrow(p0, c, tip, cols, w_tail=20, w_body=58, head_w=150, head_len=120, seed=1, ink=(40, 32, 26), S=2):
    """질감 덩어리 화살표 (강조용 스티커) — 몸통+머리 한 실루엣 · 크레용 결 · 흰+진한 이중 테두리
    반환 (RGBA 그림, 왼위 좌표) → bold_reveal 로 꼬리→머리 차오르게 · 캔버스엔 PNG 로 저장해 <img> 로"""
    import random
    rnd = random.Random(seed); N = 300; pts = [_quad(p0, c, tip, i / N) for i in range(N + 1)]
    sg = [math.dist(pts[i], pts[i + 1]) for i in range(N)]; Lt = sum(sg); acc = [0]
    for s_ in sg: acc.append(acc[-1] + s_)
    hb = next(i for i in range(N + 1) if acc[i] >= Lt - head_len)

    def nrm(i):
        a_, b_ = pts[max(0, i - 2)], pts[min(N, i + 2)]; tx, ty = b_[0] - a_[0], b_[1] - a_[1]; l_ = math.hypot(tx, ty) or 1
        return -ty / l_, tx / l_
    left, right = [], []
    for i in range(0, hb + 1, 3):
        u = acc[i] / acc[hb]; w = (w_tail + (w_body - w_tail) * u ** 0.75) / 2 + rnd.uniform(-1.2, 1.2)
        nx, ny = nrm(i); x, y = pts[i]; left.append((x + nx * w, y + ny * w)); right.append((x - nx * w, y - ny * w))
    nx, ny = nrm(hb); bx, by = pts[hb]; tx, ty = tip[0] - bx, tip[1] - by; tl = math.hypot(tx, ty); tx, ty = tx / tl, ty / tl; bk = 18
    wl = (bx + nx * head_w / 2 - tx * bk, by + ny * head_w / 2 - ty * bk); wr = (bx - nx * head_w / 2 * 0.94 - tx * bk * 1.1, by - ny * head_w / 2 * 0.94 - ty * bk * 1.1)
    nx0, ny0 = nrm(0); x0, y0 = pts[0]; r0 = w_tail / 2; ang0 = math.atan2(ny0, nx0)
    tail = [(x0 + r0 * math.cos(ang0 + math.pi * k / 8), y0 + r0 * math.sin(ang0 + math.pi * k / 8)) for k in range(1, 8)]
    poly = left + [wl, tip, wr] + right[::-1] + tail; pad = 40
    xs = [p[0] for p in poly]; ys = [p[1] for p in poly]
    ox, oy = int(min(xs)) - pad, int(min(ys)) - pad; W, H = int(max(xs) - ox) + pad, int(max(ys) - oy) + pad
    m = Image.new('L', (W * S, H * S), 0); ImageDraw.Draw(m).polygon([((x - ox) * S, (y - oy) * S) for x, y in poly], fill=255)
    m = m.filter(ImageFilter.GaussianBlur(1.5 * S)).point(lambda v: 255 if v > 128 else 0)
    yy, xx = np.mgrid[0:H * S, 0:W * S].astype(np.float32)
    px, py = (np.array([p[0] for p in pts]) - ox) * S, (np.array([p[1] for p in pts]) - oy) * S
    vx, vy = px[-1] - px[0], py[-1] - py[0]; vl2 = vx * vx + vy * vy
    u = np.clip(((xx - px[0]) * vx + (yy - py[0]) * vy) / vl2, 0, 1)
    cs = np.array(cols, np.float32); n = len(cs) - 1
    k_ = np.minimum((u * n).astype(int), n - 1); f = (u * n - k_)[..., None]
    img = Image.fromarray((cs[k_] * (1 - f) + cs[k_ + 1] * f).astype(np.uint8), 'RGB')
    lay = Image.new('RGBA', img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay); rr = np.random.default_rng(seed)
    for _ in range(int(W * H / 9)):                                       # 크레용 결 — 짧은 사선 획
        x, y = rr.uniform(0, W * S), rr.uniform(0, H * S); a_ = math.radians(-38 + rr.normal(0, 7)); ln = rr.uniform(6, 22) * S
        cc = (255, 255, 255, int(rr.uniform(25, 70))) if rr.random() < 0.55 else (0, 0, 0, int(rr.uniform(15, 45)))
        d.line([(x, y), (x + ln * math.cos(a_), y + ln * math.sin(a_))], fill=cc, width=max(1, int(rr.uniform(1, 2.6) * S)))
    img = Image.alpha_composite(img.convert('RGBA'), lay)
    g = rr.normal(0, 10, (H * S, W * S)).clip(-30, 30)
    ar = np.asarray(img).astype(np.float32); ar[..., :3] = np.clip(ar[..., :3] + g[..., None], 0, 255); img = Image.fromarray(ar.astype(np.uint8), 'RGBA')
    white = m.filter(ImageFilter.MaxFilter(2 * int(7 * S) + 1)); dark = white.filter(ImageFilter.MaxFilter(2 * int(4 * S) + 1))
    out = Image.new('RGBA', img.size, (0, 0, 0, 0)); sh = Image.new('RGBA', img.size, (0, 0, 0, 0)); sh.paste((0, 0, 0, 70), (0, 0), dark)
    sh = sh.transform(sh.size, Image.AFFINE, (1, 0, -6 * S, 0, 1, -8 * S)).filter(ImageFilter.GaussianBlur(3 * S)); out.alpha_composite(sh)
    out.paste(tuple(ink) + (255,), (0, 0), dark); out.paste(WHITE + (255,), (0, 0), white); img.putalpha(m); out.alpha_composite(img)
    return out.resize((W, H), Image.LANCZOS), (ox, oy)


def bold_reveal(canvas, png, origin, start, tip, k, pop=0.0):
    """질감 화살표가 꼬리 → 머리로 차오른다 (k 0~1 · pop = 다 찬 뒤 «툭» 크기)"""
    if k <= 0: return
    W, H = png.size; ox, oy = origin
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32); vx, vy = tip[0] - start[0], tip[1] - start[1]; vl2 = vx * vx + vy * vy
    u = ((xx + ox - start[0]) * vx + (yy + oy - start[1]) * vy) / vl2; edge = 0.06
    a = np.asarray(png).copy(); a[..., 3] = (a[..., 3].astype(np.float32) * np.clip((k * (1 + edge) - u) / edge, 0, 1)).astype(np.uint8)
    im = Image.fromarray(a, 'RGBA')
    if pop > 0:
        s = 1 + pop; im = im.resize((int(W * s), int(H * s)), Image.BILINEAR); ox -= int(W * (s - 1) / 2); oy -= int(H * (s - 1) / 2)
    canvas.alpha_composite(im, (int(ox), int(oy)))


def mark_from_tag(tag):
    """캔버스 <svg data-mark="arrow 900,1500 640,1000 w=12 seed=1 brush"> 꼬리표 → mark() 획 목록 (영상에서 같은 모양으로 그려지며)"""
    t = tag.split(); kind = t[0]; pos = [v for v in t[1:] if '=' not in v and v != 'brush']
    kw = {k: float(v) for k, v in (x.split('=') for x in t[1:] if '=' in x)}
    w, seed = kw.get('w', 12), int(kw.get('seed', 1)); pt = lambda s: tuple(float(v) for v in s.split(','))
    if kind == 'arrow': args = (pt(pos[0]), pt(pos[1]))
    elif kind in ('circle', 'box'): args = pt(pos[0]) + pt(pos[1])
    else: args = pt(pos[0]) + (float(pos[1]),)
    return mark(kind, *args, w=w, seed=seed, **({'brush': True} if 'brush' in t else {}))
