#!/usr/bin/env python3
"""영상 넣기 샘플 — 모니터 벽 (reference/video.md). ⛔ 이대로 복사해 값만 바꾸는 틀이 아니다.

여러 영상이 TV 처럼 함께 돌다가 → 한 화면으로 밀고 들어가 설명(멈추고 짚기) → 빠져나와 → 다른 화면으로 → 마무리.
보여 주는 것:
  · Clip(원본, 구간, crop) 로 영상을 «시각마다 바뀌는 그림 요소»로 쓰기 — 여러 개 동시에
  · ★영상은 카메라로 찍은 «뒤에» paste_on_screen — 작은 모니터를 화면 가득 키워도 원본 화질
  · 영상 시각은 장면 시각과 따로 (clip_t) — 집중하면 처음부터 · 멈춤 = 같은 시각 붙잡기
  · 원본 소리 = 목소리 트랙 (집중 화면 소리만 · 멈춤 동안 쉰다) → 배경음은 그 아래로
실제 작업에서는 벽 · 모니터를 캔버스에 짓고(모니터 칸 = `재료/영상_<이름>.png` 대표 장면) V.find(els, 이름) 으로 자리를 읽는다.
여기서는 캔버스 없이 돌려 볼 수 있게 벽을 코드로 그렸다.

  python3 video_example.py 원본1.mp4 [원본2.mp4 …] --sheet / --check / --bake
"""
import os
import sys
import types

import numpy as np
from PIL import Image, ImageDraw, ImageFont

SKILL = os.environ.get('MOTION_SKILL') or os.path.expanduser('~/.claude/skills/motion-studio')
sys.path.insert(0, os.path.join(SKILL, 'scripts'))
from core import audio as AU, bake, camera as C, video as V      # noqa: E402
from core.ease import seg, eo, back                                 # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
W, H, FPS = 1920, 1080, 30
AW, AH = 3840, 2160                                                 # 벽 아트보드 = 화면 2배 → 벽 전체는 0.5배로 찍힌다
BG, BEZEL, WHITE, ACC, GREY = (14, 16, 24), (34, 36, 44), (240, 240, 236), (255, 170, 60), (130, 134, 146)
_fp = 'fonts/BlackHanSans-Regular.ttf'
FONT = _fp if os.path.exists(_fp) else os.path.join(SKILL, 'assets', 'fonts', 'Pretendard-Bold.otf')
_F = {}


def font(sz):
    if sz not in _F: _F[sz] = ImageFont.truetype(FONT, sz)
    return _F[sz]


# ── 영상 컷 표 (기획서 §3-V) — 원본에서 컷 모음표(V.sheet)를 보고 고른 구간 ──
SRCS = [a for a in sys.argv[1:] if not a.startswith('--') and os.path.exists(a)] or ['재료/원본.mp4']
SRC = lambda i: SRCS[i % len(SRCS)]
_dur = {s: max(1.0, V.probe(s)['dur']) for s in SRCS}
_box = {s: V.letterbox(s) for s in SRCS}                            # 검은 띠 뺀 화면 (로고 띠는 손으로 더 뺀다)
# 샘플이라 원본 길이의 비율로 잡았다 — 실제로는 V.cuts → V.sheet 모음표를 보고 컷 구간(초)을 적는다
SHOTS = [(SRC(i), _dur[SRC(i)] * f0, _dur[SRC(i)] * f1) for i, (f0, f1) in enumerate([(.05, .25), (.25, .35), (.35, .45), (.45, .55), (.6, .8), (.8, .95)])]
LABEL = ['첫 장면', '둘째', '셋째', '넷째', '다섯째', '여섯째']
CLIPS = [V.Clip(s, a, b, crop=_box[s]) for s, a, b in SHOTS]

MON = [{'x': 260 + c * 1140, 'y': 470 + r * 760, 'w': 1040, 'h': 585} for r in range(2) for c in range(3)]   # 모니터 = 아트보드 요소
FOCUS = {4: (2.4, 6.4), 5: (8.1, 11.4)}                              # 모니터 → (밀고 들어가기 시작, 빠져나오기 시작)
FREEZE = (4, 1.9, 0.6)                                               # 모니터 4 · 집중 1.9초 뒤 · 0.6초 멈추고 짚기
DUR = 14.0
SCENES = [(0, 2.4), (2.4, 6.4), (6.4, 8.1), (8.1, 11.4), (11.4, DUR)]


