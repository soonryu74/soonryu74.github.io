"""캔버스 손 선 — 캔버스(브라우저)에서도 손으로 그은 선으로 보이게 SVG 경로 자체를 바꾼다.

`data-hand` 꼬리표만 달면 엔진이 구울 때만 손맛이 입혀지고, 캔버스에는 매끈한 벡터 선이 보인다(캔버스 = 영상 마지막 화면이 깨진다).
그래서 캔버스에 올리기 전에 선 모양을 손 선으로 바꾸고, 결(연필 · 크레용)은 SVG 필터로 보이게 한다. 엔진은 같은 data-hand 로 비슷한 결을 입힌다.

  board(path)              아트보드 파일의 `<svg data-hand="…">` 를 손 선으로 (제자리 고침 · 이미 바꾼 svg 는 건너뜀 — data-handline)
  handify(inner, amp, seed) svg 속 모양들만 손 선으로 (나머지 마크업 · g · defs 는 그대로)
  python3 <스킬>/scripts/handline.py canvas_src/project/*.dc.html     (여러 파일)

바꾸는 것: 중심선을 따라 낮은 출렁임 · 열린 선은 끝을 살짝 지나쳐 긋기 · 닫힌 모양은 한 바퀴를 조금 지나쳐 겹쳐 끝남 ·
  굵은 외곽선(굵기 6 이상)은 가늘고 옅은 선을 한 번 더 덧긋기(연필) · 작은 점(눈 등)은 살짝 찌그러진 덩어리 · rect · line · polygon 도 경로로
결 필터: data-hand 가 pencil · crayon · marker 면 그 결 · pen · brush 는 필터 없이 선 모양만
"""
import math
import re
import sys
import zlib

import numpy as np

from . import svgline as SL

FILTERS = {
    'pencil': '<filter id="hl-pencil" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n"/>'
              '<feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="d"/>'
              '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.75" result="g"/><feComposite in="d" in2="g" operator="in"/></filter>',
    'crayon': '<filter id="hl-crayon" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency="0.28 1.1" numOctaves="2" seed="7" result="n"/>'
              '<feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" xChannelSelector="R" yChannelSelector="G" result="d"/>'
              '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.6 1.95" result="g"/><feComposite in="d" in2="g" operator="in"/></filter>',
    'marker': '<filter id="hl-marker" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="5" result="n"/>'
              '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.9 1.25" result="g"/><feComposite in="SourceGraphic" in2="g" operator="in"/></filter>',
}
AMP = {'pen': 1.8, 'brush': 2.0, 'pencil': 2.3, 'crayon': 2.3, 'marker': 1.6}     # 흔들림 폭(화면 px)


def _noise(n, rng, L, lam):
    s = np.linspace(0, L, n); o = np.zeros(n)
    for k in range(3):
        f = (k + 1) / lam * rng.uniform(0.7, 1.3); o += 0.6 ** k * np.sin(2 * math.pi * f * s + rng.uniform(0, 6.28))
    return o / 1.96


def _resample(P, step):
    P = np.array(P, float); d = np.r_[0, np.cumsum(np.hypot(*np.diff(P, axis=0).T))]
    if d[-1] <= 0: return P, 0
    n = max(3, int(d[-1] / step) + 1); s = np.linspace(0, d[-1], n)
    return np.stack([np.interp(s, d, P[:, 0]), np.interp(s, d, P[:, 1])], 1), d[-1]


def _bez(Q):
    """점들 → 부드러운 곡선 (Catmull-Rom → C)"""
    out = f'M{Q[0][0]:.1f} {Q[0][1]:.1f}'
    for i in range(len(Q) - 1):
        p0 = Q[i - 1] if i > 0 else Q[i]; p1, p2 = Q[i], Q[i + 1]; p3 = Q[i + 2] if i + 2 < len(Q) else Q[i + 1]
        c1 = p1 + (p2 - p0) / 6; c2 = p2 - (p3 - p1) / 6
        out += f' C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}'
    return out


