"""그룹 홍보 영상 16:9 (음악만) — 드라이브 «AI미션그룹 홍보 영상»(2026-10-21) 틀을 그룹마다 색만 바꿔 찍는다.
흐름: 표지(이모지 + 두 줄) → 장면들(왼쪽 글 · 오른쪽 움직이는 아이콘 카드 또는 REC 사진) → 모토 → 마무리(SCIC · 그룹 · SaGA 일터아카데미)
사용: python promo169.py spec.json
spec.json:
{
 "out": "커피선교그룹_홍보_16x9.mp4", "group": "커피선교그룹", "series": "SCIC 그룹탐방 10/12",
 "colors": {"dark": "#5A3A27", "tint": "#F3E8DD", "ink": "#3B2416", "point": "#D4A24C"},
 "bgm": "음악.mp3", "footer": "* SaGA 일터선교아카데미 × SCIC 커피선교그룹",
 "cover": {"emoji": "☕", "lines": ["커피 취미로", "사람 모으기"]},
 "scenes": [ {"ch": 0, "l1": "커피, 잘 몰라도", "l2": "괜찮아요", "sub": "…", "icon": "cup", "key": "커피"},
             {"ch": 1, "l1": "…", "l2": "…", "sub": "…", "photo": "serve.jpg", "tag": "커피선교그룹", "focus": [0.5, 0.4]} ],
 "motto": {"label": "커피선교그룹의 모토", "l1": "…", "l2": "…", "sub": "…\n…"},
 "chapters": 4
}
아이콘: cup · heart · rings · glow · stairs · path · orbit · dots · chip"""
from __future__ import annotations

import json
import math
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 1920, 1080, 30
FONTS = Path(__file__).resolve().parent.parent / "assets" / "fonts"
F = lambda k, s: ImageFont.truetype(str(FONTS / f"Pretendard-{k}.otf"), s)  # noqa: E731
EMOJI = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"
SCENE, COVER, MOTTO, CLOSE, XF = 4.0, 4.5, 6.0, 6.0, 0.45


def rgb(h):
    h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def clamp(v, a=0.0, b=1.0):
    return max(a, min(b, v))


def ease(t):
    t = clamp(t); return 1 - (1 - t) ** 3


def mix(a, b, k):
    return tuple(int(a[i] + (b[i] - a[i]) * k) for i in range(3))


def emoji(ch, size):
    f = ImageFont.truetype(EMOJI, 109)
    lay = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    ImageDraw.Draw(lay).text((8, 8), ch, font=f, embedded_color=True)
    lay = lay.crop(lay.getbbox() or (0, 0, 160, 160)); r = size / max(lay.size)
    return lay.resize((int(lay.width * r), int(lay.height * r)), Image.LANCZOS)


