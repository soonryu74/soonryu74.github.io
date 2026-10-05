"""캔버스 아트보드(.dc.html) → 요소 목록 → Pillow 로 다시 그리기.

캔버스(Claude Design)에서 확정한 화면을 엔진이 «그대로» 따라 그리기 위한 부품.
  read_board(path)          → (root, els)   root = 화면 크기·바탕 · els = 요소 목록(그리는 순서)
  draw_board(root, els)     → 장면이 «다 나왔을 때» 한 장 (아트보드와 같은 화면)
  layer(el)                 → (RGBA 조각, x, y)  요소 하나만 투명 바탕에 — appear.py 가 움직인다
  box(el) · pic(el)         → 요소 자리 · 요소 그림 — 효과 사전(fx)에 캔버스 요소를 넘길 때
  read_notes(canvas.json)   → 메모 목록 (어느 아트보드 위인지 · 아트보드 안 좌표)
  fonts_used(els)           → 쓰인 글꼴 (이름 · 굵기) — ⑤ 글꼴 받기 목록
  missing                   → 그리다가 못 찾은 글꼴 · 그림 (경고)

찾는 곳 (환경변수로 덮어쓰기):
  글꼴  MOTION_FONTS (콜론으로 여러 곳) → <작업 폴더>/fonts → 스킬 assets/fonts (Pretendard)
  그림  MOTION_ASSETS → <작업 폴더>/재료 — 캔버스 그림 번호(/_blob/<번호>)와 같은 이름 <번호>.<확장자>

읽는 것: 위치 left/top/width/height(px) · background(단색 · linear/radial-gradient) · border-radius · 테두리 ·
box-shadow · text-shadow · transform rotate/scale(가운데 기준) · opacity · filter: blur · 글자 font-size/weight/line-height/
color(투명도 포함)/text-align/font-family/letter-spacing · -webkit-text-stroke · 글자 속 그라데이션(background-clip: text) ·
<br> 줄바꿈 · 한글 글자 사이 줄바꿈(keep-all 이면 띄어쓰기에서만) · <img> object-fit cover/contain/fill · 화면 밖으로 넘친 요소(잘려 보임).
아직 못 읽는 것이 디자인에 필요하면 → 여기에 보탠다. 디자인을 엔진에 맞춰 낮추지 않는다.

  python3 canvas.py board <아트보드.dc.html> <출력.png> [--json 요소.json]
  python3 canvas.py notes <canvas.json>
  python3 canvas.py fonts <아트보드.dc.html> …
"""
import glob
import json
import math
import os
import re
import sys
from html.parser import HTMLParser

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SKILL = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
missing = set()


# ── 찾는 곳 ───────────────────────────────────────
def font_dirs():
    ds = [d for d in os.environ.get('MOTION_FONTS', '').split(':') if d]
    return ds + [os.path.join(os.getcwd(), 'fonts'), os.path.join(SKILL, 'assets', 'fonts')]


def asset_dirs():
    ds = [d for d in os.environ.get('MOTION_ASSETS', '').split(':') if d]
    return ds + [os.path.join(os.getcwd(), '재료'), os.path.join(os.getcwd(), 'assets')]


# ── CSS 값 ───────────────────────────────────────
def css(s):
    out = {}
    for part in (s or '').split(';'):
        if ':' in part:
            k, v = part.split(':', 1); out[k.strip().lower()] = v.strip()
    return out


def px(v, d=0.0):
    if v is None: return d
    m = re.match(r'\s*(-?[\d.]+)', v)
    return float(m.group(1)) if m else d


NAMED = {'white': (255, 255, 255, 255), 'black': (0, 0, 0, 255), 'transparent': (0, 0, 0, 0)}


