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
        base = fit_cover(main, (W, H))
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
            shot = fit_cover(main, (panel_w, H)).convert("RGBA")
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


def make_variants(folder: Path, project: dict, fonts: dict, tcfg: dict, main_image: Path | None,
                  channel: str = "") -> list[Path]:
    """썸네일 3종 — 유튜브 '테스트 및 비교(A/B)'에 그대로 올릴 수 있다."""
    text = project.get("thumbnail_text") or project.get("title", "")
    label = project.get("thumbnail_label", "")
    sub = project.get("thumbnail_sub", "")
    person = tcfg.get("person_image", "")
    key = project.get("title", text)
    first = tcfg.get("layout", "split")
    layouts = [first] + [l for l in ("split", "impact", "series") if l != first]
    outs = []
    for i, layout in enumerate(layouts[: int(tcfg.get("variants", 3))]):
        theme = theme_for(key, i, tcfg.get("theme", "") if i == 0 else "")
        name = "thumbnail.jpg" if i == 0 else f"thumbnail_{i + 1}.jpg"
        outs.append(make_thumbnail(folder / name, text, fonts, main_image, person, label, sub,
                                   channel if tcfg.get("show_channel", True) else "", layout, theme))
    return outs
