"""7기 모집 타이포그래피 쇼츠(9:16) — 글자 모션(키네틱 타이포) + AI 내레이션 + 음악.
  단어가 하나씩 튀어 오르고(pop) · 줄이 왼쪽에서 닦여 나오고(wipe) · 좌우에서 밀려 들어오고(slide)
  · 숫자 카운트업 · 도장(stamp) 효과. 배경은 별 하늘이 천천히 당겨진다.
사용: cd yt-studio/pipeline && python jobs/7기홍보/typo_shorts.py [bgm.mp3]        → output/타이포형_shorts.mp4
      python jobs/7기홍보/typo_shorts.py thumbs                                    → output/타이포_썸네일_*.jpg"""
from __future__ import annotations

import math
import random
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import typo  # noqa: E402  (16:9 판과 색·ease 공유)
from typo import BLUE, GOLD, GREY, PURPLE, WHITE, F, ease  # noqa: E402
from ytauto import media, shorts, tts  # noqa: E402
from ytauto.config import load_config  # noqa: E402
from ytauto.fonts import font_set  # noqa: E402

ROOT = Path("projects/saga/recruit/7기홍보영상")
A, W = ROOT / "assets", ROOT / "typo_shorts_work"
FPS, XF = 30, 0.4
WD, HT = 1080, 1920
X0 = 90          # 본문 왼쪽 여백
SAFE_TOP, SAFE_BOT = 260, 1560   # 유튜브 쇼츠 UI 에 가려지지 않는 세로 구간


def back(x: float) -> float:
    """살짝 넘쳤다 돌아오는 ease-out-back (0→1, 최대 ≈1.1)."""
    x = max(0.0, min(1.0, x))
    c1 = 1.70158
    return 1 + (c1 + 1) * (x - 1) ** 3 + c1 * (x - 1) ** 2


def background() -> Image.Image:
    g = Image.linear_gradient("L").resize((WD + 120, HT + 200))
    bg = Image.composite(Image.new("RGB", g.size, (10, 20, 46)), Image.new("RGB", g.size, (5, 8, 18)), g)
    d = ImageDraw.Draw(bg)
    rnd = random.Random(7)
    for _ in range(520):
        x, y = rnd.randrange(bg.width), rnd.randrange(bg.height)
        r = rnd.choice([1, 1, 1, 2, 2])
        c = rnd.randrange(90, 210)
        d.ellipse((x - r, y - r, x + r, y + r), fill=(c, c, min(255, c + 30)))
    return bg


def bg_frame(bg: Image.Image, p: float) -> Image.Image:
    """장면 진행 p(0→1) 에 따라 별 하늘을 아주 천천히 당긴다."""
    s = 1.0 + 0.05 * p
    cw, ch = int(WD / s), int(HT / s)
    cx, cy = bg.width // 2, bg.height // 2
    return bg.crop((cx - cw // 2, cy - ch // 2, cx - cw // 2 + cw, cy - ch // 2 + ch)).resize((WD, HT), Image.BILINEAR)


def timg(text: str, font: ImageFont.FreeTypeFont, color=WHITE, accent=GOLD) -> Image.Image:
    """*별표* 부분만 강조색인 글자 그림 (여백 6px)."""
    parts = text.split("*")
    w = int(sum(font.getlength(p) for p in parts)) + 12
    asc, desc = font.getmetrics()
    im = Image.new("RGBA", (max(w, 1), asc + desc + 12), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    x = 6
    for i, p in enumerate(parts):
        if p:
            d.text((x, 6), p, font=font, fill=(accent if i % 2 else color) + (255,))
            x += font.getlength(p)
    return im


def put(layer: Image.Image, im: Image.Image, cx: float, cy: float, scale: float = 1.0, alpha: float = 1.0,
        rot: float = 0.0) -> None:
    if alpha <= 0.01 or scale <= 0.01:
        return
    if abs(scale - 1) > 0.003:
        im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.LANCZOS)
    if rot:
        im = im.rotate(rot, resample=Image.BICUBIC, expand=True)
    if alpha < 0.995:
        im = im.copy()
        im.putalpha(im.split()[3].point(lambda v: int(v * alpha)))
    layer.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))