def rgba(v):
    """CSS 색 하나 → (r, g, b, a) · 못 읽으면 None"""
    if not v: return None
    v = v.strip().lower()
    if v in NAMED: return NAMED[v]
    m = re.fullmatch(r'#([0-9a-f]{3,8})', v)
    if m:
        h = m.group(1)
        if len(h) in (3, 4): h = ''.join(c * 2 for c in h)
        a = int(h[6:8], 16) if len(h) == 8 else 255
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)
    m = re.fullmatch(r'rgba?\(([^)]+)\)', v)
    if m:
        p = [x for x in re.split(r'[\s,/]+', m.group(1).strip()) if x]
        a = p[3] if len(p) > 3 else '1'
        a = float(a[:-1]) / 100 if a.endswith('%') else float(a)
        return tuple(int(float(x)) for x in p[:3]) + (int(round(a * 255)),)
    return None


def color(v):
    """CSS 색 → (r, g, b) (투명도는 버림 · 글자색 등 단색용) — 문자열 안 어디에 있든 첫 색"""
    if not v: return None
    m = re.search(r'#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)|\b(white|black)\b', v)
    c = rgba(m.group(0)) if m else None
    return c[:3] if c else None


def _split_top(s):
    """괄호 밖 쉼표로 나누기"""
    out, depth, cur = [], 0, ''
    for ch in s:
        if ch == '(': depth += 1
        elif ch == ')': depth -= 1
        if ch == ',' and depth == 0: out.append(cur.strip()); cur = ''
        else: cur += ch
    if cur.strip(): out.append(cur.strip())
    return out


def paint_spec(v):
    """background 값 → 칠 ('solid', rgba) · ('linear', 각도, [(위치0~1, rgba)]) · ('radial', [...]) · 없으면 None"""
    if not v: return None
    m = re.search(r'(linear|radial)-gradient\((.*)\)', v, re.S)
    if not m:
        c = None
        mm = re.search(r'#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)|\b(white|black|transparent)\b', v)
        if mm: c = rgba(mm.group(0))
        return ('solid', c) if c and c[3] > 0 else None
    kind, args = m.group(1), _split_top(m.group(2))
    ang = 180.0
    if kind == 'linear' and args:
        a0 = args[0].strip().lower()
        if a0.endswith('deg'): ang = float(a0[:-3]); args = args[1:]
        elif a0.startswith('to '):
            ang = {'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270, 'to top right': 45, 'to right top': 45,
                   'to bottom right': 135, 'to right bottom': 135, 'to bottom left': 225, 'to left bottom': 225,
                   'to top left': 315, 'to left top': 315}.get(a0, 180); args = args[1:]
    elif kind == 'radial' and args and not rgba(args[0].split()[0]) and not args[0].startswith(('#', 'rgb')):
        args = args[1:]   # circle at … 같은 모양 지정은 가운데 원으로 본다
    stops = []
    for a in args:
        mm = re.match(r'(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|\w+)\s*([\d.]+%)?', a.strip())
        if not mm: continue
        c = rgba(mm.group(1))
        if c is None: continue
        stops.append([float(mm.group(2)[:-1]) / 100 if mm.group(2) else None, c])
    if not stops: return None
    if stops[0][0] is None: stops[0][0] = 0.0
    if stops[-1][0] is None: stops[-1][0] = 1.0
    for i, st in enumerate(stops):   # 위치 없는 중간 색은 고르게
        if st[0] is None:
            j = next(k for k in range(i + 1, len(stops)) if stops[k][0] is not None)
            st[0] = stops[i - 1][0] + (stops[j][0] - stops[i - 1][0]) / (j - i + 1)
    return (kind, ang, [tuple(s_) for s_ in stops]) if kind == 'linear' else ('radial', [tuple(s_) for s_ in stops])


def paint(spec, W, H):
    """칠 → W×H RGBA 그림"""
    import numpy as np
    if spec[0] == 'solid': return Image.new('RGBA', (W, H), spec[1])
    if spec[0] == 'linear':
        a = math.radians(spec[1]); dx, dy = math.sin(a), -math.cos(a)
        L = abs(W * dx) + abs(H * dy) or 1
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        t = ((xx - W / 2) * dx + (yy - H / 2) * dy) / L + 0.5
        stops = spec[2]
    else:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        t = np.sqrt(((xx - W / 2) / (W / 2 or 1)) ** 2 + ((yy - H / 2) / (H / 2 or 1)) ** 2) / math.sqrt(2)
        stops = spec[1]
    t = np.clip(t, 0, 1); pos = [p for p, _ in stops]; out = np.zeros((H, W, 4), np.float32)
    for ch in range(4):
        out[..., ch] = np.interp(t, pos, [c[ch] for _, c in stops])
    return Image.fromarray(out.astype('uint8'), 'RGBA')


