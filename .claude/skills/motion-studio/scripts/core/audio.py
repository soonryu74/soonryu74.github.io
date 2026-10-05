"""소리 — 사운드폰트 배경음 · 합성 효과음 · 나레이션 덕킹 · 마스터 (motion-studio).

  bgm(sections, dur, palette=…)   배경음 — sections = [(시작초, 끝초, 무드, {옵션}), …]
        무드: sting · intro · calm · groove · bouncy · build · drop · main · tense · outro
        옵션: alt(밝은 진행 2) · hits[강조 시각] · hit(outro 마지막 한 방)
        palette: pop(경쾌) · cinema(웅장) · study(차분) · tale(동화)   ← 출발점 예시, 내용에 맞게
  효과음: whoosh(휙) · hit(쿵) · chime(반짝) · tick(틱) · mallet(실로폰) · bell(종)
  mixdown(dur, path, …)           배경음 + 효과음 + 나레이션 → 완성 wav
배경음은 사운드폰트 GeneralUser-GS.sf2 가 필요하다 (스킬 밖 · paths.need_sf2 가 안내).
"""
import os
import random
import wave

import numpy as np

from . import paths

SR = 44100


# ── 합성 효과음 (cut-follow bgm.py 에서) ─────────────────
def _T(sec): return int(sec * SR)
def _f(n, base=261.63): return base * 2 ** (n / 12)


def _put(tr, sig, at, g=1.0):
    p = _T(at); m = min(len(sig), len(tr) - p)
    if m > 0: tr[p:p + m] += sig[:m] * g


def mallet(freq, dur, decay=9.0):
    n = _T(dur); t = np.arange(n) / SR; out = np.zeros(n)
    for m, a in zip((1, 3.9, 10.4), (1, .30, .10)):
        out += a * np.sin(2 * np.pi * freq * m * t) * np.exp(-decay * m ** 0.35 * t)
    out[:60] *= np.linspace(0, 1, 60)
    return out


def bell(freq, dur, decay=5.5):
    """종 — 배음 넷 · 마림바보다 길게 울린다"""
    n = _T(dur); t = np.arange(n) / SR; out = np.zeros(n)
    for m, a in zip((1, 2, 3.01, 4.2), (1, .45, .22, .10)):
        out += a * np.sin(2 * np.pi * freq * m * t) * np.exp(-decay * m ** 0.5 * t)
    out[:40] *= np.linspace(0, 1, 40)
    return out


def pad(freqs, dur, rng):
    """패드 — 화음이 천천히 들어왔다 빠진다"""
    n = _T(dur); t = np.arange(n) / SR; out = np.zeros(n)
    for f in freqs:
        for mul, amp in ((1, 1.0), (2, .3), (3, .12)):
            out += amp * np.sin(2 * np.pi * f * mul * t + rng.random() * 6)
    a, r = _T(0.4), _T(0.6)
    e = np.ones(n); e[:a] = np.linspace(0, 1, a); e[-r:] = np.linspace(1, 0, r)
    return out / (np.abs(out).max() + 1e-9) * e


def tick(x, rng, at, g=0.12):
    """타자 «틱»"""
    m = _T(0.03); z = rng.standard_normal(m) * np.exp(-np.linspace(0, 8, m)); _put(x, z, at, g)


def kick(dur):
    n = _T(dur); t = np.arange(n) / SR
    f = 110 * np.exp(-t * 28) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def snare(dur, rng):
    n = _T(dur); t = np.arange(n) / SR
    return (rng.standard_normal(n) * .8 + np.sin(2 * np.pi * 185 * t) * .3) * np.exp(-t * 22)


def whoosh(rng, dur, g, fc=2200, bw=1500, pw=2):
    """대역 잡음 휙 — fc 중심 주파수 · bw 대역 폭 · pw 모양 (2 = 짧게 솟음 · 1.5 = 부드럽게)"""
    m = _T(dur); z = rng.standard_normal(m)
    Z_ = np.fft.rfft(z); fr = np.fft.rfftfreq(m, 1 / SR); Z_ *= np.exp(-((fr - fc) / bw) ** 2)
    z = np.fft.irfft(Z_, m); z /= np.abs(z).max() + 1e-9; return z * np.sin(np.linspace(0, np.pi, m)) ** pw * g


