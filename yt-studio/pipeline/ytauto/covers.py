"""쇼츠 세로 표지 (1080×1920).  요즘 반응 좋은 네 가지 틀.

  bubble  말풍선형   — 실제 인물 사진 + 그 사람이 한 말을 말풍선에 (응원·인터뷰·간증)
  box     자막상자형 — 검은 상자 한 줄(상황) + 노란 상자 큰 글씨(핵심), 살짝 기울임 (예능 자막)
  answer  질문-답형  — 작은 질문 한 줄 + 화면을 채우는 답 한 단어 (칼럼·말씀)
  card    카드형     — 사진 없이 색 배경 + 대상 꼬리표 + 큰 두 줄 + 60초 도장 (추천 영상)

공통 규칙
  - 얼굴은 절대 가리지 않는다 (YuNet 얼굴 위치를 피해 글자 자리를 고른다)
  - 아래 1/6(1600px 아래)은 유튜브 제목·버튼 자리라 비운다
  - 핵심어는 *별표* 로 한 단어만 색을 바꾼다
"""
from __future__ import annotations

import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from .thumbs import _face_boxes, _rgb, fit_cover_faces, parse_rich

W, H = 1080, 1920
SAFE_TOP, SAFE_BOTTOM = 190, 1600
INK = (12, 12, 18)
YELLOW = (255, 214, 0)
MINT = (60, 230, 170)


def _f(path: str, pt: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, pt)


def _rows(text: str) -> list[str]:
    return [r for r in text.replace("\\n", "\n").split("\n") if r.strip()]


def _w(segs, f) -> float:
    return sum(f.getlength(t) for t, _ in segs)


def _fit(rows, path, max_w, hi, lo=70) -> int:
    pt = hi
    while pt > lo and max(_w(parse_rich(r), _f(path, pt)) for r in rows) > max_w:
        pt -= 4
    return pt


def _line(base: Image.Image, cx: float, y: float, row: str, f, fill=(255, 255, 255), accent=YELLOW,
          sw: int = 10, outer=None, ow: int = 0, shadow: bool = True) -> None:
    """가운데 정렬 한 줄: 그림자 → (바깥 테두리) → 검은 테두리 → 글자."""
    segs = parse_rich(row)
    x0 = cx - _w(segs, f) / 2
    if shadow:
        sh = Image.new("RGBA", base.size, (0, 0, 0, 0))
        ds, x = ImageDraw.Draw(sh), x0
        for t, _ in segs:
            ds.text((x + 8, y + 14), t, font=f, fill=(0, 0, 0, 190), stroke_width=sw + ow, stroke_fill=(0, 0, 0, 190))
            x += f.getlength(t)
        base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(12)))
    d, x = ImageDraw.Draw(base), x0
    if outer:
        for t, _ in segs:
            d.text((x, y), t, font=f, fill=outer, stroke_width=sw + ow, stroke_fill=outer)
            x += f.getlength(t)
    x = x0
    for t, hi in segs:
        d.text((x, y), t, font=f, fill=accent if hi else fill, stroke_width=sw, stroke_fill=INK)
        x += f.getlength(t)


def _hits(fb, y0, y1, x0=0, x1=W, pad=30) -> bool:
    return any(not (b[3] + pad < y0 or b[1] - pad > y1 or b[2] + pad < x0 or b[0] - pad > x1) for b in fb)


def _pick_y(fb, block_h: int, prefer: str = "top") -> int:
    """얼굴을 피하는 글자 덩어리 위쪽 y. 위·아래 후보를 차례로 본다."""
    top, low = SAFE_TOP + 40, SAFE_BOTTOM - block_h
    if not fb:  # 얼굴이 없으면 화면 가운데보다 조금 위 (위만 차고 아래가 비어 보이지 않게)
        return int(max(top, (SAFE_TOP + SAFE_BOTTOM - block_h) / 2 - 80))
    cands = [top, low] if prefer == "top" else [low, top]
    if fb:  # 얼굴 바로 아래·바로 위도 후보로
        cands += [max(b[3] for b in fb) + 40, min(b[1] for b in fb) - 40 - block_h]
    for c in cands:
        if SAFE_TOP <= c <= SAFE_BOTTOM - block_h and not _hits(fb, c, c + block_h):
            return int(c)
    return int(low)


