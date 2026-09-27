"""효과음·배경 리듬을 코드로 직접 만든다 → 저작권 걱정 없음.

pop     : 글자가 '팡' 뜰 때
whoosh  : 장면 넘어갈 때
ding    : 마지막 안내 화면
stomp   : 응원용 쿵-짝 리듬 (발 구르기 + 박수 + 가벼운 화음), 원하는 길이만큼

더 좋은 음악은 유튜브 스튜디오 '오디오 보관함'에서 받아 --bgm 으로 넣으세요.
"""
from __future__ import annotations

import wave
from pathlib import Path

import numpy as np

SR = 48000


def _write(path: Path, x: np.ndarray) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    x = np.clip(x, -1, 1)
    st = np.stack([x, x], axis=1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((st * 32767 * 0.95).astype(np.int16).tobytes())
    return path


def _t(sec: float) -> np.ndarray:
    return np.arange(int(SR * sec)) / SR


def _env(n: int, attack: float, decay: float) -> np.ndarray:
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-t / max(decay, 1e-4))


def pop(path: Path) -> Path:
    t = _t(0.18)
    f = 900 * np.exp(-t * 9) + 380
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(len(t), 0.002, 0.05)
    click = np.random.default_rng(1).standard_normal(len(t)) * _env(len(t), 0.0005, 0.006) * 0.4
    return _write(path, (tone + click) * 0.8)


def whoosh(path: Path, sec: float = 0.45) -> Path:
    t = _t(sec)
    n = np.random.default_rng(2).standard_normal(len(t))
    # 간단한 대역 통과: 이동 평균 차이로 고역·저역 조절, 앞뒤로 부드럽게
    k = np.linspace(2, 30, len(t)).astype(int)
    cs = np.cumsum(np.concatenate([[0], n]))
    idx = np.arange(len(t))
    lp = (cs[idx + 1] - cs[np.maximum(0, idx + 1 - k)]) / k
    shape = np.sin(np.pi * np.linspace(0, 1, len(t))) ** 2
    return _write(path, lp * shape * 0.9)


def ding(path: Path) -> Path:
    t = _t(1.6)
    x = sum(a * np.sin(2 * np.pi * 1318.5 * m * t) * np.exp(-t * d)
            for m, a, d in ((1, 1.0, 2.5), (2.76, 0.35, 4), (5.4, 0.15, 7)))
    return _write(path, x * _env(len(t), 0.003, 10) * 0.45)


def _kick(n: int) -> np.ndarray:
    t = np.arange(n) / SR
    f = 110 * np.exp(-t * 18) + 42
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)


def _clap(n: int, rng) -> np.ndarray:
    x = rng.standard_normal(n)
    x = x - 0.55 * np.concatenate([[0], x[:-1]])  # 고역 살짝 강조 (너무 날카롭지 않게)
    x = (x + np.concatenate([[0], x[:-1]])) / 2
    env = np.zeros(n)
    for off in (0, 0.011, 0.022):
        s = int(off * SR)
        env[s:] += np.exp(-np.arange(n - s) / SR / (0.012 if off < 0.02 else 0.09))
    return x * env * 0.22


def _pad(n: int, freqs) -> np.ndarray:
    t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.003 * t) for f in freqs)
    a = np.clip(t / 0.25, 0, 1) * np.clip((t[-1] - t) / 0.3, 0, 1)
    return x * a / len(freqs) * 0.18


def stomp(path: Path, sec: float, bpm: int = 116) -> Path:
    """쿵(발) - 짝(박수) 응원 리듬 + C–G–Am–F 화음. 목소리를 가리지 않게 가볍게."""
    rng = np.random.default_rng(7)
    beat = 60 / bpm
    n = int(SR * (sec + 1))
    out = np.zeros(n)
    chords = [(261.6, 329.6, 392.0), (196.0, 246.9, 392.0), (220.0, 261.6, 329.6), (174.6, 220.0, 349.2)]
    bass = [65.4, 49.0, 55.0, 43.7]
    i, t = 0, 0.0
    while t < sec:
        s = int(t * SR)
        pos = i % 4
        if pos in (0, 2):
            k = _kick(int(0.35 * SR))
            out[s:s + len(k)] += k[: n - s] * 0.9
        if pos in (1, 3):
            c = _clap(int(0.25 * SR), rng)
            out[s:s + len(c)] += c[: n - s]
        if pos == 0:
            bar = (i // 4) % 4
            ln = int(4 * beat * SR)
            p = _pad(ln, chords[bar])
            out[s:s + ln] += p[: n - s]
            bt = np.arange(ln) / SR
            b = np.sin(2 * np.pi * bass[bar] * bt) * np.exp(-(bt % beat) * 3) * 0.25
            out[s:s + ln] += b[: n - s]
        i += 1
        t += beat
    fade = int(0.8 * SR)
    end = int(sec * SR)
    out[end - fade:end] *= np.linspace(1, 0, fade)
    out[end:] = 0
    return _write(path, out[:end] / max(1e-6, np.abs(out).max()) * 0.8)
