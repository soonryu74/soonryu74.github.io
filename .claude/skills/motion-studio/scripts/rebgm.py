#!/usr/bin/env python3
"""이미 있는 영상에 배경음만 새로 (reference/sound.md §4)

motion-studio 로 만든 영상(작업 폴더에 scenes.py 가 있다)이면 이것 말고 → python3 scenes.py --rebgm [장르]
  (효과음 · 나레이션은 그대로 두고 배경음만 바꾼다 — 완성 mp4 에는 소리가 섞여 있어서 배경음만 뽑아낼 수 없다)

그 밖의 영상:
  python3 <스킬>/scripts/rebgm.py 영상.mp4 --style 로파이 [--seed N] [--keep 0.9] [--gain 0.35] [--out 새.mp4]
     --keep  원래 소리 크기 (0 = 원래 소리 빼고 배경음만 · 기본 0.9 = 원래 소리 그대로 + 말소리가 나오면 배경음이 내려감)
     --gain  배경음 크기 (기본 0.35)
     --cuts  장면 바뀜을 찾을 문턱 (기본 0.2 · 화면이 확 바뀌는 곳에서 배경음 세기가 바뀌고 심벌)
     --at 5,7.5,24.9   장면 바뀌는 시각을 직접 (찾기보다 정확 — 알면 이걸로)
     장르는 앞 글자만 써도 된다 (일렉 · 긴장 · 축하 …)
  python3 <스킬>/scripts/rebgm.py --list      장르 목록
결과 = 영상 옆 <이름>_새배경음.mp4 (원본은 그대로 · 같은 이름이 있으면 _2)
"""
import os
import random
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from core import audio as AU, music  # noqa: E402
from core.bake import _free  # noqa: E402

FF = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y']


def opt(a, k, d=None):
    return a[a.index(k) + 1] if k in a and a.index(k) + 1 < len(a) else d


def duration(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True)
    return float(r.stdout.strip())


def has_audio(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', p], capture_output=True, text=True)
    return bool(r.stdout.strip())


def cuts(p, th=0.3):
    """화면이 확 바뀌는 시각들"""
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', p, '-vf', f"select='gt(scene,{th})',showinfo", '-an', '-f', 'null', '-'],
                       capture_output=True, text=True)
    ts = [float(m) for m in re.findall(r'pts_time:([\d.]+)', r.stderr)]
    out = []
    for t in ts:
        if not out or t - out[-1] > 1.5: out.append(t)   # 너무 잦은 바뀜은 하나로
    return out


def sections(d, cs):
    """장면 바뀜 → [(시작, 끝, 세기)] — 처음 · 끝은 잔잔하게, 가운데는 세게 (가장 긴 가운데 구간이 3)"""
    edges = [0.0] + [c for c in cs if 1.0 < c < d - 1.0] + [d]
    if len(edges) <= 3: return [(0, d * 0.2, 1), (d * 0.2, d * 0.82, 3), (d * 0.82, d, 1)]
    segs = list(zip(edges[:-1], edges[1:])); mid = segs[1:-1]
    longest = max(mid, key=lambda s: s[1] - s[0]) if mid else None
    out = []
    for i, (a, b) in enumerate(segs):
        e = 1 if i in (0, len(segs) - 1) else (3 if (a, b) == longest else 2)
        out.append((a, b, e))
    return out


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a or '--list' in a:
        for k, v in music.STYLES.items(): print(f"  {k:10s} {v['bpm'][0]}~{v['bpm'][1]} bpm")
        sys.exit(0)
    src = a[0]; style = opt(a, '--style', '경쾌 팝'); seed = int(opt(a, '--seed', random.randint(1, 9999)))
    keep = float(opt(a, '--keep', 0.9)); gain = float(opt(a, '--gain', 0.35)); th = float(opt(a, '--cuts', 0.2))
    style = music.find_style(style)
    d = duration(src); cs = [float(x) for x in opt(a, '--at').split(',')] if '--at' in a else cuts(src, th); secs = sections(d, cs)
    print(f'장면 바뀜 {len(cs)}곳 → 구간 {len(secs)}개 · {style} · seed {seed}')
    bg = AU.bgm(secs, d, seed=seed, style=style)
    tmp = os.path.join(os.path.dirname(os.path.abspath(src)), '_rebgm_tmp'); os.makedirs(tmp, exist_ok=True)
    import numpy as np
    n = int(d * AU.SR); y = np.zeros(n); b = np.asarray(bg, np.float64)[:n]; b = np.pad(b, (0, n - len(b)))
    y += b / (np.abs(b).max() + 1e-9) * gain
    if keep > 0 and has_audio(src):   # 원래 소리 + 소리가 큰 동안(말 · 박수) 배경음을 내린다
        ow = os.path.join(tmp, 'orig.wav'); subprocess.run(FF + ['-i', src, '-vn', '-ac', '1', '-ar', str(AU.SR), ow], check=True)
        o = AU.read_wav(ow)[:n]; o = np.pad(o, (0, n - len(o)))
        w = int(0.05 * AU.SR); m = n // w
        r = np.sqrt((o[:m * w].reshape(m, w) ** 2).mean(axis=1)) if m else np.zeros(1)
        thr = max(1e-4, np.percentile(r, 60)); on = np.clip((r - thr * 0.5) / thr, 0, 1)
        k = np.ones(5) / 5; on = np.convolve(on, k, 'same')   # 앞뒤 부드럽게
        dk = 1 - 0.55 * np.repeat(on, w); dk = np.pad(dk, (0, n - len(dk)), constant_values=1)
        y = y * dk + o / (np.abs(o).max() + 1e-9) * 0.85 * keep
    y = np.tanh(y * 1.1) / np.tanh(1.1); y *= 0.95 / (np.abs(y).max() + 1e-9)
    f = int(min(2.0, d * 0.1) * AU.SR); y[-f:] *= np.linspace(1, 0, f)
    wav = os.path.join(tmp, 'mix.wav'); AU.write_wav(wav, y)
    dst = opt(a, '--out') or _free(os.path.splitext(src)[0] + '_새배경음.mp4')
    subprocess.run(FF + ['-i', src, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k',
                         '-shortest', '-movflags', '+faststart', dst], check=True)
    print(f'✅ {dst}\n🎵 같은 곡을 다시: --style {style} --seed {seed}  · 임시 파일 폴더 _rebgm_tmp 는 지워도 돼요')
