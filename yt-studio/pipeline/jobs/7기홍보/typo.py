"""7기 모집 타이포그래피형 정보 영상 — 음성 없이 음악 + 글자 애니메이션 (행사 시상식 영상 참고, 2026-09-30).
  짙은 남색 별 배경 · 큰 제목(한 단어만 색 강조) · 아래 노란 한 줄 자막 · 섹션 번호 · 숫자 카운트 · 막대 · 타임라인 · QR.
사용: cd yt-studio/pipeline && python jobs/7기홍보/typo.py [bgm.wav|mp3]"""
from __future__ import annotations

import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from ytauto import media, shorts  # noqa: E402
from ytauto.config import load_config  # noqa: E402
from ytauto.fonts import font_set  # noqa: E402

ROOT = Path("projects/saga/recruit/7기홍보영상")
A, W = ROOT / "assets", ROOT / "typo_work"
FPS, XF = 30, 0.45
WD, HT = 1920, 1080
GOLD, BLUE, PURPLE, WHITE, GREY = (242, 193, 78), (90, 150, 255), (170, 140, 255), (245, 246, 250), (150, 158, 178)
X0 = 200  # 본문 왼쪽 여백 (가장자리 글자는 72)
HEAD_L = "SAGA 2027  ·  일터선교 & 글로벌네트워크아카데미"
HEAD_R = "7기 모집  ·  원서 접수 2026.10.1 ~ 11.30"


def F(path: str, pt: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, pt)


def ease(t: float, t0: float, d: float = 0.5) -> float:
    """t0 에서 시작해 d초 동안 0→1 (ease-out)."""
    x = max(0.0, min(1.0, (t - t0) / d))
    return 1 - (1 - x) ** 3


def background() -> Image.Image:
    g = Image.linear_gradient("L").resize((WD, HT))
    bg = Image.composite(Image.new("RGB", (WD, HT), (10, 20, 46)), Image.new("RGB", (WD, HT), (5, 8, 18)), g)
    d = ImageDraw.Draw(bg)
    rnd = random.Random(3)
    for _ in range(420):
        x, y = rnd.randrange(WD), rnd.randrange(HT)
        r = rnd.choice([1, 1, 1, 2])
        c = rnd.randrange(90, 200)
        d.ellipse((x - r, y - r, x + r, y + r), fill=(c, c, min(255, c + 30)))
    return bg


def rich(d: ImageDraw.ImageDraw, layer: Image.Image, xy, text: str, f, color=WHITE, accent=GOLD, alpha=1.0,
         anchor_left=True) -> float:
    """*별표* 단어만 강조색. 왼쪽 정렬. 폭을 돌려준다."""
    parts, x, y = text.split("*"), xy[0], xy[1]
    if not anchor_left:
        w = sum(f.getlength(p) for p in parts)
        x = xy[0] - w / 2
    for i, p in enumerate(parts):
        if not p:
            continue
        col = accent if i % 2 == 1 else color
        d.text((x, y), p, font=f, fill=col + (int(255 * alpha),))
        x += f.getlength(p)
    return x - xy[0]


class Scene:
    def __init__(self, dur: float, kicker: str, caption: str):
        self.dur, self.kicker, self.caption = dur, kicker, caption

    def chrome(self, d: ImageDraw.ImageDraw, t: float, fonts: dict) -> None:
        sf = F(fonts["bold"], 22)
        d.text((72, 46), HEAD_L, font=sf, fill=GREY + (255,))
        d.text((WD - 72, 46), HEAD_R, font=sf, fill=GREY + (255,), anchor="ra")
        d.line((72, 84, WD - 72, 84), fill=(60, 70, 100, 255), width=1)
        if self.kicker:
            kf = F(fonts["bold"], 24)
            d.rectangle((X0, 138, X0 + 10, 148), fill=GOLD + (255,))
            d.text((X0 + 24, 128), self.kicker, font=kf, fill=GOLD + (255,))
        if self.caption:
            a = ease(t, 0.9, 0.5)
            cf = F(fonts["subtitle"], 30)
            tw = cf.getlength(self.caption)
            x0, y0 = WD / 2 - tw / 2 - 26, 985
            d.rounded_rectangle((x0, y0, x0 + tw + 52, y0 + 56), 10, fill=GOLD + (int(240 * a),))
            d.text((WD / 2, y0 + 28), self.caption, font=cf, fill=(20, 24, 36, int(255 * a)), anchor="mm")

    def draw(self, d, layer, t, fonts):  # 장면별 구현
        pass


