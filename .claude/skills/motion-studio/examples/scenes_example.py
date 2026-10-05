#!/usr/bin/env python3
"""장면 코드 본보기 — 구조를 보여 주는 뼈대다. ⛔ 이대로 복사해 값만 바꾸는 틀이 아니다.

영상마다 이 파일처럼 scenes.py 를 새로 짠다. 바뀌는 것:
  · 키트(기획서 §2-B) · 장면마다 세기 · «찍는 법»(카메라) · 요소가 나오는 순서와 방식 · 강조 · 소리 (기획서 §5 · 유저 메모)
  · 이 영상만의 움직임 — 재료(camera · appear · fx)에 없으면 여기서 새로 짠다
안 바뀌는 것 (바닥):
  · 요소의 마지막 모습(자리 · 크기 · 글자 · 색) = 캔버스 아트보드 그대로 — 카메라는 그 화면을 «찍는» 방법이다
  · 장면 길이는 대사 길이 + 0.7초 이상 (대사가 있을 때)

작업 폴더에서:  python3 scenes.py --sheet  ·  --check  →  python3 scenes.py --bake
"""
import os
import sys

SKILL = os.environ.get('MOTION_SKILL') or os.path.expanduser('~/.claude/skills/motion-studio')   # ← 이 영상의 스킬 경로로
sys.path.insert(0, os.path.join(SKILL, 'scripts'))

from core import appear, audio, bake, camera, canvas, fx, kit, motion    # noqa: E402
from core.ease import seg, eo                                # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)   # fonts/ · 재료/ · voice/ 를 여기서 찾는다
BOARD = lambda n: os.path.join(HERE, 'canvas', '확정', n)
W, H, FPS = 1080, 1920, 30

# ── 장면 (아트보드 · 길이) — 길이는 대사에 맞춰 늘린다 ──
SC = [('Main.dc.html', 3.2), ('Scene02.dc.html', 4.5), ('Scene03.dc.html', 4.0)]
VOICE = {0: 'voice/01.wav', 1: 'voice/02.wav'}   # 장면 번호 → 대사 (없으면 빈 dict)
VOFF = 0.3                                        # 장면 시작 + 이만큼 뒤에 대사


def _len(p):
    try: return len(audio.read_wav(p)) / audio.SR
    except Exception: return 0


DURS = [max(d, _len(VOICE[i]) + VOFF + 0.7) if i in VOICE and os.path.exists(VOICE[i]) else d for i, (_, d) in enumerate(SC)]
STARTS = [sum(DURS[:i]) for i in range(len(DURS))]
SCENES = [(s, s + d) for s, d in zip(STARTS, DURS)]   # bake.sheet 가 장면 경계로 쓴다
DUR = SCENES[-1][1]
B = [canvas.read_board(BOARD(n)) for n, _ in SC]     # [(root, els)]
KIT = '팝'                                         # 기획서 §2-B — 이 영상의 움직임 문법 (reference/kits.md)
K = kit.load(KIT)
PAL = {'bg': B[0][0]['bg'], 'txt': (20, 20, 20), 'dim': (120, 120, 120), 'white': (255, 255, 255),   # 효과 사전이 쓰는 색 묶음 —
       'accent': (255, 204, 0), 'red': (230, 60, 50), 'panel': (30, 30, 34)}                         # 캔버스 색에서 고른다


# ── 장면 함수 — 이 영상만의 연출 (예시: 장면마다 «찍는 법»이 다르다) ──
# 장면 = 그리기(canvas · appear · fx) → 찍기(camera). 세 장면이 같은 장치를 쓰지 않게 짰다.
def s1(lt, root, els):
    """훅: 카메라가 제목 한 글자에 바짝 붙어 있다가 빠지며 전체가 드러난다 → 나머지는 줄지어"""
    img = canvas.background(root)
    title = max(els, key=lambda e: e['size'] if e['text'] else 0)        # 가장 큰 글자 = 제목
    rest = [e for e in els if e is not title]
    motion.put(img, title, s=motion.breathe(lt, 0.015))                   # 제목은 처음부터 — 움직이는 건 카메라 (머무는 동안 숨쉬기)
    for i, e in enumerate(rest):
        appear.put(img, e, seg(lt, 1.0 + i * 0.1, 1.4 + i * 0.1), 'up' if e['text'] else 'pop', dist=60)   # 키트 «팝»의 등장
    c = camera.keys(lt, [(0, camera.on(title, img, fill=1.6, dx=0.1)),   # 화면보다 크게 — 무엇인지 궁금하게
                         (1.1, camera.full(img), '부드럽게')])
    return camera.shoot(img, camera.drift(c, max(0, lt - 1.1), DURS[0]), (W, H))  # 다 보인 뒤에도 천천히 흐른다


