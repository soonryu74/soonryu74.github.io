#!/usr/bin/env python3
"""설명형 샘플 — 영상을 «자료»로 쓰는 요약 쇼츠 (reference/video.md §3-B). ⛔ 이대로 복사해 값만 바꾸는 틀이 아니다.

설명이 주인공이고 영상은 근거 장면이다. 9:16 = 위 꼬리표 · 제목 / 가운데 4:3 영상 칸 / 아래 요약 설명.
원본 발언 구간은 인용으로 — 발언이 나오는 동안 인용문이 한 줄씩 뜨고 배경음은 아래로.
보여 주는 것:
  · 구간 표 BEATS — (시작, 끝, 원본 시각, 자르는 자리, 꼬리표, 제목, 설명 줄) · 원본 시각은 자막(V.subtitles · V.digest)으로 고른다
  · 4:3 칸 = 16:9 원본의 좌우를 잘라 크게 · focus 로 인물 쪽 · 다가가기는 아래 기준(focus y=1) — 원본 아래 로고 · 자막 띠를 지킨다
  · 칸 안 밀어내기 · 컷 번쩍 · 위 진행 막대
  · 소리 = 배경음(끊김 없이) + 원본 현장 소리(낮게 · 효과음 쪽 = 배경음이 눌리지 않음) + 원본 발언(목소리 쪽 = 배경음이 내려감)

  python3 video_explain_example.py 원본.mp4 --still 3 9 / --sheet / --bake
"""
import os
import sys
import types

import numpy as np
from PIL import Image, ImageDraw, ImageFont

SKILL = os.environ.get('MOTION_SKILL') or os.path.expanduser('~/.claude/skills/motion-studio')
sys.path.insert(0, os.path.join(SKILL, 'scripts'))
from core import audio as AU, bake, video as V                        # noqa: E402
from core.ease import seg, eo, eio                                     # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
W, H, FPS = 1080, 1920, 30
SLOT = (0, 560, 1080, 810)                                             # 4:3 영상 칸
BG0, BG1 = (10, 18, 38), (18, 34, 66)
ACC, WHITE, GREY, DIM = (92, 186, 255), (244, 247, 252), (150, 166, 192), (60, 78, 110)
_t = 'fonts/BlackHanSans-Regular.ttf'
F_T = _t if os.path.exists(_t) else os.path.join(SKILL, 'assets', 'fonts', 'Pretendard-Bold.otf')   # 제목 글꼴은 기획서 §6 대로
F_B = os.path.join(SKILL, 'assets', 'fonts', 'Pretendard-Bold.otf')
_F = {}


def font(p, sz):
    if (p, sz) not in _F: _F[(p, sz)] = ImageFont.truetype(p, sz)
    return _F[(p, sz)]


SRC = next((a for a in sys.argv[1:] if not a.startswith('--') and os.path.exists(a)), '재료/원본.mp4')
_info = V.probe(SRC); _d = max(4.0, _info['dur'])
_BOX = V.letterbox(SRC)                                                 # 검은 띠 뺀 화면 (박힌 로고 · 자막 띠는 손으로 더 뺀다)

# ── 구간 표 (기획서 §3-V) — 샘플이라 원본 길이 비율로 잡았다. 실제로는 자막에서 고른 초를 적는다 ──
#     (시작, 끝, 원본 시각, focus x(0~1), 꼬리표, 제목, 설명 줄 / None = 원본 발언, 들어오기)
BEATS = [(0, 4, _d * 0.02, 0.5, '오늘의 요약', '세 가지만 기억하세요', ['처음 · 가운데 · 끝'], 'cut'),
         (4, 9, _d * 0.20, 0.5, '첫째', '무엇이 있었나', ['첫 장면의 요점 한 줄', '덧붙이는 설명 한 줄'], 'push'),
         (9, 15, _d * 0.45, 0.55, '둘째 · 원본 발언', '그 사람의 말', None, 'cut'),
         (15, 20, _d * 0.70, 0.45, '셋째', '앞으로', ['결론 한 줄', '다음에 볼 것'], 'push'),
         (20, 24, _d * 0.88, 0.5, '마무리', '끝까지 봐 주셔서', ['한 줄 마무리'], 'cut')]