def wall_static():
    img = Image.new('RGB', (AW, AH), BG); d = ImageDraw.Draw(img)
    for x in range(0, AW, 120): d.line([(x, 0), (x, AH)], fill=(20, 23, 32), width=2)
    for y in range(0, AH, 120): d.line([(0, y), (AW, y)], fill=(20, 23, 32), width=2)
    for i, m in enumerate(MON):
        d.rounded_rectangle([m['x'] - 26, m['y'] - 26, m['x'] + m['w'] + 26, m['y'] + m['h'] + 26], 28, fill=BEZEL, outline=(60, 63, 74), width=4)
        d.rectangle([m['x'], m['y'], m['x'] + m['w'], m['y'] + m['h']], fill=(4, 5, 8))
        d.text((m['x'] + 6, m['y'] + m['h'] + 60), f'CH {i + 1:02d}', font=font(46), fill=ACC, anchor='lm')
        d.text((m['x'] + 170, m['y'] + m['h'] + 60), LABEL[i], font=font(46), fill=GREY, anchor='lm')
    return img


def cam_at(t):
    """벽 전체 ↔ 모니터 가득 — on(모니터) 로 끝 화면이 정확히 그 칸이 된다"""
    full = C.Cam(AW / 2, AH / 2, W / AW, 0)
    on = {k: C.on((MON[k]['x'], MON[k]['y'], MON[k]['w'], MON[k]['h']), (AW, AH), fill=1.0, out=(W, H)) for k in FOCUS}
    ks = [(0, full)]
    for k, (a, b) in FOCUS.items(): ks += [(a, full), (a + 0.9, on[k], '부드럽게'), (b, on[k]), (b + 0.9, full, '부드럽게')]
    c = C.keys(t, ks)
    end = max(b for _, b in FOCUS.values()) + 0.9
    return C.drift(c, t - end, DUR - end, amt=0.03) if t > end else c


def clip_t(i, t):
    """모니터 i 의 영상 시각 — 평소엔 저마다 조금씩 어긋나게 · 집중하면 처음부터 · 멈춤 동안 붙잡기"""
    if i in FOCUS and FOCUS[i][0] <= t:
        lt = t - FOCUS[i][0]; k, at, hold = FREEZE
        if i == k and at <= lt < at + hold: lt = at
        elif i == k and lt >= at + hold: lt -= hold
        return lt
    return t + i * 0.37