def shadows(v):
    """box-shadow / text-shadow → [(x, y, 흐림, 퍼짐, rgba)] (inset 은 건너뛴다)"""
    out = []
    for part in _split_top(v or ''):
        if 'inset' in part or part.strip() in ('none', ''): continue
        mm = re.search(r'#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)|\b(white|black)\b', part)
        c = rgba(mm.group(0)) if mm else (0, 0, 0, 90)
        nums = [px(n) for n in re.findall(r'-?[\d.]+px|\b0\b', part.replace(mm.group(0), '') if mm else part)]
        nums += [0] * (4 - len(nums))
        out.append((nums[0], nums[1], nums[2], nums[3], c))
    return out


def transform(v):
    """transform → (회전 각도, 배율) — rotate(…deg) · scale(…) 만 읽는다"""
    ang, sc = 0.0, 1.0
    for fn, arg in re.findall(r'(rotate|scale)\(([^)]+)\)', v or ''):
        if fn == 'rotate':
            a = arg.strip(); ang += float(a[:-3]) if a.endswith('deg') else math.degrees(float(a[:-3])) if a.endswith('rad') else float(a[:-4]) * 360 if a.endswith('turn') else 0
        else: sc *= float(arg.split(',')[0])
    return ang, sc


# ── 아트보드 읽기 ─────────────────────────────────
class _P(HTMLParser):
    VOID = ('br', 'img', 'input', 'hr', 'meta', 'link')

    def __init__(self):
        super().__init__(); self.stack = []; self.nodes = []; self.root = None; self.in_xdc = 0; self.skip = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'x-dc': self.in_xdc += 1; return
        if not self.in_xdc: return
        if tag in ('helmet', 'style', 'script'): self.skip += 1; return
        if self.skip: return
        if tag == 'br':
            if self.stack: self.stack[-1]['text'] += '\n'
            return
        st = css(a.get('style'))
        node = {'tag': tag, 'style': st, 'text': '', 'src': a.get('src')}
        if self.root is None and 'width' in st and 'height' in st:
            self.root = node
        elif st.get('position') == 'absolute' or tag == 'img':
            self.nodes.append(node)
        if tag not in self.VOID: self.stack.append(node)

    def handle_endtag(self, tag):
        if tag == 'x-dc': self.in_xdc -= 1; return
        if tag in ('helmet', 'style', 'script') and self.skip: self.skip -= 1; return
        if self.in_xdc and not self.skip and tag not in self.VOID and self.stack: self.stack.pop()

    def handle_data(self, data):
        if self.in_xdc and not self.skip and self.stack and data.strip():
            self.stack[-1]['text'] += re.sub(r'\s+', ' ', data)