# ───────────────────────── 글자 모션 ─────────────────────────
def pop_words(layer, line: str, font, y: float, t: float, t0: float, stagger: float = 0.16, x: float | None = None,
              underline: bool = True) -> float:
    """단어가 차례로 커지며 튀어 오른다. 강조 단어 아래엔 금색 밑줄이 쓸려 나온다. 마지막 단어가 끝나는 시각을 돌려준다."""
    words = line.split(" ")
    ims = [timg(w, font) for w in words]
    sp = font.getlength(" ")
    total = sum(im.width - 12 for im in ims) + sp * (len(words) - 1)
    cx = (WD - total) / 2 if x is None else x
    d = ImageDraw.Draw(layer)
    end = t0
    for i, (w, im) in enumerate(zip(words, ims)):
        ts = t0 + i * stagger
        u = (t - ts) / 0.42
        s = 0.55 + 0.45 * back(u)
        a = min(1.0, max(0.0, u * 2.2))
        put(layer, im, cx + (im.width - 12) / 2, y + im.height / 2 + (1 - ease(t, ts, 0.42)) * 26, s, a)
        if underline and "*" in w:
            uw = ease(t, ts + 0.35, 0.4) * (im.width - 12)
            d.rounded_rectangle((cx, y + im.height - 4, cx + uw, y + im.height + 6), 5, fill=GOLD + (220,))
        cx += im.width - 12 + sp
        end = ts + 0.42
    return end


def wipe_line(layer, line: str, font, x: float, y: float, t: float, t0: float, d_: float = 0.5, color=WHITE) -> None:
    """왼쪽에서 오른쪽으로 닦여 나오며 끝에 금색 커서가 따라간다."""
    im = timg(line, font, color)
    p = ease(t, t0, d_)
    if p <= 0:
        return
    w = max(1, int(im.width * p))
    layer.alpha_composite(im.crop((0, 0, w, im.height)), (int(x), int(y)))
    if p < 1:
        ImageDraw.Draw(layer).rectangle((x + w, y + 10, x + w + 6, y + im.height - 10), fill=GOLD + (255,))


def slide_line(layer, line: str, font, cx: float, y: float, t: float, t0: float, side: int = 1, color=WHITE,
               d_: float = 0.5) -> None:
    """좌(-1)/우(+1)에서 밀려 들어와 멈춘다."""
    im = timg(line, font, color)
    p = ease(t, t0, d_)
    put(layer, im, cx + side * (1 - p) * 260, y + im.height / 2, 1.0, p)


def stamp(layer, text: str, font, cx: float, cy: float, t: float, t0: float, rot: float = -7.0) -> None:
    """도장 찍듯 크게 나타나 제자리로."""
    u = (t - t0) / 0.32
    if u <= 0:
        return
    p = back(u)
    pad = 26
    tw = font.getlength(text)
    asc, desc = font.getmetrics()
    box = Image.new("RGBA", (int(tw + pad * 2), asc + desc + pad), (0, 0, 0, 0))
    bd = ImageDraw.Draw(box)
    bd.rounded_rectangle((0, 0, box.width - 1, box.height - 1), 18, outline=GOLD + (255,), width=6)
    bd.text((pad, pad / 2), text, font=font, fill=GOLD + (255,))
    put(layer, box, cx, cy, 2.6 - 1.6 * p, min(1.0, u * 1.5), rot)


