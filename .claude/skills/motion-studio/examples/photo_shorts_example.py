#!/usr/bin/env python3
"""사진 쇼츠 샘플 — 행사 사진 여러 장을 9:16 쇼츠로 (reference/photo-shorts.md). ⛔ 이대로 복사해 값만 바꾸는 틀이 아니다.

사진이 주인공 · 중복만 빼고 최대한 많이. 보여 주는 것:
  · 오프닝 = 대표 사진이 툭 떨어지며 화면이 흔들림 (fx.drop + fx.photo_card) · 제목 글이 줄마다 올라옴
  · 쌓기 = 2~3장이 툭 · 툭 · 툭 (장면 2)
  · 몽타주 = 남는 사진을 반 박자씩 넘기고 아래 점으로 몇 장째인지 · 넘길 때마다 똑 (fx.photo_flip · fx.flip_times)
  · 모아 마무리 = 여러 장이 날아와 격자로 (fx.photo_gather) + 정보 한 줄
  · 장면 사이 = 밀어 올리기 + 휙 · 배경음 경쾌
글은 canvas.draw_text — 제목 글꼴에 없는 기호(· × –)만 Pretendard 로 대신 그린다(빈 네모 방지).
실제 작업에서는 카드 자리 · 글을 캔버스 보드에서 읽는다. 여기서는 캔버스 없이 돌려 볼 수 있게 값을 적었다.

  python3 photo_shorts_example.py <사진 폴더> --still 1 5 9 13 / --sheet / --bake
"""
import glob
import os
import sys
import types

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

SKILL = os.environ.get('MOTION_SKILL') or os.path.expanduser('~/.claude/skills/motion-studio')
sys.path.insert(0, os.path.join(SKILL, 'scripts'))
from core import audio as AU, bake, canvas, fx            # noqa: E402
from core.ease import seg, eo, eio                         # noqa: E402

_dir = os.path.abspath(next((a for a in sys.argv[1:] if os.path.isdir(a)), '재료'))      # 옮기기 전에 절대 경로로
HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
W, H, FPS = 1080, 1920, 30
FILES = sorted(glob.glob(os.path.join(_dir, '*.jp*g')) + glob.glob(os.path.join(_dir, '*.png')))
if len(FILES) < 4: raise SystemExit('사진 폴더에 사진이 4장 이상 있어야 해요: python3 photo_shorts_example.py <사진 폴더>')

INK, WHITE = (20, 20, 20), (255, 255, 255)
BG = [(255, 122, 26), (255, 210, 63), (46, 107, 255), (30, 200, 184)]   # 실제로는 타이틀 이미지 색에서
F_T = next((p for p in ('fonts/title.ttf',) if os.path.exists(p)), os.path.join(SKILL, 'assets', 'fonts', 'Pretendard-Bold.otf'))
_F = {}


def font(sz):
    if sz not in _F: _F[sz] = ImageFont.truetype(F_T, sz)
    return _F[sz]


def pic(i):
    return bake.memo(f'p{i}', lambda: ImageOps.exif_transpose(Image.open(FILES[i])).convert('RGB'))


# ── 받은 정보 (photo-shorts §1) — 지어내지 않는다 ──
INFO = dict(title=['[행사 이름]', '[한 줄 더]'], date='[날짜 · 장소]', line='[소개 글 한 줄]')
N = len(FILES)
OPEN, STACK = 0, [1, 2, 3]
REST = list(range(4, N)) or [1, 2, 3]                     # ★남는 사진은 전부 몽타주로
GATHER = list(range(min(N, 9)))
PER = 0.25
LENS = [3.0, 3.5, max(2.5, len(REST) * PER + 0.75), 4.0]
SC, _t = [], 0.0
for _l in LENS: SC.append((_t, _t + _l)); _t += _l
DUR = _t; TR = 0.28


def text(d, xy, s, sz, col, a=1.0, anchor='ls'):
    canvas.draw_text(d, xy, s, font(sz), tuple(col) + (int(255 * a),), anchor=anchor)


