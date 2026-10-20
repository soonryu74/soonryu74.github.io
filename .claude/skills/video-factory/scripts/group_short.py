"""그룹 홍보 쇼츠(9:16) — «내 고민 → 진짜 장면 → 숫자 → 한 마디 → 한 번 와 보기» 틀.
사용: python group_short.py spec.json
spec.json:
{
 "out": "AI미션그룹_쇼츠.mp4",
 "group": "AI미션그룹", "series": "SCIC 그룹탐방 01/12", "accent": "#3B82F6",
 "bgm": "음악.mp3", "bgm_volume": 0.5,                      // 선택. 목소리 나올 때 자동으로 낮춤
 "bgm_start": 14,                                            // 선택. 배경음을 몇 초부터 쓸지
 "voice_lead": 0.3,                                          // 장면 시작 뒤 목소리 들어가는 시각(초)
 "scenes": [
  {"type": "cover", "dur": 0.6, "src": "강의장.jpg", "lines": ["AI 독학 포기했다면", "[가르치며] 배우기"], "proof": "34회 강의 · 약 1,380명"},
  {"type": "hook",  "dur": 3.2, "lines": ["AI 공부,", "혼자 하다", "[사흘 만에] 포기했죠?"], "voice": "voice/N00.wav"},
  {"type": "photo", "dur": 5, "src": "강의장.jpg", "lines": ["그런데 이 사람들은", "배운 걸 [남에게] 가르쳐요"], "focus": [0.5, 0.5]},
  {"type": "stats", "dur": 6, "title": "2025 ~ 2026.8", "items": [["34", "회 강의"], ["1,380", "명"]]},
  {"type": "motto", "dur": 4.5, "lines": ["배워서 [남 주자]"], "sub": "가르치는 순간, 내 실력이 됩니다"},
  {"type": "cta",   "dur": 6, "lines": ["한 번 와 보세요"], "note": "다음 강의 일정 · 신청 링크"}
 ]
}
"intro" 는 시리즈 공통 인트로(3초) — «SaGA 졸업생 공동체 / SCIC / 그룹을 소개합니다 / 01 AI미션그룹».
  {"type": "intro", "dur": 3.0, "eyebrow": "SaGA 졸업생 공동체", "title": "SCIC", "sub": "그룹을 소개합니다", "no": "01"}
"palette": {"base": 배경, "ink": 글자, "sub": 보조 글자, "hl_bg"/"hl_fg": 강조 상자, "chip_bg"/"chip_fg": 칩, "num": 숫자 · 포인트} — 그룹 지정 색이 있을 때 덮어쓴다.
"theme": "dark"(남색 배경, 기본) | "tint"(연한 그룹색 배경) | "vivid"(진한 그룹색 배경) — spec 전체 또는 장면마다.
"cover" 는 쇼츠 표지 — 맨 앞 0.6초에 두면 업로드 때 첫 장면을 표지로 고를 수 있고, <out>_표지.jpg 로도 저장된다.
장면에 "voice" 가 있으면 장면 길이 = max(dur, 목소리 길이 + 0.75초) 로 늘어난다.
[ ] 안은 그룹색 상자. 사진은 흐린 같은 사진 위에 둥근 카드로 얹는다(작은 사진도 깨져 보이지 않게).
화면 아래 22% 와 오른쪽 끝은 쇼츠 버튼 자리라 글자를 두지 않는다."""
from __future__ import annotations

import math
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from common import F, FPS, NAVY, WHITE, fit_cover, load, navy_bg, probe

W, H = 1080, 1920
PANEL_B = (22, 34, 64)


class Theme:
    """배경 · 글자색 한 벌. dark = 남색 배경, tint = 연한 그룹색 배경, vivid = 진한 그룹색 배경."""
    def __init__(self, mode: str, acc):
        self.mode, self.acc = mode, acc
        lum = (0.299 * acc[0] + 0.587 * acc[1] + 0.114 * acc[2]) / 255
        INK = (20, 26, 43)
        if mode == "dark":
            self.base, self.ink, self.sub, self.cap, self.dim = NAVY, WHITE, (200, 208, 226), (225, 230, 240), (150, 158, 176)
            self.hl_bg, self.hl_fg, self.shadow = acc, NAVY, True
            self.panel_a, self.panel_b, self.choice = (34, 40, 56), PANEL_B, (30, 38, 58)
            self.num, self.chip_bg, self.chip_fg, self.grid = acc, acc, NAVY, (255, 255, 255, 14)
        elif mode == "tint":
            self.base = tuple(int(255 - (255 - c) * 0.16) for c in acc)
            self.ink, self.sub, self.cap, self.dim = INK, (72, 80, 100), (52, 60, 80), (150, 156, 170)
            self.hl_bg = acc; self.hl_fg = INK if lum > 0.55 else WHITE; self.shadow = False
            self.panel_a, self.panel_b, self.choice = (236, 238, 242), (255, 255, 255), (255, 255, 255)
            self.num = tuple(int(c * 0.8) for c in acc) if lum > 0.6 else acc
            self.chip_bg, self.chip_fg, self.grid = acc, self.hl_fg, acc + (22,)
        else:  # vivid
            self.base = acc
            dark_ink = lum > 0.55
            self.ink = INK if dark_ink else WHITE
            self.sub = (40, 46, 64) if dark_ink else (235, 240, 250)
            self.cap, self.dim = self.sub, ((90, 96, 112) if dark_ink else (210, 216, 230))
            self.hl_bg, self.hl_fg, self.shadow = (INK if dark_ink else WHITE), (acc if dark_ink else INK), False
            self.panel_a = tuple(int(c * 0.86) for c in acc); self.panel_b = (255, 255, 255)
            self.choice = tuple(min(255, int(c * 1.0 + 30)) for c in acc)
            self.num, self.chip_bg, self.chip_fg = self.ink, self.hl_bg, self.hl_fg
            self.grid = (0, 0, 0, 14) if dark_ink else (255, 255, 255, 18)

    def background(self):
        if self.mode == "dark":
            return navy_bg((W, H), grid=0)
        return Image.new("RGBA", (W, H), self.base + (255,))     # 격자 없음 (2026-10-18)


TH = Theme("dark", (59, 130, 246))         # 지금 그리는 장면의 테마(장면마다 바꿔 낀다)
X0 = 84                       # 왼쪽 여백
XF = 0.22                     # 장면 사이 겹침(초)


def rgb(h: str):
    h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def clamp(v, a=0.0, b=1.0):
    return max(a, min(b, v))


def ease_out(t):
    return 1 - (1 - clamp(t)) ** 3


def back(t):
    t = clamp(t); c = 1.6
    return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2


def parts(s: str):
    return [(p, i % 2 == 1) for i, p in enumerate(re.split(r"\[|\]", s)) if p]


def line_w(s, font, pad):
    return sum(font.getlength(p) + (pad * 2 + 6 if a else 0) for p, a in parts(s))


