"""긴 사람 소리 · 현장 소리 (reference/sound.md §2) — 길이를 마음대로 · 반복 없이 (numpy + pedalboard 만)

  applause · applause2 · applause_rec   박수 β — 아직 박수답지 않다(유저 «이상해») · 쓰지 않는다 · 고칠 후보
  clap_along(d, bpm, people)   박자 박수 (짝 · 짝 · 짝 맞춰)
  cheer(d, people)             «와아—» 함성 (모음 «아»가 올라갔다 내려옴)
  murmur(d, people)            웅성웅성 (알아들을 수 없는 말소리 덩어리)
  laugh_crowd(d, people)       여럿이 웃음 «하하하»
  whistle_crowd(d, n)          휘파람 «휘익~» 몇 번 (환호에 얹기)
  footsteps_walk(d, pace)      걷는 발소리
  rain(d) · wind(d) · cafe(d)  빗소리 · 바람 · 카페
"""
import numpy as np

from .sfxbase import SR, T, tt, put, env, bp, lp, hp, sweep_noise, fx, sf as _sf, NoSF2


def sf(*a, **k):
    """sf2 가 없으면 그 겹만 조용히 빠진다 (합성 겹은 그대로)"""
    try: return _sf(*a, **k)
    except NoSF2: return np.zeros(10)

VOWELS = {   # 모음 → (F1, F2, F3) Hz · 폭
    'a': (800, 1200, 2500), 'e': (500, 1800, 2500), 'i': (300, 2200, 2900), 'o': (500, 900, 2400), 'u': (350, 800, 2300),
    'eo': (600, 1000, 2400), 'eu': (380, 1400, 2400),
}


def _shape(n, shape, rng):
    u = np.linspace(0, 1, n)
    if shape == 'swell': g = np.minimum(1, u / 0.18) ** 1.5 * np.where(u > 0.6, np.clip(1 - (u - 0.6) / 0.4, 0, 1) ** 1.3, 1)
    elif shape == 'burst': g = np.minimum(1, u / 0.04) * np.exp(-np.maximum(0, u - 0.25) * 2.2)
    elif shape == 'fade_in': g = np.minimum(1, u / 0.7) ** 2 * np.where(u > 0.92, (1 - u) / 0.08, 1)
    else: g = np.minimum(1, u / 0.1) * np.where(u > 0.75, np.clip(1 - (u - 0.75) / 0.25, 0, 1), 1)   # polite
    return g


# ── 박수 ─────────────────────────────────────────
def _clap(rng, size):
    """손뼉 한 번 — 짧은 잡음 + 손바닥 공명 (size 0 작은 손 ~ 1 큰 손)"""
    d = 0.045; n = T(d); z = rng.standard_normal(n)
    fc = 2400 - 1300 * size + rng.normal(0, 150); x = bp(z, fc, 700 + 500 * size)
    x += bp(z, 900 + 300 * rng.random(), 250) * 0.6 * size        # 오목한 손바닥 «퍽»
    return x * np.exp(-np.linspace(0, 1, n) * (60 + 40 * rng.random())) * env(n, 0.0008, 0.005)


def applause(d=6.0, people=40, shape='swell', seed=0, room=0.45):
    rng = np.random.default_rng(seed); n = T(d); out = np.zeros(n + T(0.2)); g = _shape(n, shape, rng)
    for p in range(people):
        rate = rng.uniform(3.2, 6.5); size = rng.random(); vol = rng.uniform(0.3, 1.0) * (0.5 + 0.5 * size)
        start = rng.uniform(0, 0.12 * d) if shape != 'burst' else rng.uniform(0, 0.15)
        stop = d * rng.uniform(0.7, 1.0) if shape in ('swell', 'polite') else d
        t = start
        while t < stop:
            gi = g[min(n - 1, T(t))]
            if gi > 0.02 and rng.random() < 0.6 + 0.4 * gi:   # 줄어들 때는 한 사람씩 멈춘다
                put(out, _clap(rng, size), t, vol * gi * rng.uniform(0.7, 1.1))
            t += 1 / rate * rng.normal(1, 0.06)
    out += lp(rng.standard_normal(len(out)), 1200) * 0.02 * np.pad(g, (0, len(out) - n))   # 방 공기
    return fx(out, reverb=0.25, room=room)


def clap_along(d=6.0, bpm=120, people=30, seed=0):
    rng = np.random.default_rng(seed); out = np.zeros(T(d + 0.2)); beat = 60 / bpm
    for p in range(people):
        size = rng.random(); late = rng.normal(0.012, 0.012); vol = rng.uniform(0.4, 1)
        k = 0
        while k * beat < d:
            if rng.random() < 0.93: put(out, _clap(rng, size), k * beat + late + rng.normal(0, 0.006), vol)
            k += 1
    return fx(out, reverb=0.25, room=0.5)


