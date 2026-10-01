"""그림 만들기: 장면 카드, 자막 PNG, 썸네일. Pillow 만 쓴다."""
from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

PALETTES = [  # 차분하고 믿음 가는 색 (낚시성 원색 배제)
    ((18, 58, 107), (14, 138, 107)),
    ((33, 37, 41), (73, 80, 87)),
    ((44, 62, 80), (52, 152, 219)),
    ((60, 40, 90), (120, 80, 160)),
    ((22, 78, 99), (38, 166, 154)),
    ((90, 50, 30), (200, 120, 60)),
]


def frame_size(fmt: str) -> tuple[int, int]:
    return (1080, 1920) if fmt == "shorts" else (1920, 1080)


def _font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def wrap(text: str, font: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    lines: list[str] = []
    for para in text.split("\n"):
        cur = ""
        for word in para.split(" "):
            trial = (cur + " " + word).strip()
            if font.getlength(trial) <= max_w:
                cur = trial
                continue
            if cur:
                lines.append(cur)
            cur = ""
            for ch in word:  # 한 단어가 너무 길면 글자 단위로 자른다
                if font.getlength(cur + ch) > max_w and cur:
                    lines.append(cur)
                    cur = ""
                cur += ch
        lines.append(cur)
    return [l for l in lines if l.strip()] or [""]


def _gradient(size: tuple[int, int], c1, c2) -> Image.Image:
    w, h = size
    top = Image.new("RGB", (1, 2))
    top.putpixel((0, 0), c1)
    top.putpixel((0, 1), c2)
    return top.resize((w, h), Image.BILINEAR)


def fit_cover(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    w, h = size
    scale = max(w / img.width, h / img.height)
    img = img.convert("RGB").resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    left, top = (img.width - w) // 2, (img.height - h) // 2
    return img.crop((left, top, left + w, top + h))


def ratio_differs(w: int, h: int, size: tuple[int, int], tol: float = 0.2) -> bool:
    return abs((w / h) / (size[0] / size[1]) - 1) > tol


def fit_blur(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    """비율이 다른 그림(예: 가로 화면 녹화 캡처 → 세로 쇼츠)을 잘라내지 않고 흐린 배경 위에 통째로 놓는다."""
    back = fit_cover(img, size).filter(ImageFilter.GaussianBlur(40))
    back = Image.blend(back, Image.new("RGB", size, (0, 0, 0)), 0.35)
    scale = min(size[0] / img.width, size[1] / img.height)
    front = img.convert("RGB").resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    back.paste(front, ((size[0] - front.width) // 2, (size[1] - front.height) // 2))
    return back


def prepare_image(src: Path, out: Path, fmt: str) -> Path:
    """장면 그림을 영상 크기에 맞춘다. 비율이 비슷하면 꽉 채우고, 많이 다르면 흐린 배경 방식."""
    size = frame_size(fmt)
    img = Image.open(src)
    img = fit_blur(img, size) if ratio_differs(img.width, img.height, size) else fit_cover(img, size)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, quality=94)
    return out


def scene_card(out: Path, fmt: str, fonts: dict, keyword: str, idx: int, total: int,
               channel: str = "") -> Path:
    """AI 이미지 없이도 쓸 수 있는 깔끔한 장면 배경. 핵심어는 제목체(블랙한산스)로."""
    size = frame_size(fmt)
    seed = int(hashlib.md5((keyword or str(idx)).encode()).hexdigest(), 16)
    c1, c2 = PALETTES[seed % len(PALETTES)]
    img = _gradient(size, c1, c2).convert("RGBA")
    w, h = size
    deco = Image.new("RGBA", size, (0, 0, 0, 0))  # 은은한 원 장식
    dd = ImageDraw.Draw(deco)
    for i in range(3):
        r = int(min(w, h) * (0.25 + 0.15 * i))
        cx, cy = int(w * (0.85 - 0.1 * i)), int(h * (0.2 + 0.1 * i))
        dd.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(255, 255, 255, 45), width=3)
    img = Image.alpha_composite(img, deco).convert("RGB")
    d = ImageDraw.Draw(img)
    if keyword:
        size_pt = int(min(w, h) * 0.14)
        f = _font(fonts["title"], size_pt)
        lines = wrap(keyword, f, int(w * 0.8))
        line_h = int(size_pt * 1.2)
        y = (h * (0.38 if fmt == "shorts" else 0.40)) - line_h * len(lines) / 2
        for line in lines:
            d.text((w / 2, y), line, font=f, fill=(255, 255, 255), anchor="ma",
                   stroke_width=max(3, size_pt // 25), stroke_fill=(0, 0, 0))
            y += line_h
    small = _font(fonts["subtitle"], int(min(w, h) * 0.03))
    d.text((int(w * 0.04), int(h * 0.05)), f"{idx}/{total}", font=small, fill=(230, 236, 245))
    if channel:
        d.text((int(w * 0.96), int(h * 0.05)), channel, font=small, fill=(230, 236, 245), anchor="ra")
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, quality=92)
    return out


def _hex(c) -> tuple:
    if isinstance(c, (list, tuple)):
        return tuple(c)
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def caption_png(out: Path, text: str, fmt: str, font_path: str, size_pt: int = 0,
                style: str = "boxed") -> Path:
    """투명 배경 위 자막 한 장. ffmpeg overlay 로 영상에 얹는다.

    style: boxed   — 줄마다 검은 상자 + 흰 글씨 (방송·강의 자막 느낌, 기본)
           outline — 상자 없이 흰 글씨 + 두꺼운 검은 테두리
           box     — 반투명 둥근 상자 하나
    """
    w, h = frame_size(fmt)
    size_pt = size_pt or (66 if fmt == "shorts" else 56)
    f = _font(font_path, size_pt)
    lines = wrap(text, f, int(w * (0.86 if fmt == "shorts" else 0.8)))
    line_h = int(size_pt * (1.32 if style == "boxed" else 1.35))
    pad_x, pad_y = int(size_pt * 0.32), int(size_pt * 0.12)
    block_h = line_h * len(lines)
    base_y = int(h * 0.68) if fmt == "shorts" else h - block_h - int(h * 0.07)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if style == "box":
        pad = int(size_pt * 0.45)
        box_w = int(max(f.getlength(l) for l in lines)) + pad * 3
        x0 = (w - box_w) // 2
        d.rounded_rectangle((x0, base_y - pad, x0 + box_w, base_y + block_h + pad),
                            radius=int(size_pt * 0.35), fill=(0, 0, 0, 170))
    y = base_y
    for line in lines:
        tw = f.getlength(line)
        if style == "boxed":
            x0 = (w - tw) / 2 - pad_x
            asc, desc = f.getmetrics()
            d.rounded_rectangle((x0, y - pad_y, x0 + tw + pad_x * 2, y + asc + desc + pad_y),
                                radius=int(size_pt * 0.12), fill=(0, 0, 0, 235))
            d.text((w / 2, y), line, font=f, fill=(255, 255, 255), anchor="ma")
        else:
            stroke = max(3, size_pt // 12) if style == "outline" else 2
            d.text((w / 2, y), line, font=f, fill=(255, 255, 255), anchor="ma",
                   stroke_width=stroke, stroke_fill=(0, 0, 0))
        y += line_h
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)
    return out
