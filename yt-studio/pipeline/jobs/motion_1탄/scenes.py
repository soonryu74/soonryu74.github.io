#!/usr/bin/env python3
"""1탄 · 동영상으로 먼저 보기 — 장면 코드 (키트 «차분» · 16:9 · 킥: 장면 2 «아니지~ 다시»)

구조: 장면 1 · 3~9 = 아트보드 그대로를 «찍는» 카메라 + 키트 안 등장 · 강조
      장면 2 = 한 아트보드 안의 두 갈래 (왼쪽 A 흔한 길 / 오른쪽 B 바른 길) → timewarp 지도로 되감기
      배경음 = study 팔레트 · 나레이션은 아직 없음(미리보기)

작업 폴더에서:  python3 scenes.py --sheet  ·  --check  →  python3 scenes.py --bake
"""
import math
import os
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw

SKILL = os.environ.get('MOTION_SKILL') or '/home/user/soonryu74.github.io/.claude/skills/motion-studio'
sys.path.insert(0, os.path.join(SKILL, 'scripts'))

from core import appear, audio as AU, bake, camera as C, canvas, fx, kit, motion   # noqa: E402
from core import timewarp as TW                                                   # noqa: E402
from core.ease import seg, eo, eio                                                # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
BOARD = lambda n: os.path.join(HERE, 'canvas', '확정', n)
W, H, FPS = 1920, 1080, 30
KIT = '차분'; K = kit.load(KIT)
PAL = {'bg': (251, 250, 246), 'txt': (36, 60, 55), 'dim': (125, 134, 131), 'white': (255, 255, 255),
       'accent': (180, 84, 27), 'red': (214, 72, 72), 'panel': (20, 20, 31), 'line': (215, 223, 216)}

# ── 장면 (아트보드 · 길이) — 나레이션이 들어오면 길이를 대사에 맞춰 늘린다 ──
SC = [('Main.dc.html', 3.6), ('Scene02.dc.html', 0.0), ('Scene03.dc.html', 4.2), ('Scene04.dc.html', 4.6),
      ('Scene05.dc.html', 4.0), ('Scene06.dc.html', 4.0), ('Scene07.dc.html', 4.0), ('Scene08.dc.html', 6.0), ('Scene09.dc.html', 4.6)]
B = [canvas.read_board(BOARD(n)) for n, _ in SC]


# ── 그리기 도우미 ──
def tri(img, x, y, half, depth, col):
    """CSS border 삼각형(재생 ▶) — 0×0 요소라 캔버스 파서가 못 그려 직접 그린다"""
    ImageDraw.Draw(img).polygon([(x, y - half), (x, y + half), (x + depth, y)], fill=col)
    return img


def tri_k(img, x, y, half, depth, col, k, cx=None, cy=None):
    """▶ 가 k(0→1)로 커지며 나타난다"""
    k = max(0.0, min(1.0, k))
    if k <= 0: return img
    s = eo(k); cx = cx if cx is not None else x + depth / 3; cy = cy if cy is not None else y
    pts = [(x, y - half), (x, y + half), (x + depth, y)]
    pts = [(cx + (px - cx) * s, cy + (py - cy) * s) for px, py in pts]
    o = Image.new('RGBA', img.size, (0, 0, 0, 0)); ImageDraw.Draw(o).polygon(pts, fill=col + (int(255 * min(1, k * 2)),))
    base = img.convert('RGBA'); base.alpha_composite(o); img.paste(base.convert('RGB')); return img


def _union(es):
    if not es: return None
    x0 = min(e['x'] for e in es); y0 = min(e['y'] for e in es)
    x1 = max(e['x'] + e['w'] for e in es); y1 = max(e['y'] + canvas.box_h(e) for e in es)
    return (x0, y0, x1 - x0, y1 - y0)


def by_text(els, s): return next(e for e in els if s in (e['text'] or ''))


def is_tri(e): return e['w'] == 0 and e['h'] == 0


