"""캔버스 SVG → 선 · 면 그리기 (선이 중심인 스타일의 밑작업 + 손맛).

캔버스(Claude Design)는 인라인 <svg> 를 그대로 남기고, 유저가 옮기거나 크기를 바꾸면 바깥 상자(left · top · width · height)만 바뀐다.
그래서 viewBox → 상자 대응은 브라우저 기본값(preserveAspectRatio = xMidYMid meet: 비율 유지 · 가운데)대로 맞추고, 선 굵기도 같은 배율로.

  shapes(e)                                  요소의 SVG 모양들 (요소 상자 안 px 좌표)
  render(e, W, H, o=0, k=1, stagger=0.6,     RGBA (W+2o)×(H+2o) — k 0→1: 획이 차례로 «선이 그려지고 → 면이 채워진다»
         hand=None, t=None, fill_in=None)     hand = 손맛(None = 캔버스와 똑같이) · t = 장면 시각(떨림용) · fill_in = 면 채우는 법

읽는 것: path(M L H V C S Q T A Z · 절대/상대) · circle · ellipse · rect(rx · ry) · line · polyline · polygon ·
  g(묶음 — 속성 · 변형 · 투명도를 물려준다) · stroke · stroke-width · stroke-linecap · stroke-linejoin · stroke-miterlimit ·
  stroke-dasharray · stroke-dashoffset · stroke-opacity · fill · fill-opacity · fill-rule(nonzero · evenodd 구멍) · opacity ·
  transform(matrix · translate · scale · rotate · skewX · skewY) · style="…" 속 같은 속성 · 색 이름 · currentColor · preserveAspectRatio none
읽지 않는 것: 글자 · 그라데이션 · 패턴 · 마스크 · 클립 · 마커 · use (defs 안 것은 그리지 않는다)

손맛 (hand) — 캔버스와 같은 자리 · 같은 평균 굵기로, 결만 손으로 그은 것처럼
  HAND 의 이름 하나('pen' · 'brush' · 'pencil' · 'crayon' · 'marker') 또는 {'base': 'pen', 'wobble': 1.5, …} 처럼 덮어쓰기.
  taper   획 끝 굵기 비율 (1 = 안 가늘어짐 · 0.2 = 끝이 뾰족)        taper_px  가늘어지는 길이(px)
  press   필압 — 획 가운데 굵기 출렁임(0~0.3)                       wobble    선 흔들림 폭(px · 캔버스 크기 기준)
  over    닫힌 모양 끝을 조금 지나쳐 긋기(획 길이 비율 · 손그림 동그라미)
  tex     질감 'pencil' · 'crayon' · 'marker' · None                 tex_amt   질감 세기(0~1)
  ease    획 하나가 그려지는 속도 'inout'(천천히→빠르게→천천히) · 'linear'
  boil    다 그린 뒤에도 선이 떨리는 횟수(초당 · 0 = 멈춤) — t 를 넘겨야 움직인다
꼬리표 (캔버스에 적는 타이밍 — render(lt=) 로 장면 시각을 넘기면) — 획마다 data-t="1.6-2.2"(장면 안 초) · data-order · data-dir="reverse"
fill_in — 면이 채워지는 법: 'fade'(기본 · 서서히) · 'wipe'(한쪽에서 쓸고 지나감) · 'hatch'(빗금으로 채움 · 면이 빗금 모양으로 남는다)
"""
import math
import re

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SS = 2           # 2배로 그려 줄인다 (선이 매끈하게) — 요소 상자 크기만
_NUM = re.compile(r'[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?')

# ── 손맛 묶음 ─────────────────────────────────────
HAND = {
    'pen':    dict(taper=0.45, taper_px=36, press=0.08, wobble=0.7, over=0.03, tex=None, tex_amt=0.0, ease='inout', boil=0),
    'brush':  dict(taper=0.12, taper_px=110, press=0.22, wobble=0.9, over=0.05, tex=None, tex_amt=0.0, ease='inout', boil=0),
    'pencil': dict(taper=0.55, taper_px=40, press=0.10, wobble=1.0, over=0.06, tex='pencil', tex_amt=0.55, ease='inout', boil=0),
    'crayon': dict(taper=0.70, taper_px=30, press=0.14, wobble=1.3, over=0.06, tex='crayon', tex_amt=0.6, ease='inout', boil=0),
    'marker': dict(taper=0.90, taper_px=20, press=0.04, wobble=0.6, over=0.02, tex='marker', tex_amt=0.40, ease='inout', boil=0),
}
_PLAIN = dict(taper=1.0, taper_px=0, press=0.0, wobble=0.0, over=0.0, tex=None, tex_amt=0.0, ease='linear', boil=0)


def hand_spec(hand):
    """None → None(캔버스와 똑같이) · 이름 → 묶음 · dict → base 위에 덮어쓰기"""
    if not hand: return None
    if isinstance(hand, str):
        if hand not in HAND: raise ValueError(f'손맛 이름을 몰라요: {hand} (있는 것: {", ".join(HAND)})')
        return dict(HAND[hand])
    h = dict(HAND.get(hand.get('base'), _PLAIN)); h.update({k: v for k, v in hand.items() if k != 'base'}); return h


# ── 색 · 속성 ─────────────────────────────────────
_NAMED = {'black': (0, 0, 0), 'white': (255, 255, 255), 'red': (255, 0, 0), 'green': (0, 128, 0), 'blue': (0, 0, 255),
          'yellow': (255, 255, 0), 'orange': (255, 165, 0), 'gray': (128, 128, 128), 'grey': (128, 128, 128),
          'silver': (192, 192, 192), 'purple': (128, 0, 128), 'pink': (255, 192, 203), 'brown': (165, 42, 42),
          'navy': (0, 0, 128), 'teal': (0, 128, 128), 'gold': (255, 215, 0), 'lime': (0, 255, 0), 'cyan': (0, 255, 255),
          'magenta': (255, 0, 255), 'maroon': (128, 0, 0), 'olive': (128, 128, 0), 'tomato': (255, 99, 71),
          'crimson': (220, 20, 60), 'coral': (255, 127, 80), 'skyblue': (135, 206, 235), 'beige': (245, 245, 220),
          'ivory': (255, 255, 240), 'darkgray': (169, 169, 169), 'lightgray': (211, 211, 211), 'dimgray': (105, 105, 105)}
