"""ffmpeg 로 장면 영상을 만들고 이어 붙인다. 자막은 PNG 로 얹어서 libass 없이도 동작한다."""
from __future__ import annotations

from pathlib import Path

from . import media, render
from .visuals import VIDEO_EXT

TAIL = 0.35  # 장면 끝 여유(초)


def _split_balanced(text: str, limit: int) -> list[str]:
    """글자 수가 비슷한 조각으로 나눈다. 쉼표 뒤를 우선으로 끊고, 한두 단어만 남는 조각은 만들지 않는다."""
    words = text.split()
    n = -(-len(text) // limit)  # 올림
    if n <= 1 or len(words) < 2:
        return [text]
    target = len(text) / n
    pieces, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        cur_len = len(" ".join(cur))
        rest = len(" ".join(words[i + 1:]))
        if len(pieces) == n - 1 or not rest:
            continue
        comma = w.endswith((",", "，"))
        if cur_len >= target or (comma and cur_len >= target * 0.6):
            pieces.append(" ".join(cur))
            cur = []
    if cur:
        pieces.append(" ".join(cur))
    return pieces


def chunk_cues(cues: list[tuple[float, float, str]], fmt: str) -> list[tuple[float, float, str]]:
    """긴 문장은 화면에 보기 좋은 길이로 쪼개고, 시간은 글자 수 비율로 나눈다."""
    limit = 18 if fmt == "shorts" else 30
    out = []
    for start, end, text in sorted(cues):
        pieces = _split_balanced(text.strip(), limit)
        total = sum(len(p) for p in pieces) or 1
        t = start
        for p in pieces:
            d = (end - start) * len(p) / total
            out.append([t, t + d, p])
            t += d
    for a, b in zip(out, out[1:]):  # 자막끼리 겹치지 않게
        a[1] = min(a[1], b[0])
    return [tuple(c) for c in out]


def build_scene(idx: int, bg: Path, voice: Path, cues: list, workdir: Path, fmt: str,
                cfg: dict, fonts: dict) -> tuple[Path, float, list]:
    vcfg = cfg["video"]
    W, H = render.frame_size(fmt)
    fps = int(vcfg.get("fps", 30))
    dur = media.duration(str(voice)) + TAIL
    frames = int(dur * fps) + 1
    out = workdir / "scenes" / f"scene{idx:02d}.mp4"
    out.parent.mkdir(parents=True, exist_ok=True)

    args: list[str] = []
    if bg.suffix.lower() in VIDEO_EXT:
        generated = (workdir / "visuals") in bg.parents  # AI 가 만든 짧은 클립
        if generated:  # 대본보다 짧으면 반복
            args += ["-stream_loop", "-1", "-i", str(bg)]
            tail = ""
        else:  # 화면 녹화 등 내 영상은 반복하지 않고 마지막 장면에서 멈춘다
            args += ["-i", str(bg)]
            tail = f",tpad=stop_mode=clone:stop_duration={dur:.2f}"
        vw, vh = media.video_size(str(bg))
        if render.ratio_differs(vw, vh, (W, H)):
            base = (f"[0:v]split[a][b];[a]scale={W}:{H}:force_original_aspect_ratio=increase,"
                    f"crop={W}:{H},boxblur=30:3,eq=brightness=-0.12[bk];"
                    f"[b]scale={W}:{H}:force_original_aspect_ratio=decrease[fg];"
                    f"[bk][fg]overlay=(W-w)/2:(H-h)/2,fps={fps},setsar=1{tail}[bg]")
        else:
            base = (f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
                    f"fps={fps},setsar=1{tail}[bg]")
    else:
        img = render.prepare_image(bg, workdir / "frames" / f"scene{idx:02d}.jpg", fmt)
        args += ["-loop", "1", "-framerate", str(fps), "-i", str(img)]
        big = f"scale={W * 3 // 2}:{H * 3 // 2}"
        if vcfg.get("ken_burns", True):
            z = f"1+0.08*on/{frames}" if idx % 2 else f"1.08-0.08*on/{frames}"
            base = (f"[0:v]{big},zoompan=z='{z}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
                    f":s={W}x{H}:fps={fps},setsar=1[bg]")
        else:
            base = f"[0:v]fps={fps},setsar=1[bg]"
    args += ["-i", str(voice)]

    chunks = chunk_cues(cues, fmt)
    filters = [base]
    last = "bg"
    if vcfg.get("burn_subtitles", True):
        for j, (a, b, text) in enumerate(chunks):
            png = render.caption_png(workdir / "captions" / f"s{idx:02d}_{j:02d}.png", text, fmt,
                                     fonts["subtitle"], int(vcfg.get("subtitle_size") or 0),
                                     vcfg.get("subtitle_style", "boxed"))
            args += ["-i", str(png)]
            nxt = f"v{j}"
            filters.append(f"[{last}][{j + 2}:v]overlay=0:0:enable='between(t,{a:.3f},{b:.3f})'[{nxt}]")
            last = nxt
    filters.append("[1:a]apad,aresample=48000,aformat=channel_layouts=stereo[aud]")
    args += [
        "-filter_complex", ";".join(filters),
        "-map", f"[{last}]", "-map", "[aud]",
        "-t", f"{dur:.3f}", "-r", str(fps),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
        "-movflags", "+faststart", str(out),
    ]
    media.run(args)
    return out, dur, chunks


def concat(parts: list[Path], out: Path, bgm: str = "", bgm_volume: float = 0.12) -> Path:
    lst = out.parent / "concat.txt"
    lst.write_text("".join(f"file '{p.resolve().as_posix()}'\n" for p in parts), encoding="utf-8")
    joined = out if not bgm else out.with_name("_nobgm.mp4")
    media.run(["-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy",
               "-movflags", "+faststart", str(joined)])
    if bgm:
        media.run(["-i", str(joined), "-stream_loop", "-1", "-i", bgm,
                   "-filter_complex",
                   f"[1:a]volume={bgm_volume}[b];[0:a][b]amix=inputs=2:duration=first:"
                   f"dropout_transition=0,volume=2[a]",
                   "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                   "-movflags", "+faststart", str(out)])
        joined.unlink(missing_ok=True)
    lst.unlink(missing_ok=True)
    return out


def _ts(t: float) -> str:
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def write_srt(entries: list[tuple[float, float, str]], out: Path) -> Path:
    lines = []
    for i, (a, b, text) in enumerate(entries, 1):
        lines += [str(i), f"{_ts(a)} --> {_ts(b)}", text, ""]
    out.write_text("\n".join(lines), encoding="utf-8")
    return out