def s2(lt, root, els):
    """목록: 전체 → 항목마다 컷으로 끊어 다가가 보기(펀치 인 컷) → 다시 전체 · 나머지는 초점 밖"""
    order = sorted(els, key=lambda e: (round(e['y'] / 200), e['x']))
    if lt >= 0.4: img = bake.memo('s2-done', lambda: canvas.draw_board(root, els))   # 다 나온 뒤엔 한 번만 그린다 (굽기 속도)
    else:
        img = canvas.background(root)
        for e in order: appear.put(img, e, seg(lt, 0.1, 0.4), 'fade')
    cards = [e for e in order if e['bg'] and e['w'] > W * 0.5][:3]
    ks = [(0, camera.full(img))]
    for i, e in enumerate(cards):                                         # 같은 시각 두 번 = 그 순간 컷
        t = 0.8 + i * 0.9; ks += [(t, ks[-1][1]), (t, camera.on(e, img, fill=0.85))]
    ks += [(0.8 + len(cards) * 0.9, ks[-1][1]), (0.8 + len(cards) * 0.9 + 0.5, camera.full(img), '부드럽게')]
    k = sum(1 for i in range(len(cards)) if lt >= 0.8 + i * 0.9) - 1
    if 0 <= k < len(cards) and lt < 0.8 + len(cards) * 0.9:
        img = camera.defocus(img, [cards[k]], 8)                          # 보는 항목만 또렷
    if len(cards) >= 3 and lt >= 0.8 + 2 * 0.9:                            # 강조 하나: 3번 항목이 «툭» (키트 «팝»의 맥박)
        img = img.copy(); motion.put(img, cards[2], s=motion.pulse(lt, 0.8 + 2 * 0.9 + 0.05))
    return camera.shoot(img, camera.keys(lt, ks), (W, H))


def s3(lt, root, els):
    """그림 공개: 손에 든 카메라로 그림에 다가가고, 그림 속 한 곳을 효과 사전의 콜아웃으로 짚는다"""
    img = canvas.background(root)
    pic_e = next((e for e in els if e['src']), None)
    for e in els:
        if e is pic_e: appear.put(img, e, seg(lt, 0.3, 0.9), 'fade')
        elif e is els[0]: appear.lines(img, e, seg(lt, 0.1, 0.8))
        else: appear.put(img, e, seg(lt, 1.2, 1.6), 'fade')
    if pic_e and lt > 1.6:                                                # 캔버스 요소를 fx 에 넘기기: canvas.box · canvas.pic
        img = fx.callout(img, lt - 1.6, canvas.box(pic_e), canvas.pic(pic_e), PAL, (0.7, 0.3), '여기', reach=(-280, 220))
    base = camera.on(pic_e, img, fill=0.75) if pic_e else camera.full(img)
    c = camera.keys(lt, [(0, camera.full(img)), (1.4, base, '부드럽게')])
    return camera.shoot(img, camera.handheld(c, lt, amp=3), (W, H))   # 찍을 때 화면 크기를 꼭 준다


SCENE_FN = [s1, s2, s3]
# 기획서 §5 를 그대로 옮긴 표 — --check 가 이걸 본다 (이름은 kit.py 의 이름: python3 <스킬>/scripts/core/kit.py 팝)
# 키트는 바닥이지 제한이 아니다 — 키트 밖은 'borrow' 에 이유만 적으면 된다(벌점 아님) · 기본 움직임(fade · up · pop · 흐르기 …)은 모든 키트에 있다
PLAN = [
    {'level': 3, 'camera': ['빠지며 공개', '천천히 흐르기'], 'enter': ['up', 'pop'], 'emph': [], 'kick': None},                       # 훅 = 봉우리
    {'level': 1, 'camera': ['끊어 다가가기'], 'enter': ['fade'], 'emph': ['pulse'], 'kick': None},
    {'level': 2, 'camera': ['손에 든 카메라'], 'enter': ['fade'], 'emph': ['callout'], 'kick': None, 'borrow': '그림 공개는 다큐 키트의 손에 든 카메라 · 콜아웃'},
]
# 장면 경계 편집 = 들어오는 장면의 세기로 키트가 고른다 → {경계: (이름, 길이, 옵션)}
EDIT = K.cuts([p['level'] for p in PLAN[1:]])
# 메모로 정한 편집이 있으면 그 칸만 바꾼다 — 예: EDIT[2] = ('zoom_cut', 0.5, {})  (키트 밖이면 PLAN 에 borrow)


def render(k, t, xf=0.0):
    """장면 k 를 전체 시각 t 로 — 장면 안 시각은 전환이 시작될 때부터 흐른다 (들어오는 장면이 빈 화면으로 밀려오지 않게)"""
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
    return K.finish(render(k, t, EDIT.get(k, ('', 0, {}))[1]), t)        # 화면 겹은 frame 끝에서 한 번 (전환 중에도 같게)


def build_audio(path):
    """배경음(액션 분위기 → palette) + 편집 순간 효과음 + 대사 — 소리도 장면마다 다르게 (예시)"""
    import numpy as np
    rng = np.random.default_rng(7); sfx = audio.new_track(DUR)
    for j, (name, xf, _) in EDIT.items():                                    # 경계 편집 소리 — 키트의 sfx 짝 (impact 만 hit)
        if name == 'impact': audio.hit(sfx, rng, STARTS[j], 0.8)
        elif name != 'cut' and K.sfx.get('cut') == 'whoosh': audio._put(sfx, audio.whoosh(rng, max(0.3, xf), 0.45, 2400), STARTS[j] - xf / 2)
    try:
        bg = audio.bgm([(0, 1.2, 'sting', {}), (1.2, DUR - 1.5, 'bouncy', {}), (DUR - 1.5, DUR, 'outro', {'hit': DUR - 1.0})], DUR, palette=K.music)
    except SystemExit as e:   # 사운드폰트가 없으면 배경음 없이 (안내는 check.py)
        print(e); bg = None
    voices = [(STARTS[i] + VOFF, p) for i, p in VOICE.items() if os.path.exists(p)]
    return audio.mixdown(DUR, path, bg, sfx, voices)


if __name__ == '__main__':
    bake.cli(sys.modules[__name__], out=os.path.join(HERE, 'out', 'video.mp4'), audio=build_audio)
    if canvas.missing: print('⚠ 못 찾음:', ' · '.join(sorted(canvas.missing)))