# ───────────────────────── 장면 ─────────────────────────
class Scene:
    kicker = ""
    caption = ""
    say = ""
    chrome_on = True

    def __init__(self, dur: float):
        self.dur = dur

    def chrome(self, d: ImageDraw.ImageDraw, layer: Image.Image, t: float, fonts: dict) -> None:
        if not self.chrome_on:
            return
        sf = F(fonts["bold"], 24)
        d.text((WD / 2, 150), "SAGA 2027  ·  일터선교 & 글로벌네트워크아카데미 7기 모집", font=sf, fill=GREY + (255,), anchor="ma")
        d.line((72, 196, WD - 72, 196), fill=(60, 70, 100, 255), width=1)
        if self.kicker:
            a = ease(t, 0.05, 0.4)
            d.rectangle((X0, 296, X0 + 10, 306), fill=GOLD + (int(255 * a),))
            d.text((X0 + 24, 286), self.kicker, font=F(fonts["bold"], 26), fill=GOLD + (int(255 * a),))
        if self.caption:
            a = ease(t, 0.9, 0.5)
            cf = F(fonts["bold"], 36)
            lines = _wrap(self.caption, cf, WD - 2 * 60)
            lh = 52
            bh = lh * len(lines) + 24
            y0 = SAFE_BOT - bh
            tw = max(cf.getlength(ln) for ln in lines)
            x0 = WD / 2 - tw / 2 - 30
            d.rounded_rectangle((x0, y0, x0 + tw + 60, y0 + bh), 14, fill=GOLD + (int(245 * a),))
            for k, ln in enumerate(lines):
                d.text((WD / 2, y0 + 12 + k * lh + lh / 2), ln, font=cf, fill=(20, 24, 36, int(255 * a)), anchor="mm")

    def draw(self, d, layer, t, fonts):
        pass


def _wrap(text: str, font, maxw: float) -> list[str]:
    words, lines, cur = text.split(" "), [], ""
    for w in words:
        cand = (cur + " " + w).strip()
        if font.getlength(cand) <= maxw or not cur:
            cur = cand
        else:
            lines.append(cur); cur = w
    lines.append(cur)
    return lines


class Opening(Scene):
    chrome_on = False

    def draw(self, d, layer, t, fonts):
        p = ease(t, 0.05, 1.0)
        half = (WD / 2 - 110) * p
        d.line((WD / 2 - half, HT / 2, WD / 2 + half, HT / 2), fill=(120, 150, 220, 255), width=2)
        a = ease(t, 0.5, 0.6)
        d.text((WD / 2, HT / 2 - 40), "SARANG GLOBAL ACADEMY  ·  2027", font=F(fonts["bold"], 30), fill=GREY + (int(255 * a),), anchor="ms")


class Pop(Scene):
    """줄마다 단어가 튀어 오르는 큰 제목."""
    def __init__(self, dur, lines, pt=112, kicker="", caption="", say="", pre=""):
        super().__init__(dur)
        self.lines, self.pt, self.kicker, self.caption, self.say, self.pre = lines, pt, kicker, caption, say, pre

    def draw(self, d, layer, t, fonts):
        f = F(fonts["bold"], self.pt)
        lh = int(self.pt * 1.22)
        y = (SAFE_TOP + SAFE_BOT) / 2 - lh * len(self.lines) / 2 - 20
        if self.pre:
            a = ease(t, 0.1)
            d.text((WD / 2, y - 60 + (1 - a) * 16), self.pre, font=F(fonts["subtitle"], 34), fill=GREY + (int(255 * a),), anchor="ms")
        t0 = 0.3
        for ln in self.lines:
            t0 = pop_words(layer, ln, f, y, t, t0) + 0.05
            y += lh


class Wipe(Scene):
    """왼쪽 정렬 여러 줄이 차례로 닦여 나온다 (문장 선언)."""
    def __init__(self, dur, lines, pt=100, kicker="", caption="", say=""):
        super().__init__(dur)
        self.lines, self.pt, self.kicker, self.caption, self.say = lines, pt, kicker, caption, say

    def draw(self, d, layer, t, fonts):
        f = F(fonts["bold"], self.pt)
        lh = int(self.pt * 1.25)
        y = (SAFE_TOP + SAFE_BOT) / 2 - lh * len(self.lines) / 2
        for i, ln in enumerate(self.lines):
            wipe_line(layer, ln, f, X0, y + i * lh, t, 0.3 + i * 0.55, 0.55)