QUOTES = {2: dict(a=_d * 0.45 + 0.6, dur=4.8, at=9.6, who='발언자 이름', lines=['인용할 말 첫 줄', '둘째 줄'], marks=[9.6, 12.0])}
DUR = BEATS[-1][1]
SCENES = [(b[0], b[1]) for b in BEATS]
CL = {}


def clip(i):
    b = BEATS[i]
    if i not in CL: CL[i] = V.Clip(SRC, b[2], min(_d, b[2] + (b[1] - b[0]) + 0.5), crop=_BOX, loop=False)
    return CL[i]


def bg():
    g = np.linspace(0, 1, H)[:, None, None]; mid = 1 - np.abs(g - 0.5) * 2
    px = (np.array(BG0) + (np.array(BG1) - np.array(BG0)) * mid) * np.ones((1, W, 1))
    img = Image.fromarray(px.astype(np.uint8)); d = ImageDraw.Draw(img)
    x, y, w, h = SLOT
    d.rectangle([x, y - 6, x + w, y - 1], fill=ACC); d.rectangle([x, y + h + 1, x + w, y + h + 6], fill=ACC)
    return img


def beat_at(t): return next((i for i, b in enumerate(BEATS) if b[0] <= t < b[1]), len(BEATS) - 1)


def slot_img(i, t):
    b = BEATS[i]; lt = t - b[0]
    return V.fit(clip(i).frame(lt), SLOT[2:], (b[3], 1.0), 1.0 + 0.04 * seg(lt, 0, b[1] - b[0]))   # 아래 기준 다가가기


def draw_text(img, i, t):
    b = BEATS[i]; lt = t - b[0]; a = eo(seg(lt, 0, 0.4))
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay); A = lambda k: int(255 * k)
    tw = d.textlength(b[4], font=font(F_B, 34)); ty = 300 + 30 * (1 - a)
    d.rounded_rectangle([W / 2 - tw / 2 - 26, ty - 30, W / 2 + tw / 2 + 26, ty + 30], 30, fill=ACC + (A(a),))
    d.text((W / 2, ty), b[4], font=font(F_B, 34), fill=BG0 + (A(a),), anchor='mm')
    d.text((W / 2, 430 + 40 * (1 - a)), b[5], font=font(F_T, 92 if len(b[5]) <= 10 else 76), fill=WHITE + (A(a),), anchor='mm')
    if i in QUOTES:
        q = QUOTES[i]
        d.text((70, 1430), '“', font=font(F_T, 150), fill=ACC + (200,), anchor='lm')
        for j, (ln, m) in enumerate(zip(q['lines'], q['marks'])):
            k = eo(seg(t, m, m + 0.45))
            if k > 0: d.text((W / 2, 1490 + j * 104 + 24 * (1 - k)), ln, font=font(F_T, 80), fill=WHITE + (A(k),), anchor='mm')
        k = seg(t, q['marks'][0] + 0.3, q['marks'][0] + 0.8)
        d.text((W / 2, 1490 + len(q['lines']) * 104 + 30), f'— {q["who"]}', font=font(F_B, 40), fill=GREY + (A(k),), anchor='mm')
        if q['at'] <= t < q['at'] + q['dur']:                              # 원본 발언 표시
            x, y = 60, SLOT[1] + 40
            d.rounded_rectangle([x, y - 26, x + 196, y + 26], 26, fill=(0, 0, 0, 170))
            for n in range(4):
                hh = 8 + 14 * abs(np.sin(t * 9 + n * 1.3)); d.rectangle([x + 22 + n * 12, y - hh / 2, x + 28 + n * 12, y + hh / 2], fill=ACC + (255,))
            d.text((x + 80, y), '원본 발언', font=font(F_B, 26), fill=WHITE + (255,), anchor='lm')
    else:
        for j, ln in enumerate(b[6]):
            k = eo(seg(lt, 0.15 + j * 0.18, 0.55 + j * 0.18))
            d.text((W / 2, 1500 + j * 104 + 26 * (1 - k)), ln, font=font(F_B, 66 if j == 0 else 50), fill=(WHITE if j == 0 else GREY) + (A(k),), anchor='mm')
    n = len(BEATS); gap = 8; bw = (W - 120 - gap * (n - 1)) / n                # 진행 막대
    for j, bb in enumerate(BEATS):
        x = 60 + j * (bw + gap); k = seg(t, bb[0], bb[1])
        d.rounded_rectangle([x, 70, x + bw, 78], 4, fill=DIM + (255,))
        if k > 0: d.rounded_rectangle([x, 70, x + bw * k, 78], 4, fill=ACC + (255,))
    img.paste(lay, (0, 0), lay)