# ═══ 장면 1 — 훅: «설치는 아직 하지 마세요.» ═══
# 카메라가 제목에 바짝 붙어 있다가(무슨 말인지 궁금하게) 빠지며 전체 공개 → 머무는 동안 천천히 흐르기
def s1(lt, root, els):
    img = canvas.background(root)
    wm = els[0]; tag = els[1]; title = els[2]; bar = els[3]; sub = els[4]
    appear.put(img, wm, seg(lt, 0.0, 1.2), 'fade')                    # 바탕 «01» 은 천천히 배어 나온다
    appear.lines(img, title, seg(lt, 0.0, 1.1), stag=0.35, rise=30)    # 제목은 줄마다 올라온다 (키트 lines)
    appear.put(img, tag, seg(lt, 1.3, 1.7), 'fade')
    appear.put(img, bar, seg(lt, 1.5, 1.9), 'wipe', dir='left')
    appear.put(img, sub, seg(lt, 1.7, 2.1), 'fade')
    c = C.keys(lt, [(0, C.on(title, img, fill=1.25, dy=0.02)), (1.5, C.full(img), '부드럽게')])
    return C.shoot(img, C.drift(c, max(0, lt - 1.5), 2.5, amt=0.025), (W, H))


# ═══ 장면 2 — 킥 «아니지~ 다시»: 한 아트보드 안의 두 갈래 ═══
R2, E2 = B[1]
HEAD = [e for e in E2 if e['y'] < 300]                                   # 출발 화면: «출발점은 같아요 / 어디서부터 시작할까요?»
DIV = [e for e in E2 if 1000 <= e['x'] < 1020 and not e['text']]        # 가운데 세로선 — 출발 화면에 둔다
A_ONLY = sorted([e for e in E2 if e['y'] >= 300 and e['x'] < 1000], key=lambda e: (e['x'] > 500, e['y'], e['x']))
B_ONLY = sorted([e for e in E2 if e['y'] >= 300 and e['x'] >= 1020 and not is_tri(e)], key=lambda e: (e['y'], e['x']))
A_X = by_text(A_ONLY, '✕'); A_ONLY = [e for e in A_ONLY if e is not A_X]   # ✕ 는 멈춤 때 찍는다 (아트보드 자리에)
A_TERM = [e for e in A_ONLY if 540 <= e['x'] <= 920 and e['y'] >= 400 and e['y'] <= 640]   # 터미널 창 · 점 셋 · 에러 글
A_STEP = [e for e in A_ONLY if e not in A_TERM]                           # 흔한 길 · 설치 · → · 설명
B_TRI = next(e for e in E2 if is_tri(e))
GAP_A, GAP_B = 0.42, 0.5
A_T0 = 0.5
A_END = A_T0 + (len(A_STEP) - 1) * GAP_A + 2.0                           # 터미널까지 다 쌓이고 조금 더
B0 = A_END + 4.0
B_DUR = 0.4 + len(B_ONLY) * GAP_B + 2.4
BOX_A, BOX_B = _union(A_STEP + A_TERM), _union(B_ONLY)


def head_img():
    """출발 화면 — 한 번만 그린다"""
    return bake.memo('s2-head', lambda: canvas.draw_board(R2, HEAD + DIV))


def scene_A(lt):
    """흔한 길: 설치 → 화살표 → 터미널 창이 열리고 에러가 쌓인다 — 카메라는 조금씩 다가가며 불안해진다"""
    img = head_img().copy()
    tt = A_T0 + (len(A_STEP) - 1) * GAP_A                                 # 터미널이 열리는 때
    for i, e in enumerate(A_STEP):
        t0 = tt + 1.3 if e['y'] > 600 else A_T0 + i * GAP_A              # 설명 줄은 에러가 쏟아진 뒤에
        appear.put(img, e, seg(lt, t0, t0 + 0.35), 'up' if e['text'] and e['bg'] is None else 'pop', dist=30)
    for e in A_TERM:
        if e['text']: appear.type_text(img, e, seg(lt, tt + 0.3, tt + 1.4))        # 에러 줄이 타자처럼 쏟아진다
        else: appear.put(img, e, seg(lt, tt, tt + 0.3), 'pop')
    tgt = C.on(BOX_A, img, fill=0.8, dy=-0.03)
    c = C.keys(lt, [(0, C.full(img)), (A_END, tgt, '선형')])
    return C.shoot(img, C.handheld(c, lt, amp=1.5 + 5 * min(1, lt / A_END)), (W, H))