def hand_d(d, amp=1.6, seed=0, over=0.07, step=7):
    """path d → 손 선 d (하위 경로마다)"""
    out = []
    for k, (pts, closed) in enumerate(SL._path_pts(d)):
        rng = np.random.default_rng(seed * 97 + k)
        P = list(pts)
        if closed:
            P = P + [P[0]]; Pa, L = _resample(P, step)
            m = max(2, int(len(Pa) * over)); Pa = np.vstack([Pa, Pa[1:m + 1]])        # 한 바퀴를 조금 지나쳐 겹쳐 끝남
        else:
            Pa, L = _resample(P, step)
        if L <= 0: continue
        n = len(Pa); T = np.gradient(Pa, axis=0); T /= np.linalg.norm(T, axis=1, keepdims=True) + 1e-9; N = np.stack([-T[:, 1], T[:, 0]], 1)
        w = amp * _noise(n, rng, L * (1 + (over if closed else 0)), max(60, L / 3))
        if closed: w = w + np.linspace(0, 1, n) ** 3 * amp * 1.8                     # 끝이 살짝 바깥으로 빠짐
        Q = Pa + N * w[:, None]
        if not closed:                                                                  # 끝을 조금 지나쳐 긋는다
            e = min(6.0, L * 0.04); Q = np.vstack([Q[0] - T[0] * e * rng.uniform(0.2, 1), Q, Q[-1] + T[-1] * e * rng.uniform(0.3, 1)])
        if len(Q) > 60: Q = Q[::max(1, len(Q) // 60)]
        out.append(_bez(Q))
    return ' '.join(out)


def _blob(cx, cy, rx, ry, seed, amp=0.9):
    rng = np.random.default_rng(seed); n = 14; a = np.linspace(0, 2 * math.pi, n, endpoint=False)
    r = 1 + amp / max(rx, 1) * rng.uniform(-1, 1, n) * 1.2
    Q = np.stack([cx + rx * r * np.cos(a), cy + ry * r * np.sin(a)], 1); Q = np.vstack([Q, Q[:3]])
    return _bez(Q) + ' Z'


_ATTR = re.compile(r'([\w:-]+)="([^"]*)"')
_SHAPE = re.compile(r'<(path|circle|ellipse|rect|line|polyline|polygon)\b([^>]*?)/?>(?:\s*</\1>)?', re.S)


def _f(v, d=0.0):
    try: return float(re.match(r'-?[\d.]+', str(v)).group(0))
    except Exception: return d


def handify(inner, amp=1.6, seed=0, sketch=True, filt=None):
    """svg 속 모양들을 손 선으로 — 제자리에서 바꾼다(g · defs 등 나머지는 그대로). filt = 붙일 필터 id"""
    defs = []
    inner = re.sub(r'<defs\b.*?</defs>', lambda m: defs.append(m.group(0)) or f'\x00{len(defs) - 1}\x00', inner, flags=re.S)
    cnt = [0]

    def one(m):
        tag, raw = m.group(1), m.group(2); a = dict(_ATTR.findall(raw)); cnt[0] += 1; sd = seed * 1000 + cnt[0]
        stroke = a.get('stroke'); has_stroke = stroke not in (None, 'none')
        if tag in ('circle', 'ellipse'):
            rx = _f(a.get('r', a.get('rx', 0))); ry = _f(a.get('r', a.get('ry', rx)))
            d0 = SL_ellipse_d(_f(a.get('cx')), _f(a.get('cy')), rx, ry)
            d = _blob(_f(a.get('cx')), _f(a.get('cy')), rx, ry, sd, amp * 0.6) if rx < 12 and not has_stroke else hand_d(d0, amp, sd)
            for k in ('cx', 'cy', 'r', 'rx', 'ry'): a.pop(k, None)
        else:
            if tag == 'rect':
                x, y, w, h = (_f(a.pop(k, 0)) for k in ('x', 'y', 'width', 'height')); a.pop('rx', None); a.pop('ry', None)
                d0 = f'M{x} {y} L{x + w} {y} L{x + w} {y + h} L{x} {y + h} Z'
            elif tag == 'line':
                d0 = f"M{a.pop('x1', 0)} {a.pop('y1', 0)} L{a.pop('x2', 0)} {a.pop('y2', 0)}"
            elif tag in ('polyline', 'polygon'):
                v = a.pop('points', '').replace(',', ' ').split()
                d0 = 'M' + ' L'.join(f'{v[j]} {v[j + 1]}' for j in range(0, len(v) - 1, 2)) + (' Z' if tag == 'polygon' else '')
            else: d0 = a.get('d', '')
            d = hand_d(d0, amp, sd)
        if not d: return m.group(0)
        a['d'] = d
        if has_stroke: a['stroke-linecap'] = 'round'; a['stroke-linejoin'] = 'round'
        if filt: a['filter'] = f'url(#{filt})'
        out = '<path ' + ' '.join(f'{k}="{v}"' for k, v in a.items()) + '/>'
        sw = _f(a.get('stroke-width', 0))
        if sketch and sw >= 6 and has_stroke:                    # 연필 덧긋기 — 가늘고 옅게 · 살짝 어긋나게
            b = dict(a); b['d'] = hand_d(d0, amp * 1.3, sd + 555, over=0.03)
            b['fill'] = 'none'; b['stroke-width'] = f'{sw * 0.38:.1f}'; b['opacity'] = '0.55'
            if b.get('data-t'):
                t = SL.span(b['data-t'])
                if t: b['data-t'] = f'{t[0] + 0.1:.2f}-{t[1] + 0.1:.2f}'
            out += '<path ' + ' '.join(f'{k}="{v}"' for k, v in b.items()) + '/>'
        return out
    inner = _SHAPE.sub(one, inner)
    return re.sub(r'\x00(\d+)\x00', lambda m: defs[int(m.group(1))], inner)


def SL_ellipse_d(cx, cy, rx, ry):
    return f'M{cx + rx} {cy} A{rx} {ry} 0 1 1 {cx - rx} {cy} A{rx} {ry} 0 1 1 {cx + rx} {cy} Z'


_SVG = re.compile(r'<svg\b([^>]*)>(.*?)</svg>', re.S)


def svg_tag(attrs, inner, idx=0):
    """<svg …> 하나 → 손 선 판 (data-hand 가 있고 아직 안 바꾼 것만)"""
    a = dict(_ATTR.findall(attrs))
    hand = a.get('data-hand')
    if not hand or a.get('data-handline'): return None
    st = a.get('style', ''); w = _f(re.search(r'width:\s*([\d.]+)', st).group(1)) if re.search(r'width:\s*([\d.]+)', st) else 0
    vb = [float(v) for v in re.findall(r'-?[\d.]+', a.get('viewBox', a.get('viewbox', '')))]
    scale = (w / vb[2]) if (w and len(vb) == 4 and vb[2]) else 1.0                  # viewBox 단위 → 화면 px
    amp = AMP.get(hand, 1.8) / max(scale, 1e-6)
    filt = f'hl-{hand}' if hand in FILTERS else None
    body = handify(inner, amp=amp, seed=idx + 1, filt=filt)
    if filt: body = f'<defs>{FILTERS[hand]}</defs>' + body
    attrs = attrs.rstrip()
    if 'overflow' not in st: attrs = re.sub(r'style="([^"]*)"', lambda m: f'style="{m.group(1).rstrip("; ")}; overflow: visible;"', attrs, count=1)
    return f'<svg{attrs} data-handline="1">{body}</svg>'


def board(path):
    """아트보드 파일 하나를 제자리에서 고친다 → 바꾼 svg 개수"""
    src = open(path, encoding='utf-8').read(); n = [0]

    def rep(m):
        r = svg_tag(m.group(1), m.group(2), n[0] + zlib.crc32(m.group(2).encode()) % 997)
        if r is None: return m.group(0)
        n[0] += 1; return r
    out = _SVG.sub(rep, src)
    if n[0]: open(path, 'w', encoding='utf-8').write(out)
    return n[0]


if __name__ == '__main__':
    for p in sys.argv[1:]:
        print(f'{p}: 손 선으로 바꾼 svg {board(p)}개')
