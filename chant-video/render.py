# -*- coding: utf-8 -*-
"""말씀 챈트송 리릭비디오 프레임 렌더러 (1920x1080)"""
import math, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1920, 1080
CREAM      = (253, 248, 236)
INK        = (58, 47, 44)
PINK       = (255, 107, 157)
BLUE       = (77, 166, 232)
MINT       = (61, 214, 174)
ORANGE     = (255, 177, 61)
PURPLE     = (155, 127, 232)
PINK_SOFT  = (252, 226, 232)
BLUE_SOFT  = (214, 236, 252)
MINT_SOFT  = (208, 244, 233)

# 시리즈별 테마 — set_theme()으로 교체
THEME = {"logo": (255, 107, 157), "badge_fg": (77, 166, 232), "badge_bg": (214, 236, 252)}

def set_theme(logo, badge_fg, badge_bg):
    THEME["logo"], THEME["badge_fg"], THEME["badge_bg"] = logo, badge_fg, badge_bg

FB = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
FR = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
_cache = {}
def font(path, size):
    k = (path, size)
    if k not in _cache:
        _cache[k] = ImageFont.truetype(path, size, index=0)  # index 0 = KR
    return _cache[k]

def tw(draw, text, f):
    b = draw.textbbox((0, 0), text, font=f)
    return b[2] - b[0], b[3] - b[1]

