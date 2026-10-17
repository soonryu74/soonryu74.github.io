#!/usr/bin/env python3
"""폰 영상 쇼츠 샘플 — 행사 · 모임 영상 한 편을 9:16 쇼츠로 (reference/video-shorts.md). ⛔ 이대로 복사해 값만 바꾸는 틀이 아니다.

영상이 주인공 · 우리 디자인은 받친다. 9:16 = 위 날짜 · 제목 / 가운데 가로 영상 그대로(세로 처리 ②) / 아래 한 마디.
보여 주는 것:
  · 한 번에 찍은 영상을 순간으로 나눈 구간 표 CUTS (원본 시작 · 끝) — 장면 길이는 구간 + 멈춤
  · 결정적 순간 글귀가 튀어나옴(label.pop) · 글귀가 바뀜(label.swap)
  · 인물 소개 = 화면 멈춤(살짝 번쩍) → 이름 칩 + 화살표(캔버스 SVG 좌표 그대로) → 함께 사라지고 다시 재생 (video.hold_time · label)
  · 마지막 = 받은 이미지 카드(포스터 · 단체 사진) 천천히 다가가기 · 장면 사이 짧은 디졸브
  · 소리 = 현장 소리가 주인공(목소리 쪽 · 멈춤 동안 쉰다) + 배경음 낮게 + 작은 효과음
실제 작업에서는 글자 · 칩 · 화살표 자리를 캔버스 보드에서 읽는다(canvas/처음 → 확정). 여기서는 캔버스 없이 돌려 볼 수 있게 값을 적었다.

  python3 video_shorts_example.py 원본.mp4 [카드.jpg] --still 2 7 11.5 / --sheet / --bake
"""
import os
import sys
import types

import numpy as np
from PIL import Image, ImageDraw, ImageFont

SKILL = os.environ.get('MOTION_SKILL') or os.path.expanduser('~/.claude/skills/motion-studio')
sys.path.insert(0, os.path.join(SKILL, 'scripts'))
from core import audio as AU, bake, label as L, video as V      # noqa: E402
from core.ease import seg, eo, eio                                # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
W, H, FPS = 1080, 1920, 30
_args = [a for a in sys.argv[1:] if not a.startswith('--') and os.path.exists(a)]
SRC = next((a for a in _args if a.lower().endswith(('.mp4', '.mov', '.m4v'))), '재료/원본.mp4')
CARD = next((a for a in _args if a.lower().endswith(('.jpg', '.jpeg', '.png'))), None)

PAPER, INK, ACC, SUB = (236, 232, 225), (30, 27, 24), (200, 71, 43), (74, 68, 61)
_pb = os.path.join(SKILL, 'assets', 'fonts', 'Pretendard-Bold.otf')
F_T = next((p for p in ('fonts/title.ttf',) if os.path.exists(p)), _pb)   # 제목 글꼴 = 캔버스와 같은 파일(작업 폴더 fonts/)
F_B = _pb
_F = {}


def font(p, sz):
    if (p, sz) not in _F: _F[(p, sz)] = ImageFont.truetype(p, sz)
    return _F[(p, sz)]


# ── 받은 정보 (video-shorts §1) — 지어내지 않는다 · 없으면 그 줄을 빼고 짓는다 ──
INFO = dict(title=['[무슨 자리]', '[한 줄 더]'], date='[날짜 · 장소]')
PEOPLE = [dict(name='[이름 · 직함]', chip=(80, 520), col=ACC,             # 칩 왼쪽 위
               svg=(191, 628, 220, 220, (220, 220)), p=((20, 10), (40, 150), (190, 200)), heads=((160, 172), (152, 210)))]

# ── 구간 표 — 샘플이라 원본 길이 비율 · 실제로는 1초 모음표를 보고 순간마다 초를 적는다 ──
_d = max(8.0, V.probe(SRC)['dur'])
SRC_CUTS = [(0.0, _d * .2), (_d * .2, _d * .45), (_d * .45, _d * .7), (_d * .7, _d)]
HOLD = {2: (1.2, 2.4)}                        # 장면 3 — 구간 1.2초에 2.4초 멈춤 (화살표를 그린 대표 장면 시각)
CARD_S = 3.0 if CARD else 0.0
SLOT = (0, 680, 1080, 608)                    # 세로 처리 ② 가로 그대로
_t, CUTS = 0.0, []
for _i, (_a, _b) in enumerate(SRC_CUTS):
    _len = _b - _a + (HOLD[_i][1] if _i in HOLD else 0); CUTS.append((_t, _t + _len)); _t += _len
DUR = _t + CARD_S
SCENES = CUTS + ([(_t, DUR)] if CARD else [])
XF = 0.35
CL = {}


def clip(i):
    if i not in CL: a, b = SRC_CUTS[i]; CL[i] = V.Clip(SRC, a, min(_d, b + XF + 0.1), loop=False)
    return CL[i]


def slot(i, lt):
    st = V.hold_time(lt, [HOLD[i]] if i in HOLD else [])
    im = V.fit(clip(i).frame(st), SLOT[2:], (0.5, 0.5), 1.0 + 0.035 * seg(st, 0, SRC_CUTS[i][1] - SRC_CUTS[i][0]))
    if i in HOLD and 0 <= lt - HOLD[i][0] < 0.18:                      # 멈출 때 살짝 번쩍
        im = Image.blend(im, Image.new('RGB', im.size, (255, 255, 255)), 0.45 * (1 - (lt - HOLD[i][0]) / 0.18))
    return im