class Headline(Scene):
    """큰 제목 여러 줄 (줄마다 차례로 떠오름) + 작은 앞말."""
    def __init__(self, dur, kicker, caption, lines, pre="", pt=132, accent=GOLD, x=None, y=None):
        super().__init__(dur, kicker, caption)
        self.lines, self.pre, self.pt, self.accent, self.x, self.y = lines, pre, pt, accent, x, y

    def draw(self, d, layer, t, fonts):
        f = F(fonts["bold"], self.pt)
        lh = int(self.pt * 1.08)
        y0 = self.y if self.y is not None else (HT - lh * len(self.lines)) / 2 + 20
        bw = max(sum(f.getlength(pp) for pp in ln.split("*")) for ln in self.lines)
        x = self.x if self.x is not None else max(X0, (WD - bw) / 2)  # 가운데 블록
        if self.pre:
            a = ease(t, 0.1)
            d.text((x, y0 - 70 + (1 - a) * 20), self.pre, font=F(fonts["subtitle"], 34), fill=GREY + (int(255 * a),))
        for i, ln in enumerate(self.lines):
            a = ease(t, 0.35 + i * 0.28)
            rich(d, layer, (x, y0 + i * lh + (1 - a) * 40), ln, f, alpha=a, accent=self.accent)


class Bullets(Scene):
    """왼쪽 소제목 + 오른쪽 목록이 한 줄씩 켜진다 (참고 영상 'What we invited')."""
    def __init__(self, dur, kicker, caption, title, items, sub=""):
        super().__init__(dur, kicker, caption)
        self.title, self.items, self.sub = title, items, sub

    def draw(self, d, layer, t, fonts):
        a = ease(t, 0.2)
        rich(d, layer, (X0, 300 + (1 - a) * 30), self.title, F(fonts["bold"], 76), alpha=a)
        if self.sub:
            d.text((X0, 480), self.sub, font=F(fonts["subtitle"], 30), fill=GREY + (int(255 * a),))
        nf, itf = F(fonts["bold"], 26), F(fonts["bold"], 46)
        for i, it in enumerate(self.items):
            b = ease(t, 0.8 + i * 0.45)
            on = t > 0.8 + i * 0.45 + 0.3
            y = 250 + i * 96
            d.text((1010, y + 14), f"{i + 1:02d}", font=nf, fill=(GOLD if on else GREY) + (int(255 * b),))
            d.text((1080 + (1 - b) * 30, y), it, font=itf, fill=(WHITE if on else GREY) + (int(255 * b),))
            if on:
                d.rounded_rectangle((1060, y - 10, 1060 + itf.getlength(it) + 40, y + 62), 8, outline=GOLD + (60,), width=2)


class Stats(Scene):
    """큰 숫자 카운트업 여러 개."""
    def __init__(self, dur, kicker, caption, stats):
        super().__init__(dur, kicker, caption)
        self.stats = stats  # [(숫자, 단위, 설명)]

    def draw(self, d, layer, t, fonts):
        n = len(self.stats)
        colw = (WD - 2 * X0) / n
        bf, uf, lf = F(fonts["bold"], 200), F(fonts["bold"], 60), F(fonts["subtitle"], 34)
        for i, (num, unit, label) in enumerate(self.stats):
            t0 = 0.3 + i * 0.5
            a = ease(t, t0, 0.4)
            k = ease(t, t0, 1.3)
            val = int(round(num * k))
            x = X0 + i * colw
            y = 360 + (1 - a) * 40
            s = f"{val:,}"
            d.text((x, y), s, font=bf, fill=WHITE + (int(255 * a),))
            d.text((x + bf.getlength(s) + 14, y + 118), unit, font=uf, fill=GOLD + (int(255 * a),))
            d.text((x, y + 250), label, font=lf, fill=GREY + (int(255 * a),))