# ---------- 배경 ----------
def gradient_bg():
    """크림 바탕 + 좌상단 핑크 / 우하단 민트 은은한 번짐"""
    lay = Image.new("RGB", (W // 8, H // 8), CREAM)
    d = ImageDraw.Draw(lay)
    for i in range(60, 0, -1):
        t = i / 60
        c = (int(CREAM[0] + (250 - CREAM[0]) * t * 0.45),
             int(CREAM[1] + (223 - CREAM[1]) * t * 0.45),
             int(CREAM[2] + (231 - CREAM[2]) * t * 0.45))
        d.ellipse([-40 - i * 2, -60 - i * 2, 90 + i * 2, 70 + i * 2], fill=c)
    for i in range(60, 0, -1):
        t = i / 60
        c = (int(CREAM[0] + (216 - CREAM[0]) * t * 0.35),
             int(CREAM[1] + (245 - CREAM[1]) * t * 0.35),
             int(CREAM[2] + (236 - CREAM[2]) * t * 0.35))
        d.ellipse([W // 8 - 90 - i * 2, H // 8 - 70 - i * 2,
                   W // 8 + 40 + i * 2, H // 8 + 60 + i * 2], fill=c)
    return lay.filter(ImageFilter.GaussianBlur(6)).resize((W, H), Image.LANCZOS)

# ---------- 데코 도형 ----------
def cross(d, x, y, s, c, a=255):
    t = s * 0.34
    d.rounded_rectangle([x - t / 2, y - s / 2, x + t / 2, y + s / 2], radius=t * 0.28, fill=c + (a,))
    d.rounded_rectangle([x - s / 2, y - t / 2, x + s / 2, y + t / 2], radius=t * 0.28, fill=c + (a,))

def heart(d, x, y, s, c, a=255):
    r = s * 0.30
    d.ellipse([x - s / 2, y - s / 2, x - s / 2 + r * 2, y - s / 2 + r * 2], fill=c + (a,))
    d.ellipse([x + s / 2 - r * 2, y - s / 2, x + s / 2, y - s / 2 + r * 2], fill=c + (a,))
    d.polygon([(x - s / 2, y - s / 2 + r), (x + s / 2, y - s / 2 + r), (x, y + s / 2)], fill=c + (a,))

def star(d, x, y, s, c, a=255):
    pts = []
    for i in range(10):
        ang = math.pi / 2 + i * math.pi / 5
        r = s / 2 if i % 2 == 0 else s / 4.6
        pts.append((x + r * math.cos(ang), y - r * math.sin(ang)))
    d.polygon(pts, fill=c + (a,))

def note(d, x, y, s, c, a=255):
    d.ellipse([x - s * 0.32, y + s * 0.10, x + s * 0.10, y + s * 0.46], fill=c + (a,))
    d.rounded_rectangle([x + s * 0.02, y - s * 0.50, x + s * 0.13, y + s * 0.30], radius=s * 0.05, fill=c + (a,))
    d.polygon([(x + s * 0.13, y - s * 0.50), (x + s * 0.42, y - s * 0.34),
               (x + s * 0.42, y - s * 0.18), (x + s * 0.13, y - s * 0.34)], fill=c + (a,))

def dot(d, x, y, s, c, a=255):
    d.ellipse([x - s / 2, y - s / 2, x + s / 2, y + s / 2], fill=c + (a,))

SHAPES = [cross, heart, star, note, dot]
COLORS = [PINK, BLUE, MINT, ORANGE, PURPLE]

def decorate(bg, seed):
    """중앙 텍스트·로고·뱃지·하단 안내를 피해 가장자리에만 파스텔 도형 배치"""
    rnd = random.Random(seed)
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    zones = [(215, 195, W - 215, H - 165),
             (40, 30, 760, 200),
             (W - 470, 30, W - 40, 200),
             (620, H - 175, W - 620, H - 60)]
    placed, tries = [], 0
    while len(placed) < 26 and tries < 6000:
        tries += 1
        x = rnd.randint(40, W - 40); y = rnd.randint(30, H - 30)
        s = rnd.choice([26, 34, 42, 52, 62, 74])
        if any(z[0] - s < x < z[2] + s and z[1] - s < y < z[3] + s for z in zones):
            continue
        if any((x - px) ** 2 + (y - py) ** 2 < (s / 2 + ps / 2 + 26) ** 2 for px, py, ps in placed):
            continue
        placed.append((x, y, s))
        SHAPES[rnd.randrange(5)](d, x, y, s, COLORS[rnd.randrange(5)], rnd.choice([210, 235, 255]))
    out = bg.convert("RGBA")
    out.alpha_composite(lay)
    return out.convert("RGB")

# ---------- 고정 헤더 ----------
def header(img, title, badge, letter="A"):
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([78, 62, 168, 152], radius=26, fill=THEME["logo"])
    fa = font(FB, 58)
    w, h = tw(d, letter, fa)
    d.text((123 - w / 2, 107 - h / 2 - 8), letter, font=fa, fill=(255, 255, 255))
    d.text((196, 78), title, font=font(FB, 56), fill=INK)
    fb_ = font(FB, 30)
    bw, _ = tw(d, badge, fb_)
    x1 = W - 96 - bw - 56
    d.rounded_rectangle([x1, 74, W - 96, 136], radius=31, fill=THEME["badge_bg"])
    d.text((x1 + 28, 90), badge, font=fb_, fill=THEME["badge_fg"])
    return img

# ---------- 절 색상 (절 번호 순환) ----------
_VCYCLE = [(PINK, PINK_SOFT), (BLUE, BLUE_SOFT), (MINT, MINT_SOFT), (ORANGE, (255, 236, 206))]

class _VColMap(dict):
    def __missing__(self, n):
        return _VCYCLE[(int(n) - 1) % 4]

VCOL = _VColMap()

# ---------- 본문 한 줄 ----------
def draw_line(base, verse, text, progress=1.0):
    """progress 0→1 : 페이드인 + 살짝 떠오르기. '|' 는 의미 단위 줄바꿈"""
    img = base.copy()
    d = ImageDraw.Draw(img)
    e = 1 - (1 - progress) ** 3
    alpha = int(255 * min(1.0, e * 1.15))
    lift = int(34 * (1 - e))
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)

    ftop = font(FB, 46)
    top = f"{verse['n']}절  |  {verse['ref']}"
    w, _ = tw(d, top, ftop)
    od.text(((W - w) / 2, 232 + lift // 2), top, font=ftop, fill=THEME["badge_fg"] + (int(alpha * 0.92),))

    fth = font(FB, 27)
    tw_, _ = tw(d, verse['theme'], fth)
    px = (W - tw_ - 56) / 2
    od.rounded_rectangle([px, 306 + lift // 2, px + tw_ + 56, 362 + lift // 2],
                         radius=28, fill=THEME["badge_bg"] + (int(alpha * 0.9),))
    od.text((px + 28, 319 + lift // 2), verse['theme'], font=fth,
            fill=THEME["badge_fg"] + (int(alpha * 0.95),))

    parts = [p.strip() for p in text.split("|") if p.strip()]
    maxw = W - 300
    size = 104 if len(parts) <= 2 else 88
    while size > 52:
        f = font(FB, size)
        if all(tw(d, p, f)[0] <= maxw for p in parts): break
        size -= 4
    f = font(FB, size)
    lh = int(size * 1.44)
    y0 = 655 - lh * len(parts) / 2 + lift
    for i, ln in enumerate(parts):
        lw, _ = tw(d, ln, f)
        od.text(((W - lw) / 2, y0 + i * lh), ln, font=f, fill=INK + (alpha,))

    ffo = font(FB, 26)
    foot = "말씀을 보고 · 듣고 · 따라 외워요!"
    fw, _ = tw(d, foot, ffo)
    fx = (W - fw - 64) / 2
    od.rounded_rectangle([fx, H - 148, fx + fw + 64, H - 88], radius=30, fill=(255, 243, 214, 235))
    od.text((fx + 32, H - 134), foot, font=ffo, fill=(190, 138, 40, 255))

    out = img.convert("RGBA"); out.alpha_composite(ov)
    return out.convert("RGB")

def draw_intro(base, data, alpha=255):
    """제목 + 뱃지 + 절 목록 (인트로/아웃트로 공용)"""
    img = base.copy()
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
    d = ImageDraw.Draw(img)
    ft = font(FB, 120)
    w, _ = tw(d, data["title"], ft)
    od.text(((W - w) / 2, 176), data["title"], font=ft, fill=INK + (alpha,))
    fb_ = font(FB, 54)
    bw, _ = tw(d, data["badge"], fb_)
    bx = (W - bw - 84) / 2
    od.rounded_rectangle([bx, 350, bx + bw + 84, 448], radius=49, fill=THEME["badge_bg"] + (alpha,))
    od.text((bx + 42, 366), data["badge"], font=fb_, fill=THEME["badge_fg"] + (alpha,))
    fi = font(FB, 40)
    for i, v in enumerate(data["verses"]):
        edge, fill = VCOL[v["n"]]
        t = f"{v['n']}절   {v['ref']}"
        iw, _ = tw(d, t, fi)
        x = (W - iw - 90) / 2; y = 520 + i * 108
        od.rounded_rectangle([x, y, x + iw + 90, y + 84], radius=42,
                             fill=fill + (alpha,), outline=edge + (alpha,), width=3)
        od.text((x + 45, y + 18), t, font=fi, fill=INK + (alpha,))
    ffo = font(FB, 30)
    foot = "말씀 챈트송 · 함께 따라 불러요"
    fw, _ = tw(d, foot, ffo)
    od.text(((W - fw) / 2, 968), foot, font=ffo, fill=(150, 128, 118, alpha))
    out = img.convert("RGBA"); out.alpha_composite(ov)
    return out.convert("RGB")

def draw_ref(base, verse, progress=1.0):
    """장절 낭독 구간 화면"""
    img = base.copy(); d = ImageDraw.Draw(img)
    e = 1 - (1 - progress) ** 3
    a = int(255 * min(1.0, e * 1.15)); lift = int(30 * (1 - e))
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
    col, soft = VCOL[verse["n"]]

    fn = font(FB, 92)
    t1 = f"{verse['n']}절"
    w1, _ = tw(d, t1, fn)
    bx = (W - w1 - 120) / 2
    od.rounded_rectangle([bx, 330 + lift, bx + w1 + 120, 490 + lift], radius=76,
                         fill=soft + (a,), outline=col + (a,), width=4)
    od.text((bx + 60, 352 + lift), t1, font=fn, fill=col + (a,))

    fr = font(FB, 108)
    w2, _ = tw(d, verse["ref"], fr)
    od.text(((W - w2) / 2, 530 + lift), verse["ref"], font=fr, fill=INK + (a,))

    ft = font(FB, 34)
    w3, _ = tw(d, verse["theme"], ft)
    px = (W - w3 - 64) / 2
    od.rounded_rectangle([px, 700 + lift, px + w3 + 64, 768 + lift], radius=34,
                         fill=THEME["badge_bg"] + (int(a * 0.9),))
    od.text((px + 32, 715 + lift), verse["theme"], font=ft, fill=THEME["badge_fg"] + (a,))

    out = img.convert("RGBA"); out.alpha_composite(ov)
    return out.convert("RGB")

def draw_gap(base, nxt, verses, progress=1.0):
    """간주 화면 (다음 절 예고)"""
    img = base.copy(); d = ImageDraw.Draw(img)
    a = int(255 * min(1.0, (1 - (1 - progress) ** 3) * 1.15))
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
    fm = font(FB, 96)
    m = "♪   ♫   ♪"
    wm, _ = tw(d, m, fm)
    od.text(((W - wm) / 2, 430), m, font=fm, fill=THEME["logo"] + (int(a * 0.75),))
    if nxt:
        v = next(x for x in verses if x["n"] == nxt)
        col, soft = VCOL[nxt]
        ft = font(FB, 44)
        t = f"다음  ·  {v['n']}절  {v['ref']}"
        wt, _ = tw(d, t, ft)
        px = (W - wt - 80) / 2
        od.rounded_rectangle([px, 600, px + wt + 80, 686], radius=43,
                             fill=soft + (a,), outline=col + (a,), width=3)
        od.text((px + 40, 616), t, font=ft, fill=INK + (a,))
    out = img.convert("RGBA"); out.alpha_composite(ov)
    return out.convert("RGB")

def make_bases(title="새로운 삶", badge="1-4절", letter="A"):
    bg = gradient_bg()
    bases = {}
    for i in range(6):
        bases[i] = header(decorate(bg, 1000 + i * 37), title, badge, letter)
    bases["intro"] = decorate(bg, 777)
    return bases
