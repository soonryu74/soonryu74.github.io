"""얼굴 위치 찾기 → 글자가 얼굴을 가리지 않게.

OpenCV 의 YuNet 얼굴 검출기(230KB)를 처음 한 번 내려받아 쓴다. (pip install opencv-python-headless)
검출기를 쓸 수 없으면 빈 목록을 돌려주고, 글자는 기본 위치에 놓인다.
"""
from __future__ import annotations

import subprocess
from functools import lru_cache
from pathlib import Path

import requests

from . import media
from .config import HERE

MODEL = HERE / "models" / "face_detection_yunet_2023mar.onnx"
URLS = [
    "https://huggingface.co/opencv/face_detection_yunet/resolve/main/face_detection_yunet_2023mar.onnx",
    "https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
]
SCAN_W = 540  # 이 너비로 줄여서 찾는다 (빠르게)


def _model() -> Path | None:
    if MODEL.exists() and MODEL.stat().st_size > 100_000:
        return MODEL
    MODEL.parent.mkdir(parents=True, exist_ok=True)
    for u in URLS:
        try:
            r = requests.get(u, timeout=60)
            if r.status_code == 200 and len(r.content) > 100_000:
                MODEL.write_bytes(r.content)
                return MODEL
        except requests.RequestException:
            continue
    return None


@lru_cache(maxsize=1)
def _detector(w: int, h: int):
    try:
        import cv2
    except ImportError:
        print("  ! 얼굴 찾기를 건너뜁니다: pip install opencv-python-headless")
        return None
    m = _model()
    if not m:
        print("  ! 얼굴 찾기 모델을 받지 못했어요. 글자를 기본 위치에 둡니다.")
        return None
    return cv2.FaceDetectorYN.create(str(m), "", (w, h), 0.6, 0.3, 50)


def frames(video: str, times: list[float]):
    """지정 시각의 화면을 numpy 배열(BGR, SCAN_W 너비)로."""
    import numpy as np
    vw, vh = media.video_size(video)
    sw, sh = SCAN_W, int(round(vh * SCAN_W / vw / 2) * 2)
    for t in times:
        p = subprocess.run([media.ffmpeg_exe(), "-loglevel", "error", "-ss", f"{max(0, t):.3f}", "-i", video,
                            "-frames:v", "1", "-vf", f"scale={sw}:{sh}", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"],
                           capture_output=True)
        if len(p.stdout) == sw * sh * 3:
            yield t, np.frombuffer(p.stdout, dtype=np.uint8).reshape(sh, sw, 3), (vw / sw)


def boxes(video: str, t0: float, t1: float, step: float = 0.25) -> list[tuple[int, int, int, int]]:
    """t0~t1 사이 얼굴 상자 [(x1, y1, x2, y2)] (원본 영상 좌표). 머리카락·턱·목까지 넉넉히 넓힌다."""
    return [b for _, bs in timeline(video, t0, t1, step) for b in bs]


def timeline(video: str, t0: float, t1: float, step: float = 0.25):
    """[(시각, [얼굴 상자…])] — 시간에 따라 얼굴이 어디 있는지."""
    times, t = [], t0
    while t <= t1 + 1e-6:
        times.append(t)
        t += step
    res = []
    for tt, img, scale in frames(video, times):
        det = _detector(img.shape[1], img.shape[0])
        if det is None:
            return []
        _, found = det.detect(img)
        bs = []
        for f in (found if found is not None else []):
            x, y, w, h = [float(v) for v in f[:4]]
            bs.append((int((x - 0.15 * w) * scale), int((y - 0.35 * h) * scale),
                       int((x + 1.15 * w) * scale), int((y + 1.30 * h) * scale)))
        res.append((tt, bs))
    return res


def hits(box, text_box) -> bool:
    return not (box[2] <= text_box[0] or box[0] >= text_box[2] or box[3] <= text_box[1] or box[1] >= text_box[3])


def union(bxs):
    if not bxs:
        return None
    return (min(b[0] for b in bxs), min(b[1] for b in bxs), max(b[2] for b in bxs), max(b[3] for b in bxs))


def place(face_boxes, H: int, block_h: int, default_top: int, lo: int, hi: int) -> tuple[int, float]:
    """글자 덩어리(높이 block_h)의 위쪽 y 와 크기 비율을 고른다.
    lo~hi 는 글자를 둘 수 있는 세로 범위(위 제목 아래 ~ 아래 안전 영역 위).
    1) 기본 위치가 얼굴과 안 겹치면 그대로  2) 얼굴 아래  3) 얼굴 위  4) 글자를 줄여서 다시  5) 가장 덜 겹치는 곳"""
    if not face_boxes:
        return default_top, 1.0
    fy1 = min(b[1] for b in face_boxes)
    fy2 = max(b[3] for b in face_boxes)

    pad = 24  # 글자 테두리·그림자가 상자보다 조금 넓게 그려지므로 여유

    def overlap(top, bh):
        return max(0, min(top + bh + pad, fy2) - max(top - pad, fy1))

    for scale in (1.0, 0.82, 0.68):
        bh = int(block_h * scale)
        if overlap(default_top, bh) == 0 and lo <= default_top and default_top + bh <= hi:
            return default_top, scale
        below = fy2 + pad + 12
        if below + bh <= hi:
            return below, scale
        above = fy1 - pad - 12 - bh
        if above >= lo:
            return above, scale
    bh = int(block_h * 0.68)
    best = min(range(lo, max(lo + 1, hi - bh), 12), key=lambda top: (overlap(top, bh), abs(top - default_top)))
    return best, 0.68


def clear_spans(video: str, box: tuple, t0: float, t1: float, step: float = 0.2, pad: int = 16) -> list[tuple[float, float]]:
    """box 자리에 얼굴이 없는 시간 구간들. 얼굴이 다가오면 그 자리 글자를 잠깐 내리는 데 쓴다."""
    bx = (box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad)
    spans, start = [], None
    tl = timeline(video, t0, t1, step)
    if not tl or _detector(10, 10) is None:
        return [(t0, t1)]
    for t, bs in tl:
        # 실제 얼굴(넓히기 전)만 기준: 넓힌 상자에서 머리·목 여유를 되돌린다
        real = [(b[0], b[1] + int((b[3] - b[1]) * 0.35 / 1.65), b[2], b[3] - int((b[3] - b[1]) * 0.30 / 1.65)) for b in bs]
        blocked = any(hits(r, bx) for r in real)
        if not blocked and start is None:
            start = t
        elif blocked and start is not None:
            spans.append((start, max(start, t - step / 2)))
            start = None
    if start is not None:
        spans.append((start, t1))
    return [(a, b) for a, b in spans if b - a > 0.15]