def chime(x, at, base=1046.5, g=0.25, ratios=(1, 1.25, 1.5), step=0.06, dur=0.8):
    """차임 — 화음 세 음이 살짝 어긋나 울린다 (반짝 · 완성)"""
    for j, r in enumerate(ratios): _put(x, mallet(_f(12, base * r), dur), at + j * step, g)


def hit(x, rng, at, g=0.8):
    """쿵 — 킥 + 스네어 살짝"""
    _put(x, kick(0.8), at, g); _put(x, snare(0.4, rng), at, g * 0.35)


# 전환 이름 → 휙 소리 (길이 · 크기 · 중심 주파수 · 경계보다 몇 초 앞)
TRANSITION_SFX = {'whip': (0.4, 0.55, 2600, 0.2), 'bubble': (0.6, 0.5, 1800, 0.05), '*': (0.5, 0.2, 2200, 0.25), 'cut': None}


# ── 사운드폰트 배경음 (bgm_sf.py 에서) ───────────────────
EP, PIANO, GLOCK, MARIMBA, VIB, BASS, SBASS, PIZZ, STR, BRASS, PAD = 4, 0, 9, 12, 11, 33, 38, 45, 48, 61, 89
KICK, SNARE, CLAP, HAT, OHAT, CRASH, TOM_L, TOM_H, SHAKER, RIDE = 36, 38, 39, 42, 46, 49, 45, 50, 70, 51
PROG = {
    'bright': [(60, 'M'), (67, 'M'), (69, 'm'), (65, 'M')],          # I V vi IV
    'bright2': [(65, 'M'), (67, 'M'), (64, 'm'), (69, 'm')],         # IV V iii vi
    'tense': [(57, 'm'), (53, 'M'), (55, 'M'), (52, 'M')],           # i VI VII V
    'calm': [(65, 'M7'), (64, 'm7'), (62, 'm7'), (60, 'M7')],        # IVM7 iii7 ii7 IM7
}
Q = {'M': [0, 4, 7], 'm': [0, 3, 7], 'M7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10]}
PROGS = {0: EP, 1: BASS, 2: STR, 3: BRASS, 4: PAD, 5: PIANO, 6: PIZZ, 7: MARIMBA, 8: GLOCK}
PALETTES = {   # 채널 → GM 악기
    'pop': PROGS,
    'cinema': {0: 24, 1: 32, 2: 49, 3: 60, 4: 89, 5: 0, 6: 45, 7: 46, 8: 73},   # 나일론 기타 · 하프 · 플루트 · 호른
    'study': {0: 4, 1: 32, 2: 48, 3: 71, 4: 89, 5: 4, 6: 45, 7: 11, 8: 11},     # 일렉 피아노 · 클라리넷 · 비브라폰
    'tale': {0: 46, 1: 32, 2: 49, 3: 73, 4: 89, 5: 8, 6: 45, 7: 10, 8: 10},     # 하프 · 첼레스타 · 오르골
}


class Score:
    def __init__(self, seed=3, bpm=112):
        self.ev = {'mus': [], 'drm': []}; self.rng = random.Random(seed)
        self.B = 60 / bpm; self.BAR = 4 * self.B

    def n(self, stem, t, ch, key, vel, dur):
        r = self.rng
        t = max(0.0, t + r.uniform(-0.012, 0.012)); vel = int(max(1, min(127, vel + r.randint(-10, 10))))
        self.ev[stem].append((t, 1, ch, key, vel)); self.ev[stem].append((t + dur, 0, ch, key, 0))

    def d(self, t, key, vel): self.n('drm', t, 9, key, vel, 0.1)


def chord(root, kind, inv=0):
    ns = [root + i for i in Q[kind]]
    for _ in range(inv): ns = ns[1:] + [ns[0] + 12]
    return ns


def section(S, t0, t1, mood, o):
    r = S.rng; B, BAR = S.B, S.BAR
    pk = {'tense': 'tense', 'calm': 'calm', 'intro': 'calm'}.get(mood, 'bright2' if o.get('alt') else 'bright')
    prog = PROG[pk]; nb = max(1, int(round((t1 - t0) / BAR)))
    motif = [r.choice([0, 1, 2, 2, 3]) for _ in range(6)]
    for b in range(nb + 1):
        bt = t0 + b * BAR
        if bt >= t1 - 0.05: break
        root, kind = prog[b % 4]; ch = chord(root, kind, inv=(b // 4) % 2)
        fill = (b % 4 == 3) or (bt + BAR >= t1 - 0.05)
        last = bt + BAR >= t1 - 0.05
        step = lambda i, div: bt + i * BAR / div
        if mood == 'sting':
            S.d(t0, CRASH, 120); S.d(t0, KICK, 127)
            for k in chord(60, 'M'): S.n('mus', t0, 2, k, 110, 1.2); S.n('mus', t0, 3, k - 12, 100, 1.2)
            S.n('mus', t0, 1, 36, 120, 1.2); break
        if mood in ('intro', 'calm'):
            for k in ch: S.n('mus', bt, 4, k, 55, BAR * 0.98)
            for i in range(8):
                if mood == 'calm' and i % 2: continue
                S.n('mus', step(i, 8), 0, ch[[0, 1, 2, 1, 2, 3 % len(ch), 2, 1][i] % len(ch)] + 12, 62, B * 0.9)
            if mood == 'calm' or b >= 1:
                for i in range(8): S.d(step(i, 8), SHAKER if mood == 'calm' else HAT, 38 + 14 * (i % 2 == 0))
            if mood == 'calm' and b % 2 == 1:
                for j, m in enumerate(motif[:4]): S.n('mus', step(j * 2 + 1, 8), 5, ch[m % len(ch)] + 12, 70, B * 1.5)
        if mood in ('groove', 'bouncy', 'drop', 'main', 'build'):
            dense = mood in ('drop', 'main')
            if mood == 'build':
                k = (b + 1) / nb
                for i in range(int(4 + 12 * k)): S.d(bt + i * BAR / int(4 + 12 * k), SNARE, int(50 + 60 * k * i / 16))
                S.d(bt, KICK, 100); S.d(bt + 2 * B, KICK, 90)
            else:
                for i in range(4): S.d(step(i, 4), KICK, 110 if i % 2 == 0 else 96)
                S.d(step(1, 4), CLAP if mood == 'bouncy' else SNARE, 100); S.d(step(3, 4), CLAP if mood == 'bouncy' else SNARE, 104)
                for i in range(16 if dense else 8):
                    S.d(step(i, 16 if dense else 8), OHAT if (not dense and i % 2) else HAT, 70 if i % 2 == 0 else 45)
                if fill and not last:
                    for i in range(4): S.d(bt + 3 * B + i * B / 4, [TOM_H, TOM_H, TOM_L, TOM_L][i], 90)
                if b % 4 == 0 and b > 0: S.d(bt, CRASH, 90)
            pat = [0, 0, 12, 0, 0, 7, 12, 0] if dense else [0, None, 0, None, 0, None, 7, None]
            for i, iv in enumerate(pat):
                if iv is not None: S.n('mus', step(i, 8), 1, ch[0] - 24 + iv, 100, B * 0.45)
            if mood == 'bouncy':
                for i in range(8): S.n('mus', step(i, 8), 6, ch[i % len(ch)] + (12 if i >= 4 else 0), 80, B * 0.3)
                for i in (1, 3, 5, 7): S.n('mus', step(i, 8), 7, ch[(i // 2) % len(ch)] + 24, 70, B * 0.3)
            else:
                for i in (0, 3, 6) if dense else (0, 4):
                    for k in ch: S.n('mus', step(i, 8), 5, k, 78 if dense else 68, B * 1.2)
                if mood == 'build':
                    S.n('mus', bt, 2, ch[0] + 12 + b * 2, 60 + b * 10, BAR)
            if dense:
                for k in ch: S.n('mus', bt, 2, k + 12, 60, BAR * 0.98)
                if b % 2 == 0:
                    for k in ch: S.n('mus', bt, 3, k, 92, B * 0.5)
                mot = motif[:] if b % 4 != 3 else motif[:-1] + [r.choice([0, 2])]
                rhythm = [0, 2, 3, 5, 6, 7] if b % 2 == 0 else [0, 1, 3, 4, 6]
                for j, pos in enumerate(rhythm):
                    S.n('mus', step(pos, 8), 8, ch[mot[j % len(mot)] % len(ch)] + 24, 82, B * 0.7)
        if mood == 'tense':
            for i in range(8): S.n('mus', step(i, 8), 2, ch[0] - 12, 70 + 20 * (i == 0), B * 0.4)
            for k in ch: S.n('mus', bt, 4, k, 50, BAR * 0.98)
            S.d(bt, KICK, 110); S.d(bt + 2 * B, SNARE, 90); S.d(bt + 3.5 * B, KICK, 80)
            for i in range(4): S.d(step(i, 4), RIDE, 50)
            if fill:
                for i in range(6): S.d(bt + 2.5 * B + i * B / 4, TOM_L if i < 3 else TOM_H, 85 + i * 5)
            S.n('mus', bt, 1, ch[0] - 24, 105, BAR * 0.9)
        if mood == 'outro':
            for k in chord(60, 'M'): S.n('mus', bt, 4, k, 55, BAR)
            S.n('mus', bt, 0, 72, 60, B); S.n('mus', bt + B, 0, 76, 60, B)
            h = o.get('hit')
            if h:
                S.d(h, CRASH, 120); S.d(h, KICK, 127)
                for k in chord(60, 'M'): S.n('mus', h, 2, k + 12, 105, 2.5); S.n('mus', h, 3, k, 105, 1.0)
                S.n('mus', h, 1, 36, 120, 2.0); S.n('mus', h, 8, 84, 90, 2.0)
            break
    for at in o.get('hits', []):
        S.d(at, CRASH, 115); S.d(at, KICK, 127); S.n('mus', at, 3, 48, 110, 0.5)


def synth_stem(events, dur, programs):
    import tinysoundfont as tsf
    s = tsf.Synth(samplerate=SR, gain=-3); sid = s.sfload(paths.need_sf2())
    for ch, pg in programs.items(): s.program_select(ch, sid, 0, pg, is_drums=(ch == 9))
    ev = sorted(events, key=lambda e: (e[0], e[1])); out = []; cur = 0
    total = int((dur + 2.5) * SR)
    for t, on, ch, key, vel in ev:
        at = min(total, int(t * SR))
        if at > cur: out.append(np.frombuffer(s.generate(at - cur), dtype=np.float32)); cur = at
        (s.noteon(ch, key, vel) if on else s.noteoff(ch, key))
    if cur < total: out.append(np.frombuffer(s.generate(total - cur), dtype=np.float32))
    return np.concatenate(out).reshape(-1, 2)


def bgm(sections, dur, seed=3, bpm=112, palette='pop', transpose=0, drum_gain=0.8):
    """sections = [(시작초, 끝초, 무드, {옵션}), …] → mono float32"""
    from pedalboard import Pedalboard, Reverb, Compressor, Limiter, HighpassFilter
    S = Score(seed, bpm or 112)
    for t0, t1, mood, o in sections: section(S, t0, t1, mood, o)
    if transpose: S.ev['mus'] = [(t, on, ch, k + transpose, v) for t, on, ch, k, v in S.ev['mus']]
    mus = synth_stem(S.ev['mus'], dur, PALETTES[palette or 'pop']); drm = synth_stem(S.ev['drm'], dur, {9: 0})
    env = np.ones(len(mus))   # 펌핑 — 킥 자리에서 음악 층을 살짝 눌렀다 놓는다
    for t, on, ch, key, vel in S.ev['drm']:
        if on and key == KICK:
            a = int(t * SR); m = min(len(env) - a, int(0.22 * SR))
            if m > 0: env[a:a + m] = np.minimum(env[a:a + m], 0.55 + 0.45 * np.linspace(0, 1, m) ** 0.6)
    mus = mus * env[:, None]
    mus = Pedalboard([HighpassFilter(90), Reverb(room_size=0.45, wet_level=0.22, dry_level=0.85)])(mus.T.copy(), SR).T
    mx = mus * 0.9 + drm * drum_gain
    mx = Pedalboard([Compressor(threshold_db=-14, ratio=3, attack_ms=8, release_ms=120), Limiter(threshold_db=-1.5)])(mx.T.copy(), SR).T
    x = mx.mean(axis=1)[:int(dur * SR)]
    return (x / (np.abs(x).max() + 1e-9) * 0.9).astype(np.float32)


# ── 믹스 ─────────────────────────────────────────
def read_wav(p):
    """wav → mono float (-1~1) · 다른 형식/샘플레이트는 ffmpeg 로 맞춰 읽는다"""
    try:
        with wave.open(p) as w:
            if w.getframerate() == SR and w.getsampwidth() == 2:
                s = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float64) / 32768
                return s.reshape(-1, w.getnchannels()).mean(axis=1)
    except wave.Error:
        pass
    import subprocess
    raw = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', p, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, '<i2').astype(np.float64) / 32768


def write_wav(path, x):
    with wave.open(path, 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())


def mixdown(dur, path, bgm_track=None, sfx=None, voices=(), bgm_gain=0.33, sfx_gain=0.7, voice_gain=0.8,
            duck=0.5, ramp=0.25, peak=0.85, soft=1.1, fade_in=0.2, fade_out=0.4):
    """완성 소리 wav.
    bgm_track  bgm() 결과 (없으면 배경음 없이)
    sfx        효과음 트랙 — new_track(dur) 에 whoosh/hit/chime… 을 쌓은 것
    voices     [(시작초, wav 경로), …] — 나오는 동안 배경음 × duck (앞뒤 ramp 초 부드럽게)
    """
    n = _T(dur + 0.5)
    xb = np.zeros(n) if bgm_track is None else np.pad(np.asarray(bgm_track, np.float64), (0, max(0, n - len(bgm_track))))[:n] * bgm_gain
    x = np.zeros(n) if sfx is None else np.pad(sfx, (0, max(0, n - len(sfx))))[:n]
    v = np.zeros(n); dk = np.ones(n)
    for at, p in voices:
        s = read_wav(p); s = s / (np.abs(s).max() + 1e-9)
        a = _T(at); b = min(n, a + len(s)); v[a:b] += s[:b - a]
        r = _T(ramp); lo, hi = max(0, a - r), min(n, b + r)
        env = np.ones(hi - lo); env[:a - lo] = np.linspace(1, duck, a - lo); env[a - lo:b - lo] = duck; env[b - lo:] = np.linspace(duck, 1, hi - b)
        dk[lo:hi] = np.minimum(dk[lo:hi], env)
    y = xb * dk + sfx_gain * x
    y = y * (peak / (np.abs(y).max() + 1e-9)) if np.abs(y).max() > 0 else y
    y = y + voice_gain * v
    if soft: y = np.tanh(y * soft) / np.tanh(soft)   # 겹친 자리 피크만 부드럽게 누른다
    fi, fo = _T(fade_in), _T(fade_out); y[:fi] *= np.linspace(0, 1, fi); y[-fo:] *= np.linspace(1, 0, fo)
    write_wav(path, y)
    return path


def new_track(dur):
    """효과음을 쌓을 빈 트랙 (dur + 0.5초)"""
    return np.zeros(_T(dur + 0.5))