def scene_B(lt):
    """바른 길: 같은 출발점에서 재생 버튼이 켜지고 «먼저, 보기» → ↓ 설치는 2탄에서 — 카메라는 차분히 다가갔다가 다 되면 빠진다"""
    img = head_img().copy()
    play = B_ONLY[1]                                                       # 재생 원
    for i, e in enumerate(B_ONLY):
        t0 = 0.4 + i * GAP_B
        if e is play: appear.put(img, e, seg(lt, t0, t0 + 0.4), 'pop'); tri_k(img, 1150, 485, 40, 64, PAL['white'], seg(lt, t0 + 0.15, t0 + 0.5))
        elif e['bg'] is None and e['size'] > 60: motion.blur_in(img, e, seg(lt, t0, t0 + 0.5), amt=18)
        else: appear.put(img, e, seg(lt, t0, t0 + 0.4), 'fade')
    done = 0.4 + len(B_ONLY) * GAP_B
    if lt > done:                                                          # 강조 하나: «먼저, 보기» 에 밑줄
        motion.underline(img, by_text(B_ONLY, '먼저'), seg(lt, done, done + 0.6), col=PAL['accent'], width=8, pad=4)
    near = C.on(BOX_B, img, fill=0.8, dy=-0.03)
    c = C.keys(lt, [(0, C.full(img)), (0.6, near, '부드럽게'), (done, near), (done + 0.8, C.full(img), '부드럽게')])
    return C.shoot(img, C.drift(c, max(0, lt - done - 0.8), 2.0, amt=0.02), (W, H))


def src_frame(s):
    if s < B0 - 1: return scene_A(min(max(s, 0), A_END))
    return scene_B(s - B0)


WARP = TW.Warp([('play', A_END), ('stop', 0.25), ('hold', 1.3), ('to', 0.0, 1.3), ('cut', B0), ('play', B0 + B_DUR)])
HOLD0 = WARP.start_of('hold'); REW0 = WARP.start_of('rewind')
SC[1] = (SC[1][0], WARP.DUR)


def s2(lt, root, els):
    s, kind, tau, d = WARP.at(lt)
    img = TW.render(WARP, lt, src_frame, fps=FPS, rewind_look='clean', flash=(255, 240, 230))   # 차분 톤: 줄무늬 없이 흐림만 · 번쩍은 옅게
    if kind == 'hold':
        img = TW.stamp_x(img, tau / 0.16, center=(760, 390), r=150, col=PAL['red'])   # ✕ 는 아트보드의 자리에 (터미널 위)
        if tau < 0.3:
            a = 10 * (1 - tau / 0.3)
            img = img.transform(img.size, Image.AFFINE, (1, 0, a * math.sin(tau * 90), 0, 1, a * math.cos(tau * 70)), fillcolor=PAL['bg'])
    elif kind == 'rewind' and tau < 0.25:
        img = TW.stamp_x(img, 1, alpha=1 - tau / 0.25, center=(760, 390), r=150, col=PAL['red'])
    return img


# ═══ 장면 3 — 숫자 하나: «1시간 7분» ═══
def s3(lt, root, els):
    img = canvas.background(root)
    lab, num, sub, chip = els[0], els[1], els[2], els[3]
    appear.put(img, lab, seg(lt, 0.0, 0.4), 'fade')
    motion.blur_in(img, num, seg(lt, 0.2, 0.9), amt=26)                   # 큰 숫자는 흐림에서 또렷하게 (키트 blur_in)
    appear.put(img, sub, seg(lt, 1.0, 1.4), 'fade')
    appear.put(img, chip, seg(lt, 1.6, 2.0), 'fade')
    if lt > 2.1: motion.highlight(img, chip, seg(lt, 2.1, 2.7), col=(255, 226, 150), alpha=0.5, pad=6)   # 강조 하나: 합계 칩
    c = C.keys(lt, [(0, C.full(img)), (0.2, C.full(img)), (2.0, C.on(num, img, fill=0.72, dy=-0.06), '부드럽게')])   # 밀고 들어가기
    return C.shoot(img, C.drift(c, max(0, lt - 2.0), 2.5, amt=0.02), (W, H))