def draw_line(img: Image.Image, s: str, font, x, y, acc, alpha=1.0, scale=1.0, center=False):
    """한 줄을 별도 층에 그려 크기 · 투명도를 준 뒤 얹는다(튀어나오기)"""
    if alpha <= 0:
        return
    pad = 14
    asc, desc = font.getmetrics()
    lw = int(line_w(s, font, pad)) + 20
    lh = asc + desc + 24
    lay = Image.new("RGBA", (lw, lh), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    cx = 6
    for p, a in parts(s):
        w = font.getlength(p)
        if a:
            d.rounded_rectangle((cx, 8, cx + w + pad * 2, lh - 4), 16, fill=(TH.hl_bg if acc == TH.acc else acc) + (255,))
            d.text((cx + pad, 6), p, font=font, fill=TH.hl_fg if acc == TH.acc else NAVY)
            cx += w + pad * 2 + 6
        else:
            if TH.shadow:
                d.text((cx + 3, 11), p, font=font, fill=(0, 0, 0, 150))
            d.text((cx, 6), p, font=font, fill=TH.ink)
            cx += w
    if scale != 1.0:
        lay = lay.resize((max(1, int(lw * scale)), max(1, int(lh * scale))), Image.LANCZOS)
    if alpha < 1:
        lay.putalpha(lay.getchannel("A").point(lambda v: int(v * alpha)))
    if center:
        x = (W - lay.width) // 2
    else:
        x = int(x - (lay.width - lw) / 2 * 0)  # 왼쪽 정렬은 왼쪽 기준으로 커진다
    y = int(y - (lay.height - lh) / 2)
    img.alpha_composite(lay, (int(x), y))


def emoji_img(ch, size):
    """컬러 이모지(Noto Color Emoji 는 109px 고정) → 원하는 크기로"""
    from PIL import ImageFont
    f = ImageFont.truetype("/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf", 109)
    lay = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    ImageDraw.Draw(lay).text((8, 8), ch, font=f, embedded_color=True)
    bb = lay.getbbox() or (0, 0, 160, 160)
    lay = lay.crop(bb)
    r = size / max(lay.size)
    return lay.resize((int(lay.width * r), int(lay.height * r)), Image.LANCZOS)


def wrap_plain(text, font, maxw):
    out, cur = [], ""
    for w in text.split(" "):
        tt = (cur + " " + w).strip()
        if cur and font.getlength(tt) > maxw:
            out.append(cur); cur = w
        else:
            cur = tt
    return out + ([cur] if cur else [])


def top_bar(img, sp, acc, alpha=1.0):
    d = ImageDraw.Draw(img)
    a = int(255 * alpha)
    d.text((X0, 150), sp["series"], font=F("semi", 34), fill=TH.sub + (a,))
    f = F("bold", 40); tw = f.getlength(sp["group"])
    d.rounded_rectangle((X0, 205, X0 + tw + 48, 273), 34, fill=TH.chip_bg + (a,))
    d.text((X0 + 24, 214), sp["group"], font=f, fill=TH.chip_fg + (a,))


class Scene:
    def __init__(self, sc, sp, root):
        self.sc, self.sp, self.root = sc, sp, root
        self.acc = rgb(sc.get("accent", sp["accent"]))
        self.th = Theme(sc.get("theme", sp.get("theme", "dark")), self.acc)
        for k, v in {**(sp.get("palette") or {}), **(sc.get("palette") or {})}.items():   # 그룹이 정한 색 · 장면마다 덮어쓰기 가능
            setattr(self.th, k, rgb(v) if isinstance(v, str) else tuple(v))
        global TH
        TH = self.th
        BASE = self.th.base
        self.dur = float(sc["dur"])
        self.voice = None
        self.voices = []                                  # [(장면 안 시각, 파일)]
        lead = sp.get("voice_lead", 0.3)
        if sc.get("voice"):
            self.voice = str((root / sc["voice"]).resolve())
            vlen = probe(self.voice)["duration"]
            self.voices.append((lead, self.voice))
            self.dur = max(self.dur, vlen + lead + 0.45)
            if sc["type"] in ("quiz", "qcard"):           # 질문 → 생각할 틈 → 정답 공개 → 정답 목소리
                self.reveal = lead + vlen + sc.get("think", 1.1)
                if sc.get("voice_answer"):
                    va = str((root / sc["voice_answer"]).resolve())
                    self.voices.append((self.reveal + 0.15, va))
                    self.dur = max(self.dur, self.reveal + 0.15 + probe(va)["duration"] + 0.8)
                else:
                    self.dur = max(self.dur, self.reveal + 2.2)
        if sc["type"] in ("quiz", "qcard") and not sc.get("voice"):
            self.reveal = sc.get("reveal", 2.2)
        self.bg = self.th.background()
        if sc["type"] == "cover" and sc.get("src"):
            im = Image.open(root / sc["src"]).convert("RGB")
            ph_h = int(H * 0.60)
            fx, fy = sc.get("focus", [0.5, 0.5])
            r = max(W / im.width, ph_h / im.height)
            big = im.resize((int(im.width * r + 1), int(im.height * r + 1)), Image.LANCZOS)
            x = int(clamp(fx * big.width - W / 2, 0, big.width - W)); y = int(clamp(fy * big.height - ph_h / 2, 0, big.height - ph_h))
            bg = Image.new("RGBA", (W, H), BASE + (255,))
            bg.paste(big.crop((x, y, x + W, y + ph_h)), (0, 0))
            g = Image.new("L", (1, H))
            for yy in range(H):
                top = clamp(1 - yy / 330) * (170 if self.th.mode == "dark" else 120)   # 위 글자 읽히게
                bot = clamp((yy - ph_h * 0.55) / (ph_h * 0.45)) * 255           # 사진 → 남색
                g.putpixel((0, yy), int(max(top, bot)))
            bg = Image.composite(Image.new("RGBA", (W, H), BASE + (255,)), bg, g.resize((W, H)))
            self.bg = bg
        if sc["type"] == "hook" and sc.get("src"):          # 훅 뒤에 현장 사진 (예: 가르치는 장면)
            im = Image.open(root / sc["src"]).convert("RGB")
            ph = fit_cover(im, (W, H))
            self.bg = Image.blend(ph, Image.new("RGB", (W, H), BASE), 0.62 if self.th.mode == "dark" else 0.78).convert("RGBA")
        if sc["type"] == "vlog":                            # 브이로그: 사진은 가로 꽉 차게, 줌 펀치로 들어간다
            self.vph = Image.open(root / sc["src"]).convert("RGB")
        if sc["type"] in ("split", "unbox", "quiz"):
            self.panels = {}
            for key, src in (("a", sc.get("a", {}).get("photo")), ("b", sc.get("b", {}).get("photo")), ("src", sc.get("src"))):
                if src:
                    self.panels[key] = Image.open(root / src).convert("RGB")
        if sc["type"] == "photo":
            im = Image.open(root / sc["src"]).convert("RGB")
            if sc.get("warm"):                                  # 따뜻한 필터: 주황빛 살짝 + 채도 조금 낮게
                from PIL import ImageEnhance
                im = Image.blend(ImageEnhance.Color(im).enhance(0.85), Image.new("RGB", im.size, (255, 176, 110)), 0.12)
            blur = fit_cover(im, (W // 4, H // 4)).filter(ImageFilter.GaussianBlur(6)).resize((W, H), Image.LANCZOS)
            dark = Image.new("RGB", (W, H), BASE)
            self.bg = Image.blend(blur, dark, 0.55 if self.th.mode == "dark" else 0.72).convert("RGBA")
            cw = W - 2 * 60; ch = int(cw * min(1.0, im.height / im.width) * 1.0)
            ch = max(560, min(ch, 820))
            fx, fy = sc.get("focus", [0.5, 0.5])
            big = fit_cover(im, (int(cw * 1.08), int(ch * 1.08)))
            self.card, self.cw, self.ch, self.focus = big, cw, ch, (fx, fy)
            m = Image.new("L", (cw, ch), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, cw, ch), 34, fill=255)
            self.mask = m

    def frame(self, t: float) -> Image.Image:
        sc, acc = self.sc, self.acc
        global TH
        TH = self.th
        T = self.th
        img = self.bg.copy()
        ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))   # 투명도 있는 글자 · 선은 이 층에 그려 마지막에 섞는다
        typ = sc["type"]
        if typ not in ("hook", "intro", "diary"):
            top_bar(img, self.sp, acc)
        if typ == "cover" and sc.get("emoji"):              # 카드형 표지: 그룹색 바탕 · 이모지 · 두 줄 (2026-10-20 시안)
            d = ImageDraw.Draw(ov)
            em = emoji_img(sc["emoji"], 220)
            img.alpha_composite(em, (X0 - 10, 720))
            y = 990
            for ln in sc["lines"]:
                d.text((X0, y), ln, font=F("black", 112 if len(ln) <= 8 else 96), fill=T.ink + (255,)); y += 140
        elif typ == "cover":
            l1, l2 = sc["lines"][0], sc["lines"][1]
            f1 = F("bold", 78 if len(l1) <= 11 else 66)
            draw_line(img, l1, f1, X0 - 6, 1080, acc)
            n2 = len(re.sub(r"[\[\]]", "", l2))
            f2 = F("black", 124 if n2 <= 7 else (108 if n2 <= 9 else 92))
            draw_line(img, l2, f2, X0 - 6, 1190, acc)
            if sc.get("proof"):
                ImageDraw.Draw(ov).text((X0, 1400), sc["proof"], font=F("semi", 46), fill=T.cap)
            ImageDraw.Draw(ov).rectangle((0, H - 16, W, H), fill=acc)
        elif typ == "intro":
            d = ImageDraw.Draw(ov)
            k0 = clamp(t / 0.4)
            fe = F("semi", 44); e = sc.get("eyebrow", "SaGA 졸업생 공동체")
            d.text(((W - fe.getlength(e)) / 2, 560 - (1 - ease_out(k0)) * 20), e, font=fe, fill=T.sub + (int(255 * k0),))
            k1 = (t - 0.2) / 0.45
            draw_line(img, sc.get("title", "SCIC"), F("black", 230), 0, 640, acc, alpha=clamp(k1 * 1.6),
                      scale=0.7 + 0.3 * back(k1), center=True)
            k2 = clamp((t - 0.8) / 0.45)
            fs = F("bold", 76); sub = sc.get("sub", "그룹을 소개합니다")
            d.text(((W - fs.getlength(sub)) / 2, 960 + (1 - ease_out(k2)) * 40), sub, font=fs, fill=T.ink + (int(255 * k2),))
            lw = int(560 * ease_out((t - 0.5) / 0.6))                       # 그룹색 선이 양옆으로
            if lw > 0:
                d.rounded_rectangle((W // 2 - lw // 2, 1080, W // 2 + lw // 2, 1088), 4, fill=T.chip_bg)
            k3 = (t - 1.35) / 0.4
            if k3 > 0:
                chip = f"{sc.get('no', '')}  {self.sp['group']}".strip()
                fc = F("black", 64); cw = fc.getlength(chip) + 72
                lay = Image.new("RGBA", (int(cw), 112), (0, 0, 0, 0)); ld = ImageDraw.Draw(lay)
                ld.rounded_rectangle((0, 0, cw, 112), 56, fill=T.chip_bg + (255,)); ld.text((36, 14), chip, font=fc, fill=T.chip_fg)
                sc_ = 0.7 + 0.3 * back(k3); lay = lay.resize((max(1, int(lay.width * sc_)), max(1, int(112 * sc_))), Image.LANCZOS)
                lay.putalpha(lay.getchannel("A").point(lambda v: int(v * clamp(k3 * 1.6))))
                img.alpha_composite(lay, ((W - lay.width) // 2, 1150 + (112 - lay.height) // 2))
        elif typ == "hook":
            f = F("black", 104)
            y = 560
            for i, s in enumerate(sc["lines"]):
                k = (t - 0.15 - i * 0.55) / 0.35
                draw_line(img, s, f, X0, y, acc, alpha=clamp(k * 1.6), scale=0.75 + 0.25 * back(k))
                y += 150
        elif typ == "photo":
            z = 1.0 + 0.08 * (t / self.dur)            # 천천히 다가가기
            bw, bh = self.card.size
            vw, vh = int(self.cw * 1.08 / z), int(self.ch * 1.08 / z)
            fx, fy = self.focus
            x = int(clamp(fx * bw - vw / 2, 0, bw - vw)); y = int(clamp(fy * bh - vh / 2, 0, bh - vh))
            cut = self.card.crop((x, y, x + vw, y + vh)).resize((self.cw, self.ch), Image.LANCZOS)
            k = ease_out(t / 0.45)
            cy = 330 + int((1 - k) * 60)
            sh = Image.new("RGBA", (self.cw + 40, self.ch + 40), (0, 0, 0, 0))
            ImageDraw.Draw(sh).rounded_rectangle((20, 26, self.cw + 20, self.ch + 26), 34, fill=(0, 0, 0, int(120 * k)))
            img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(14)), (40, cy - 20))
            card = cut.convert("RGBA"); card.putalpha(self.mask.point(lambda v: int(v * k)))
            img.alpha_composite(card, (60, cy))
            f = F("black", 76)
            y = cy + self.ch + 60
            for i, s in enumerate(sc.get("lines", [])):
                kk = (t - 0.35 - i * 0.45) / 0.35
                draw_line(img, s, f, X0, y + int((1 - ease_out(kk)) * 30), acc, alpha=clamp(kk * 1.5))
                y += 112
            if sc.get("caption"):
                kk = clamp((t - 0.5) / 0.4)
                ImageDraw.Draw(ov).text((X0, y + 10), sc["caption"], font=F("semi", 44), fill=T.cap + (int(255 * kk),))
        elif typ == "stats":
            d = ImageDraw.Draw(ov)
            d.text((X0, 360), sc.get("title", ""), font=F("semi", 44), fill=T.sub)
            y = 470
            for i, (num, lab) in enumerate(sc["items"]):
                k = clamp((t - 0.2 - i * 0.7) / 0.9)
                target = int(re.sub(r"\D", "", num) or 0)
                cur = int(round(target * ease_out(k)))
                s = f"{cur:,}" if "," in num else str(cur)
                if k <= 0:
                    y += 330; continue
                fn = F("black", 210)
                d.text((X0, y), s, font=fn, fill=T.num)
                lx = X0 + fn.getlength(f"{target:,}" if "," in num else str(target)) + 24
                d.text((lx, y + 120), lab, font=F("bold", 62), fill=T.ink + (int(255 * clamp(k * 2)),))
                y += 330
            if sc.get("note"):
                d.text((X0, y + 10), sc["note"], font=F("reg", 36), fill=T.dim)
        elif typ == "motto":
            f = F("black", 128)
            k = (t - 0.2) / 0.5
            draw_line(img, sc["lines"][0], f, X0, 760, acc, alpha=clamp(k * 1.5), scale=0.7 + 0.3 * back(k), center=True)
            for i, s in enumerate(sc["lines"][1:]):
                kk = (t - 0.6 - i * 0.4) / 0.4
                draw_line(img, s, f, X0, 930 + i * 180, acc, alpha=clamp(kk * 1.5), scale=0.7 + 0.3 * back(kk), center=True)
            if sc.get("sub"):
                kk = clamp((t - 1.2) / 0.5)
                fs = F("bold", 56); tw = fs.getlength(sc["sub"])
                ImageDraw.Draw(ov).text(((W - tw) / 2, 1000 + 180 * (len(sc["lines"]) - 1)), sc["sub"], font=fs,
                                         fill=T.cap + (int(255 * kk),))
        elif typ == "cta":
            f = F("black", 112)
            y = 470
            for i, s in enumerate(sc["lines"]):
                k = (t - 0.2 - i * 0.45) / 0.35
                draw_line(img, s, f, X0, y, acc, alpha=clamp(k * 1.5), scale=0.75 + 0.25 * back(k))
                y += 160
            k = clamp((t - 0.9) / 0.5)
            d = ImageDraw.Draw(ov)
            if sc.get("qr"):                                     # QR 자리 — "qr": true 일 때만 (2026-10-20 기본은 뺌)
                bx, by, bs = X0, y + 50, 330
                d.rounded_rectangle((bx, by, bx + bs, by + bs), 28, outline=T.num + (int(255 * k),), width=6)
                d.text((bx + 104, by + 130), "QR", font=F("black", 72), fill=T.num + (int(255 * k),))
                d.multiline_text((bx + bs + 40, by + 40), sc.get("note", ""), font=F("bold", 46), spacing=18,
                                 fill=T.ink + (int(255 * k),))
            elif sc.get("note"):
                d.multiline_text((X0, y + 40), sc["note"], font=F("bold", 48), spacing=18, fill=T.sub + (int(255 * k),))
        elif typ == "split":
            self._split(img, ov, t)
        elif typ == "unbox":
            self._unbox(img, ov, t)
        elif typ == "quiz":
            self._quiz(img, ov, t)
        elif typ == "chat":
            self._chat(img, ov, t)
        elif typ == "checklist":
            self._checklist(img, ov, t)
        elif typ == "diary":
            self._diary(img, ov, t)
        elif typ == "invite":
            self._invite(img, ov, t)
        elif typ == "vlog":
            self._vlog(img, ov, t)
        elif typ in ("alarm", "qcard", "passport", "recipe", "feed", "walkmap"):
            getattr(self, "_" + typ)(img, ov, t)
        img.alpha_composite(ov)
        return img.convert("RGB")

    # ── 형식: 비포 · 애프터 ──
    def _panel(self, im, w, h, focus=(0.5, 0.5), dark=0.45, radius=30):
        fx, fy = focus
        r = max(w / im.width, h / im.height)
        big = im.resize((int(im.width * r + 1), int(im.height * r + 1)), Image.LANCZOS)
        x = int(clamp(fx * big.width - w / 2, 0, big.width - w)); y = int(clamp(fy * big.height - h / 2, 0, big.height - h))
        ph = Image.blend(big.crop((x, y, x + w, y + h)), Image.new("RGB", (w, h), NAVY), dark).convert("RGBA")   # 사진 위 글자용은 늘 어둡게
        m = Image.new("L", (w, h), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, w, h), radius, fill=255)
        ph.putalpha(m)
        return ph

    def _split(self, img, ov, t):
        sc, acc = self.sc, self.acc
        T = self.th
        sw = sc.get("swap_at", 1.7)
        boxes = {"a": (60, 330, 1020, 870), "b": (60, 910, 1020, 1450)}
        for key in ("a", "b"):
            p = sc[key]; x0, y0, x1, y1 = boxes[key]; w, h = x1 - x0, y1 - y0
            k = ease_out((t - (0.05 if key == "a" else sw)) / 0.45)
            if k <= 0:
                continue
            dx = int((1 - k) * (-160 if key == "a" else 160))
            lay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            on_photo = key in self.panels
            if key in self.panels:
                lay.alpha_composite(self._panel(self.panels[key], w, h, p.get("focus", (0.5, 0.5)), dark=0.5 if key == "b" else 0.7))
            else:
                ImageDraw.Draw(lay).rounded_rectangle((0, 0, w, h), 30, fill=(T.panel_a if key == "a" else T.panel_b) + (255,))
            on_photo = key in self.panels
            d = ImageDraw.Draw(lay)
            if key == "b":
                d.rounded_rectangle((0, 0, w - 1, h - 1), 30, outline=acc + (255,), width=7)
            tag = p.get("label", "BEFORE" if key == "a" else "AFTER")
            ft = F("black", 44); tw = ft.getlength(tag)
            d.rounded_rectangle((36, 34, 36 + tw + 48, 34 + 72), 36, fill=((120, 128, 146) if key == "a" else acc) + (255,))
            d.text((60, 42), tag, font=ft, fill=NAVY)
            global TH
            keep = TH
            if on_photo:
                TH = Theme("dark", acc)                     # 사진 위는 흰 글자
            draw_line(lay, p["text"], F("black", 104 if len(p["text"]) <= 10 else 88), 40, h // 2 - 70,
                      (150, 158, 176) if key == "a" else acc)
            if p.get("sub"):
                d.text((44, h // 2 + 70), p["sub"], font=F("bold", 48), fill=TH.cap)
            TH = keep
            if key == "a" and t > sw:                      # 애프터가 오면 비포는 어두워지고 줄이 그어진다
                kd = ease_out((t - sw) / 0.5)
                dim = Image.new("RGBA", (w, h), T.base + (int(120 * kd),)); dm = Image.new("L", (w, h), 0)
                ImageDraw.Draw(dm).rounded_rectangle((0, 0, w, h), 30, fill=int(120 * kd)); dim.putalpha(dm)
                lay.alpha_composite(dim)
                ImageDraw.Draw(lay).line((36, h // 2 - 10, 36 + int((w - 120) * kd), h // 2 - 22), fill=(240, 98, 120, 255), width=12)
            if k < 1:
                lay.putalpha(lay.getchannel("A").point(lambda v: int(v * k)))
            img.alpha_composite(lay, (x0 + dx, y0))

    # ── 형식: 언박싱 ──
    def _unbox(self, img, ov, t):
        sc, acc = self.sc, self.acc
        d = ImageDraw.Draw(ov)
        if sc.get("no"):
            k = clamp(t / 0.3)
            d.text((X0, 318), sc["no"], font=F("black", 60), fill=self.th.num + (int(255 * k),))
        bx0, bx1, top, bot = 270, 810, 1010, 1300
        drop = int((1 - back(t / 0.35)) * -260) if t < 0.35 else 0
        top += drop; bot += drop
        kraft, side, dark = (201, 154, 102), (176, 132, 84), (120, 86, 52)
        kf = ease_out((t - 0.35) / 0.5)                    # 뚜껑 열림
        # 사진 카드: 상자 안에서 위로 솟음
        kc = ease_out((t - 0.75) / 0.8)
        if "src" in self.panels and kc > 0:
            cw, ch = 860, 600
            sc_ = 0.35 + 0.65 * kc
            w2, h2 = int(cw * sc_), int(ch * sc_)
            card = self._panel(self.panels["src"], cw, ch, sc.get("focus", (0.5, 0.5)), dark=0.0, radius=34).resize((w2, h2), Image.LANCZOS)
            cy = int(top + 40 - (top + 40 - 410) * kc)
            img.alpha_composite(card, ((W - w2) // 2, cy))
        g = ImageDraw.Draw(img)
        g.polygon([(bx0, top), (bx1, top), (bx1, bot), (bx0, bot)], fill=kraft)               # 앞면
        g.polygon([(bx0, top), (bx0 + 60, top - 70), (bx1 + 60, top - 70), (bx1, top)], fill=dark) # 입구
        g.rectangle((bx0, top + 40, bx1, top + 92), fill=self.th.chip_bg)                       # 그룹색 띠
        fl = int(150 * kf)                                                                     # 날개
        g.polygon([(bx0, top), (bx0 + 60, top - 70), (bx0 + 60 - 120 - fl, top - 70 - 90 * kf), (bx0 - 120 * kf - fl // 2, top - 40 * kf)], fill=side)
        g.polygon([(bx1, top), (bx1 + 60, top - 70), (bx1 + 60 + 40 + fl, top - 70 - 90 * kf), (bx1 + 40 + fl // 2, top - 30 * kf)], fill=side)
        if kc > 0.6:                                                                          # 반짝이
            ks = clamp((kc - 0.6) / 0.4)
            for (sx, sy, r) in ((170, 420, 30), (930, 380, 24), (900, 860, 34), (150, 820, 22)):
                rr = int(r * ks)
                d.polygon([(sx, sy - rr), (sx + rr // 4, sy - rr // 4), (sx + rr, sy), (sx + rr // 4, sy + rr // 4),
                           (sx, sy + rr), (sx - rr // 4, sy + rr // 4), (sx - rr, sy), (sx - rr // 4, sy - rr // 4)], fill=self.th.num + (int(255 * ks),))
        y = bot + 40
        for i, line in enumerate(sc.get("lines", [])):
            kk = (t - 1.4 - i * 0.35) / 0.35
            draw_line(img, line, F("black", 72), X0, y, acc, alpha=clamp(kk * 1.5))
            y += 100

    # ── 형식: 메신저 대화 ──
    def _chat(self, img, ov, t):
        sc, T = self.sc, self.th
        msgs = sc["messages"]                                   # [["me"|"you", "글"], …]
        x0, y0, x1, y1 = 60, 330, 1020, 1330
        k = ease_out(t / 0.4)
        lay = Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
        w, h = lay.size
        d.rounded_rectangle((0, 0, w, h), 44, fill=(255, 255, 255, 255))
        d.rounded_rectangle((0, 0, w, 120), 44, fill=(246, 247, 250, 255)); d.rectangle((0, 70, w, 120), fill=(246, 247, 250, 255))
        d.ellipse((34, 26, 102, 94), fill=T.chip_bg + (255,))
        d.text((122, 34), sc.get("title", "멘토님"), font=F("bold", 44), fill=(20, 26, 43))
        step = sc.get("step", max(0.9, (self.dur - 1.4) / max(1, len(msgs))))
        y = 160
        fm = F("semi", 52)
        for i, (who, text) in enumerate(msgs):
            at = 0.5 + i * step
            if t < at - (0.45 if who == "you" else 0):
                if who == "you" and t >= at - 0.45:              # 상대가 입력 중 …
                    pass
                break
            if who == "you" and t < at:
                d.rounded_rectangle((34, y, 170, y + 70), 35, fill=(236, 238, 242, 255))
                for j in range(3):
                    ph = (t * 6 + j) % 3
                    d.ellipse((62 + j * 34, y + 26 + (4 if ph < 1 else 0), 80 + j * 34, y + 44 + (4 if ph < 1 else 0)), fill=(150, 156, 170, 255))
                break
            kk = ease_out((t - at) / 0.25)
            lines = wrap_plain(text, fm, 660)
            bw = max(fm.getlength(l) for l in lines) + 60; bh = len(lines) * 66 + 40
            bx = 34 if who == "you" else w - 34 - bw
            col = (236, 238, 242) if who == "you" else T.chip_bg if T.mode != "vivid" else tuple(int(c) for c in self.acc)
            txt = (20, 26, 43) if who == "you" else (T.chip_fg if T.mode != "vivid" else T.ink)
            dy = int((1 - kk) * 30)
            d.rounded_rectangle((bx, y + dy, bx + bw, y + bh + dy), 30, fill=col + (int(255 * kk),))
            for j, l in enumerate(lines):
                d.text((bx + 30, y + 18 + j * 66 + dy), l, font=fm, fill=txt + (int(255 * kk),))
            y += bh + 26
        if k < 1:
            lay.putalpha(lay.getchannel("A").point(lambda v: int(v * k)))
        img.alpha_composite(lay, (x0, y0 + int((1 - k) * 60)))
        if sc.get("tag"):
            ImageDraw.Draw(ov).text((x0 + 10, y1 + 20), sc["tag"], font=F("semi", 36), fill=T.sub + (int(255 * k),))

    # ── 형식: 체크리스트 ──
    def _checklist(self, img, ov, t):
        sc, T = self.sc, self.th
        d = ImageDraw.Draw(ov)
        k0 = clamp(t / 0.35)
        d.text((X0, 330), sc.get("title", ""), font=F("black", 72), fill=T.ink + (int(255 * k0),))
        items = sc["items"]
        step = sc.get("step", max(0.7, (self.dur - 1.2) / max(1, len(items))))
        y = 470
        for i, it in enumerate(items):
            at = 0.4 + i * step
            ki = ease_out((t - at) / 0.3)
            if ki <= 0:
                break
            a = int(255 * ki)
            d.rounded_rectangle((X0, y, X0 + 96, y + 96), 22, outline=T.ink + (a,), width=7)
            kc = clamp((t - at - 0.25) / 0.3)                     # 체크 표시가 그어진다
            if kc > 0:
                p1, p2, p3 = (X0 + 20, y + 50), (X0 + 42, y + 74), (X0 + 80, y + 22)
                if kc < 0.5:
                    e = (p1[0] + (p2[0] - p1[0]) * kc * 2, p1[1] + (p2[1] - p1[1]) * kc * 2); d.line([p1, e], fill=T.ink + (255,), width=12)
                else:
                    e = (p2[0] + (p3[0] - p2[0]) * (kc - 0.5) * 2, p2[1] + (p3[1] - p2[1]) * (kc - 0.5) * 2); d.line([p1, p2, e], fill=T.ink + (255,), width=12, joint="curve")
            draw_line(img, it, F("bold", 60 if len(it) <= 14 else 52), X0 + 130, y + 6 + int((1 - ki) * 20), self.acc, alpha=ki)
            y += 150
        if sc.get("note"):
            d.text((X0, y + 20), sc["note"], font=F("semi", 38), fill=T.sub + (int(255 * clamp((t - 1.0) / 0.4)),))

    # ── 형식: 손글씨 일기 ──
    def _diary(self, img, ov, t):
        sc, T = self.sc, self.th
        from PIL import ImageFont
        pen = ImageFont.truetype(str(Path(__file__).resolve().parent.parent / "assets" / "fonts" / "NanumPenScript-Regular.ttf"), sc.get("size", 96))
        x0, y0, x1, y1 = 80, 300, 1000, 1360
        k = ease_out(t / 0.4)
        w, h = x1 - x0, y1 - y0
        lay = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
        d.rounded_rectangle((0, 0, w, h), 26, fill=(252, 246, 232, 255))
        for yy in range(230, h - 40, 130):
            d.line((40, yy, w - 40, yy), fill=(170, 196, 226, 255), width=3)
        d.line((110, 0, 110, h), fill=(236, 140, 140, 255), width=3)
        if sc.get("date"):
            d.text((140, 70), sc["date"], font=pen.font_variant(size=70), fill=(120, 120, 130, 255))
        ink = (34, 54, 110)
        step = sc.get("step", max(1.0, (self.dur - 1.0) / max(1, len(sc["lines"]))))
        for i, ln in enumerate(sc["lines"]):
            kk = clamp((t - 0.5 - i * step) / (step * 0.75))      # 왼쪽부터 써지듯
            if kk <= 0:
                break
            yy = 230 + (i + 1) * 130 - 104
            tw = pen.getlength(ln)
            line = Image.new("RGBA", (int(tw) + 20, 130), (0, 0, 0, 0))
            ImageDraw.Draw(line).text((0, 0), ln, font=pen, fill=ink + (255,))
            m = Image.new("L", line.size, 0); ImageDraw.Draw(m).rectangle((0, 0, int(line.width * kk), line.height), fill=255)
            line.putalpha(Image.composite(line.getchannel("A"), Image.new("L", line.size, 0), m))
            lay.alpha_composite(line, (140, yy))
        if k < 1:
            lay.putalpha(lay.getchannel("A").point(lambda v: int(v * k)))
        img.alpha_composite(lay, (x0, y0 + int((1 - k) * 50)))
        if sc.get("tag"):
            ImageDraw.Draw(ov).text((x0 + 10, y1 + 24), sc["tag"], font=F("semi", 36), fill=T.sub + (int(255 * k),))

    # ── 형식: 하루 브이로그 (REC · 날짜 도장 · 1년 시계) ──
    def _vlog(self, img, ov, t):
        sc, T = self.sc, self.th
        y0, ph = 300, sc.get("photo_h", 640)
        kp = ease_out(t / 0.28)
        z = 1.22 - 0.22 * kp + 0.05 * (t / self.dur)          # 줌 펀치 → 천천히 다가가기
        im = self.vph; fx, fy = sc.get("focus", [0.5, 0.5])
        r = max(W / im.width, ph / im.height) * z
        big = im.resize((int(im.width * r + 1), int(im.height * r + 1)), Image.LANCZOS)
        x = int(clamp(fx * big.width - W / 2, 0, big.width - W)); y = int(clamp(fy * big.height - ph / 2, 0, big.height - ph))
        img.paste(big.crop((x, y, x + W, y + ph)), (0, y0))
        band = Image.new("L", (1, ph))                          # 위 · 아래 어둡게 (흰 글자 읽히게)
        for yy in range(ph):
            band.putpixel((0, yy), int(150 * max(clamp(1 - yy / 170), clamp((yy - ph + 200) / 200))))
        img.alpha_composite(Image.merge("RGBA", [Image.new("L", (W, ph), 0)] * 3 + [band.resize((W, ph))]), (0, y0))
        d = ImageDraw.Draw(ov)
        if t < 0.14:                                            # 컷 들어갈 때 번쩍
            d.rectangle((0, y0, W, y0 + ph), fill=(255, 255, 255, int(200 * (1 - t / 0.14))))
        for cx, cy, sx, sy in ((40, y0 + 34, 1, 1), (W - 40, y0 + 34, -1, 1), (40, y0 + ph - 34, 1, -1), (W - 40, y0 + ph - 34, -1, -1)):
            d.line((cx, cy, cx + 70 * sx, cy), fill=(255, 255, 255, 230), width=6)   # 뷰파인더 모서리
            d.line((cx, cy, cx, cy + 70 * sy), fill=(255, 255, 255, 230), width=6)
        if int(t * 2) % 2 == 0:
            d.ellipse((76, y0 + 66, 110, y0 + 100), fill=(255, 40, 40, 255))
        fr = F("bold", 40)
        d.text((124, y0 + 60), "REC", font=fr, fill=(255, 255, 255, 240))
        if sc.get("osd"):
            fo = F("bold", 38); ow = fo.getlength(sc["osd"])
            d.text((W - 76 - ow + 2, y0 + 64), sc["osd"], font=fo, fill=(0, 0, 0, 120))
            d.text((W - 76 - ow, y0 + 62), sc["osd"], font=fo, fill=(255, 255, 255, 240))
        if sc.get("place"):                                     # 장소는 사진 왼쪽 아래
            kk = clamp((t - 0.45) / 0.35); fp = F("black", 56)
            d.text((80, y0 + ph - 116), sc["place"], font=fp, fill=(0, 0, 0, int(150 * kk)))
            d.text((76, y0 + ph - 120), sc["place"], font=fp, fill=(255, 255, 255, int(255 * kk)))
        ks = (t - 0.2) / 0.35                                    # 날짜 도장
        yy = y0 + ph + 140
        if ks > 0:
            fs = F("black", 150); stamp = sc.get("stamp", "")
            sw = fs.getlength(stamp)
            lay = Image.new("RGBA", (int(sw) + 40, 190), (0, 0, 0, 0))
            ImageDraw.Draw(lay).text((0, 0), stamp, font=fs, fill=T.ink + (255,))
            s_ = 1.25 - 0.25 * back(ks)
            lay = lay.resize((max(1, int(lay.width * s_)), max(1, int(lay.height * s_))), Image.LANCZOS)
            lay.putalpha(lay.getchannel("A").point(lambda v: int(v * clamp(ks * 2))))
            img.alpha_composite(lay, (X0, yy - int((lay.height - 190) / 2)))
            if sc.get("day"):
                fd = F("bold", 52); dw = fd.getlength(sc["day"])
                dx = X0 + int(sw) + 34
                d.rounded_rectangle((dx, yy + 52, dx + dw + 44, yy + 132), 40, fill=T.chip_bg + (int(255 * clamp(ks * 2)),))
                d.text((dx + 22, yy + 60), sc["day"], font=fd, fill=T.chip_fg + (int(255 * clamp(ks * 2)),))
        y = yy + 210
        for i, s in enumerate(sc.get("lines", [])):
            kk = (t - 0.6 - i * 0.4) / 0.3
            draw_line(img, s, F("black", 70), X0, y + int((1 - ease_out(kk)) * 24), self.acc, alpha=clamp(kk * 1.6))
            y += 104
        if sc.get("month"):                                     # 1년 시계: 1~12월 점, 이번 달까지 채운다
            m = int(sc["month"]); gy = y0 + ph + 60; gx0, gx1 = X0 + 10, W - X0 - 10
            step = (gx1 - gx0) / 11
            fill_k = ease_out((t - 0.3) / 0.8)
            d.line((gx0, gy, gx1, gy), fill=T.dim + (255,), width=4)
            d.line((gx0, gy, gx0 + (m - 1) * step * fill_k, gy), fill=T.ink + (255,), width=8)
            fm = F("semi", 30)
            for j in range(12):
                cx = gx0 + j * step; on = j + 1 <= 1 + (m - 1) * fill_k
                rr = 16 if j + 1 == m else 9
                d.ellipse((cx - rr, gy - rr, cx + rr, gy + rr), fill=(T.ink if on else T.dim) + (255,))
                if j + 1 == m:
                    lab = f"{m}월"; d.text((cx - fm.getlength(lab) / 2, gy + 24), lab, font=fm, fill=T.ink + (255,))

    # ── 형식: 알람 (06:30 카운트다운) ──
    def _alarm(self, img, ov, t):
        sc, T = self.sc, self.th
        d = ImageDraw.Draw(ov)
        tgt = sc["time"]; frm = sc.get("from")
        shown = tgt
        if frm and ":" in frm:                                  # 분이 째깍째깍 넘어간다
            h0, m0 = map(int, frm.split(":")); h1, m1 = map(int, tgt.split(":"))
            a, b = h0 * 60 + m0, h1 * 60 + m1
            cur = a + int((b - a) * clamp((t - 0.2) / 1.0) + 1e-6)
            shown = f"{cur // 60:02d}:{cur % 60:02d}"
        ring = shown == tgt
        rt = t - (1.2 if frm else 0.3)
        shake = int(14 * math.sin(rt * 60) * clamp(1 - rt / 0.7)) if ring and 0 < rt < 0.7 else 0
        k = ease_out(t / 0.35)
        x0, y0, x1, y1 = 60 + shake, 360, 1020 + shake, 960
        a = int(255 * k)
        d.rounded_rectangle((x0, y0 + int((1 - k) * 40), x1, y1 + int((1 - k) * 40)), 48, fill=T.ink + (a,))
        fa = F("bold", 56)
        if sc.get("ampm"):
            d.text((x0 + 70, y0 + 60), sc["ampm"], font=fa, fill=T.base + (a,))
        if sc.get("day"):
            dw = fa.getlength(sc["day"]); d.text((x1 - 70 - dw, y0 + 60), sc["day"], font=fa, fill=T.base + (a,))
        ft = F("black", 250 if len(shown) <= 5 else 200)
        tw = ft.getlength(shown)
        d.text(((x0 + x1 - tw) / 2, y0 + 150), shown, font=ft, fill=T.num + (a,))
        if ring and rt > 0:                                     # 울리는 물결
            for j in range(3):
                kk = clamp((rt - j * 0.18) / 0.6)
                if 0 < kk < 1:
                    rr = 40 + 120 * kk; al = int(200 * (1 - kk))
                    for cx in (x0 + 10, x1 - 10):
                        d.arc((cx - rr, (y0 + y1) / 2 - rr, cx + rr, (y0 + y1) / 2 + rr), 0, 360, fill=T.num + (al,), width=10)
        if sc.get("label"):
            kl = clamp((t - 0.5) / 0.35); fl = F("bold", 50); lw = fl.getlength(sc["label"])
            d.text((x0 + (x1 - x0 - lw) / 2, y1 - 112), sc["label"], font=fl, fill=T.base + (int(a * kl),))
        y = 1030
        for i, ln in enumerate(sc.get("lines", [])):
            kk = (t - 0.7 - i * 0.4) / 0.3
            draw_line(img, ln, F("black", 76), X0, y + int((1 - ease_out(kk)) * 24), self.acc, alpha=clamp(kk * 1.6))
            y += 112

    # ── 형식: 선배에게 묻다 (Q 카드 → A 카드) ──
    def _qcard(self, img, ov, t):
        sc, T = self.sc, self.th
        d = ImageDraw.Draw(ov)
        rv = self.reveal
        kq = ease_out(t / 0.35)
        if sc.get("no"):
            d.text((X0, 330), sc["no"], font=F("bold", 46), fill=T.sub + (int(255 * kq),))
        d.text((X0 - 6, 380 - int((1 - kq) * 30)), "Q.", font=F("black", 130), fill=T.ink + (int(255 * kq),))
        fq = F("black", 74)
        y = 530
        for i, ln in enumerate(wrap_plain(sc["q"], fq, 900)):
            d.text((X0, y), ln, font=fq, fill=T.ink + (int(255 * kq),)); y += 98
        ka = ease_out((t - rv) / 0.45)
        if ka > 0:
            cy = y + 36 + int((1 - ka) * 90)
            n = len(sc["a"])
            ch = 150 + n * 96 + (60 if sc.get("tag") else 0)
            d.rounded_rectangle((60, cy, 1020, cy + ch), 40, fill=T.panel_b + (int(255 * ka),))
            d.text((110, cy + 30), "A.", font=F("black", 96), fill=self.acc + (int(255 * ka),))
            fa = F("black", 66)
            for i, ln in enumerate(sc["a"]):
                kk = clamp((t - rv - 0.2 - i * 0.3) / 0.3)
                d.text((250, cy + 46 + i * 96), ln, font=fa, fill=(20, 26, 43, int(255 * kk * ka)))
            if sc.get("tag"):
                d.text((250, cy + 60 + n * 96), sc["tag"], font=F("semi", 42), fill=(90, 96, 112, int(255 * ka)))
            if sc.get("src"):                                   # 증거 사진
                py = cy + ch + 30; hh = min(sc.get("photo_h", 330), 1490 - py)
                if hh > 120:
                    if not hasattr(self, "qph"):
                        self.qph = Image.open(self.root / sc["src"]).convert("RGB")
                    card = self._panel(self.qph, 960, hh, sc.get("focus", (0.5, 0.5)), dark=0.0, radius=30)
                    kk = ease_out((t - rv - 0.5) / 0.4)
                    card.putalpha(card.getchannel("A").point(lambda v: int(v * kk)))
                    img.alpha_composite(card, (60, py + int((1 - kk) * 40)))

    # ── 형식: 여권 도장 ──
    def _passport(self, img, ov, t):
        sc, T = self.sc, self.th
        k = ease_out(t / 0.35)
        x0, y0, x1, y1 = 80, 330, 1000, 1200
        page = Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0)); pd = ImageDraw.Draw(page)
        pd.rounded_rectangle((0, 0, x1 - x0, y1 - y0), 30, fill=(250, 247, 238, 255))
        pd.text((50, 40), "PASSPORT  ·  여권", font=F("bold", 40), fill=(120, 116, 104, 255))
        pd.text((x1 - x0 - 230, 40), sc.get("page", "VISAS"), font=F("bold", 40), fill=(120, 116, 104, 255))
        for yy in range(130, y1 - y0 - 30, 90):
            pd.line((50, yy, x1 - x0 - 50, yy), fill=(228, 222, 206, 255), width=2)
        new = sc.get("new", 0)
        for j, st in enumerate(sc["stamps"]):
            ks = 1.0 if j < new else (t - 0.3 - (j - new) * 0.55) / 0.3
            if ks <= 0:
                continue
            col = rgb(st.get("color", "#1F4FB8"))
            f1, f2 = F("black", 64), F("bold", 40)
            w = int(max(f1.getlength(st["text"]), f2.getlength(st.get("sub", ""))) + 90); h = 200
            lay = Image.new("RGBA", (w + 20, h + 20), (0, 0, 0, 0)); ld = ImageDraw.Draw(lay)
            ld.rounded_rectangle((10, 10, w + 10, h + 10), 26, outline=col + (235,), width=8)
            ld.rounded_rectangle((24, 24, w - 4, h - 4), 18, outline=col + (200,), width=3)
            ld.text((45, 40), st["text"], font=f1, fill=col + (235,))
            ld.text((47, 122), st.get("sub", ""), font=f2, fill=col + (220,))
            lay = lay.rotate(st.get("rot", -6), expand=True, resample=Image.BICUBIC)
            sc_ = 1.0 if j < new else 1.7 - 0.7 * ease_out(clamp(ks))
            if sc_ != 1.0:
                lay = lay.resize((int(lay.width * sc_), int(lay.height * sc_)), Image.LANCZOS)
            if j >= new:
                lay.putalpha(lay.getchannel("A").point(lambda v: int(v * clamp(ks * 1.5))))
            px, py = st["pos"]
            cx, cy = int(px * (x1 - x0)), int(py * (y1 - y0))
            page.alpha_composite(lay, (max(0, cx - lay.width // 2), max(0, cy - lay.height // 2)))
        if k < 1:
            page.putalpha(page.getchannel("A").point(lambda v: int(v * k)))
        img.alpha_composite(page, (x0, y0 + int((1 - k) * 40)))
        y = y1 + 50
        for i, ln in enumerate(sc.get("lines", [])):
            kk = (t - 0.6 - i * 0.4) / 0.3
            draw_line(img, ln, F("black", 72), X0, y + int((1 - ease_out(kk)) * 24), self.acc, alpha=clamp(kk * 1.6))
            y += 106

    # ── 형식: 레시피 카드 ──
    def _recipe(self, img, ov, t):
        sc, T = self.sc, self.th
        from PIL import ImageFont
        pen = ImageFont.truetype(str(Path(__file__).resolve().parent.parent / "assets" / "fonts" / "NanumPenScript-Regular.ttf"), 110)
        k = ease_out(t / 0.35)
        x0, y0, x1 = 70, 330, 1010
        items = sc["items"]; hl = sc.get("hl")
        y1 = y0 + 230 + len(items) * 170 + (110 if sc.get("result") else 0)
        card = Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0)); cd = ImageDraw.Draw(card)
        cd.rounded_rectangle((0, 0, x1 - x0, y1 - y0), 34, fill=(253, 248, 238, 255))
        cd.text((60, 40), sc.get("title", "레시피"), font=pen, fill=(92, 58, 30, 255))
        cd.line((60, 175, x1 - x0 - 60, 175), fill=(214, 196, 170, 255), width=3)
        for i, (name, meas) in enumerate(items):
            ki = 1.0 if hl is not None else clamp((t - 0.4 - i * 0.45) / 0.3)
            if ki <= 0:
                continue
            yy = 215 + i * 170
            on = hl is None or hl == i
            if hl == i:
                kh = ease_out((t - 0.2) / 0.35)
                cd.rounded_rectangle((36, yy - 18, int(36 + (x1 - x0 - 72) * kh), yy + 140), 24, fill=self.acc + (255,))
            col = (40, 26, 14, int(255 * ki)) if on else (170, 156, 140, 255)
            cd.ellipse((60, yy + 20, 140, yy + 100), fill=((92, 58, 30) if on else (206, 192, 176)) + (int(255 * ki),))
            cd.text((84, yy + 24), str(i + 1), font=F("black", 56), fill=(253, 248, 238, int(255 * ki)))
            cd.text((170, yy + 10), name, font=F("black", 66), fill=col)
            cd.text((172, yy + 92), meas, font=F("bold", 40), fill=((92, 58, 30, int(255 * ki)) if on else (180, 166, 150, 255)))
        if sc.get("result"):
            kr = clamp((t - 0.4 - len(items) * 0.45) / 0.4) if hl is None else 1.0
            cd.text((60, y1 - y0 - 120), sc["result"], font=pen.font_variant(size=84), fill=(92, 58, 30, int(255 * kr)))
        if k < 1:
            card.putalpha(card.getchannel("A").point(lambda v: int(v * k)))
        img.alpha_composite(card, (x0, y0 + int((1 - k) * 40)))

    # ── 형식: 세로 피드 화면 ──
    def _feed(self, img, ov, t):
        sc, T = self.sc, self.th
        k = ease_out(t / 0.35)
        px0, py0, pw, phh = 200, 320, 680, 1150
        ph = Image.new("RGBA", (pw, phh), (0, 0, 0, 0)); pd = ImageDraw.Draw(ph)
        pd.rounded_rectangle((0, 0, pw, phh), 70, fill=(20, 26, 43, 255))
        sx0, sy0, sw, sh = 22, 22, pw - 44, phh - 44
        scr = Image.new("RGBA", (sw, sh), (255, 255, 255, 255)); sd = ImageDraw.Draw(scr)
        off = int(sc.get("scroll", 0) * ease_out((t - 0.3) / max(0.5, self.dur - 1.2)))
        y = 110 - off
        for j, po in enumerate(sc["posts"]):
            hh = 380
            if y > sh or y + hh < 0:
                y += hh + 30; continue
            clear = po.get("kind") == "clear"
            sd.ellipse((30, y, 86, y + 56), fill=self.acc if clear else (196, 198, 204))
            sd.text((100, y + 8), po.get("user", "@on_site0" if clear else "user"), font=F("bold", 34), fill=(30, 30, 40) if clear else (150, 152, 160))
            box = (30, y + 76, sw - 30, y + hh - 50)
            if clear:
                sd.rounded_rectangle(box, 24, fill=self.acc)
                ft = F("black", 50)
                for i, ln in enumerate(po["title"].split("\n")):
                    sd.text((60, y + 110 + i * 66), ln, font=ft, fill=(255, 255, 255))
            else:
                sd.rounded_rectangle(box, 24, fill=(214, 216, 222))
                sd.text((60, y + 120), po.get("title", "!!!"), font=F("black", 54), fill=(160, 162, 170))
            sd.text((34, y + hh - 44), "♡" if not clear else "♥", font=F("bold", 38), fill=self.acc if clear else (170, 172, 180))
            y += hh + 30
        sd.rectangle((0, 0, sw, 90), fill=(255, 255, 255)); sd.text((30, 24), sc.get("app", "피드"), font=F("black", 44), fill=(20, 26, 43))
        ph.alpha_composite(Image.new("RGBA", (sw, sh), (0, 0, 0, 0)), (sx0, sy0))
        m = Image.new("L", (sw, sh), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, sw, sh), 52, fill=255)
        scr.putalpha(m); ph.alpha_composite(scr, (sx0, sy0))
        if k < 1:
            ph.putalpha(ph.getchannel("A").point(lambda v: int(v * k)))
        img.alpha_composite(ph, (px0, py0 + int((1 - k) * 50)))
        d = ImageDraw.Draw(ov)
        if sc.get("notify"):                                    # 위에서 내려오는 알림
            kn = ease_out((t - 0.7) / 0.35)
            if kn > 0:
                ny = py0 + 40 - int((1 - kn) * 120)
                d.rounded_rectangle((px0 - 60, ny, px0 + pw + 60, ny + 130), 34, fill=(255, 255, 255, int(245 * kn)), outline=(20, 26, 43, int(60 * kn)), width=2)
                d.ellipse((px0 - 30, ny + 33, px0 + 34, ny + 97), fill=self.acc + (int(255 * kn),))
                d.text((px0 + 56, ny + 18), sc["notify"][0], font=F("black", 40), fill=(20, 26, 43, int(255 * kn)))
                d.text((px0 + 56, ny + 72), sc["notify"][1], font=F("semi", 34), fill=(90, 96, 112, int(255 * kn)))
        if sc.get("comment"):                                   # 아래에서 올라오는 댓글
            kc = ease_out((t - 0.9) / 0.35)
            if kc > 0:
                cy = py0 + phh - 260 + int((1 - kc) * 80)
                d.rounded_rectangle((px0 - 40, cy, px0 + pw + 40, cy + 170), 34, fill=(255, 255, 255, int(250 * kc)), outline=self.acc + (int(255 * kc),), width=5)
                d.text((px0, cy + 22), sc["comment"][0], font=F("bold", 34), fill=(120, 124, 136, int(255 * kc)))
                d.text((px0, cy + 76), sc["comment"][1], font=F("black", 50), fill=(20, 26, 43, int(255 * kc)))
        for j in range(sc.get("hearts", 0)):                     # 하트가 떠오른다
            kh = (t - 0.8 - j * 0.25) / 1.2
            if 0 < kh < 1:
                hx = px0 + pw - 40 + int(30 * math.sin(kh * 6 + j)); hy = py0 + phh - 120 - int(kh * 520)
                d.text((hx, hy), "♥", font=F("black", 70 + j * 6), fill=self.acc + (int(255 * (1 - kh)),))

    # ── 형식: 산책 지도 ──
    def _walkmap(self, img, ov, t):
        sc, T = self.sc, self.th
        k = ease_out(t / 0.35)
        x0, y0, x1, y1 = 60, 330, 1020, 1130
        mw, mh = x1 - x0, y1 - y0
        mp = Image.new("RGBA", (mw, mh), (0, 0, 0, 0)); md = ImageDraw.Draw(mp)
        md.rounded_rectangle((0, 0, mw, mh), 36, fill=(252, 249, 236, 255))
        for (a, b, c, e, wd) in ((0, 0.30, 1, 0.24, 26), (0, 0.72, 1, 0.80, 30), (0.28, 0, 0.36, 1, 24), (0.70, 0, 0.62, 1, 22), (0, 0.50, 1, 0.55, 14)):
            md.line((a * mw, b * mh, c * mw, e * mh), fill=(234, 228, 206, 255), width=wd)
        md.ellipse((0.74 * mw, 0.08 * mh, 0.96 * mw, 0.30 * mh), fill=(222, 236, 206, 255))   # 공원
        pins = sc["pins"]; upto = sc.get("upto", len(pins)); frm = sc.get("from", upto - 1)
        pts = [(p[1] * mw, p[2] * mh) for p in pins]
        for j in range(1, upto):                                 # 점선 길이 이어진다
            kk = 1.0 if j < frm + 1 and j <= frm else ease_out((t - 0.3 - (j - frm - 1) * 0.6) / 0.6)
            if j <= frm:
                kk = 1.0
            (ax, ay), (bx, by) = pts[j - 1], pts[j]
            n = int(math.hypot(bx - ax, by - ay) / 26)
            for q in range(int(n * kk)):
                if q % 2 == 0:
                    u0, u1 = q / n, min(1, (q + 1) / n)
                    md.line((ax + (bx - ax) * u0, ay + (by - ay) * u0, ax + (bx - ax) * u1, ay + (by - ay) * u1), fill=(60, 52, 40, 255), width=9)
        for j in range(upto):
            kp = 1.0 if j < frm else back((t - 0.3 - max(0, j - frm) * 0.6 - 0.4) / 0.4)
            if kp <= 0:
                continue
            cx, cy = pts[j]; cur = j >= frm
            rr = (34 if cur else 24) * max(0.01, kp)
            md.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=(self.acc if cur else (60, 52, 40)) + (255,), outline=(60, 52, 40, 255), width=6)
            fl = F("black" if cur else "bold", 46 if cur else 36); lab = pins[j][0]
            lw = fl.getlength(lab); lx = clamp(cx - lw / 2, 20, mw - lw - 20)
            ly = cy + rr + 12 if pins[j][2] < 0.8 else cy - rr - 66
            if cur:
                md.rounded_rectangle((lx - 16, ly - 6, lx + lw + 16, ly + 60), 18, fill=(60, 52, 40, int(255 * min(1, kp))))
                md.text((lx, ly), lab, font=fl, fill=self.acc + (int(255 * min(1, kp)),))
            else:
                md.text((lx, ly), lab, font=fl, fill=(60, 52, 40, 255))
        if k < 1:
            mp.putalpha(mp.getchannel("A").point(lambda v: int(v * k)))
        img.alpha_composite(mp, (x0, y0 + int((1 - k) * 40)))
        y = y1 + 50
        for i, ln in enumerate(sc.get("lines", [])):
            kk = (t - 0.6 - i * 0.4) / 0.3
            draw_line(img, ln, F("black", 70), X0, y + int((1 - ease_out(kk)) * 24), self.acc, alpha=clamp(kk * 1.6))
            y += 104

    # ── 형식: 초대장 ──
    def _invite(self, img, ov, t):
        sc, T = self.sc, self.th
        from PIL import ImageFont
        pen = ImageFont.truetype(str(Path(__file__).resolve().parent.parent / "assets" / "fonts" / "NanumPenScript-Regular.ttf"), 92)
        ex0, ex1, etop, ebot = 140, 940, 1060, 1460
        env = tuple(int(c * 0.82) for c in self.acc)
        kf = ease_out((t - 0.3) / 0.5)                         # 뚜껑 열림
        kc = ease_out((t - 0.7) / 0.9)                         # 카드가 올라옴
        cw, ch = 760, 740
        cx = (W - cw) // 2
        cy = int(etop + 40 - (etop + 40 - 300) * kc)
        g = ImageDraw.Draw(img)
        g.rectangle((ex0, etop, ex1, ebot), fill=tuple(int(c * 0.7) for c in self.acc))     # 봉투 안쪽
        tip = etop + 220 - int(440 * kf)                                                     # 뚜껑: 아래 → 위로 젖혀짐
        flap = [(ex0, etop), ((ex0 + ex1) // 2, tip), (ex1, etop)]
        if kf >= 0.5:                                                                         # 열린 뚜껑은 카드 뒤
            g.polygon(flap, fill=tuple(min(255, int(c * 1.05)) for c in env))
        if kc > 0:
            card = Image.new("RGBA", (cw, ch), (0, 0, 0, 0)); d = ImageDraw.Draw(card)
            d.rounded_rectangle((0, 0, cw, ch), 24, fill=(255, 252, 245, 255), outline=env + (255,), width=6)
            yy = 60
            for kind, text in sc["card"]:                      # [["pen","초대합니다"],["title","…"],["big","…"],["small","…"]]
                f = {"pen": pen, "title": F("black", 64), "big": F("black", 84), "small": F("bold", 42)}[kind]
                col = {"pen": env, "title": (20, 26, 43), "big": env, "small": (70, 76, 92)}[kind]
                for ln in text.split("\n"):
                    tw = f.getlength(ln)
                    d.text(((cw - tw) / 2, yy), ln, font=f, fill=col + (255,))
                    yy += int(f.size * 1.25)
                yy += 22
            img.alpha_composite(card, (cx, cy))
        g = ImageDraw.Draw(img)
        g.polygon([(ex0, etop), (ex1, etop), (ex1, ebot), (ex0, ebot)], fill=env)                  # 봉투 앞면
        g.polygon([(ex0, etop), ((ex0 + ex1) // 2, etop + 200), (ex1, etop)], fill=tuple(int(c * 0.92) for c in env))
        if kf < 0.5:
            g.polygon(flap, fill=tuple(min(255, int(c * 1.05)) for c in env))

    # ── 형식: 퀴즈 ──
    def _quiz(self, img, ov, t):
        sc, acc = self.sc, self.acc
        T = self.th
        d = ImageDraw.Draw(ov)
        rv = self.reveal
        kq = clamp(t / 0.35)
        d.rounded_rectangle((X0, 320, X0 + 110, 430), 26, fill=T.chip_bg + (int(255 * kq),))
        d.text((X0 + 30, 330), "Q", font=F("black", 80), fill=T.chip_fg + (int(255 * kq),))
        fq = F("black", 66)
        lines = wrap_plain(sc["q"], fq, 760)
        for i, ln in enumerate(lines):
            d.text((X0 + 140, 326 + i * 86), ln, font=fq, fill=T.ink + (int(255 * kq),))
        qb = 326 + len(lines) * 86 + 20
        if t < rv:                                                   # 생각할 시간 막대
            think = sc.get("think", 1.1)
            k = clamp((rv - t) / think) if t > rv - think else 1.0
            d.rounded_rectangle((X0, qb, X0 + int(912 * k), qb + 14), 7, fill=T.chip_bg + (220,))
        kp = ease_out((t - rv - 0.7) / 0.5)                          # 사진 카드가 보기를 덮는다
        y0 = qb + 60
        for i, ch in enumerate(sc["choices"]):
            kc = ease_out((t - 0.3 - i * 0.2) / 0.35)
            if kc <= 0 or kp >= 1:
                continue
            yy = y0 + i * 170
            right = i == sc["answer"] and t >= rv
            wrong = i != sc["answer"] and t >= rv
            a = int(255 * kc * (1 - kp))
            fill = (T.hl_bg + (a,)) if right else (T.choice + (a,) if not wrong else T.choice + (int(a * 0.5),))
            d.rounded_rectangle((X0 - int((1 - kc) * 80), yy, 1000, yy + 140), 28, fill=fill,
                                outline=(T.chip_bg + (a,)) if not right else None, width=4)
            col = T.hl_fg + (a,) if right else (T.ink + (a,) if not wrong else T.dim + (int(a * 0.7),))
            d.text((X0 + 34, yy + 34), "ABC"[i], font=F("black", 64), fill=col)
            d.text((X0 + 110, yy + 40), ch, font=F("bold", 54), fill=col)
            if right:
                d.text((1000 - 150, yy + 44), "정답", font=F("black", 50), fill=T.hl_fg + (a,))
        if kp > 0 and "src" in self.panels:
            cw, ch = 960, 600
            card = self._panel(self.panels["src"], cw, ch, sc.get("focus", (0.5, 0.5)), dark=0.0, radius=34)
            card.putalpha(card.getchannel("A").point(lambda v: int(v * kp)))
            img.alpha_composite(card, (60, y0 + int((1 - kp) * 120)))
            if sc.get("reveal_text"):
                draw_line(img, sc["reveal_text"], F("black", 72), X0, y0 + ch + 40, acc, alpha=clamp((t - rv - 1.0) / 0.4))


def main(spec_path: str) -> Path:
    sp = load(spec_path)
    root = Path(spec_path).resolve().parent
    P = lambda p: str((root / p).resolve()) if not Path(p).is_absolute() else p  # noqa: E731
    scenes = [Scene(sc, sp, root) for sc in sp["scenes"]]
    starts, t0 = [], 0.0
    for s in scenes:
        starts.append(t0); t0 += s.dur
    total = t0
    out = Path(P(sp["out"])); out.parent.mkdir(parents=True, exist_ok=True)
    if scenes[0].sc["type"] == "cover":
        scenes[0].frame(0).save(out.with_name(out.stem + "_표지.jpg"), quality=92)
    silent = out.with_name(out.stem + "_무음.mp4")
    pr = subprocess.Popen(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
                           "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-crf", "18", "-preset", "medium",
                           "-pix_fmt", "yuv420p", str(silent)], stdin=subprocess.PIPE)
    n = int(round(total * FPS))
    for fi in range(n):
        t = fi / FPS
        i = max(k for k in range(len(scenes)) if starts[k] <= t + 1e-9)
        lt = t - starts[i]
        fr = scenes[i].frame(lt)
        xf = float(scenes[i].sc.get("fade", sp.get("fade", XF)))
        if i > 0 and lt < xf:                            # 앞 장면과 겹치기 (느린 컷은 "fade": 0.6)
            prev = scenes[i - 1].frame(scenes[i - 1].dur - 1e-3)
            fr = Image.blend(prev, fr, lt / xf)
        if t > total - 0.5:                              # 끝 0.5초 어둡게
            fr = Image.blend(fr, Image.new("RGB", (W, H), scenes[-1].th.base), (t - (total - 0.5)) / 0.5 * 0.85)
        pr.stdin.write(fr.tobytes())
    pr.stdin.close(); pr.wait()
    lead = sp.get("voice_lead", 0.3)
    vs = [(starts[k] + off, v) for k, s in enumerate(scenes) for off, v in s.voices]
    if sp.get("bgm") or vs:
        ins, fil, labs = ["-i", str(silent)], "", []
        for j, (at, v) in enumerate(vs):
            ins += ["-i", v]
            fil += f"[{j + 1}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={int(at * 1000)}|{int(at * 1000)},apad[v{j}];"
            labs.append(f"[v{j}]")
        if vs:
            fil += "".join(labs) + f"amix=inputs={len(vs)}:normalize=0,atrim=0:{total:.2f},asplit=2[vo][sc];"
        if sp.get("bgm"):
            bi = len(vs) + 1
            ins += ["-stream_loop", "-1", "-ss", f'{float(sp.get("bgm_start", 0)):.2f}', "-i", P(sp["bgm"])]
            vol = sp.get("bgm_volume", 0.5)
            fil += (f"[{bi}:a]aresample=48000,aformat=channel_layouts=stereo,volume={vol},atrim=0:{total:.2f},"
                    f"afade=t=in:d=0.6,afade=t=out:st={total - 1.6:.2f}:d=1.6[bg0];")
            if vs:
                fil += "[bg0][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[bg];[vo][bg]amix=inputs=2:normalize=0[a]"
            else:
                fil += "[bg0]anull[a]"
        else:
            fil += "[vo]anull[a]"
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *ins, "-filter_complex", fil,
                        "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", f"{total:.2f}",
                        "-movflags", "+faststart", str(out)], check=True)
        silent.unlink()
    else:
        silent.rename(out)
    print("DONE", out, f"{total:.1f}s", flush=True)
    return out


if __name__ == "__main__":
    main(sys.argv[1])
