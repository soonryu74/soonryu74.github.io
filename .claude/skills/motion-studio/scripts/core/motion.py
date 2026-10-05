"""오브젝트 애니 보강 — appear.py 에 없는 등장 · 퇴장 · 머무는 동안 · 강조 (등급 β · 실사용 뒤 ✓).

등장 (k 0→1)
  blur_in(img, e, k)            흐림에서 또렷하게
  spin_in(img, e, k, deg=180)   돌며 커져 제자리
  flip_in(img, e, k)            옆으로 뒤집혀 나오기 (카드)
퇴장 (k 0→1 = 사라짐 진행)
  burst_out(img, e, k)          커지며 터지듯 사라짐 + 조각 몇 개
  scatter_out(img, e, k, n=4)   조각으로 흩어지며 사라짐
머무는 동안 (lt = 장면 안 시각) — 값만 돌려준다 → put(img, e, s=…, off=…, alpha=…)
  float_(lt, amp=10, period=2.4)   → (dx, dy) 둥실
  breathe(lt, amt=0.03, period=2)  → 배율 (숨쉬기)
  blink(lt, period=1.2)            → 투명도 (깜빡임)
  pulse(lt, t0, amt=0.12)          → 배율 (t0 에 한 번 «툭» 커졌다 돌아오기 · 맥박)
강조
  underline(img, e, k, col)      글자 아래 선이 왼쪽부터 그어짐
  highlight(img, e, k, col)      형광펜 — ★요소를 그리기 «전에» 부른다(글자 뒤에 칠해지게)
  put(img, e, s=1, alpha=1, off=(0,0), rot=0)   요소를 배율 · 투명도 · 기울기로 한 번 붙이기 (위 값들과 같이)
"""
import math

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from .canvas import layer, box_h
from .ease import cl, eo, eio, back


def put(img, e, s=1.0, alpha=1.0, off=(0, 0), rot=0.0, sx=None):
    """캐시된 요소 조각을 배율(s · 가로만 sx) · 투명도 · 기울기로 붙인다 — 가운데 기준"""
    if alpha <= 0 or s <= 0: return img
    lay, x, y = layer(e); w, h = lay.size; cx, cy = x + w / 2 + off[0], y + h / 2 + off[1]
    nw, nh = max(1, int(w * (sx if sx is not None else s))), max(1, int(h * s))
    if (nw, nh) != (w, h): lay = lay.resize((nw, nh), Image.BICUBIC)
    if rot: lay = lay.rotate(-rot, resample=Image.BICUBIC, expand=True)
    if alpha < 1: lay = lay.copy(); lay.putalpha(lay.getchannel('A').point(lambda v: int(v * alpha)))
    img.paste(lay, (int(round(cx - lay.width / 2)), int(round(cy - lay.height / 2))), lay)
    return img


def blur_in(img, e, k, amt=22):
    k = cl(k)
    if k <= 0: return img
    if k >= 1: return put(img, e)
    lay, x, y = layer(e); b = lay.filter(ImageFilter.GaussianBlur(amt * (1 - eo(k))))
    b.putalpha(b.getchannel('A').point(lambda v: int(v * min(1, k * 1.6))))
    img.paste(b, (x, y), b); return img


def spin_in(img, e, k, deg=180):
    k = cl(k)
    if k <= 0: return img
    return put(img, e, s=max(0.01, back(k)), alpha=min(1, k * 2.5), rot=deg * (1 - eo(k)))


def flip_in(img, e, k):
    k = cl(k)
    if k <= 0: return img
    return put(img, e, sx=max(0.01, abs(math.sin(math.pi / 2 * eo(k)))), alpha=min(1, k * 3))


def burst_out(img, e, k, n=10, seed=1):
    k = cl(k)
    if k >= 1: return img
    put(img, e, s=1 + 0.35 * eo(k), alpha=1 - eio(k))
    lay, x, y = layer(e); w, h = lay.size; cx, cy = x + w / 2, y + h / 2
    col = lay.convert('RGB').resize((1, 1)).getpixel((0, 0)); rng = np.random.default_rng(seed); d = ImageDraw.Draw(img)
    for i in range(n):
        ang = rng.uniform(0, 2 * math.pi); dist = (0.6 + rng.uniform(0, 0.6)) * max(w, h) * eo(k); r = (1 - k) * rng.uniform(6, 16)
        px, py = cx + math.cos(ang) * dist, cy + math.sin(ang) * dist
        if r > 0.5: d.ellipse([px - r, py - r, px + r, py + r], fill=col)
    return img


def scatter_out(img, e, k, n=4, seed=2):
    k = cl(k)
    if k >= 1: return img
    if k <= 0: return put(img, e)
    lay, x, y = layer(e); w, h = lay.size; rng = np.random.default_rng(seed); tw, th = math.ceil(w / n), math.ceil(h / max(1, n // 2))
    for r in range(max(1, n // 2)):
        for c in range(n):
            box = (c * tw, r * th, min(w, (c + 1) * tw), min(h, (r + 1) * th))
            if box[2] <= box[0] or box[3] <= box[1]: continue
            p = lay.crop(box); ang = rng.uniform(0, 2 * math.pi); dist = rng.uniform(120, 360) * eo(k)
            p = p.rotate(rng.uniform(-90, 90) * k, expand=True, resample=Image.BICUBIC)
            p.putalpha(p.getchannel('A').point(lambda v: int(v * (1 - k))))
            img.paste(p, (int(x + box[0] + math.cos(ang) * dist), int(y + box[1] + math.sin(ang) * dist + 200 * k * k)), p)
    return img


def float_(lt, amp=10, period=2.4, phase=0.0):
    a = 2 * math.pi * lt / period + phase; return (amp * 0.4 * math.sin(a * 0.5), amp * math.sin(a))


def breathe(lt, amt=0.03, period=2.0, phase=0.0):
    return 1 + amt * math.sin(2 * math.pi * lt / period + phase)


def blink(lt, period=1.2, low=0.25):
    return low + (1 - low) * (0.5 + 0.5 * math.cos(2 * math.pi * lt / period))


def pulse(lt, t0, amt=0.12, dur=0.35):
    u = (lt - t0) / dur
    return 1 + amt * math.sin(math.pi * u) if 0 < u < 1 else 1.0


def underline(img, e, k, col=(255, 207, 74), width=10, pad=6):
    k = eio(cl(k))
    if k <= 0: return img
    x, y, w = e['x'], e['y'] + box_h(e) + pad, e['w']
    ImageDraw.Draw(img).line([(x, y), (x + w * k, y)], fill=col, width=width); return img


def highlight(img, e, k, col=(255, 230, 80), alpha=0.55, pad=8):
    k = eio(cl(k))
    if k <= 0: return img
    x, y, w, h = e['x'] - pad, e['y'] + box_h(e) * 0.35, e['w'] + pad * 2, box_h(e) * 0.6
    o = Image.new('RGBA', img.size, (0, 0, 0, 0)); ImageDraw.Draw(o).rounded_rectangle([x, y, x + w * k, y + h], 8, fill=col + (int(255 * alpha),))
    base = img.convert('RGBA'); base.alpha_composite(o); img.paste(base.convert(img.mode)); return img
