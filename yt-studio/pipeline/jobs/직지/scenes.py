#!/usr/bin/env python3
"""「직지 상권을 찾습니다」 — 장면 코드. 두 판: JIKJI_MODE=anim (손그림 · 종이 · tale) / real (실사 · 시네마 · cinema)
장면 21개 · 나레이션 13줄(voice/01..13.wav) · 자막은 코드로 · 배경음은 엔진 생성.
  JIKJI_MODE=anim python3 scenes.py --sheet | --check | --bake   (out/직지_애니.mp4)
  JIKJI_MODE=real python3 scenes.py --bake                         (out/직지_실사.mp4)"""
import math
import os
import re
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFont

SKILL = os.environ.get('MOTION_SKILL') or '/home/user/soonryu74.github.io/.claude/skills/motion-studio'
sys.path.insert(0, os.path.join(SKILL, 'scripts'))
from core import appear, audio as AU, bake, camera as C, canvas, fx, kit, motion   # noqa: E402
from core.ease import seg, eo, eio                                                # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
MODE = os.environ.get('JIKJI_MODE', 'anim'); ANIM = MODE == 'anim'
BOARD = lambda n: os.path.join(HERE, 'canvas', MODE, n + '.dc.html')
W, H, FPS = 1920, 1080, 30
KIT = '손그림' if ANIM else '시네마'; K = kit.load(KIT)
PAL = ({'bg': (246, 239, 224), 'ink': (42, 35, 32), 'red': (181, 56, 42), 'gold': (184, 146, 62), 'white': (255, 255, 255), 'accent': (181, 56, 42), 'dim': (110, 100, 90)} if ANIM
       else {'bg': (15, 13, 11), 'ink': (242, 233, 216), 'red': (217, 83, 63), 'gold': (216, 182, 106), 'white': (255, 255, 255), 'accent': (216, 182, 106), 'dim': (168, 156, 136)})

# ── 대본 · 나레이션 ──
LINES = [l.strip() for l in open('재료/자막.srt', encoding='utf-8').read().split('\n') if l.strip() and not re.match(r'^\d+$', l) and '-->' not in l]
VOICE_OF = {0: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 8: 7, 10: 8, 11: 9, 12: 10, 14: 11, 17: 12, 18: 13}   # 장면 번호(0부터) → 대사 번호
VOFF = 0.5


def _len(p):
    with wave.open(p) as w: return w.getnframes() / w.getframerate()


VLEN = {i: _len(f'voice/{i:02d}.wav') for i in range(1, 14)}
PLAN_DUR = [7.0, 6.0, 10.0, 7.0, 4.5, 5.0, 8.0, 4.0, 6.5, 5.0, 7.0, 4.0, 12.0, 5.0, 4.5, 4.0, 5.0, 7.0, 7.0, 7.0, 5.0]
DURS = [max(d, VLEN[VOICE_OF[i]] + VOFF + 0.8) if i in VOICE_OF else d for i, d in enumerate(PLAN_DUR)]
STARTS = [sum(DURS[:i]) for i in range(len(DURS))]
SCENES = [(s, s + d) for s, d in zip(STARTS, DURS)]
DUR = SCENES[-1][1]
NAMES = [f'S{i + 1:02d}' for i in range(21)]
B = [canvas.read_board(BOARD(n)) for n in NAMES]


# ── 도우미 ──
def svgs(els): return [e for e in els if e.get('svg')]
def texts(els): return [e for e in els if e.get('text')]
def imgs(els): return [e for e in els if e.get('src')]
def boxes(els): return [e for e in els if not e.get('text') and not e.get('src') and not e.get('svg')]


def _union(es):
    if not es: return (0, 0, W, H)
    x0 = min(e['x'] for e in es); y0 = min(e['y'] for e in es)
    x1 = max(e['x'] + e['w'] for e in es); y1 = max(e['y'] + canvas.box_h(e) for e in es)
    return (x0, y0, x1 - x0, y1 - y0)


_CF = {}