def frame(t):
    cam = cam_at(t)
    img = C.shoot(bake.memo('wall', wall_static), cam, (W, H))
    target = next((k for k, (a, b) in FOCUS.items() if a - 0.5 <= t < b + 0.6), None)
    k4, at, hold = FREEZE
    for i, m in enumerate(MON):
        on_k = seg(t, 0.15 + i * 0.16, 0.45 + i * 0.16)              # TV 켜짐 — 가로 선이 위아래로 열린다
        if on_k <= 0: continue
        dim = 0.0
        if target is not None and i != target:                        # 집중 화면 말고는 어둡게
            a, b = FOCUS[target]
            dim = 0.6 * (seg(t, a - 0.5, a - 0.2) if t <= b else 1 - seg(t, b, b + 0.6))
        if on_k < 1:
            e = dict(m); hh = m['h'] * eo(on_k); e['y'] = m['y'] + (m['h'] - hh) / 2; e['h'] = max(4, hh)
            V.paste_on_screen(img, Image.new('RGB', (16, 9), WHITE) if on_k < 0.4 else CLIPS[i].frame(0), 0, e, cam)
            continue
        fr = CLIPS[i].frame(clip_t(i, t))
        if i == k4 and FOCUS[k4][0] + at <= t < FOCUS[k4][0] + at + hold:   # 멈춤: 색 바래기 · 번쩍
            lt = t - FOCUS[k4][0] - at; fr = Image.blend(fr, fr.convert('L').convert('RGB'), 0.55)
            if lt < 0.15: fr = Image.blend(fr, Image.new('RGB', fr.size, WHITE), 0.7 * (1 - lt / 0.15))
        V.paste_on_screen(img, fr, 0, m, cam, dim=dim)
    # ── 영상 위 그래픽 (화면 좌표) ──
    d = ImageDraw.Draw(img)
    zoom = (cam.z - W / AW) / (W / MON[0]['w'] - W / AW)               # 0 = 벽 · 1 = 모니터 가득
    end = max(b for _, b in FOCUS.values()) + 0.9
    if zoom < 0.15:
        title, kk = ('오늘의 채널', seg(t, 0.2, 0.6)) if t < end else ('여섯 개의 채널, 하나의 이야기', seg(t, end + 0.1, end + 0.5))
        if kk > 0:
            sc = 1 + 0.4 * (1 - back(kk, 1.4)); d.text((W / 2, 92), title, font=font(int(64 * sc)), fill=WHITE, anchor='mm')
    for k, (a, b) in FOCUS.items():                                    # 모니터 가득일 때 자막 띠
        if a + 0.9 <= t < b:
            lt = t - a - 0.9; ka = eo(seg(lt, 0, 0.3))
            d.rectangle([0, H - 150 * ka, W, H], fill=(10, 10, 14))
            d.text((90, H - 75 * ka), f'CH {k + 1:02d}', font=font(52), fill=ACC, anchor='lm')
            d.text((300, H - 75 * ka), LABEL[k], font=font(52), fill=WHITE, anchor='lm')
            if k == k4 and at - 0.9 <= lt < at - 0.9 + hold:            # 멈추고 짚기 — 원 · 한 마디
                q = lt - (at - 0.9); r = 220 * eo(seg(q, 0.05, 0.35))
                if r > 2: d.ellipse([W / 2 - r, H * 0.44 - r, W / 2 + r, H * 0.44 + r], outline=ACC, width=12)
                sc = 1 + 0.5 * (1 - back(seg(q, 0.05, 0.25), 1.5))
                d.text((W / 2, 140), '여기를 보세요', font=font(int(96 * sc)), fill=ACC, anchor='mm')
    return img


M = types.SimpleNamespace(W=W, H=H, FPS=FPS, DUR=DUR, frame=frame, SCENES=SCENES)


def build_audio(path):
    """원본 소리 = 목소리 트랙 (집중 화면만 · 멈춤 동안 쉰다) + 우리 효과음 · 배경음"""
    v = np.zeros(int((DUR + 0.5) * AU.SR), np.float32)
    k4, at, hold = FREEZE
    for k, (a, b) in FOCUS.items():
        s, c0 = SHOTS[k][0], CLIPS[k].a
        if not V.probe(s)['audio']: continue
        if k == k4:
            V.put_sound(v, V.sound(s, c0, c0 + at), a)
            V.put_sound(v, V.sound(s, c0 + at, c0 + (b - a) - hold), a + at + hold)
        else:
            V.put_sound(v, V.sound(s, c0, c0 + (b - a)), a, gain=0.9)
    os.makedirs('out', exist_ok=True); vp = 'out/_video_voice.wav'; AU.write_wav(vp, v)
    rng = np.random.default_rng(2); sfx = AU.new_track(DUR)
    for i in range(len(MON)): AU.tick(sfx, rng, 0.15 + i * 0.16, 0.1)                 # TV 켜짐
    for k, (a, b) in FOCUS.items():
        AU._put(sfx, AU.whoosh(rng, 0.7, 0.4, 1500), a + 0.1); AU._put(sfx, AU.whoosh(rng, 0.7, 0.3, 900), b + 0.1)
    AU.hit(sfx, rng, FOCUS[k4][0] + at, 0.9)
    end = max(b for _, b in FOCUS.values()) + 0.9; AU.hit(sfx, rng, end + 0.1, 0.7)
    try:   # 원본에 음악이 깔려 있으면 bgm_gain 을 0.2~0.35 로 낮추거나 배경음을 뺀다
        bg = AU.bgm([(0, 2.4, 'sting', {}), (2.4, end - 0.9, 'tense', {}), (end - 0.9, DUR, 'outro', {})], DUR, palette='cinema', bpm=110)
    except BaseException as ex:
        print('배경음 없이:', ex); bg = None
    return AU.mixdown(DUR, path, bg, sfx, [(0.0, vp)], bgm_gain=0.45, duck=0.4, voice_gain=0.9)


if __name__ == '__main__':
    bake.cli(M, out=os.path.join(HERE, 'out', 'video_example.mp4'), audio=build_audio)