# ═══ 장면 4~7 — 순서 카드 (같은 틀 · 찍는 법은 네 번 다 다르게) ═══
def _card(lt, root, els, mode, i_scene):
    img = canvas.background(root)
    lab, num, title, chan, pill, note = els[0], els[1], els[2], els[3], els[4], els[5]
    circle = next(e for e in els if e['w'] == 220); tri_e = next(e for e in els if is_tri(e))
    dots = [e for e in els if e['w'] == 28]; cnt = els[-1]
    appear.put(img, lab, 1, 'none')
    for e in dots: appear.put(img, e, 1, 'none')
    appear.put(img, cnt, seg(lt, 0.2, 0.5), 'fade')
    appear.put(img, num, seg(lt, 0.0, 0.45), 'pop' if mode == 0 else 'fade')
    if mode == 1: motion.blur_in(img, title, seg(lt, 0.25, 0.9), amt=20)
    elif mode == 3: appear.put(img, title, seg(lt, 0.25, 0.8), 'fade')
    else: appear.lines(img, title, seg(lt, 0.25, 0.95), stag=0.3, rise=36)
    appear.put(img, chan, seg(lt, 0.9, 1.3), 'fade')
    appear.put(img, pill, seg(lt, 1.2, 1.6), 'left' if mode in (1, 3) else ('up' if mode == 2 else 'fade'), dist=40)
    appear.put(img, note, seg(lt, 1.4, 1.8), 'fade')
    appear.put(img, circle, seg(lt, 0.6, 1.0), 'fade')
    tri_k(img, 1640, 380, 50, 80, PAL['accent'], seg(lt, 0.8, 1.2))
    if mode == 0:            # 번호 원에 바짝 → 빠지며 전체 → 흐르기
        c = C.keys(lt, [(0, C.on(num, img, fill=1.1)), (1.0, C.full(img), '부드럽게')])
        c = C.drift(c, max(0, lt - 1.0), 3.0, amt=0.02)
    elif mode == 1:          # 전체 → 초점 옮기기: 제목만 또렷 → 다시 전체
        if 1.9 < lt < 3.1: img = C.defocus(img, [title, num], 7)
        c = C.keys(lt, [(0, C.full(img)), (1.9, C.on(_union([num, title]), img, fill=1.0, dx=0.06, dy=-0.08), '부드럽게'), (3.0, C.on(_union([num, title]), img, fill=1.0, dx=0.06, dy=-0.08)), (3.8, C.full(img), '부드럽게')])
    elif mode == 2:          # 밀고 들어가기 — 알약(8분)으로 천천히, 알약에 밑줄 강조
        if lt > 2.2: motion.underline(img, pill, seg(lt, 2.2, 2.8), col=PAL['accent'], width=6, pad=6)
        c = C.keys(lt, [(0, C.full(img)), (1.4, C.full(img)), (3.6, C.on(_union([num, title, chan, pill, note]), img, fill=1.0, dx=0.03, dy=-0.06), '부드럽게')])
    else:                    # 옆으로 흐르기(훑기): 재생 버튼 쪽에서 시작해 왼쪽 제목으로
        if lt > 2.4: img = fx.shine(img, lt - 2.4, canvas.box(pill), PAL, [])
        c = C.keys(lt, [(0, C.on(circle, img, fill=0.5, dx=0.1)), (1.6, C.full(img), '부드럽게')])
        c = C.drift(c, max(0, lt - 1.6), 2.5, amt=0.02)
    return C.shoot(img, c, (W, H))


def s4(lt, root, els): return _card(lt, root, els, 0, 4)
def s5(lt, root, els): return _card(lt, root, els, 1, 5)
def s6(lt, root, els): return _card(lt, root, els, 2, 6)
def s7(lt, root, els): return _card(lt, root, els, 3, 7)