def _font(pt):
    if pt not in _CF: _CF[pt] = ImageFont.truetype('fonts/Pretendard-Bold.otf', pt)
    return _CF[pt]


def caption(img, text, k):
    """자막 — 화면 아래 · k = 투명도 진행"""
    if k <= 0: return img
    f = _font(44); d = ImageDraw.Draw(img, 'RGBA')
    words = text.split(' '); lines, cur = [], ''
    for w_ in words:
        t = (cur + ' ' + w_).strip()
        if f.getlength(t) > W * 0.78 and cur: lines.append(cur); cur = w_
        else: cur = t
    lines.append(cur)
    lh = 60; y0 = H - 60 - lh * len(lines); a = int(255 * eo(k))
    for i, ln in enumerate(lines):
        tw = f.getlength(ln); x = (W - tw) / 2; y = y0 + i * lh
        if ANIM:
            d.rounded_rectangle([x - 22, y - 6, x + tw + 22, y + lh - 2], 10, fill=(246, 239, 224, int(a * 0.86)))
            d.text((x, y + 4), ln, font=f, fill=PAL['ink'] + (a,))
        else:
            d.rounded_rectangle([x - 22, y - 6, x + tw + 22, y + lh - 2], 10, fill=(0, 0, 0, int(a * 0.55)))
            d.text((x, y + 4), ln, font=f, fill=(255, 255, 255, a))
    return img


def with_caption(img, i, lt):
    if i in VOICE_OF:
        v = VOICE_OF[i]; a, b = VOFF, VOFF + VLEN[v] + 0.4
        if a - 0.3 <= lt < b: img = caption(img, LINES[v - 1], min(seg(lt, a - 0.3, a + 0.1), 1 - seg(lt, b - 0.3, b)))
    return img


def still(root, els, key):
    return bake.memo(key, lambda: canvas.draw_board(root, els))


# ═══ 손그림 판 — 선이 그려지고 글이 써진다 ═══
def anim_scene(i, lt, root, els):
    """전단 위에 차례로: 사진이 툭 붙고(pop) · 선이 그려지고(draw_on) · 제목이 써진다(write) — 아트보드 순서가 등장 순서"""
    img = canvas.background(root)
    dur = DURS[i]; q = motion.steps(lt, 12)
    tx = texts(els); title = max(tx, key=lambda e: e['size']) if tx else None
    items = [e for e in els if not e.get('text')]
    budget = min(dur * 0.62, 1.0 + 1.1 * len(items)); t0 = 0.2
    per = (budget - 0.2) / max(1, len(items))
    for e in items:
        if e.get('svg'):
            big = e['w'] * canvas.box_h(e) > W * H * 0.04
            d = per * (1.4 if big else 0.6)
            motion.draw_on(img, e, seg(q, t0, t0 + d), stagger=0.5, t=q, fill_in='fade')
        elif e.get('src') and e['w'] >= W * 0.9:                      # 바탕 사진(지도 · 열람실)은 서서히
            appear.put(img, e, seg(lt, t0, t0 + 0.9), 'fade'); d = per * 0.5
        else:                                                           # 사진 틀 · 사진 · 그늘 → 툭 붙는다
            appear.put(img, e, seg(lt, t0, t0 + 0.4), 'pop'); d = per * 0.35
        t0 += d * 0.8
    for e in tx:
        if e is title: motion.write(img, e, seg(lt, 0.4, min(dur * 0.45, 0.4 + 0.08 * len(e['text']) + 0.6)))
        else:
            k = tx.index(e); t1 = 0.9 + 0.25 * k
            if e['family'].startswith("'Pen"): appear.put(img, e, seg(lt, t1 + 0.6, t1 + 1.2), 'fade')
            else: appear.put(img, e, seg(lt, t1, t1 + 0.5), 'up', dist=24)
    pics = [e for e in items if e.get('svg') or (e.get('src') and e['w'] < W * 0.9)]
    draw_box = _union(pics) if pics else _union(tx)
    if draw_box[2] * draw_box[3] < W * H * 0.12: draw_box = _union(pics + tx)
    kind = i % 4
    if i == 7:                                                          # 지도 위 이동: 전체 → 사진 셋으로 천천히
        ph = [e for e in items if e.get('src') and e['w'] < W * 0.9]
        c = C.keys(lt, [(0, C.full(img)), (dur * 0.45, C.full(img)), (dur, C.on(_union(ph), img, fill=0.92, dy=-0.02), '부드럽게')])
    elif kind == 0:
        c = C.keys(lt, [(0, C.on(draw_box, img, fill=0.8)), (budget + 0.4, C.full(img), '부드럽게')])
        c = C.drift(c, max(0, lt - budget - 0.4), dur, amt=0.02)
    elif kind == 1:
        c = C.keys(lt, [(0, C.full(img)), (0.3, C.full(img)), (dur - 0.6, C.on(draw_box, img, fill=0.72), '부드럽게')])
    elif kind == 2:
        c = C.drift(C.full(img), lt, dur, amt=0.05, dir=1, side=70)
    else:
        c = C.keys(lt, [(0, C.full(img)), (dur, C.on(draw_box, img, fill=0.85), '선형')])
    out = C.shoot(img, c, (W, H))
    return with_caption(out, i, lt)


