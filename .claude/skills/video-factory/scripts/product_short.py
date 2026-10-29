"""제품 소개 쇼츠(9:16) — 검정 바탕 · 금색 포인트의 «카탈로그 넘기기» 틀 (2026-10-29, 아큐페이즈 E-5000 편).
사용: python product_short.py spec.json
spec.json:
{
 "out": "E-5000_쇼츠.mp4",
 "brand": "Accuphase", "model": "E-5000",            // 화면 맨 위 머리줄
 "accent": "#D4B26A",                                  // 포인트 색(금색)
 "bgm": "음악.mp3", "bgm_volume": 0.35, "bgm_start": 0,
 "voice_lead": 0.35, "voice_tail": 0.55,               // 목소리 앞 · 뒤 여유(초)
 "credit": "사진 · 자료: Accuphase 공식 홈페이지 · 카탈로그",
 "scenes": [
  {"type": "cover", "dur": 0.6, "src": "열린_사선.jpg", "lines": ["33.8kg 앰프,", "[열어 보면] 압니다"], "proof": "Accuphase E-5000"},
  {"type": "card", "src": "내부_위.png", "eyebrow": "INSIDE", "lines": ["무게 [33.8kg]"], "caption": "…", "voice": "voice/N00.wav"},
  {"type": "card", "photos": [{"src": "트랜스.jpg"}, {"src": "콘덴서.jpg"}], ...},       // 여러 장이면 장면 안에서 번갈아
  {"type": "card", "src": "앞면.png", "crop": [0.4, 0.33, 0.76, 0.57], ...},              // crop = 사진 안 비율 영역
  {"type": "stat", "src": "파워모듈.jpg", "eyebrow": "OUTPUT", "items": [["240", "W", "8Ω"], ["320", "W", "4Ω"]], ...},
  {"type": "full", "src": "표지_세로.jpg", "lines": [...], "end": true}                   // 화면 꽉 찬 사진(마무리)
 ]
}
[ ] 안 글자는 금색. 사진 바탕이 흰색(제품 누끼컷)이면 흰 카드에 통째로(잘림 없이) 얹고, 아니면 카드를 꽉 채운다.
장면 길이 = max(dur, 앞 여유 + 목소리 + 뒤 여유). 화면 아래 22% 는 쇼츠 버튼 자리라 글자를 두지 않는다."""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageStat

from common import F, FPS, load, probe

W, H = 1080, 1920
X0 = 84
SAFE_B = int(H * 0.78)          # 글자는 이 선 위로
XF = 0.3                        # 장면 사이 겹침(초)
BLACK = (8, 8, 9)
INK = (244, 240, 232)
SUB = (168, 162, 152)


def rgb(h):
    h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def clamp(v, a=0.0, b=1.0):
    return max(a, min(b, v))


def ease(t):
    return 1 - (1 - clamp(t)) ** 3


def parts(s):
    return [(p, i % 2 == 1) for i, p in enumerate(re.split(r"\[|\]", s)) if p]


def text_w(s, f):
    return sum(f.getlength(p) for p, _ in parts(s))


def draw_text(ov, s, f, x, y, acc, alpha=1.0, center=False):
    d = ImageDraw.Draw(ov)
    if center:
        x = (W - text_w(s, f)) / 2
    for p, hl in parts(s):
        d.text((x, y), p, font=f, fill=(acc if hl else INK) + (int(255 * alpha),))
        x += f.getlength(p)


def fit_font(lines, kind, size, maxw, low=44):
    while size > low and max(text_w(s, F(kind, size)) for s in lines) > maxw:
        size -= 2
    return F(kind, size)