def _trim_bars(img: Image.Image) -> Image.Image:
    """위아래·좌우 검은 띠(유튜브 장면 캡처 등)를 잘라낸다."""
    g = img.convert("L").point(lambda v: 255 if v > 18 else 0)
    box = g.getbbox()
    if box and (box[2] - box[0]) * (box[3] - box[1]) > img.width * img.height * 0.4:
        return img.crop(box)
    return img


def _photo(photo) -> Image.Image | None:
    if photo and Path(photo).exists():
        return fit_cover_faces(_trim_bars(Image.open(photo).convert("RGB")), (W, H)).convert("RGBA")
    return None


def _spotlight(base: Image.Image, fb, strength: float = 0.42) -> Image.Image:
    """얼굴 쪽은 밝게, 나머지는 살짝 어둡게 — 사람이 도드라지게."""
    if not fb:
        return base
    m = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(m)
    for b in fb:
        cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2 + (b[3] - b[1]) * 0.9
        rw, rh = (b[2] - b[0]) * 2.4, (b[3] - b[1]) * 3.2
        d.ellipse((cx - rw, cy - rh, cx + rw, cy + rh), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(160))
    dark = Image.new("RGBA", (W, H), (6, 8, 14, int(255 * strength)))
    inv = m.point(lambda v: 255 - v)
    dark.putalpha(inv.point(lambda v: int(v * strength)))
    base.alpha_composite(dark)
    return base


def _shade(base: Image.Image, y0: int, y1: int, alpha: int = 170) -> None:
    """글자 뒤 위아래로 옅어지는 그늘."""
    col = Image.new("L", (1, H), 0)
    mid, half = (y0 + y1) / 2, (y1 - y0) / 2 + 220
    for yy in range(H):
        k = max(0.0, 1 - abs(yy - mid) / half)
        col.putpixel((0, yy), int(alpha * min(1.0, k * 1.6)))
    layer = Image.new("RGBA", (W, H), (4, 6, 12, 255))
    layer.putalpha(col.resize((W, H)))
    base.alpha_composite(layer)


def _brand(base: Image.Image, text: str, fonts: dict) -> None:
    if not text:
        return
    f = _f(fonts["bold"], 36)
    w = int(f.getlength(text)) + 44
    chip = Image.new("RGBA", (w, 64), (0, 0, 0, 0))
    ImageDraw.Draw(chip).rounded_rectangle((0, 0, w - 1, 63), 32, fill=(10, 12, 20, 170))
    ImageDraw.Draw(chip).text((22, 32), text, font=f, fill=(255, 255, 255), anchor="lm")
    base.alpha_composite(chip, (48, 96))


