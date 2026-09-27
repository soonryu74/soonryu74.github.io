"""썸네일 만들기 — '메인 내용이 보이는' 썸네일.

요즘 잘 눌리는 썸네일의 공통점:
  1) 메인 대상(얼굴·결과 화면·핵심 물건)이 가려지지 않고 크게 보인다
  2) 글자는 2~3줄, 한쪽 색 패널 위에만 — 대상을 덮지 않는다
  3) 영상마다 색이 바뀌어 목록에서 서로 구분되지만, 배치는 같아서 '내 채널'로 알아본다
  4) 위에 작은 꼬리표(시리즈·분야), 아래에 보조 문구 한 줄

레이아웃
  split  : 왼쪽 색 패널 + 글자, 오른쪽 메인 화면(스크린샷·AI 이미지) + 인물   ← 기본
  impact : 메인 화면을 꽉 채우고 인물 + 초록·노랑·흰색 굵은 글자 (강한 버전)
  series : 단색 그라데이션 배경 + 오른쪽 인물 + 왼쪽 제목 (설교·강의 시리즈형)
"""
from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from .render import fit_cover

W, H = 1280, 720

# 영상마다 돌아가며 쓰는 시리즈 색 (배경 진한색, 밝은색, 강조 글자색)
THEMES = [
    {"name": "보라", "c1": "#3A1C71", "c2": "#8E44AD", "accent": "#FFE14D"},
    {"name": "초록", "c1": "#0B4D2C", "c2": "#1E9E5A", "accent": "#FFF36B"},
    {"name": "남색", "c1": "#0B1F4B", "c2": "#1F5FBF", "accent": "#5CF2C8"},
    {"name": "주황", "c1": "#7A2E05", "c2": "#E8781A", "accent": "#FFFFFF"},
    {"name": "청록", "c1": "#073B4C", "c2": "#118AB2", "accent": "#FFD166"},
    {"name": "와인", "c1": "#4A0E1E", "c2": "#B0243F", "accent": "#FFE3A3"},
    {"name": "먹색", "c1": "#111111", "c2": "#3A3A3A", "accent": "#3CE63C"},
]


def _rgb(c: str) -> tuple:
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def _font(path: str, pt: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, pt)


def theme_for(key: str, offset: int = 0, fixed: str = "") -> dict:
    if fixed:
        for t in THEMES:
            if t["name"] == fixed:
                return t
    i = int(hashlib.md5(key.encode()).hexdigest(), 16) % len(THEMES)
    return THEMES[(i + offset) % len(THEMES)]


def _diag_gradient(size, c1, c2) -> Image.Image:
    """왼쪽 위(진한색) → 오른쪽 아래(밝은색) 부드러운 그라데이션."""
    w, h = size
    horiz = Image.linear_gradient("L").rotate(90).resize((w, h))
    vert = Image.linear_gradient("L").resize((w, h))
    mask = Image.blend(horiz, vert, 0.35)
    return Image.composite(Image.new("RGB", size, c2), Image.new("RGB", size, c1), mask)


def _card(img: Image.Image, box_w: int, box_h: int) -> Image.Image:
    """메인 화면을 둥근 모서리 + 그림자 카드로."""
    shot = fit_cover(img, (box_w, box_h)).convert("RGBA")
    m = Image.new("L", (box_w, box_h), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, box_w, box_h), radius=24, fill=255)
    shot.putalpha(m)
    pad = 40
    out = Image.new("RGBA", (box_w + pad * 2, box_h + pad * 2), (0, 0, 0, 0))
    sh = Image.new("RGBA", out.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((pad + 8, pad + 14, pad + box_w + 8, pad + box_h + 14),
                                         radius=24, fill=(0, 0, 0, 150))
    out.alpha_composite(sh.filter(ImageFilter.GaussianBlur(16)))
    ImageDraw.Draw(out).rounded_rectangle((pad - 5, pad - 5, pad + box_w + 5, pad + box_h + 5),
                                          radius=28, fill=(255, 255, 255, 255))
    out.alpha_composite(shot, (pad, pad))
    return out


def _cutout(path: str) -> Image.Image | None:
    """인물 사진. 배경이 투명한 PNG 가 가장 좋다. rembg 가 깔려 있으면 배경을 자동으로 지운다."""
    if not path or not Path(path).expanduser().exists():
        return None
    img = Image.open(Path(path).expanduser()).convert("RGBA")
    if img.getextrema()[3][0] == 255:  # 투명한 부분이 없음
        try:
            from rembg import remove  # 선택 설치: pip install rembg
            img = remove(img)
        except Exception:
            pass
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


def _shadowed_text(base: Image.Image, xy, text, f, fill, stroke=0, stroke_fill=(0, 0, 0), shadow=True,
                   anchor="la"):
    if shadow:
        sh = Image.new("RGBA", base.size, (0, 0, 0, 0))
        off = max(3, f.size // 28)
        ImageDraw.Draw(sh).text((xy[0] + off, xy[1] + off * 1.5), text, font=f, fill=(0, 0, 0, 170),
                                stroke_width=stroke, stroke_fill=(0, 0, 0, 170), anchor=anchor)
        base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(off)))
    ImageDraw.Draw(base).text(xy, text, font=f, fill=fill, stroke_width=stroke,
                              stroke_fill=stroke_fill, anchor=anchor)


