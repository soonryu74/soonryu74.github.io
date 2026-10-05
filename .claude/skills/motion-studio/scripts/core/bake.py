"""굽기 — 장면 코드의 frame(t) → mp4. 점검 모음(--sheet) · 한 장(--still) · 조각 굽기(part 1/2/3) · 잇기 · 소리 입히기.

장면 코드(scenes.py)는 W · H · FPS · DUR 와 frame(t) → PIL Image 만 갖추면 된다. 그다음:

    from core import bake
    if __name__ == '__main__': bake.cli(sys.modules[__name__], out='out/<제목>.mp4', audio=build_audio)

명령 (scenes.py 에서):
  --still 1.5 8.2 …     그 시각 한 장씩 → out/still_*.png
  --sheet [n]           장면마다 n장(기본 3: 시작 · 가운데 · 끝) 모음 → out/_sheet.jpg   (SCENES 가 있으면 장면 경계로)
  --audio               소리만 → out/mix.wav
  --check               점검 보고 → out/_check.md (scenes.py 에 KIT · PLAN · EDIT) + 움직임 시간 띠 → out/_motion.jpg
  --draft               확인용 굽기 — 초당 프레임 절반 · 낮은 화질로 절반 시간에 → out/<제목>_draft.mp4
  --bake                전체 굽기 (소리까지)
  --part K/N            K번째 조각만 굽기 (길면 part 1/2/3 …로 나눠 굽는다) → out/_part_K.mp4
  --join N              조각 N개 잇고 소리 입히기
"""
import math
import multiprocessing as mp
import os
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

FF = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y']
_M = None
_MEMO = {}


def memo(key, fn, keep=12):
    """같은 key 면 한 번만 그리고 다시 쓴다 — 다 나와서 더 안 바뀌는 바탕 · 크게 흐린 화면 등 (프레임마다 다시 그리면 굽기가 느려진다).
    돌려받은 그림은 고치지 말고 .copy() 해서 쓴다. 굽기 일꾼마다 따로 기억한다."""
    if key not in _MEMO:
        if len(_MEMO) >= keep: _MEMO.pop(next(iter(_MEMO)))
        _MEMO[key] = fn()
    return _MEMO[key]


_STEP = 1


def _work(i):
    return _M.frame(i * _STEP / _M.FPS).convert('RGB').tobytes()