class Columns(Scene):
    """학기별 3열 카드: 색 꼬리표 + 과목이 차례로."""
    def __init__(self, dur, kicker, caption, cols):
        super().__init__(dur, kicker, caption)
        self.cols = cols  # [(꼬리표, 제목, 부제, 색, [과목...])]

    def draw(self, d, layer, t, fonts):
        n = len(self.cols)
        gap = 40
        cw = (WD - 260 - gap * (n - 1)) / n
        tf, hf, sf, itf = F(fonts["bold"], 24), F(fonts["bold"], 46), F(fonts["subtitle"], 28), F(fonts["subtitle"], 32)
        for i, (tag, title, sub, col, items) in enumerate(self.cols):
            x = 130 + i * (cw + gap)
            a = ease(t, 0.2 + i * 0.35)
            y = 200 + (1 - a) * 30
            d.rounded_rectangle((x, y, x + tf.getlength(tag) + 40, y + 44), 8, fill=col + (int(255 * a),))
            d.text((x + 20, y + 22), tag, font=tf, fill=(20, 24, 36, int(255 * a)), anchor="lm")
            d.text((x, y + 70), title, font=hf, fill=WHITE + (int(255 * a),))
            d.text((x, y + 130), sub, font=sf, fill=GREY + (int(255 * a),))
            d.line((x, y + 185, x + cw, y + 185), fill=col + (int(160 * a),), width=2)
            for j, it in enumerate(items):
                b = ease(t, 1.2 + i * 0.35 + j * 0.3)
                d.ellipse((x, y + 220 + j * 62 + 10, x + 10, y + 220 + j * 62 + 20), fill=col + (int(255 * b),))
                d.text((x + 26, y + 212 + j * 62 + (1 - b) * 16), it, font=itf, fill=WHITE + (int(255 * b),))


class Bars(Scene):
    """막대 비교 (등록금)."""
    def __init__(self, dur, kicker, caption, title, rows, maxv):
        super().__init__(dur, kicker, caption)
        self.title, self.rows, self.maxv = title, rows, maxv  # rows: [(라벨, 값, 표시글, 색)]

    def draw(self, d, layer, t, fonts):
        a = ease(t, 0.2)
        rich(d, layer, (X0, 190 + (1 - a) * 30), self.title, F(fonts["bold"], 72), alpha=a)
        lf, vf = F(fonts["subtitle"], 34), F(fonts["bold"], 56)
        bx = X0 + 450
        full = WD - X0 - bx - 470  # 오른쪽에 금액 글자 자리를 남긴다
        for i, (label, val, shown, col) in enumerate(self.rows):
            b = ease(t, 0.9 + i * 0.45, 1.0)
            y = 360 + i * 150
            d.text((X0, y + 10), label, font=lf, fill=WHITE + (int(255 * ease(t, 0.8 + i * 0.45)),))
            w = int(full * val / self.maxv * b)
            d.rounded_rectangle((bx, y, bx + max(w, 6), y + 58), 12, fill=col + (255,))
            if b > 0.05:
                d.text((bx + w + 24, y - 2), shown, font=vf, fill=col + (int(255 * b),))


class Timeline(Scene):
    """가로 타임라인: 점이 차례로 켜지고 날짜·설명이 뜬다."""
    def __init__(self, dur, kicker, caption, title, points):
        super().__init__(dur, kicker, caption)
        self.title, self.points = title, points  # [(날짜, 설명, 강조여부)]

    def draw(self, d, layer, t, fonts):
        a = ease(t, 0.2)
        rich(d, layer, (X0, 190 + (1 - a) * 30), self.title, F(fonts["bold"], 72), alpha=a)
        n = len(self.points)
        x0, x1, y = 120, WD - 120, 600
        prog = ease(t, 0.8, 2.6)
        d.line((x0, y, x0 + (x1 - x0) * prog, y), fill=GOLD + (255,), width=4)
        d.line((x0, y, x1, y), fill=(70, 80, 110, 255), width=1)
        df, ef = F(fonts["bold"], 40), F(fonts["subtitle"], 28)
        for i, (date, desc, hot) in enumerate(self.points):
            px = x0 + (x1 - x0) * i / (n - 1)
            on = ease(t, 0.8 + 2.6 * i / (n - 1), 0.35)
            r = 14 if hot else 10
            d.ellipse((px - r, y - r, px + r, y + r), fill=(GOLD if hot else WHITE) + (int(255 * on),))
            d.text((px, y - 40 - (1 - on) * 12), date, font=df, fill=(GOLD if hot else WHITE) + (int(255 * on),), anchor="ms")
            for k, ln in enumerate(desc.split("\n")):
                d.text((px, y + 44 + k * 34 + (1 - on) * 12), ln, font=ef, fill=GREY + (int(255 * on),), anchor="ma")