def scene(i, t):
    img = Image.new('RGB', (W, H), PAPER); lay = L.blank((W, H)); d = ImageDraw.Draw(lay)
    a0 = SCENES[i][0]; lt = t - a0; A = lambda s, e=0.45: eo(seg(lt, s, s + e))
    if i == len(CUTS):                                                 # 받은 이미지 카드
        z = 1.0 + 0.04 * seg(lt, 0, CARD_S); p = bake.memo('card', lambda: Image.open(CARD).convert('RGB'))
        s = W / p.width * z; im = p.resize((int(p.width * s), int(p.height * s)), Image.LANCZOS)
        img.paste(im, ((W - im.width) // 2, (H - im.height) // 2)); return img
    img.paste(slot(i, lt), SLOT[:2])
    if i == 0:                                                         # 제목
        k = A(0.15); d.text((80, 336), INFO['date'], font=font(F_B, 40), fill=ACC + (int(255 * k),), anchor='lm')
        for j, ln in enumerate(INFO['title']):
            k = A(0.35 + j * 0.2, 0.6); d.text((76, 440 + j * 110 + 30 * (1 - k)), ln, font=font(F_T, 96), fill=INK + (int(255 * k),), anchor='lm')
    else:
        d.text((78, 366), ' '.join(INFO['title']), font=font(F_T, 56), fill=INK + (255,), anchor='lm')
    if i == 1: L.pop(d, (W / 2, 1386), '건배!', F_T, 128, INK, seg(lt, 2.1, 2.45))       # 결정적 순간
    if i == 3: L.swap(d, (W / 2, 1367), '위하여~~!!', '축하합니다!!', F_T, 72, INK, lt, 0.8, 3.0)
    if i in HOLD:                                                      # 멈춘 동안만 이름표 · 화살표
        at, hold = HOLD[i]; out = 1 - seg(lt, at + hold - 0.35, at + hold)
        if out > 0:
            l2 = L.blank((W, H)); d2 = ImageDraw.Draw(l2)
            for n, pp in enumerate(PEOPLE):
                k = A(at + 0.15 + n * 0.6, 0.35); L.chip(d2, pp['chip'][0], pp['chip'][1] + 16 * (1 - k), pp['name'], font(F_B, 48), pp['col'], k)
                L.arrow(d2, L.svg_map(*pp['svg']), *pp['p'], pp['heads'], pp['col'], seg(lt, at + 0.35 + n * 0.6, at + 0.85 + n * 0.6))
            lay.alpha_composite(L.fade_layer(l2, out))
    img.paste(lay, (0, 0), lay)
    return img


def frame(t):
    i = next((k for k, (a, b) in enumerate(SCENES) if a <= t < b), len(SCENES) - 1)
    cur = scene(i, t)
    if i > 0 and t - SCENES[i][0] < XF: cur = Image.blend(scene(i - 1, t), cur, eio((t - SCENES[i][0]) / XF))
    return cur


M = types.SimpleNamespace(W=W, H=H, FPS=FPS, DUR=DUR, frame=frame, SCENES=SCENES)


def build_audio(path):
    """현장 소리가 주인공 — 목소리 쪽 · 멈춤 동안은 쉰다 · 배경음은 그 아래"""
    v = np.zeros(int((DUR + 0.5) * AU.SR), np.float32)
    for i, ((a, b), (s0, s1)) in enumerate(zip(SRC_CUTS, CUTS)):
        if i in HOLD:
            at, hold = HOLD[i]
            V.put_sound(v, V.sound(SRC, a, a + at), s0, fade=0.05); V.put_sound(v, V.sound(SRC, a + at, b), s0 + at + hold, fade=0.05)
        else:
            V.put_sound(v, V.sound(SRC, a, b), s0, fade=0.05)
    os.makedirs('out', exist_ok=True); vp = 'out/_live.wav'; AU.write_wav(vp, v)
    rng = np.random.default_rng(3); sfx = AU.new_track(DUR)
    AU.chime(sfx, CUTS[1][0] + 2.1, g=0.18)
    for i, (at, hold) in HOLD.items(): AU.tick(sfx, rng, CUTS[i][0] + at, 0.3)
    if CARD: AU._put(sfx, AU.whoosh(rng, 0.5, 0.18, 1600), CUTS[-1][1] - 0.1)
    try:
        bg = AU.bgm([(0, CUTS[0][1], 'intro', {}), (CUTS[0][1], CUTS[-1][1], 'calm', {}), (CUTS[-1][1], DUR, 'outro', {})], DUR, palette='cinema', bpm=96)
    except BaseException as ex:
        print('배경음 없이:', ex); bg = None
    return AU.mixdown(DUR, path, bg, sfx, [(0.0, vp)], bgm_gain=0.35, duck=0.35, voice_gain=0.9)


if __name__ == '__main__':
    bake.cli(M, out=os.path.join(HERE, 'out', 'video_shorts_example.mp4'), audio=build_audio)