# ═══ 장면 8 — 네 갈래 지도: 선이 그어지고 갈래가 하나씩 켜진다 · 카메라는 왼쪽에서 오른쪽으로 훑는다 ═══
def s8(lt, root, els):
    img = canvas.background(root)
    lab, title, chip, line = els[0], els[1], els[2], els[3]
    cols = [els[4:7], els[7:10], els[10:13], els[13:16]]; foot = els[16]
    appear.put(img, lab, seg(lt, 0.0, 0.4), 'fade')
    motion.blur_in(img, title, seg(lt, 0.1, 0.7), amt=18)
    appear.put(img, chip, seg(lt, 0.7, 1.1), 'pop')
    appear.put(img, line, seg(lt, 0.9, 1.9), 'wipe', dir='left')          # 길이 왼쪽에서 오른쪽으로 그어진다
    for i, col in enumerate(cols):
        t0 = 1.1 + i * 0.55
        appear.put(img, col[0], seg(lt, t0, t0 + 0.35), 'pop')
        appear.put(img, col[1], seg(lt, t0 + 0.2, t0 + 0.6), 'fade')
        appear.put(img, col[2], seg(lt, t0 + 0.45, t0 + 0.8), 'pop')
    appear.put(img, foot, seg(lt, 3.6, 4.0), 'fade')
    if lt > 3.3: motion.highlight(img, cols[0][1], seg(lt, 3.3, 3.9), col=(255, 226, 150), alpha=0.5, pad=6)   # 강조 하나: ① 첫 1시간용 (이 영상이 다룬 갈래)
    left = C.on(_union(cols[0] + cols[1]), img, fill=0.6, dy=0.0); right = C.on(_union(cols[2] + cols[3]), img, fill=0.6, dy=0.0)
    c = C.keys(lt, [(0, C.full(img)), (1.0, C.full(img)), (2.0, left, '부드럽게'), (2.6, left), (3.4, right, '부드럽게'), (4.2, right), (5.2, C.full(img), '부드럽게')])
    return C.shoot(img, c, (W, H))


# ═══ 장면 9 — 마무리: ✓ · «보고 나서, 2탄에서 설치해요.» ═══
def s9(lt, root, els):
    img = canvas.background(root)
    wm, chk, title, bar, foot = els
    appear.put(img, wm, seg(lt, 0.0, 1.5), 'fade')
    appear.put(img, chk, seg(lt, 0.1, 0.5), 'pop')
    appear.lines(img, title, seg(lt, 0.4, 1.3), stag=0.35, rise=30)
    appear.put(img, bar, seg(lt, 1.4, 1.8), 'wipe', dir='left')
    appear.put(img, foot, seg(lt, 1.7, 2.1), 'fade')
    c = C.keys(lt, [(0, C.on(title, img, fill=1.05, dy=-0.02)), (1.8, C.full(img), '부드럽게')])
    return C.shoot(img, C.drift(c, max(0, lt - 1.6), 3.0, amt=-0.02), (W, H))   # 끝은 아주 천천히 빠진다


SCENE_FN = [s1, s2, s3, s4, s5, s6, s7, s8, s9]
DURS = [d for _, d in SC]
STARTS = [sum(DURS[:i]) for i in range(len(DURS))]
SCENES = [(s, s + d) for s, d in zip(STARTS, DURS)]
DUR = SCENES[-1][1]

# 기획서 §5 → --check
PLAN = [
    {'level': 2, 'camera': ['빠지며 공개', '천천히 흐르기'], 'enter': ['lines', 'fade'], 'emph': [], 'kick': None, 'borrow': '훅은 제목에 붙었다 빠지며 공개(팝 키트) — 첫 1초에 무슨 말인지 궁금하게'},
    {'level': 3, 'camera': ['손에 든 카메라', '밀고 들어가기'], 'enter': ['pop', 'up', 'blur_in'], 'emph': ['underline'], 'kick': '아니지~ 다시', 'borrow': '두 갈래 이야기 — 팝 키트의 아니지~ 다시 · A 갈래의 불안한 손에 든 카메라'},
    {'level': 1, 'camera': ['밀고 들어가기'], 'enter': ['blur_in', 'fade'], 'emph': ['highlight'], 'kick': None},
    {'level': 2, 'camera': ['빠지며 공개', '천천히 흐르기'], 'enter': ['pop', 'lines', 'fade'], 'emph': [], 'kick': None, 'borrow': '번호 원에 붙었다 빠지며 공개 — 순서 ①의 시작'},
    {'level': 1, 'camera': ['초점 옮기기'], 'enter': ['fade', 'blur_in', 'left'], 'emph': [], 'kick': None, 'borrow': '알약은 왼쪽에서 밀려 들어온다(left) — 카드 넷이 같은 등장으로 보이지 않게'},
    {'level': 1, 'camera': ['밀고 들어가기'], 'enter': ['fade', 'lines', 'up'], 'emph': ['underline'], 'kick': None},
    {'level': 2, 'camera': ['훑기', '천천히 흐르기'], 'enter': ['fade', 'left'], 'emph': ['shine'], 'kick': None, 'borrow': '재생 버튼에서 제목으로 훑기 — 네 번째 카드는 반대쪽에서 · 알약 left 는 장면 5와 짝'},
    {'level': 2, 'camera': ['시선 옮기기'], 'enter': ['blur_in', 'pop', 'fade', 'wipe'], 'emph': ['highlight'], 'kick': None, 'borrow': '네 갈래를 왼쪽 둘 → 오른쪽 둘로 시선 옮기기 (지도를 읽는 눈)'},
    {'level': 3, 'camera': ['빠지며 공개', '천천히 흐르기'], 'enter': ['pop', 'lines', 'fade'], 'emph': [], 'kick': None, 'borrow': '마무리도 한 마디에 붙었다 빠진다 — 훅과 짝'},
]
EDIT = K.cuts([p['level'] for p in PLAN[1:]])
EDIT[1] = ('dip', 0.4, {'col': (255, 255, 255)})       # 훅 → 킥: 흰 담금 (세기 3)
EDIT[2] = ('dissolve', 0.5, {})                        # 킥 → 숫자: 디졸브
EDIT[8] = ('dip', 0.4, {'col': (255, 255, 255)})       # 지도 → 마무리: 흰 담금