# ── 목소리 ───────────────────────────────────────
def _voice(rng, d, f0_fn, vowels, breath=0.12, female=False):
    """한 사람 목소리 — 성대 펄스(배음) → 모음 공명 · vowels = [(시각 0~1, 모음)] 사이를 미끄러진다"""
    n = T(d); t = tt(d); f0 = f0_fn(t) * (1 + 0.008 * np.sin(2 * np.pi * rng.uniform(4.5, 6.5) * t + rng.random() * 6))
    f0 = f0 * (1 + 0.004 * lp(rng.standard_normal(n), 30) / 0.02)
    ph = np.cumsum(f0) / SR; src = np.zeros(n)
    for h in range(1, 30):
        mask = (h * f0 < 5000).astype(float); src += mask * np.sin(2 * np.pi * h * ph) / h ** 1.1
    src += lp(rng.standard_normal(n), 6000) * breath
    out = np.zeros(n); hop = T(0.04); win = np.hanning(2 * hop)
    fr = np.fft.rfftfreq(2 * hop, 1 / SR)
    keys = sorted(vowels)
    for i in range(0, n - 2 * hop, hop):
        u = i / n; k = max([kv for kv in keys if kv[0] <= u] or [keys[0]])
        k2 = min([kv for kv in keys if kv[0] > u] or [k]); w = 0 if k2 == k else (u - k[0]) / (k2[0] - k[0])
        F = np.array(VOWELS[k[1]]) * (1 - w) + np.array(VOWELS[k2[1]]) * w
        if female: F = F * 1.15
        H = sum(a * np.exp(-((fr - f) / bw) ** 2) for f, a, bw in zip(F, (1, .6, .3), (90, 120, 180)))
        seg = np.fft.irfft(np.fft.rfft(src[i:i + 2 * hop] * win) * H, 2 * hop); out[i:i + 2 * hop] += seg
    return out / (np.abs(out).max() + 1e-9)


def cheer(d=3.5, people=24, seed=0):
    """«와아—» — 낮게 «우» 에서 «아» 로 열리며 올라갔다 길게 내려온다"""
    rng = np.random.default_rng(seed); out = np.zeros(T(d + 0.5))
    for p in range(people):
        fem = rng.random() < 0.5; base = rng.uniform(190, 300) if fem else rng.uniform(100, 170)
        st = rng.uniform(0, 0.35); vd = d - st - rng.uniform(0, 0.6); peak = rng.uniform(0.25, 0.4)
        f = lambda t, b=base, v=vd, pk=peak: b * (1 + 0.55 * np.minimum(1, t / (v * pk)) - 0.35 * np.maximum(0, t / v - pk))
        v = _voice(rng, vd, f, [(0, 'u'), (0.12, 'a'), (0.8, 'a'), (1.0, 'eo')], breath=0.25, female=fem)
        v *= env(len(v), 0.15, vd * 0.45)
        put(out, v, st, rng.uniform(0.4, 1.0))
    out += bp(rng.standard_normal(len(out)), 1500, 1200) * 0.05 * env(len(out), 0.3, 1.0)   # 숨 · 공기
    return fx(out, reverb=0.3, room=0.7)


def _babble_voice(rng, d, fem):
    """알아들을 수 없는 말 한 사람 — 음절(0.12~0.25초)마다 모음 · 높이 · 크기가 바뀌고 사이사이 쉰다"""
    base = rng.uniform(180, 260) if fem else rng.uniform(95, 150); t = 0.0; keys = []; amp = np.zeros(T(d))
    pitch = np.zeros(T(d)) + base
    while t < d:
        if rng.random() < 0.18: t += rng.uniform(0.2, 0.8); continue   # 숨 고르기
        L = rng.uniform(0.11, 0.24); a, b = T(t), min(T(d), T(t + L))
        keys.append((t / d, rng.choice(list(VOWELS))))
        amp[a:b] = np.maximum(amp[a:b], np.sin(np.linspace(0, np.pi, b - a)) ** 0.8 * rng.uniform(0.5, 1))
        pitch[a:b] = base * rng.uniform(0.9, 1.25) * np.linspace(1.05, 0.95, b - a); t += L
    pitch = lp(pitch - base, 12) + base
    v = _voice(rng, d, lambda tt_: np.interp(tt_, np.arange(len(pitch)) / SR, pitch), keys or [(0, 'a')], breath=0.08, female=fem)
    return v * lp(amp, 40)


def murmur(d=8.0, people=14, seed=0, far=0.6):
    rng = np.random.default_rng(seed); out = np.zeros(T(d + 0.3))
    for p in range(people):
        v = _babble_voice(rng, d, rng.random() < 0.5); put(out, v, 0, rng.uniform(0.3, 1.0))
    out = lp(out, 4500 - 2500 * far)
    out += lp(rng.standard_normal(len(out)), 600) * 0.03
    return fx(out, reverb=0.25 + 0.2 * far, room=0.6)


