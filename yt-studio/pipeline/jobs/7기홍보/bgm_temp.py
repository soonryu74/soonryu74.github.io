"""임시 배경음악 — 차분하고 여백 있는 피아노·패드 (수노 곡이 오기 전까지). python jobs/7기홍보/bgm_temp.py [초]"""
import sys, wave
import numpy as np
from pathlib import Path

sr = 44100
total = float(sys.argv[1]) if len(sys.argv) > 1 else 120.0
L = np.zeros(int(sr * total)); R = np.zeros_like(L)


def tone(f, t0, d, vol, kind):
    i0 = int(sr * t0); n = min(int(sr * d), len(L) - i0)
    if n <= 0: return
    t = np.arange(n) / sr
    if kind == "pad":      # 느리게 부풀었다 사라지는 패드
        env = np.clip(np.minimum(t / 2.5, 1) * np.clip((d - t) / 3.0, 0, 1), 0, 1)
        w = np.sin(2*np.pi*f*t) + 0.25*np.sin(2*np.pi*2*f*t + 0.3) + 0.08*np.sin(2*np.pi*3*f*t)
        w *= (1 + 0.04*np.sin(2*np.pi*0.2*t))  # 아주 느린 떨림
    elif kind == "piano":  # 부드러운 건반: 빠른 어택, 긴 감쇠
        env = np.minimum(t / 0.012, 1) * np.exp(-t * 1.1)
        w = np.sin(2*np.pi*f*t) + 0.5*np.sin(2*np.pi*2*f*t)*np.exp(-t*2.5) + 0.2*np.sin(2*np.pi*3*f*t)*np.exp(-t*4)
    else:                  # 서브 베이스
        env = np.clip(np.minimum(t / 0.8, 1) * np.clip((d - t) / 2.0, 0, 1), 0, 1)
        w = np.sin(2*np.pi*f*t)
    s = w * env * vol
    pan = 0.5 + 0.35*np.sin(f)  # 음마다 살짝 다른 위치
    L[i0:i0+n] += s * (1 - pan) * 1.4; R[i0:i0+n] += s * pan * 1.4


# Cmaj7 · Am7 · Fmaj7 · Gsus2 — 코드당 8초 (≈60bpm, 2마디)
chords = [((130.8, 164.8, 196.0, 246.9), 65.4), ((110.0, 130.8, 164.8, 196.0), 55.0),
          ((87.3, 130.8, 174.6, 220.0), 43.7), ((98.0, 146.8, 196.0, 220.0), 49.0)]
melody = [[(523.3, 0.5), (659.3, 3.0), (587.3, 5.5)], [(440.0, 1.0), (523.3, 4.0)],
          [(698.5, 0.5), (659.3, 3.5), (523.3, 6.0)], [(587.3, 1.0), (493.9, 4.5), (523.3, 6.5)]]
bar, k, t0 = 8.0, 0, 0.0
while t0 < total - 0.1:
    ch, bass = chords[k % 4]
    for f in ch: tone(f, t0, bar + 2.0, 0.030, "pad")
    tone(bass, t0, bar + 1.0, 0.045, "bass")
    if k % 2 == 0 or k % 4 == 3:  # 두 코드에 한 번꼴로만 멜로디 → 여백
        for f, off in melody[k % 4]: tone(f, t0 + off, 5.0, 0.055, "piano")
    t0 += bar; k += 1

# 긴 잔향 느낌: 세 겹 에코
for dl, g in ((0.31, 0.30), (0.62, 0.18), (0.93, 0.10)):
    n = int(sr * dl)
    L[n:] += L[:-n] * g; R[n:] += R[:-n] * g
fi, fo = int(sr * 3), int(sr * 6)
L[:fi] *= np.linspace(0, 1, fi); R[:fi] *= np.linspace(0, 1, fi)
L[-fo:] *= np.linspace(1, 0, fo); R[-fo:] *= np.linspace(1, 0, fo)
peak = max(np.abs(L).max(), np.abs(R).max()) + 1e-9
L, R = L / peak * 0.45, R / peak * 0.45
pcm = np.column_stack([(L * 32767).astype(np.int16), (R * 32767).astype(np.int16)]).flatten()
out = Path("projects/saga/recruit/7기홍보영상/assets/bgm_temp.wav")
with wave.open(str(out), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes())
print("bgm", out, total)
