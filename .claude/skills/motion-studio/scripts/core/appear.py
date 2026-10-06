"""요소 하나를 시간에 따라 그리기 — 캔버스 요소(canvas.layer)를 움직인다.

원칙: k = 1 (다 나온 순간)이면 아트보드와 똑같은 자리 · 크기 · 모습이다 (바닥 3).
k 는 0~1 진행 (ease 는 여기서 건다). 장면 코드가 seg(t, 시작, 끝)으로 k 를 만든다.

  put(img, e, k, how='fade', **opt)     요소 하나 · how 아래 표 · off=(dx, dy) 밀어 두기
  out(img, e, k, how='fade', **opt)     사라지기 (put 의 거꾸로)
  type_text(img, e, k, cps=None)        글자를 한 자씩 (커서 없음)
  lines(img, e, k, stag=0.25)           글자를 줄마다 차례로 올라오게

how:
  fade    나타나기
  up / down / left / right   그 방향에서 미끄러져 들어오기 (dist = 거리 px, 기본 요소 크기 쪽)
  pop     작게 → 살짝 넘쳤다 제자리 (튕김)
  zoom    크게 → 제자리로 내려앉기 (센 등장 · 자주 쓰면 뻔해진다 — 강조는 카메라 · 효과 사전에도 있다)
  wipe    왼쪽부터 드러나기 (dir='left'|'right'|'up'|'down')
  none    k>0 이면 그대로

여기 없는 움직임이 내용에 맞으면 → 장면 코드에서 새로 짜서 쓰고, 좋으면 여기에 보탠다.
"""
import math

from PIL import Image, ImageDraw

from .canvas import layer, text_lines, font, tlen, line_h, box_h
from .ease import cl, eo, eio, back


def _paste(img, lay, x, y, alpha=1.0):
    if alpha <= 0: return
    if alpha < 1:
        a = lay.getchannel('A').point(lambda v: int(v * alpha)); lay = lay.copy(); lay.putalpha(a)
    img.paste(lay, (int(round(x)), int(round(y))), lay)


def _scaled(lay, x, y, s):
    """가운데 기준으로 s 배"""
    if abs(s - 1) < 1e-3: return lay, x, y
    w, h = lay.size; nw, nh = max(1, int(w * s)), max(1, int(h * s))
    return lay.resize((nw, nh), Image.BICUBIC), x + (w - nw) / 2, y + (h - nh) / 2


def put(img, e, k, how='fade', dist=None, ease=None, fade=True, dir='left', off=(0, 0)):
    """요소 e 를 진행 k(0~1)로 그린다 → img (제자리에 붙인다) · off = (dx, dy) 밀어 두기 (camera.parallax 깊이 층 등)"""
    k = cl(k)
    if k <= 0: return img
    lay, x, y = layer(e); w, h = lay.size; x += off[0]; y += off[1]
    if how == 'none':
        _paste(img, lay, x, y); return img
    if how == 'fade':
        _paste(img, lay, x, y, (ease or eo)(k)); return img
    if how in ('up', 'down', 'left', 'right'):
        u = (ease or eo)(k)
        d = dist if dist is not None else (min(h, 160) if how in ('up', 'down') else min(w, 240))
        dx = {'left': -d, 'right': d}.get(how, 0) * (1 - u); dy = {'up': d, 'down': -d}.get(how, 0) * (1 - u)
        _paste(img, lay, x + dx, y + dy, min(1, k * 2.2) if fade else 1); return img
    if how == 'pop':
        s = max(0.01, (ease or back)(k)); l2, x2, y2 = _scaled(lay, x, y, s)
        _paste(img, l2, x2, y2, min(1, k * 3)); return img
    if how == 'zoom':
        u = (ease or eo)(k); s = 1 + 0.6 * (1 - u); l2, x2, y2 = _scaled(lay, x, y, s)
        _paste(img, l2, x2, y2, min(1, k * 2.5)); return img
    if how == 'wipe':
        u = (ease or eio)(k)
        if dir in ('left', 'right'):
            cw = max(1, int(w * u)); box = (0, 0, cw, h) if dir == 'left' else (w - cw, 0, w, h)
        else:
            ch = max(1, int(h * u)); box = (0, 0, w, ch) if dir == 'up' else (0, h - ch, w, h)
        _paste(img, lay.crop(box), x + box[0], y + box[1]); return img
    raise ValueError(f'모르는 등장: {how}')