class Slide(Scene):
    """좌우 번갈아 밀려 들어오는 항목들 + 위 소제목."""
    def __init__(self, dur, title, items, pt=66, kicker="", caption="", say=""):
        super().__init__(dur)
        self.title, self.items, self.pt, self.kicker, self.caption, self.say = title, items, pt, kicker, caption, say

    def draw(self, d, layer, t, fonts):
        tf = F(fonts["bold"], 84)
        a = ease(t, 0.2)
        put(layer, timg(self.title, tf), WD / 2, 470 + (1 - a) * 24, 1.0, a)
        f = F(fonts["bold"], self.pt)
        y = 640
        for i, it in enumerate(self.items):
            side = 1 if i % 2 == 0 else -1
            slide_line(layer, it, f, WD / 2, y + i * 130, t, 0.7 + i * 0.35, side)
            on = ease(t, 0.7 + i * 0.35 + 0.35, 0.3)
            d.line((WD / 2 - 40, y + i * 130 + 112, WD / 2 + 40, y + i * 130 + 112), fill=GOLD + (int(150 * on),), width=2)


class Stats(Scene):
    """세로로 쌓인 큰 숫자 카운트업."""
    def __init__(self, dur, stats, kicker="", caption="", say=""):
        super().__init__(dur)
        self.stats, self.kicker, self.caption, self.say = stats, kicker, caption, say

    def draw(self, d, layer, t, fonts):
        bf, uf, lf = F(fonts["bold"], 220), F(fonts["bold"], 64), F(fonts["subtitle"], 34)
        n = len(self.stats)
        block = 330
        y = (SAFE_TOP + SAFE_BOT) / 2 - block * n / 2 + 30
        for i, (num, unit, label) in enumerate(self.stats):
            t0 = 0.3 + i * 0.6
            a = ease(t, t0, 0.4)
            k = ease(t, t0, 1.2)
            s = f"{int(round(num * k)):,}"
            tw = bf.getlength(s) + 16 + uf.getlength(unit)
            x = (WD - tw) / 2
            yy = y + i * block + (1 - a) * 30
            d.text((x, yy), s, font=bf, fill=WHITE + (int(255 * a),))
            d.text((x + bf.getlength(s) + 16, yy + 130), unit, font=uf, fill=GOLD + (int(255 * a),))
            d.text((WD / 2, yy + 262), label, font=lf, fill=GREY + (int(255 * a),), anchor="ma")


class Money(Scene):
    def __init__(self, dur, kicker="", caption="", say=""):
        super().__init__(dur)
        self.kicker, self.caption, self.say = kicker, caption, say

    def draw(self, d, layer, t, fonts):
        f1, f2, f3 = F(fonts["bold"], 76), F(fonts["bold"], 150), F(fonts["subtitle"], 38)
        cy = (SAFE_TOP + SAFE_BOT) / 2
        a = ease(t, 0.2)
        put(layer, timg("학기당 등록금", f1), WD / 2, cy - 330 + (1 - a) * 20, 1.0, a)
        pop_words(layer, "*125만원*", f2, cy - 250, t, 0.6, underline=False)
        b = ease(t, 1.4)
        d.text((WD / 2, cy + 10), "거점캠퍼스 · 목회자 · 선교사 · 30대 청년", font=f3, fill=GREY + (int(255 * b),), anchor="ma")
        f4 = F(fonts["bold"], 120)
        im = timg("*75만원*", f4, accent=BLUE)
        u = ease(t, 1.7, 0.5)
        put(layer, im, WD / 2, cy + 160 + (1 - u) * 30, 1.0, u)
        c = ease(t, 2.4)
        d.text((WD / 2, cy + 300), "각 교회 50% 장학금 지급 권장", font=F(fonts["subtitle"], 32), fill=GREY + (int(255 * c),), anchor="ma")