_INHERIT = ('stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-dasharray',
            'stroke-dashoffset', 'stroke-opacity', 'fill', 'fill-opacity', 'fill-rule', 'color', 'visibility')
_HIDE = ('defs', 'clippath', 'mask', 'pattern', 'lineargradient', 'radialgradient', 'symbol', 'marker', 'title', 'desc',
         'text', 'style', 'filter', 'metadata')
_ID = (1.0, 0.0, 0.0, 1.0, 0.0, 0.0)


def _f(v, d=0.0):
    try: return float(_NUM.match(str(v).strip()).group(0))
    except Exception: return d


def _col(v, cur=(0, 0, 0)):
    """→ (r,g,b) · None(없음) · 알파는 따로(_col_a)"""
    if v is None: return None
    v = v.strip().lower()
    if v in ('none', 'transparent', ''): return None
    if v == 'currentcolor': return cur
    if v.startswith('#'):
        h = v[1:]
        if len(h) in (3, 4): h = ''.join(c * 2 for c in h)
        try: return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
        except ValueError: return (0, 0, 0)
    m = re.match(r'rgba?\(([^)]+)\)', v)
    if m:
        p = re.split(r'[\s,/]+', m.group(1).strip())
        return tuple(int(round(float(x[:-1]) * 2.55)) if x.endswith('%') else int(float(x)) for x in p[:3])
    if v.startswith('url('): return (0, 0, 0)   # 그라데이션 · 패턴 — 읽지 않는다
    return _NAMED.get(v, (0, 0, 0))


def _col_a(v):
    """rgba(…, a) · #rrggbbaa 의 알파"""
    if not v: return 1.0
    v = v.strip().lower()
    m = re.match(r'rgba?\(([^)]+)\)', v)
    if m:
        p = re.split(r'[\s,/]+', m.group(1).strip())
        if len(p) >= 4: return float(p[3][:-1]) / 100 if p[3].endswith('%') else float(p[3])
    if v.startswith('#') and len(v) in (5, 9):
        h = v[1:]; h = ''.join(c * 2 for c in h) if len(h) == 4 else h; return int(h[6:8], 16) / 255
    return 1.0


def _styled(a):
    """속성 + style="…" (style 이 이긴다) → 소문자 키"""
    out = {k.lower(): v for k, v in a.items() if v is not None}
    for part in (out.get('style') or '').split(';'):
        if ':' in part:
            k, v = part.split(':', 1); out[k.strip().lower()] = v.strip()
    return out


def _mul(m, n):
    a, b, c, d, e, f = m; A, B, C, D, E, F = n
    return (a * A + c * B, b * A + d * B, a * C + c * D, b * C + d * D, a * E + c * F + e, b * E + d * F + f)


def parse_transform(s):
    m = _ID
    for name, args in re.findall(r'(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)', s or '', re.I):
        v = [float(x) for x in _NUM.findall(args)]; name = name.lower()
        if name == 'matrix' and len(v) == 6: n = tuple(v)
        elif name == 'translate': n = (1, 0, 0, 1, v[0] if v else 0, v[1] if len(v) > 1 else 0)
        elif name == 'scale': sx = v[0] if v else 1; n = (sx, 0, 0, v[1] if len(v) > 1 else sx, 0, 0)
        elif name == 'rotate':
            r = math.radians(v[0] if v else 0); c, s_ = math.cos(r), math.sin(r); n = (c, s_, -s_, c, 0, 0)
            if len(v) >= 3: n = _mul(_mul((1, 0, 0, 1, v[1], v[2]), n), (1, 0, 0, 1, -v[1], -v[2]))
        elif name == 'skewx': n = (1, 0, math.tan(math.radians(v[0] if v else 0)), 1, 0, 0)
        elif name == 'skewy': n = (1, math.tan(math.radians(v[0] if v else 0)), 0, 1, 0, 0)
        else: continue
        m = _mul(m, n)
    return m


def ctx_root(a):
    """<svg> 태그 자신의 속성 → 물려줄 맥락 (canvas 파서가 부른다)"""
    st = _styled(a)
    return {'attrs': {k: st[k] for k in _INHERIT if k in st}, 'tf': _ID, 'op': _f(st.get('opacity'), 1.0), 'hidden': False, 'grp': None}


_GID = [0]


def ctx_child(par, tag, a):
    """svg 속 태그 하나 → (자기 속성 + 물려받은 속성) · 누적 변형 · 누적 투명도"""
    st = _styled(a); tag = tag.lower()
    attrs = dict(par['attrs']); attrs.update(st)
    inh = {k: attrs[k] for k in _INHERIT if k in attrs}
    if tag in ('g', 'a', 'switch'): attrs = inh
    tf = _mul(par['tf'], parse_transform(st.get('transform'))) if st.get('transform') else par['tf']
    own = _f(st.get('opacity'), 1.0); grp = par.get('grp'); op = par['op']
    if tag in ('g', 'a', 'switch') and own < 1 and grp is None:   # 묶음 투명도 — 묶음을 다 그린 뒤 한 번에 옅게 (겹친 곳이 진해지지 않게)
        _GID[0] += 1; grp = (_GID[0], own)
    else: op = op * own
    hidden = par['hidden'] or tag in _HIDE or st.get('display') == 'none'
    return {'attrs': attrs if tag not in ('g', 'a', 'switch') else inh, 'tf': tf, 'op': op, 'hidden': hidden, 'grp': grp}


# ── path → 점 ─────────────────────────────────────
class _Scan:
    def __init__(s, d): s.d = d; s.i = 0

    def ws(s):
        while s.i < len(s.d) and s.d[s.i] in ' \t\r\n,': s.i += 1

    def cmd(s):
        s.ws()
        if s.i < len(s.d) and s.d[s.i].isalpha(): c = s.d[s.i]; s.i += 1; return c
        return None

    def num(s):
        s.ws(); m = _NUM.match(s.d, s.i)
        if not m: return None
        s.i = m.end(); return float(m.group(0))

    def flag(s):
        s.ws()
        if s.i < len(s.d) and s.d[s.i] in '01': s.i += 1; return s.d[s.i - 1] == '1'
        return None

    def more(s):
        s.ws(); return s.i < len(s.d) and not s.d[s.i].isalpha()