def laugh_crowd(d=4.0, people=10, seed=0):
    """여럿이 «하하하» — sf2 웃음을 높이 · 때를 흩어 겹치고 · 합성 «하 하» 를 섞는다"""
    rng = np.random.default_rng(seed); out = np.zeros(T(d + 1))
    for p in range(people):
        st = rng.uniform(0, d * 0.5); k = 60 + int(rng.integers(-4, 5))
        put(out, sf([(0, k, int(rng.integers(90, 125)), 1.2)], 1.4, 1, 126), st, rng.uniform(0.4, 1))
        # 하 하 하 — 0.15초 간격 숨 섞인 «아» 펄스
        fem = rng.random() < 0.5; base = rng.uniform(220, 320) if fem else rng.uniform(120, 180)
        nh = int(rng.integers(4, 9)); gap = rng.uniform(0.13, 0.19); t0 = rng.uniform(0, d * 0.6)
        for h in range(nh):
            L = gap * 0.7; v = _voice(rng, L, lambda t, b=base * (1 - h * 0.03): b + 0 * t, [(0, 'a')], breath=0.6, female=fem)
            put(out, v * np.sin(np.linspace(0, np.pi, len(v))) ** 1.5, t0 + h * gap, rng.uniform(0.15, 0.4) * (1 - h / (nh + 2)))
    return fx(out, reverb=0.25, room=0.55)


def whistle_crowd(d=3.0, n=3, seed=0):
    rng = np.random.default_rng(seed); out = np.zeros(T(d + 0.5))
    for i in range(n):
        L = rng.uniform(0.5, 0.9); f0 = rng.uniform(1500, 2300)
        kind = rng.choice(['up', 'wolf'])
        f = (lambda t, f0=f0, L=L: f0 * (1 + 0.5 * np.minimum(1, t / (L * 0.6)))) if kind == 'up' else \
            (lambda t, f0=f0, L=L: f0 * np.where(t < L * 0.35, 1 + 0.45 * t / (L * 0.35), 1.45 - 0.6 * np.clip((t - L * 0.35) / (L * 0.65), 0, 1)))
        tp = tt(L); ph = 2 * np.pi * np.cumsum(f(tp)) / SR
        x = np.sin(ph) * env(len(tp), 0.03, 0.12) + bp(rng.standard_normal(len(tp)), f0, 400) * 0.05
        put(out, x, rng.uniform(0, d - L), rng.uniform(0.3, 0.6))
    return fx(out, reverb=0.3, room=0.7)


# ── 현장 ─────────────────────────────────────────
def footsteps_walk(d=6.0, pace=1.8, seed=0, surface='hard'):
    rng = np.random.default_rng(seed); out = np.zeros(T(d + 0.5)); t = 0.1; k = 0
    while t < d:
        L = 0.12; z = rng.standard_normal(T(L)); e = np.exp(-np.linspace(0, 1, T(L)) * 30)
        heel = (bp(z, 900 if surface == 'hard' else 500, 500) * e)
        toe = bp(rng.standard_normal(T(0.06)), 2500, 1500) * np.exp(-np.linspace(0, 1, T(0.06)) * 40)
        g = (0.85 if k % 2 else 1.0) * rng.uniform(0.85, 1.05)
        put(out, heel, t, g); put(out, toe, t + 0.07, g * 0.35)
        t += 1 / pace * rng.normal(1, 0.03); k += 1
    return fx(out, reverb=0.15, room=0.4)


def rain(d=8.0, heavy=0.5, seed=0):
    rng = np.random.default_rng(seed); n = T(d); out = lp(rng.standard_normal(n), 3000) * 0.15 + hp(rng.standard_normal(n), 4000) * 0.05
    for _ in range(int(d * (60 + 300 * heavy))):
        L = 0.02; f = rng.uniform(2000, 6000); x = np.sin(2 * np.pi * f * tt(L) * (1 + tt(L) * 30)) * np.exp(-tt(L) * 250)
        put(out, x, rng.uniform(0, d - L), rng.uniform(0.05, 0.3))
    return out * env(n, 0.8, 0.8)


def wind(d=8.0, seed=0):
    rng = np.random.default_rng(seed); n = T(d); x = rng.standard_normal(n); out = np.zeros(n)
    gust = lp(rng.standard_normal(n), 0.6); gust = (gust - gust.min()) / (np.ptp(gust) + 1e-9)
    hop = 2048; win = np.hanning(4096)
    for i in range(0, n - 4096, hop):
        g = gust[i]; seg = bp(x[i:i + 4096] * win, 250 + 900 * g, 150 + 300 * g); out[i:i + 4096] += seg * (0.3 + 0.7 * g)
    return out * env(n, 1.0, 1.0)


