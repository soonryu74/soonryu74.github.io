"""소리 바탕 — 효과음 · 긴 소리 · 배경음이 함께 쓰는 부품 (reference/sound.md)
  sf(notes, d, bank, prog)  sf2 악기 · 효과음 뱅크로 연주 (음높이 미끄러짐 bend)
  gm_drum(keys, d, kit)     드럼 세트 (0 기본 · 48 오케스트라 · 56 효과음 · 25 808)
  sweep_noise · tone · bp/lp/hp · fx(울림 · 메아리 · 필터) · finish(앞 무음 자르기 · 크기 맞춤)
sf2 가 없으면 sf() 가 NoSF2 를 낸다 → sfx.make 가 비슷한 합성 소리로 바꾼다.
"""
import os

import numpy as np

SR = 44100
from . import paths


class NoSF2(Exception):
    pass


def sf2_path():
    p = os.environ.get('MOTION_SF2') or paths.SF2
    if not p or not os.path.isfile(p): raise NoSF2('사운드폰트 없음')
    return p


# ── 바탕 ─────────────────────────────────────────
def T(d): return int(d * SR)
def tt(d): return np.arange(T(d)) / SR
def hz(midi): return 440.0 * 2 ** ((midi - 69) / 12)


def put(tr, sig, at, g=1.0):
    p = T(at)
    if p < 0: sig = sig[-p:]; p = 0
    m = min(len(sig), len(tr) - p)
    if m > 0: tr[p:p + m] += sig[:m] * g
    return tr


def env(n, a=0.005, r=0.05):
    e = np.ones(n); a, r = min(T(a), n // 2), min(T(r), n // 2)
    if a: e[:a] = np.linspace(0, 1, a)
    if r: e[-r:] = np.linspace(1, 0, r)
    return e


def _fft_filter(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); g = np.ones_like(f)
    if lo: g *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    if hi: g *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * g, len(x))


def bp(x, fc, bw): return _fft_filter(x, max(20, fc - bw), fc + bw)
def lp(x, f): return _fft_filter(x, None, f)
def hp(x, f): return _fft_filter(x, f, None)


def sweep_noise(rng, d, f0, f1, q=0.35, shape=1.0):
    """움직이는 대역 잡음 — 짧은 조각마다 중심을 옮겨 이어 붙인다 (휙 · 바람 · 솟음)"""
    n = T(d); x = rng.standard_normal(n + 2048); out = np.zeros(n); hop = 512; win = np.hanning(2048)
    for i in range(0, n, hop):
        u = (i / n) ** shape; fc = f0 * (f1 / f0) ** u
        seg = x[i:i + 2048] * win; seg = bp(seg, fc, fc * q)
        m = min(2048, n - i); out[i:i + m] += seg[:m]
    return out / (np.abs(out).max() + 1e-9)


def tone(freq_fn, d, kind='sine', harm=(1,), amps=(1,)):
    """주파수가 시간에 따라 바뀌는 음 — freq_fn(t 배열) → Hz"""
    t = tt(d); f = freq_fn(t); ph = 2 * np.pi * np.cumsum(f) / SR; out = np.zeros_like(t)
    for h, a in zip(harm, amps):
        w = np.sin(h * ph)
        if kind == 'square': w = np.sign(w) * 0.6
        out += a * w
    return out


def fx(x, reverb=0.0, room=0.35, lo=None, hi=None, drive=0.0, delay=0.0):
    """마감 — 필터 · 살짝 찌그러짐 · 울림 · 메아리 (pedalboard)"""
    from pedalboard import Pedalboard, Reverb, Delay, HighpassFilter, LowpassFilter, Distortion
    ch = []
    if lo: ch.append(HighpassFilter(lo))
    if hi: ch.append(LowpassFilter(hi))
    if drive: ch.append(Distortion(drive_db=drive))
    if delay: ch.append(Delay(delay_seconds=delay, feedback=0.25, mix=0.2))
    if reverb: ch.append(Reverb(room_size=room, wet_level=reverb, dry_level=1.0, damping=0.5))
    x = np.asarray(x, np.float64).copy(); f = min(T(0.015), len(x) // 4)
    if f: x[-f:] *= np.linspace(1, 0, f)   # 끝이 뚝 끊기면 울림 앞에 «틱» 이 남는다
    if not ch: return x
    tail = np.concatenate([x, np.zeros(T(0.8 if reverb else 0.3))]).astype(np.float32)
    return Pedalboard(ch)(tail[None, :], SR)[0].astype(np.float64)


# ── sf2 ─────────────────────────────────────────
_SF = {}


def _load(s):
    return s.sfload(sf2_path())


def sf(notes, d, bank=0, prog=0, drums=False, bend=None, bend_range=12, gain=0):
    """sf2 로 연주 — notes = [(시각, 건반, 세기, 길이)] · bend = f(t 초) → 반음 (음높이 미끄러짐)
    drums=True 면 bank = 드럼 세트 번호(0 기본 · 48 오케스트라 · 56 효과음 · 25 808)"""
    import tinysoundfont as tsf
    s = tsf.Synth(samplerate=SR, gain=gain); sid = _load(s)
    if drums: s.program_select(9, sid, 128, bank, is_drums=True); ch = 9
    else: s.program_select(0, sid, bank, prog); ch = 0
    if bend: s.pitchbend_range(ch, bend_range)
    ev = sorted([(t, 1, k, v) for t, k, v, l in notes] + [(t + l, 0, k, 0) for t, k, v, l in notes])
    total = T(d); out = []; cur = 0; hop = 256; ei = 0
    while cur < total:
        nxt = min(total, cur + hop)
        while ei < len(ev) and T(ev[ei][0]) <= cur:
            t, on, k, v = ev[ei]; (s.noteon(ch, k, v) if on else s.noteoff(ch, k)); ei += 1
        if bend: s.pitchbend(ch, int(np.clip(8192 + bend(cur / SR) / bend_range * 8191, 0, 16383)))
        out.append(np.frombuffer(s.generate(nxt - cur), dtype=np.float32)); cur = nxt
    x = np.concatenate(out).reshape(-1, 2).mean(axis=1).astype(np.float64)
    f = min(T(0.03), len(x) // 4); x[-f:] *= np.linspace(1, 0, f)
    return x


def gm_drum(keys, d, kit=0):
    """드럼 한 방 또는 여럿 — keys = [(시각, 건반, 세기)]"""
    return sf([(t, k, v, 0.2) for t, k, v in keys], d, bank=kit, drums=True)


# ── 마무리 ───────────────────────────────────────
def finish(x, peak=0.95, fade=0.02, loud=0.22):
    """앞 무음 자르기 · 꼬리 자르기 · 크기 맞춤 — 가장 큰 0.1초 구간의 RMS 를 loud 로 (피크는 peak 까지)
    → 소리끼리 들리는 크기가 비슷하다 (믹스 때 g 로 조절)"""
    x = np.asarray(x, np.float64)
    a = np.argmax(np.abs(x) > 1e-4 * (np.abs(x).max() + 1e-12))
    x = x[a:]
    nz = np.nonzero(np.abs(x) > 1e-3 * np.abs(x).max())[0]
    if len(nz): x = x[:min(len(x), nz[-1] + T(0.05))]
    f = min(T(fade), len(x) // 3); x[-f:] *= np.linspace(1, 0, f) if f else 1
    w = T(0.1); c = np.convolve(x ** 2, np.ones(w) / w, 'same') if len(x) > w else x ** 2
    g = loud / (np.sqrt(c.max()) + 1e-9); g = min(g, peak / (np.abs(x).max() + 1e-9))
    return (x * g).astype(np.float32)
