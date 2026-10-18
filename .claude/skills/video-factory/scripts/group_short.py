"""그룹 홍보 쇼츠(9:16) — «내 고민 → 진짜 장면 → 숫자 → 한 마디 → 한 번 와 보기» 틀.
사용: python group_short.py spec.json
spec.json:
{
 "out": "AI미션그룹_쇼츠.mp4",
 "group": "AI미션그룹", "series": "SCIC 그룹탐방 01/12", "accent": "#3B82F6",
 "bgm": "음악.mp3", "bgm_volume": 0.5,                      // 선택
 "scenes": [
  {"type": "hook",  "dur": 3.2, "lines": ["AI 공부,", "혼자 하다", "[사흘 만에] 포기했죠?"]},
  {"type": "photo", "dur": 5, "src": "강의장.jpg", "lines": ["그런데 이 사람들은", "배운 걸 [남에게] 가르쳐요"], "focus": [0.5, 0.5]},
  {"type": "stats", "dur": 6, "title": "2025 ~ 2026.8", "items": [["34", "회 강의"], ["1,380", "명"]]},
  {"type": "motto", "dur": 4.5, "lines": ["배워서 [남 주자]"], "sub": "가르치는 순간, 내 실력이 됩니다"},
  {"type": "cta",   "dur": 6, "lines": ["한 번 와 보세요"], "note": "다음 강의 일정 · 신청 링크"}
 ]
}
[ ] 안은 그룹색 상자. 사진은 흐린 같은 사진 위에 둥근 카드로 얹는다(작은 사진도 깨져 보이지 않게).
화면 아래 22% 와 오른쪽 끝은 쇼츠 버튼 자리라 글자를 두지 않는다."""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from common import F, FPS, NAVY, WHITE, fit_cover, load, navy_bg

W, H = 1080, 1920
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
            d.rounded_rectangle((cx, 8, cx + w + pad * 2, lh - 4), 16, fill=acc + (255,))
            d.text((cx + pad, 6), p, font=font, fill=NAVY)
            cx += w + pad * 2 + 6
        else:
            d.text((cx + 3, 11), p, font=font, fill=(0, 0, 0, 150))
            d.text((cx, 6), p, font=font, fill=WHITE)
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


def top_bar(img, sp, acc, alpha=1.0):
    d = ImageDraw.Draw(img)
    a = int(255 * alpha)
    d.text((X0, 150), sp["series"], font=F("semi", 34), fill=(205, 212, 228, a))
    f = F("bold", 40); tw = f.getlength(sp["group"])
    d.rounded_rectangle((X0, 205, X0 + tw + 48, 273), 34, fill=acc + (a,))
    d.text((X0 + 24, 214), sp["group"], font=f, fill=NAVY + (a,))


class Scene:
    def __init__(self, sc, sp, root):
        self.sc, self.sp, self.root = sc, sp, root
        self.acc = rgb(sc.get("accent", sp["accent"]))
        self.dur = float(sc["dur"])
        self.bg = navy_bg((W, H), grid=60)
        if sc["type"] == "photo":
            im = Image.open(root / sc["src"]).convert("RGB")
            blur = fit_cover(im, (W // 4, H // 4)).filter(ImageFilter.GaussianBlur(6)).resize((W, H), Image.LANCZOS)
            dark = Image.new("RGB", (W, H), NAVY)
            self.bg = Image.blend(blur, dark, 0.55).convert("RGBA")
            cw = W - 2 * 60; ch = int(cw * min(1.0, im.height / im.width) * 1.0)
            ch = max(560, min(ch, 820))
            fx, fy = sc.get("focus", [0.5, 0.5])
            big = fit_cover(im, (int(cw * 1.08), int(ch * 1.08)))
            self.card, self.cw, self.ch, self.focus = big, cw, ch, (fx, fy)
            m = Image.new("L", (cw, ch), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, cw, ch), 34, fill=255)
            self.mask = m

    def frame(self, t: float) -> Image.Image:
        sc, acc = self.sc, self.acc
        img = self.bg.copy()
        typ = sc["type"]
        if typ != "hook":
            top_bar(img, self.sp, acc)
        if typ == "hook":
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
                ImageDraw.Draw(img).text((X0, y + 10), sc["caption"], font=F("semi", 44), fill=(225, 230, 240, int(255 * kk)))
        elif typ == "stats":
            d = ImageDraw.Draw(img)
            d.text((X0, 360), sc.get("title", ""), font=F("semi", 44), fill=(200, 208, 226))
            y = 470
            for i, (num, lab) in enumerate(sc["items"]):
                k = clamp((t - 0.2 - i * 0.7) / 0.9)
                target = int(re.sub(r"\D", "", num) or 0)
                cur = int(round(target * ease_out(k)))
                s = f"{cur:,}" if "," in num else str(cur)
                if k <= 0:
                    y += 330; continue
                fn = F("black", 210)
                d.text((X0, y), s, font=fn, fill=acc)
                lx = X0 + fn.getlength(f"{target:,}" if "," in num else str(target)) + 24
                d.text((lx, y + 120), lab, font=F("bold", 62), fill=(255, 255, 255, int(255 * clamp(k * 2))))
                y += 330
            if sc.get("note"):
                d.text((X0, y + 10), sc["note"], font=F("reg", 36), fill=(170, 180, 200))
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
                ImageDraw.Draw(img).text(((W - tw) / 2, 1000 + 180 * (len(sc["lines"]) - 1)), sc["sub"], font=fs,
                                         fill=(230, 235, 245, int(255 * kk)))
        elif typ == "cta":
            f = F("black", 112)
            y = 470
            for i, s in enumerate(sc["lines"]):
                k = (t - 0.2 - i * 0.45) / 0.35
                draw_line(img, s, f, X0, y, acc, alpha=clamp(k * 1.5), scale=0.75 + 0.25 * back(k))
                y += 160
            k = clamp((t - 0.9) / 0.5)
            d = ImageDraw.Draw(img)
            bx, by, bs = X0, y + 50, 330                        # QR 자리
            d.rounded_rectangle((bx, by, bx + bs, by + bs), 28, outline=acc + (int(255 * k),), width=6)
            d.text((bx + 104, by + 130), "QR", font=F("black", 72), fill=acc + (int(255 * k),))
            d.multiline_text((bx + bs + 40, by + 40), sc.get("note", ""), font=F("bold", 46), spacing=18,
                             fill=(235, 238, 245, int(255 * k)))
        return img.convert("RGB")


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
        if i > 0 and lt < XF:                            # 앞 장면과 짧게 겹치기
            prev = scenes[i - 1].frame(scenes[i - 1].dur - 1e-3)
            fr = Image.blend(prev, fr, lt / XF)
        if t > total - 0.5:                              # 끝 0.5초 어둡게
            fr = Image.blend(fr, Image.new("RGB", (W, H), NAVY), (t - (total - 0.5)) / 0.5 * 0.85)
        pr.stdin.write(fr.tobytes())
    pr.stdin.close(); pr.wait()
    if sp.get("bgm"):
        vol = sp.get("bgm_volume", 0.5)
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(silent), "-i", P(sp["bgm"]),
                        "-filter_complex", f"[1:a]volume={vol},afade=t=in:d=0.6,afade=t=out:st={total - 1.6:.2f}:d=1.6,atrim=0:{total:.2f}[a]",
                        "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
                        "-movflags", "+faststart", str(out)], check=True)
        silent.unlink()
    else:
        silent.rename(out)
    print("DONE", out, f"{total:.1f}s", flush=True)
    return out


if __name__ == "__main__":
    main(sys.argv[1])
