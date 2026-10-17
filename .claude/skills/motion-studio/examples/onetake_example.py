#!/usr/bin/env python3
"""원테이크 줌 샘플 — 컷 없이 카메라 하나로 사진 속 점에서 점으로 (reference/onetake.md). ⛔ 이대로 복사해 값만 바꾸는 틀이 아니다.

  공간 1 (흰 바탕)        사진1 — 살짝 다가가다 색 점으로 급줌인
  공간 2 (사진1 점 색)    사진2 · 3 · 4 — 도착 → 사진2 → 휙 사진3 → 사진4 에 다가가면 둘이 둘레를 돈다(orbit) → 사진4 색 점으로 급줌인
  공간 3 (사진4 점 색)    사진5 · 6 이 툭 · 툭(drop) → 사진5 자리에서 박자 넘기기(flip) → 급줌아웃(바탕 그대로)
  공간 4 (같은 바탕)      사진7 속 «지금 바탕과 같은 색 점»에서 빠져나오며 사진7 이 드러난다
★먼저 설계도 — python3 onetake_example.py <사진 폴더> --plan → out/설계도.png · 문제 줄이 없을 때 짠다(사진을 바꿔서라도).
--shell 을 붙이면 껍데기(1:1 창 + 위아래 띠)를 씌운 9:16 쇼츠로.

  python3 onetake_example.py <사진 폴더> --plan / --still 1 4 7 9 11 / --sheet / --bake [--shell]
"""
import math
import os
import sys
import types

SKILL = os.environ.get('MOTION_SKILL') or os.path.expanduser('~/.claude/skills/motion-studio')
sys.path.insert(0, os.path.join(SKILL, 'scripts'))
from core import audio as AU, bake, onetake as OT, sfx as SX, shell   # noqa: E402
from core.ease import seg, eio                                        # noqa: E402
from core.onetake import Card, lerp, lgs, ein, eout                   # noqa: E402

_dir = os.path.abspath(next((a for a in sys.argv[1:] if os.path.isdir(a)), '재료'))
HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
SHELL = '--shell' in sys.argv
SH = shell.Shell(12.6, win='1:1', title='오늘의 전시', chip='관람기', sub='사진으로 걷는 한 바퀴',
                 notes=[(0, '첫 장부터 색이 진하다'), (2.0, '벽마다 다른 작가'), (7.0, '툭 툭 쌓이는 장면'), (10.0, '마지막은 여기서')],
                 info='날짜 · 장소 · 한 줄 정보 — 받은 정보만 적는다') if SHELL else None
W, H, FPS = (SH.inner if SHELL else (1080, 1920)) + (30,)
DUR = 12.6
ST = OT.Stage(W, H, dirs=[_dir])
WHITE = (246, 244, 240)

# ── 설계도 (먼저 확인) ──
PLAN = [dict(bg=WHITE, photos=['사진1'], go=('in', '사진1'), mix='살짝 다가가기'),
        dict(photos=['사진2', '사진3', '사진4'], go=('in', '사진4'), mix='휙 넘기기 · 둘레 돌기'),
        dict(photos=['사진5', '사진6'], go=('out', '사진7'), mix='툭 떨어지기 · 박자 넘기기'),
        dict(photos=['사진7'], mix='천천히 다가가기')]
if '--plan' in sys.argv:
    p, bad = ST.blueprint(PLAN, 'out/설계도.png'); print(p); print('\n'.join(bad) or '✓ 규칙 통과'); sys.exit(0)
ST.check(PLAN)                                                # 공간마다 실제 바탕색을 채운다
BG = [sp['bg'] for sp in PLAN]
T = [0, 2.0, 7.0, 10.0, DUR]                                  # 공간 경계
if SHELL: SH.colors = list(zip(T[:-1], BG))                   # 띠가 공간 색을 따라 물든다

A = Card('사진1'); A_UV, _ = ST.color_spot('사진1'); SA = 0.72 * W
B = [Card('사진2', -0.62, -0.72), Card('사진3', 0.58, 0.05), Card('사진4', -0.25, 0.95)]; B_UV, _ = ST.color_spot('사진4'); SB = 0.86 * W
C = [Card('사진5', 0, -0.42, rot=-3), Card('사진6', 0.05, 0.40, rot=4)]; FLIP = ['사진6', '사진3', '사진5']; SC = 0.8 * W
D = Card('사진7'); D_UV, _ = ST.near_spot('사진7', BG[2]); SD = 0.9 * W


def space1(t):
    px, py = ST.spot_pt(A, A_UV)
    if t < 1.1:
        k = eio(seg(t, 0, 1.1)); return ST.render(BG[0], [A], (px * 0.15 * k, py * 0.15 * k, SA * lerp(1, 1.12, k))), 0, (0, 0)
    u = seg(t, 1.1, 2.0); img = ST.render(BG[0], [A], OT.zoom_to((px, py), (px * 0.15, py * 0.15, SA * 1.12), SA * 90, u))
    return ST.fill(img, BG[1], seg(u, 0.72, 1)), OT.dive_blur(u), (0, 0)


