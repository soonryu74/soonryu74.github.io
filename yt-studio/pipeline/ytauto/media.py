"""ffmpeg 찾기와 실행. 따로 설치하지 않았으면 imageio-ffmpeg 에 들어 있는 것을 쓴다."""
from __future__ import annotations

import re
import shutil
import subprocess
from functools import lru_cache


@lru_cache(maxsize=1)
def ffmpeg_exe() -> str:
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception as e:  # pragma: no cover
        raise RuntimeError("ffmpeg 를 찾지 못했어요. 'pip install imageio-ffmpeg' 를 실행해 주세요.") from e


def run(args: list[str]) -> None:
    cmd = [ffmpeg_exe(), "-hide_banner", "-loglevel", "error", "-y", *args]
    p = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if p.returncode != 0:
        raise RuntimeError("ffmpeg 실패:\n" + (p.stderr or "")[-1500:])


def duration(path: str) -> float:
    """미디어 길이(초). ffprobe 없이 ffmpeg 출력에서 읽는다."""
    p = subprocess.run([ffmpeg_exe(), "-hide_banner", "-i", str(path)],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", p.stderr)
    if not m:
        raise RuntimeError(f"길이를 읽지 못했어요: {path}")
    h, mnt, s = m.groups()
    return int(h) * 3600 + int(mnt) * 60 + float(s)


def video_size(path: str) -> tuple[int, int]:
    p = subprocess.run([ffmpeg_exe(), "-hide_banner", "-i", str(path)],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = re.search(r"Video:.*?(\d{2,5})x(\d{2,5})", p.stderr)
    if not m:
        raise RuntimeError(f"영상 크기를 읽지 못했어요: {path}")
    return int(m.group(1)), int(m.group(2))