def read_board(path):
    """아트보드 파일 → (root, els)"""
    p = _P(); p.feed(open(path, encoding='utf-8').read())
    if p.root is None: raise ValueError(f'루트 div(고정 width/height)를 못 찾았어요: {path}')
    r = p.root['style']
    root = {'w': int(px(r.get('width'))), 'h': int(px(r.get('height'))),
            'bg': color(r.get('background-color') or r.get('background')) or (255, 255, 255),
            'paint': paint_spec(r.get('background') or r.get('background-color') or r.get('background-image')),
            'color': color(r.get('color')) or (0, 0, 0), 'family': r.get('font-family', 'Pretendard'),
            'word_break': r.get('word-break', '')}
    els = []
    for i, n in enumerate(p.nodes):
        s = n['style']
        e = {'id': i, 'tag': n['tag'],
             'x': px(s.get('left')), 'y': px(s.get('top')), 'w': px(s.get('width')), 'h': px(s.get('height'), None),
             'bg': paint_spec(s.get('background') or s.get('background-color') or s.get('background-image')),
             'radius': px(s.get('border-radius')),
             'bw': px(s.get('border-width')) if s.get('border-style', 'none') not in ('none', '') else 0,
             'bc': color(s.get('border-color')) or (0, 0, 0),
             'shadow': shadows(s.get('box-shadow')), 'tshadow': shadows(s.get('text-shadow')),
             'rot': transform(s.get('transform'))[0], 'scale': transform(s.get('transform'))[1],
             'opacity': float(s.get('opacity', 1) or 1), 'blur': px(re.search(r'blur\(([^)]+)\)', s.get('filter', '')).group(1)) if 'blur(' in s.get('filter', '') else 0,
             'stroke': (px(s.get('-webkit-text-stroke', '').split()[0]) if s.get('-webkit-text-stroke') else px(s.get('-webkit-text-stroke-width'))),
             'stroke_c': color(s.get('-webkit-text-stroke') or s.get('-webkit-text-stroke-color')) or (0, 0, 0),
             'ls': px(s.get('letter-spacing')) if s.get('letter-spacing', 'normal') not in ('normal', '') else 0,
             'text_fill': paint_spec(s.get('background') or s.get('background-image')) if 'text' in (s.get('background-clip', '') + s.get('-webkit-background-clip', '')) else None,
             'tcolor_a': (rgba(s['color'].strip()) or (0, 0, 0, 255))[3] if s.get('color') else 255,
             'src': n['src'], 'fit': s.get('object-fit', 'fill'),
             'text': '' if n['src'] else n['text'].strip(), 'size': px(s.get('font-size'), 16),
             'weight': int(px(s.get('font-weight'), 400)) if s.get('font-weight', '').strip() not in ('bold',) else 700,
             'lh': px(s.get('line-height'), None), 'color': color(s.get('color')) or root['color'],
             'align': s.get('text-align', 'left'), 'family': s.get('font-family') or root['family'],
             'keep_all': (s.get('word-break') or root['word_break']) == 'keep-all'}
        if e['text_fill']: e['bg'] = None
        if e['lh'] is not None and s.get('line-height', '').strip().replace('.', '').isdigit():
            e['lh'] = e['lh'] * e['size']   # 단위 없는 line-height (배수)
        els.append(e)
    return root, els


# ── 글꼴 ─────────────────────────────────────────
WEIGHTS = {'thin': 100, 'hairline': 100, 'extralight': 200, 'ultralight': 200, 'light': 300, 'regular': 400, 'normal': 400,
           'book': 400, 'medium': 500, 'semibold': 600, 'demibold': 600, 'bold': 700, 'extrabold': 800, 'ultrabold': 800,
           'heavy': 900, 'black': 900}
_reg = None
_fcache = {}


def _key(s): return re.sub(r'[^0-9a-z가-힣]', '', s.lower())


def _registry():
    """글꼴 폴더들을 훑어 {이름: [(굵기, 파일)]}"""
    global _reg
    if _reg is not None: return _reg
    _reg = {}
    for d in font_dirs():
        for f in sorted(glob.glob(os.path.join(d, '**', '*.[ot]tf'), recursive=True) + glob.glob(os.path.join(d, '**', '*.otc'), recursive=True)):
            try: fam, sty = ImageFont.truetype(f, 12).getname()
            except Exception: continue
            w = WEIGHTS.get(_key(sty), 400)
            for nm in {fam, os.path.splitext(os.path.basename(f))[0].split('-')[0]}:
                _reg.setdefault(_key(nm), []).append((w, f))
    return _reg


def font_file(family, weight=400):
    """CSS font-family 목록 · 굵기 → 글꼴 파일 (가까운 굵기) · 못 찾으면 Pretendard + missing 기록"""
    reg = _registry()
    names = [n.strip().strip('"\'') for n in (family or '').split(',') if n.strip()]
    for n in names:
        c = reg.get(_key(n))
        if c: return min(c, key=lambda wf: abs(wf[0] - weight))[1]
    if names and not any(_key(n) in ('sansserif', 'serif', 'systemui', 'monospace') for n in names[:1]):
        missing.add(f'글꼴 «{names[0]}» {weight}')
    c = reg.get('pretendard') or [(400, os.path.join(SKILL, 'assets', 'fonts', 'Pretendard-Regular.otf'))]
    return min(c, key=lambda wf: abs(wf[0] - weight))[1]


