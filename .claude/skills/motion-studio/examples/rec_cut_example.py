#!/usr/bin/env python3
"""녹화 컷 편집 샘플 — 긴 화면 녹화를 컷 표로 잘라 설명 영상으로 (reference/rec-cut.md). ⛔ 이대로 복사해 값만 바꾸는 틀이 아니다.

컷 표(SHOTS)만 고치면 된다 — 시각은 전부 «원본 녹화 시각». 조각을 빼도 짚기 · 대사가 따라온다.
  c01  보통 속도 · 쓸데없는 구간(3~6초) 들어냄 · 마지막에 1.5초 멈춤 · 동그라미 · 밑줄 · 네모
  c02  기다리는 구간 ×12 빨리 감기 + 배지
  c03  컷 안 카메라 — 입력 창으로 다가감 · 이름이 보이는 곳 가리기(mask)
굽기 전 미리 굽기는 bake 가 알아서(M.prepare) · 자막(.srt)은 --srt

  python3 rec_cut_example.py --still 1.5 4 8 13 / --sheet / --bake / --srt
"""
import os
import sys
import types

SKILL = os.environ.get('MOTION_SKILL') or os.path.expanduser('~/.claude/skills/motion-studio')
sys.path.insert(0, os.path.join(SKILL, 'scripts'))
from core import audio as AU, bake, cut, sfx as SX   # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
W, H, FPS = 1920, 1080, 30
SHOTS = [
    dict(id='c01', src='rec.mp4', a=0, b=10, crop=(1280, 720, 2000), keep=[(0, 3, 1), (6, 8, 1), ('freeze', 8, 1.5)],
         vo=[('v01', 0.3), ('v02', {'src': 6.2})],
         marks=[(1.0, 1.5, 'circle', 600, 300, 300, 120), (6.5, 1.0, 'underline', 200, 900, 400),
                (8, 1, 'box', 1500, 600, 2200, 1100, {'at': 4.2, 'until': 6.4})]),
    dict(id='c02', src='rec.mp4', a=10, b=70, sp=12, crop=(1280, 720, 2560), ff=True, vo=[('v03', 0.3)]),
    dict(id='c03', src='rec.mp4', a=70, b=80, crop=(1280, 720, 2560), cam=[(73, (800, 500, 1200), 1.0)], hold=1, mask=True,
         vo=[('v04', {'src': 73.5})]),
]
MASKS = [dict(x=150, y=150, w=900, h=180, t=74, text='user@mac')]        # 원본 좌표 · t 원본 시각부터 · 바탕색으로 칠하고 글을 다시
TEXT = {'v01': '먼저 폴더를 만듭니다.', 'v02': '여기서 이름을 적고', 'v03': '기다리는 동안은 빨리 넘길게요.', 'v04': '입력 창에 붙여 넣으면 끝이에요.'}
R = cut.Reel(SHOTS, rec='녹화', size=(W, H), masks=MASKS)
TL = R.timeline(); DUR = TL[-1][2]


def frame(t):
    for cid, a, b in TL:
        if t < b: return R.frame(cid, t - a)
    return R.frame(TL[-1][0], TL[-1][2] - TL[-1][1] - 1e-3)


M = types.SimpleNamespace(W=W, H=H, FPS=FPS, DUR=DUR, frame=frame, SCENES=[(a, b) for _, a, b in TL], prepare=R.prepare)


def build_audio(path):
    """짚기마다 톡 · 컷 경계 휙 · (실제 작업은 voice/ 녹음을 R.vo 시각에 놓는다 — audio.mixdown voices)"""
    fx = AU.new_track(DUR); K = SX.Kit('테크·앱', seed=2)
    for cid, a, b in TL:
        if a > 0: K.put(fx, 'cut', a - 0.1, 0.3)
        for m in R.by[cid].get('marks', []): K.put(fx, 'tick', a + R.mark_time(cid, m)[0] + 0.05, 0.25)
    try: bg = AU.bgm([(0, DUR, 'calm')], DUR, style='로파이', seed=3)
    except BaseException as ex: print('배경음 없이:', ex); bg = None
    return AU.mixdown(DUR, path, bg, fx, bgm_gain=0.25)


if __name__ == '__main__':
    if '--srt' in sys.argv:
        print(R.srt(TEXT, {k: 2.0 for k in TEXT}, 'out/자막.srt')); sys.exit(0)   # 실제 작업은 녹음 길이(voice/ wav)로
    bake.cli(M, out=os.path.join(HERE, 'out', '녹화편집.mp4'), audio=build_audio)
