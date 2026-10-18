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
        for k, v in (sp.get("palette") or {}).items():     # 그룹이 직접 정한 색: {"base": "#FFF8E7", "ink": "#000000", "num": "#FFC700", …}
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
            if sc["type"] == "quiz":                      # 질문 → 생각할 틈 → 정답 공개 → 정답 목소리
                self.reveal = lead + vlen + sc.get("think", 1.1)
                if sc.get("voice_answer"):
                    va = str((root / sc["voice_answer"]).resolve())
                    self.voices.append((self.reveal + 0.15, va))
                    self.dur = max(self.dur, self.reveal + 0.15 + probe(va)["duration"] + 0.8)
                else:
                    self.dur = max(self.dur, self.reveal + 2.2)
        if sc["type"] == "quiz" and not sc.get("voice"):
            self.reveal = sc.get("reveal", 2.2)
        self.bg = self.th.background()
        if sc["type"] == "cover":
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
        if typ == "cover":
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
            bx, by, bs = X0, y + 50, 330                        # QR 자리
            d.rounded_rectangle((bx, by, bx + bs, by + bs), 28, outline=T.num + (int(255 * k),), width=6)
            d.text((bx + 104, by + 130), "QR", font=F("black", 72), fill=T.num + (int(255 * k),))
            d.multiline_text((bx + bs + 40, by + 40), sc.get("note", ""), font=F("bold", 46), spacing=18,
                             fill=T.ink + (int(255 * k),))
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
