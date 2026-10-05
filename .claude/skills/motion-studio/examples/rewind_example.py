#!/usr/bin/env python3
"""시간 조작 본보기 — 킥 «아니지~ 다시» (reference/time.md). ⛔ 복사해 값만 바꾸는 틀이 아니다 — 구조를 본다.

이야기: A 갈래에 무언가 쌓인다 → 삐! ✕ → 되감기로 출발 화면까지 → 같은 출발점에서 B 갈래가 바르게 쌓인다.
캔버스: A.dc.html · B.dc.html 두 아트보드 — ★출발 화면(바탕 · 틀 · 제목 …)은 똑같이, 쌓이는 것만 다르게 짓는다.
        두 아트보드에 같은 자리 · 같은 글자로 있는 요소 = 출발 화면 · A 에만 = A 에 쌓이는 것 · B 에만 = B 에 쌓이는 것.

구조:
  원본 시간에 두 갈래를 그린다 — A = 0초부터 · B = B0 초부터 (겹치지 않게 띄운다)
  시간 지도(WARP)가 출력 시각 → 원본 시각을 정한다: A play → stop → hold(✕ · 삐) → to(0) 되감기 → cut(B0) → B play
  화면 = timewarp.render(지도, t, 원본 그리기) · 소리 = 원본 시간으로 만든 소리를 timewarp.audio 로 같은 지도에 태운다
  ⛔ 나레이션은 지도에 넣지 않는다 · 경고음 · 쿵은 출력 시각에 따로 얹는다

작업 폴더에서:  python3 scenes.py --sheet  ·  --check  →  python3 scenes.py --bake
"""
import math
import os
import sys
import wave

import numpy as np
from PIL import Image

SKILL = os.environ.get('MOTION_SKILL') or os.path.expanduser('~/.claude/skills/motion-studio')   # ← 이 영상의 스킬 경로로
sys.path.insert(0, os.path.join(SKILL, 'scripts'))

from core import appear, audio as AU, bake, camera as C, canvas, fx, kit, motion   # noqa: E402,F401
from core import timewarp as TW                                                       # noqa: E402
from core.ease import seg                                                             # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
BOARD = lambda n: os.path.join(HERE, 'canvas', '확정', n)
W, H, FPS = 1080, 1920, 30
KIT = '팝'; K = kit.load(KIT)
PAL = {'bg': (13, 12, 22), 'white': (255, 255, 255), 'accent': (255, 207, 74)}

RA, EA = canvas.read_board(BOARD('A.dc.html')); RB, EB = canvas.read_board(BOARD('B.dc.html'))
_key = lambda e: (e['text'], round(e['x']), round(e['y']), e.get('src'))
_kb = {_key(e) for e in EB}; _ka = {_key(e) for e in EA}
SHARED_A = [e for e in EA if _key(e) in _kb]                  # 출발 화면 (A 판 요소로 그린다)
SHARED_B = [e for e in EB if _key(e) in _ka]
A_ONLY = sorted([e for e in EA if _key(e) not in _kb], key=lambda e: (e['y'], e['x']))
B_ONLY = sorted([e for e in EB if _key(e) not in _ka], key=lambda e: (e['y'], e['x']))

# ── 원본 시간의 두 갈래 ── (쌓기 간격 0.35~0.4초 · 출발점 time.md §3)
GAP_A, GAP_B = 0.38, 0.5
A_END = 0.3 + len(A_ONLY) * GAP_A + 0.4                       # A 가 다 쌓인 뒤 조금 더
B0 = A_END + 4.0                                              # B 갈래가 원본 시간에서 시작하는 자리
B_DUR = 0.35 + len(B_ONLY) * GAP_B + 2.2


def _union(es):
    """요소 여럿을 감싸는 상자 (x, y, w, h) — 카메라를 «그 무리의 가운데»로 (손으로 좌표를 찍지 않는다)"""
    if not es: return None
    x0 = min(e['x'] for e in es); y0 = min(e['y'] for e in es)
    x1 = max(e['x'] + e['w'] for e in es); y1 = max(e['y'] + canvas.box_h(e) for e in es)
    return (x0, y0, x1 - x0, y1 - y0)


BOX_A, BOX_B = _union(A_ONLY), _union(B_ONLY)


def scene_A(lt):
    """쌓일수록 카메라가 불안해진다 — 잘못되어 가는 느낌"""
    img = canvas.background(RA)
    for e in SHARED_A: appear.put(img, e, 1, 'none')
    for i, e in enumerate(A_ONLY):
        t0 = 0.3 + i * GAP_A; appear.put(img, e, seg(lt, t0, t0 + 0.3), 'pop')
    tgt = C.on(BOX_A, img, fill=0.95) if BOX_A else C.full(img)               # 쌓이는 무리로 다가간다 — 화면이 바뀔 만큼
    c = C.keys(lt, [(0, C.full(img)), (A_END, tgt, '선형')])
    return C.shoot(img, C.handheld(c, lt, amp=2 + 6 * min(1, lt / A_END)), (W, H))


def scene_B(lt):
    """같은 출발점에서 차곡차곡 — 카메라는 차분하게 다가갔다가 다 쌓이면 빠지며 흐른다"""
    img = canvas.background(RB)
    for e in SHARED_B: appear.put(img, e, 1, 'none')
    for i, e in enumerate(B_ONLY):
        t0 = 0.35 + i * GAP_B; appear.put(img, e, seg(lt, t0, t0 + 0.35), 'left' if e['text'] else 'pop', dist=140)
    done = 0.35 + len(B_ONLY) * GAP_B
    last = B_ONLY[-1] if B_ONLY else None
    if last is not None and lt > done:                         # 마지막 하나에 빛 한 줄 (키트 «팝»의 반짝)
        img = fx.shine(img, lt - done, canvas.box(last), PAL, [])
    near = C.on(BOX_B, img, fill=0.95) if BOX_B else C.full(img)
    c = C.keys(lt, [(0, C.full(img)), (0.5, near, '부드럽게'), (done, near), (done + 0.7, C.full(img), '부드럽게')])   # 다가가 쌓이는 걸 보고 · 다 되면 빠지며 전체
    return C.shoot(img, C.drift(c, max(0, lt - done - 0.7), 2.0, amt=0.02), (W, H))           # 끝 화면 = 전체 · 가운데로 곧게