def font(e):
    k = (e['family'], e['weight'], int(e['size']))
    if k not in _fcache: _fcache[k] = ImageFont.truetype(font_file(e['family'], e['weight']), int(e['size']))
    return _fcache[k]


def fonts_used(els):
    """[(글꼴 이름, 굵기, 찾았나)] — 글자 요소만"""
    out = {}
    for e in els:
        if not e['text']: continue
        nm = [n.strip().strip('"\'') for n in e['family'].split(',')][0]
        reg = _registry()
        out[(nm, e['weight'])] = _key(nm) in reg
    return sorted((n, w, ok) for (n, w), ok in out.items())


# ── 그리기 ────────────────────────────────────────
def tlen(f, s, ls=0.0):
    """글자 폭 (자간 포함)"""
    return f.getlength(s) + ls * max(0, len(s) - 1) if ls else f.getlength(s)


def wrap(f, text, width, keep_all=False, ls=0.0):
    """CSS 줄바꿈 흉내 — 기본(normal)은 한글 글자 사이에서도 끊긴다 · keep-all 이면 띄어쓰기에서만"""
    lines = []
    for para in text.split('\n'):
        para = para.strip()
        toks = [w + ' ' for w in para.split(' ')] if keep_all else re.findall(r'[가-힣]|[^\s가-힣]+ ?| ', para)
        cur = ''
        for tk in toks:
            t = cur + tk
            if tlen(f, t.rstrip(), ls) <= width + 0.5 or not cur.strip(): cur = t
            else: lines.append(cur.rstrip()); cur = tk.lstrip()
        lines.append(cur.rstrip())
    return lines


def draw_text(d, xy, s, f, fill, anchor='ls', ls=0.0, stroke=0, stroke_c=None):
    """한 줄 그리기 — 자간이 있으면 한 자씩 (anchor 는 ls · ms · rs)"""
    sw = int(round(stroke)); sc = (stroke_c + (255,)) if stroke_c and len(stroke_c) == 3 else stroke_c
    if not ls:
        d.text(xy, s, font=f, fill=fill, anchor=anchor, stroke_width=sw, stroke_fill=sc if sw else None); return
    x, y = xy; w = tlen(f, s, ls)
    x = x - w / 2 if anchor == 'ms' else x - w if anchor == 'rs' else x
    for ch in s:
        d.text((x, y), ch, font=f, fill=fill, anchor='ls', stroke_width=sw, stroke_fill=sc if sw else None); x += f.getlength(ch) + ls


def box_h(e):
    """요소 높이 — height 가 없으면 글자 줄 수 × 줄 간격"""
    if e['h'] is not None: return e['h']
    if e['text']:
        lh = e['lh'] or e['size'] * 1.2
        return lh * max(1, len(wrap(font(e), e['text'], e['w'], e['keep_all'], e.get('ls', 0))))
    return 0


def _find_asset(src):
    m = re.search(r'/_blob/([0-9a-f]{32})', src or '')
    key = m.group(1) if m else os.path.splitext(os.path.basename(src or ''))[0]
    for d in asset_dirs():
        hit = glob.glob(os.path.join(d, key + '.*'))
        if hit: return hit[0]
    missing.add(f'그림 {src}')
    return None


def _rr_mask(W, H, r, ss=4):
    m = Image.new('L', (W * ss, H * ss), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, W * ss - 1, H * ss - 1], max(0, min(r, W / 2, H / 2)) * ss, fill=255)
    return m.resize((W, H), Image.LANCZOS)


