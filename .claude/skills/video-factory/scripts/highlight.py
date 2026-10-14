"""하이라이트 — 긴 영상에서 고른 구간들을 이어 붙여 쇼츠(9:16) 또는 가로(16:9) 영상으로.
사용: python highlight.py plan.json
plan.json:
{
 "src": "강의.mp4",
 "out": "하이라이트.mp4",
 "aspect": "9:16",                   // 또는 "16:9"
 "layout": "stack",                  // stack = 위 화면(슬라이드) + 아래 화면(사람) / center = 한 영역 크게 / fit = 전체를 넣고 위아래 흐린 배경
 "crops": {"top": [x,y,w,h], "bottom": [x,y,w,h], "center": [x,y,w,h]},   // 원본 픽셀. stack 은 top·bottom, center 는 center
 "top_ratio": 0.3167,                // stack 에서 위 칸 높이 비율(기본 608/1920)
 "snap": true,                       // 구간 끝을 가까운 쉼(무음)에 맞춤 — 말 중간에 잘리는 것 방지
 "cuts": [[시작초, 끝초, "메모"], …]
}
결과: out (crf18) — 구간마다 0.08초 소리 페이드."""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

from common import FPS, ff, load, probe

SNAP_WIN = 0.7


def silences(src: str, t0: float, t1: float) -> list[tuple[float, float]]:
    r = subprocess.run(["ffmpeg", "-hide_banner", "-ss", f"{max(0, t0):.2f}", "-t", f"{t1 - t0:.2f}", "-i", src, "-vn",
                        "-af", "silencedetect=noise=-32dB:d=0.18", "-f", "null", "-"], capture_output=True, text=True).stderr
    st = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", r)]
    en = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", r)]
    return [(max(0, t0) + a, max(0, t0) + b) for a, b in zip(st, en)]


def snap(src: str, s: float, e: float) -> tuple[float, float]:
    """시작은 앞쪽 쉼의 끝(말 시작 직전), 끝은 뒤쪽 쉼의 시작(말 끝난 직후)으로"""
    sil = silences(src, s - SNAP_WIN, e + SNAP_WIN)
    near_s = [b for a, b in sil if abs(b - s) <= SNAP_WIN]
    near_e = [a for a, b in sil if abs(a - e) <= SNAP_WIN]
    s2 = (min(near_s, key=lambda b: abs(b - s)) - 0.06) if near_s else s
    e2 = (min(near_e, key=lambda a: abs(a - e)) + 0.12) if near_e else e
    return round(max(0, s2), 2), round(e2, 2)


def vfilter(pl: dict, W: int, H: int) -> str:
    lay = pl.get("layout", "fit")
    c = pl.get("crops", {})
    if lay == "stack":
        th = int(round(H * pl.get("top_ratio", 608 / 1920) / 2) * 2); bh = H - th
        tx, ty, tw, tH = c["top"]; bx, by, bw, bH = c["bottom"]
        return (f"[0:v]split=2[a][b];[a]crop={tw}:{tH}:{tx}:{ty},scale={W}:{th}:force_original_aspect_ratio=increase,crop={W}:{th}[t];"
                f"[b]crop={bw}:{bH}:{bx}:{by},scale={W}:{bh}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{bh},unsharp=5:5:0.4[u];"
                f"[t][u]vstack=inputs=2,fps={FPS},setsar=1,format=yuv420p[v]")
    if lay == "center":
        x, y, w, h = c["center"]
        return (f"[0:v]crop={w}:{h}:{x}:{y},scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H},"
                f"unsharp=5:5:0.3,fps={FPS},setsar=1,format=yuv420p[v]")
    # fit: 전체 화면을 넣고 남는 곳은 같은 화면을 흐리게 깔기
    return (f"[0:v]split=2[a][b];[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=30:2,eq=brightness=-0.12[bg];"
            f"[b]scale={W}:{H}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,fps={FPS},setsar=1,format=yuv420p[v]")


def main(plan_path: str) -> Path:
    pl = load(plan_path)
    root = Path(plan_path).resolve().parent
    P = lambda p: str((root / p).resolve()) if not Path(p).is_absolute() else p  # noqa: E731
    src, out = P(pl["src"]), Path(P(pl["out"]))
    W, H = (1080, 1920) if pl.get("aspect", "9:16") == "9:16" else (1920, 1080)
    has_audio = probe(src)["audio"]
    work = out.parent / (out.stem + "_parts"); work.mkdir(parents=True, exist_ok=True)
    vf = vfilter(pl, W, H)
    parts, total = [], 0.0
    for i, c in enumerate(pl["cuts"]):
        s, e = float(c[0]), float(c[1])
        if pl.get("snap", True) and has_audio:
            s, e = snap(src, s, e)
        d = e - s; total += d
        p = work / f"p{i:02d}.mp4"
        fil = vf + (f";[0:a]aresample=48000,afade=t=in:d=0.08,afade=t=out:st={d - 0.1:.2f}:d=0.1[a]" if has_audio else "")
        maps = ["-map", "[v]"] + (["-map", "[a]"] if has_audio else [])
        ff(["-ss", f"{s:.2f}", "-i", src, "-t", f"{d:.2f}", "-filter_complex", fil, *maps,
            "-c:v", "libx264", "-crf", "18", "-preset", "fast", "-c:a", "aac", "-b:a", "192k", str(p)])
        parts.append(p)
        print(f"p{i:02d} {s:8.2f}-{e:8.2f} ({d:5.1f}s) {c[2] if len(c) > 2 else ''}", flush=True)
    lst = work / "list.txt"; lst.write_text("".join(f"file '{p}'\n" for p in parts))
    ff(["-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", "-movflags", "+faststart", str(out)])
    print("DONE", out, f"{total:.1f}s", flush=True)
    return out


if __name__ == "__main__":
    main(sys.argv[1])