def frame(t):
    img = bake.memo('bg', bg).copy(); i = beat_at(t); b = BEATS[i]; lt = t - b[0]; x, y, w, h = SLOT
    cur = slot_img(i, t)
    if b[7] == 'push' and lt < 0.35 and i > 0:                             # 칸 안 밀어내기
        k = eio(lt / 0.35); prev = slot_img(i - 1, b[0] - 1e-3); c = Image.new('RGB', (w, h))
        c.paste(prev, (int(-w * k), 0)); c.paste(cur, (int(w * (1 - k)), 0)); cur = c
    elif lt < 0.12 and i > 0:                                              # 컷 + 살짝 번쩍
        cur = Image.blend(cur, Image.new('RGB', cur.size, WHITE), 0.35 * (1 - lt / 0.12))
    img.paste(cur, (x, y)); draw_text(img, i, t)
    return img


M = types.SimpleNamespace(W=W, H=H, FPS=FPS, DUR=DUR, frame=frame, SCENES=SCENES)


def build_audio(path):
    voice = np.zeros(int((DUR + 0.5) * AU.SR), np.float32)
    for q in QUOTES.values(): V.put_sound(voice, V.sound(SRC, q['a'], q['a'] + q['dur']), q['at'], fade=0.06, gain=1.4)
    os.makedirs('out', exist_ok=True); vp = 'out/_voice.wav'; AU.write_wav(vp, voice)
    rng = np.random.default_rng(5); sfx = AU.new_track(DUR)
    for i, b in enumerate(BEATS):                                          # 현장 소리 — 인용 구간은 비운다
        spans = [(b[0], b[1])]
        if i in QUOTES: q = QUOTES[i]; spans = [(b[0], q['at']), (q['at'] + q['dur'], b[1])]
        for s0, s1 in spans:
            if s1 - s0 > 0.2: V.put_sound(sfx, V.sound(SRC, b[2] + (s0 - b[0]), b[2] + (s1 - b[0])), s0, fade=0.08, gain=0.3)
        if i: (AU._put(sfx, AU.whoosh(rng, 0.45, 0.28, 1800), b[0] - 0.05) if b[7] == 'push' else AU.tick(sfx, rng, b[0], 0.18))
    try:   # 무드 이름은 audio.MOODS 안에서 — 모르는 이름은 무음이 된다
        bg_ = AU.bgm([(0, 4, 'intro', {}), (4, 15, 'groove', {}), (15, DUR - 2, 'main', {}), (DUR - 2, DUR, 'outro', {})], DUR, palette='study', bpm=100)
    except BaseException as ex:
        print('배경음 없이:', ex); bg_ = None
    return AU.mixdown(DUR, path, bg_, sfx, [(0.0, vp)], bgm_gain=0.4, duck=0.25, voice_gain=1.0)


if __name__ == '__main__':
    bake.cli(M, out=os.path.join(HERE, 'out', 'video_explain_example.mp4'), audio=build_audio)