def _bez(p0, p1, p2, p3=None):
    est = math.dist(p0, p1) + math.dist(p1, p2) + (math.dist(p2, p3) if p3 else 0)
    n = int(min(64, max(8, est / 3)))
    out = []
    for s in range(1, n + 1):
        u = s / n; v = 1 - u
        if p3 is None:
            out.append((v * v * p0[0] + 2 * v * u * p1[0] + u * u * p2[0], v * v * p0[1] + 2 * v * u * p1[1] + u * u * p2[1]))
        else:
            out.append((v ** 3 * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u ** 3 * p3[0],
                        v ** 3 * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u ** 3 * p3[1]))
    return out


def _arc(x1, y1, rx, ry, phi, fa, fs, x2, y2):
    """SVG 호(끝점 표기) → 점들 (브라우저와 같은 계산 · 반지름이 모자라면 키운다)"""
    if (x1, y1) == (x2, y2): return []
    rx, ry = abs(rx), abs(ry)
    if rx == 0 or ry == 0: return [(x2, y2)]
    ph = math.radians(phi); c, s = math.cos(ph), math.sin(ph)
    dx, dy = (x1 - x2) / 2, (y1 - y2) / 2
    xp, yp = c * dx + s * dy, -s * dx + c * dy
    lam = xp * xp / (rx * rx) + yp * yp / (ry * ry)
    if lam > 1: rx *= math.sqrt(lam); ry *= math.sqrt(lam)
    num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp
    den = rx * rx * yp * yp + ry * ry * xp * xp
    co = math.sqrt(max(0.0, num / den)) if den else 0.0
    if fa == fs: co = -co
    cxp, cyp = co * rx * yp / ry, -co * ry * xp / rx
    cx, cy = c * cxp - s * cyp + (x1 + x2) / 2, s * cxp + c * cyp + (y1 + y2) / 2

    def ang(ux, uy, vx, vy):
        a = math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a
    th = ang(1, 0, (xp - cxp) / rx, (yp - cyp) / ry)
    dth = ang((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry)
    if not fs and dth > 0: dth -= 2 * math.pi
    if fs and dth < 0: dth += 2 * math.pi
    n = max(4, int(math.ceil(abs(dth) / (math.pi / 40) * max(1, max(rx, ry) / 200))))
    out = []
    for i in range(1, n + 1):
        t = th + dth * i / n
        out.append((cx + rx * math.cos(t) * c - ry * math.sin(t) * s, cy + rx * math.cos(t) * s + ry * math.sin(t) * c))
    out[-1] = (x2, y2)
    return out


def _path_pts(d):
    """path d → [(점 목록, 닫힘)] (하위 경로마다)"""
    S = _Scan(d); out, cur = [], []
    x = y = sx = sy = 0.0; lc = None; lq = None; prev = None; cmd = None
    while True:
        c = S.cmd()
        if c is None:
            if cmd is None or not S.more(): break
            c = cmd   # 같은 명령 이어서 (M 다음은 L)
        C = c.upper(); rel = c.islower()
        if C == 'Z':
            if cur: out.append((cur, True))
            cur = []; x, y = sx, sy; cmd = None; lc = lq = None; prev = 'Z'; continue
        if not S.more(): break
        if C == 'M':
            a, b = S.num(), S.num()
            if b is None: break
            x, y = (x + a, y + b) if rel else (a, b)
            if cur and (len(cur) > 1 or prev != 'M'): out.append((cur, False))
            cur = [(x, y)]; sx, sy = x, y; cmd = 'l' if rel else 'L'; lc = lq = None; prev = 'M'; continue
        if prev == 'Z' and not cur: cur = [(x, y)]
        if C == 'L':
            a, b = S.num(), S.num()
            if b is None: break
            x, y = (x + a, y + b) if rel else (a, b); cur.append((x, y)); lc = lq = None
        elif C == 'H':
            a = S.num()
            if a is None: break
            x = x + a if rel else a; cur.append((x, y)); lc = lq = None
        elif C == 'V':
            a = S.num()
            if a is None: break
            y = y + a if rel else a; cur.append((x, y)); lc = lq = None
        elif C in ('C', 'S'):
            v = [S.num() for _ in range(6 if C == 'C' else 4)]
            if None in v: break
            if rel: v = [vv + (x if i % 2 == 0 else y) for i, vv in enumerate(v)]
            if C == 'C': p1, p2, p3 = (v[0], v[1]), (v[2], v[3]), (v[4], v[5])
            else: p1 = (2 * x - lc[0], 2 * y - lc[1]) if lc else (x, y); p2, p3 = (v[0], v[1]), (v[2], v[3])
            cur += _bez((x, y), p1, p2, p3); lc = p2; lq = None; x, y = p3
        elif C in ('Q', 'T'):
            v = [S.num() for _ in range(4 if C == 'Q' else 2)]
            if None in v: break
            if rel: v = [vv + (x if i % 2 == 0 else y) for i, vv in enumerate(v)]
            if C == 'Q': p1, p3 = (v[0], v[1]), (v[2], v[3])
            else: p1 = (2 * x - lq[0], 2 * y - lq[1]) if lq else (x, y); p3 = (v[0], v[1])
            cur += _bez((x, y), p1, p3); lq = p1; lc = None; x, y = p3
        elif C == 'A':
            rx, ry, phi = S.num(), S.num(), S.num(); fa, fs = S.flag(), S.flag(); ex, ey = S.num(), S.num()
            if None in (rx, ry, phi, fa, fs, ex, ey): break
            if rel: ex, ey = x + ex, y + ey
            cur += _arc(x, y, rx, ry, phi, fa, fs, ex, ey); x, y = ex, ey; lc = lq = None
        else: break
        cmd = c; prev = C
    if cur: out.append((cur, False))
    return [(p, cl_) for p, cl_ in out if len(p) >= 2 or cl_]


def _ellipse(cx, cy, rx, ry):
    n = int(min(180, max(24, (rx + ry) / 2)))
    return [(cx + rx * math.cos(2 * math.pi * i / n), cy + ry * math.sin(2 * math.pi * i / n)) for i in range(n)]


def _rect(x, y, w, h, rx=None, ry=None):
    """SVG rect — rx · ry 중 하나만 있으면 같은 값 · 변의 절반까지 · 오른쪽 위에서 시계 방향(브라우저와 같은 출발점)"""
    if rx is None and ry is None: rx = ry = 0
    elif rx is None: rx = ry
    elif ry is None: ry = rx
    rx, ry = min(max(rx, 0), w / 2), min(max(ry, 0), h / 2)
    if rx <= 0 or ry <= 0: return [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
    pts = []; n = int(min(24, max(6, (rx + ry) / 4)))
    for cx, cy, a0 in [(x + w - rx, y + ry, -90), (x + w - rx, y + h - ry, 0), (x + rx, y + h - ry, 90), (x + rx, y + ry, 180)]:
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n); pts.append((cx + rx * math.cos(a), cy + ry * math.sin(a)))
    return [(x + rx, y)] + pts


def _dash(v):
    if not v or v.strip() in ('none', ''): return None
    d = [abs(_f(x)) for x in re.split(r'[\s,]+', v.strip()) if x]
    if not d or sum(d) <= 0: return None
    return d * 2 if len(d) % 2 else d


def span(v):
    """data-t 값 '0.5-1.2' · '0.5~1.2' · '0.5 1.2' → (0.5, 1.2) · 하나뿐이면 (그 시각, +0.8초)"""
    if v is None: return None
    n = [float(x) for x in re.findall(r'\d+(?:\.\d+)?', str(v))]
    if not n: return None
    return (n[0], n[1]) if len(n) > 1 and n[1] > n[0] else (n[0], n[0] + 0.8)


def raw_shapes(svg):
    """parser 가 모은 svg 정보 → viewBox 좌표의 모양들 (변형 적용 · 선 굵기도 변형 배율대로)"""
    out = []
    for s in svg.get('kids', []):
        t, a = s['tag'].lower(), s['attrs']
        if a.get('visibility') in ('hidden', 'collapse'): continue
        cur = _col(a.get('color'), (0, 0, 0)) or (0, 0, 0)
        stroke = _col(a.get('stroke', 'none'), cur); fill = _col(a.get('fill', '#000000'), cur)
        op = s.get('op', 1.0)
        sa = op * _f(a.get('stroke-opacity'), 1.0) * _col_a(a.get('stroke'))
        fa_ = op * _f(a.get('fill-opacity'), 1.0) * _col_a(a.get('fill'))
        subs = []
        if t == 'path' and a.get('d'): subs = _path_pts(a['d'])
        elif t == 'circle':
            r = _f(a.get('r'))
            if r > 0: subs = [(_ellipse(_f(a.get('cx')), _f(a.get('cy')), r, r), True)]
        elif t == 'ellipse':
            rx, ry = _f(a.get('rx')), _f(a.get('ry'))
            if a.get('rx') is None or str(a.get('rx')) == 'auto': rx = ry
            if a.get('ry') is None or str(a.get('ry')) == 'auto': ry = rx
            if rx > 0 and ry > 0: subs = [(_ellipse(_f(a.get('cx')), _f(a.get('cy')), rx, ry), True)]
        elif t == 'rect':
            w, h = _f(a.get('width')), _f(a.get('height'))
            if w > 0 and h > 0:
                subs = [(_rect(_f(a.get('x')), _f(a.get('y')), w, h, _f(a['rx']) if a.get('rx') not in (None, 'auto') else None,
                               _f(a['ry']) if a.get('ry') not in (None, 'auto') else None), True)]
        elif t == 'line': subs = [([(_f(a.get('x1')), _f(a.get('y1'))), (_f(a.get('x2')), _f(a.get('y2')))], False)]
        elif t in ('polyline', 'polygon'):
            v = [float(z) for z in _NUM.findall(a.get('points', ''))]
            if len(v) >= 4: subs = [(list(zip(v[0::2], v[1::2])), t == 'polygon')]
        if not subs: continue
        tf = s.get('tf', _ID); ts = math.sqrt(abs(tf[0] * tf[3] - tf[1] * tf[2])) or 1.0
        if tf != _ID:
            subs = [([(tf[0] * x + tf[2] * y + tf[4], tf[1] * x + tf[3] * y + tf[5]) for x, y in p], c) for p, c in subs]
        w = _f(a.get('stroke-width'), 1.0) if stroke else 0.0
        if str(a.get('data-dir', '')).strip().lower() in ('reverse', 'rev', '거꾸로'): subs = [(p[::-1], c) for p, c in subs]
        o_ = a.get('data-order')
        out.append({'t': span(a.get('data-t')), 'order': _f(o_) if o_ not in (None, '') else None,
                    'grp': s.get('grp'), 'subs': subs, 'stroke': stroke if w > 0 and sa > 0 else None, 'w': w * ts, 'sa': sa,
                    'fill': fill if fa_ > 0 else None, 'fa': fa_, 'rule': (a.get('fill-rule') or 'nonzero').strip(),
                    'cap': (a.get('stroke-linecap') or 'butt').strip(), 'join': (a.get('stroke-linejoin') or 'miter').strip(),
                    'miter': _f(a.get('stroke-miterlimit'), 4.0), 'dash': [x * ts for x in (_dash(a.get('stroke-dasharray')) or [])] or None,
                    'dashoff': _f(a.get('stroke-dashoffset'), 0.0) * ts})
    return out


def shapes(e):
    """요소 상자 안 px 좌표로 (viewBox → 상자: 비율 유지 · 가운데 · 선 굵기도 같은 배율 · preserveAspectRatio none 이면 늘림)"""
    svg = e.get('svg')
    if not svg: return []
    if '_shapes' in e: return e['_shapes']
    W, H = e['w'], e['h'] or e['w']
    vb = svg.get('viewBox')
    vx, vy, vw, vh = vb if vb else (0, 0, W, H)
    par = (svg.get('par') or '').strip().lower()
    if par.startswith('none'):
        sx, sy = W / max(vw, 1e-6), H / max(vh, 1e-6); ox, oy = -vx * sx, -vy * sy
    else:
        sc = (max if 'slice' in par else min)(W / max(vw, 1e-6), H / max(vh, 1e-6)); sx = sy = sc
        al = par.split()[0] if par else 'xmidymid'
        fx = 0 if 'xmin' in al else 1 if 'xmax' in al else 0.5
        fy = 0 if 'ymin' in al else 1 if 'ymax' in al else 0.5
        ox, oy = (W - vw * sc) * fx - vx * sc, (H - vh * sc) * fy - vy * sc
    ws = math.sqrt(sx * sy); out = []
    for sh in raw_shapes(svg):
        out.append(dict(sh, subs=[([(ox + x * sx, oy + y * sy) for x, y in p], c) for p, c in sh['subs']], w=sh['w'] * ws,
                        dash=[d * ws for d in sh['dash']] if sh['dash'] else None, dashoff=sh['dashoff'] * ws))
    e['_shapes'] = out
    return out


# ── 그리기 부품 ───────────────────────────────────
def _cl(v): return max(0.0, min(1.0, v))


def _ease(u, how):
    u = _cl(u)
    return u * u * (3 - 2 * u) if how == 'inout' else u


def _dedup(P):
    out = [P[0]]
    for p in P[1:]:
        if math.dist(p, out[-1]) > 1e-6: out.append(p)
    return out


def _cum(P):
    return [0.0] + list(np.cumsum([math.dist(P[i], P[i + 1]) for i in range(len(P) - 1)]))


def _cut(P, a, b, L=None):
    """열린 선 P 의 길이 a~b 구간"""
    L = L or _cum(P); out = []
    for i in range(len(P) - 1):
        l0, l1 = L[i], L[i + 1]
        if l1 < a or l0 > b or l1 == l0: continue
        if not out:
            u = _cl((a - l0) / (l1 - l0)); out.append((P[i][0] + (P[i + 1][0] - P[i][0]) * u, P[i][1] + (P[i + 1][1] - P[i][1]) * u))
        if l1 <= b: out.append(P[i + 1])
        else:
            u = _cl((b - l0) / (l1 - l0)); out.append((P[i][0] + (P[i + 1][0] - P[i][0]) * u, P[i][1] + (P[i + 1][1] - P[i][1]) * u)); break
    return out


def _fill_mask(polys, size, rule='nonzero', off=(0, 0)):
    """다각형들 → L 마스크 (nonzero · evenodd 둘 다 — 구멍이 뚫린다). 가로줄마다 교차점의 감김 수를 센다"""
    Wm, Hm = size
    rows, xs, ds = [], [], []
    for P in polys:
        if len(P) < 3: continue
        A = np.array(P, float) - np.array(off, float); B = np.roll(A, -1, axis=0)
        y0, y1 = A[:, 1], B[:, 1]; keep = y0 != y1
        x0, y0, x1, y1 = A[keep, 0], y0[keep], B[keep, 0], y1[keep]
        d = np.where(y1 > y0, 1, -1)
        lo, hi = np.minimum(y0, y1), np.maximum(y0, y1)
        r0 = np.clip(np.ceil(lo - 0.5), 0, Hm).astype(int); r1 = np.clip(np.ceil(hi - 0.5), 0, Hm).astype(int)
        cnt = r1 - r0
        if cnt.sum() == 0: continue
        idx = np.repeat(np.arange(len(cnt)), cnt)
        rr = np.concatenate([np.arange(a, b) for a, b in zip(r0, r1) if b > a])
        yc = rr + 0.5
        xx = x0[idx] + (yc - y0[idx]) * (x1[idx] - x0[idx]) / (y1[idx] - y0[idx])
        rows.append(rr); xs.append(xx); ds.append(d[idx])
    m = np.zeros((Hm, Wm), np.uint8)
    if not rows: return Image.fromarray(m)
    rr, xx, dd = np.concatenate(rows), np.concatenate(xs), np.concatenate(ds)
    o = np.lexsort((xx, rr)); rr, xx, dd = rr[o], xx[o], dd[o]
    wind = np.cumsum(dd)
    # 같은 줄 안에서 다음 교차점까지가 «안»인지
    same = np.r_[rr[1:] == rr[:-1], False]
    inside = wind != 0
    if rule == 'evenodd':
        # 줄마다 몇 번째 교차점인지 → 홀수 번째 뒤가 안
        start = np.r_[True, rr[1:] != rr[:-1]]
        grp = np.cumsum(start) - 1
        first = np.flatnonzero(start)
        k = np.arange(len(rr)) - first[grp]
        inside = (k % 2) == 0
    sel = same & inside
    a = np.clip(np.ceil(xx[sel] - 0.5).astype(int), 0, Wm); b = np.clip(np.ceil(xx[1:][sel[:-1]] - 0.5).astype(int), 0, Wm)
    r = rr[sel]
    acc = np.zeros((Hm, Wm + 1), np.int32)
    np.add.at(acc, (r, a), 1); np.add.at(acc, (r, b), -1)
    m[np.cumsum(acc, axis=1)[:, :Wm] > 0] = 255
    return Image.fromarray(m)


def _stroke_plain(d, P, closed, hw, cap, join, miter):
    """일정한 굵기 선 → 마스크에 다각형으로 (선 끝 butt · round · square / 이음 miter · round · bevel — 브라우저와 같게)"""
    P = _dedup(P)
    if closed and len(P) > 2 and math.dist(P[0], P[-1]) < 1e-6: P = P[:-1]
    if len(P) == 1:
        if cap == 'round': x, y = P[0]; d.ellipse([x - hw, y - hw, x + hw, y + hw], fill=255)
        elif cap == 'square': x, y = P[0]; d.rectangle([x - hw, y - hw, x + hw, y + hw], fill=255)
        return
    Q = P + [P[0]] if closed else P
    nseg = len(Q) - 1
    T = []
    for i in range(nseg):
        (x0, y0), (x1, y1) = Q[i], Q[i + 1]; L = math.hypot(x1 - x0, y1 - y0) or 1; T.append(((x1 - x0) / L, (y1 - y0) / L))
    for i in range(nseg):
        (x0, y0), (x1, y1) = Q[i], Q[i + 1]; tx, ty = T[i]; nx, ny = -ty * hw, tx * hw
        if not closed and cap == 'square':
            if i == 0: x0, y0 = x0 - tx * hw, y0 - ty * hw
            if i == nseg - 1: x1, y1 = x1 + tx * hw, y1 + ty * hw
        d.polygon([(x0 + nx, y0 + ny), (x1 + nx, y1 + ny), (x1 - nx, y1 - ny), (x0 - nx, y0 - ny)], fill=255)
    joints = range(nseg) if closed else range(1, nseg)
    for j in joints:
        a, b = T[j - 1], T[j]; px_, py_ = Q[j]
        cr = a[0] * b[1] - a[1] * b[0]; dot = a[0] * b[0] + a[1] * b[1]
        if abs(cr) < 1e-9 and dot > 0: continue
        if join == 'round': d.ellipse([px_ - hw, py_ - hw, px_ + hw, py_ + hw], fill=255); continue
        s = 1 if cr > 0 else -1   # 바깥쪽 = 꺾이는 반대편
        na = (a[1] * s * hw, -a[0] * s * hw); nb = (b[1] * s * hw, -b[0] * s * hw)
        pa, pb = (px_ + na[0], py_ + na[1]), (px_ + nb[0], py_ + nb[1])
        th = math.acos(max(-1, min(1, dot)))
        ratio = 1 / max(1e-9, math.sin((math.pi - th) / 2))
        if join in ('miter', 'miter-clip', 'arcs') and ratio <= miter:
            bx, by = na[0] + nb[0], na[1] + nb[1]; bl = math.hypot(bx, by) or 1
            ml = hw * ratio; mp = (px_ + bx / bl * ml, py_ + by / bl * ml)
            d.polygon([(px_, py_), pa, mp, pb], fill=255)
        else: d.polygon([(px_, py_), pa, pb], fill=255)
    if not closed and cap == 'round':
        for x, y in (P[0], P[-1]): d.ellipse([x - hw, y - hw, x + hw, y + hw], fill=255)


def _noise1(n, rng, waves=3, lam=90.0, L=1.0):
    """길이 방향 부드러운 출렁임 (-1~1) — 사인 몇 개를 무작위 위상으로"""
    s = np.linspace(0, L, n); out = np.zeros(n)
    for k in range(waves):
        f = (k + 1) / lam * rng.uniform(0.7, 1.3); out += math.pow(0.6, k) * np.sin(2 * math.pi * f * s + rng.uniform(0, 2 * math.pi))
    return out / (1 + 0.6 + 0.36)


def _resample(P, step):
    L = _cum(P); tot = L[-1]
    if tot <= 0: return np.array(P[:1] * 2, float), 0.0
    n = max(2, int(tot / step) + 1); s = np.linspace(0, tot, n)
    A = np.array(P, float)
    return np.stack([np.interp(s, L, A[:, 0]), np.interp(s, L, A[:, 1])], 1), tot


def _hand_line(P, closed, hw, h, rng, frac=1.0, scale=1.0):
    """손으로 그은 획 하나 → (중심선 점들, 반지름들) · frac = 그려진 비율"""
    P = _dedup(P)
    if closed:
        P = P + [P[0]]
        if h['over'] > 0:   # 끝을 조금 지나쳐 긋는다 (첫 부분을 다시 따라가며 살짝 바깥으로)
            L = _cum(P); extra = _cut(P, 0, L[-1] * h['over'], L)
            if len(extra) > 1: P = P + extra[1:]
    S, tot = _resample(P, 3.0 * scale)
    if len(S) < 2 or tot <= 0: return None, None
    n = len(S)
    T = np.gradient(S, axis=0); T /= (np.linalg.norm(T, axis=1, keepdims=True) + 1e-9); N = np.stack([-T[:, 1], T[:, 0]], 1)
    s = np.linspace(0, tot, n)
    wob = h['wobble'] * scale * _noise1(n, rng, 3, 110.0 * scale, tot)
    if closed and h['over'] > 0: wob = wob + np.linspace(0, 1, n) ** 3 * h['wobble'] * 2.5 * scale   # 끝이 살짝 바깥으로 빠진다
    S = S + N * wob[:, None]
    r = np.full(n, hw)
    if h['press'] > 0: r = r * (1 + h['press'] * _noise1(n, rng, 2, 160.0 * scale, tot))
    if h['taper'] < 1:
        tl = max(1e-6, min(h['taper_px'] * scale, tot * 0.35))
        u = np.minimum(s / tl, (tot - s) / tl); u = np.clip(u, 0, 1); u = u * u * (3 - 2 * u)
        r = r * (h['taper'] + (1 - h['taper']) * u)
    if frac < 1:
        m = max(2, int(math.ceil(n * frac)))
        if m < 2: return None, None
        S, r = S[:m], r[:m]
    return S, r


def _draw_capsules(d, S, r):
    """굵기가 변하는 선 — 이웃 점 사이 사다리꼴 + 점마다 원 (둥근 이음 · 둥근 끝)"""
    for i in range(len(S) - 1):
        (x0, y0), (x1, y1) = S[i], S[i + 1]; r0, r1 = r[i], r[i + 1]
        dx, dy = x1 - x0, y1 - y0; L = math.hypot(dx, dy)
        if L < 1e-6: continue
        nx, ny = -dy / L, dx / L
        d.polygon([(x0 + nx * r0, y0 + ny * r0), (x1 + nx * r1, y1 + ny * r1), (x1 - nx * r1, y1 - ny * r1), (x0 - nx * r0, y0 - ny * r0)], fill=255)
    step = max(1, int(len(S) / 400))
    for i in list(range(0, len(S), step)) + [len(S) - 1]:
        x, y = S[i]; rr = r[i]
        if rr > 0.3: d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=255)