def frames(M, lo, hi, out, workers=None, chunk=18, crf=18, preset='faster', step=1):
    """프레임 lo~hi-1 → 무음 mp4"""
    global _M, _STEP; _M = M; _STEP = step
    os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
    p = subprocess.Popen(FF + ['-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{M.W}x{M.H}', '-r', str(M.FPS / step), '-i', '-',
                               '-c:v', 'libx264', '-preset', preset, '-crf', str(crf), '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
    workers = workers or int(os.environ.get('MOTION_WORKERS', 0)) or max(1, min(8, (os.cpu_count() or 2) - 1))   # 코어 수만큼 (조각 굽기를 동시에 여러 개 돌리면 메모리가 모자랄 수 있다)
    with mp.get_context('fork').Pool(workers) as pool:
        for i, b in enumerate(pool.imap(_work, range(lo, hi), chunksize=chunk)):
            p.stdin.write(b)
            if (i + 1) % (M.FPS * 5) == 0: print(f'  {lo + i + 1}/{hi} 프레임', flush=True)
    p.stdin.close(); p.wait()
    return out


def total(M): return int(math.ceil(M.DUR * M.FPS))


def part(M, k, n, outdir):
    T = total(M); lo, hi = (k - 1) * T // n, k * T // n
    return frames(M, lo, hi, os.path.join(outdir, f'_part_{k}.mp4'))


def join(n, outdir, out, wav=None):
    lst = os.path.join(outdir, '_parts.txt')
    with open(lst, 'w') as f:
        for k in range(1, n + 1): f.write(f"file '{os.path.abspath(os.path.join(outdir, f'_part_{k}.mp4'))}'\n")
    silent = os.path.join(outdir, '_silent.mp4')
    subprocess.run(FF + ['-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', silent], check=True)
    return mux(silent, wav, out) if wav else os.replace(silent, out) or out


def mux(video, wav, out):
    subprocess.run(FF + ['-i', video, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k',
                         '-shortest', '-movflags', '+faststart', out], check=True)
    return out


def still(M, ts, outdir):
    paths = []
    for t in ts:
        p = os.path.join(outdir, f'still_{t:06.2f}.png'); M.frame(t).convert('RGB').save(p); paths.append(p)
    return paths


def sheet_times(M, n=3):
    """장면마다 n장 — M.SCENES = [(시작, 끝), …] 이 있으면 그 경계로, 없으면 3초 간격"""
    sc = getattr(M, 'SCENES', None) or [(t, min(M.DUR, t + 3)) for t in range(0, int(math.ceil(M.DUR)), 3)]
    out = []
    for a, b in sc:
        for j in range(n):
            u = (j + 0.5) / n if n > 1 else 0.98
            out.append(round(a + (b - a) * (0.1 + 0.88 * u) if n > 1 else b - 0.05, 2))
    return out, len(sc)


def sheet(M, outdir, n=3, thumb=300):
    """점검 모음 한 장 — 장면 한 줄에 n장 (Claude 가 먼저 보고 고친 뒤 유저에게)"""
    ts, rows = sheet_times(M, n)
    tw = thumb; th = int(tw * M.H / M.W); pad = 12; lab = 30
    cols = n
    S = Image.new('RGB', (pad + cols * (tw + pad), pad + rows * (th + lab + pad)), (30, 30, 34)); d = ImageDraw.Draw(S)
    try:
        here = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        f = ImageFont.truetype(os.path.join(here, 'assets', 'fonts', 'Pretendard-Regular.otf'), 20)
    except Exception:
        f = ImageFont.load_default()
    for i, t in enumerate(ts):
        r, c = divmod(i, cols); x = pad + c * (tw + pad); y = pad + r * (th + lab + pad)
        S.paste(M.frame(t).convert('RGB').resize((tw, th), Image.LANCZOS), (x, y + lab))
        d.text((x, y + 4), f'장면 {r + 1} · {t:.2f}초', font=f, fill=(220, 220, 225))
    p = os.path.join(outdir, '_sheet.jpg'); S.save(p, quality=88)
    return p


def motion_strip(M, outdir, n=6, gap=0.2, thumb=200):
    """움직임 시간 띠 — 장면마다 시작 0.2초부터 gap 간격 n장 (정지 화면 점검으로는 안 보이는 등장 · 카메라 움직임 보기)"""
    scenes = getattr(M, 'SCENES', None) or [(0, M.DUR)]
    tw = thumb; th = int(thumb * M.H / M.W); S = Image.new('RGB', (n * tw, len(scenes) * (th + 22)), (24, 24, 28)); d = ImageDraw.Draw(S)
    try: f = ImageFont.truetype(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'assets', 'fonts', 'Pretendard-Regular.otf'), 15)
    except OSError: f = ImageFont.load_default()
    for r, (a, b) in enumerate(scenes):
        for c in range(n):
            t = min(b - 0.01, a + 0.2 + c * gap)
            S.paste(M.frame(t).convert('RGB').resize((tw, th), Image.LANCZOS), (c * tw, r * (th + 22) + 22))
        d.text((4, r * (th + 22) + 4), f'장면 {r + 1} · {a + 0.2:.1f}초부터 {gap}초 간격', font=f, fill=(220, 220, 225))
    p = os.path.join(outdir, '_motion.jpg'); S.save(p, quality=85); return p


def cli(M, out, audio=None):
    """scenes.py 의 명령 처리. audio = (wav 경로) → wav 경로 를 만드는 함수 (없으면 무음)"""
    a = sys.argv[1:]; outdir = os.path.dirname(out) or 'out'; os.makedirs(outdir, exist_ok=True)
    wavp = os.path.join(outdir, 'mix.wav')
    if '--still' in a:
        ts = [float(x) for x in a[a.index('--still') + 1:] if not x.startswith('--')]
        print('\n'.join(still(M, ts, outdir)))
    elif '--sheet' in a:
        i = a.index('--sheet'); n = int(a[i + 1]) if len(a) > i + 1 and a[i + 1].isdigit() else 3
        print(sheet(M, outdir, n))
    elif '--audio' in a:
        print(audio(wavp) if audio else '소리 함수가 없어요')
    elif '--part' in a:
        k, n = map(int, a[a.index('--part') + 1].split('/')); print(part(M, k, n, outdir))
    elif '--join' in a:
        n = int(a[a.index('--join') + 1]); w = audio(wavp) if audio else None; print(join(n, outdir, out, w))
    elif '--check' in a:   # 점검 보고(키트 · 세기 · 편집 · 킥 · 멈춘 구간) + 움직임 시간 띠
        from . import kit
        rep, n = kit.check(M); p = os.path.join(outdir, '_check.md'); open(p, 'w', encoding='utf-8').write(rep)
        print(rep); print(motion_strip(M, outdir))
    elif '--draft' in a:   # 확인용 — 프레임을 하나 걸러 절반 시간에 (움직임 · 타이밍 보기)
        dp = out[:-4] + '_draft.mp4'
        silent = frames(M, 0, total(M) // 2, os.path.join(outdir, '_silent_draft.mp4'), step=2, crf=26, preset='veryfast')
        print(mux(silent, audio(wavp), dp) if audio else os.replace(silent, dp) or dp)
    elif '--bake' in a:
        silent = frames(M, 0, total(M), os.path.join(outdir, '_silent.mp4'))
        print(mux(silent, audio(wavp), out) if audio else os.replace(silent, out) or out)
    else:
        print(__doc__)
