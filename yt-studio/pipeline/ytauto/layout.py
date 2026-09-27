"""세로·가로 영상 위에 얹는 투명 그림들 (머리 제목, 자막, 인물 이름표, 마무리 화면).

쇼츠 안전 영역: 위 10%, 아래 25%, 오른쪽 10% 에는 중요한 글자를 두지 않는다.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from .render import wrap
from .thumbs import _draw_rich, _fit_rich, _rich_lines, _rgb


def size_of(fmt: str) -> tuple[int, int]:
    return (1080, 1920) if fmt == "shorts" else (1920, 1080)


def _f(path: str, pt: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, pt)


def _save(img: Image.Image, out: Path) -> Path:
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)
    return out


def header(out: Path, fmt: str, fonts: dict, label: str, title: str, theme: dict) -> Path:
    """위쪽 고정 제목: 꼬리표 + 인용형 제목(*강조*). 쇼츠 표지로도 보이게.
    어두운 띠는 글자 높이만큼만 깔아서 아래 인물 얼굴을 가리지 않는다."""
    W, H = size_of(fmt)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if fmt == "shorts":
        top, x, max_w, max_pt = int(H * 0.105), 64, int(W * 0.80), 92
    else:
        top, x, max_w, max_pt = 48, 64, int(W * 0.55), 64
    lf = _f(fonts["bold"], 34 if fmt == "shorts" else 28)
    rows = _rich_lines(title, 3) if title else []
    pt = _fit_rich(rows, fonts["bold"], max_w, max_pt) if rows else 0
    content = (lf.size + 36 if label else 0) + int(pt * 1.14) * len(rows)
    band_h = min(H, top + content + (90 if fmt == "shorts" else 60))
    shade = Image.linear_gradient("L").resize((W, band_h)).transpose(Image.FLIP_TOP_BOTTOM)
    shade = shade.point(lambda v: int(v * (0.72 if rows else 0.45)))
    band = Image.new("RGBA", (W, band_h), (6, 8, 14, 255))
    band.putalpha(shade)
    img.alpha_composite(band, (0, 0))
    d = ImageDraw.Draw(img)
    y = top
    if label:
        lw = lf.getlength(label) + 36
        d.rounded_rectangle((x, y, x + lw, y + lf.size + 20), radius=(lf.size + 20) // 2,
                            fill=_rgb(theme["accent"]) + (255,))
        d.text((x + 18, y + 8), label, font=lf, fill=_rgb(theme["c1"]))
        y += lf.size + 36
    if rows:
        tf = _f(fonts["bold"], pt)
        for r in rows:
            _draw_rich(img, x, y, r, tf, (255, 255, 255), _rgb(theme["accent"]), max(2, pt // 30))
            y += int(pt * 1.14)
    return _save(img, out)


def caption_height(text: str, fmt: str, fonts: dict) -> int:
    W, _ = size_of(fmt)
    pt = 64 if fmt == "shorts" else 54
    f = _f(fonts["subtitle"], pt)
    return int(pt * 1.34) * len(wrap(text, f, int(W * (0.84 if fmt == "shorts" else 0.78)))[:3])


def caption(out: Path, text: str, fmt: str, fonts: dict, style: str = "boxed", bottom: int | None = None) -> Path:
    """자막 한 장. 쇼츠는 화면 62~74% 높이(아래 안전 영역 위), 가로는 아래쪽.
    bottom: 자막 아래 끝 y(px) — 얼굴을 피해 옮길 때."""
    W, H = size_of(fmt)
    pt = 64 if fmt == "shorts" else 54
    f = _f(fonts["subtitle"], pt)
    lines = wrap(text, f, int(W * (0.84 if fmt == "shorts" else 0.78)))[:3]
    line_h = int(pt * 1.34)
    if bottom is None:
        bottom = int(H * 0.735) if fmt == "shorts" else H - int(H * 0.08)
    y = bottom - line_h * len(lines)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    asc, desc = f.getmetrics()
    for line in lines:
        tw = f.getlength(line)
        if style == "boxed":
            x0 = (W - tw) / 2 - pt * 0.32
            d.rounded_rectangle((x0, y - pt * 0.12, x0 + tw + pt * 0.64, y + asc + desc + pt * 0.12),
                                radius=int(pt * 0.12), fill=(0, 0, 0, 230))
            d.text((W / 2, y), line, font=f, fill=(255, 255, 255), anchor="ma")
        else:
            d.text((W / 2, y), line, font=f, fill=(255, 255, 255), anchor="ma",
                   stroke_width=max(3, pt // 12), stroke_fill=(0, 0, 0))
        y += line_h
    return _save(img, out)


def person_tag(out: Path, fmt: str, fonts: dict, name: str, role: str = "",
               photo: str = "", xy: tuple[float, float] | None = None) -> Path:
    """인물 이름표: (선택) 동그란 사진 + 손글씨 이름 + 직함."""
    W, H = size_of(fmt)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    x, y = (int(W * xy[0]), int(H * xy[1])) if xy else ((64, int(H * 0.50)) if fmt == "shorts" else (64, int(H * 0.60)))
    d = ImageDraw.Draw(img)
    if photo and Path(photo).exists():
        r = 150 if fmt == "shorts" else 120
        ph = Image.open(photo).convert("RGB")
        s = min(ph.size)
        ph = ph.crop(((ph.width - s) // 2, 0, (ph.width - s) // 2 + s, s)).resize((r, r), Image.LANCZOS)
        m = Image.new("L", (r, r), 0)
        ImageDraw.Draw(m).ellipse((0, 0, r, r), fill=255)
        ring = Image.new("RGBA", (r + 10, r + 10), (0, 0, 0, 0))
        ImageDraw.Draw(ring).ellipse((0, 0, r + 9, r + 9), fill=(255, 255, 255, 235))
        img.alpha_composite(ring, (x - 5, y - 5))
        img.paste(ph, (x, y), m)
        x += r + 24
        y += r // 2 - 44
    hf = _f(fonts["hand"], 64 if fmt == "shorts" else 52)
    d.text((x, y), name, font=hf, fill=(255, 225, 77), stroke_width=4, stroke_fill=(30, 22, 0))
    if role:
        rf = _f(fonts["subtitle"], 32 if fmt == "shorts" else 28)
        d.text((x + 4, y + hf.size + 6), role, font=rf, fill=(255, 255, 255), stroke_width=3,
               stroke_fill=(0, 0, 0))
    return _save(img, out)


def card(out: Path, fmt: str, fonts: dict, text: str, theme: dict, sub: str = "",
         background: str = "") -> Path:
    """꽉 찬 글자 화면 (호명·학기 소개 등). 배경 사진을 주면 어둡게 깔고 그 위에."""
    W, H = size_of(fmt)
    c1, c2 = _rgb(theme["c1"]), _rgb(theme["c2"])
    if background and Path(background).exists():
        from .render import fit_cover
        base = fit_cover(Image.open(background), (W, H)).filter(ImageFilter.GaussianBlur(6))
        base = Image.blend(base, Image.new("RGB", (W, H), c1), 0.6).convert("RGBA")
    else:
        g = Image.linear_gradient("L").resize((W, H))
        base = Image.composite(Image.new("RGB", (W, H), c2), Image.new("RGB", (W, H), c1), g).convert("RGBA")
    rows = _rich_lines(text, 5)
    max_w = int(W * 0.84)
    pt = _fit_rich(rows, fonts["bold"], max_w, 110 if fmt == "shorts" else 96)
    tf = _f(fonts["bold"], pt)
    line_h = int(pt * 1.2)
    sf = _f(fonts["subtitle"], 44 if fmt == "shorts" else 38)
    block = line_h * len(rows) + (sf.size + 40 if sub else 0)
    y = (H * (0.44 if fmt == "shorts" else 0.5)) - block / 2
    for r in rows:
        _draw_rich(base, W / 2, y, r, tf, (255, 255, 255), _rgb(theme["accent"]), max(2, pt // 30), "center")
        y += line_h
    if sub:
        ImageDraw.Draw(base).text((W / 2, y + 30), sub, font=sf, fill=(230, 236, 245), anchor="ma")
    return _save(base.convert("RGB"), out.with_suffix(".jpg"))


def outro(out: Path, fmt: str, fonts: dict, brand: dict, theme: dict, headline: str = "") -> Path:
    """마지막 화면: 모집 안내 + 연락처 (글자로 보이게, 전화·카톡은 설명란에도)."""
    lines = [l for l in brand.get("cta", []) if l]
    head = headline or (lines[0] if lines else "")
    rest = lines[1:] if not headline else lines
    W, H = size_of(fmt)
    p = card(out, fmt, fonts, head, theme, sub="")
    img = Image.open(p).convert("RGBA")
    d = ImageDraw.Draw(img)
    f = _f(fonts["subtitle"], 46 if fmt == "shorts" else 40)
    y = int(H * (0.52 if fmt == "shorts" else 0.60))
    for l in rest:
        d.text((W / 2, y), l, font=f, fill=(255, 255, 255), anchor="ma")
        y += int(f.size * 1.6)
    cf = _f(fonts["bold"], 40 if fmt == "shorts" else 34)
    d.text((W / 2, int(H * (0.14 if fmt == "shorts" else 0.1))), brand.get("channel_name", ""), font=cf,
           fill=_rgb(theme["accent"]), anchor="ma")
    img.convert("RGB").save(p, quality=93)
    return p


def pop_block(fmt: str, fonts: dict, text: str, sub: str, scale: float = 1.0) -> tuple[int, int]:
    """(글자 크기 pt, 덩어리 높이 px) — 얼굴 피해 자리 잡을 때 쓴다."""
    W, H = size_of(fmt)
    rows = _rich_lines(text, 2)
    pt = int(_fit_rich(rows, fonts["title"], int(W * 0.88), 150 if fmt == "shorts" else 120) * scale)
    sub_h = int((52 if fmt == "shorts" else 44) * scale) + 32 if sub else 0
    return pt, int(pt * 1.1) * len(rows) + sub_h


def pop(out_dir: Path, fmt: str, fonts: dict, text: str, sub: str, theme: dict,
        top: int | None = None, scale: float = 1.0, steps=(0.55, 0.8, 1.08, 1.0)) -> list[Path]:
    """외침에 맞춰 튀어나오는 큰 글자 (몇 단계 크기로 '팡' 커지는 효과). 마지막 그림이 기본 상태.
    top: 글자 덩어리 위쪽 y(px). 없으면 화면 60% 높이 가운데."""
    W, H = size_of(fmt)
    rows = _rich_lines(text, 2)
    fit, block = pop_block(fmt, fonts, text, sub, scale)
    if top is None:
        top = int(H * 0.60) - block // 2
    center = top + block / 2
    outs = []
    for k, sc in enumerate(steps):
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        pt = max(20, int(fit * sc))
        tf = _f(fonts["title"], pt)
        sub_h = int((52 if fmt == "shorts" else 44) * scale * sc) + 32 if sub else 0
        h = int(pt * 1.1) * len(rows) + sub_h
        y = int(center - h / 2)
        for r in rows:
            _draw_rich(img, W / 2, y, r, tf, (255, 255, 255), _rgb(theme["accent"]), max(4, pt // 14), "center")
            y += int(pt * 1.1)
        if sub:
            sf = _f(fonts["bold"], max(16, int((52 if fmt == "shorts" else 44) * scale * sc)))
            sw = sf.getlength(sub) + 40
            d = ImageDraw.Draw(img)
            d.rounded_rectangle(((W - sw) / 2, y + 6, (W + sw) / 2, y + 6 + sf.size + 20), radius=12,
                                fill=_rgb(theme["accent"]) + (255,))
            d.text((W / 2, y + 15), sub, font=sf, fill=_rgb(theme["c1"]), anchor="ma")
        outs.append(_save(img, out_dir / f"pop{k}.png"))
    return outs