_TEX = {}


def _texture(kind, size, seed):
    """질감 마스크 (0~1 · 1 = 그대로) — 종이 결이라 떨림과 상관없이 고정"""
    key = (kind, size, seed)
    if key in _TEX: return _TEX[key]
    if len(_TEX) > 24: _TEX.clear()
    W, H = size; rng = np.random.default_rng(seed)
    if kind == 'pencil':
        n = rng.random((H, W)); im = Image.fromarray((n * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
        a = np.asarray(im, float) / 255; t = np.clip((a - 0.30) / 0.40, 0, 1)
    elif kind == 'crayon':
        h2, w2 = max(1, H // 3), max(1, W // 3)
        n = rng.random((h2, w2)); im = Image.fromarray((n * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)
        a = np.asarray(im, float) / 255
        sh = np.zeros_like(a)
        for k in range(-4, 5): sh += np.roll(np.roll(a, k * 2, axis=1), k, axis=0)   # 비스듬한 결
        a = sh / 9; a = (a - a.min()) / (np.ptp(a) + 1e-9)
        fine = rng.random((H, W)); t = np.clip((a * 0.7 + fine * 0.3 - 0.28) / 0.36, 0, 1)
    else:   # marker — 획 방향과 상관없는 옅은 얼룩 + 가장자리 진함은 생략
        h2, w2 = max(1, H // 8), max(1, W // 8)
        n = rng.random((h2, w2)); im = Image.fromarray((n * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)
        a = np.asarray(im, float) / 255; t = np.clip(0.55 + a * 0.6, 0, 1)
    _TEX[key] = t.astype(np.float32)
    return _TEX[key]


def _apply_tex(mask, h, seed):
    if not h or not h.get('tex') or h.get('tex_amt', 0) <= 0: return mask
    t = _texture(h['tex'], mask.size, seed); a = np.asarray(mask, np.float32)
    k = h['tex_amt']; a = a * (1 - k + k * t)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def _hatch_mask(size, bbox, gap, ang, h, rng, frac, scale):
    """빗금 — bbox 를 덮는 평행선들 (손맛이 있으면 손 획으로) · frac 만큼 차례로"""
    m = Image.new('L', size, 0); d = ImageDraw.Draw(m)
    x0, y0, x1, y1 = bbox; cx, cy = (x0 + x1) / 2, (y0 + y1) / 2; R = math.hypot(x1 - x0, y1 - y0) / 2 + gap
    a = math.radians(ang); ux, uy = math.cos(a), math.sin(a); vx, vy = -uy, ux
    n = int(2 * R / gap) + 1; shown = n * frac
    hh = h or dict(_PLAIN, wobble=0.6, taper=0.5, taper_px=14)
    for i in range(n):
        if i >= shown: break
        f = _cl(shown - i)
        o = -R + i * gap + (rng.uniform(-0.12, 0.12) * gap if h else 0)
        p0 = (cx + vx * o - ux * R, cy + vy * o - uy * R); p1 = (cx + vx * o + ux * R, cy + vy * o + uy * R)
        S, r = _hand_line([p0, p1], False, max(1.0, gap * 0.16), hh, rng, f, scale)
        if S is not None: _draw_capsules(d, S, r)
    return m


# ── 렌더 ──────────────────────────────────────────
def _units(sh):
    """그리는 순서 — 획(하위 경로) 하나가 한 칸 · 선 없는 면은 모양 하나가 한 칸 · data-order 가 있으면 그 순서(없는 것은 뒤로)"""
    U = []
    for i, s in enumerate(sh):
        if s['stroke']:
            for j in range(len(s['subs'])): U.append((i, j))
        else: U.append((i, -1))
    if any(s.get('order') is not None for s in sh):
        U.sort(key=lambda u: (sh[u[0]]['order'] if sh[u[0]].get('order') is not None else 1e9, U.index(u)))
    return U


def _tagged(sh, u, lt):
    """data-t 가 달린 모양 → 그 획의 진행(0~1) · 여러 획이면 그 시간을 길이대로 나눠 차례로"""
    s = sh[u[0]]; a, b = s['t']
    if u[1] >= 0 and len(s['subs']) > 1:
        L = [_cum(p)[-1] + 1e-6 for p, _ in s['subs']]; tot = sum(L); c0 = sum(L[:u[1]])
        a, b = a + (b - a) * c0 / tot, a + (b - a) * (c0 + L[u[1]]) / tot
    return _cl((lt - a) / max(1e-6, b - a))


def render(e, W, H, o=0, k=1.0, stagger=0.6, hand=None, t=None, fill_in=None, seed=0, lt=None):
    """요소의 SVG 를 RGBA 로. k<1 이면 획들이 차례로(겹쳐서) 그려진다 — 모양마다: 선 0~70% · 면 55~100%.
    stagger = 앞 획이 이만큼 진행되면 다음 획 시작 (0 = 동시 · 1 = 하나 끝나고 다음)
    hand = 손맛(이름 · dict · None) · t = 장면 시각(boil 떨림) · fill_in = 'fade' · 'wipe' · 'hatch' · seed = 같은 모양 다른 손
    lt = 장면 안 시각 — 넘기면 data-t 꼬리표가 달린 획은 그 시각에 그려진다 (motion.draw 가 넘긴다)"""
    sh = shapes(e); h = hand_spec(hand)
    size = ((W + 2 * o) * SS, (H + 2 * o) * SS)
    big = Image.new('RGBA', size, (0, 0, 0, 0))
    if not sh: return big.resize((W + 2 * o, H + 2 * o))
    U = _units(sh)
    bidx = int(math.floor(t * h['boil'])) if (h and h.get('boil') and t is not None) else 0
    fill_in = fill_in or 'fade'
    sc = SS  # 손맛 크기(px) → 그리는 배율

    def P_(p): return [((x + o) * SS, (y + o) * SS) for x, y in p]

    # 획마다 진행
    prog = {}
    free = [u for u in U if not (lt is not None and sh[u[0]].get('t'))]          # 꼬리표 없는 획 — k 로 차례로
    span_ = 1 + (len(free) - 1) * stagger if free else 1
    for u in U:
        if lt is not None and sh[u[0]].get('t'): prog[u] = _tagged(sh, u, lt)      # data-t — 장면 안 그 시각에
        else: prog[u] = 1.0 if k >= 1 else _cl(k * span_ - free.index(u) * stagger)
    if lt is not None and all(v >= 1 for v in prog.values()): k = 1.0
    canvas_ = big; gcur = None
    for i, s in enumerate(sh):
        g = s.get('grp')
        if (g[0] if g else None) != (gcur[0] if gcur else None):
            if gcur: _flush(canvas_, big, gcur[1])
            big = Image.new('RGBA', size, (0, 0, 0, 0)) if g else canvas_; gcur = g
        mine = [prog[u] for u in U if u[0] == i]
        kis = max(mine) if mine else 0
        last = mine[-1] if mine else 0
        if kis <= 0: continue
        # 이 모양이 차지하는 자리만 그린다 (큰 그림에서 모양마다 전체 크기로 그리면 느리다)
        hw0 = s['w'] * SS / 2
        pad = int(hw0 + (h['wobble'] * sc * 4 if h else 0) + (s['miter'] * hw0 if s['stroke'] and s['join'] == 'miter' else hw0) + 8 * SS)
        allp = [pt for p, c in s['subs'] for pt in P_(p)]
        bx0 = max(0, int(min(x for x, y in allp)) - pad); by0 = max(0, int(min(y for x, y in allp)) - pad)
        bx1 = min(size[0], int(max(x for x, y in allp)) + pad + 1); by1 = min(size[1], int(max(y for x, y in allp)) + pad + 1)
        if bx1 <= bx0 or by1 <= by0: continue
        bsz = (bx1 - bx0, by1 - by0)

        def L_(p, bx0=bx0, by0=by0): return [(x - bx0, y - by0) for x, y in P_(p)]
        # ── 면 ──
        if s['fill']:
            fk = 1.0 if k >= 1 else _cl((last - 0.55) / 0.45)
            if fk > 0:
                polys = [L_(p) for p, c in s['subs'] if len(p) >= 3]
                key = ('fill', i, size, o, bx0, by0, bsz)   # 손맛이 바뀌면 그리는 자리도 바뀐다
                cache = e.setdefault('_svgcache', {})
                if key not in cache: cache[key] = _fill_mask(polys, bsz, s['rule'])
                fm = cache[key]
                if fill_in == 'hatch':
                    bb = fm.getbbox()
                    if bb:
                        gap = max(8.0, (s['w'] or 4) * 2.1) * SS
                        hm = _hatch_mask(bsz, bb, gap, -35, h, np.random.default_rng(seed * 31 + i), fk, sc)
                        fm2 = Image.fromarray((np.asarray(hm, np.uint16) * np.asarray(fm, np.uint16) // 255).astype(np.uint8))
                    else: fm2 = fm
                    a = s['fa']
                else:
                    fm2 = fm; a = s['fa'] * (_ease(fk, 'inout') if fill_in == 'fade' else 1)
                    if fill_in == 'wipe' and fk < 1:
                        bb = fm.getbbox() or (0, 0, bsz[0], bsz[1])
                        x = bb[0] + (bb[2] - bb[0] + 60 * SS) * _ease(fk, 'inout') - 30 * SS
                        g = np.clip((x - np.arange(bsz[0])) / (30 * SS), 0, 1).astype(np.float32)
                        fm2 = Image.fromarray((np.asarray(fm, np.float32) * g[None, :]).astype(np.uint8))
                fm2 = _apply_tex(fm2, h, seed * 7 + i)
                if a < 0.999: fm2 = fm2.point(lambda v, a=a: int(v * a))
                lay = Image.new('RGBA', bsz, s['fill'] + (0,)); lay.putalpha(fm2); big.alpha_composite(lay, (bx0, by0))
        # ── 선 ──
        if s['stroke']:
            m = Image.new('L', bsz, 0); d = ImageDraw.Draw(m); hw = s['w'] * SS / 2
            for j, (p, closed) in enumerate(s['subs']):
                ki = prog[(i, j)]
                if ki <= 0: continue
                fr = 1.0 if ki >= 1 and k >= 1 else _ease(_cl(ki / 0.7), h['ease'] if h else 'linear')
                Pp = L_(p)
                if h:
                    rng = np.random.default_rng((seed * 1000003 + i * 9176 + j * 131 + bidx * 7919) % (2 ** 32))
                    if s['dash']:
                        for seg_ in _dashes(Pp, closed, fr, [x * SS for x in s['dash']], s['dashoff'] * SS):
                            S, r = _hand_line(seg_, False, hw, dict(h, over=0), rng, 1.0, sc)
                            if S is not None: _draw_capsules(d, S, r)
                    else:
                        S, r = _hand_line(Pp, closed, hw, h, rng, fr, sc)
                        if S is not None: _draw_capsules(d, S, r)
                else:
                    if s['dash']:
                        for seg_ in _dashes(Pp, closed, fr, [x * SS for x in s['dash']], s['dashoff'] * SS):
                            _stroke_plain(d, seg_, False, hw, s['cap'], s['join'], s['miter'])
                    elif fr >= 1: _stroke_plain(d, Pp, closed, hw, s['cap'], s['join'], s['miter'])
                    else:
                        Q = Pp + [Pp[0]] if closed else Pp
                        L = _cum(Q); part = _cut(Q, 0, L[-1] * fr, L)
                        if len(part) > 1:
                            _stroke_plain(d, part, False, hw, 'round' if s['cap'] == 'butt' and closed else s['cap'], s['join'], s['miter'])
            m = _apply_tex(m, h, seed * 7 + i + 101)
            if s['sa'] < 0.999: m = m.point(lambda v, a=s['sa']: int(v * a))
            lay = Image.new('RGBA', bsz, s['stroke'] + (0,)); lay.putalpha(m); big.alpha_composite(lay, (bx0, by0))
    if gcur: _flush(canvas_, big, gcur[1])
    return canvas_.resize((W + 2 * o, H + 2 * o), Image.LANCZOS)


def _flush(dst, lay, a):
    lay.putalpha(lay.getchannel('A').point(lambda v: int(v * a))); dst.alpha_composite(lay)


def _dashes(P, closed, frac, dash, off):
    """그려진 부분(frac)을 점선 무늬로 자른다 — 무늬는 제자리에 있고 선이 그 위로 지나간다"""
    Q = _dedup(P + [P[0]] if closed else P)
    if len(Q) < 2: return []
    L = _cum(Q); tot = L[-1]; upto = tot * frac; per = sum(dash); out = []
    pos = -(off % per); i = 0
    while pos < upto:
        ln = dash[i % len(dash)]
        if i % 2 == 0:
            a, b = max(0.0, pos), min(upto, pos + ln)
            if b > a:
                seg_ = _cut(Q, a, b, L)
                if len(seg_) > 1: out.append(seg_)
        pos += ln; i += 1
    return out
