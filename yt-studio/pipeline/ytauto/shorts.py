"""영상 조립 엔진.

1) piece(): 그림·영상 구간·글자 화면을 같은 크기·fps·음성 형식의 조각으로 만든다.
2) join(): 조각을 이어 붙인다.
3) finish(): 머리 제목·자막·이름표·파형 같은 투명 그림을 시간에 맞춰 얹고, 음성·배경음을 섞는다.
"""
from __future__ import annotations

import re
import subprocess
from pathlib import Path

from . import media, render
from .layout import size_of

FPS = 30
VIDEO_EXT = {".mp4", ".mov", ".m4v", ".webm", ".mkv", ".avi"}


def has_audio(path: str) -> bool:
    p = subprocess.run([media.ffmpeg_exe(), "-hide_banner", "-i", str(path)],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    return bool(re.search(r"Stream #.*Audio:", p.stderr))


def _enc(out: Path, dur: float) -> list[str]:
    return ["-t", f"{dur:.3f}", "-r", str(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
            "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
            "-movflags", "+faststart", str(out)]


def piece(out: Path, fmt: str, src: str, dur: float, start: float = 0.0, audio: str | None = None,
          fit: str = "auto", crop_x: float = 0.5, zoom: bool = True, keep_audio: bool = True) -> Path:
    """조각 하나.  src: 그림(jpg/png) 또는 영상.  audio: 따로 붙일 음성(없으면 영상 소리 또는 무음)."""
    W, H = size_of(fmt)
    out.parent.mkdir(parents=True, exist_ok=True)
    args: list[str] = []
    is_video = Path(src).suffix.lower() in VIDEO_EXT
    if is_video:
        args += ["-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", src]
        vw, vh = media.video_size(src)
        mode = fit if fit != "auto" else ("blur" if render.ratio_differs(vw, vh, (W, H)) else "cover")
        if mode == "blur":
            v = (f"[0:v]split[a][b];[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
                 f"boxblur=28:2,eq=brightness=-0.15[bk];[b]scale={W}:{H}:force_original_aspect_ratio=decrease[fg];"
                 f"[bk][fg]overlay=(W-w)/2:(H-h)/2")
        elif mode == "crop":  # 화자만 세로로 크게 (crop_x: 0 왼쪽 ~ 1 오른쪽)
            v = (f"[0:v]scale=-2:{H},crop={W}:{H}:(iw-{W})*{crop_x:.3f}:0")
        else:
            v = f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}"
        v += f",fps={FPS},setsar=1,tpad=stop_mode=clone:stop_duration={dur:.2f}[v]"
    else:
        img = render.prepare_image(Path(src), out.with_suffix(".frame.jpg"), fmt)
        args += ["-loop", "1", "-framerate", str(FPS), "-t", f"{dur:.3f}", "-i", str(img)]
        frames = int(dur * FPS) + 1
        if zoom:
            v = (f"[0:v]scale={W * 3 // 2}:{H * 3 // 2},zoompan=z='1+0.06*on/{frames}':d=1:"
                 f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS},setsar=1[v]")
        else:
            v = f"[0:v]scale={W}:{H},fps={FPS},setsar=1[v]"
    if audio:
        args += ["-i", audio]
        a = "[1:a]apad,aresample=48000,aformat=channel_layouts=stereo[a]"
    elif is_video and keep_audio and has_audio(src):
        a = "[0:a]apad,aresample=48000,aformat=channel_layouts=stereo[a]"
    else:
        args += ["-f", "lavfi", "-t", f"{dur:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
        a = "[1:a]aformat=channel_layouts=stereo[a]"
    args += ["-filter_complex", f"{v};{a}", "-map", "[v]", "-map", "[a]", *_enc(out, dur)]
    media.run(args)
    return out


def join(parts: list[Path], out: Path) -> Path:
    lst = out.with_suffix(".txt")
    lst.write_text("".join(f"file '{p.resolve().as_posix()}'\n" for p in parts), encoding="utf-8")
    media.run(["-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(out)])
    lst.unlink(missing_ok=True)
    return out


def finish(base: Path, out: Path, overlays: list[tuple[Path, float, float]],
           audio: str | None = None, audio_offset: float = 0.0, bgm: str = "", bgm_volume: float = 0.10,
           wave: dict | None = None, sfx: list[tuple[str, float, float]] | None = None,
           duck: bool = True) -> Path:
    """overlays: [(투명 png, 시작초, 끝초)].  audio: 바탕 영상 소리 대신 쓸 음성.
    wave: {"x","y","w","h","start","end","color"} 음성 파형 표시.
    sfx: [(효과음 파일, 시작초, 음량)].  duck: 말소리가 나올 때 배경음을 자동으로 줄이기."""
    dur = media.duration(str(base))
    args = ["-i", str(base)]
    n = 1
    aud_idx = 0
    if audio:
        args += ["-i", audio]
        aud_idx = n
        n += 1
    bgm_idx = None
    if bgm and Path(bgm).exists():
        args += ["-stream_loop", "-1", "-i", bgm]
        bgm_idx = n
        n += 1
    sfx_idx = []
    for path, at, gain in sfx or []:
        args += ["-i", str(path)]
        sfx_idx.append((n, at, gain))
        n += 1
    ov_start = n
    for png, _, _ in overlays:
        args += ["-i", str(png)]
    fil = []
    if audio:
        delay = int(audio_offset * 1000)
        fil.append(f"[{aud_idx}:a]adelay={delay}|{delay},apad,aresample=48000,"
                   f"aformat=channel_layouts=stereo[voice]")
    else:
        fil.append("[0:a]anull[voice]")
    last = "0:v"
    if wave:
        fil.append("[voice]asplit=2[voice][wsrc]")
        fil.append(f"[wsrc]showwaves=s={wave['w']}x{wave['h']}:mode=cline:rate={FPS}:"
                   f"colors={wave.get('color', '0xFFFFFF')}@0.9,format=rgba[wv]")
        fil.append(f"[{last}][wv]overlay={wave['x']}:{wave['y']}:"
                   f"enable='between(t,{wave['start']:.2f},{wave['end']:.2f})'[w0]")
        last = "w0"
    for i, (_, a, b) in enumerate(overlays):
        nxt = f"o{i}"
        fil.append(f"[{last}][{ov_start + i}:v]overlay=0:0:enable='between(t,{a:.3f},{b:.3f})'[{nxt}]")
        last = nxt
    mix = ["[vmain]"]
    if bgm_idx is not None:
        fil.append(f"[{bgm_idx}:a]aresample=48000,aformat=channel_layouts=stereo,volume={bgm_volume}[bg0]")
        if duck:  # 말소리를 신호로 배경음을 눌러 준다
            fil.append("[voice]asplit=2[vmain][vsc]")
            fil.append("[bg0][vsc]sidechaincompress=threshold=0.02:ratio=8:attack=10:release=350[bg]")
        else:
            fil.append("[voice]anull[vmain]")
            fil.append("[bg0]anull[bg]")
        mix.append("[bg]")
    else:
        fil.append("[voice]anull[vmain]")
    for k, (idx, at, gain) in enumerate(sfx_idx):
        ms = int(max(0, at) * 1000)
        fil.append(f"[{idx}:a]aresample=48000,aformat=channel_layouts=stereo,volume={gain},"
                   f"adelay={ms}|{ms}[fx{k}]")
        mix.append(f"[fx{k}]")
    # 유튜브 표준 크기(약 -14 LUFS)로 맞춘다. 유튜브는 작은 소리를 키워 주지 않는다.
    level = "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000"
    if len(mix) > 1:
        fil.append(f"{''.join(mix)}amix=inputs={len(mix)}:duration=first:dropout_transition=0:normalize=0,"
                   f"alimiter=limit=0.95,{level}[aout]")
    else:
        fil.append(f"[vmain]{level}[aout]")
    fil.append(f"[{last}]null[vout]")
    args += ["-filter_complex", ";".join(fil), "-map", "[vout]", "-map", "[aout]",
             "-t", f"{dur:.3f}", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
             "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", str(out)]
    media.run(args)
    return out


def chunk(cues: list[tuple[float, float, str]], fmt: str) -> list[tuple[float, float, str]]:
    from .assemble import chunk_cues
    return chunk_cues(cues, fmt)


def parse_time(v) -> float:
    """'1:02:03.5' / '02:03' / '12.5' / 12.5 → 초"""
    if isinstance(v, (int, float)):
        return float(v)
    parts = [float(p) for p in str(v).strip().split(":")]
    t = 0.0
    for p in parts:
        t = t * 60 + p
    return t


def with_cover(video: Path, cover: Path, out: Path, sec: float = 0.6) -> Path:
    """표지 그림을 영상 맨 앞에 잠깐(기본 0.6초) 붙인다.
    휴대폰 유튜브 앱에서 쇼츠 표지를 '영상 속 장면'으로 고를 때 이 장면을 고르면 된다."""
    W, H = media.video_size(str(video))
    fps = 30
    media.run(["-loop", "1", "-t", f"{sec}", "-i", str(cover),
               "-f", "lavfi", "-t", f"{sec}", "-i", "anullsrc=r=48000:cl=stereo",
               "-i", str(video),
               "-filter_complex",
               f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,fps={fps},format=yuv420p[c];"
               f"[2:v]fps={fps},setsar=1,format=yuv420p[v];"
               f"[2:a]aresample=48000,aformat=channel_layouts=stereo[a];"
               f"[c][1:a][v][a]concat=n=2:v=1:a=1[ov][oa]",
               "-map", "[ov]", "-map", "[oa]", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
               "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)])
    return out
