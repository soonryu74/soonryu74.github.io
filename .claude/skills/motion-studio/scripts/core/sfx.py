"""효과음 재료 — 81가지 조리법 · 묶음 7개 (reference/sound.md)

  make(이름, seed=0)          → mono float32 (앞 무음 없음 · 크기 맞춤) · 같은 이름도 seed 마다 높이 · 결이 조금씩 다르다
  put_sfx(트랙, 이름, 초, g)   트랙에 얹기 (audio.new_track)
  SETS[묶음][자리]             묶음(경쾌 팝 · 시네마 · 동화 · 테크·앱 · 코믹 · 레트로 게임 · 차분) × 자리(cut · enter · emph · impact · done · tick)
  Kit(묶음).put(트랙, 자리, 초, g)   그 자리의 후보를 돌려 가며 · 부를 때마다 seed 를 바꿔 → 같은 소리가 똑같이 되풀이되지 않는다
  LIB = {이름: (갈래, 쉬운 설명, 함수)}   · python3 sfx.py list  → 목록
sf2 가 없으면 sf2 를 쓰는 소리는 같은 갈래의 합성 소리로 바뀐다(멈추지 않는다).
"""
import numpy as np

if __package__ in (None, ''):   # python3 sfx.py list 로 바로 실행할 때
    import os as _os, sys as _sys; _sys.path.insert(0, _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
    from core.sfxbase import (SR, T, tt, hz, put, env, bp, lp, hp, sweep_noise, tone, fx, sf, gm_drum, finish, NoSF2)
else:
    from .sfxbase import (SR, T, tt, hz, put, env, bp, lp, hp, sweep_noise, tone, fx, sf, gm_drum, finish, NoSF2)

LIB = {}


def R(group, desc):
    def deco(fn):
        LIB[fn.__name__] = (group, desc, fn); return fn
    return deco


def j(rng, a=-1, b=1): return int(rng.integers(a, b + 1))   # 반음 흔들기


# ═══ 1. 휙 — 전환 ═══
@R('휙 · 전환', '공기 가르는 휙 (두 겹 · 높이가 내려가며)')
def air_swoosh(rng):
    d = 0.45; a = sweep_noise(rng, d, 3800, 900, 0.4, 0.8); b = sweep_noise(rng, d, 1500, 400, 0.5)
    x = (a + 0.6 * b) * np.sin(np.linspace(0, np.pi, T(d))) ** 1.6
    return fx(x, reverb=0.12)


@R('휙 · 전환', '짧고 날카로운 칼바람')
def blade_swish(rng):
    d = 0.22; x = sweep_noise(rng, d, 6000, 2500, 0.25, 0.6) * np.sin(np.linspace(0, np.pi, T(d))) ** 3
    return fx(x, reverb=0.08)


@R('휙 · 전환', '묵직하게 지나가는 바람 (큰 화면 전환)')
def deep_whoosh(rng):
    d = 0.9; x = sweep_noise(rng, d, 300, 1400, 0.6, 1.2) * np.sin(np.linspace(0, np.pi, T(d))) ** 1.2
    sub = tone(lambda t: 70 + 40 * t / d, d) * np.sin(np.linspace(0, np.pi, T(d))) * 0.5
    return fx(x + sub, reverb=0.2, room=0.6)


@R('휙 · 전환', '거꾸로 차오르는 심벌 (다음 장면 직전)')
def reverse_cymbal(rng):
    return sf([(0, 60 + j(rng), 110, 1.2)], 1.3, 0, 119)


@R('휙 · 전환', '하프 쓸어 올리기 (동화 · 꿈)')
def harp_up(rng):
    scale = [0, 2, 4, 7, 9]; ks = [55 + 12 * (i // 5) + scale[i % 5] for i in range(14)]
    return fx(sf([(i * 0.035, k + j(rng), 80 + i * 2, 0.8) for i, k in enumerate(ks)], 1.6, 0, 46), reverb=0.25, room=0.6)


@R('휙 · 전환', '하프 쓸어 내리기 (돌아가기 · 회상)')
def harp_down(rng):
    scale = [0, 2, 4, 7, 9]; ks = [55 + 12 * (i // 5) + scale[i % 5] for i in range(14)][::-1]
    return fx(sf([(i * 0.035, k, 95 - i * 2, 0.8) for i, k in enumerate(ks)], 1.6, 0, 46), reverb=0.25, room=0.6)


@R('휙 · 전환', '현악기 휘몰아 오르기 (웅장한 전환)')
def string_rise(rng):
    ks = list(range(55, 80, 2))
    return fx(sf([(i * 0.03, k, 70 + i * 3, 0.25) for i, k in enumerate(ks)], 0.8, 1, 48), reverb=0.3, room=0.7)


@R('휙 · 전환', '부드러운 숨결 휙 (조용한 넘김)')
def breath_swish(rng):
    d = 0.5; x = lp(rng.standard_normal(T(d)), 2500) * np.sin(np.linspace(0, np.pi, T(d))) ** 2.2
    x += sweep_noise(rng, d, 1200, 700, 0.6) * np.sin(np.linspace(0, np.pi, T(d))) ** 2 * 0.5
    return fx(x, reverb=0.1)


@R('휙 · 전환', '레이저 퓽 (게임 · 레트로)')
def laser(rng):
    d = 0.35; x = tone(lambda t: 1800 * np.exp(-t * 9) + 200, d, 'square') * env(T(d), 0.002, 0.1)
    return fx(x, hi=7000, delay=0.07)


@R('휙 · 전환', '솟아오르는 긴장 (1.5초 · 큰 공개 직전)')
def riser(rng):
    d = 1.5; n = sweep_noise(rng, d, 400, 6000, 0.3, 1.6) * np.linspace(0, 1, T(d)) ** 2
    s = tone(lambda t: 200 * 2 ** (2.5 * t / d), d, harm=(1, 2), amps=(1, .3)) * np.linspace(0, 1, T(d)) ** 2.5 * 0.4
    return fx(n + s, reverb=0.2)


@R('휙 · 전환', '카드 휙 넘김 (짧은 종이 바람)')
def card_flick(rng):
    d = 0.12; x = bp(rng.standard_normal(T(d)), 4500, 3000) * np.exp(-tt(d) * 25)
    return x


# ═══ 2. 쿵 — 착지 · 강조 ═══
@R('쿵 · 착지', '오케스트라 쾅 (제목 · 결정타)')
def orch_hit(rng):
    r = 60 + j(rng, -2, 2); return fx(sf([(0, k, 125, 0.4) for k in (r - 12, r, r + 4, r + 7)], 1.5, 0, 55), reverb=0.3, room=0.7)


@R('쿵 · 착지', '타이코 북 둥 (힘 있는 착지)')
def taiko(rng):
    return fx(sf([(0, 48 + j(rng), 127, 0.6)], 1.2, 0, 116), reverb=0.25, room=0.6)


@R('쿵 · 착지', '팀파니 두르르 쾅 (발표 · 결과)')
def timpani_roll_hit(rng):
    ns = [(i * 0.045, 41, 50 + i * 4, 0.1) for i in range(14)] + [(0.65, 41, 127, 1.0), (0.65, 29, 120, 1.0)]
    return fx(sf(ns, 2.0, 0, 47), reverb=0.3, room=0.7)


@R('쿵 · 착지', '큰북 + 심벌 쾅 (행진 · 축하)')
def bass_drum_crash(rng):
    return fx(gm_drum([(0, 36, 127), (0, 49, 120), (0, 57, 90)], 2.0, 48), reverb=0.2)


@R('쿵 · 착지', '주먹 퍽 (코믹 액션)')
def punch(rng):
    return sf([(0, 60 + j(rng, -3, 3), 127, 0.3)], 0.6, 3, 126)


@R('쿵 · 착지', '폭발 콰앙 (가장 큰 한 방)')
def explosion(rng):
    return fx(sf([(0, 60, 127, 1.5)], 2.5, 3, 127), lo=30)


@R('쿵 · 착지', '푹신하게 툭 (사진 · 카드 내려앉기)')
def soft_thud(rng):
    d = 0.35; x = tone(lambda t: 90 * np.exp(-t * 14) + 55, d) * np.exp(-tt(d) * 12)
    x += lp(rng.standard_normal(T(d)), 900) * np.exp(-tt(d) * 30) * 0.35
    return x


@R('쿵 · 착지', '종이 상자 툭 (가볍게 놓기)')
def box_tap(rng):
    d = 0.25; x = bp(rng.standard_normal(T(d)), 700, 400) * np.exp(-tt(d) * 28)
    x += tone(lambda t: 160 * np.exp(-t * 20) + 110, d) * np.exp(-tt(d) * 22) * 0.6
    return fx(x, reverb=0.05)


@R('쿵 · 착지', '808 둥 — 깊게 울리는 저음 (힙한 착지)')
def boom_808(rng):
    d = 1.2; x = tone(lambda t: 55 * (1 + 1.5 * np.exp(-t * 30)), d, harm=(1, 2), amps=(1, .15)) * np.exp(-tt(d) * 2.8)
    return fx(x, drive=6, hi=4000)


@R('쿵 · 착지', '쇠 땡 (단단한 것 · 놀람)')
def metal_clang(rng):
    d = 1.4; t = tt(d); f0 = 420 * 2 ** (j(rng, -2, 2) / 12); x = np.zeros_like(t)
    for m, a, dc in ((1, 1, 3), (2.76, .6, 4), (5.4, .4, 6), (8.93, .25, 8)):
        x += a * np.sin(2 * np.pi * f0 * m * t) * np.exp(-t * dc)
    x += bp(np.random.default_rng(1).standard_normal(len(t)), 3000, 2000) * np.exp(-t * 40) * 0.5
    return fx(x, reverb=0.2)


# ═══ 3. 톡 — 등장 · 하나씩 ═══
@R('톡 · 등장', '나무 톡 (깔끔한 등장 · 목록)')
def woodblock(rng):
    return gm_drum([(0, 76 + j(rng, 0, 1), 115)], 0.4)


@R('톡 · 등장', '캐스터네츠 착 (경쾌 · 리듬)')
def castanets(rng):
    return sf([(0, 60 + j(rng), 120, 0.2)], 0.4, 8, 115)


@R('톡 · 등장', '클라베스 딱 (또렷한 한 점)')
def claves(rng):
    return gm_drum([(0, 75, 120)], 0.4)


@R('톡 · 등장', '현 뜯기 퉁 (귀여운 등장)')
def pizz(rng):
    return fx(sf([(0, 67 + j(rng, -2, 2), 115, 0.3)], 0.6, 0, 45), reverb=0.15)


@R('톡 · 등장', '마림바 똑 (부드러운 등장)')
def marimba_blip(rng):
    return fx(sf([(0, 72 + j(rng, -2, 2), 110, 0.3)], 0.7, 0, 12), reverb=0.15)


@R('톡 · 등장', '실로폰 띵 (밝은 등장)')
def xylo(rng):
    return fx(sf([(0, 79 + j(rng, -2, 2), 110, 0.3)], 0.6, 0, 13), reverb=0.15)


@R('톡 · 등장', '물방울 퐁 (말랑한 팝)')
def bubble_pop(rng):
    d = 0.18; x = tone(lambda t: 500 + 1400 * (t / d) ** 0.7, d) * np.exp(-tt(d) * 18) * env(T(d), 0.002, 0.02)
    return fx(x, reverb=0.08)


@R('톡 · 등장', '뽁 (마개 · 말풍선 팝)')
def cork_pop(rng):
    d = 0.12; x = tone(lambda t: 900 * np.exp(-t * 25) + 300, d) * np.exp(-tt(d) * 30)
    x += bp(rng.standard_normal(T(d)), 2500, 1500) * np.exp(-tt(d) * 60) * 0.7
    return x


@R('톡 · 등장', '화면 탭 딸깍 (앱 · UI)')
def ui_click(rng):
    d = 0.05; x = bp(rng.standard_normal(T(d)), 3500, 1500) * np.exp(-tt(d) * 120)
    x += tone(lambda t: 1800 + 0 * t, d) * np.exp(-tt(d) * 150) * 0.5
    return x


@R('톡 · 등장', '손가락 딱 (스냅)')
def snap(rng):
    return sf([(0, 60, 120, 0.15)], 0.35, 11, 121)


@R('톡 · 등장', '글로켄 팅 (작은 반짝 등장)')
def glock_tink(rng):
    return fx(sf([(0, 84 + j(rng, -2, 2), 100, 0.4)], 0.9, 0, 9), reverb=0.2)


@R('톡 · 등장', '톡톡 말풍선 (두 음 · 대화)')
def chat_blip(rng):
    r = 76 + j(rng, -2, 2); return fx(sf([(0, r, 90, 0.08), (0.07, r + 5, 95, 0.1)], 0.4, 1, 98), reverb=0.1)


# ═══ 4. 반짝 — 강조 · 마법 ═══
@R('반짝 · 강조', '첼레스타 반짝 오르기 (동화 · 마법)')
def celesta_sparkle(rng):
    ks = [76, 79, 83, 86, 88, 91]; return fx(sf([(i * 0.06, k, 90, 0.5) for i, k in enumerate(ks)], 1.4, 0, 8), reverb=0.3, room=0.6)


@R('반짝 · 강조', '풍경 소리 짜르르 (바람 · 꿈)')
def windchime(rng):
    return fx(sf([(0, 60, 110, 1.5)], 2.2, 5, 124), reverb=0.2)


@R('반짝 · 강조', '팅커벨 반짝 (요정 · 등장)')
def tinkerbell(rng):
    return fx(sf([(i * 0.05, k, 95, 0.4) for i, k in enumerate((84, 88, 91, 96))], 1.3, 0, 112), reverb=0.25)


@R('반짝 · 강조', '오르골 띠링 (따뜻한 강조)')
def musicbox(rng):
    return fx(sf([(i * 0.12, k, 95, 0.6) for i, k in enumerate((79, 84, 88))], 1.5, 0, 10), reverb=0.25)


@R('반짝 · 강조', '반짝이 흩뿌림 (마법 가루)')
def sparkle_dust(rng):
    out = np.zeros(T(1.8))
    for i in range(22):
        k = int(rng.choice([84, 86, 88, 91, 93, 96, 98])); f = hz(k); d = 0.5; t = tt(d)
        put(out, np.sin(2 * np.pi * f * t) * np.exp(-t * 9) + 0.3 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t * 14), 0.05 + rng.random() * 1.1, 0.25)
    air = sweep_noise(rng, 1.4, 5000, 9000, 0.3) * np.sin(np.linspace(0, np.pi, T(1.4))) ** 2 * 0.15
    put(out, air, 0.05)
    return fx(out, reverb=0.3, room=0.6)


@R('반짝 · 강조', '트라이앵글 팅 (작은 포인트)')
def triangle(rng):
    return fx(gm_drum([(0, 81, 105)], 1.5), reverb=0.1)


@R('반짝 · 강조', '벨 트리 촤르르 (쏟아지는 반짝)')
def bell_tree(rng):
    return fx(gm_drum([(0, 84, 115)], 2.0), reverb=0.15)


@R('반짝 · 강조', '신스 차임 (깔끔한 테크 강조)')
def synth_chime(rng):
    return fx(sf([(0, 84, 100, 0.3), (0.09, 91, 95, 0.5)], 1.2, 11, 98), reverb=0.25, delay=0.12)


@R('반짝 · 강조', '빛 스윽 (형광펜 · 하이라이트)')
def shine_sweep(rng):
    d = 0.6; x = sweep_noise(rng, d, 3000, 10000, 0.2, 0.8) * np.sin(np.linspace(0, np.pi, T(d))) ** 2
    x += tone(lambda t: 2000 + 3000 * t / d, d) * np.sin(np.linspace(0, np.pi, T(d))) ** 2 * 0.15
    return fx(x, reverb=0.2)


# ═══ 5. 완성 — 딩 · 짜잔 ═══
@R('완성 · 짜잔', '마림바 딩동댕 (성공 · 정답)')
def success_marimba(rng):
    return fx(sf([(0, 72, 105, 0.3), (0.1, 76, 105, 0.3), (0.2, 79, 110, 0.3), (0.3, 84, 115, 0.8)], 1.4, 0, 12), reverb=0.2)


@R('완성 · 짜잔', '동전 띠링 (게임 · 득점)')
def coin(rng):
    return fx(sf([(0, 83, 100, 0.07), (0.07, 88, 105, 0.35)], 0.6, 1, 80), hi=8000)


@R('완성 · 짜잔', '레벨 업 (빠른 오름 · 레트로)')
def level_up(rng):
    ks = [60, 64, 67, 72, 76, 79, 84]; return fx(sf([(i * 0.05, k, 95, 0.06) for i, k in enumerate(ks)], 0.7, 1, 80), hi=8000, delay=0.08)


@R('완성 · 짜잔', '금관 빠밤! (발표 · 짜잔)')
def brass_tada(rng):
    ns = [(0, k, 100, 0.12) for k in (60, 64, 67)] + [(0.16, k, 120, 0.9) for k in (60, 64, 67, 72)]
    return fx(sf(ns, 1.5, 0, 61), reverb=0.25, room=0.6)


@R('완성 · 짜잔', '종 댕 (마무리 · 엄숙)')
def tubular_bell(rng):
    return fx(sf([(0, 72, 110, 2)], 2.8, 0, 14), reverb=0.25, room=0.7)


@R('완성 · 짜잔', '스틸드럼 띵띵 (여름 · 밝음)')
def steel_drum(rng):
    return fx(sf([(0, 76, 105, 0.3), (0.12, 81, 110, 0.6)], 1.0, 0, 114), reverb=0.15)


@R('완성 · 짜잔', '피아노 화음 딩 (따뜻한 완성)')
def piano_chord(rng):
    return fx(sf([(i * 0.015, k, 95, 1.2) for i, k in enumerate((60, 67, 72, 76, 79))], 1.8, 0, 0), reverb=0.3, room=0.6)


@R('완성 · 짜잔', '휘파람 휘익~ (놀람 · 감탄)')
def whistle_wow(rng):
    d = 0.9; f = lambda t: np.where(t < 0.35, 900 + 1500 * t / 0.35, 2400 - 1300 * np.clip((t - 0.35) / 0.55, 0, 1) ** 1.3)
    x = tone(f, d, harm=(1, 2), amps=(1, .08)) * env(T(d), 0.03, 0.25) * (1 + 0.04 * np.sin(tt(d) * 2 * np.pi * 6))
    x += bp(rng.standard_normal(T(d)), 2000, 1500) * 0.04
    return fx(x, reverb=0.15)


# ═══ 6. 코믹 ═══
@R('코믹', '슬라이드 휘슬 위로 휘~익')
def slide_up(rng):
    return fx(sf([(0, 72, 110, 0.6)], 0.7, 0, 79, bend=lambda t: -12 + 24 * min(1, t / 0.55), bend_range=12), reverb=0.1)


@R('코믹', '슬라이드 휘슬 아래로 휘~웅 (떨어짐)')
def slide_down(rng):
    return fx(sf([(0, 72, 110, 0.8)], 0.9, 0, 79, bend=lambda t: 12 - 24 * min(1, t / 0.75) ** 1.4, bend_range=12), reverb=0.1)


@R('코믹', '띠요옹 스프링 (튕김)')
def boing(rng):
    d = 0.7; t = tt(d); f = 180 + 140 * np.sin(t * 2 * np.pi * 14 * np.exp(-t * 1.5)) * np.exp(-t * 3) + 60 * t
    x = tone(lambda _: f, d, harm=(1, 2, 3), amps=(1, .4, .2)) * np.exp(-t * 4)
    return fx(x, reverb=0.1)


@R('코믹', '쿠이카 우끼 (원숭이 · 엉뚱)')
def cuica(rng):
    return gm_drum([(0, 78, 120), (0.18, 79, 115)], 0.7)


@R('코믹', '비브라슬랩 따르르 (어이없음)')
def vibraslap(rng):
    return gm_drum([(0, 58, 120)], 1.2)


@R('코믹', '빠바밤~ 실패 (트롬본 내려가기)')
def sad_trombone(rng):
    ns = [(0, 67, 100, 0.33), (0.38, 66, 100, 0.33), (0.76, 65, 100, 0.33), (1.14, 64, 105, 1.0)]
    return fx(sf(ns, 2.4, 0, 57, bend=lambda t: (-0.8 * np.sin((t - 1.14) * 2 * np.pi * 5) if t > 1.3 else 0), bend_range=2), reverb=0.2)


@R('코믹', '삑 (고무 장난감)')
def squeak(rng):
    d = 0.22; x = tone(lambda t: 1300 + 500 * np.sin(np.pi * t / d), d, harm=(1, 2, 3), amps=(1, .5, .3)) * env(T(d), 0.01, 0.04)
    return x


@R('코믹', '뾰롱 (귀여운 위로 튐)')
def bloop_up(rng):
    d = 0.2; x = tone(lambda t: 300 * 2 ** (2 * t / d), d) * env(T(d), 0.005, 0.05)
    return fx(x, reverb=0.1)


@R('코믹', '스크래치 찌익 (판 긁기 · 멈춤)')
def record_scratch(rng):
    return sf([(0, 60, 120, 0.4)], 0.6, 4, 124)


@R('코믹', '귀로 드르륵 (긁는 리듬)')
def guiro(rng):
    return gm_drum([(0, 74, 115)], 0.6)


# ═══ 7. 긴장 · 경고 ═══
@R('긴장 · 경고', '두근두근 심장 (떨림)')
def heartbeat(rng):
    return sf([(0, 60, 120, 0.3), (0.75, 60, 120, 0.3)], 1.5, 4, 126)


@R('긴장 · 경고', '째깍째깍 시계 (기다림)')
def clock_tick(rng):
    return gm_drum([(i * 0.5, 33 if i % 2 == 0 else 33, 100 if i % 2 == 0 else 80) for i in range(4)], 2.1)


@R('긴장 · 경고', '낮게 깔리는 긴장 (현악 트레몰로)')
def tension_strings(rng):
    return fx(sf([(0, k, 85, 1.8) for k in (36, 43, 48)] + [(0, 49, 60, 1.8)], 2.2, 1, 44), reverb=0.25, room=0.7)


@R('긴장 · 경고', '삐— 오답 (경고)')
def buzzer(rng):
    d = 0.5; x = tone(lambda t: 160 + 0 * t, d, 'square') + 0.6 * tone(lambda t: 168 + 0 * t, d, 'square')
    return fx(x * env(T(d), 0.005, 0.05), hi=3000)


@R('긴장 · 경고', '천둥 우르릉 (충격 · 반전)')
def thunder(rng):
    return fx(sf([(0, 60, 125, 2)], 3.0, 2, 122), lo=25)


@R('긴장 · 경고', '팽팽한 한 음 둥 (반전 직전)')
def stinger_low(rng):
    ns = [(0, 36, 120, 1.5), (0, 48, 110, 1.5)]
    a = sf(ns, 2.0, 0, 48); b = sf([(0, 36, 127, 0.5)], 2.0, 0, 47)
    m = min(len(a), len(b)); return fx(a[:m] + b[:m] * 0.8, reverb=0.3, room=0.7)


# ═══ 8. 글자 · 종이 ═══
@R('글자 · 종이', '타자기 탁탁탁 + 띵 (글자 찍힘)')
def typewriter(rng):
    out = np.zeros(T(1.4))
    for i in range(8):
        d = 0.06; c = bp(rng.standard_normal(T(d)), 2200 + rng.random() * 800, 1200) * np.exp(-tt(d) * 90)
        c += tone(lambda t: 220 + 0 * t, d) * np.exp(-tt(d) * 60) * 0.4
        put(out, c, i * 0.11 + rng.random() * 0.02, 0.8 + rng.random() * 0.2)
    bell = sf([(0, 96, 100, 0.5)], 0.8, 0, 9); put(out, bell, 0.95, 0.5)
    return out


@R('글자 · 종이', '키보드 타닥타닥 (요즘 글쓰기)')
def keyboard(rng):
    out = np.zeros(T(1.0))
    for i in range(10):
        d = 0.03; c = bp(rng.standard_normal(T(d)), 4000 + rng.random() * 2000, 2500) * np.exp(-tt(d) * 160)
        put(out, c, i * 0.085 + rng.random() * 0.03, 0.6 + rng.random() * 0.4)
    return out


@R('글자 · 종이', '펜 사각사각 (손글씨 · 밑줄)')
def pen_scribble(rng):
    d = 1.0; t = tt(d); n = bp(rng.standard_normal(T(d)), 5000, 2500)
    am = (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t + 2 * np.sin(2 * np.pi * 1.3 * t))) ** 2
    return n * am * env(T(d), 0.03, 0.1)


@R('글자 · 종이', '종이 넘김 사락 (페이지 · 다음)')
def paper_flip(rng):
    d = 0.4; t = tt(d); n = sweep_noise(rng, d, 1500, 5000, 0.8, 0.7)
    crk = np.zeros(T(d))
    for _ in range(25): put(crk, bp(rng.standard_normal(T(0.01)), 6000, 3000), rng.random() * d * 0.8, 0.3)
    return (n * np.sin(np.linspace(0, np.pi, T(d))) ** 1.5 + crk) * 1.0


@R('글자 · 종이', '도장 쿵 (승인 · 확정)')
def stamp(rng):
    d = 0.4; x = tone(lambda t: 120 * np.exp(-t * 20) + 70, d) * np.exp(-tt(d) * 14)
    x += bp(rng.standard_normal(T(d)), 1200, 900) * np.exp(-tt(d) * 40) * 0.8
    return fx(x, reverb=0.1)


@R('글자 · 종이', '카메라 찰칵 (사진 · 캡처)')
def shutter(rng):
    out = np.zeros(T(0.3))
    for at, g in ((0, 1), (0.09, 0.7)):
        d = 0.04; put(out, bp(rng.standard_normal(T(d)), 3000, 2000) * np.exp(-tt(d) * 100), at, g)
    return out


# ═══ 9. 현장 · 사람 ═══
@R('현장 · 사람', '박수 짝짝짝 (환호)')
def applause(rng):
    return sf([(0, 60, 120, 2.2)], 2.6, 0, 126)


@R('현장 · 사람', '웃음 하하 (재미)')
def laughing(rng):
    return sf([(0, 60, 115, 1.6)], 2.0, 1, 126)


@R('현장 · 사람', '발소리 터벅 (걷기 · 다가감)')
def footsteps(rng):
    return sf([(i * 0.42, 60 + (i % 2), 105 + 5 * (i % 2), 0.3) for i in range(4)], 1.9, 5, 126)


@R('현장 · 사람', '문 쾅 (닫힘 · 끝)')
def door(rng):
    return sf([(0, 60, 115, 0.8)], 1.2, 3, 124)


@R('현장 · 사람', '보글보글 (물 · 끓음)')
def bubbles(rng):
    return sf([(0, 60, 110, 1.4)], 1.6, 5, 122)


@R('현장 · 사람', '새소리 짹짹 (아침 · 평화)')
def birds(rng):
    return sf([(0, 60, 105, 1.8)], 2.0, 0, 123)


# ═══ 10. 숫자 ═══
@R('숫자', '숫자 오르는 틱틱틱 (점점 높게)')
def counter_up(rng):
    out = np.zeros(T(1.3))
    for i in range(12):
        put(out, sf([(0, 72 + i, 90, 0.05)], 0.15, 1, 98), i * 0.09, 0.5)
    return out


@R('숫자', '슬롯 드르르 착! (결과 숫자)')
def slot_stop(rng):
    out = np.zeros(T(1.4))
    for i in range(14): put(out, gm_drum([(0, 76 if i % 2 else 77, 90)], 0.1), i * 0.06 * (1 + i * 0.05), 0.5)
    put(out, sf([(0, 84, 110, 0.4), (0, 79, 100, 0.4)], 0.8, 0, 12), 1.05, 0.9)
    return out


@R('숫자', '계산대 칭! (돈 · 가격)')
def cash_register(rng):
    out = np.zeros(T(1.2))
    d = 0.15; put(out, bp(rng.standard_normal(T(d)), 1500, 1000) * np.exp(-tt(d) * 30), 0, 0.6)
    put(out, sf([(0, 88, 110, 0.6), (0.02, 95, 100, 0.6)], 1.0, 0, 14), 0.08, 0.8)
    return out


# ═══ 묶음 · 고르기 ═══
SETS = {   # 자리 → 후보 (앞이 기본 · 돌려 가며)
    '경쾌 팝': dict(cut=['air_swoosh', 'card_flick'], enter=['woodblock', 'marimba_blip', 'bubble_pop'], emph=['bubble_pop', 'glock_tink', 'shine_sweep'],
                 impact=['box_tap', 'soft_thud'], done=['success_marimba', 'steel_drum'], tick=['woodblock', 'claves']),
    '시네마': dict(cut=['deep_whoosh', 'reverse_cymbal', 'string_rise'], enter=['pizz', 'harp_up'], emph=['string_rise', 'shine_sweep'],
                impact=['timpani_roll_hit', 'orch_hit', 'taiko'], done=['brass_tada', 'tubular_bell'], tick=['pizz']),
    '동화': dict(cut=['harp_up', 'harp_down', 'breath_swish'], enter=['glock_tink', 'pizz', 'xylo'], emph=['celesta_sparkle', 'tinkerbell', 'sparkle_dust'],
               impact=['soft_thud'], done=['musicbox', 'windchime'], tick=['glock_tink', 'xylo']),
    '테크·앱': dict(cut=['blade_swish', 'air_swoosh'], enter=['ui_click', 'chat_blip'], emph=['synth_chime', 'shine_sweep'],
                  impact=['boom_808', 'stamp'], done=['coin', 'synth_chime'], tick=['ui_click', 'keyboard']),
    '코믹': dict(cut=['slide_up', 'slide_down', 'blade_swish'], enter=['cork_pop', 'chat_blip', 'bloop_up'], emph=['boing', 'squeak', 'cuica'],
               impact=['punch', 'box_tap'], done=['sad_trombone', 'whistle_wow'], tick=['woodblock', 'castanets']),
    '레트로 게임': dict(cut=['laser'], enter=['coin', 'bloop_up'], emph=['level_up'], impact=['buzzer', 'boom_808'], done=['level_up', 'coin'], tick=['ui_click']),
    '차분': dict(cut=['breath_swish', 'card_flick'], enter=['marimba_blip', 'glock_tink'], emph=['musicbox', 'triangle'],
               impact=['soft_thud'], done=['piano_chord', 'tubular_bell'], tick=['card_flick']),
}
ROLES = {'cut': '전환 · 휙', 'enter': '등장 · 하나씩', 'emph': '강조 · 반짝', 'impact': '착지 · 쾅', 'done': '완성 · 마무리', 'tick': '넘김 · 박자'}
FALLBACK = {'휙 · 전환': 'air_swoosh', '쿵 · 착지': 'soft_thud', '톡 · 등장': 'bubble_pop', '반짝 · 강조': 'sparkle_dust', '완성 · 짜잔': 'whistle_wow',
            '코믹': 'boing', '긴장 · 경고': 'buzzer', '글자 · 종이': 'keyboard', '현장 · 사람': 'paper_flip', '숫자': 'ui_click'}
_CACHE = {}
_warned = set()


def make(name, seed=0):
    """이름 → 소리 (sf2 없으면 같은 갈래 합성 소리)"""
    key = (name, seed)
    if key in _CACHE: return _CACHE[key]
    if name not in LIB:
        raise KeyError(f'모르는 효과음 «{name}» — python3 <스킬>/scripts/core/sfx.py list')
    g, d, fn = LIB[name]
    try:
        x = finish(fn(np.random.default_rng(seed)))
    except NoSF2:
        alt = FALLBACK.get(g, 'bubble_pop')
        if 'sf2' not in _warned: print('⚠️ 사운드폰트가 없어 sf2 효과음은 비슷한 합성 소리로 바꿔요 (paths.SF2_GUIDE)'); _warned.add('sf2')
        x = finish(LIB[alt][2](np.random.default_rng(seed)))
    if len(_CACHE) > 400: _CACHE.clear()
    _CACHE[key] = x
    return x


LOG = []   # 이번 굽기에 놓은 효과음 [(초, 이름, 크기, 자리)] — 소리 지도(audio.save_map) · audio.new_track 이 비운다


def put_sfx(track, name, at, g=0.5, seed=0, role=None):
    """트랙(audio.new_track)에 효과음 얹기 (소리 지도에 기록된다)"""
    LOG.append((round(float(at), 4), name, round(float(g), 3), role))
    return put(track, make(name, seed), at, g)


class Kit:
    """묶음 하나로 한 영상 — kit.put(트랙, 'enter', 초, g) · 같은 자리도 부를 때마다 후보 · seed 를 돌린다"""
    def __init__(self, name='경쾌 팝', seed=0):
        if name not in SETS: raise KeyError(f'효과음 묶음 «{name}» 없음 — {" · ".join(SETS)}')
        self.name, self.n, self.seed = name, {}, seed

    def name_for(self, role):
        c = SETS[self.name][role]; i = self.n.get(role, 0); self.n[role] = i + 1
        return c[(i // 3) % len(c)], self.seed * 101 + i   # 같은 소리 세 번 → 다음 후보 · seed 는 매번 다르다

    def put(self, track, role, at, g=0.5):
        nm, sd = self.name_for(role); return put_sfx(track, nm, at, g, sd, role)


if __name__ == '__main__':
    import sys
    if sys.argv[1:2] == ['list']:
        cur = None
        for k, (g, d, fn) in LIB.items():
            if g != cur: print(f'\n[{g}]'); cur = g
            print(f'  {k:18s} {d}')
        print('\n묶음:', ' · '.join(SETS))