def cafe(d=8.0, seed=0):
    rng = np.random.default_rng(seed); out = murmur(d, people=10, seed=seed, far=0.85)
    for _ in range(int(d * 0.8)):   # 잔 · 숟가락 땡그랑
        k = int(rng.choice([84, 88, 91, 93])); put(out, sf([(0, k, int(rng.integers(40, 75)), 0.3)], 0.6, 0, 9), rng.uniform(0, d - 0.6), rng.uniform(0.05, 0.15))
    return out


# ── 박수 2판 — «빗소리» 고치기 ──────────────────────
# 빗소리처럼 들린 까닭: 손뼉이 너무 짧고(잡음 한 톨) 높은 소리뿐 · 모두 같은 크기 · 같은 거리 → 수백 톨이 섞여 «쏴아»
# 고침: 손뼉 = 딱(짧은 잡음) + 손바닥 울림(800~1600Hz 감쇠 음) + 낮은 퍽 · 길이 60~90ms
#       가까운 몇 사람은 크고 또렷하게 · 중간 · 먼 사람은 작고 높은 소리를 깎고 울림 많이
def _clap2(rng, size, near=1.0):
    d = 0.09; n = T(d); t = tt(d)
    crack = bp(rng.standard_normal(n), 1800 + 900 * rng.random(), 900) * np.exp(-t * 180)
    f1 = 750 + 700 * (1 - size) + rng.normal(0, 60); f2 = f1 * rng.uniform(1.6, 2.3)
    body = np.sin(2 * np.pi * f1 * t + rng.random() * 6) * np.exp(-t * (55 + 30 * rng.random())) + \
        0.5 * np.sin(2 * np.pi * f2 * t) * np.exp(-t * 90)
    thump = np.sin(2 * np.pi * (180 + 120 * size) * t) * np.exp(-t * 70) * 0.5 * size
    x = crack * (0.8 + 0.4 * near) + body * (0.55 + 0.3 * size) + thump
    return x * env(n, 0.0005, 0.01)


def applause2(d=8.0, shape='swell', seed=0, near=5, mid=18, far=40):
    rng = np.random.default_rng(seed); n = T(d); g = _shape(n, shape, rng)
    layers = []
    for count, dist in ((near, 1.0), (mid, 0.55), (far, 0.25)):
        tr = np.zeros(n + T(0.2))
        for p in range(count):
            rate = rng.uniform(2.6, 4.8) if dist > 0.5 else rng.uniform(3.0, 5.5); size = rng.random(); vol = rng.uniform(0.6, 1.0)
            start = rng.uniform(0, 0.15 * d) if shape != 'burst' else rng.uniform(0, 0.2)
            stop = d * rng.uniform(0.65, 1.0) if shape in ('swell', 'polite') else d
            t = start; drift = 0.0
            while t < stop:
                gi = g[min(n - 1, T(t))]
                if gi > 0.03 and rng.random() < 0.55 + 0.45 * gi:
                    put(tr, _clap2(rng, size, dist), t, vol * gi * rng.uniform(0.75, 1.1))
                drift = 0.9 * drift + rng.normal(0, 0.01); t += 1 / rate * (1 + drift) * rng.normal(1, 0.05)
        layers.append((tr, dist))
    out = np.zeros(n + T(0.2))
    for tr, dist in layers:
        if dist < 0.5: tr = lp(tr, 2600 if dist < 0.3 else 3800)
        out += tr * (dist ** 0.7)
    out = hp(out, 120)
    return fx(lp(out, 7000), reverb=0.32, room=0.6)


def applause_rec(d=8.0, shape='swell', seed=0, extra_near=0):
    """sf2 박수 «녹음» — 높이를 조금씩 다르게 4겹 (되풀이 길이가 서로 달라져 같은 조각이 맞물리지 않는다) + 모양"""
    rng = np.random.default_rng(seed); n = T(d); out = np.zeros(n + T(1))
    for i, k in enumerate((58, 60, 61, 63)):
        x = sf([(0, k, 110, d + 0.5)], d + 1, 0, 126); off = rng.uniform(0, 0.25)
        put(out, x[T(0.3):], off, rng.uniform(0.7, 1.0))   # 시작 0.3초(들어오는 부분)는 버리고 모양은 우리가
    g = np.pad(_shape(n, shape, rng), (0, len(out) - n)); out *= g
    if extra_near:
        out = out / (np.abs(out).max() + 1e-9)
        near = applause2(d, shape, seed + 7, near=extra_near, mid=0, far=0)
        m = min(len(out), len(near)); out = out[:m] + near[:m] / (np.abs(near).max() + 1e-9) * 0.45
    return fx(out, reverb=0.15, room=0.5)