def render(k, t, xf=0.0):
    root, els = B[k]; lt = t - STARTS[k] + (xf / 2 if k > 0 else 0)
    return SCENE_FN[k](lt, root, els)


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
    """배경음(study · 차분) 한 줄로 · 장면 2 의 효과음만 원본 시간으로 만들어 지도에 태운다 · 차임은 출력 시각에"""
    rng = np.random.default_rng(11); sfx = AU.new_track(DUR); SR = AU.SR
    # 장면 2: 원본 시간의 효과음 (A 쌓기 = 어긋난 음 · B 쌓기 = 오르는 음) → 지도로 되감기
    src_dur = B0 + B_DUR; s2x = AU.new_track(src_dur)
    for i in range(len(A_STEP) + 1): AU._put(s2x, AU.mallet(AU._f([0, 3, 1, 6, 2][i % 5] + 12, 261.63), 0.25), A_T0 + i * GAP_A, 0.22)
    for i in range(len(B_ONLY)): AU._put(s2x, AU.mallet(AU._f([0, 4, 7, 12, 16, 19][i % 6] + 7, 261.63), 0.6), B0 + 0.4 + i * GAP_B, 0.3)
    warped = TW.audio(WARP, s2x.astype(np.float32), SR)[:, 0]
    a0 = int(STARTS[1] * SR); n = min(len(warped), len(sfx) - a0); sfx[a0:a0 + n] += warped[:n]
    bz = TW.buzzer(SR, g=0.09); h0 = int((STARTS[1] + HOLD0) * SR); sfx[h0:h0 + len(bz)] += bz      # 삐 — 세기 2 로 누른다
    AU.hit(sfx, rng, STARTS[1] + HOLD0, 0.45)
    AU.chime(sfx, STARTS[1] + REW0 + 1.3 + 0.4, g=0.18)                                              # B 갈래 시작의 차임
    for j in (2, 3, 7, 8): AU.chime(sfx, STARTS[j] + 0.3, g=0.14)                                     # 장면 들어올 때 차임 (키트 enter=chime)
    AU.chime(sfx, STARTS[8] + 0.5, base=1318.5, g=0.2)
    try:
        bg = AU.bgm([(0, STARTS[1], 'intro', {}), (STARTS[1], STARTS[1] + HOLD0, 'tense', {}), (STARTS[1] + HOLD0, STARTS[2], 'calm', {}),
                     (STARTS[2], STARTS[3], 'calm', {}), (STARTS[3], STARTS[8], 'groove', {}), (STARTS[8], DUR, 'outro', {'hit': STARTS[8] + 0.5})], DUR, seed=5, bpm=92, palette=K.music, drum_gain=0.35)
    except BaseException as e:
        print('배경음 없이:', e); bg = None
    return AU.mixdown(DUR, path, bg, sfx, [], bgm_gain=0.3, sfx_gain=0.6)


if __name__ == '__main__':
    bake.cli(sys.modules[__name__], out=os.path.join(HERE, 'out', '1탄_동영상으로_먼저보기.mp4'), audio=build_audio)
    if canvas.missing: print('⚠ 못 찾음:', ' · '.join(sorted(canvas.missing)))