# ═══ 실사 판 — 사진 위를 카메라가 흐르고 글은 또렷해진다 ═══
def real_scene(i, lt, root, els):
    dur = DURS[i]; ims, tx, bx = imgs(els), texts(els), boxes(els)
    base = still(root, ims + bx, f'r{i}-bg')                   # 사진 + 그늘은 한 번만
    img = base.copy()
    title = max(tx, key=lambda e: e['size']) if tx else None
    for k_, e in enumerate(tx):
        t0 = 0.6 + 0.3 * k_
        if e is title: appear.lines(img, e, seg(lt, t0, t0 + 0.9), stag=0.3, rise=30) if '<br>' in e.get('text', '') or e['size'] > 70 else motion.blur_in(img, e, seg(lt, t0, t0 + 0.8), amt=18)
        else: appear.put(img, e, seg(lt, t0, t0 + 0.6), 'fade')
    if ims and len(ims) == 2:      # 두 컷 — 왼쪽 반 → 오른쪽 반 (중간에 컷)
        h = dur / 2
        L_, R_ = C.on(ims[0], img, fill=1.0), C.on(ims[1], img, fill=1.0)
        c = C.keys(lt, [(0, L_), (h, C.on(ims[0], img, fill=1.08)), (h, R_), (dur, C.on(ims[1], img, fill=1.08), '선형')])
    elif ims:                      # 한 컷 — 켄번스: 밀고 들어가기 · 훑기 번갈아
        if i % 2 == 0: c = C.keys(lt, [(0, C.full(img)), (dur, C.at(W / 2 + 40, H / 2 - 20, 1.12), '선형')])
        else: c = C.keys(lt, [(0, C.at(W / 2 - 60, H / 2, 1.1)), (dur, C.at(W / 2 + 60, H / 2, 1.1), '선형')])
    else:                          # 카드 — 글 묶음으로 천천히
        c = C.keys(lt, [(0, C.full(img)), (0.2, C.full(img)), (dur, C.on(_union(tx + bx), img, fill=0.9), '선형')])
    out = C.shoot(img, c, (W, H))
    return with_caption(out, i, lt)


SCENE = anim_scene if ANIM else real_scene
LEVEL = [3, 2, 2, 1, 1, 1, 2, 1, 1, 1, 2, 2, 3, 1, 1, 1, 2, 2, 2, 3, 1]
PLAN = []
for i in range(21):
    if ANIM:
        PLAN.append({'level': LEVEL[i], 'camera': [['천천히 흐르기', '밀고 들어가기', '훑기', '천천히 흐르기'][i % 4]], 'enter': ['draw_on', 'write', 'up'], 'emph': [], 'kick': None,
                     'borrow': '밀고 들어가기는 기본 움직임' if i % 4 == 1 else None})
    else:
        PLAN.append({'level': LEVEL[i], 'camera': ['밀고 들어가기' if i % 2 == 0 else '훑기'], 'enter': ['lines', 'blur_in', 'fade'], 'emph': [], 'kick': None,
                     'borrow': '사진 위 켄번스 훑기 — 다큐 느낌' if i % 2 else None})