def backdrop():
    """검정 바탕 + 가운데 위쪽이 아주 살짝 밝은 따뜻한 빛"""
    g = Image.new("L", (W // 8, H // 8))
    px = g.load()
    for y in range(g.height):
        for x in range(g.width):
            dx, dy = (x - g.width / 2) / g.width, (y - g.height * 0.36) / g.height
            px[x, y] = int(clamp(1 - (dx * dx * 2.2 + dy * dy * 1.6) ** 0.5 * 1.5) * 255)
    g = g.resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(30))
    return Image.composite(Image.new("RGB", (W, H), (34, 30, 26)), Image.new("RGB", (W, H), BLACK), g).convert("RGBA")


BACK = None


def is_white_bg(im):
    e = [im.getpixel((x, y)) for x, y in ((2, 2), (im.width - 3, 2), (2, im.height - 3), (im.width - 3, im.height - 3))]
    return all(min(p[:3]) > 235 for p in e)


class Photo:
    """카드 한 장 분량의 사진 — crop · 흰 바탕 여부 · 느린 줌"""
    def __init__(self, root, ph, cw, ch=None):
        im = Image.open(root / ph["src"]).convert("RGB")
        if ph.get("crop"):
            a, b, c, d = ph["crop"]
            im = im.crop((int(a * im.width), int(b * im.height), int(c * im.width), int(d * im.height)))
        self.white = ph.get("white", is_white_bg(im))
        if self.white:                       # 흰 여백 잘라 제품만
            b = im.convert("L").point(lambda v: 255 if v < 236 else 0).getbbox()
            if b:
                im = im.crop((max(0, b[0] - 8), max(0, b[1] - 8), min(im.width, b[2] + 8), min(im.height, b[3] + 8)))
        self.zoom = ph.get("zoom", 0.06)
        self.focus = ph.get("focus", [0.5, 0.5])
        if ch is None:
            ch = int(cw * im.height / im.width)
            ch = max(ph.get("min_h", 560), min(ch, ph.get("max_h", 900)))
        self.cw, self.ch = cw, ch
        if self.white:                       # 흰 바탕 제품컷: 잘리지 않게 여백 두고 통째로
            r = min((cw - 60) / im.width, (ch - 60) / im.height)
            big = im.resize((int(im.width * r * 1.1), int(im.height * r * 1.1)), Image.LANCZOS)
            canvas = Image.new("RGB", (int(cw * 1.1), int(ch * 1.1)), (255, 255, 255))
            canvas.paste(big, ((canvas.width - big.width) // 2, (canvas.height - big.height) // 2))
            self.big = canvas
        else:
            r = max(cw * 1.1 / im.width, ch * 1.1 / im.height)
            self.big = im.resize((int(im.width * r + 1), int(im.height * r + 1)), Image.LANCZOS)
        self.edge = (255, 255, 255) if self.white else tuple(int(v) for v in ImageStat.Stat(im).mean)

    def view(self, k):
        z = 1.0 + self.zoom * k
        bw, bh = self.big.size
        vw = min(bw, int(self.cw * 1.1 / z)); vh = min(bh, int(self.ch * 1.1 / z))
        fx, fy = self.focus
        x = int(clamp(fx * bw - vw / 2, 0, bw - vw)); y = int(clamp(fy * bh - vh / 2, 0, bh - vh))
        return self.big.crop((x, y, x + vw, y + vh)).resize((self.cw, self.ch), Image.LANCZOS)


def rounded(im, r=28, alpha=1.0):
    m = Image.new("L", im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height - 1), r, fill=int(255 * alpha))
    o = im.convert("RGBA"); o.putalpha(m); return o


class Scene:
    def __init__(self, sc, sp, root):
        self.sc, self.sp, self.root = sc, sp, root
        self.acc = rgb(sc.get("accent", sp.get("accent", "#D4B26A")))
        self.dur = float(sc.get("dur", 3.0))
        self.voices = []
        lead, tail = sp.get("voice_lead", 0.35), sp.get("voice_tail", 0.55)
        if sc.get("voice"):
            v = str((root / sc["voice"]).resolve())
            self.voices.append((lead, v))
            self.dur = max(self.dur, lead + probe(v)["duration"] + tail)
        typ = sc["type"]
        self.bg = BACK.copy()
        if typ in ("card", "stat"):
            phs = sc.get("photos") or ([{k: sc[k] for k in ("src", "crop", "focus", "zoom", "white", "min_h", "max_h") if k in sc}]
                                       if sc.get("src") else [])
            cw = sc.get("card_w", W - 2 * 60)
            self.photos = [Photo(root, ph, cw) for ph in phs]
            if self.photos and len(self.photos) > 1:          # 여러 장은 같은 높이로
                ch = max(p.ch for p in self.photos)
                self.photos = [Photo(root, ph, cw, ch) for ph in phs]
        if typ == "stat" and self.photos:                       # 숫자 장면: 사진을 흐리게 깔고 숫자를 크게
            p = self.photos[0]
            from common import fit_cover
            lay = fit_cover(p.big, (W // 6, H // 6)).resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(16)).convert("RGBA")
            m = Image.new("L", (W, H), 0)                        # 가장자리 없이 부드럽게 번지도록 타원 마스크
            ImageDraw.Draw(m).ellipse((-W * 0.3, H * 0.12, W * 1.3, H * 0.78), fill=int(255 * 0.30))
            lay.putalpha(m.filter(ImageFilter.GaussianBlur(120)))
            self.bg.alpha_composite(lay)
        if typ in ("cover", "full"):
            im = Image.open(root / sc["src"]).convert("RGB")
            if sc.get("crop"):
                a, b, c, d = sc["crop"]; im = im.crop((int(a * im.width), int(b * im.height), int(c * im.width), int(d * im.height)))
            ph_h = int(H * (0.62 if typ == "cover" else 1.0))
            fx, fy = sc.get("focus", [0.5, 0.5])
            r = max(W * 1.08 / im.width, ph_h * 1.08 / im.height)
            self.big = im.resize((int(im.width * r + 1), int(im.height * r + 1)), Image.LANCZOS)
            self.ph_h, self.ffocus = ph_h, (fx, fy)
            g = Image.new("L", (1, H))
            for yy in range(H):
                top = clamp(1 - yy / 360) * 150
                if typ == "cover":
                    bot = clamp((yy - ph_h * 0.55) / (ph_h * 0.45)) * 255
                else:
                    bot = clamp((yy - H * 0.42) / (H * 0.30)) * 215
                g.putpixel((0, yy), int(max(top, bot)))
            self.shade = g.resize((W, H))

    # 머리줄: 브랜드 · 모델 + 금색 가는 선
    def header(self, ov, a=1.0):
        d = ImageDraw.Draw(ov)
        f = F("semi", 34)
        s = f"{self.sp.get('brand', '')}  ·  {self.sp.get('model', '')}"
        d.text((X0, 150), s, font=f, fill=self.acc + (int(230 * a),))
        d.line((X0, 205, X0 + 120, 205), fill=self.acc + (int(200 * a),), width=3)

    def texts(self, ov, t, y):
        sc, acc = self.sc, self.acc
        d = ImageDraw.Draw(ov)
        if sc.get("eyebrow"):
            k = clamp((t - 0.2) / 0.4)
            fe = F("bold", 36)
            x = X0
            for ch in sc["eyebrow"]:                         # 자간 넓힌 영문 머리말
                d.text((x, y + (1 - ease(k)) * 16), ch, font=fe, fill=acc + (int(255 * k),)); x += fe.getlength(ch) + 5
            y += 70
        lines = sc.get("lines", [])
        if lines:
            f = fit_font(lines, "black", sc.get("size", 80), W - X0 * 2)
            for i, s in enumerate(lines):
                k = (t - 0.35 - i * 0.3) / 0.45
                draw_text(ov, s, f, X0, y + int((1 - ease(k)) * 26), acc, alpha=clamp(k * 1.4))
                y += int(f.size * 1.3)
        if sc.get("caption"):
            k = clamp((t - 0.8) / 0.5)
            fc = F("semi", 40)
            for ln in sc["caption"].split("\n"):
                d.text((X0, y + 18), ln, font=fc, fill=SUB + (int(255 * k),)); y += 56
        return y

    def frame(self, t):
        sc, acc, typ = self.sc, self.acc, self.sc["type"]
        img = self.bg.copy()
        ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        if typ in ("cover", "full"):
            k = t / max(self.dur, 0.1)
            bw, bh = self.big.size
            z = 1.0 + 0.06 * k
            vw, vh = int(W * 1.08 / z), int(self.ph_h * 1.08 / z)
            fx, fy = self.ffocus
            x = int(clamp(fx * bw - vw / 2, 0, bw - vw)); y = int(clamp(fy * bh - vh / 2, 0, bh - vh))
            ph = self.big.crop((x, y, x + vw, y + vh)).resize((W, self.ph_h), Image.LANCZOS)
            base = Image.new("RGBA", (W, H), BLACK + (255,)); base.paste(ph, (0, 0))
            img = Image.composite(Image.new("RGBA", (W, H), BLACK + (255,)), base, self.shade)
            if typ == "cover":
                l1, l2 = sc["lines"][0], sc["lines"][1]
                draw_text(ov, l1, fit_font([l1], "bold", 80, W - 2 * X0), X0, 1090, acc)
                draw_text(ov, l2, fit_font([l2], "black", 124, W - 2 * X0), X0, 1200, acc)
                if sc.get("proof"):
                    ImageDraw.Draw(ov).text((X0, 1395), sc["proof"], font=F("semi", 44), fill=acc)
            else:
                self.header(ov)
                y = sc.get("text_y", 1060)
                self.texts(ov, t, y)
                if sc.get("end") and self.sp.get("credit"):
                    k = clamp((t - 1.2) / 0.6)
                    ImageDraw.Draw(ov).text((X0, SAFE_B - 40), self.sp["credit"], font=F("reg", 30), fill=SUB + (int(220 * k),))
        elif typ in ("card", "stat"):
            self.header(ov)
            y = 290
            if typ == "card" and self.photos:
                th_ = (70 if sc.get("eyebrow") else 0) + int(len(sc.get("lines", [])) * sc.get("size", 80) * 1.3) \
                    + (len(sc["caption"].split("\n")) * 56 + 18 if sc.get("caption") else 0)
                y = max(270, 250 + (SAFE_B - 250 - (self.photos[0].ch + 64 + th_)) // 2)
                n = len(self.photos)
                seg = self.dur / n
                i = min(n - 1, int(t / seg))
                lt = t - i * seg
                p = self.photos[i]
                k_in = ease(t / 0.5)
                cy = y + int((1 - k_in) * 50)
                sh = Image.new("RGBA", (p.cw + 80, p.ch + 80), (0, 0, 0, 0))
                ImageDraw.Draw(sh).rounded_rectangle((40, 50, p.cw + 40, p.ch + 50), 30, fill=(0, 0, 0, int(170 * k_in)))
                img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(18)), ((W - p.cw) // 2 - 40, cy - 40))
                card = p.view(lt / seg)
                if i > 0 and lt < 0.45:                       # 앞 사진에서 부드럽게
                    q = self.photos[i - 1]
                    card = Image.blend(q.view(1.0), card, lt / 0.45)
                img.alpha_composite(rounded(card, 30, k_in), ((W - p.cw) // 2, cy))
                ImageDraw.Draw(ov).rounded_rectangle(((W - p.cw) // 2, cy, (W + p.cw) // 2, cy + p.ch), 30,
                                                     outline=acc + (int(90 * k_in),), width=2)
                y = cy + p.ch + 64
                if sc.get("tag"):
                    ImageDraw.Draw(ov).text(((W + p.cw) // 2 - 24 - F("semi", 30).getlength(sc["tag"]), cy + p.ch - 52),
                                            sc["tag"], font=F("semi", 30), fill=(120, 116, 110) if p.white else (230, 226, 218))
                self.texts(ov, t, y)
            else:                                             # stat
                y = 430
                d = ImageDraw.Draw(ov)
                if sc.get("eyebrow"):
                    fe = F("bold", 38); x = X0
                    for ch in sc["eyebrow"]:
                        d.text((x, y), ch, font=fe, fill=acc + (int(255 * clamp(t / 0.4)),)); x += fe.getlength(ch) + 5
                    y += 110
                for j, it in enumerate(sc["items"]):
                    num, unit, lab = it
                    k = clamp((t - 0.3 - j * 0.9) / 1.0)
                    if k <= 0:
                        y += 330; continue
                    target = int(re.sub(r"\D", "", num) or 0)
                    cur = int(round(target * ease(k)))
                    s = f"{cur:,}" if "," in num else str(cur)
                    fn = F("black", 230)
                    d.text((X0, y), s, font=fn, fill=acc + (255,))
                    full_w = fn.getlength(num)
                    fu = F("black", 96)
                    d.text((X0 + full_w + 22, y + 108), unit, font=fu, fill=INK + (int(255 * clamp(k * 2)),))
                    if lab:
                        d.text((X0 + full_w + 30 + fu.getlength(unit) + 24, y + 150), lab, font=F("bold", 56),
                               fill=SUB + (int(255 * clamp(k * 2)),))
                    y += 320
                sc2 = dict(sc); sc2.pop("eyebrow", None)
                self.sc = sc2
                self.texts(ov, t, y + 10)
                self.sc = sc
        img.alpha_composite(ov)
        return img.convert("RGB")


def main(spec_path):
    global BACK
    sp = load(spec_path)
    root = Path(spec_path).resolve().parent
    P = lambda p: str((root / p).resolve()) if not Path(p).is_absolute() else p  # noqa: E731
    BACK = backdrop()
    scenes = [Scene(sc, sp, root) for sc in sp["scenes"]]
    starts, t0 = [], 0.0
    for s in scenes:
        starts.append(t0); t0 += s.dur
    total = t0
    out = Path(P(sp["out"])); out.parent.mkdir(parents=True, exist_ok=True)
    if scenes[0].sc["type"] == "cover":
        scenes[0].frame(0).save(out.with_name(out.stem + "_표지.jpg"), quality=92)
    only = sp.get("_preview")                              # 미리보기: 장면별 한 장씩만
    if only:
        sheet = []
        for s in scenes:
            sheet.append(s.frame(min(s.dur - 0.05, max(1.6, s.dur * 0.6))))
        cols = 5; tw, th = W // 4, H // 4
        rows = (len(sheet) + cols - 1) // cols
        sh = Image.new("RGB", (cols * tw, rows * th), (40, 40, 40))
        for i, fr in enumerate(sheet):
            sh.paste(fr.resize((tw, th)), ((i % cols) * tw, (i // cols) * th))
        sh.save(out.with_name(out.stem + "_미리보기.jpg"), quality=88)
        print("PREVIEW", f"{total:.1f}s", [round(s.dur, 1) for s in scenes]); return
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
        if i > 0 and lt < xf:
            fr = Image.blend(scenes[i - 1].frame(scenes[i - 1].dur - 1e-3), fr, lt / xf)
        if t > total - 0.6:
            fr = Image.blend(fr, Image.new("RGB", (W, H), BLACK), (t - (total - 0.6)) / 0.6)
        pr.stdin.write(fr.tobytes())
    pr.stdin.close(); pr.wait()
    vs = [(starts[k] + off, v) for k, s in enumerate(scenes) for off, v in s.voices]
    ins, fil, labs = ["-i", str(silent)], "", []
    for j, (at, v) in enumerate(vs):
        ins += ["-i", v]
        fil += f"[{j + 1}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={int(at * 1000)}|{int(at * 1000)},apad[v{j}];"
        labs.append(f"[v{j}]")
    if not vs and not sp.get("bgm"):
        silent.rename(out); print("DONE", out, f"{total:.1f}s"); return out
    if vs:
        fil += "".join(labs) + f"amix=inputs={len(vs)}:normalize=0,atrim=0:{total:.2f},asplit=2[vo][sc];"
    if sp.get("bgm"):
        bi = len(vs) + 1
        ins += ["-stream_loop", "-1", "-ss", f'{float(sp.get("bgm_start", 0)):.2f}', "-i", P(sp["bgm"])]
        fil += (f"[{bi}:a]aresample=48000,aformat=channel_layouts=stereo,volume={sp.get('bgm_volume', 0.35)},atrim=0:{total:.2f},"
                f"afade=t=in:d=0.8,afade=t=out:st={total - 2.0:.2f}:d=2.0[bg0];")
        fil += ("[bg0][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[bg];[vo][bg]amix=inputs=2:normalize=0,alimiter=limit=0.95[a]"
                if vs else "[bg0]anull[a]")
    else:
        fil += "[vo]alimiter=limit=0.95[a]"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *ins, "-filter_complex", fil,
                    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", f"{total:.2f}",
                    "-movflags", "+faststart", str(out)], check=True)
    silent.unlink()
    print("DONE", out, f"{total:.1f}s", flush=True)
    return out


if __name__ == "__main__":
    main(sys.argv[1])
