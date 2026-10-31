#!/usr/bin/env python3
"""
build_deck.py — JSON 스펙 → 16:9 .pptx (하늘·파스텔 '청렴한 달' 스타일)

사용법:
  python3 build_deck.py spec.json [-o out.pptx] [--fonts-check]

스펙 형식은 ../references/spec-format.md 참고. 예시는 ../assets/example-lecture.json, example-thumbnail.json.
의존성: python-pptx, Pillow (pip install python-pptx pillow)
"""
import argparse
import json
import math
import os
import random
import sys
import tempfile

from lxml import etree
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.dml import MSO_LINE_DASH_STYLE
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Inches, Pt

# ──────────────────────────────────────────────────────────────────────────────
# 디자인 토큰 (참고 포스터에서 샘플링한 값)
# ──────────────────────────────────────────────────────────────────────────────
W, H = 13.333, 7.5          # 16:9 (1280×720 썸네일과 같은 비율)
M = 0.7                     # 기본 여백(inch)

PALETTE = {
    "navy":     "0D1F6B",   # 제목·본문 글자. 포스터의 진한 남색
    "navy_soft": "4A5A8F",  # 보조 설명 글자
    "muted":    "7C88AD",   # 캡션·메타
    "sky_top":  "6B9BD2",   # 표지 배경 위쪽
    "sky_bot":  "DCE9F6",   # 표지 배경 아래쪽
    "paper":    "F4F8FD",   # 본문 슬라이드 배경(아주 옅은 하늘)
    "white":    "FFFFFF",
    "card":     "FFFFFF",
    # 파스텔 4색(네잎클로버 풍선) — 바탕/진한 글자용 쌍
    "yellow":   "EBD96E", "yellow_d": "C9A82A",
    "green":    "A9CF6F", "green_d":  "5F9A2F",
    "blue":     "7BB0DA", "blue_d":   "1F7FB5",
    "pink":     "EFA3B6", "pink_d":   "D9456B",
}
PASTELS = ["yellow", "green", "blue", "pink"]

DEFAULT_FONTS = {
    # 모두 상업적 이용 가능한 무료 폰트. 설치 안내는 references/fonts.md
    "display": "Paperlogy 9 Black",      # 표지·썸네일 큰 제목 (무게가 커서 bold 끄기)
    "title":   "Paperlogy 8 ExtraBold",  # 슬라이드 제목
    "head":    "Pretendard SemiBold",    # 소제목·카드 제목
    "body":    "Pretendard",             # 본문 (bold=True → Pretendard Bold)
    "number":  "Gmarket Sans TTF Bold",  # 숫자 칩·날짜·메타 (OTF 설치 시 "Gmarket Sans Bold")
    "impact":  "Black Han Sans",         # 썸네일 임팩트 옵션
}
HEAVY_FAMILIES = {"display", "title", "number", "impact"}  # 가짜 볼드 방지


def rgb(hexstr):
    return RGBColor.from_string(hexstr.upper())