class Promo:
    def __init__(self, sp, root):
        self.sp, self.root = sp, root
        c = sp["colors"]
        self.dark, self.tint, self.ink, self.point = rgb(c["dark"]), rgb(c["tint"]), rgb(c["ink"]), rgb(c.get("point", c["dark"]))
        lum = (0.299 * self.dark[0] + 0.587 * self.dark[1] + 0.114 * self.dark[2]) / 255
        self.on_dark = self.ink if lum > 0.6 else (255, 255, 255)        # 진한 바탕 위 글자색
        self.sub = mix(self.ink, self.tint, 0.35)
        self.card_col = rgb(c.get("card", c["dark"]))          # 오른쪽 카드 색(밝은 그룹은 글자색으로)
        self.card = self._card_bg()
        self.photos = {}

    # ── 오른쪽 카드 바탕: 그룹색 원형 그라데이션 ──
    def _card_bg(self):
        w, h = 968, 760
        g = Image.new("RGB", (w, h)); px = g.load()
        c0 = mix(self.card_col, (255, 255, 255), 0.10); c1 = mix(self.card_col, (0, 0, 0), 0.35)
        for y in range(0, h, 4):
            for x in range(0, w, 4):
                k = clamp(math.hypot((x - w * 0.42) / w, (y - h * 0.38) / h) * 1.6)
                col = mix(c0, c1, k)
                for dy in range(4):
                    for dx in range(4):
                        if x + dx < w and y + dy < h:
                            px[x + dx, y + dy] = col
        g = g.filter(ImageFilter.GaussianBlur(6)).convert("RGBA")
        m = Image.new("L", (w, h), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, w, h), 44, fill=255)
        g.putalpha(m)
        return g

    def head(self, d, on_dark, a=255):
        col = self.on_dark if on_dark else self.ink
        d.text((96, 70), self.sp["series"], font=F("SemiBold", 34), fill=col + (a,))
        f = F("Bold", 38); tw = f.getlength(self.sp["group"])
        bg, fg = (self.on_dark, self.dark) if on_dark else (self.ink, (255, 255, 255))
        d.rounded_rectangle((96, 122, 96 + tw + 56, 194), 36, fill=bg + (a,))
        d.text((124, 132), self.sp["group"], font=f, fill=fg + (a,))

    # ── 표지 ──
    def cover(self, t):
        im = Image.new("RGBA", (W, H), self.dark + (255,)); d = ImageDraw.Draw(im)
        self.head(d, True)
        cv = self.sp["cover"]; k = ease(t / 0.7)
        if cv.get("emoji"):
            em = emoji(cv["emoji"], 300); em.putalpha(em.getchannel("A").point(lambda v: int(v * k)))
            im.alpha_composite(em, (250, 380 + int((1 - k) * 40)))
        else:                                                      # 선 하트(SNS 시안)
            cx, cy, s_ = 400, 540 + int((1 - k) * 40), 9.5
            pts = [(cx + s_ * 16 * math.sin(u) ** 3, cy - s_ * (13 * math.cos(u) - 5 * math.cos(2 * u) - 2 * math.cos(3 * u) - math.cos(4 * u)))
                   for u in [i / 120 * 2 * math.pi for i in range(121)]]
            d.line(pts, fill=self.on_dark + (int(255 * k),), width=16, joint="curve")
        f = F("Black", 150)
        for i, ln in enumerate(cv["lines"]):
            ki = ease((t - 0.25 - i * 0.25) / 0.6)
            d.text((760 + int((1 - ki) * 40), 390 + i * 180), ln, font=f, fill=self.on_dark + (int(255 * ki),))
        return im

    # ── 아이콘 애니메이션 (카드 안, 포인트색 선) ──
    def icon(self, d, kind, t, cx, cy):
        P = self.point; L = (255, 255, 255)
        a = lambda v: int(255 * clamp(v))  # noqa: E731
        k = ease(t / 0.8)
        if kind == "cup":
            d.rounded_rectangle((cx - 110, cy - 40, cx + 90, cy + 140), 40, outline=L + (a(k),), width=10)
            d.arc((cx + 50, cy - 10, cx + 150, cy + 90), -90, 90, fill=L + (a(k),), width=10)
            for i in range(3):                                   # 김이 모락모락
                x = cx - 60 + i * 60; ph = t * 3 + i
                pts = [(x + 14 * math.sin(ph + j * 0.6), cy - 70 - j * 18) for j in range(7)]
                d.line(pts, fill=P + (a(k * (0.6 + 0.4 * math.sin(ph))),), width=8, joint="curve")
        elif kind == "heart":
            s = 8.5 * (1 + 0.06 * math.sin(t * 5))                # 하트 곡선(두근두근)
            pts = [(cx + s * 16 * math.sin(u) ** 3, cy - 10 - s * (13 * math.cos(u) - 5 * math.cos(2 * u) - 2 * math.cos(3 * u) - math.cos(4 * u)))
                   for u in [i / 120 * 2 * math.pi for i in range(121)]]
            d.line(pts, fill=L + (a(k),), width=10, joint="curve")
            d.ellipse((cx - 170, cy - 170, cx + 170, cy + 170), outline=P + (a(k * 0.5),), width=4)
        elif kind == "rings":
            off = 70 * ease(t / 1.4)
            for sx in (-1, 1):
                x = cx + sx * (150 - off)
                d.ellipse((x - 120, cy - 120, x + 120, cy + 120), outline=(P if sx < 0 else L) + (a(k),), width=10)
        elif kind == "glow":
            r = 60 + 10 * math.sin(t * 3)
            for i in range(6, 0, -1):
                d.ellipse((cx - r * i * 0.5, cy - r * i * 0.5, cx + r * i * 0.5, cy + r * i * 0.5), fill=P + (int(30 * k),))
            d.ellipse((cx - r * 0.6, cy - r * 0.6, cx + r * 0.6, cy + r * 0.6), fill=(255, 255, 255, a(k)))
            for i in range(12):
                ang = i / 12 * 2 * math.pi + t * 0.3
                d.line((cx + 110 * math.cos(ang), cy + 110 * math.sin(ang), cx + 150 * math.cos(ang), cy + 150 * math.sin(ang)),
                       fill=L + (a(k * 0.6),), width=4)
        elif kind == "stairs":
            for i in range(5):
                x0 = cx - 260 + i * 110; y0 = cy + 120 - i * 60
                d.line((x0, y0, x0 + 90, y0), fill=L + (a(k * 0.7),), width=8)
            st = ease(t / 3.2) * 4
            i = int(st); fr = st - i
            bx = cx - 215 + (i + fr) * 110; by = cy + 90 - (i + min(1, fr * 1.6)) * 60 + 30 * math.sin(fr * math.pi) * -1
            d.ellipse((bx - 22, by - 22, bx + 22, by + 22), fill=P + (255,))
        elif kind == "path":
            pts = [(cx - 300 + i * 30, cy + 80 * math.sin(i * 0.45)) for i in range(21)]
            n = int(len(pts) * ease(t / 2.5))
            for i in range(0, max(0, n - 1), 2):
                d.line((pts[i], pts[i + 1]), fill=L + (220,), width=8)
            if n:
                x, y = pts[n - 1]
                d.ellipse((x - 26, y - 70, x + 26, y - 18), fill=P + (255,))
                d.polygon([(x - 20, y - 36), (x + 20, y - 36), (x, y)], fill=P + (255,))
        elif kind == "orbit":
            d.ellipse((cx - 170, cy - 170, cx + 170, cy + 170), outline=L + (a(k * 0.4),), width=3)
            d.ellipse((cx - 30, cy - 30, cx + 30, cy + 30), fill=(255, 255, 255, a(k)))
            ang = t * 1.6
            d.ellipse((cx + 170 * math.cos(ang) - 16, cy + 170 * math.sin(ang) - 16, cx + 170 * math.cos(ang) + 16,
                       cy + 170 * math.sin(ang) + 16), fill=P + (a(k),))
        elif kind == "dots":
            n = 12
            for i in range(n):
                ang = i / n * 2 * math.pi
                ki = ease((t - 0.2 - i * 0.12) / 0.3)
                d.ellipse((cx + 180 * math.cos(ang) - 12, cy + 180 * math.sin(ang) - 12, cx + 180 * math.cos(ang) + 12,
                           cy + 180 * math.sin(ang) + 12), fill=(P if i % 3 == 0 else L) + (a(ki),))
            d.ellipse((cx - 110, cy - 110, cx + 110, cy + 110), outline=L + (a(k * 0.5),), width=4)
        elif kind == "clock":                                      # 알람시계: 바늘이 06:30 으로 돌아가고 흔들린다
            sh = int(8 * math.sin(t * 40)) if 1.4 < t < 2.0 else 0
            x = cx + sh
            d.ellipse((x - 150, cy - 150, x + 150, cy + 150), outline=L + (a(k),), width=10)
            for sx in (-1, 1):
                d.pieslice((x + sx * 120 - 50, cy - 200, x + sx * 120 + 50, cy - 100), 180, 360, fill=P + (a(k),))
            for i in range(12):
                ang = i / 12 * 2 * math.pi
                d.line((x + 120 * math.cos(ang), cy + 120 * math.sin(ang), x + 135 * math.cos(ang), cy + 135 * math.sin(ang)), fill=L + (a(k * 0.7),), width=5)
            kk = ease(t / 1.4)
            mins = 330 * kk                                          # 0:00 → 6:30 (분)
            am = math.radians(mins % 60 * 6 - 90); ah = math.radians(mins / 60 * 30 - 90)
            d.line((x, cy, x + 75 * math.cos(ah), cy + 75 * math.sin(ah)), fill=L + (a(k),), width=12)
            d.line((x, cy, x + 115 * math.cos(am), cy + 115 * math.sin(am)), fill=P + (a(k),), width=8)
            d.ellipse((x - 14, cy - 14, x + 14, cy + 14), fill=(255, 255, 255, a(k)))
        elif kind == "phone":                                      # 휴대폰 + 올라가는 피드
            d.rounded_rectangle((cx - 110, cy - 190, cx + 110, cy + 190), 30, outline=L + (a(k),), width=9)
            off = (t * 60) % 90
            for i in range(5):
                y = cy - 150 + i * 90 - off
                if cy - 160 < y < cy + 130:
                    d.rounded_rectangle((cx - 80, y, cx + 80, y + 60), 10, fill=(P if i % 2 else L) + (a(k * 0.75),))
        elif kind == "bubble":                                     # 말풍선이 차례로
            for i, (x, y, w_) in enumerate(((cx - 230, cy - 150, 300), (cx - 40, cy - 30, 270), (cx - 230, cy + 90, 220))):
                ki = ease((t - 0.2 - i * 0.5) / 0.4)
                if ki > 0:
                    col = (P if i == 1 else L)
                    d.rounded_rectangle((x, y + (1 - ki) * 20, x + w_, y + 80 + (1 - ki) * 20), 36, outline=col + (a(ki),), width=7)
                    for j in range(3):
                        d.ellipse((x + 40 + j * 40, y + 32, x + 56 + j * 40, y + 48), fill=col + (a(ki),))
        elif kind == "chip":
            d.rounded_rectangle((cx - 90, cy - 90, cx + 90, cy + 90), 24, outline=L + (a(k),), width=8)
            d.rounded_rectangle((cx - 40, cy - 40, cx + 40, cy + 40), 10, fill=(255, 255, 255, a(k)))
            for i in range(5):
                o = -60 + i * 30
                for (x0, y0, x1, y1) in ((cx + o, cy - 90, cx + o, cy - 120), (cx + o, cy + 90, cx + o, cy + 120),
                                         (cx - 90, cy + o, cx - 120, cy + o), (cx + 90, cy + o, cx + 120, cy + o)):
                    d.line((x0, y0, x1, y1), fill=P + (a(k),), width=5)

    # ── 본문 장면 ──
    def scene(self, sc, t, idx_in_ch, n_in_ch):
        im = Image.new("RGBA", (W, H), self.tint + (255,)); d = ImageDraw.Draw(im)
        self.head(d, False)
        # 진행 막대: 장(chapter)마다 한 칸, 지금 장은 장면 수만큼 차오른다
        nch = self.sp.get("chapters", 4); seg = (700 - 96 - (nch - 1) * 14) / nch
        for c in range(nch):
            x0 = 96 + c * (seg + 14)
            d.rounded_rectangle((x0, 240, x0 + seg, 246), 3, fill=mix(self.ink, self.tint, 0.75))
            if c < sc["ch"]:
                fillw = seg
            elif c == sc["ch"]:
                fillw = seg * (idx_in_ch + ease(t / SCENE)) / n_in_ch
            else:
                fillw = 0
            if fillw > 0:
                d.rounded_rectangle((x0, 240, x0 + fillw, 246), 3, fill=self.ink)
        k1 = ease((t - 0.15) / 0.5); k2 = ease((t - 0.4) / 0.5); k3 = ease((t - 0.7) / 0.5)
        f1 = F("Black", 92)
        d.text((96, 380 + int((1 - k1) * 30)), sc["l1"], font=f1, fill=self.ink + (int(255 * k1),))
        tw = f1.getlength(sc["l2"])
        y2 = 500 + int((1 - k2) * 30)
        d.rounded_rectangle((90, y2 + 6, 90 + tw + 40, y2 + 124), 14, fill=self.ink + (int(255 * k2),))
        d.text((110, y2), sc["l2"], font=f1, fill=(255, 255, 255, int(255 * k2)))
        d.text((100, 680), sc.get("sub", ""), font=F("SemiBold", 38), fill=self.sub + (int(255 * k3),))
        d.text((96, 1028), self.sp.get("footer", ""), font=F("SemiBold", 28), fill=self.sub + (255,))
        # 오른쪽 카드
        kc = ease(t / 0.5)
        cx0, cy0 = 880, 150 + int((1 - kc) * 30)
        if sc.get("photo"):
            if sc["photo"] not in self.photos:
                self.photos[sc["photo"]] = Image.open(self.root / sc["photo"]).convert("RGB")
            ph = self.photos[sc["photo"]]
            z = 1.0 + 0.06 * t / SCENE
            w, h = 968, 760; fx, fy = sc.get("focus", [0.5, 0.5])
            r = max(w / ph.width, h / ph.height) * z
            big = ph.resize((int(ph.width * r) + 1, int(ph.height * r) + 1), Image.LANCZOS)
            x = int(clamp(fx * big.width - w / 2, 0, big.width - w)); y = int(clamp(fy * big.height - h / 2, 0, big.height - h))
            card = big.crop((x, y, x + w, y + h)).convert("RGBA")
            cd = ImageDraw.Draw(card)
            for (ax, ay, sx, sy) in ((30, 30, 1, 1), (w - 30, 30, -1, 1), (30, h - 30, 1, -1), (w - 30, h - 30, -1, -1)):
                cd.line((ax, ay, ax + 46 * sx, ay), fill=(255, 255, 255, 235), width=5)
                cd.line((ax, ay, ax, ay + 46 * sy), fill=(255, 255, 255, 235), width=5)
            if int(t * 2) % 2 == 0:
                cd.ellipse((52, 50, 70, 68), fill=(235, 50, 50, 255))
            cd.text((80, 44), "REC", font=F("Bold", 26), fill=(255, 255, 255, 240))
            if sc.get("tag"):
                ft = F("Bold", 32); tw2 = ft.getlength(sc["tag"])
                cd.rounded_rectangle((40, h - 96, 40 + tw2 + 44, h - 40), 28, fill=(255, 255, 255, 240))
                cd.text((62, h - 90), sc["tag"], font=ft, fill=self.ink + (255,))
            m = Image.new("L", (w, h), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, w, h), 44, fill=255)
            card.putalpha(m.point(lambda v: int(v * kc)))
        else:
            card = self.card.copy(); cd = ImageDraw.Draw(card)
            self.icon(cd, sc.get("icon", "glow"), t, 484, 290)
            fk = F("Black", 150); tw3 = fk.getlength(sc.get("key", ""))
            kk = ease((t - 0.5) / 0.5)
            cd.text(((968 - tw3) / 2, 520 + int((1 - kk) * 30)), sc.get("key", ""), font=fk, fill=(255, 255, 255, int(255 * kk)))
            if kc < 1:
                card.putalpha(card.getchannel("A").point(lambda v: int(v * kc)))
        im.alpha_composite(card, (cx0, cy0))
        return im

    # ── 모토 ──
    def motto(self, t):
        im = Image.new("RGBA", (W, H), self.tint + (255,)); d = ImageDraw.Draw(im)
        self.head(d, False)
        mo = self.sp["motto"]
        fl = F("Bold", 34); lw = fl.getlength(mo["label"])
        d.rounded_rectangle(((W - lw) / 2 - 28, 300, (W + lw) / 2 + 28, 360), 30, fill=self.ink)
        d.text(((W - lw) / 2, 308), mo["label"], font=fl, fill=(255, 255, 255))
        f = F("Black", 130)
        k1 = ease((t - 0.3) / 0.6); k2 = ease((t - 0.9) / 0.6); k3 = ease((t - 1.6) / 0.6)
        w1 = f.getlength(mo["l1"])
        d.text(((W - w1) / 2, 400 + int((1 - k1) * 30)), mo["l1"], font=f, fill=self.ink + (int(255 * k1),))
        w2 = f.getlength(mo["l2"]); y2 = 570 + int((1 - k2) * 30)
        d.rounded_rectangle(((W - w2) / 2 - 26, y2 + 10, (W + w2) / 2 + 26, y2 + 166), 18, fill=self.ink + (int(255 * k2),))
        d.text(((W - w2) / 2, y2), mo["l2"], font=f, fill=(255, 255, 255, int(255 * k2)))
        fs = F("SemiBold", 36)
        for i, ln in enumerate(mo.get("sub", "").split("\n")):
            ws = fs.getlength(ln)
            d.text(((W - ws) / 2, 790 + i * 52), ln, font=fs, fill=self.sub + (int(255 * k3),))
        d.text((96, 1028), self.sp.get("footer", ""), font=F("SemiBold", 28), fill=self.sub + (255,))
        return im

    # ── 마무리 ──
    def close(self, t):
        im = Image.new("RGBA", (W, H), self.dark + (255,)); d = ImageDraw.Draw(im)
        for i in range(3):                                         # 퍼지는 고리
            r = 420 + ((t * 90 + i * 140) % 420)
            al = int(38 * clamp(1 - (r - 420) / 420))
            d.ellipse((W / 2 - r, 530 - r, W / 2 + r, 530 + r), outline=(255, 255, 255, al), width=2)
        C = self.on_dark
        def ctext(s, y, f, col, k):
            w = f.getlength(s); d.text(((W - w) / 2, y + int((1 - k) * 24)), s, font=f, fill=col + (int(255 * k),))
        ctext("SCIC", 300, F("Bold", 40), C, ease((t - 0.1) / 0.5))
        ctext(self.sp["group"], 360, F("Black", 120), C, ease((t - 0.3) / 0.6))
        kl = ease((t - 0.8) / 0.5); lw = 560 * kl
        d.line((W / 2 - lw / 2, 520, W / 2 + lw / 2, 520), fill=C + (160,), width=3)
        ctext("SaGA", 560, F("Bold", 40), C, ease((t - 1.0) / 0.5))
        k = ease((t - 1.3) / 0.6); f = F("Black", 96); w = f.getlength("일터아카데미")
        bg, fg = ((255, 255, 255), self.dark) if C == (255, 255, 255) else (self.ink, self.dark)
        d.rounded_rectangle(((W - w) / 2 - 26, 626 + int((1 - k) * 24), (W + w) / 2 + 26, 760 + int((1 - k) * 24)), 16, fill=bg + (int(255 * k),))
        d.text(((W - w) / 2, 622 + int((1 - k) * 24)), "일터아카데미", font=f, fill=fg + (int(255 * k),))
        return im