def _chip(base: Image.Image, cx: float, y: int, text: str, fonts: dict, bg=YELLOW, fg=INK, pt: int = 46,
          rot: float = 0) -> int:
    f = _f(fonts["bold"], pt)
    w, h = int(f.getlength(text)) + pt * 2, int(pt * 1.75)
    layer = Image.new("RGBA", (w + 20, h + 20), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle((10, 10, w + 9, h + 9), h // 2, fill=bg + (255,), outline=INK, width=5)
    d.text((10 + w / 2, 10 + h / 2), text, font=f, fill=fg, anchor="mm")
    if rot:
        layer = layer.rotate(rot, expand=True, resample=Image.BICUBIC)
    base.alpha_composite(layer, (int(cx - layer.width / 2), y))
    return layer.height


def _underline(base: Image.Image, x0: float, x1: float, y: float, color=YELLOW, width: int = 16) -> None:
    """손으로 그은 듯한 밑줄."""
    rnd = random.Random(int(x0 + y))
    pts = [(x0 + (x1 - x0) * i / 8, y + rnd.uniform(-7, 7)) for i in range(9)]
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(layer).line(pts, fill=color + (255,), width=width, joint="curve")
    base.alpha_composite(layer)


# ── 1. 말풍선형 ─────────────────────────────────────────────
def _bubble(base, fb, quote: str, who: str, fonts: dict, accent) -> None:
    rows = _rows(quote)[:3]
    pt = _fit(rows, fonts["title"], W * 0.72, 150, 80)
    f = _f(fonts["title"], pt)
    lh = int(pt * 1.18)
    bw = int(max(W * 0.70, max(_w(parse_rich(r), f) for r in rows) + 150))
    bh = lh * len(rows) + 110
    wf = _f(fonts["bold"], 44)
    tail = 90
    need = bh + tail + (90 if who else 0)
    face = min(fb, key=lambda b: b[1]) if fb else None
    y = None
    if face is not None:  # 얼굴 바로 아래가 가장 자연스럽다
        c = face[3] + 30
        if c + need <= SAFE_BOTTOM and not _hits(fb, c + tail, c + need):
            y = c
    if y is None:
        y = _pick_y(fb, need, "bottom")
    below = face is not None and y > face[3]
    by = y + (tail if below else 0)
    bx = (W - bw) // 2
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # 꼬리: 입 쪽을 향해
    if face:
        mx = min(max((face[0] + face[2]) / 2, bx + 120), bx + bw - 120)
        fx = (face[0] + face[2]) / 2
        if below:
            tip = (fx + (mx - fx) * 0.3, max(face[3] + 20, by - tail))
            poly = [(mx - 60, by + 6), (mx + 60, by + 6), tip]
        else:
            tip = (fx + (mx - fx) * 0.3, min(face[1] - 20, by + bh + tail))
            poly = [(mx - 60, by + bh - 6), (mx + 60, by + bh - 6), tip]
        d.polygon(poly, fill=(255, 255, 255, 255), outline=INK)
        d.line(poly[1:] + poly[:1], fill=INK, width=8)
    d.rounded_rectangle((bx, by, bx + bw, by + bh), 60, fill=(255, 255, 255, 255), outline=INK, width=8)
    if face:  # 테두리 위로 꼬리 이음새 지우기
        edge = by if below else by + bh
        d.line((mx - 42, edge, mx + 42, edge), fill=(255, 255, 255, 255), width=12)
    sh = layer.split()[3].filter(ImageFilter.GaussianBlur(18))
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    shadow.putalpha(sh.point(lambda v: int(v * 0.55)))
    base.alpha_composite(shadow, (8, 16))
    base.alpha_composite(layer)
    ty = by + 55
    for r in rows:
        _line(base, W / 2, ty, r, f, fill=INK, accent=(230, 40, 60), sw=0, shadow=False)
        ty += lh
    if who:
        wy = by + bh + 18 if not below else by + bh + 18
        ImageDraw.Draw(base).text((bx + bw - 20, wy), who, font=wf, fill=(255, 255, 255), anchor="ra",
                                  stroke_width=6, stroke_fill=INK)


# ── 2. 자막상자형 ───────────────────────────────────────────
def _boxbar(base, cx, y, text, f, bg, fg, accent, rot, pad_x=46, pad_y=22) -> int:
    segs = parse_rich(text)
    tw = _w(segs, f)
    asc, desc = f.getmetrics()
    w, h = int(tw + pad_x * 2), int(asc + desc + pad_y * 2)
    layer = Image.new("RGBA", (w + 40, h + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rectangle((20, 20, 20 + w, 20 + h), fill=bg + (255,))
    x = 20 + pad_x
    for t, hi in segs:
        d.text((x, 20 + pad_y), t, font=f, fill=accent if hi else fg)
        x += f.getlength(t)
    layer = layer.rotate(rot, expand=True, resample=Image.BICUBIC)
    sh = Image.new("RGBA", layer.size, (0, 0, 0, 255))
    sh.putalpha(layer.split()[3].filter(ImageFilter.GaussianBlur(14)).point(lambda v: int(v * 0.6)))
    base.alpha_composite(sh, (int(cx - layer.width / 2) + 10, y + 18))
    base.alpha_composite(layer, (int(cx - layer.width / 2), y))
    return layer.height - 30


def _boxes(base, fb, hook: str, big: str, fonts: dict, accent) -> None:
    rows = _rows(big)[:3]
    hf = _f(fonts["bold"], 58)
    pt = _fit(rows, fonts["title"], W * 0.80, 150 if len(rows) < 3 else 124, 80)
    bf = _f(fonts["title"], pt)
    block = (110 if hook else 0) + int(pt * 1.55) * len(rows)
    y = _pick_y(fb, block, "top")
    _shade(base, y, y + block, 120)
    if hook:
        y += _boxbar(base, W / 2, y, hook, hf, INK, (255, 255, 255), accent, 0, 34, 16) + 16
    for i, r in enumerate(rows):
        rot = [-3, 2][i % 2]
        bg, fg, ac = (accent, INK, (200, 20, 40)) if i == len(rows) - 1 else ((255, 255, 255), INK, (200, 20, 40))
        y += _boxbar(base, W / 2, y, r, bf, bg, fg, ac, rot) + 6


# ── 3. 질문-답형 ────────────────────────────────────────────
def _answer(base, fb, question: str, answer: str, fonts: dict, accent, tag: str = "") -> None:
    qf = _f(fonts["bold"], 64)
    word = answer.replace("*", "")
    pt = 360
    af = _f(fonts["title"], pt)
    while pt > 140 and af.getlength(word) > W * 0.88:
        pt -= 10
        af = _f(fonts["title"], pt)
    block = 110 + int(pt * 1.15) + 20 + (110 if tag else 0)
    y = _pick_y(fb, block, "top")
    _shade(base, y, y + block, 185)
    for qi, q in enumerate(_rows(question)[:2]):
        _line(base, W / 2, y, q, qf, sw=6, shadow=True)
        y += 84
    y += 10
    # 입체: 아래로 겹겹이 어두운 층 → 빛 번짐 → 글자
    depth = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dd = ImageDraw.Draw(depth)
    x0 = (W - af.getlength(word)) / 2
    for k in range(14, 0, -1):
        dd.text((x0 + k * 0.6, y + k * 1.4), word, font=af, fill=(120, 80, 0, 255), stroke_width=12, stroke_fill=INK)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).text((x0, y), word, font=af, fill=accent + (255,), stroke_width=28, stroke_fill=accent + (255,))
    base.alpha_composite(glow.filter(ImageFilter.GaussianBlur(36)))
    base.alpha_composite(depth)
    ImageDraw.Draw(base).text((x0, y), word, font=af, fill=accent, stroke_width=12, stroke_fill=INK)
    if tag:
        _chip(base, W / 2, int(y + pt * 1.12), tag, fonts, (255, 255, 255), INK, 44)


# ── 4. 카드형 (사진 없음) ───────────────────────────────────
def _card_bg(theme: dict) -> Image.Image:
    c1, c2 = _rgb(theme.get("c1", "#0B1F3A")), _rgb(theme.get("c2", "#1B4F8A"))
    g = Image.linear_gradient("L").resize((W, H))
    base = Image.composite(Image.new("RGB", (W, H), c2), Image.new("RGB", (W, H), c1), g).convert("RGBA")
    dots = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(dots)
    for yy in range(0, H, 44):
        for xx in range(0 if (yy // 44) % 2 else 22, W, 44):
            d.ellipse((xx - 3, yy - 3, xx + 3, yy + 3), fill=(255, 255, 255, 22))
    base.alpha_composite(dots)
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).ellipse((-200, 250, W + 200, 1250), fill=70)
    light = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    light.putalpha(m.filter(ImageFilter.GaussianBlur(180)))
    base.alpha_composite(light)
    return base


def _card(base, target: str, big: str, stamp: str, cta: str, fonts: dict, accent, who: str = "") -> None:
    rows = _rows(big)[:3]
    pt = _fit(rows, fonts["title"], W * 0.86, 190, 90)
    f = _f(fonts["title"], pt)
    lh = int(pt * 1.16)
    y = 600
    if target:
        y = 600 + _chip(base, W / 2, 470, target, fonts, (255, 255, 255), INK, 50, -2) - 110
    for r in rows:
        _line(base, W / 2, y, r, f, sw=12, outer=(255, 255, 255), ow=10)
        segs = parse_rich(r)
        if any(h for _, h in segs):  # 강조어 아래 손 밑줄
            x = W / 2 - _w(segs, f) / 2
            for t, h in segs:
                if h:
                    _underline(base, x + 6, x + f.getlength(t) - 6, y + pt * 1.08, accent, 18)
                x += f.getlength(t)
        y += lh
    if stamp:  # 오른쪽 위 도장
        s = 230
        layer = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        d.ellipse((6, 6, s - 6, s - 6), fill=accent + (255,), outline=INK, width=8)
        d.ellipse((24, 24, s - 24, s - 24), outline=INK, width=4)
        d.text((s / 2, s / 2), stamp, font=_f(fonts["title"], 84), fill=INK, anchor="mm")
        layer = layer.rotate(12, resample=Image.BICUBIC)
        base.alpha_composite(layer, (W - s - 50, 200))
    if who:  # 손글씨 반응 한 줄
        hf = _f(fonts["hand"], 120)
        hl = Image.new("RGBA", (W, 200), (0, 0, 0, 0))
        ImageDraw.Draw(hl).text((W / 2, 100), who, font=hf, fill=accent + (255,), anchor="mm", stroke_width=6,
                                stroke_fill=INK)
        base.alpha_composite(hl.rotate(-4, resample=Image.BICUBIC), (0, int(y + 30)))
    if cta:
        _chip(base, W / 2, SAFE_BOTTOM - 150, cta, fonts, accent, INK, 44)


# ── 입구 ───────────────────────────────────────────────────
def shorts_cover(out: Path, style: str, fonts: dict, photo=None, big: str = "", hook: str = "", who: str = "",
                 target: str = "", stamp: str = "", cta: str = "", brand: str = "SaGA 일터아카데미",
                 theme: dict | None = None, accent: str = "#FFD400") -> Path:
    """style: bubble · box · answer · card.
    bubble: big=말풍선 속 말, who=말한 사람 · box: hook=검은 상자, big=노란 상자 · answer: hook=질문, big=답 한 단어
    answer 의 target=답 아래 꼬리표 · card: target=대상 꼬리표, big=큰 두 줄, stamp=도장(예: 60초),
    who=손글씨 반응 한 줄, cta=아래 알약"""
    theme = theme or {}
    ac = _rgb(accent)
    base = _photo(photo) if style != "card" else None
    if base is None:
        base = _card_bg(theme)
        fb = []
    else:
        fb = _face_boxes(base)
        base = _spotlight(base, fb)
    if style == "bubble":
        _bubble(base, fb, big, who, fonts, ac)
    elif style == "box":
        _boxes(base, fb, hook, big, fonts, ac)
    elif style == "answer":
        _answer(base, fb, hook, big, fonts, ac, target)
    else:
        _card(base, target, big, stamp, cta, fonts, ac, who)
    _brand(base, brand, fonts)
    out.parent.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(out, quality=93)
    return out


# ── 영상에서 표지용 장면 고르기 ─────────────────────────────
def best_frame(video, out: Path, n: int = 8, need_face: bool = False) -> Path | None:
    """영상 여러 지점을 보고 얼굴이 가장 크게 나온 장면 한 장. 얼굴이 없으면 가운데 장면
    (need_face=True 면 None — 글자 화면만 있는 영상에서 글자 위에 글자가 겹치지 않게)."""
    from . import media
    try:
        dur = media.duration(str(video))
    except Exception:
        return None
    out.parent.mkdir(parents=True, exist_ok=True)
    best, best_area = None, -1
    for i in range(n):
        t = dur * (0.12 + 0.76 * i / max(1, n - 1))
        p = out.with_name(f"{out.stem}_{i}.jpg")
        try:
            media.run(["-ss", f"{t:.2f}", "-i", str(video), "-frames:v", "1", "-q:v", "2", str(p)])
            img = Image.open(p).convert("RGB")
        except Exception:
            continue
        area = sum((b[2] - b[0]) * (b[3] - b[1]) for b in _face_boxes(img)) / (img.width * img.height)
        if i == n // 2 and best is None:
            best = p
        if area > best_area:
            best, best_area = p, area
    if best is None or (need_face and best_area <= 0):
        return None
    Image.open(best).save(out, quality=94)
    return out


def star_word(text: str) -> str:
    """'일이 *선교*다!' → '선교'. 별표가 없으면 마지막 낱말."""
    import re
    m = re.search(r"\*([^*]+)\*", text or "")
    if m:
        return m.group(1)
    words = re.sub(r"\\n", " ", text or "").split()
    return words[-1].strip(".,!?") if words else ""