# ──────────────────────────────────────────────────────────────────────────────
# 저수준 헬퍼
# ──────────────────────────────────────────────────────────────────────────────
class Deck:
    def __init__(self, spec):
        self.spec = spec
        self.fonts = dict(DEFAULT_FONTS, **spec.get("fonts", {}))
        self.pal = dict(PALETTE, **spec.get("palette", {}))
        self.brand = spec.get("brand", {})
        self.prs = Presentation()
        self.prs.slide_width = Inches(W)
        self.prs.slide_height = Inches(H)
        self.blank = self.prs.slide_layouts[6]
        self.tmp = tempfile.mkdtemp(prefix="pptdeco_")
        self.warnings = []
        self.page = 0
        self._clouds = {}

    # ---- 색/폰트 -------------------------------------------------------------
    def c(self, key):
        return self.pal.get(key, key)  # 키가 없으면 hex로 간주

    def f(self, role):
        return self.fonts.get(role, role)

    def on(self, pastel):
        """파스텔 원 위에 올라가는 글자색. 노랑 위에는 흰색·노랑 글자가 안 읽혀 남색을 쓴다."""
        return "navy" if pastel == "yellow" else "white"

    # ---- 슬라이드 -------------------------------------------------------------
    def new_slide(self, bg="paper"):
        s = self.prs.slides.add_slide(self.blank)
        self.page += 1
        if bg == "sky":
            self.gradient_bg(s, self.c("sky_top"), self.c("sky_bot"))
        elif bg == "sky_light":
            self.gradient_bg(s, "AFCBE8", self.c("sky_bot"))
        elif bg == "sky_strong":
            self.gradient_bg(s, "4F88C6", "C9DDF2")
        else:
            fill = s.background.fill
            fill.solid()
            fill.fore_color.rgb = rgb(self.c(bg))
        return s

    def gradient_bg(self, slide, top, bottom):
        fill = slide.background.fill
        fill.gradient()
        fill.gradient_angle = 270  # 위→아래
        stops = fill.gradient_stops
        stops[0].color.rgb = rgb(top)
        stops[0].position = 0.0
        stops[1].color.rgb = rgb(bottom)
        stops[1].position = 1.0

    # ---- 도형 -------------------------------------------------------------
    def shape(self, slide, kind, x, y, w, h, fill=None, line=None, line_w=1.5,
              radius=None, shadow=False, dash=None, alpha=None):
        shp = slide.shapes.add_shape(kind, Inches(x), Inches(y), Inches(w), Inches(h))
        if fill:
            shp.fill.solid()
            shp.fill.fore_color.rgb = rgb(self.c(fill))
            if alpha is not None:
                self._set_alpha(shp.fill._xPr.find(qn("a:solidFill")), alpha)
        else:
            shp.fill.background()
        if line:
            shp.line.color.rgb = rgb(self.c(line))
            shp.line.width = Pt(line_w)
            if dash:
                shp.line.dash_style = dash
        else:
            shp.line.fill.background()
        if radius is not None and kind == MSO_SHAPE.ROUNDED_RECTANGLE:
            shp.adjustments[0] = radius
        if shadow:
            self.add_shadow(shp)
        # 도형 안의 기본 텍스트 프레임 여백 제거
        tf = shp.text_frame
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        return shp

    def rect(self, slide, x, y, w, h, **kw):
        kw.setdefault("radius", 0.12)
        return self.shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h, **kw)

    def oval(self, slide, x, y, w, h, **kw):
        return self.shape(slide, MSO_SHAPE.OVAL, x, y, w, h, **kw)

    @staticmethod
    def _set_alpha(solidfill_el, alpha_pct):
        clr = solidfill_el[0]
        a = etree.SubElement(clr, qn("a:alpha"))
        a.set("val", str(int(alpha_pct * 1000)))

    def add_shadow(self, shp, color="0D1F6B", alpha=16, blur=9, dist=3):
        spPr = shp._element.spPr
        for e in spPr.findall(qn("a:effectLst")):
            spPr.remove(e)
        eff = etree.SubElement(spPr, qn("a:effectLst"))
        sh = etree.SubElement(eff, qn("a:outerShdw"))
        sh.set("blurRad", str(int(Pt(blur))))
        sh.set("dist", str(int(Pt(dist))))
        sh.set("dir", "5400000")
        sh.set("algn", "t")
        sh.set("rotWithShape", "0")
        clr = etree.SubElement(sh, qn("a:srgbClr"))
        clr.set("val", self.c(color))
        a = etree.SubElement(clr, qn("a:alpha"))
        a.set("val", str(alpha * 1000))

    def dotted(self, slide, x1, y1, x2, y2, color="navy", width=2.0):
        """포스터의 점선 리더(leader) 라인."""
        con = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(x1), Inches(y1), Inches(x2), Inches(y2))
        con.line.color.rgb = rgb(self.c(color))
        con.line.width = Pt(width)
        con.line.dash_style = MSO_LINE_DASH_STYLE.ROUND_DOT
        con.line._get_or_add_ln().set("cap", "rnd")
        return con

    # ---- 텍스트 -------------------------------------------------------------
    def text(self, slide, x, y, w, h, content, size=16, color="navy", font="body",
             bold=False, align="left", anchor="top", line_spacing=1.15,
             bullets=False, bullet_color=None, para_space=4, shape=None, keep_all=True):
        """
        content: str('\n'으로 문단 구분) | list[str] | list[list[run]]
        run: {"text","color","font","size","bold"}  — 제목 강조 등 부분 서식에 사용
        [[강조]] 마크업: 해당 구간을 accent 색으로 칠한다(self.accent 사용).
        """
        if shape is None:
            tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
            tf = tb.text_frame
            tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        else:
            tb = shape
            tf = shape.text_frame
        tf.word_wrap = True
        tf.vertical_anchor = {"top": MSO_ANCHOR.TOP, "middle": MSO_ANCHOR.MIDDLE, "bottom": MSO_ANCHOR.BOTTOM}[anchor]

        if isinstance(content, str):
            paras = content.split("\n")
        else:
            paras = content
        first = True
        for para in paras:
            p = tf.paragraphs[0] if first else tf.add_paragraph()
            first = False
            p.alignment = {"left": PP_ALIGN.LEFT, "center": PP_ALIGN.CENTER, "right": PP_ALIGN.RIGHT}[align]
            p.line_spacing = line_spacing
            p.space_after = Pt(para_space)
            pPr = p._p.get_or_add_pPr()
            if keep_all:
                pPr.set("eaLnBrk", "0")     # 한글 단어 중간 줄바꿈 억제
                pPr.set("latinLnBrk", "0")
                pPr.set("hangingPunct", "1")
            if bullets:
                self._bullet(pPr, bullet_color or color, size)
            runs = self._parse_runs(para) if isinstance(para, str) else para
            for r in runs:
                run = p.add_run()
                run.text = r["text"]
                self.set_font(run, self.f(r.get("font", font)), r.get("size", size),
                              self.c(r.get("color", color)), r.get("bold", bold),
                              heavy=(r.get("font", font) in HEAVY_FAMILIES))
        return tb

    def _parse_runs(self, s):
        runs, buf, i = [], "", 0
        while i < len(s):
            if s.startswith("[[", i):
                j = s.find("]]", i)
                if j > 0:
                    if buf:
                        runs.append({"text": buf}); buf = ""
                    runs.append({"text": s[i + 2:j], "color": self.accent})
                    i = j + 2
                    continue
            buf += s[i]; i += 1
        if buf or not runs:
            runs.append({"text": buf})
        return runs

    def _bullet(self, pPr, color, size):
        pPr.set("marL", str(int(Inches(0.28))))
        pPr.set("indent", str(int(-Inches(0.28))))
        for tag in ("a:buClr", "a:buSzPct", "a:buFont", "a:buChar"):
            for e in pPr.findall(qn(tag)):
                pPr.remove(e)
        buClr = etree.SubElement(pPr, qn("a:buClr"))
        c = etree.SubElement(buClr, qn("a:srgbClr")); c.set("val", self.c(color))
        buSz = etree.SubElement(pPr, qn("a:buSzPct")); buSz.set("val", "100000")
        buFont = etree.SubElement(pPr, qn("a:buFont")); buFont.set("typeface", "Arial")
        buChar = etree.SubElement(pPr, qn("a:buChar")); buChar.set("char", "•")

    @staticmethod
    def set_font(run, name, size, color_hex, bold, heavy=False):
        f = run.font
        f.name = name
        f.size = Pt(size)
        f.bold = bool(bold) and not heavy
        f.color.rgb = rgb(color_hex)
        rPr = run._r.get_or_add_rPr()
        # 한글은 <a:ea>, 그 외 <a:cs>에도 같은 서체를 지정해야 PowerPoint가 '맑은 고딕'으로 바꾸지 않는다
        for tag in ("a:ea", "a:cs"):
            el = rPr.find(qn(tag))
            if el is None:
                el = etree.SubElement(rPr, qn(tag))
            el.set("typeface", name)

    # ---- 이미지 -------------------------------------------------------------
    def picture(self, slide, path, x, y, w, h, fit="contain"):
        """상자(x,y,w,h) 안에 비율 유지해 넣는다."""
        from PIL import Image
        with Image.open(path) as im:
            iw, ih = im.size
        box = w / h
        img = iw / ih
        if fit == "contain":
            if img > box:
                nw, nh = w, w / img
            else:
                nw, nh = h * img, h
        else:
            nw, nh = w, h
        nx, ny = x + (w - nw) / 2, y + (h - nh) / 2
        return slide.shapes.add_picture(path, Inches(nx), Inches(ny), Inches(nw), Inches(nh))

    def clouds(self, slide, x, y, w, h, seed=1, strength=0.9):
        """부드러운 흰 구름 PNG를 만들어 얹는다(알파 포함)."""
        from PIL import Image, ImageDraw, ImageFilter
        key = (seed, round(w, 2), round(h, 2))
        if key not in self._clouds:
            rnd = random.Random(seed)
            pw, ph = int(w * 120), int(h * 120)
            im = Image.new("RGBA", (pw, ph), (255, 255, 255, 0))
            d = ImageDraw.Draw(im)
            for _ in range(rnd.randint(9, 14)):
                cx, cy = rnd.uniform(0.05, 0.95) * pw, rnd.uniform(0.15, 0.85) * ph
                rw, rh = rnd.uniform(0.18, 0.42) * pw, rnd.uniform(0.10, 0.22) * ph
                a = int(rnd.uniform(120, 220) * strength)
                d.ellipse([cx - rw / 2, cy - rh / 2, cx + rw / 2, cy + rh / 2], fill=(255, 255, 255, a))
            im = im.filter(ImageFilter.GaussianBlur(radius=max(6, pw // 45)))
            # 가장자리 페이드: 이미지 경계가 직사각형으로 드러나지 않게 알파를 서서히 0으로
            fade = Image.new("L", (pw, ph), 0)
            fd = ImageDraw.Draw(fade)
            fd.rectangle([int(pw * 0.18), int(ph * 0.22), int(pw * 0.82), int(ph * 0.78)], fill=255)
            fade = fade.filter(ImageFilter.GaussianBlur(radius=max(pw, ph) // 7))
            from PIL import ImageChops
            alpha = ImageChops.multiply(im.getchannel("A"), fade)
            im.putalpha(alpha)
            path = os.path.join(self.tmp, f"clouds_{seed}_{pw}x{ph}.png")
            im.save(path)
            self._clouds[key] = path
        return slide.shapes.add_picture(self._clouds[key], Inches(x), Inches(y), Inches(w), Inches(h))

    # ---- 재사용 컴포넌트 ---------------------------------------------------------
    def chip(self, slide, x, y, w, h, label, fill="navy", color="white", size=14, font="number", radius=0.5):
        """둥근 라벨 칩 (예: '1주', '무료', '몰랐죠?')"""
        r = self.rect(slide, x, y, w, h, fill=fill, radius=radius)
        self.text(slide, 0, 0, 0, 0, label, size=size, color=color, font=font,
                  align="center", anchor="middle", shape=r)
        return r

    def num_circle(self, slide, x, y, d, label, pastel="blue", shadow=True, size=None, color="white"):
        """파스텔 원 + 숫자. 포스터 '1주·2주' 풍선의 평면 버전."""
        o = self.oval(slide, x, y, d, d, fill=pastel, shadow=shadow)
        self.text(slide, 0, 0, 0, 0, label, size=size or max(12, d * 22), color=color,
                  font="number", align="center", anchor="middle", shape=o)
        return o

    def balloon_cluster(self, slide, cx, cy, scale=1.0, labels=None, badge=None):
        """겹치는 파스텔 원 4개(노랑·초록·파랑·분홍). cx,cy = 클러스터 중심."""
        labels = labels or ["1", "2", "3", "4"]
        d = 1.7 * scale
        spots = [(-0.95, -0.75, "yellow"), (0.75, -0.45, "green"), (-0.35, 0.65, "blue"), (0.95, 0.75, "pink")]
        for (ox, oy, col), lab in zip(spots, labels):
            dd = d * (1.0 if col != "pink" else 0.9)
            self.oval(slide, cx + ox * scale - dd / 2, cy + oy * scale - dd / 2, dd, dd, fill=col, shadow=True)
            self.text(slide, cx + ox * scale - dd / 2, cy + oy * scale - dd / 2, dd, dd, lab,
                      size=max(14, 20 * scale), color=self.on(col),
                      font="number", align="center", anchor="middle")
        if badge:
            bd = 1.05 * scale
            bx, by = cx + 1.75 * scale - bd / 2, cy - 1.55 * scale - bd / 2
            self.oval(slide, bx, by, bd, bd, fill="navy", shadow=True)
            self.text(slide, bx, by, bd, bd, badge, size=max(12, 17 * scale), color="white",
                      font="number", align="center", anchor="middle")

    def badge_box(self, slide, x, y, w, h, label, value, color="white"):
        """포스터 좌상단 'Integrity Month / 2026' 테두리 박스."""
        self.rect(slide, x, y, w, h, line=color, line_w=2.0, radius=0.12)
        self.text(slide, x + 0.15, y + 0.12, w - 0.3, h * 0.35, label, size=12, color=color, font="body", align="center", anchor="middle")
        self.dotted(slide, x + 0.3, y + h * 0.47, x + w - 0.3, y + h * 0.47, color=color, width=1.2)
        self.text(slide, x + 0.15, y + h * 0.5, w - 0.3, h * 0.45, value, size=26, color=color, font="number", align="center", anchor="middle")

    def slide_title(self, slide, title, idx=None, kicker=None):
        """본문 슬라이드 공통 제목. 왼쪽에 파스텔 번호 칩(선택)."""
        x = M
        if idx is not None:
            col = PASTELS[(idx - 1) % 4]
            self.num_circle(slide, M, 0.5, 0.62, f"{idx:02d}", pastel=col, shadow=False, size=15,
                            color=self.on(col))
            x = M + 0.8
        if kicker:
            self.text(slide, x, 0.42, 8, 0.3, kicker, size=12, color="muted", font="number")
            self.text(slide, x, 0.7, W - x - M, 0.8, title, size=30, color="navy", font="title", anchor="top")
        else:
            self.text(slide, x, 0.48, W - x - M, 0.8, title, size=30, color="navy", font="title", anchor="middle")
        self._warn_len("제목", title, 22)

    def footer(self, slide, dark=False):
        col = "white" if dark else "muted"
        name = self.brand.get("name", "")
        if name:
            self.text(slide, M, H - 0.5, 6, 0.3, name, size=10.5, color=col, font="body")
        self.text(slide, W - M - 1.0, H - 0.5, 1.0, 0.3, f"{self.page:02d}", size=11, color=col, font="number", align="right")

    def image_or_placeholder(self, slide, path, x, y, w, h, caption=None, pastel="blue"):
        if path and os.path.exists(path):
            self.rect(slide, x, y, w, h, fill="white", radius=0.06, shadow=True)
            self.picture(slide, path, x + 0.12, y + 0.12, w - 0.24, h - 0.24)
        else:
            if path:
                self.warnings.append(f"이미지 파일 없음: {path} → 자리표시자로 대체")
            self.rect(slide, x, y, w, h, fill=pastel, radius=0.06, alpha=55)
            self.clouds(slide, x + 0.2, y + 0.3, w - 0.4, h * 0.5, seed=7, strength=0.7)
            self.text(slide, x, y + h * 0.4, w, 0.6, caption or "이미지 / 화면 캡처 자리", size=14,
                      color="navy_soft", font="head", align="center", anchor="middle")

    def _warn_len(self, what, s, limit):
        plain = str(s).replace("[[", "").replace("]]", "")
        longest = max((len(line) for line in plain.split("\n")), default=0)
        if longest > limit:
            self.warnings.append(f"{what}이(가) 한 줄 {limit}자를 넘습니다({longest}자): '{s[:30]}…' → 줄바꿈(\\n) 또는 축약 권장")

    # ──────────────────────────────────────────────────────────────────────────
    # 슬라이드 타입
    # ──────────────────────────────────────────────────────────────────────────
    def build(self):
        self.accent = self.c(self.spec.get("accent", "pink") + "_d") if self.spec.get("accent", "pink") in PASTELS else self.c(self.spec.get("accent", "pink_d"))
        section_i = 0
        for i, sl in enumerate(self.spec["slides"]):
            t = sl.get("type", "rows")
            fn = getattr(self, "s_" + t, None)
            if fn is None:
                raise SystemExit(f"알 수 없는 slide type: {t}")
            if t == "section":
                section_i += 1
                sl.setdefault("_idx", section_i)
            slide = fn(sl)
            if sl.get("notes"):
                slide.notes_slide.notes_text_frame.text = sl["notes"]
        return self.prs

    # 표지 -------------------------------------------------------------------
    def s_cover(self, sl):
        s = self.new_slide("sky")
        self.clouds(s, -0.5, 0.2, 9, 3.2, seed=3, strength=0.75)
        self.clouds(s, 6.0, 3.6, 8.5, 3.5, seed=5, strength=0.6)
        if sl.get("badge_value"):
            self.badge_box(s, M, 0.6, 1.9, 1.35, sl.get("badge_label", ""), sl["badge_value"])
        if sl.get("date"):
            self.text(s, W / 2, 0.65, W / 2 - M, 0.5, sl["date"], size=18, color="white", font="head", align="right")
        title = sl["title"]
        self._warn_len("표지 제목", title, 12)
        lines = title.count("\n") + 1
        size = sl.get("title_size") or (76 if lines == 1 else 62)
        self.text(s, M, 2.0, 8.6, 2.8, title, size=size, color="navy", font="display", anchor="middle", line_spacing=1.0)
        if sl.get("subtitle"):
            self.text(s, M + 0.05, 4.95, 8.4, 0.9, sl["subtitle"], size=20, color="navy_soft", font="head", line_spacing=1.2)
        self.balloon_cluster(s, 10.9, 4.6, scale=1.05, labels=sl.get("tags") or ["1", "2", "3", "4"], badge=sl.get("badge"))
        self.text(s, M, H - 0.85, 8, 0.3, self.brand.get("name", ""), size=14, color="navy", font="head")
        if self.brand.get("tagline"):
            self.text(s, M, H - 0.55, 8, 0.3, self.brand["tagline"], size=11.5, color="navy_soft", font="body")
        if self.brand.get("logo") and os.path.exists(self.brand["logo"]):
            self.picture(s, self.brand["logo"], W - M - 1.6, H - 0.95, 1.6, 0.55)
        return s

    # 섹션 구분 ---------------------------------------------------------------
    def s_section(self, sl):
        s = self.new_slide("sky_light")
        idx = sl.get("_idx", 1)
        col = PASTELS[(idx - 1) % 4]
        self.clouds(s, 5.5, -0.3, 9, 3.0, seed=11, strength=0.6)
        d = 2.6
        self.oval(s, M + 0.3, H / 2 - d / 2, d, d, fill=col, shadow=True)
        self.text(s, M + 0.3, H / 2 - d / 2, d, d, sl.get("number") or f"{idx:02d}", size=58,
                  color=self.on(col), font="display", align="center", anchor="middle")
        x = M + 0.3 + d + 0.7
        self.text(s, x, H / 2 - 1.3, W - x - M, 1.4, sl["title"], size=42, color="navy", font="title", anchor="bottom", line_spacing=1.05)
        self._warn_len("섹션 제목", sl["title"], 16)
        if sl.get("subtitle"):
            self.text(s, x + 0.05, H / 2 + 0.25, W - x - M, 1.2, sl["subtitle"], size=18, color="navy_soft", font="body", line_spacing=1.3)
        self.footer(s)
        return s

    # 목차/주차 일정 ------------------------------------------------------------
    def s_agenda(self, sl):
        s = self.new_slide()
        self.slide_title(s, sl.get("title", "오늘의 흐름"), idx=sl.get("idx"))
        items = sl["items"][:6]
        card_x, card_y, card_w = M, 1.65, 8.1
        row_h = min(0.95, (H - card_y - 1.0) / max(len(items), 1))
        card_h = row_h * len(items) + 0.4
        self.rect(s, card_x, card_y, card_w, card_h, fill="card", shadow=True, radius=0.05)
        for i, it in enumerate(items):
            col = PASTELS[i % 4]
            y = card_y + 0.2 + i * row_h
            self.chip(s, card_x + 0.3, y + row_h / 2 - 0.22, 0.9, 0.44, it.get("label", f"{i+1}"),
                      fill=col, color=self.on(col), size=13)
            tx = card_x + 1.4
            if it.get("meta"):
                self.text(s, tx, y + row_h / 2 - 0.2, 1.7, 0.4, it["meta"], size=13, color="muted", font="number", anchor="middle")
                tx += 1.75
            self.text(s, tx, y + row_h / 2 - 0.25, card_x + card_w - tx - 0.3, 0.5, it["text"], size=17, color="navy", font="head", anchor="middle")
            self._warn_len("목차 항목", it["text"], 24)
            if i < len(items) - 1:
                self.dotted(s, card_x + 0.3, y + row_h, card_x + card_w - 0.3, y + row_h, color="D3DCEC", width=1.2)
        self.balloon_cluster(s, 11.0, 4.2, scale=0.95, labels=[it.get("label", str(i + 1)) for i, it in enumerate(items[:4])])
        self.footer(s)
        return s

    # 행 목록(번호 원 + 제목 + 설명) ------------------------------------------------
    def s_rows(self, sl):
        s = self.new_slide()
        self.slide_title(s, sl["title"], idx=sl.get("idx"), kicker=sl.get("kicker"))
        items = sl["items"][:4]
        top = 1.75
        avail = H - top - 0.8
        row_h = avail / len(items)
        for i, it in enumerate(items):
            col = PASTELS[i % 4]
            y = top + i * row_h
            d = 0.72
            if it.get("icon") and os.path.exists(it["icon"]):
                self.oval(s, M, y + 0.05, d, d, fill=col)
                self.picture(s, it["icon"], M + 0.14, y + 0.19, d - 0.28, d - 0.28)
            else:
                self.num_circle(s, M, y + 0.05, d, it.get("label", f"{i+1}"), pastel=col, shadow=False, size=17,
                                color=self.on(col))
            tx = M + d + 0.35
            self.text(s, tx, y, W - tx - M, 0.42, it["head"], size=19, color="navy", font="head", anchor="middle")
            self._warn_len("행 제목", it["head"], 28)
            if it.get("desc"):
                self.text(s, tx, y + 0.45, W - tx - M, row_h - 0.55, it["desc"], size=15, color="navy_soft", font="body", line_spacing=1.25)
            if i < len(items) - 1:
                self.dotted(s, tx, y + row_h - 0.08, W - M, y + row_h - 0.08, color="D3DCEC", width=1.2)
        self.footer(s)
        return s

    # 카드 그리드 ----------------------------------------------------------------
    def s_cards(self, sl):
        s = self.new_slide()
        self.slide_title(s, sl["title"], idx=sl.get("idx"), kicker=sl.get("kicker"))
        items = sl["items"][:6]
        n = len(items)
        cols = 2 if n in (2, 4) else 3
        rows = math.ceil(n / cols)
        gap = 0.35
        top = 1.75
        cw = (W - 2 * M - gap * (cols - 1)) / cols
        ch = (H - top - 0.85 - gap * (rows - 1)) / rows
        for i, it in enumerate(items):
            col = PASTELS[i % 4]
            r, c = divmod(i, cols)
            x, y = M + c * (cw + gap), top + r * (ch + gap)
            self.rect(s, x, y, cw, ch, fill="card", shadow=True, radius=0.07)
            self.num_circle(s, x + 0.3, y + 0.3, 0.58, it.get("label", f"{i+1}"), pastel=col, shadow=False, size=14,
                            color=self.on(col))
            self.text(s, x + 1.05, y + 0.3, cw - 1.3, 0.58, it["head"], size=18, color="navy", font="head", anchor="middle")
            self._warn_len("카드 제목", it["head"], 16 if cols == 3 else 24)
            if it.get("desc"):
                self.text(s, x + 0.3, y + 1.05, cw - 0.6, ch - 1.3, it["desc"], size=14.5, color="navy_soft", font="body", line_spacing=1.3)
        self.footer(s)
        return s

    # 2단(글 + 이미지) --------------------------------------------------------------
    def s_two_col(self, sl):
        s = self.new_slide()
        self.slide_title(s, sl["title"], idx=sl.get("idx"), kicker=sl.get("kicker"))
        left_w = 6.0
        if sl.get("lead"):
            self.text(s, M, 1.75, left_w, 0.9, sl["lead"], size=18, color="navy", font="head", line_spacing=1.3)
            by = 2.75
        else:
            by = 1.8
        self.text(s, M, by, left_w, H - by - 1.0, sl.get("bullets", []), size=16, color="navy_soft", font="body",
                  bullets=True, bullet_color=self.accent, line_spacing=1.3, para_space=10)
        ix = M + left_w + 0.5
        self.image_or_placeholder(s, sl.get("image"), ix, 1.75, W - ix - M, H - 1.75 - 1.0,
                                  caption=sl.get("caption"), pastel=PASTELS[(sl.get("idx", 1) - 1) % 4])
        self.footer(s)
        return s

    # 숫자 강조 -------------------------------------------------------------------
    def s_stats(self, sl):
        s = self.new_slide()
        self.slide_title(s, sl["title"], idx=sl.get("idx"), kicker=sl.get("kicker"))
        items = sl["items"][:4]
        n = len(items)
        gap = 0.4
        cw = (W - 2 * M - gap * (n - 1)) / n
        y, ch = 1.9, 3.9
        for i, it in enumerate(items):
            col = PASTELS[i % 4]
            x = M + i * (cw + gap)
            self.rect(s, x, y, cw, ch, fill="card", shadow=True, radius=0.07)
            self.oval(s, x + cw / 2 - 0.22, y + 0.35, 0.44, 0.44, fill=col)
            self.text(s, x + 0.2, y + 1.0, cw - 0.4, 1.3, it["value"], size=48 if n <= 3 else 38,
                      color=self.c(col + "_d"), font="display", align="center", anchor="middle")
            self.text(s, x + 0.2, y + 2.35, cw - 0.4, 0.5, it["label"], size=17, color="navy", font="head", align="center", anchor="middle")
            if it.get("note"):
                self.text(s, x + 0.3, y + 2.9, cw - 0.6, 0.8, it["note"], size=13, color="muted", font="body", align="center", line_spacing=1.25)
        if sl.get("footnote"):
            self.text(s, M, H - 1.15, W - 2 * M, 0.4, sl["footnote"], size=12, color="muted", font="body")
        self.footer(s)
        return s

    # 비교(Before / After) ------------------------------------------------------------
    def s_compare(self, sl):
        s = self.new_slide()
        self.slide_title(s, sl["title"], idx=sl.get("idx"), kicker=sl.get("kicker"))
        gap = 0.45
        cw = (W - 2 * M - gap) / 2
        y, ch = 1.8, H - 1.8 - 0.95
        for i, (side, tint, headcol) in enumerate([(sl["left"], "E9EEF6", "muted"), (sl["right"], "green", "green_d")]):
            x = M + i * (cw + gap)
            self.rect(s, x, y, cw, ch, fill=tint, radius=0.07, alpha=45 if tint == "green" else None, shadow=False)
            self.chip(s, x + 0.35, y + 0.35, 1.5, 0.46, side.get("head", ["Before", "After"][i]),
                      fill="E9EEF6" if i == 0 else "green", color="navy_soft" if i == 0 else "white", size=14)
            if i == 0:
                # Before 칩이 바탕과 같은 색이면 테두리로 구분
                pass
            self.text(s, x + 0.35, y + 1.05, cw - 0.7, ch - 1.3, side.get("items", []), size=16,
                      color="navy_soft" if i == 0 else "navy", font="body", bullets=True,
                      bullet_color="muted" if i == 0 else "green_d", line_spacing=1.3, para_space=9)
        # 가운데 화살표 대신 점선 + 작은 원(흐름 표시)
        mx = M + cw + gap / 2
        self.oval(s, mx - 0.22, y + ch / 2 - 0.22, 0.44, 0.44, fill="navy", shadow=True)
        self.text(s, mx - 0.22, y + ch / 2 - 0.22, 0.44, 0.44, "→", size=16, color="white", font="body", align="center", anchor="middle")
        self.footer(s)
        return s

    # 단계(가로 타임라인) --------------------------------------------------------------
    def s_steps(self, sl):
        s = self.new_slide()
        self.slide_title(s, sl["title"], idx=sl.get("idx"), kicker=sl.get("kicker"))
        steps = sl["steps"][:5]
        n = len(steps)
        d = 1.15
        cy = 3.0
        span = W - 2 * M - d
        xs = [M + d / 2 + (span * i / (n - 1) if n > 1 else span / 2) for i in range(n)]
        for i in range(n - 1):
            self.dotted(s, xs[i] + d / 2 + 0.1, cy, xs[i + 1] - d / 2 - 0.1, cy, color="navy", width=2.2)
        colw = min(2.9, (W - 2 * M) / n)
        for i, st in enumerate(steps):
            col = PASTELS[i % 4]
            x = xs[i]
            self.num_circle(s, x - d / 2, cy - d / 2, d, st.get("label", f"{i+1}"), pastel=col, size=26,
                            color=self.on(col))
            self.text(s, x - colw / 2, cy + d / 2 + 0.3, colw, 0.5, st["head"], size=18, color="navy", font="head", align="center", anchor="middle")
            self._warn_len("단계 제목", st["head"], 12)
            if st.get("desc"):
                self.text(s, x - colw / 2, cy + d / 2 + 0.85, colw, 1.6, st["desc"], size=14, color="navy_soft", font="body", align="center", line_spacing=1.3)
        self.footer(s)
        return s

    # 인용 --------------------------------------------------------------------------
    def s_quote(self, sl):
        s = self.new_slide("sky_light")
        self.clouds(s, -0.5, 4.2, 9, 3.5, seed=21, strength=0.6)
        self.text(s, M + 0.2, 1.1, 2, 1.6, "“", size=120, color=self.accent, font="display", line_spacing=0.8)
        self.text(s, M + 0.5, 2.3, W - 2 * M - 1.0, 2.6, sl["text"], size=sl.get("size", 30), color="navy", font="title", anchor="middle", line_spacing=1.25)
        self._warn_len("인용문", sl["text"], 24)
        if sl.get("by"):
            self.text(s, M + 0.5, 5.1, W - 2 * M - 1.0, 0.5, "— " + sl["by"], size=16, color="navy_soft", font="head")
        self.footer(s)
        return s

    # 마무리/CTA ------------------------------------------------------------------------
    def s_closing(self, sl):
        s = self.new_slide("sky")
        self.clouds(s, -0.5, 0.3, 9.5, 3.0, seed=31, strength=0.7)
        self.clouds(s, 5.5, 4.0, 8.5, 3.3, seed=33, strength=0.6)
        self.balloon_cluster(s, 11.0, 2.3, scale=0.8, labels=sl.get("tags") or ["1", "2", "3", "4"])
        self.text(s, M, 1.6, 8.6, 1.8, sl["title"], size=sl.get("title_size", 52), color="navy", font="display", anchor="bottom", line_spacing=1.0)
        self._warn_len("마무리 제목", sl["title"], 14)
        if sl.get("subtitle"):
            self.text(s, M + 0.05, 3.55, 8.6, 1.0, sl["subtitle"], size=19, color="navy_soft", font="head", line_spacing=1.3)
        if sl.get("cta"):
            self.chip(s, M, 4.85, min(7.5, 0.33 * len(sl["cta"]) + 1.0), 0.72, sl["cta"], fill="navy", color="white", size=19, font="head", radius=0.5)
        links = sl.get("links", [])
        for i, ln in enumerate(links[:3]):
            self.text(s, M, 5.85 + i * 0.36, 9, 0.34, ln, size=13.5, color="navy", font="body")
        self.text(s, W - M - 5, H - 0.6, 5, 0.3, self.brand.get("name", ""), size=12, color="navy", font="head", align="right")
        return s

    # 유튜브 썸네일 (1280×720 한 장) -------------------------------------------------------
    def s_thumbnail(self, sl):
        s = self.new_slide("sky_strong")
        self.clouds(s, -1.0, -0.3, 10, 3.6, seed=41, strength=0.9)
        self.clouds(s, 4.5, 4.4, 10, 3.6, seed=43, strength=0.8)
        # 오른쪽 풍선 클러스터 + 배지('무료' 등)
        self.balloon_cluster(s, 10.55, 4.0, scale=1.25, labels=sl.get("tags") or ["1", "2", "3", "4"], badge=sl.get("badge"))
        # 왼쪽: 킥커 칩
        y = 0.9
        if sl.get("kicker"):
            kw = 0.42 * len(sl["kicker"]) + 0.9
            self.chip(s, M, y, kw, 0.78, sl["kicker"], fill="navy", color="white", size=24, font="head", radius=0.5)
            y += 1.05
        # 제목: 2줄 권장, [[강조]] 지원
        title = sl["title"]
        self._warn_len("썸네일 제목", title, 8)
        lines = title.count("\n") + 1
        size = sl.get("title_size") or (112 if lines == 1 else 92 if lines == 2 else 72)
        font = "impact" if sl.get("impact") else "display"
        self.text(s, M - 0.05, y, 8.3, 3.7 if lines <= 2 else 4.2, title, size=size, color="navy", font=font,
                  anchor="top", line_spacing=0.98)
        if sl.get("sub"):
            self.text(s, M, H - 1.55, 8.4, 0.75, sl["sub"], size=30, color="navy", font="head", anchor="middle")
            self._warn_len("썸네일 부제", sl["sub"], 16)
        if self.brand.get("name"):
            self.text(s, W - M - 5, H - 0.62, 5, 0.35, self.brand["name"], size=15, color="navy", font="head", align="right")
        return s


# ──────────────────────────────────────────────────────────────────────────────
def fonts_check(fonts):
    """fc-list로 설치 여부 확인(렌더링 QA용). 없는 폰트는 LibreOffice가 대체해 미리보기 폭이 달라진다."""
    import subprocess
    try:
        out = subprocess.run(["fc-list", ":", "family"], capture_output=True, text=True, timeout=20).stdout.lower()
    except Exception:
        print("fc-list 없음 — 폰트 확인 생략"); return
    for role, name in fonts.items():
        base = name.lower().split(" ttf")[0]
        ok = base in out or name.lower() in out
        print(f"  {'✓' if ok else '✗ 미설치'}  {role:8s} {name}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("spec")
    ap.add_argument("-o", "--out")
    ap.add_argument("--fonts-check", action="store_true")
    a = ap.parse_args()
    with open(a.spec, encoding="utf-8") as fh:
        spec = json.load(fh)
    out = a.out or spec.get("output") or os.path.splitext(os.path.basename(a.spec))[0] + ".pptx"
    deck = Deck(spec)
    if a.fonts_check:
        print("폰트 설치 확인:"); fonts_check(deck.fonts)
    deck.build()
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    deck.prs.save(out)
    print(f"저장: {out}  ({deck.page}장)")
    if deck.warnings:
        print("\n경고(넘침 위험):")
        for w in deck.warnings:
            print(" -", w)


if __name__ == "__main__":
    main()