def main(path):
    sp = json.load(open(path, encoding="utf-8")); root = Path(path).resolve().parent
    pr = Promo(sp, root)
    parts = [("cover", COVER, None)]
    chs = {}
    for sc in sp["scenes"]:
        chs.setdefault(sc["ch"], []).append(sc)
    for sc in sp["scenes"]:
        lst = chs[sc["ch"]]
        parts.append(("scene", SCENE, (sc, lst.index(sc), len(lst))))
    parts += [("motto", MOTTO, None), ("close", CLOSE, None)]
    total = sum(p[1] for p in parts)

    def render(kind, t, arg):
        if kind == "cover":
            return pr.cover(t)
        if kind == "scene":
            return pr.scene(arg[0], t, arg[1], arg[2])
        return getattr(pr, kind)(t)

    out = root / sp["out"]; silent = out.with_name(out.stem + "_무음.mp4")
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                            "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", str(silent)], stdin=subprocess.PIPE)
    prev_last = None
    for pi, (kind, dur, arg) in enumerate(parts):
        n = int(dur * FPS)
        for fi in range(n):
            t = fi / FPS
            fr = render(kind, t, arg).convert("RGB")
            if prev_last is not None and t < XF:
                fr = Image.blend(prev_last, fr, ease(t / XF))
            if pi == len(parts) - 1 and t > dur - 0.6:
                fr = Image.blend(fr, Image.new("RGB", (W, H), pr.dark), (t - (dur - 0.6)) / 0.6 * 0.6)
            enc.stdin.write(fr.tobytes())
            if pi == 0 and fi == int(1.6 * FPS):
                fr.save(out.with_name(out.stem + "_표지.jpg"), quality=92)
        prev_last = render(kind, dur - 1 / FPS, arg).convert("RGB")
    enc.stdin.close(); enc.wait()
    if sp.get("bgm"):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(silent), "-ss", str(sp.get("bgm_start", 0)), "-i", str(root / sp["bgm"]),
                        "-filter_complex", f"[1:a]atrim=0:{total},volume={sp.get('bgm_volume', 0.8)},afade=t=in:d=0.5,"
                        f"afade=t=out:st={total - 2.5}:d=2.5[a]", "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac",
                        "-b:a", "192k", "-t", f"{total:.2f}", str(out)], check=True)
        silent.unlink()
    else:
        silent.rename(out)
    print("DONE", out, round(total, 1))


if __name__ == "__main__":
    main(sys.argv[1])