EDIT = K.cuts([p['level'] for p in PLAN[1:]])
if not ANIM:
    for j in EDIT:
        if EDIT[j][0] in ('impact', 'flash', 'zoom_through', 'whip', 'zoom_blur'): EDIT[j] = ('dip', 0.5, {'col': (0, 0, 0)})   # 공모전 톤: 쾅 대신 검은 담금
        elif EDIT[j][0] == 'cut': EDIT[j] = ('dissolve', 0.6, {})
    EDIT[12] = ('dip', 0.6, {'col': (0, 0, 0)}); EDIT[19] = ('dip', 0.8, {'col': (0, 0, 0)})
else:
    for j in EDIT:
        if EDIT[j][0] in ('drop',): EDIT[j] = ('clock', 0.6, {})
    EDIT[12] = ('clock', 0.7, {}); EDIT[19] = ('reveal', 0.6, {'dir': 'left'})


def render(k, t, xf=0.0):
    root, els = B[k]; lt = t - STARTS[k] + (xf / 2 if k > 0 else 0)
    return SCENE(k, lt, root, els)


def frame(t):
    k = max(i for i, s in enumerate(STARTS) if s <= t + 1e-9)
    for j in (k, k + 1):
        if j in EDIT:
            name, xf, opt = EDIT[j]
            if abs(t - STARTS[j]) < xf / 2:
                a = render(j - 1, STARTS[j] - xf / 2, EDIT.get(j - 1, ('', 0))[1]); b_ = render(j, t, xf)
                return K.finish(K.edit(name, a, b_, (t - (STARTS[j] - xf / 2)) / xf, **opt), t)
    return K.finish(render(k, t, EDIT.get(k, ('', 0, {}))[1]), t)


def build_audio(path):
    rng = np.random.default_rng(3); sfx = AU.new_track(DUR)
    for j, (name, xf, _) in EDIT.items():
        if name in ('dip', 'clock', 'reveal', 'cover'): AU._put(sfx, AU.whoosh(rng, 0.5, 0.12, 900), STARTS[j] - xf / 2)
    AU.chime(sfx, STARTS[1] + 0.3, g=0.12); AU.chime(sfx, STARTS[19] + 0.4, base=783.99, g=0.16)
    AU.hit(sfx, rng, STARTS[12] + 0.2, 0.3)                                          # 클라이맥스 들어갈 때 낮게 쿵
    try:
        bg = AU.bgm([(0, STARTS[2], 'intro', {}), (STARTS[2], STARTS[12], 'calm', {}), (STARTS[12], STARTS[13], 'build', {}),
                     (STARTS[13], STARTS[19], 'calm', {}), (STARTS[19], DUR, 'outro', {'hit': STARTS[19] + 0.4})],
                    DUR, seed=11, bpm=68, palette=K.music, drum_gain=0.12)
    except BaseException as e:
        print('배경음 없이:', e); bg = None
    voices = [(STARTS[i] + VOFF, f'voice/{v:02d}.wav') for i, v in VOICE_OF.items()]
    return AU.mixdown(DUR, path, bg, sfx, voices, bgm_gain=0.26, sfx_gain=0.5, voice_gain=0.9, duck=0.45)


if __name__ == '__main__':
    bake.cli(sys.modules[__name__], out=os.path.join(HERE, 'out', '직지_애니.mp4' if ANIM else '직지_실사.mp4'), audio=build_audio)
    if canvas.missing: print('⚠ 못 찾음:', ' · '.join(sorted(canvas.missing)))
