"""여행 일지형 썸네일 (1280×720) — 비전트립처럼 '며칠째' 이어지는 시리즈용.

  왼쪽: 시리즈 꼬리표 · 큰 DAY 번호 · 그날 장소(큰 글씨) · 한 줄 설명(손글씨) · 여정 진행 점
  오른쪽: 기울어진 폴라로이드 사진 1~2장 (작은 사진은 큰 사진 속 얼굴을 가리지 않는 모서리에)
  배경: 큰 사진을 흐리게 깔고 어둡게

사진이 작아도(유튜브 장면 480px) 폴라로이드 크기라 흐려 보이지 않는다.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

from .render import fit_cover
from .thumbs import _face_boxes, _rgb, parse_rich

W, H = 1280, 720
INK = (14, 14, 20)


def _f(path: str, pt: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, pt)


def _load(p) -> Image.Image:
    im = Image.open(p).convert("RGB")
    if im.size == (480, 360):  # 유튜브 hq 장면: 위아래 검은 띠 잘라내기
        im = im.crop((0, 45, 480, 315))
    return im


def _polaroid(photo: Image.Image, w: int, rot: float) -> tuple[Image.Image, Image.Image]:
    """흰 테두리 사진 + 그림자. (카드, 회전 전 사진) 반환."""
    h = int(w * 9 / 16)
    ph = fit_cover(photo, (w, h))
    ph = ImageEnhance.Sharpness(ph).enhance(1.6)
    ph = ImageEnhance.Contrast(ph).enhance(1.05)
    pad, bottom = int(w * 0.035), int(w * 0.075)
    card = Image.new("RGBA", (w + pad * 2, h + pad + bottom), (250, 248, 242, 255))
    card.paste(ph, (pad, pad))
    card = card.rotate(rot, expand=True, resample=Image.BICUBIC)
    sh = Image.new("RGBA", card.size, (0, 0, 0, 255))
    sh.putalpha(card.split()[3].filter(ImageFilter.GaussianBlur(16)).point(lambda v: int(v * 0.55)))
    out = Image.new("RGBA", (card.width + 30, card.height + 30), (0, 0, 0, 0))
    out.alpha_composite(sh, (18, 22))
    out.alpha_composite(card, (0, 0))
    return out, ph


def _text(d, xy, text, f, fill, sw=8, stroke=INK):
    d.text(xy, text, font=f, fill=fill, stroke_width=sw, stroke_fill=stroke)


def paper_gradient(size: tuple[int, int], c1: str = "#0A1A33", c2: str = "#2B5C97", grain: int = 14) -> Image.Image:
    """종이 질감이 있는 대각선 그라데이션 (왼쪽 위 짙은 남색 → 오른쪽 아래 밝은 파랑).
    비전트립 확정 배경(2026-09-30): 흐린 사진 대신 이 파랑 판을 깐다."""
    import numpy as np
    w, h = size
    a, b = np.array(_rgb(c1), float), np.array(_rgb(c2), float)
    yy, xx = np.mgrid[0:h, 0:w]
    t = np.clip(0.7 * xx / max(w - 1, 1) + 0.3 * (1 - yy / max(h - 1, 1)) * 0.6 + 0.2 * yy / max(h - 1, 1), 0, 1)
    t = t ** 1.1
    img = a[None, None, :] * (1 - t[..., None]) + b[None, None, :] * t[..., None]
    rng = np.random.default_rng(7)
    noise = rng.normal(0, grain, (h, w, 1))  # 거친 종이 알갱이
    blotch = np.asarray(Image.fromarray(rng.integers(0, 255, (h // 90, w // 90), dtype=np.uint8), "L")
                        .resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(30)), float)[..., None]
    img = img + noise + (blotch - 128) * 0.10
    # 왼쪽 아래를 조금 더 어둡게 (예시처럼 아래로 갈수록 짙은 남색)
    img = img * (1 - 0.28 * (yy / max(h - 1, 1))[..., None] ** 2 * (1 - xx / max(w - 1, 1))[..., None])
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGB")


def diary_thumbnail(out: Path, day: int, total: int, places: str, fonts: dict, photo, photo2=None,
                    series_label: str = "2026 비전트립", sub_label: str = "튀르키예 & 그리스", kicker: str = "",
                    accent: str = "#FFD400", bg: tuple[str, str] | None = ("#0A1A33", "#2B5C97")) -> Path:
    """bg=(c1, c2) 이면 종이 질감 파랑 그라데이션 배경, None 이면 예전처럼 큰 사진을 흐리게 깐다."""
    ac = _rgb(accent)
    main = _load(photo)
    if bg:
        base = paper_gradient((W, H), *bg).convert("RGBA")
    else:
        base = fit_cover(main, (W, H)).filter(ImageFilter.GaussianBlur(22)).convert("RGBA")
        base = Image.blend(base, Image.new("RGBA", (W, H), (12, 16, 28, 255)), 0.52)
        g = Image.linear_gradient("L").rotate(90).resize((W, H)).point(lambda v: int((255 - v) * 0.55))
        dark = Image.new("RGBA", (W, H), (6, 8, 16, 255))
        dark.putalpha(g)  # 왼쪽 더 어둡게 (글자 자리)
        base.alpha_composite(dark)

    # 오른쪽 큰 폴라로이드
    card, ph = _polaroid(main, 640, -3.5)
    cx, cy = W - card.width - 18, 40
    base.alpha_composite(card, (cx, cy))
    # 작은 폴라로이드: 글자 쪽(왼쪽)은 피하고, 큰 사진 속 얼굴을 덮지 않는 자리에
    if photo2:
        fb = _face_boxes(ph)
        s2, _ = _polaroid(_load(photo2), 300, 6)
        pad = int(640 * 0.035)
        mx, my = cx + pad, cy + pad  # 큰 사진의 화면 좌표 시작점
        pw, phh = ph.size
        spots = [(W - s2.width - 4, cy + card.height - int(s2.height * 0.52)),
                 (640, cy + card.height - int(s2.height * 0.48)),
                 (W - s2.width - 4, H - s2.height + 6)]
        for x, y in spots:
            a, b = x - mx, y - my  # 큰 사진 좌표로
            c, e = a + s2.width, b + s2.height
            if not any(not (f[2] < a or f[0] > c or f[3] < b or f[1] > e) for f in fb):
                base.alpha_composite(s2, (int(x), int(min(y, H - s2.height + 6))))
                break

    d = ImageDraw.Draw(base)
    x0 = 56
    # 시리즈 꼬리표
    lf = _f(fonts["bold"], 34)
    tag = f"{series_label}  ·  {sub_label}" if sub_label else series_label
    tw = int(lf.getlength(tag)) + 44
    d.rounded_rectangle((x0, 48, x0 + tw, 104), 28, fill=(255, 255, 255, 235))
    d.text((x0 + 22, 76), tag, font=lf, fill=INK, anchor="lm")
    # DAY 번호
    df = _f(fonts["title"], 190)
    _text(d, (x0 - 4, 118), "DAY", _f(fonts["title"], 70), (255, 255, 255), 6)
    _text(d, (x0 + 150, 72), str(day), df, ac, 12)
    # 장소 (최대 3줄, 폭에 맞춰)
    rows = [r for r in places.replace("\\n", "\n").split("\n") if r.strip()][:3]
    pt = 104 if len(rows) == 1 else (88 if len(rows) == 2 else 72)
    maxw = 560
    pf = _f(fonts["title"], pt)
    while pt > 44 and max(pf.getlength(r.replace("*", "")) for r in rows) > maxw:
        pt -= 4
        pf = _f(fonts["title"], pt)
    y = 330 if len(rows) < 3 else 300
    for r in rows:
        x = x0
        for t, hi in parse_rich(r):
            _text(d, (x, y), t, pf, ac if hi else (255, 255, 255), max(6, pt // 12))
            x += pf.getlength(t)
        y += int(pt * 1.12)
    # 손글씨 한 줄
    if kicker:
        hf = _f(fonts["hand"], 62)
        layer = Image.new("RGBA", (W, 110), (0, 0, 0, 0))
        ImageDraw.Draw(layer).text((x0 + 4, 20), kicker, font=hf, fill=ac + (255,), stroke_width=5, stroke_fill=INK)
        base.alpha_composite(layer.rotate(2, resample=Image.BICUBIC), (0, min(y - 4, 548)))
    # 여정 진행 점
    dy, r, gap = 684, 9, 30
    for i in range(1, total + 1):
        xx = x0 + 10 + (i - 1) * gap
        if i == day:
            d.ellipse((xx - r - 5, dy - r - 5, xx + r + 5, dy + r + 5), fill=ac, outline=INK, width=3)
        else:
            d.ellipse((xx - r, dy - r, xx + r, dy + r), fill=(255, 255, 255, 230 if i < day else 90))
    d.text((x0 + 10 + total * gap, dy), f"{day}/{total}일", font=_f(fonts["bold"], 28), fill=(255, 255, 255),
           anchor="lm")
    out.parent.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(out, quality=93)
    return out