class Apply(Scene):
    """지원 안내 + QR."""
    def __init__(self, dur, kicker, caption, url):
        super().__init__(dur, kicker, caption)
        self.url = url
        try:
            import qrcode
            q = qrcode.QRCode(border=1, box_size=10)
            q.add_data(url)
            q.make(fit=True)
            self.qr = q.make_image(fill_color="black", back_color="white").convert("RGB").resize((420, 420), Image.NEAREST)
        except Exception:
            self.qr = None

    def draw(self, d, layer, t, fonts):
        a = ease(t, 0.2)
        f = F(fonts["bold"], 120)
        rich(d, layer, (X0, 250 + (1 - a) * 40), "지금", f, alpha=a)
        rich(d, layer, (X0, 380 + (1 - ease(t, 0.5)) * 40), "*지원*하세요.", f, alpha=ease(t, 0.5))
        b = ease(t, 0.9)
        d.text((X0, 560), "saga121.com  →  입학전형  →  입학신청", font=F(fonts["subtitle"], 36), fill=GREY + (int(255 * b),))
        d.text((X0, 620), "카카오톡 ‘사랑글로벌아카데미’  ·  02-3495-8300", font=F(fonts["subtitle"], 36), fill=GREY + (int(255 * b),))
        d.text((X0, 700), self.url, font=F(fonts["bold"], 34), fill=BLUE + (int(255 * b),))
        if self.qr is not None and b > 0:
            box = (WD - 72 - 470, 260, WD - 72, 730)
            d.rounded_rectangle(box, 24, fill=(255, 255, 255, int(255 * b)))
            qr = self.qr.copy()
            qr.putalpha(int(255 * b))
            layer.alpha_composite(qr, (box[0] + 25, box[1] + 25))


class Closing(Scene):
    def draw(self, d, layer, t, fonts):
        a = ease(t, 0.2, 0.8)
        cx, cy, r = WD / 2, 380, 150
        # 금색 고리
        for k in range(0, int(360 * min(1, t / 1.6)), 2):
            ang = math.radians(k - 90)
            x, y = cx + r * math.cos(ang), cy + r * math.sin(ang)
            d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=GOLD + (200,))
        logo = Image.open(A / "saga_logo_w.png").convert("RGBA")
        lw = 300
        logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
        logo.putalpha(logo.split()[3].point(lambda v: int(v * a)))
        layer.alpha_composite(logo, (int(cx - lw / 2), int(cy - logo.height / 2)))
        f = F(fonts["bold"], 108)
        b = ease(t, 1.2)
        rich(d, layer, (cx, 600 + (1 - b) * 30), "당신의 일터도 *선교지*입니다", f, alpha=b, anchor_left=False)
        c = ease(t, 1.8)
        d.text((cx, 760), "2027 일터선교 & 글로벌네트워크아카데미  ·  원서 접수 10.1 ~ 11.30", font=F(fonts["subtitle"], 36),
               fill=GREY + (int(255 * c),), anchor="ma")


def opening(dur: float = 2.6) -> Scene:
    class Opening(Scene):
        def chrome(self, d, t, fonts):
            pass

        def draw(self, d, layer, t, fonts):
            p = ease(t, 0.1, 1.4)
            half = (WD / 2 - 120) * p
            d.line((WD / 2 - half, HT / 2, WD / 2 + half, HT / 2), fill=(120, 150, 220, 255), width=2)
            a = ease(t, 1.0, 0.8)
            d.text((WD / 2, HT / 2 - 60), "SARANG GLOBAL ACADEMY  ·  2027", font=F(fonts["bold"], 30),
                   fill=GREY + (int(255 * a),), anchor="ms")
    return Opening(dur, "", "")


