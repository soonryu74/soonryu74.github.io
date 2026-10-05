"""녹음 정리 — 앞뒤 빈 소리 자르기 · 무음으로 문장 나누기 · 원고 문장 수 맞추기.

유저가 주는 녹음은 두 가지:
  ① 문장마다 한 파일   → 파일마다 앞뒤 빈 소리만 자른다
  ② 한 파일에 쭉       → 무음 구간으로 나누고, 쉼표에서 끊긴 짧은 틈은 합쳐 원고 문장 수와 맞춘다

  python3 voice.py trim  <녹음…> --out voice/            ① → voice/01.wav, 02.wav …
  python3 voice.py split <녹음> --n 7 --out voice/        ② → voice/01.wav … 07.wav
     --speed 1.15   보통 속도로 녹음한 것을 빠르게 (음높이 유지 · ffmpeg atempo)
     --db -40       무음으로 볼 크기 (dBFS) · --gap 0.45 문장 사이로 볼 최소 무음(초)
출력: 줄마다 «번호 · 길이(초)» — 기획서 §7 에 적는다.
"""
import os
import subprocess
import sys

import numpy as np

SR = 44100
FF = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y']


def load(p, speed=1.0):
    """아무 녹음(m4a · mp3 · wav …) → mono float"""
    af = ['-af', f'atempo={speed}'] if abs(speed - 1) > 1e-3 else []
    raw = subprocess.run(FF + ['-i', p, *af, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, '<i2').astype(np.float32) / 32768


def save(path, x):
    import wave
    with wave.open(path, 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())


def _loud(x, db=-40, win=0.02):
    """창마다 소리가 있나 (True/False 배열)"""
    n = max(1, int(SR * win)); m = len(x) // n
    if m == 0: return np.zeros(0, bool), n
    rms = np.sqrt((x[:m * n].reshape(m, n) ** 2).mean(axis=1) + 1e-12)
    return 20 * np.log10(rms) > db, n


def trim(x, db=-40, pad=0.08):
    """앞뒤 빈 소리 자르기 (pad = 남길 여유 초)"""
    on, n = _loud(x, db)
    if not on.any(): return x[:0]
    i0 = max(0, np.argmax(on) * n - int(pad * SR)); i1 = min(len(x), (len(on) - np.argmax(on[::-1])) * n + int(pad * SR))
    return x[i0:i1]


def segments(x, db=-40, gap=0.45, min_len=0.25):
    """소리 덩어리 [(시작, 끝) 샘플] — gap 초 이상 조용하면 끊는다"""
    on, n = _loud(x, db); segs = []; i = 0; L = len(on)
    while i < L:
        if not on[i]: i += 1; continue
        j = i
        while j < L:
            if on[j]: j += 1; continue
            k = j
            while k < L and not on[k]: k += 1
            if (k - j) * n / SR >= gap or k >= L: break
            j = k
        if (j - i) * n / SR >= min_len: segs.append((i * n, j * n))
        i = j + 1
    return segs


def fit_count(segs, want):
    """덩어리 수를 원고 문장 수에 맞춘다 — 많으면 가장 짧은 틈부터 합친다 · 적으면 그대로 (어느 문장이 빠졌는지는 사람이 본다)"""
    segs = list(segs)
    while len(segs) > want > 0:
        gaps = [segs[i + 1][0] - segs[i][1] for i in range(len(segs) - 1)]
        i = int(np.argmin(gaps)); segs[i:i + 2] = [(segs[i][0], segs[i + 1][1])]
    return segs


def split(x, want, db=-40, gap=0.45, pad=0.08):
    segs = fit_count(segments(x, db, gap), want)
    return [x[max(0, a - int(pad * SR)):min(len(x), b + int(pad * SR))] for a, b in segs]


def _args(a, k, d, t=float):
    return t(a[a.index(k) + 1]) if k in a else d


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a or a[0] not in ('trim', 'split'): print(__doc__); sys.exit(0)
    outd = _args(a, '--out', 'voice', str); os.makedirs(outd, exist_ok=True)
    sp, db, gp = _args(a, '--speed', 1.0), _args(a, '--db', -40.0), _args(a, '--gap', 0.45)
    files = [p for i, p in enumerate(a[1:], 1) if not p.startswith('--') and not a[i - 1].startswith('--')]
    if a[0] == 'trim':
        for i, p in enumerate(files, 1):
            y = trim(load(p, sp), db); q = os.path.join(outd, f'{i:02d}.wav'); save(q, y); print(f'{i:02d}  {len(y) / SR:.2f}초  ← {os.path.basename(p)}')
    else:
        want = _args(a, '--n', 0, int); parts = split(load(files[0], sp), want, db, gp)
        for i, y in enumerate(parts, 1):
            q = os.path.join(outd, f'{i:02d}.wav'); save(q, y); print(f'{i:02d}  {len(y) / SR:.2f}초')
        if want and len(parts) != want: print(f'⚠ 문장 {want}개인데 {len(parts)}개로 나뉘었어요 — 빠진 문장만 다시 녹음받는다')
