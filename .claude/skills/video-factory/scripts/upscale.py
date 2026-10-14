"""업스케일 — 4K/8K (lanczos + 선명하게, H.265). 길면 조각으로 나눠 굽고(중간에 끊겨도 다시 돌리면 이어서) 합친다.
사용: python upscale.py IN.mp4 OUT.mp4 [--to 8k|4k] [--crf 24] [--limit-mb 95] [--chunk 20]
  · 깃허브 파일 한도 100MB → 결과가 --limit-mb 를 넘으면 crf 를 3씩 올려 다시 굽는다(README 에 최종 crf 기록할 것).
  · 맥에서 보이도록 hvc1 태그. 소리는 AAC 192k 로."""
from __future__ import annotations

import argparse
from pathlib import Path

from common import ff, probe


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("out")
    ap.add_argument("--to", default="8k"); ap.add_argument("--crf", type=int, default=24)
    ap.add_argument("--limit-mb", type=float, default=95); ap.add_argument("--chunk", type=float, default=20)
    a = ap.parse_args()
    info = probe(a.src); w, h, dur = info["w"], info["h"], info["duration"]
    long_side = 7680 if a.to.lower() == "8k" else 3840
    s = long_side / max(w, h)
    W, H = int(round(w * s / 2) * 2), int(round(h * s / 2) * 2)
    out = Path(a.out); work = out.parent / (out.stem + "_chunks"); work.mkdir(parents=True, exist_ok=True)
    crf = a.crf
    while True:
        parts, t, k = [], 0.0, 0
        while t < dur - 0.01:
            d = min(a.chunk, dur - t)
            p = work / f"c{crf}_{k:03d}.mp4"
            if not p.exists():
                tmp = p.with_suffix(".tmp.mp4")
                ff(["-ss", f"{t:.3f}", "-i", a.src, "-t", f"{d:.3f}", "-an",
                    "-vf", f"scale={W}:{H}:flags=lanczos,unsharp=5:5:0.6:5:5:0.0", "-c:v", "libx265", "-crf", str(crf),
                    "-preset", "medium", "-tag:v", "hvc1", "-pix_fmt", "yuv420p", "-x265-params", "log-level=error", str(tmp)])
                tmp.rename(p)
            parts.append(p); t += d; k += 1
            print(f"  {W}x{H} crf{crf} 조각 {k} ({t:.0f}/{dur:.0f}s)", flush=True)
        lst = work / f"list_{crf}.txt"; lst.write_text("".join(f"file '{p}'\n" for p in parts))
        audio = ["-i", a.src, "-map", "0:v", "-map", "1:a?", "-c:a", "aac", "-b:a", "192k"] if info["audio"] else []
        ff(["-f", "concat", "-safe", "0", "-i", str(lst), *audio, "-c:v", "copy", "-tag:v", "hvc1", "-movflags", "+faststart", str(out)])
        mb = out.stat().st_size / 1e6
        print(f"  결과 {mb:.1f}MB (crf {crf})", flush=True)
        if mb <= a.limit_mb or crf >= 40:
            break
        crf += 3
    print("DONE", out, f"{W}x{H}", f"crf={crf}", f"{mb:.1f}MB", flush=True)


if __name__ == "__main__":
    main()
