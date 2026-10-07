import asyncio, os, ssl, subprocess, sys, wave, json
import numpy as np
from pathlib import Path
sys.path.insert(0, '/home/user/soonryu74.github.io/.claude/skills/motion-studio/scripts')
os.environ.setdefault('SF2', '/home/user/soonryu74.github.io/yt-studio/pipeline/projects/motion/sf2/GeneralUser-GS.sf2')
from core import audio as AU
import edge_tts, edge_tts.communicate as comm
ca = os.environ.get("SSL_CERT_FILE")
if ca and Path(ca).exists(): comm._SSL_CTX = ssl.create_default_context(cafile=ca)
proxy = os.environ.get("HTTPS_PROXY") or None

A = [(1.6, "네 이웃을 네 자신같이 사랑하라."), (4.6, "중증장애인에게 직업의 기회를 제공하기 위해"), (7.8, "사랑의 베이커리가 탄생하였습니다."),
     (10.1, "빵을 정리하고,"), (12.4, "고객을 만나고,"), (17.4, "자신의 일을 해냅니다."), (20.2, "~그리고 또 다른 일터에서는, 직접 빵을 만듭니다."),
     (23.7, "배우고,"), (24.5, "만들고,"), (25.3, "경험을 쌓아갑니다."), (27.5, "경험을 나누고,"), (30.2, "서로 배우며,"), (32.4, "함께 성장합니다."),
     (35.5, "만드는 곳에서도,"), (39.2, "만나는 곳에서도,"), (41.3, "~우리의 일은 이어집니다."), (44.3, "한 끼의 빵이,"), (47.0, "한 사람의 일자리가 되도록, 사랑의 베이커리가 함께하겠습니다.")]
B = [(6.3, "오늘도 우리의 하루는,"), (8.2, "좋은 빵을 만드는 일에서 시작됩니다."), (11.0, "~사랑의 베이커리의 맛있는 빵을 위한, 세 가지 원칙."),
     (14.7, "첫째, 좋은 재료."), (16.4, "#좋은 빵은,"), (17.2, "좋은 재료에서부터 시작됩니다."), (20.2, "둘째, 장인의 손길."), (22.3, "삼십 년 경력의 전문 파티시에와 함께,"),
     (25.1, "빵의 기본과 정직을 지킵니다."), (30.2, "셋째, 깨끗한 원칙."), (32.2, "기본을 지키는 정직한 과정."), (36.2, "깨끗한 환경에서,"),
     (39.2, "위생과 안전의 원칙을 지킵니다."), (42.2, "#전문 파티시에와 함께,"), (43.9, "배우고, 만들고, 성장합니다."), (46.7, "사람과 기술이 함께 만드는,"), (48.7, "사랑의 베이커리.")]
VOICE = sys.argv[1] if len(sys.argv) > 1 else 'ko-KR-SunHiNeural'
# 자막이 실제로 뜨는 순간(프레임 분석)으로 시작 시각을 바꾼다
_R = json.load(open('timing_refined.json', encoding='utf-8'))
A = [(r[1], txt) for (t, txt), r in zip(A, _R['A'])]
B = [(r[1], txt) for (t, txt), r in zip(B, _R['B'])]

async def tts(lines, tag):
    out = []
    for i, (t, txt) in enumerate(lines):
        if txt.startswith('#'): continue
        mp3 = f'voice/{tag}{i:02d}.mp3'; wav = f'voice/{tag}{i:02d}.wav'
        if not os.path.exists(wav):
            await edge_tts.Communicate(txt, voice=VOICE, rate='-8%', pitch='-2Hz', proxy=proxy).save(mp3)
            subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', mp3, '-af',
                            'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse', '-ar', '44100', '-ac', '1', wav], check=True)
        with wave.open(wav) as w: d = w.getnframes() / w.getframerate()
        out.append((t, wav, d))
    return out

from PIL import Image, ImageDraw, ImageFont, ImageFilter
FONT = '/home/user/soonryu74.github.io/yt-studio/pipeline/projects/motion/직지/fonts/Pretendard-Bold.otf'
def caption_png(text, out, size=50):
    W, H = 1280, 720; f = ImageFont.truetype(FONT, size)
    tw = f.getlength(text); x = (W - tw) / 2; y = 618
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(sh)
    d.text((x + 2, y + 4), text, font=f, fill=(0, 0, 0, 235)); sh = sh.filter(ImageFilter.GaussianBlur(6))
    img.alpha_composite(sh)
    d = ImageDraw.Draw(img)
    d.text((x, y), text, font=f, fill=(255, 255, 255, 255), stroke_width=3, stroke_fill=(35, 25, 15, 210))
    img.save(out); return out

def band_png(out='out/band.png'):
    W, H = 1280, 720; a = np.zeros((H, W), np.uint8)
    y = np.arange(H); ramp = np.clip((y - 540) / (720 - 540), 0, 1) ** 1.4 * 0.5
    a[:] = (ramp * 255)[:, None]
    img = np.zeros((H, W, 4), np.uint8); img[..., 3] = a
    Image.fromarray(img, 'RGBA').save(out); return out
