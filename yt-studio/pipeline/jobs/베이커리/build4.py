"""사랑의 베이커리 v4 — 썸네일(2.5s) → 오프닝 범퍼(3s) → 공백 줄인 본편(cut_*.mp4) → 엔딩 카드(5s). 음성은 자막 시작에 맞춰, 배경음은 전체."""
import json, os, subprocess, sys, wave
import numpy as np
sys.path.insert(0, '/home/user/soonryu74.github.io/.claude/skills/motion-studio/scripts')
from core import audio as AU
M = '/home/user/soonryu74.github.io/yt-studio/pipeline/projects/motion/베이커리/out'
BGM = '/home/user/soonryu74.github.io/yt-studio/pipeline/jobs/베이커리/bgm.mp3'
R = json.load(open('timing_refined.json', encoding='utf-8'))
HEAD_TH, HEAD_OP, END = 2.5, 3.0, 5.0
SKIP = set(os.environ.get('SKIP', '').split(','))          # 음성이 없는 줄 (예: B04)
def wlen(p):
    with wave.open(p) as w: return w.getnframes() / w.getframerate()
def dur_of(p):
    import re
    r = subprocess.run(['ffmpeg', '-i', p], capture_output=True, text=True).stderr
    m = re.search(r'Duration: (\d+):(\d+):([\d.]+)', r); return int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3])
def build(tag):
    T = tag.upper(); cut = json.load(open(f'cut_{tag}.json')); lines = R[T]
    body = dur_of(f'cut_{tag}.mp4'); off = HEAD_TH + HEAD_OP
    vo = []; prev_end = 0.0
    for i, ((t0, t, txt), nt) in enumerate(zip(lines, cut['starts'])):
        key = f'{T}{i:02d}'; p = f'voice/{key}.wav'
        if key in SKIP or not os.path.exists(p): print(f'   (음성 없음) {key} {txt}'); continue
        d = wlen(p); s = max(off + nt, prev_end + 0.2); vo.append((s, p, d)); prev_end = s + d
        print(f'{T} {off + nt:5.1f}→{s:5.1f}s +{d:3.1f}  {txt}')
    DM = off + body + END
    last_end = max(s + d for s, p, d in vo)
    if last_end > DM - 0.8: print(f'  ⚠ 마지막 대사가 끝({DM:.1f})에 닿음: {last_end:.1f}')
    bg = AU.read_wav(BGM)[:int((DM + 0.5) * AU.SR)]; bg = bg / (abs(bg).max() + 1e-9) * 0.9
    sfx = AU.new_track(DM)
    mix = AU.mixdown(DM, f'out/{T}_mix.wav', bg, sfx, [(s, p) for s, p, d in vo], bgm_gain=0.28, voice_gain=0.95, duck=0.35, fade_in=0.6, fade_out=2.5)
    thumb = f'out/사랑의베이커리_{1 if tag == "a" else 2}_썸네일.jpg'
    inputs = ['-loop', '1', '-framerate', '24', '-t', f'{HEAD_TH:.2f}', '-i', thumb, '-i', f'{M}/open.mp4', '-i', f'cut_{tag}.mp4', '-i', f'{M}/end_{tag}.mp4', '-i', mix]
    fc = ('[0:v]scale=1280:720,setsar=1,format=yuv420p,fps=24[v0];[1:v]fps=24,setsar=1,format=yuv420p[v1];[2:v]fps=24,setsar=1,format=yuv420p[v2];[3:v]fps=24,setsar=1,format=yuv420p[v3];'
          '[v0][v1][v2][v3]concat=n=4:v=1:a=0[vout]')
    out = f'out/{T}.mp4'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y'] + inputs + ['-filter_complex', fc, '-map', '[vout]', '-map', '4:a',
                    '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out], check=True)
    print(f'  → {out}  {DM:.1f}s (본편 {body:.1f}s)')
for tag in (sys.argv[1:] or ['a', 'b']): build(tag)