class Dates(Scene):
    def __init__(self, dur, kicker="", caption="", say=""):
        super().__init__(dur)
        self.kicker, self.caption, self.say = kicker, caption, say

    def draw(self, d, layer, t, fonts):
        cy = (SAFE_TOP + SAFE_BOT) / 2
        a = ease(t, 0.2)
        put(layer, timg("원서 접수", F(fonts["bold"], 80)), WD / 2, cy - 320 + (1 - a) * 20, 1.0, a)
        f = F(fonts["bold"], 128)
        slide_line(layer, "10.1", f, WD / 2 - 230, cy - 250, t, 0.5, -1)
        b = ease(t, 0.8, 0.3)
        d.text((WD / 2, cy - 160), "~", font=F(fonts["bold"], 90), fill=GOLD + (int(255 * b),), anchor="mm")
        slide_line(layer, "11.30", f, WD / 2 + 230, cy - 250, t, 0.7, 1)
        stamp(layer, "입학전형료 면제", F(fonts["bold"], 52), WD / 2, cy + 20, t, 1.5)
        c = ease(t, 2.3)
        lf = F(fonts["subtitle"], 38)
        for k, ln in enumerate(["2차 접수  12.1 ~ 12.31", "면접  2027.1.9(토)  ·  개강  2.16"]):
            d.text((WD / 2, cy + 190 + k * 58 + (1 - c) * 14), ln, font=lf, fill=GREY + (int(255 * c),), anchor="ma")


class Apply(Scene):
    def __init__(self, dur, url, kicker="", caption="", say=""):
        super().__init__(dur)
        self.url, self.kicker, self.caption, self.say = url, kicker, caption, say
        import qrcode
        q = qrcode.QRCode(border=1, box_size=10)
        q.add_data(url); q.make(fit=True)
        self.qr = q.make_image(fill_color="black", back_color="white").convert("RGB").resize((380, 380), Image.NEAREST)

    def draw(self, d, layer, t, fonts):
        cy = (SAFE_TOP + SAFE_BOT) / 2
        f = F(fonts["bold"], 124)
        pop_words(layer, "지금", f, cy - 520, t, 0.3, underline=False)
        pop_words(layer, "*지원*하세요.", f, cy - 370, t, 0.6, underline=False)
        b = ease(t, 1.2)
        box = (WD / 2 - 215, cy - 160, WD / 2 + 215, cy + 270)
        d.rounded_rectangle(box, 24, fill=(255, 255, 255, int(255 * b)))
        qr = self.qr.copy(); qr.putalpha(int(255 * b))
        layer.alpha_composite(qr, (int(box[0] + 25), int(box[1] + 25)))
        c = ease(t, 1.6)
        d.text((WD / 2, cy + 330), "saga121.com  →  입학전형  →  입학신청", font=F(fonts["subtitle"], 34), fill=GREY + (int(255 * c),), anchor="ma")
        d.text((WD / 2, cy + 385), "카카오톡 ‘사랑글로벌아카데미’  ·  02-3495-8300", font=F(fonts["subtitle"], 34), fill=GREY + (int(255 * c),), anchor="ma")