def _img_tile(e, W, H):
    p = _find_asset(e['src'])
    if not p: return Image.new('RGBA', (W, H), (128, 128, 128, 255))
    src = Image.open(p).convert('RGBA'); sw, sh = src.size
    if e['fit'] in ('cover', 'contain'):
        k = (max if e['fit'] == 'cover' else min)(W / sw, H / sh)
        nw, nh = max(1, round(sw * k)), max(1, round(sh * k))
        tile = Image.new('RGBA', (W, H), (0, 0, 0, 0)); tile.paste(src.resize((nw, nh), Image.LANCZOS), ((W - nw) // 2, (H - nh) // 2))
        return tile
    return src.resize((W, H), Image.LANCZOS)


def _margin(e, pad=2):
    """몸통 바깥 여백 — 글자 그림자 · 흐림 · 테두리 글자 · 상자 그림자가 잘리지 않게"""
    sh = e.get('shadow', []) + e.get('tshadow', [])
    return int(max([abs(x) + abs(y) + b * 1.5 + abs(sp) for x, y, b, sp, _ in sh] + [0])
               + pad + (e.get('stroke') or 0) + (e.get('blur') or 0) * 1.5 + (e.get('size') or 0) * 0.3 * bool(e.get('text')))


def _core(e, W, H, o=0):
    """요소 몸통 (상자 그림자 · 회전 · 투명도 전) → RGBA (W+2o)×(H+2o) · 몸통은 (o, o) 에서 시작"""
    body = Image.new('RGBA', (W + 2 * o, H + 2 * o), (0, 0, 0, 0))
    if e['src']:
        tile = _img_tile(e, W, H); m = _rr_mask(W, H, e['radius'])
        tile.putalpha(Image.composite(tile.getchannel('A'), Image.new('L', (W, H), 0), m)); body.alpha_composite(tile, (o, o)); return body
    r = min(e['radius'], H / 2, W / 2)
    if e['bg']:
        fill = paint(e['bg'], W, H); m = _rr_mask(W, H, r)
        fill.putalpha(Image.composite(fill.getchannel('A'), Image.new('L', (W, H), 0), m)); body.alpha_composite(fill, (o, o))
    if e['bw']:
        ImageDraw.Draw(body).rounded_rectangle([o, o, o + W - 1, o + H - 1], r, outline=e['bc'] + (255,), width=max(1, int(e['bw'])))
    if e['text']:
        f = font(e); lh = e['lh'] or e['size'] * 1.2; asc, desc = f.getmetrics(); ls = e.get('ls', 0)
        lines = wrap(f, e['text'], e['w'], e['keep_all'], ls)
        def glyphs(fill, dx=0, dy=0, stroke=0, sc=None):
            g = Image.new('RGBA', body.size, (0, 0, 0, 0)); d = ImageDraw.Draw(g)
            for i, ln in enumerate(lines):
                base = o + i * lh + (lh - (asc + desc)) / 2 + asc + dy   # CSS 반행간 → 기준선
                x, anc = ((W / 2, 'ms') if e['align'] == 'center' else (W, 'rs') if e['align'] in ('right', 'end') else (0, 'ls'))
                draw_text(d, (o + x + dx, base), ln, f, fill, anc, ls, stroke, sc)
            return g
        for sx, sy, bl, _sp, sc in e.get('tshadow', []):   # 글자 그림자
            g = glyphs(sc, sx, sy)
            if bl: g = g.filter(ImageFilter.GaussianBlur(bl / 2))
            body.alpha_composite(g)
        if e.get('stroke'): body.alpha_composite(glyphs((0, 0, 0, 0), stroke=e['stroke'], sc=e['stroke_c']))
        if e.get('text_fill'):   # 글자 속 그라데이션 (background-clip: text) — 칠은 상자 크기 기준
            m = glyphs((255, 255, 255, 255)).getchannel('A')
            p = np.asarray(paint(e['text_fill'], W, H))   # 상자 밖으로 나간 글자 부분은 가장자리 색으로
            fill = Image.fromarray(np.pad(p, ((o, o), (o, o), (0, 0)), mode='edge'), 'RGBA')
            fill.putalpha(Image.composite(fill.getchannel('A'), Image.new('L', body.size, 0), m)); body.alpha_composite(fill)
        else:
            body.alpha_composite(glyphs(e['color'] + (e.get('tcolor_a', 255),)))
    return body


def layer(e, pad=2):
    """요소 하나 → (RGBA 조각, x, y) · 그림자 · 회전 · 배율 · 투명도 · 흐림까지 입힌 최종 모습 (한 번 그리고 저장해 쓴다)"""
    if '_layer' in e: return e['_layer']
    W, H = max(1, int(round(e['w']))), max(1, int(round(box_h(e))))
    m = _margin(e, pad)
    body = _core(e, W, H, m)
    if e.get('blur'): body = body.filter(ImageFilter.GaussianBlur(e['blur']))   # CSS blur(r) = 표준편차 r
    lay = Image.new('RGBA', body.size, (0, 0, 0, 0))
    for sx, sy, bl, sp, sc in e.get('shadow', []):   # 상자 그림자 — 몸통 모양 그대로
        a = body.getchannel('A')
        if sp: a = a.resize((max(1, int(a.width + 2 * sp)), max(1, int(a.height + 2 * sp))))
        sl = Image.new('RGBA', a.size, sc[:3] + (0,)); sl.putalpha(a.point(lambda v: v * sc[3] // 255))
        tmp = Image.new('RGBA', lay.size, (0, 0, 0, 0)); tmp.alpha_composite(sl, (int(sx - sp), int(sy - sp)))
        if bl: tmp = tmp.filter(ImageFilter.GaussianBlur(bl / 2))
        lay.alpha_composite(tmp)
    lay.alpha_composite(body)
    if e.get('opacity', 1) < 1: lay.putalpha(lay.getchannel('A').point(lambda v: int(v * e['opacity'])))
    cx, cy = e['x'] + W / 2, e['y'] + H / 2   # 회전 · 배율은 가운데 기준 (CSS 기본 transform-origin)
    if e.get('scale', 1) != 1:
        lay = lay.resize((max(1, int(lay.width * e['scale'])), max(1, int(lay.height * e['scale']))), Image.BICUBIC)
    if e.get('rot'):
        lay = lay.rotate(-e['rot'], resample=Image.BICUBIC, expand=True)   # CSS 는 시계 방향이 +
    e['_layer'] = (lay, int(round(cx - lay.width / 2)), int(round(cy - lay.height / 2)))
    return e['_layer']


def box(e):
    """요소 자리 (x, y, w, h) 정수 — 효과 사전(fx)의 box 인자로"""
    return (int(round(e['x'])), int(round(e['y'])), max(1, int(round(e['w']))), max(1, int(round(box_h(e)))))


def pic(e, bg=None):
    """요소를 자기 상자 크기 그림(RGB)으로 — 효과 사전(fx)의 그림 인자로 (punch_zoom · callout · magnifier · spotlight 등).
    그림 요소면 원본 그림 그대로 · 아니면 요소 모습을 bg(기본 흰색) 위에"""
    x, y, w, h = box(e)
    if e.get('src'):
        return _img_tile(e, w, h).convert('RGB')
    im = Image.new('RGB', (w, h), bg or (255, 255, 255)); body = _core(e, w, h)
    im.paste(body, (0, 0), body); return im


def text_lines(e):
    """글자 요소의 줄들과 기준선 — 한 자씩 · 줄마다 등장에 쓴다 → [(줄, x, 기준선, anchor)] (화면 좌표)"""
    f = font(e); lh = e['lh'] or e['size'] * 1.2; asc, desc = f.getmetrics(); out = []
    for i, ln in enumerate(wrap(f, e['text'], e['w'], e['keep_all'], e.get('ls', 0))):
        base = e['y'] + i * lh + (lh - (asc + desc)) / 2 + asc
        if e['align'] == 'center': out.append((ln, e['x'] + e['w'] / 2, base, 'ms'))
        elif e['align'] in ('right', 'end'): out.append((ln, e['x'] + e['w'], base, 'rs'))
        else: out.append((ln, e['x'], base, 'ls'))
    return out


_bgcache = {}


def background(root):
    """루트 바탕 (그라데이션이면 한 번 칠해 두고 복사)"""
    k = (root['w'], root['h'], str(root.get('paint')))
    if k not in _bgcache:
        p = root.get('paint')
        _bgcache[k] = paint(p, root['w'], root['h']).convert('RGB') if p and p[0] != 'solid' else Image.new('RGB', (root['w'], root['h']), root['bg'])
    return _bgcache[k].copy()


def draw_board(root, els, upto=None):
    """다 나온 화면 한 장 (upto = 앞에서 몇 개까지만)"""
    im = background(root)
    for e in els[:upto]:
        lay, x, y = layer(e); im.paste(lay, (x, y), lay)
    return im


# ── 메모 ─────────────────────────────────────────
def read_notes(canvas_json):
    """canvas.json 의 메모 → [{text, board, bx, by, x, y}] · board = 메모가 올라간 아트보드(틀 밖이면 가장 가까운 것)
    bx, by = 그 아트보드 안 좌표 (영상 좌표와 같다)"""
    c = json.load(open(canvas_json, encoding='utf-8'))
    boards = c.get('boards', {}); out = []
    for nid, n in (c.get('notes') or {}).items():
        if n.get('kind') in ('title1', 'rect', 'oval', 'pen', 'line', 'arrow', 'image') or 'text' not in n: continue
        x, y = n['x'], n['y']

        def dist(b):
            dx = max(b['x'] - x, 0, x - (b['x'] + b['w'])); dy = max(b['y'] - y, 0, y - (b['y'] + b['h']))
            return dx * dx + dy * dy
        name = min(boards, key=lambda k: dist(boards[k])) if boards else None
        b = boards.get(name, {'x': 0, 'y': 0})
        out.append({'id': nid, 'text': n['text'], 'board': name, 'inside': dist(b) == 0 if name else False,
                    'bx': x - b['x'], 'by': y - b['y'], 'x': x, 'y': y})
    order = c.get('order', list(boards))
    return sorted(out, key=lambda m: (order.index(m['board']) if m['board'] in order else 99, m['by']))


def near(els, bx, by):
    """아트보드 안 좌표에서 가장 가까운 요소 (메모가 어느 요소 얘기인지)"""
    def dist(e):
        h = box_h(e); dx = max(e['x'] - bx, 0, bx - (e['x'] + e['w'])); dy = max(e['y'] - by, 0, by - (e['y'] + h))
        return dx * dx + dy * dy
    return min(els, key=dist) if els else None


def summary(els):
    """요소 목록 한 줄씩 (기획서 · 점검용)"""
    rows = []
    for e in els:
        kind = '그림' if e['src'] else ('글자' if e['text'] else '도형')
        what = e['src'] if e['src'] else (e['text'].replace('\n', ' / ')[:24] if e['text'] else f"{e['bg']}")
        rows.append(f"#{e['id']:<2} {kind} ({int(e['x'])},{int(e['y'])} {int(e['w'])}×{int(box_h(e))}) {what}")
    return rows


def _clean(els):
    return [{k: v for k, v in e.items() if not k.startswith('_')} for e in els]


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: print(__doc__); sys.exit(0)
    if a[0] == 'board':
        root, els = read_board(a[1]); draw_board(root, els).save(a[2])
        if '--json' in a: json.dump({'root': root, 'els': _clean(els)}, open(a[a.index('--json') + 1], 'w'), ensure_ascii=False, indent=1)
        print('\n'.join(summary(els))); print(f'ok {len(els)}개 요소 → {a[2]}')
    elif a[0] == 'notes':
        for m in read_notes(a[1]): print(f"{m['board']} ({int(m['bx'])},{int(m['by'])}){'' if m['inside'] else ' [틀 밖]'}: {m['text']}")
    elif a[0] == 'fonts':
        allf = {}
        for p in a[1:]:
            for n, w, ok in fonts_used(read_board(p)[1]): allf[(n, w)] = ok
        for (n, w), ok in sorted(allf.items()): print(f"{'✓' if ok else '✗ 없음'}  {n} {w}")
    if missing: print('⚠ 못 찾음:', ' · '.join(sorted(missing)))
