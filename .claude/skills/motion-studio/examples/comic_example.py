#!/usr/bin/env python3
"""만화 페이지 길 샘플 — 완성된 페이지 만화를 카메라 · 소리 · 빛 한 겹으로 (reference/comic.md · scripts/core/comic.py)
⛔ 이대로 복사해 값만 바꾸는 틀이 아니다 — 칸 상자 · 컷 연출표(S)는 그 만화의 장면 프롬프트를 읽고 새로 쓴다.

작업 폴더에서:
  python3 scenes.py --panels        칸 번호 확인 그림 (out/칸확인.png) — 붙은 칸 · 순서를 본다
  python3 scenes.py --table         컷 연출표 — 유저가 보고 말로 고친다
  python3 scenes.py --sheet · --still 3.2 · --bake
"""
import os
import sys

SKILL = os.environ.get('MOTION_SKILL') or os.path.expanduser('~/.claude/skills/motion-studio')   # ← 이 영상의 스킬 경로로
sys.path.insert(0, os.path.join(SKILL, 'scripts'))

from core import bake, comic, kit     # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
W, H, FPS = 1080, 1920, 30
K = kit.load('손그림')                     # 화면 겹 · 배경음 악기 (만화 분위기에 맞는 키트)
FINISH = {'grain': 0.02}

PAGES = {1: 'pages/p01.png', 2: 'pages/p02.png'}          # 효과음까지 들어간 최종 페이지

# 칸 상자 (페이지 좌표 x0 y0 x1 y1 · 읽는 순서) — 자동으로 찾고, 붙어 나온 장만 손으로
P = {pg: comic.detect(f) for pg, f in PAGES.items()}
P[2] = [(14, 13, 1071, 477), (14, 490, 413, 1021), (425, 490, 1071, 1021), (15, 1035, 1071, 1435)]   # 효과선이 칸새를 건너 붙은 장

# 컷 연출표 — 칸마다 한 줄 (장면 프롬프트의 샷 · 비트 · 대사 · 효과음을 읽고)
S = [
    # 1장 — 도입: 휘두르기 → 대화 → 클로즈업
    dict(pg=1, i=0, cam='다가가기', hold=1.7, sfx=[(0.15, 'swish', .5), (0.65, 'swish', .45)],
         fx=[('sparkle', dict(area=(0, .05, .35, .5), n=6, r=14, col=(150, 255, 190)))]),
    dict(pg=1, i=1, cam='훑기', hold=5.0, pan_at=(1.6, 3.6)),                       # 말풍선 셋 — 왼쪽 사람 → 오른쪽 사람
    dict(pg=1, i=2, cam='훑기', hf=0.5, hold=3.6, pan_at=(0.8, 2.6), sfx=[(0.6, 'twinkle', .35)],
         fx=[('glow', dict(at=(.5, .45), r=.3, col=(255, 220, 150), amt=.25, pulse=2))]),
    # 2장 — 설정 → 마법 → 폭발(펀치)
    dict(pg=2, i=0, cam='훑기', hf=0.5, hold=3.6, sfx=[(0.0, 'crowd', .35)]),
    dict(pg=2, i=1, cam='다가가기', hold=2.0, sfx=[(0.0, 'clap', .3)]),
    dict(pg=2, i=2, cam='다가가기', hold=2.2, sfx=[(0.1, 'shimmer', .5)],
         fx=[('glow', dict(at=(.75, .5), r=.4, col=(200, 170, 255), amt=.35))]),
    dict(pg=2, i=3, cam=('pan', (.3, 0, .95, 1), (0, .1, .5, 1), 1.0), move='snap', hf=0.55, hold=3.2, pan_at=(1.2, 2.4),
         hush=0.45, sfx=[(0.0, 'boom', 1.0), (0.05, 'sparkle_rain', .45)], shake=[(0.0, 30)],          # 터진 자리 → 1초 뒤 인물 얼굴
         fx=[('rain', dict(area=(.3, 0, 1, 1), n=60, cols=[(255, 150, 200), (255, 250, 235)])), ('glow', dict(at=(.6, .5), r=.4, col=(255, 150, 200), amt=.5, pulse=6))]),
]

C = comic.Comic(PAGES, P, S, W, H, bpm=98)
DUR, SCENES = C.DUR, C.SCENES
PLAN = [{'level': 2, 'camera': ['밀고 들어가기', '훑기'], 'enter': [], 'emph': [], 'kick': None}]
EDIT = {}


def frame(t): return K.finish(C.frame(t), t, FINISH)


def build_audio(path): return C.audio(path, palette=K.music)


if __name__ == '__main__':
    if '--panels' in sys.argv: print(comic.check_image(PAGES, P, os.path.join(HERE, 'out', '칸확인.png'))); sys.exit()
    if '--table' in sys.argv: print(C.table()); sys.exit()
    bake.cli(sys.modules[__name__], out=os.path.join(HERE, 'out', 'comic.mp4'), audio=build_audio)