def src_frame(s):
    """원본 시각 s → 화면 (A 갈래 · B 갈래)"""
    if s < B0 - 1: return scene_A(min(max(s, 0), A_END))
    return scene_B(s - B0)


# ── 시간 지도 — 멈춤 1.2~1.5초 · «다시 한다» 되감기 1.2~1.8초 ──
WARP = TW.Warp([('play', A_END), ('stop', 0.2), ('hold', 1.45), ('to', 0.0, 1.4), ('cut', B0), ('play', B0 + B_DUR)])
DUR = WARP.DUR
HOLD0 = WARP.start_of('hold'); REW0 = WARP.start_of('rewind')
SCENES = [(0, HOLD0), (HOLD0, REW0 + 1.4), (REW0 + 1.4, DUR)]   # 점검 모음 · 시간 띠가 나눠 보는 구간


def frame(t):
    s, kind, tau, d = WARP.at(t)
    img = TW.render(WARP, t, src_frame, fps=FPS, flash=(255, 40, 70))        # 되감기 = VHS 줄무늬 · ◀◀ / 멈춤 = 바랜 색 · 번쩍
    if kind == 'hold':
        img = TW.stamp_x(img, tau / 0.14, center=(W / 2, H / 2))            # 빨간 ✕ 쾅
        if tau < 0.35:                                                      # 찍히는 순간 흔들림
            a = 28 * (1 - tau / 0.35)
            img = img.transform(img.size, Image.AFFINE, (1, 0, a * math.sin(tau * 90), 0, 1, a * math.cos(tau * 70)), fillcolor=PAL['bg'])
    elif kind == 'rewind' and tau < 0.22:
        img = TW.stamp_x(img, 1, alpha=1 - tau / 0.22, center=(W / 2, H / 2))
    return K.finish(img, t)


# 기획서 §5 → --check (구간 셋: A 쌓기 · ✕ 되감기 · B 쌓기)
PLAN = [
    {'level': 1, 'camera': ['손에 든 카메라'], 'enter': ['pop'], 'emph': [], 'kick': None, 'borrow': '불안한 손에 든 카메라 — 잘못되어 가는 느낌'},
    {'level': 3, 'camera': [], 'enter': [], 'emph': [], 'kick': '아니지~ 다시'},
    {'level': 2, 'camera': ['밀고 들어가기', '빠지며 공개'], 'enter': ['left', 'pop'], 'emph': ['shine'], 'kick': None},
]
EDIT = {}


def build_audio(path):
    """원본 시간으로 배경음 · 효과음 → 같은 지도로 (되감기 = 거꾸로 빨리 · 멈춤 = 음이 내려가며 꺼짐) → 출력 시각에 경고음 · 쿵"""
    src_dur = B0 + B_DUR; rng = np.random.default_rng(4); sfx = AU.new_track(src_dur)
    for i in range(len(A_ONLY)): AU._put(sfx, AU.mallet(AU._f([0, 3, 1, 6, 2, 8][i % 6] + 12, 261.63), 0.25), 0.3 + i * GAP_A, 0.35)   # 뒤죽박죽 음
    for i in range(len(B_ONLY)): AU._put(sfx, AU.mallet(AU._f([0, 4, 7, 12, 16][i % 5] + 7, 261.63), 0.6), B0 + 0.35 + i * GAP_B, 0.5)   # 오르는 음
    AU.chime(sfx, B0 + 0.35 + len(B_ONLY) * GAP_B)
    try:
        bg = AU.bgm([(0, A_END, 'bouncy', {}), (A_END, B0, 'calm', {}), (B0, src_dur, 'groove', {})], src_dur, palette=K.music)
    except BaseException as e:                                              # 사운드폰트가 없으면 배경음 없이
        print('배경음 없이:', e); bg = None
    srcp = AU.mixdown(src_dur, path + '.src.wav', bg, sfx, [])
    with wave.open(srcp) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float32).reshape(-1, w.getnchannels()) / 32768; sr = w.getframerate()
    out = TW.audio(WARP, a, sr)
    hs = int(HOLD0 * sr); bz = TW.buzzer(sr); n = min(len(bz), len(out) - hs); out[hs:hs + n] += bz[:n, None]
    hit = AU.new_track(DUR); AU.hit(hit, rng, HOLD0, 0.9)
    out[:len(hit)] += np.asarray(hit).reshape(len(hit), -1)[:len(out)].mean(axis=1, keepdims=True)
    # (나레이션이 있으면 여기서 출력 시각에 얹는다 — 지도에 넣지 않는다)
    out = np.tanh(out * 1.1) / np.tanh(1.1)                                 # 겹친 소리가 깨지지 않게 부드럽게 눌러 준다
    with wave.open(path, 'wb') as w:
        w.setnchannels(out.shape[1]); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((np.clip(out, -1, 1) * 32767).astype('<i2').tobytes())
    return path


if __name__ == '__main__':
    bake.cli(sys.modules[__name__], out=os.path.join(HERE, 'out', 'rewind.mp4'), audio=build_audio)
    if canvas.missing: print('⚠ 못 찾음:', ' · '.join(sorted(canvas.missing)))