class Closing(Scene):
    def __init__(self, dur, say=""):
        super().__init__(dur)
        self.say = say

    def draw(self, d, layer, t, fonts):
        cx, cy, r = WD / 2, 700, 170
        for k in range(0, int(360 * min(1, t / 1.4)), 2):
            ang = math.radians(k - 90)
            d.ellipse((cx + r * math.cos(ang) - 3, cy + r * math.sin(ang) - 3, cx + r * math.cos(ang) + 3, cy + r * math.sin(ang) + 3), fill=GOLD + (200,))
        a = ease(t, 0.2, 0.8)
        logo = Image.open(A / "saga_logo_w.png").convert("RGBA")
        logo = logo.resize((300, int(logo.height * 300 / logo.width)), Image.LANCZOS)
        put(layer, logo, cx, cy, 1.0, a)
        f = F(fonts["bold"], 104)
        pop_words(layer, "당신의 일터도", f, 1000, t, 1.0, underline=False)
        pop_words(layer, "*선교지*입니다", f, 1130, t, 1.5)
        c = ease(t, 2.2)
        d.text((cx, 1320), "2027 일터선교 & 글로벌네트워크아카데미 7기", font=F(fonts["subtitle"], 34), fill=GREY + (int(255 * c),), anchor="ma")
        d.text((cx, 1372), "원서 접수 10.1 ~ 11.30", font=F(fonts["subtitle"], 34), fill=GREY + (int(255 * c),), anchor="ma")


def scenes() -> list[Scene]:
    return [
        Opening(1.4),
        Pop(5.0, ["주일의 믿음은", "*월요일*에도", "살아 있습니까?"], pt=118, pre="하나의 질문",
            say="주일의 믿음은, 월요일에도 살아 있습니까?"),
        Wipe(5.0, ["일터는", "삶의 현장이고,", "그곳이 곧", "*선교지*입니다."], pt=104,
             caption="SaGA 일터선교 & 글로벌네트워크아카데미 2027학년도 7기 모집",
             say="일터는 삶의 현장이고, 그곳이 곧 선교지입니다."),
        Slide(5.5, "우리가 *준비한* 것", ["1년 3학기 · 학기당 10주", "화 저녁 7~10시 | 토 오전 9~12시", "강남캠퍼스 + 5개 권역 거점", "온전론 → 일터신학 → 선교전략"],
              pt=54, kicker="01 / PROGRAM", caption="직장을 그만두지 않고, 일하면서 배웁니다",
              say="1년 3학기. 화요일 저녁 또는 토요일 오전, 직장을 다니면서 배웁니다."),
        Stats(5.0, [(230, "명", "2027학년도 모집 정원"), (5, "개 권역", "서울·수도권 / 대전·충청 / 군산·호남 / 부산·영남 / 강원·제주·해외")],
              kicker="02 / PARTICIPATION", caption="기업가 · 직장인 · 공무원 · 자영업자 · 크리스천 청년",
              say="전국 다섯 권역에서 이백삼십 명을 모집합니다."),
        Money(5.5, kicker="03 / TUITION", caption="세례(입교) 후 3년 이상 · 학사 이상 지원 가능",
              say="학기당 백이십오만 원, 거점캠퍼스와 삼십 대 청년은 칠십오만 원입니다."),
        Dates(5.5, kicker="04 / SCHEDULE", caption="1차 접수 기간에 지원하면 전형료가 면제됩니다",
              say="접수는 시월 일일부터 십일월 삼십일까지, 이 기간엔 전형료가 면제됩니다."),
        Apply(5.0, "https://www.saga121.com/admission-guide/register/", kicker="05 / APPLY",
              caption="QR 을 찍으면 온라인 입학원서로 바로 이동합니다",
              say="지금 지원하세요. saga121.com, 또는 화면의 큐알코드로."),
        Closing(5.0, say="당신의 일터도, 선교지입니다."),
    ]