def space2(t):
    b1, b2, b3 = B; cards = [c.copy() for c in B]; blur, pan = 0, (0, 0)
    if t < 2.7: u = seg(t, 2.0, 2.7); cam = OT.arrive((b1.x, b1.y), SB, u, (0, 0.1), 70); blur = 0.4 * (1 - eout(u))
    elif t < 3.5: cam = (b1.x, b1.y, SB * lerp(1, 1.05, seg(t, 2.7, 3.5)))
    elif t < 3.8:                                                 # 휙 → 사진3
        u = eio(seg(t, 3.5, 3.8)); cam = (lerp(b1.x, b2.x, u), lerp(b1.y, b2.y, u), SB * 1.05)
        v = math.sin(math.pi * seg(t, 3.5, 3.8)); pan = ((b2.x - b1.x) * SB * 0.09 * v, (b2.y - b1.y) * SB * 0.09 * v)
    elif t < 4.4: cam = (b2.x, b2.y, SB * 1.05)
    elif t < 4.9: u = eio(seg(t, 4.4, 4.9)); cam = (lerp(b2.x, b3.x, u), lerp(b2.y, b3.y, u), SB * lerp(1.05, 0.66, u))
    elif t < 6.2: cam = (b3.x, b3.y, SB * lerp(0.66, 0.72, seg(t, 4.9, 6.2)))
    else: u = seg(t, 6.2, 7.0); cam = OT.zoom_to(ST.spot_pt(b3, B_UV), (b3.x, b3.y, SB * 0.72), SB * 90, u); blur = OT.dive_blur(u)
    if t >= 4.4: OT.orbit(cards[:2], cards[2], t, 4.4, 4.9, 6.2)
    img = ST.render(BG[1], cards, cam)
    return (ST.fill(img, BG[2], seg(seg(t, 6.2, 7.0), 0.72, 1)) if t >= 6.2 else img), blur, pan


def space3(t):
    cards, shake, blur = [], (0, 0), 0
    for j, c in enumerate(C):
        a, dy, sh = OT.drop(t, 7.4 + 0.45 * j); cards.append(c.copy(y=c.y - dy, a=a)); shake = sh if sh != (0, 0) else shake
    if t < 7.5: u = seg(t, 7.0, 7.5); cam = (0, 0, lgs(SC / 30, SC * 0.62, eout(u))); blur = 0.4 * (1 - eout(u))
    elif t < 8.3: cam = (0, 0, SC * lerp(0.62, 0.66, seg(t, 7.5, 8.3)))
    elif t < 8.7: u = eio(seg(t, 8.3, 8.7)); cam = (C[0].x * u, C[0].y * u, SC * lerp(0.66, 1.08, u))
    elif t < 9.5:                                                 # 박자 넘기기
        cam = (C[0].x, C[0].y, SC * 1.08); nm, pop, last = OT.flip(FLIP, t, 8.7); cards[0].name = nm; cards[0].size = 1 + 0.05 * pop
    else:                                                         # 급줌아웃 — 바탕 그대로
        u = seg(t, 9.5, 10.0); cam = (C[0].x * (1 - ein(u)), C[0].y * (1 - ein(u)), lgs(SC * 1.08, SC / 14, ein(u))); blur = 0.55 * ein(u)
        cards[0].name = FLIP[-1]
    img = ST.render(BG[2], cards, (cam[0] - shake[0] / cam[2], cam[1] - shake[1] / cam[2], cam[2]))
    return (ST.fill(img, BG[2], seg(t, 9.75, 10.0)) if t >= 9.75 else img), blur, (0, 0)


def space4(t):
    p = ST.spot_pt(D, D_UV); u = seg(t, 10.0, 11.0)
    cam = OT.zoom_from(p, (0, 0, SD), SD * 80, u) if t < 11.0 else (0, 0, SD * lerp(1, 1.08, eio(seg(t, 11.0, DUR))))
    img = ST.render(BG[3], [D], cam)
    if t < 10.1: img = ST.fill(img, BG[3], 1 - seg(t, 10.0, 10.1))
    return img, (0.5 * (1 - eout(u)) if t < 11.0 else 0), (0, 0)


def inner(t):
    fn = [space1, space2, space3, space4][next(i for i in range(4) if t < T[i + 1] or i == 3)]
    img, blur, pan = fn(t)
    return ST.pan_blur(ST.zoom_blur(img, blur), *pan)


def frame(t): return SH.frame(t, inner(t)) if SHELL else inner(t).convert('RGB')


SCENES = list(zip(T[:-1], T[1:]))
M = types.SimpleNamespace(W=SH.W if SHELL else W, H=SH.H if SHELL else H, FPS=FPS, DUR=DUR, frame=frame, SCENES=SCENES)


def build_audio(path):
    """급줌인 = 휙(올라감) · 도착 = 쿵 · 돌 때 휙휙 · 떨어질 때 툭 · 넘길 때 똑 · 빠져나올 때 휙"""
    fx = AU.new_track(DUR); K = SX.Kit('경쾌 팝', seed=4)
    for t0 in (1.25, 6.35): K.put(fx, 'enter', t0, 0.5)
    for t0 in (2.05, 7.05): K.put(fx, 'impact', t0, 0.45)
    for t0 in (3.5, 5.2, 5.6): K.put(fx, 'cut', t0, 0.3)
    for j in range(2): K.put(fx, 'impact', 7.4 + 0.45 * j + 0.3, 0.4)
    for i in range(len(FLIP)): K.put(fx, 'tick', 8.7 + i * 0.25, 0.3)
    K.put(fx, 'cut', 9.5, 0.4); K.put(fx, 'done', 11.0, 0.35)
    try: bg = AU.bgm([(0, 2.0, 'intro'), (2.0, 10.0, 'bouncy'), (10.0, DUR, 'outro')], DUR, style='경쾌 팝', seed=5)
    except BaseException as ex: print('배경음 없이:', ex); bg = None
    return AU.mixdown(DUR, path, bg, fx)


if __name__ == '__main__':
    bake.cli(M, out=os.path.join(HERE, 'out', '원테이크줌_쇼츠.mp4' if SHELL else '원테이크줌.mp4'), audio=build_audio)