def scenes() -> list[Scene]:
    return [
        opening(),
        Headline(6.5, "", "SaGA 일터선교 & 글로벌네트워크아카데미 2027학년도 7기 모집을 시작합니다",
                 ["일터를", "새롭게", "*보다.*"], pt=150, accent=BLUE),
        Headline(7.0, "01 / INTENT", "일터는 삶의 현장이고, 그곳이 곧 선교지입니다",
                 ["주일의 믿음은", "*월요일*에도", "살아 있습니까?"], pre="하나의 질문에서 시작했습니다.", pt=118),
        Bullets(9.0, "02 / PROGRAM", "직장을 그만두지 않고, 일하면서 배웁니다", "우리가\n준비한 것",
                ["1년 3학기 · 학기당 10주", "매주 화 저녁 7~10시 | 토 오전 9~12시", "강남캠퍼스 + 전국 5개 권역 거점캠퍼스",
                 "온전론 → 일터신학 → 영역별 선교전략", "동문 커뮤니티 · 비전트립"], sub="School of Marketplace Mission & Global Network"),
        Stats(7.5, "03 / PARTICIPATION", "서울·수도권 / 대전·충청 / 군산·호남 / 부산·영남 / 강원·제주·해외",
              [(230, "명", "2027학년도 모집 정원"), (5, "개 권역", "거점캠퍼스 포함"), (7, "기", "2027학년도")]),
        Columns(10.0, "04 / CURRICULUM", "신학적 이론 → 실천적 이론 → 영역별 선교전략",
                [("TERM 1", "Biblical Theory", "신학적 이론 · 2.16 ~ 4.24", GOLD, ["온전론 · 오정현", "기독교 세계관 · 전광식", "일터선교 1 · Paul Stevens", "성경적 일터신학 · 박재은"]),
                 ("TERM 2", "Practical Theory", "실천적 이론 · 5.8 ~ 7.13", BLUE, ["교회사 · 주연종", "글로벌 네트워크 · 고성삼, M. Reeves 외", "일터선교 2 · Paul Stevens", "일터선교와 전문성 · 조정현 외"]),
                 ("TERM 3", "Missional Strategy", "영역별 선교전략 · 9.4 ~ 11.20", PURPLE, ["Business is Mission · 송동호, 이병구 외", "K-Marketplace Mission · 윤종록 외", "Christian-MBA · 이돈주", "영역별 선교전략 · 유종성"])]),
        Bullets(7.5, "05 / WHO", "세례(입교) 후 3년 이상 · 학사 이상 (특별한 경우 예외 가능)", "누구를 위한\n과정인가",
                ["기업가 · 경영자 · 창업자 · 관리자", "직장인 · 공무원 · 자영업자 · 프리랜서", "크리스천 청년 및 모든 분"]),
        Bars(8.0, "06 / TUITION", "학기당 등록금 · 각 교회가 개인별 50% 장학금 지급을 권장합니다", "등록금은 *이렇습니다*",
             [("강남캠퍼스", 125, "125만원 · 1년 375만원", GOLD), ("거점캠퍼스", 75, "75만원 · 1년 225만원", BLUE),
              ("목회자 · 선교사 · 30대 청년", 75, "75만원", PURPLE)], 125),
        Timeline(9.5, "07 / SCHEDULE", "1차 접수 기간(10.1 ~ 11.30)에 지원하면 입학전형료가 면제됩니다", "*전형 일정*",
                 [("10.1", "원서 접수\n시작", True), ("11.30", "1차 마감\n전형료 면제", True), ("12.31", "2차 마감", False),
                  ("1.4", "서류 합격\n발표", False), ("1.9", "면접(토)", True), ("1.13", "최종 발표", False), ("2.16", "개강", True)]),
        Apply(8.0, "08 / APPLY", "QR 을 스캔하면 온라인 입학원서로 바로 이동합니다", "https://www.saga121.com/admission-guide/register/"),
        Closing(7.0, "", ""),
    ]


def render_scene(i: int, sc: Scene, fonts: dict, bg: Image.Image, extra: float) -> Path:
    fdir = W / f"s{i:02d}"
    fdir.mkdir(parents=True, exist_ok=True)
    n = int((sc.dur + extra) * FPS)
    for k in range(n):
        t = min(k / FPS, sc.dur)
        layer = Image.new("RGBA", (WD, HT), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        sc.chrome(d, t, fonts)
        sc.draw(d, layer, t, fonts)
        frame = bg.copy()
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
    parts = [render_scene(i, s, fonts, bg, 0 if i == len(sc) - 1 else XF) for i, s in enumerate(sc)]
    base = shorts.join_xfade(parts, W / "base.mp4", XF)
    out = ROOT / "output" / "타이포형_long.mp4"
    shorts.finish(base, out, [], bgm=bgm, bgm_volume=0.9, duck=False)
    return out


if __name__ == "__main__":
    bgm = sys.argv[1] if len(sys.argv) > 1 else str(A / "bgm_temp.wav")
    print("DONE", build(bgm), flush=True)