def render_scene(i: int, sc: Scene, fonts: dict, bg: Image.Image, extra: float) -> Path:
    fdir = W / f"s{i:02d}"
    if fdir.exists():
        shutil.rmtree(fdir)  # 지난 렌더의 남는 프레임이 섞이지 않게
    fdir.mkdir(parents=True, exist_ok=True)
    n = int((sc.dur + extra) * FPS)
    for k in range(n):
        t = min(k / FPS, sc.dur)
        layer = Image.new("RGBA", (WD, HT), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        sc.chrome(d, layer, t, fonts)
        sc.draw(d, layer, t, fonts)
        frame = bg_frame(bg, t / sc.dur)
        frame.paste(layer, (0, 0), layer)
        frame.save(fdir / f"f{k:04d}.jpg", quality=92)
    out = W / f"p{i:02d}.mp4"
    media.run(["-framerate", str(FPS), "-i", str(fdir / "f%04d.jpg"), "-f", "lavfi", "-t", f"{n / FPS:.3f}", "-i",
               "anullsrc=r=48000:cl=stereo", "-shortest", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
               "-c:a", "aac", str(out)])
    return out


def build(bgm: str) -> Path:
    cfg = load_config(None)
    fonts = font_set(cfg)
    W.mkdir(parents=True, exist_ok=True)
    bg = background()
    sc = scenes()
    tcfg = dict(cfg["tts"]); tcfg["voice"] = "ko-KR-InJoonNeural"; tcfg["rate"] = "+12%"  # 쇼츠는 조금 빠르게
    voices, t = [], 0.0
    for i, s in enumerate(sc):
        if s.say:
            mp3 = W / f"say{i:02d}.mp3"
            tts.synthesize(s.say, mp3, tcfg)
            s.dur = max(s.dur, media.duration(str(mp3)) + 1.0)
            voices.append((mp3, t + 0.5))
        t += s.dur
    print("scenes", [round(s.dur, 1) for s in sc], "total", round(t, 1), flush=True)
    parts = [render_scene(i, s, fonts, bg, 0 if i == len(sc) - 1 else XF) for i, s in enumerate(sc)]
    base = shorts.join_xfade(parts, W / "base.mp4", XF)
    total = media.duration(str(base))
    narration = W / "narration.wav"
    args = []
    for mp3, _ in voices:
        args += ["-i", str(mp3)]
    fil = "".join(f"[{k}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={int(st * 1000)}|{int(st * 1000)}[a{k}];"
                  for k, (_, st) in enumerate(voices))
    fil += "".join(f"[a{k}]" for k in range(len(voices))) + f"amix=inputs={len(voices)}:normalize=0,apad[mix]"
    media.run([*args, "-filter_complex", fil, "-map", "[mix]", "-t", f"{total:.3f}", str(narration)])
    out = ROOT / "output" / "타이포형_shorts.mp4"
    shorts.finish(base, out, [], audio=str(narration), bgm=bgm, bgm_volume=0.75, duck=True)
    # 표지 후보: 질문 장면이 다 뜬 프레임
    hook = sc[1]
    layer = Image.new("RGBA", (WD, HT), (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    hook.chrome(d, layer, 9, fonts); hook.draw(d, layer, 9, fonts)
    fr = bg_frame(bg, 0.5); fr.paste(layer, (0, 0), layer)
    fr.save(ROOT / "output" / "타이포형_shorts_표지프레임.jpg", quality=94)
    return out


# ───────────────────────── 썸네일 제안 ─────────────────────────
def _final(scene: Scene, fonts: dict, size: tuple[int, int], bg: Image.Image) -> Image.Image:
    layer = Image.new("RGBA", size, (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    scene.draw(d, layer, 9.0, fonts)
    fr = bg.copy(); fr.paste(layer, (0, 0), layer)
    return fr


def thumbs() -> list[Path]:
    """16:9 두 가지(타이포형 롱 영상용) + 9:16 한 가지(쇼츠 표지용)."""
    cfg = load_config(None)
    fonts = font_set(cfg)
    out = ROOT / "output"
    logo = Image.open(A / "saga_logo_w.png").convert("RGBA")
    res = []

    def wide(name: str, lines: list[str], pt: int, sub: str, tagline: str):
        bg = typo.background().convert("RGBA")
        d = ImageDraw.Draw(bg)
        f = F(fonts["bold"], pt)
        lh = int(pt * 1.1)
        y = 1080 / 2 - lh * len(lines) / 2 - 40
        for ln in lines:
            im = timg(ln, f)
            bg.alpha_composite(im, (int(120), int(y)))
            if "*" in ln:  # 강조 단어 밑줄
                pre = f.getlength(ln.split("*")[0]); aw = f.getlength(ln.split("*")[1])
                by = y + 6 + f.getmetrics()[0] + 6  # 기준선 바로 아래
                d.rounded_rectangle((120 + 6 + pre, by, 120 + 6 + pre + aw, by + 12), 6, fill=GOLD + (230,))
            y += lh
        d.text((120, y + 30), sub, font=F(fonts["subtitle"], 40), fill=GREY + (255,))
        # 오른쪽 위 로고, 아래 태그
        lg = logo.resize((260, int(logo.height * 260 / logo.width)), Image.LANCZOS)
        bg.alpha_composite(lg, (1920 - 120 - 260, 70))
        tf = F(fonts["bold"], 38)
        tw = tf.getlength(tagline)
        d.rounded_rectangle((1920 - 120 - tw - 56, 1080 - 150, 1920 - 120, 1080 - 78), 14, fill=GOLD + (255,))
        d.text((1920 - 120 - 28, 1080 - 114), tagline, font=tf, fill=(20, 24, 36, 255), anchor="rm")
        p = out / f"타이포_썸네일_{name}.jpg"
        bg.convert("RGB").save(p, quality=94)
        res.append(p)

    wide("A_질문", ["주일의 믿음은", "*월요일*에도", "살아 있습니까?"], 150, "일터선교 & 글로벌네트워크아카데미  ·  2027학년도 7기", "7기 모집  ·  10.1 ~ 11.30 전형료 면제")
    wide("B_선언", ["일터를", "새롭게", "*보다.*"], 190, "SaGA 일터선교 & 글로벌네트워크아카데미  ·  직장을 그만두지 않고 배우는 1년", "2027학년도 7기 모집  ·  230명")
    # 9:16 쇼츠 표지
    bg = bg_frame(background(), 0.4).convert("RGBA")
    d = ImageDraw.Draw(bg)
    f = F(fonts["bold"], 128)
    lines = ["주일의", "믿음은", "*월요일*에도", "살아", "있습니까?"]
    lh = 150
    y = 1920 / 2 - lh * len(lines) / 2 - 60
    for ln in lines:
        im = timg(ln, f)
        x = (1080 - im.width) / 2
        bg.alpha_composite(im, (int(x), int(y)))
        if "*" in ln:
            pre = f.getlength(ln.split("*")[0]); aw = f.getlength(ln.split("*")[1])
            by = y + 6 + f.getmetrics()[0] + 4
            d.rounded_rectangle((x + 6 + pre, by, x + 6 + pre + aw, by + 12), 6, fill=GOLD + (230,))
        y += lh
    lg = logo.resize((240, int(logo.height * 240 / logo.width)), Image.LANCZOS)
    bg.alpha_composite(lg, (int(540 - 120), 300))
    tf = F(fonts["bold"], 40)
    tag = "SaGA 7기 모집  ·  10.1 ~ 11.30"
    tw = tf.getlength(tag)
    d.rounded_rectangle((540 - tw / 2 - 30, 1470, 540 + tw / 2 + 30, 1546), 14, fill=GOLD + (255,))
    d.text((540, 1508), tag, font=tf, fill=(20, 24, 36, 255), anchor="mm")
    p = out / "타이포_썸네일_C_쇼츠표지.jpg"
    bg.convert("RGB").save(p, quality=94)
    res.append(p)
    return res


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "thumbs":
        for p in thumbs():
            print("THUMB", p, flush=True)
    else:
        bgm = sys.argv[1] if len(sys.argv) > 1 else str(A / "suno_quietly_joyful_journey.mp3")
        print("DONE", build(bgm), flush=True)
