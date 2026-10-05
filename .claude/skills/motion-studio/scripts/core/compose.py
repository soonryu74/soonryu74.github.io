"""잇기 — 무음 본편 + 소리 → 본편 · 오프닝 + 본편 + 엔딩 → 최종.
※ 챕터 잇기(배경음 크로스페이드)는 다음 단계(긴 영상)에서 더한다.
"""
import subprocess

FF = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y']


def duration(p):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p],
                                capture_output=True, text=True).stdout)


def size(p):
    o = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', p],
                       capture_output=True, text=True).stdout.strip().split(',')
    return int(o[0]), int(o[1])


def fit_video(src, W, H, bg, out):
    """다른 비율 영상을 (W, H) 안에 줄여 앉히고 남는 곳은 바탕색 (소리 그대로)"""
    c = '0x%02x%02x%02x' % tuple(bg)
    subprocess.run(FF + ['-i', src, '-vf', f'scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color={c},format=yuv420p',
                         '-c:v', 'libx264', '-crf', '18', '-c:a', 'copy', out], check=True)
    return out


def mux(video, wav, out):
    subprocess.run(FF + ['-i', video, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                         '-c:a', 'aac', '-ar', '44100', '-ac', '1', '-shortest', out], check=True)
    return out


def bookend(op, body, ed, body_dur, out, fps=30, x1=0.15, x2=0.3):
    """오프닝 →(x1초 페이드)→ 본편 →(x2초 페이드)→ 엔딩"""
    o1 = duration(op) - x1; o2 = o1 + body_dur - x2
    fc = (f"[0:v]settb=AVTB,fps={fps}[v0];[1:v]settb=AVTB,fps={fps}[v1];[2:v]settb=AVTB,fps={fps}[v2];"
          f"[v0][v1]xfade=transition=fade:duration={x1}:offset={o1:.3f}[va];[va][v2]xfade=transition=fade:duration={x2}:offset={o2:.3f},format=yuv420p[v];"
          f"[0:a]aresample=44100,aformat=channel_layouts=mono[a0];[1:a]aresample=44100,aformat=channel_layouts=mono[a1];[2:a]aresample=44100,aformat=channel_layouts=mono[a2];"
          f"[a0][a1]acrossfade=d={x1}[aa];[aa][a2]acrossfade=d={x2}[a]")
    subprocess.run(FF + ['-i', op, '-i', body, '-i', ed, '-filter_complex', fc, '-map', '[v]', '-map', '[a]',
                         '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', out], check=True)
    return out
