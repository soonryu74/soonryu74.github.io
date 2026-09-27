"""글꼴 고르기. 역할별로 다른 글꼴을 쓴다 (모두 무료·상업적 이용 가능 OFL).

  title    : 썸네일·장면 핵심어 — 블랙한산스(Black Han Sans). 굵고 꽉 찬 제목체
  subtitle : 영상 자막 — 프리텐다드 SemiBold. 방송 자막처럼 또렷한 본문체
  bold     : 기타 강조 — 프리텐다드 Black

처음 한 번 pipeline/fonts/ 에 내려받고, 받을 수 없으면 컴퓨터에 있는 한글 글꼴을 쓴다.
"""
from __future__ import annotations

from pathlib import Path

import requests

from .config import HERE

FONT_DIR = HERE / "fonts"

DOWNLOADS = {
    "title": ("BlackHanSans-Regular.ttf", [
        "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/blackhansans/BlackHanSans-Regular.ttf",
        "https://github.com/google/fonts/raw/main/ofl/blackhansans/BlackHanSans-Regular.ttf",
    ]),
    "subtitle": ("Pretendard-SemiBold.otf", [
        "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-SemiBold.otf",
        "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/public/static/Pretendard-SemiBold.otf",
    ]),
    "bold": ("Pretendard-Black.otf", [
        "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-Black.otf",
        "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/public/static/Pretendard-Black.otf",
    ]),
}

SYSTEM = [
    # Windows
    "C:/Windows/Fonts/malgunbd.ttf",
    "C:/Windows/Fonts/malgun.ttf",
    # macOS
    "/System/Library/Fonts/AppleSDGothicNeo.ttc",
    "/Library/Fonts/NanumGothicBold.ttf",
    "/System/Library/Fonts/Supplemental/AppleGothic.ttf",
    # Linux
    "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/noto-cjk/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
]


def _download(role: str) -> str | None:
    name, urls = DOWNLOADS[role]
    target = FONT_DIR / name
    if target.exists() and target.stat().st_size > 10000:
        return str(target)
    FONT_DIR.mkdir(parents=True, exist_ok=True)
    for url in urls:
        try:
            r = requests.get(url, timeout=60)
            if r.status_code == 200 and len(r.content) > 10000:
                target.write_bytes(r.content)
                print(f"  글꼴 준비: {name}")
                return str(target)
        except requests.RequestException:
            continue
    return None


def find_font(role: str = "subtitle", preferred: str = "") -> str:
    """role: title | subtitle | bold. preferred 에 경로를 주면 그 글꼴을 먼저 쓴다."""
    if preferred and Path(preferred).expanduser().exists():
        return str(Path(preferred).expanduser())
    got = _download(role if role in DOWNLOADS else "subtitle")
    if got:
        return got
    for p in SYSTEM:
        if Path(p).exists():
            return p
    raise RuntimeError("한글 글꼴을 찾지 못했어요. config.json 의 fonts 항목에 글꼴 파일 경로를 적어 주세요.")


def font_set(cfg: dict) -> dict:
    f = cfg.get("fonts", {})
    legacy = cfg.get("video", {}).get("font_path", "")
    return {
        "title": find_font("title", f.get("title", "")),
        "subtitle": find_font("subtitle", f.get("subtitle", "") or legacy),
        "bold": find_font("bold", f.get("bold", "")),
    }