def scene(i, lt):
    img = Image.new('RGBA', (W, H), BG[i % len(BG)] + (255,)); d = ImageDraw.Draw(img)
    if i == 0:                                                         # 오프닝
        for j, ln in enumerate(INFO['title']):
            k = eo(seg(lt, 0.2 + j * 0.15, 0.6 + j * 0.15)); text(d, (70, 420 + j * 120 + 40 * (1 - k)), ln, 104, INK, k)
        text(d, (74, 700), INFO['date'], 44, INK, eo(seg(lt, 0.6, 0.9)))
        a, dy, sh = fx.drop(lt, 1.1); fx.photo_card(img, pic(OPEN), (90, 900, 900, 600), -3, dy=dy, a=a, shake=sh, z=1 + 0.03 * seg(lt, 1.5, 3))
    elif i == 1:                                                       # 쌓기
        text(d, (70, 420), INFO['line'], 72, INK, eo(seg(lt, 0.1, 0.5)))
        for n, (j, box, r) in enumerate(zip(STACK, [(80, 600, 700, 466), (300, 880, 700, 466), (120, 1160, 760, 506)], (-6, 4, -2))):
            a, dy, sh = fx.drop(lt, 0.4 + n * 0.5); fx.photo_card(img, pic(j), box, r, dy=dy, a=a, shake=sh)
    elif i == 2:                                                       # 몽타주
        text(d, (70, 420), '현장 스케치', 80, INK, eo(seg(lt, 0, 0.3)))
        fx.photo_flip(img, [pic(j) for j in REST], lt, (90, 660, 900, 600), per=PER, t0=0.2, dots=1380)
    else:                                                              # 모아 마무리
        fx.photo_gather(img, [pic(j) for j in GATHER], lt, (80, 300, 920, 1100), t0=0.1, per=0.1)
        text(d, (W / 2, 1600), INFO['date'], 56, INK, eo(seg(lt, 1.4, 1.8)), anchor='ms')
    return img


def frame(t):
    i = next((k for k, (a, b) in enumerate(SC) if a <= t < b), len(SC) - 1)
    cur = scene(i, t - SC[i][0])
    if i > 0 and t - SC[i][0] < TR:                                     # 밀어 올리기
        u = eio((t - SC[i][0]) / TR); prev = scene(i - 1, t - SC[i - 1][0])
        out = Image.new('RGBA', (W, H)); out.paste(prev, (0, int(-H * u))); out.paste(cur, (0, int(H * (1 - u)))); cur = out
    return cur.convert('RGB')


M = types.SimpleNamespace(W=W, H=H, FPS=FPS, DUR=DUR, frame=frame, SCENES=SC)


def build_audio(path):
    rng = np.random.default_rng(5); sfx = AU.new_track(DUR); AU.use('경쾌 팝')   # 효과음 묶음 (sound.md) — 옛 이름(hit · tick · whoosh · chime)도 이 묶음 소리로
    AU.hit(sfx, rng, SC[0][0] + 1.1 + 0.3, 0.5)
    for n in range(len(STACK)): AU.hit(sfx, rng, SC[1][0] + 0.4 + n * 0.5 + 0.3, 0.35)
    for tt in fx.flip_times(len(REST), PER, SC[2][0] + 0.2): AU.tick(sfx, rng, tt, 0.25)
    for a, _ in SC[1:]: AU._put(sfx, AU.whoosh(rng, 0.4, 0.2, 1800), a - 0.1)
    AU.chime(sfx, SC[3][0] + 1.4, g=0.2)
    try:
        bg = AU.bgm([(0, SC[0][1], 'intro', {}), (SC[0][1], SC[3][0], 'bouncy', {}), (SC[3][0], DUR, 'outro', {})], DUR, bpm=120)
    except BaseException as ex:
        print('배경음 없이:', ex); bg = None
    return AU.mixdown(DUR, path, bg, sfx)


if __name__ == '__main__':
    bake.cli(M, out=os.path.join(HERE, 'out', 'photo_shorts_example.mp4'), audio=build_audio)