def _fit_pt(lines, font_path, max_w, max_pt, min_pt=44) -> int:
    pt = max_pt
    while pt > min_pt and max(_font(font_path, pt).getlength(l) for l in lines) > max_w:
        pt -= 4
    return pt


def _lines(text: str) -> list[str]:
    text = text.replace("*", "")
    ls = [l.strip() for l in text.replace("\\n", "\n").split("\n") if l.strip()]
    return ls[:3] or [text]


def _text_block(base, lines, fonts, x, max_w, theme, label="", sub="", style="split",
                y_center=360, align="left"):
    """꼬리표 + 제목 2~3줄 + 보조 문구. 제목은 블랙한산스."""
    tf = fonts["title"]
    max_pt = {1: 150, 2: 128, 3: 108}[len(lines)]
    pt = _fit_pt(lines, tf, max_w, max_pt)
    f = _font(tf, pt)
    lf = _font(fonts["bold"], 30)
    sf = _font(fonts["subtitle"], 30)
    line_h = int(pt * 1.12)
    block = line_h * len(lines) + (58 if label else 0) + (50 if sub else 0)
    y = max(30, y_center - block / 2)
    anchor = "ra" if align == "right" else "la"
    d = ImageDraw.Draw(base)
    if label:
        lw = lf.getlength(label) + 32
        lx = x - lw if align == "right" else x
        d.rounded_rectangle((lx, y, lx + lw, y + 44), radius=22,
                            fill=(255, 255, 255, 235) if style != "impact" else _rgb(theme["accent"]))
        d.text((lx + 16, y + 6), label, font=lf, fill=_rgb(theme["c1"]) if style != "impact" else (0, 0, 0))
        y += 58
    for i, line in enumerate(lines):
        if style == "impact":
            palette = ["#3CE63C", "#FFE600", "#FFFFFF"]
            fill = _rgb(palette[i % 3])
            stroke = max(6, pt // 13)
        else:  # 마지막 줄만 강조색, 나머지 흰색
            fill = _rgb(theme["accent"]) if (i == len(lines) - 1 and len(lines) > 1) else (255, 255, 255)
            stroke = max(2, pt // 30)
        _shadowed_text(base, (x, y), line, f, fill, stroke=stroke, anchor=anchor)
        y += line_h
    if sub:
        _shadowed_text(base, (x, y + 8), sub, sf, (235, 240, 245), shadow=False, anchor=anchor)


def make_thumbnail(out: Path, text: str, fonts: dict, main_image: Path | None = None,
                   person: str = "", label: str = "", sub: str = "", channel: str = "",
                   layout: str = "split", theme: dict | None = None) -> Path:
    theme = theme or THEMES[0]
    c1, c2 = _rgb(theme["c1"]), _rgb(theme["c2"])
    lines = _lines(text)
    person_img = _cutout(person)
    main = None
    if main_image and Path(main_image).exists():
        try:
            main = Image.open(main_image).convert("RGB")
        except Exception:
            main = None

    if layout == "impact" and main is not None:
        base = fit_cover_faces(main, (W, H))
        base = Image.blend(base, Image.new("RGB", (W, H), (0, 0, 0)), 0.45).convert("RGBA")
    else:
        base = _diag_gradient((W, H), c1, c2).convert("RGBA")
        if layout == "series":  # 은은한 빛 번짐
            glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            ImageDraw.Draw(glow).ellipse((700, -200, 1500, 600), fill=(255, 255, 255, 40))
            base.alpha_composite(glow.filter(ImageFilter.GaussianBlur(120)))

    text_x, text_w, align = 64, W - 128, "left"

    def place_person(max_ratio: float, left: bool = False) -> int:
        ph = int(H * 0.97)
        p = person_img.resize((max(1, round(person_img.width * ph / person_img.height)), ph), Image.LANCZOS)
        max_pw = int(W * max_ratio)
        if p.width > max_pw:
            p = p.crop(((p.width - max_pw) // 2, 0, (p.width - max_pw) // 2 + max_pw, ph))
        base.alpha_composite(p, (0 if left else W - p.width - 10, H - ph))
        return p.width

    if layout == "split":
        # 메인 화면(결과·스크린샷)을 오른쪽에 크게 — 인물보다 화면이 주인공
        if main is not None:
            panel_w = int(W * 0.58)
            shot = fit_cover_faces(main, (panel_w, H)).convert("RGBA")
            fade = Image.linear_gradient("L").rotate(90).resize((panel_w, H))
            shot.putalpha(fade.point(lambda v: min(255, int(v * 2.4))))
            base.alpha_composite(shot, (W - panel_w, 0))
            text_w = int(W * 0.50)
        elif person_img is not None:
            text_w = min(text_w, W - place_person(0.42) - 90)
    elif layout == "series":
        # 인물이 주인공, 인물이 없으면 메인 화면을 카드로
        if person_img is not None:
            text_w = min(text_w, W - place_person(0.42) - 90)
        elif main is not None:
            card = _card(main, 560, 350)
            base.alpha_composite(card, (W - card.width - 10, (H - card.height) // 2))
            text_w = W - card.width - 90
    else:  # impact: 메인 화면을 배경으로, 인물은 왼쪽, 글자는 오른쪽
        if person_img is not None:
            pw = place_person(0.44, left=True)
            text_x, text_w, align = W - 48, W - pw - 40, "right"
    _text_block(base, lines, fonts, text_x, text_w, theme, label, sub, layout, align=align)
    if channel:  # 채널 이름 배지: 글자 쪽 아래 모서리
        cf = _font(fonts["subtitle"], 26)
        cw = cf.getlength(channel) + 28
        bx = 64 if align == "left" else W - 48 - cw
        d = ImageDraw.Draw(base)
        d.rounded_rectangle((bx, H - 64, bx + cw, H - 24), radius=10, fill=(0, 0, 0, 150))
        d.text((bx + 14, H - 60), channel, font=cf, fill=(255, 255, 255))
    out.parent.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(out, quality=93)
    return out



# ── 새롭게하소서에서 배운 인용형 썸네일 ─────────────────────────────
# 1) 실제 장면 사진 위 인물은 크게, 2) 제목은 그 사람의 말(1인칭 인용),
# 3) 핵심 단어만 *별표* 로 강조색, 4) 이름·직함은 작게 강조색, 5) 로고는 왼쪽 위 작게.

def parse_rich(line: str) -> list[tuple[str, bool]]:
    """'살려달라고 *기도하지* 마세요' → [('살려달라고 ', False), ('기도하지', True), (' 마세요', False)]"""
    parts = line.split("*")
    return [(t, i % 2 == 1) for i, t in enumerate(parts) if t]


def _rich_lines(text: str, limit: int = 4) -> list[list[tuple[str, bool]]]:
    rows = [l.strip() for l in text.replace("\\n", "\n").split("\n") if l.strip()][:limit]
    return [parse_rich(r) for r in rows] or [[(text, False)]]


def _rich_w(segs, f) -> float:
    return sum(f.getlength(t) for t, _ in segs)


def _draw_rich(base: Image.Image, x: float, y: float, segs, f, white, accent, stroke: int,
               align: str = "left") -> None:
    w = _rich_w(segs, f)
    cx = x - w if align == "right" else (x - w / 2 if align == "center" else x)
    sh = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ds = ImageDraw.Draw(sh)
    off = max(3, f.size // 22)
    tx = cx
    for t, _ in segs:  # 그림자 먼저
        ds.text((tx + off * 0.5, y + off), t, font=f, fill=(0, 0, 0, 170),
                stroke_width=stroke, stroke_fill=(0, 0, 0, 170))
        tx += f.getlength(t)
    base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(off * 0.8)))
    d = ImageDraw.Draw(base)
    tx = cx
    for t, hi in segs:
        d.text((tx, y), t, font=f, fill=accent if hi else white, stroke_width=stroke,
               stroke_fill=(10, 10, 16))
        tx += f.getlength(t)


def _fit_rich(rows, font_path, max_w, max_pt, min_pt=40) -> int:
    pt = max_pt
    while pt > min_pt and max(_rich_w(r, _font(font_path, pt)) for r in rows) > max_w:
        pt -= 4
    return pt


def _side_shade(size, color, side: str, reach: float = 0.64, strength: int = 225) -> Image.Image:
    """글자 쪽을 어둡게 (채널 색이 살짝 섞인 어둠)."""
    w, h = size
    g = Image.linear_gradient("L").rotate(90).resize((w, h))  # 왼쪽 0 → 오른쪽 255
    if side == "left":
        g = g.transpose(Image.FLIP_LEFT_RIGHT)  # 왼쪽 255
    g = g.point(lambda v: 0 if v < 255 * (1 - reach) else int(strength * ((v - 255 * (1 - reach)) / (255 * reach)) ** 0.8))
    layer = Image.new("RGBA", size, color + (255,))
    layer.putalpha(g)
    return layer


def _bottom_shade(size, start: float = 0.42, strength: int = 215) -> Image.Image:
    w, h = size
    g = Image.linear_gradient("L").resize((w, h))  # 위 0 → 아래 255
    g = g.point(lambda v: 0 if v < 255 * start else int(strength * ((v - 255 * start) / (255 * (1 - start))) ** 1.1))
    layer = Image.new("RGBA", size, (8, 8, 12, 255))
    layer.putalpha(g)
    return layer


def fit_cover_faces(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    """꽉 채우되, 얼굴이 잘리지 않게 얼굴을 기준으로 자른다 (세로 사진 → 가로 썸네일 등)."""
    w, h = size
    img = img.convert("RGB")
    try:
        from . import faces
        fb = faces.in_image(img)
    except Exception:
        fb = []
    scale = max(w / img.width, h / img.height)
    big = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    if not fb:
        left, top = (big.width - w) // 2, (big.height - h) // 2
    else:
        x1 = min(b[0] for b in fb) * scale
        y1 = min(b[1] for b in fb) * scale
        x2 = max(b[2] for b in fb) * scale
        y2 = max(b[3] for b in fb) * scale
        cx, fh = (x1 + x2) / 2, (y2 - y1)
        left = int(min(max(0, cx - w / 2), big.width - w))
        top = int(min(max(0, y1 - fh * 0.9), big.height - h))  # 머리 위 여유를 두고
    return big.crop((left, top, left + w, top + h))


def _portrait_base(img: Image.Image) -> Image.Image:
    """세로 사진: 흐린 배경 위에 사람 전체를 오른쪽에 세운다 (억지로 확대해 얼굴이 뭉개지지 않게)."""
    img = img.convert("RGB")
    back = fit_cover(img, (W, H)).filter(ImageFilter.GaussianBlur(28))
    back = Image.blend(back, Image.new("RGB", (W, H), (10, 14, 24)), 0.35)
    ph = H
    pw = round(img.width * ph / img.height)
    person = img.resize((pw, ph), Image.LANCZOS)
    x = int(W * 0.66 - pw / 2)
    x = min(max(0, x), W - pw)
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rectangle((x - 6, 0, x + pw + 6, H), fill=(0, 0, 0, 120))
    base = back.convert("RGBA")
    base.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(14)))
    base.paste(person, (x, 0))
    return base


def _photo_base(main_image, theme) -> Image.Image:
    if main_image and Path(main_image).exists():
        try:
            img = Image.open(main_image)
            if img.height > img.width * 1.1:
                return _portrait_base(img)
            return fit_cover_faces(img, (W, H)).convert("RGBA")
        except Exception:
            pass
    return _diag_gradient((W, H), _rgb(theme["c1"]), _rgb(theme["c2"])).convert("RGBA")


def _logo(base, fonts, text: str, color=(255, 255, 255, 200)) -> None:
    if text:
        f = _font(fonts["subtitle"], 26)
        ImageDraw.Draw(base).text((26, 18), text, font=f, fill=color)



def _face_boxes(base: Image.Image) -> list[tuple[int, int, int, int]]:
    try:
        from . import faces
        return faces.in_image(base.convert("RGB"))
    except Exception:
        return []


def testimony_thumbnail(out: Path, quote: str, fonts: dict, main_image: Path | None = None,
                        name: str = "", role: str = "", logo: str = "", theme: dict | None = None,
                        side: str = "left") -> Path:
    """새롭게하소서 고전형 (조회 200만~500만 영상들의 틀).
    사진 전체 + 글자 쪽 어둡게 + 3~4줄 인용 + 강조 단어 + 이름·직함."""
    theme = theme or THEMES[2]
    base = _photo_base(main_image, theme)
    dark = tuple(max(0, int(c * 0.35)) for c in _rgb(theme["c1"]))
    base.alpha_composite(_side_shade((W, H), dark, side))
    rows = _rich_lines(quote, 4)
    max_w = int(W * 0.50)
    fb = _face_boxes(base)
    if fb:  # 얼굴을 피해서: 얼굴이 없는 쪽으로, 얼굴까지의 폭만큼만
        fx1 = min(b[0] for b in fb) - int(0.12 * (max(b[2] for b in fb) - min(b[0] for b in fb)))
        fx2 = max(b[2] for b in fb) + int(0.12 * (max(b[2] for b in fb) - min(b[0] for b in fb)))
        room_left, room_right = fx1 - 56 - 20, W - 56 - fx2 - 20
        if side == "left" and room_left < W * 0.30 and room_right > room_left:
            side = "right"
        elif side == "right" and room_right < W * 0.30 and room_left > room_right:
            side = "left"
        max_w = max(int(W * 0.24), min(max_w, room_left if side == "left" else room_right))
        base = _photo_base(main_image, theme)
        base.alpha_composite(_side_shade((W, H), dark, side))
    pt = _fit_rich(rows, fonts["bold"], max_w, {1: 130, 2: 122, 3: 110, 4: 96}[len(rows)])
    f = _font(fonts["bold"], pt)
    nf = _font(fonts["subtitle"], 34)
    line_h = int(pt * 1.14)
    block = line_h * len(rows) + (58 if (name or role) else 0)
    y = (H - block) / 2 + 10
    x, align = (56, "left") if side == "left" else (W - 56, "right")
    accent = _rgb(theme["accent"])
    for r in rows:
        _draw_rich(base, x, y, r, f, (255, 255, 255), accent, max(2, pt // 40), align)
        y += line_h
    if name or role:
        label = " ".join(p for p in (role, name) if p)
        d = ImageDraw.Draw(base)
        lx = x if align == "left" else x - nf.getlength(label)
        d.text((lx, y + 14), label, font=nf, fill=accent)
    _logo(base, fonts, logo)
    out.parent.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(out, quality=93)
    return out


def _swoosh(base, color, y0: int) -> None:
    """아래쪽 붓 선 장식."""
    import math
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    pts = [(x, y0 + 10 * math.sin(x / 150) - x * 0.02) for x in range(-20, W + 40, 8)]
    d.line(pts, fill=color + (230,), width=6, joint="curve")
    pts2 = [(x, y0 + 16 + 8 * math.sin(x / 110 + 1.3) - x * 0.015) for x in range(300, W + 40, 8)]
    d.line(pts2, fill=color + (150,), width=3, joint="curve")
    base.alpha_composite(layer)


def talk_thumbnail(out: Path, quote: str, fonts: dict, main_image: Path | None = None,
                   name: str = "", role: str = "", kicker: str = "", notes: list | None = None,
                   name_xy: tuple = (0.22, 0.28), logo: str = "", theme: dict | None = None) -> Path:
    """새롭게하소서 최근형 (2025~).
    사진 전체 + 아래 두 줄 인용 + 사연 한 줄 상자 + 손글씨 이름표·반응 자막 + 붓 선."""
    theme = theme or THEMES[2]
    base = _photo_base(main_image, theme)
    base.alpha_composite(_bottom_shade((W, H)))
    accent = _rgb(theme["accent"])
    rows = _rich_lines(quote, 2)
    pt = _fit_rich(rows, fonts["bold"], W - 110, 92 if len(rows) == 2 else 104)
    fb = _face_boxes(base)
    if fb:  # 아래 두 줄(+사연 상자)이 얼굴 턱보다 아래에 오도록 글자를 줄인다
        fbot = max(b[3] for b in fb) + int((max(b[3] for b in fb) - min(b[1] for b in fb)) * 0.12)
        while pt > 50 and H - 46 - int(pt * 1.12) * len(rows) - (60 if kicker else 0) < fbot:
            pt -= 4
    f = _font(fonts["bold"], pt)
    line_h = int(pt * 1.12)
    y = H - 46 - line_h * len(rows)
    if kicker:
        kf = _font(fonts["subtitle"], 30)
        kw = kf.getlength(kicker) + 28
        ky = y - 56
        ImageDraw.Draw(base).rectangle((52, ky, 52 + kw, ky + 46), fill=(18, 18, 22, 215))
        ImageDraw.Draw(base).text((66, ky + 5), kicker, font=kf, fill=(255, 255, 255))
    for r in rows:
        _draw_rich(base, 56, y, r, f, (255, 255, 255), accent, max(3, pt // 28))
        y += line_h
    _swoosh(base, accent, H - 22)
    hf = _font(fonts["hand"], 48)
    hs = _font(fonts["hand"], 34)
    d = ImageDraw.Draw(base)
    if name:
        nx, ny = int(W * name_xy[0]), int(H * name_xy[1])
        d.text((nx, ny), name, font=hf, fill=(255, 225, 77), stroke_width=3, stroke_fill=(40, 30, 0))
        if role:
            d.text((nx + 6, ny + 50), role, font=hs, fill=(255, 225, 77), stroke_width=2, stroke_fill=(40, 30, 0))
    for n in notes or []:
        d.text((int(W * n.get("x", 0.8)), int(H * n.get("y", 0.2))), n.get("text", ""), font=hs,
               fill=(255, 255, 255), stroke_width=3, stroke_fill=(20, 20, 20))
    _logo(base, fonts, logo)
    out.parent.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(out, quality=93)
    return out


# ── 오빠두엑셀에서 배운 '얼굴 + 두 줄' 썸네일 ───────────────────────
# 얼굴은 위쪽 가운데 크게, 아래에 작은 맥락 줄 + 아주 큰 결론 줄(핵심 단어만 형광색),
# 옆에 로고(무슨 이야기인지 한눈에). 글자는 얼굴 아래에만 둔다.

def _logo_card(img: Image.Image, size: int) -> Image.Image:
    img = img.convert("RGBA")
    img.thumbnail((size, size), Image.LANCZOS)
    pad = int(size * 0.14)
    card = Image.new("RGBA", (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    d.rounded_rectangle((0, 0, card.width - 1, card.height - 1), radius=int(size * 0.22),
                        fill=(255, 255, 255, 245))
    card.alpha_composite(img, (pad, pad))
    glow = Image.new("RGBA", (card.width + 60, card.height + 60), (0, 0, 0, 0))
    ImageDraw.Draw(glow).rounded_rectangle((30, 30, 30 + card.width, 30 + card.height),
                                           radius=int(size * 0.22), fill=(255, 255, 255, 110))
    glow = glow.filter(ImageFilter.GaussianBlur(18))
    glow.alpha_composite(card, (30, 30))
    return glow


def hero_thumbnail(out: Path, big: str, fonts: dict, main_image: Path | None = None, hook: str = "",
                   logo: str = "", badge: str = "", theme: dict | None = None, accent: str = "#2BE38B") -> Path:
    """오빠두엑셀형: 얼굴 크게 + 아래 두 줄(작은 맥락 줄 + 큰 결론 줄) + 로고. 핵심 단어는 *별표*."""
    theme = theme or THEMES[2]
    base = _photo_base(main_image, theme)
    # 가장자리 어둡게 + 아래쪽 짙게 (글자 받침)
    vig = Image.radial_gradient("L").resize((W, H)).point(lambda v: int(min(255, v * 1.15)))
    shade = Image.new("RGBA", (W, H), (5, 7, 12, 255))
    shade.putalpha(vig.point(lambda v: int(v * 0.55)))
    base.alpha_composite(shade)
    base.alpha_composite(_bottom_shade((W, H), start=0.45, strength=235))
    # 얼굴 아래 끝 찾기 → 글자는 그 아래에
    face_bottom = 0
    try:
        from . import faces
        fb = faces.in_image(base.convert("RGB"))
        if fb:
            face_bottom = max(b[3] for b in fb) + int((max(b[3] for b in fb) - min(b[1] for b in fb)) * 0.15)
    except Exception:
        pass
    rows = _rich_lines(big, 2)
    hook_pt = 50
    avail_top = max(face_bottom + 10, int(H * 0.46))
    gap = 10
    pt = _fit_rich(rows, fonts["bold"], W - 90, 150 if len(rows) == 1 else 112)
    need = (hook_pt + gap if hook else 0) + int(pt * 1.08) * len(rows)
    while pt > 60 and avail_top + need > H - 26:  # 얼굴을 피하려면 글자를 줄인다
        pt -= 6
        need = (hook_pt + gap if hook else 0) + int(pt * 1.08) * len(rows)
    y = H - 26 - need
    acc = _rgb(accent)
    if hook:
        hf = _font(fonts["bold"], hook_pt)
        _draw_rich(base, W / 2, y, parse_rich(hook), hf, (255, 255, 255), acc, 4, "center")
        y += hook_pt + gap
    bf = _font(fonts["bold"], pt)
    for r in rows:
        _draw_rich(base, W / 2, y, r, bf, (255, 255, 255), acc, max(5, pt // 16), "center")
        y += int(pt * 1.08)
    if logo and Path(logo).exists():
        try:
            card = _logo_card(Image.open(logo), 170)
            base.alpha_composite(card, (W - card.width - 20, 20))
        except Exception:
            pass
    if badge:
        bf2 = _font(fonts["bold"], 38)
        bw = bf2.getlength(badge) + 40
        d = ImageDraw.Draw(base)
        d.rounded_rectangle((34, 34, 34 + bw, 34 + 62), radius=14, fill=acc + (255,))
        d.text((54, 42), badge, font=bf2, fill=(10, 20, 14))
    out.parent.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(out, quality=93)
    return out


def _text_logo(text: str, fonts: dict, size: int = 150, color=(20, 24, 40), bg=(255, 255, 255, 245)) -> Image.Image:
    """로고 이미지가 없을 때: 글자 로고 카드 (예: Flow, SUNO, Claude)."""
    f = _font(fonts["bold"], int(size * 0.42))
    w = int(max(size, f.getlength(text) + size * 0.5))
    card = Image.new("RGBA", (w, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    d.rounded_rectangle((0, 0, w - 1, size - 1), radius=int(size * 0.24), fill=bg)
    d.text((w / 2, size / 2), text, font=f, fill=color, anchor="mm")
    glow = Image.new("RGBA", (w + 60, size + 60), (0, 0, 0, 0))
    ImageDraw.Draw(glow).rounded_rectangle((30, 30, 30 + w, 30 + size), radius=int(size * 0.24),
                                           fill=(255, 255, 255, 90))
    glow = glow.filter(ImageFilter.GaussianBlur(16))
    glow.alpha_composite(card, (30, 30))
    return glow


def _doodle(base: Image.Image, text: str, x: int, y: int, fonts: dict, color=(255, 225, 60), rot: float = -8,
            size: int = 54) -> None:
    """손글씨 낙서 (어비월드·새롭게하소서식 반응 글씨)."""
    f = _font(fonts["hand"], size)
    w, h = int(f.getlength(text)) + 30, int(size * 1.5)
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((15, 4), text, font=f, fill=color + (255,), stroke_width=5, stroke_fill=(15, 15, 20))
    layer = layer.rotate(rot, expand=True, resample=Image.BICUBIC)
    base.alpha_composite(layer, (max(0, min(W - layer.width, x)), max(0, min(H - layer.height, y))))


def showcase_thumbnail(out: Path, big: str, fonts: dict, scene: Path | None = None, hook: str = "",
                       logo: str = "", logo_text: str = "", badge: str = "", person: str = "",
                       channel: str = "", theme: dict | None = None, accent: str = "#FFD400",
                       doodles: list | None = None, accent2: str = "#3CE68C") -> Path:
    """세 채널 공통 공식 (오빠두엑셀·어비월드·언더스탠딩):
    - 왼쪽 위 채널 상자(늘 같은 자리) + 회차·NEW 배지
    - 오른쪽: 얼굴(배경 지운 인물 PNG) — 없으면 결과 장면 카드가 주인공
    - 도구 로고 카드, 손글씨 반응 낙서
    - 아래 왼쪽 두 줄: '!' 로 시작하는 줄은 줄 전체 강조색, *단어* 는 두 번째 강조색
    """
    theme = theme or THEMES[2]
    c1, c2 = _rgb(theme["c1"]), _rgb(theme["c2"])
    base = _diag_gradient((W, H), c1, c2).convert("RGBA")
    have_scene = bool(scene and Path(scene).exists())
    if have_scene:
        sc = Image.open(scene).convert("RGB")
        back = fit_cover(sc, (W, H)).filter(ImageFilter.GaussianBlur(26))
        base = Image.blend(back, Image.new("RGB", (W, H), c1), 0.55).convert("RGBA")
    glow = Image.radial_gradient("L").resize((W, H)).point(lambda v: int(max(0, 255 - v) * 0.4))
    light = Image.new("RGBA", (W, H), c2 + (255,))
    light.putalpha(glow)
    base.alpha_composite(light)
    person_img = _cutout(person) if person else None
    card_box = None
    if have_scene:
        if person_img is not None:
            cw, ch = 560, 315
            card = _card(Image.open(scene), cw, ch)
            cxy = (10, 70)
        else:
            cw, ch = 790, 444
            card = _card(Image.open(scene), cw, ch)
            cxy = (W - card.width + 12, 8)
        base.alpha_composite(card, cxy)
        card_box = (cxy[0] + 40, cxy[1] + 40, cxy[0] + 40 + cw, cxy[1] + 40 + ch)
    if person_img is not None:
        ph = int(H * 0.99)
        pimg = person_img.resize((max(1, round(person_img.width * ph / person_img.height)), ph), Image.LANCZOS)
        mw = int(W * 0.46)
        if pimg.width > mw:
            pimg = pimg.crop(((pimg.width - mw) // 2, 0, (pimg.width - mw) // 2 + mw, ph))
        base.alpha_composite(pimg, (W - pimg.width, H - ph))
    base.alpha_composite(_bottom_shade((W, H), start=0.48, strength=245))
    # 로고 카드: 장면 카드 모서리에 걸치게
    lg = None
    if logo and Path(logo).exists():
        lg = _logo_card(Image.open(logo), 140)
    elif logo_text:
        lg = _text_logo(logo_text, fonts, 120)
    if lg is not None:
        if card_box and person_img is None:
            pos = (card_box[0] - lg.width // 2 - 10, card_box[3] - lg.height + 10)
        elif card_box:
            pos = (card_box[2] - lg.width // 2, card_box[1] - 50)
        else:
            pos = (W - lg.width - 10, 10)
        base.alpha_composite(lg, (max(0, pos[0]), max(0, pos[1])))
    # 아래 왼쪽 두 줄
    rows_raw = [r for r in big.replace("\\n", "\n").split("\n") if r.strip()][:2] or [big]
    rows = []
    for r in rows_raw:
        whole = r.startswith("!")
        rows.append((whole, parse_rich(r[1:] if whole else r)))
    face_bottom = 0
    fb = _face_boxes(base)
    text_w = (W - 80) if person_img is None else int(W * 0.60)
    pt = _fit_rich([r for _, r in rows], fonts["bold"], text_w, 110 if len(rows) == 2 else 130)
    if fb:
        fx_min = min(b[0] for b in fb)
        if fx_min < 60 + text_w:  # 얼굴이 글자 가로 범위에 있으면 턱 아래로
            face_bottom = max(b[3] for b in fb)
    need = int(pt * 1.1) * len(rows)
    while pt > 56 and H - 30 - need < max(face_bottom + 8, int(H * 0.50)):
        pt -= 5
        need = int(pt * 1.1) * len(rows)
    y = H - 30 - need
    f = _font(fonts["bold"], pt)
    a1, a2 = _rgb(accent), _rgb(accent2)
    for whole, segs in rows:
        if whole:
            segs = [(t, True) for t, _ in segs]
            _draw_rich(base, 44, y, segs, f, (255, 255, 255), a1, max(5, pt // 16), "left")
        else:
            _draw_rich(base, 44, y, segs, f, (255, 255, 255), a2, max(5, pt // 16), "left")
        y += int(pt * 1.1)
    d = ImageDraw.Draw(base)
    # 채널 상자 (언더스탠딩식 고정 자리) + 배지
    x0 = 0
    if channel:
        cf = _font(fonts["bold"], 34)
        cw2 = int(cf.getlength(channel)) + 36
        d.rectangle((0, 0, cw2, 60), fill=c2 + (255,))
        d.text((18, 10), channel, font=cf, fill=(255, 255, 255))
        x0 = cw2 + 10
    if badge:
        bf2 = _font(fonts["bold"], 34)
        bw = int(bf2.getlength(badge)) + 32
        d.rectangle((x0, 0, x0 + bw, 60), fill=a1 + (255,))
        d.text((x0 + 16, 10), badge, font=bf2, fill=(15, 15, 20))
    if hook:  # 작은 맥락 줄: 두 줄 바로 위
        hf = _font(fonts["bold"], 40)
        hy = H - 30 - need - 58
        hw = int(hf.getlength(hook.replace("*", ""))) + 28
        d.rectangle((44, hy, 44 + hw, hy + 52), fill=(12, 12, 16, 220))
        _draw_rich(base, 58, hy + 5, parse_rich(hook), hf, (255, 255, 255), a1, 0, "left")
    for dd in doodles or []:
        _doodle(base, dd.get("text", ""), int(W * dd.get("x", 0.6)), int(H * dd.get("y", 0.1)), fonts,
                _rgb(dd.get("color", "#FFE13C")), dd.get("rot", -8), dd.get("size", 76))
    out.parent.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(out, quality=93)
    return out

def make_variants(folder: Path, project: dict, fonts: dict, tcfg: dict, main_image: Path | None,
                  channel: str = "", theme: dict | None = None) -> list[Path]:
    """썸네일 3종 — 긴 영상은 유튜브 'A/B 테스트'에 그대로 올릴 수 있다.

    project 에 thumbnail_quote(인용, *강조*)가 있으면 새롭게하소서형(testimony·talk)을 먼저 만든다.
    """
    text = project.get("thumbnail_text") or project.get("title", "")
    quote = project.get("thumbnail_quote", "")
    label = project.get("thumbnail_label", "")
    sub = project.get("thumbnail_sub", "")
    person = tcfg.get("person_image", "")
    key = project.get("title", text)
    logo = tcfg.get("logo_text", channel if tcfg.get("show_channel", True) else "")
    outs: list[Path] = []
    names = ["thumbnail.jpg", "thumbnail_2.jpg", "thumbnail_3.jpg"]
    n = int(tcfg.get("variants", 3))
    if quote:
        th = theme or theme_for(key, 0, tcfg.get("theme", ""))
        common = dict(fonts=fonts, main_image=main_image, name=project.get("thumbnail_name", ""),
                      role=project.get("thumbnail_role", ""), logo=logo, theme=th)
        outs.append(testimony_thumbnail(folder / names[0], quote, side=project.get("thumbnail_side", "left"),
                                        **common))
        if n > 1:
            nxy = project.get("thumbnail_name_xy") or (0.22, 0.28)
            outs.append(talk_thumbnail(folder / names[1], project.get("thumbnail_quote2") or quote,
                                       kicker=project.get("thumbnail_kicker", ""),
                                       notes=project.get("thumbnail_notes") or [], name_xy=tuple(nxy),
                                       **common))
        if n > 2:  # 오빠두엑셀형: 작은 맥락 줄 + 큰 결론 줄
            hook = project.get("thumbnail_hook") or project.get("thumbnail_kicker") or label
            big = project.get("thumbnail_big") or quote
            outs.append(hero_thumbnail(folder / names[2], big, fonts, main_image, hook,
                                       tcfg.get("logo_image", ""), project.get("thumbnail_badge", ""), th,
                                       tcfg.get("hero_accent", "#2BE38B")))
        return outs
    first = tcfg.get("layout", "split")
    layouts = [first] + [l for l in ("split", "impact", "series") if l != first]
    for i, layout in enumerate(layouts[:n]):
        th = theme if (theme and i == 0) else theme_for(key, i, tcfg.get("theme", "") if i == 0 else "")
        outs.append(make_thumbnail(folder / names[i], text, fonts, main_image, person, label, sub,
                                   channel if tcfg.get("show_channel", True) else "", layout, th))
    return outs