def out(img, e, k, how='fade', **opt):
    """사라지기 — k 0 = 그대로 · 1 = 사라짐"""
    return put(img, e, 1 - cl(k), how, **opt)


def _split(e):
    """(바탕 조각 | None, 글자 조각) — 글자 효과(그림자 · 테두리 · 그라데이션 · 간격)는 글자 조각에 그대로 있다"""
    if '_split' not in e:
        bare = None
        if e['bg'] or e['bw'] or e.get('shadow'):
            bare = layer({k: v for k, v in e.items() if k != '_layer'} | {'text': '', 'h': box_h(e)})
        txt = layer({k: v for k, v in e.items() if k != '_layer'} | {'bg': None, 'bw': 0, 'shadow': []})
        e['_split'] = (bare, txt)
    return e['_split']


def _bands(e, ty, th):
    """줄마다 글자 조각의 세로 구간 [(위, 아래)] (조각 좌표) — 그림자 몫까지 이웃 줄과 겹치지 않게 나눈다"""
    lh = line_h(e); n = len(text_lines(e)); top = e['y'] + e.get('pad', (0, 0, 0, 0))[1] - ty
    cuts = [0] + [int(round(top + i * lh)) for i in range(1, n)] + [th]
    return list(zip(cuts[:-1], cuts[1:]))


def type_text(img, e, k):
    """글자를 한 자씩 (줄 순서대로) — 바탕 도형이 있으면 먼저 그대로 깐다 · 글자 효과도 그대로"""
    k = cl(k)
    if k <= 0: return img
    if e.get('rot') or e.get('scale', 1) != 1: return put(img, e, k, 'wipe')   # 기운 요소는 닦아 내기로
    bare, (lay, lx, ly) = _split(e)
    if bare: _paste(img, *bare)
    ls = text_lines(e); total = sum(len(s) for s, *_ in ls); n = int(round(total * k)); f = font(e); sp = e.get('ls', 0)
    for (s, x, base, anc), (t0, t1) in zip(ls, _bands(e, ly, lay.height)):
        if n <= 0: break
        if n >= len(s): cw = lay.width   # 다 나온 줄
        else:
            full = tlen(f, s, sp); x0 = x if anc == 'ls' else x - full / 2 if anc == 'ms' else x - full
            cw = int(round(x0 + tlen(f, s[:n], sp) - lx))
        n -= len(s)
        if cw > 0 and t1 > t0: _paste(img, lay.crop((0, t0, cw, t1)), lx, ly + t0)
    return img


def lines(img, e, k, stag=0.25, rise=40):
    """글자를 줄마다 차례로 올라오게 (stag = 줄 사이 간격, 진행 비율) · 글자 효과도 그대로"""
    k = cl(k)
    if k <= 0: return img
    if e.get('rot') or e.get('scale', 1) != 1: return put(img, e, k, 'up')
    bare, (lay, lx, ly) = _split(e)
    if bare: _paste(img, *bare)
    bands = _bands(e, ly, lay.height); n = len(bands); span = 1 + stag * (n - 1)
    for i, (t0, t1) in enumerate(bands):
        u = cl(k * span - i * stag)
        if u <= 0 or t1 <= t0: continue
        _paste(img, lay.crop((0, t0, lay.width, t1)), lx, ly + t0 + rise * (1 - eo(u)), eo(u))
    return img