def dur_of(p):
    import re
    r = subprocess.run(['ffmpeg', '-i', p], capture_output=True, text=True).stderr
    m = re.search(r'Duration: (\d+):(\d+):([\d.]+)', r); return int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3])

def build(tag, src, lines, seed, mood):
    DUR = dur_of(src)
    vo = asyncio.run(tts(lines, tag))
    sched = []; prev_end = 0.0
    for (t, w, d), (_, txt) in zip(vo, [l for l in lines if not l[1].startswith('#')]):
        t2 = max(t, prev_end + 0.25); sched.append((t2, w, d)); prev_end = t2 + d
        print(f'{tag} {t:5.1f}→{t2:5.1f}s +{d:4.1f}s  {txt}')
    vo = sched
    # 겹침 점검: 다음 대사 시작 전에 끝나는지

    ext = '/home/user/soonryu74.github.io/yt-studio/pipeline/jobs/베이커리/bgm.mp3'
    if os.path.exists(ext):
        bg = AU.read_wav(ext)[:int((DUR + 0.5) * AU.SR)]; bg = bg / (abs(bg).max() + 1e-9) * 0.9
    else:
        bg = AU.bgm([(0, 1.0, 'intro', {}), (1.0, DUR - 2.0, mood, {}), (DUR - 2.0, DUR, 'outro', {})], DUR, seed=seed, bpm=76, palette='tale', drum_gain=0.0)
    sfx = AU.new_track(DUR)
    last_end = max(t + d for t, w, d in vo); DM = max(DUR, last_end) + 3.0; pad = DM - DUR   # 끝나고 3초 여유(마지막 화면 유지)
    if pad > 0:
        bg = AU.read_wav(ext)[:int((DM + 0.5) * AU.SR)] if os.path.exists(ext) else bg; bg = bg / (abs(bg).max() + 1e-9) * 0.9; sfx = AU.new_track(DM)
    mix = AU.mixdown(DM, f'out/{tag}_mix.wav', bg, sfx, [(t, w) for t, w, d in vo], bgm_gain=0.28, voice_gain=0.95, duck=0.35, fade_in=0.6, fade_out=2.5)
    out = f'out/{tag}.mp4'
    clean = f'clean_{tag.lower()}.mp4'
    if os.path.exists(clean):                       # 구운 자막을 지운 영상 + 새 자막(PNG · 페이드)
        src = clean
        caps = []; vis = [l for l in lines if not l[1].startswith('#')]
        starts = [t for t, w, d in vo]
        for k, ((t, w, d), (_, txt)) in enumerate(zip(vo, vis)):
            nxt = starts[k + 1] if k + 1 < len(starts) else DM
            if txt.startswith('~'): continue          # 화면에 같은 문구가 이미 크게 나오는 컷 → 자막 생략
            a = t - 0.1; b = min(nxt - 0.2, max(t + d + 1.0, t + 2.4)); caps.append((a, b, txt.rstrip(',.')))
        inputs = ['-i', src, '-i', mix, '-loop', '1', '-framerate', '24', '-t', f'{DM + 1:.2f}', '-i', band_png()]
        fc = '[0:v][2:v]overlay=eof_action=pass[vb];'; prev = '[vb]'
        for k, (a, b, txt) in enumerate(caps):
            png = caption_png(txt, f'out/cap_{tag}{k:02d}.png'); dur = b - a
            inputs += ['-loop', '1', '-framerate', '24', '-t', f'{dur:.2f}', '-i', png]
            fc += f'[{k + 3}:v]format=rgba,fade=t=in:st=0:d=0.3:alpha=1,fade=t=out:st={max(0, dur - 0.35):.2f}:d=0.35:alpha=1,setpts=PTS+{a:.2f}/TB[c{k}];'
            fc += f'{prev}[c{k}]overlay=eof_action=pass[v{k}];'; prev = f'[v{k}]'
        vf_pad = f'{prev}tpad=stop_mode=clone:stop_duration={pad:.2f}[vout]' if pad > 0.05 else f'{prev}null[vout]'
        fc += vf_pad
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y'] + inputs + ['-filter_complex', fc, '-map', '[vout]', '-map', '1:a',
                        '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out], check=True)
        print(f'  새 자막 {len(caps)}개 · 길이 {DM:.1f}s'); return
    if pad > 0.05:   # 마지막 대사가 영상보다 길면 끝 화면(로고)을 그만큼 붙잡아 둔다
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-i', mix, '-map', '0:v', '-map', '1:a', '-vf', f'tpad=stop_mode=clone:stop_duration={pad:.2f}',
                        '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out], check=True)
    else:
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-i', mix, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out], check=True)
    print(f'  길이 {DUR:.1f}s → {DM:.1f}s (pad {pad:.1f})')
    print('→', out)

build('A', 'in/a.mp4', A, 5, 'calm')
build('B', 'in/b.mp4', B, 9, 'calm')
