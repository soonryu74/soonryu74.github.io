"""제품 광고 쇼츠(9:16) — 실사진 한 장 한 장을 «카메라가 움직이는 장면»으로 (2026-10-29, 아큐페이즈 E-5000 광고 편).
설명 영상(product_short.py)과 달리 화면 가득 사진 + 느린 카메라 이동 + 초점 맞추기 + 빛 스침 + 짧은 카피.
사용: python ad_short.py spec.json
spec.json:
{
 "out": "E-5000_광고.mp4", "label": "ACCUPHASE  /  E-5000",
 "bgm": "음악.mp3", "bgm_volume": 0.55, "fps": 24, "shot": 7.5, "xf": 0.7,
 "voice_at": 1.0,                                       // 장면 시작 뒤 목소리 들어가는 시각
 "shots": [
  {"src": "사선_정면.jpg", "from": [0.30, 0.5, 0.95], "to": [0.62, 0.5, 0.95],   // [가로 중심, 세로 중심, 보이는 높이 비율]
   "title": "50년의 기술을 담은", "sub": "Accuphase E-5000", "note": "", "voice": "voice/A01.wav",
   "focus_pull": true, "sweep": true},
  {"src": "앞면.png", "stage": true, ...},              // 흰 바탕 누끼컷 → 어두운 무대 + 바닥 반사 위에 얹어 같은 방식으로
  {"end": true, "src": "표지_세로.jpg", "lines": ["PRECISION INTEGRATED AMPLIFIER", "Accuphase", "E-5000", "음악을 깊이 만나는 선택"]}
 ]
}
글자는 위쪽 가운데에만(아래 22% 는 쇼츠 버튼 자리)."""
from __future__ import annotations

import random
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter

from common import F, load, probe

W, H = 1080, 1920
BLACK = (6, 6, 7)
WARM = (255, 214, 160)


def clamp(v, a=0.0, b=1.0):
    return max(a, min(b, v))


def smooth(t):
    t = clamp(t); return t * t * (3 - 2 * t)


def cutout(im):
    """흰 바탕 제품컷 → 바깥 흰색만 투명(가장자리에서 번져 들어가는 흰색만 지워 제품 안 흰 글자는 남긴다)"""
    rgb = im.convert("RGB")
    m = rgb.convert("L").point(lambda v: 255 if v > 232 else 0)
    w, h = m.size
    fill = Image.new("L", (w + 2, h + 2), 255); fill.paste(m, (1, 1))
    ImageDraw.floodfill(fill, (0, 0), 128)
    bg = fill.crop((1, 1, w + 1, h + 1)).point(lambda v: 255 if v == 128 else 0)
    alpha = ImageChops.invert(bg).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    out = rgb.convert("RGBA"); out.putalpha(alpha)
    return out.crop(alpha.getbbox())


def stage(im, scale=1.5, width=0.86, y=0.5):
    """어두운 무대: 위는 검정, 바닥은 따뜻한 갈색, 제품 뒤로 은은한 빛 + 바닥 반사"""
    SW, SH = int(W * scale), int(H * scale)
    g = Image.new("L", (1, SH))
    for yy in range(SH):
        g.putpixel((0, yy), int(255 * smooth((yy / SH - 0.35) / 0.65)))
    bg = Image.composite(Image.new("RGB", (SW, SH), (38, 28, 20)), Image.new("RGB", (SW, SH), BLACK), g.resize((SW, SH)))
    glow = Image.new("L", (SW, SH), 0)
    ImageDraw.Draw(glow).ellipse((SW * 0.05, SH * (y - 0.22), SW * 0.95, SH * (y + 0.12)), fill=90)
    bg = Image.composite(Image.new("RGB", (SW, SH), (120, 92, 60)), bg, glow.filter(ImageFilter.GaussianBlur(SW * 0.12)))
    p = cutout(im)
    r = SW * width / p.width
    p = p.resize((int(p.width * r), int(p.height * r)), Image.LANCZOS)
    x0, y0 = (SW - p.width) // 2, int(SH * y - p.height / 2)
    canvas = bg.convert("RGBA")
    ref = p.transpose(Image.FLIP_TOP_BOTTOM)                       # 바닥 반사
    fade = Image.new("L", (1, ref.height))
    for yy in range(ref.height):
        fade.putpixel((0, yy), int(70 * (1 - clamp(yy / (ref.height * 0.45)))))
    ra = ImageChops.multiply(ref.getchannel("A"), fade.resize(ref.size))
    ref.putalpha(ra)
    canvas.alpha_composite(ref.filter(ImageFilter.GaussianBlur(3)), (x0, y0 + p.height + 4))
    sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))                # 바닥 그림자
    ImageDraw.Draw(sh).ellipse((x0 + p.width * 0.05, y0 + p.height - 30, x0 + p.width * 0.95, y0 + p.height + 40), fill=(0, 0, 0, 170))
    canvas.alpha_composite(sh.filter(ImageFilter.GaussianBlur(26)))
    canvas.alpha_composite(p, (x0, y0))
    return canvas.convert("RGB")


def inset(im, card_w=0.84, y=0.56):
    """작은 카탈로그 사진: 같은 사진을 크게 흐리고 어둡게 깔고, 위에 둥근 카드로 (글자 자리 피해 아래쪽)"""
    SW, SH = int(W * 1.2), int(H * 1.2)
    im = im.convert("RGB")
    r = max(SW / im.width, SH / im.height)
    bg = im.resize((max(1, int(im.width * r / 8)), max(1, int(im.height * r / 8))))
    bg = bg.filter(ImageFilter.GaussianBlur(6)).resize((int(im.width * r), int(im.height * r)), Image.BICUBIC)
    bg = bg.crop(((bg.width - SW) // 2, (bg.height - SH) // 2, (bg.width - SW) // 2 + SW, (bg.height - SH) // 2 + SH))
    bg = ImageEnhance.Brightness(bg).enhance(0.28)
    cw = int(SW * card_w); ch = int(cw * im.height / im.width)
    card = im.resize((cw, ch), Image.LANCZOS)
    m = Image.new("L", (cw, ch), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, cw - 1, ch - 1), 26, fill=255)
    x0, y0 = (SW - cw) // 2, int(SH * y - ch / 2)
    canvas = bg.convert("RGBA")
    sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((x0 + 10, y0 + 30, x0 + cw - 10, y0 + ch + 40), 30, fill=(0, 0, 0, 200))
    canvas.alpha_composite(sh.filter(ImageFilter.GaussianBlur(30)))
    c = card.convert("RGBA"); c.putalpha(m); canvas.alpha_composite(c, (x0, y0))
    ImageDraw.Draw(canvas).rounded_rectangle((x0, y0, x0 + cw - 1, y0 + ch - 1), 26, outline=(212, 178, 106, 110), width=2)
    return canvas.convert("RGB")


def vignette():
    m = Image.new("L", (W // 4, H // 4), 0)
    ImageDraw.Draw(m).ellipse((-W // 4 * 0.25, -H // 4 * 0.12, W // 4 * 1.25, H // 4 * 1.12), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(60)).resize((W, H), Image.BICUBIC)
    v = Image.new("RGBA", (W, H), (0, 0, 0, 0)); v.putalpha(ImageChops.invert(m).point(lambda a: int(a * 0.72)))
    return v


def scrim():
    """글자 뒤 위쪽만 살짝 어둡게(밝은 금색 패널 위에서도 읽히게)"""
    g = Image.new("L", (1, H))
    for y in range(H):
        g.putpixel((0, y), int(215 * (1 - smooth(y / 720))))
    s = Image.new("RGBA", (W, H), (0, 0, 0, 0)); s.putalpha(g.resize((W, H))); return s


SCRIM = scrim()


def grains(n=6):
    out = []
    for i in range(n):
        random.seed(i)
        g = Image.effect_noise((W // 2, H // 2), 40).resize((W, H), Image.NEAREST)
        out.append(g.convert("RGB"))
    return out


def text_layer(sp, sh):
    """위쪽 가운데: 작은 라벨 · 카피 · 숫자 · 작은 설명 (부드러운 그림자)"""
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    rows = []
    if sh.get("end"):
        L = sh["lines"]
        rows = [(L[0], F("semi", 28), (214, 190, 140), 820, 6), (L[1], F("bold", 64), (240, 232, 218), 880, 0),
                (L[2], F("black", 96), (240, 232, 218), 965, 0), (L[3], F("semi", 46), (214, 190, 140), 1120, 0)]
        if len(L) > 4:
            rows.append((L[4], F("reg", 30), (170, 164, 154), 1200, 0))
    else:
        rows.append((sp.get("label", ""), F("semi", 26), (226, 212, 186), 250, 6))
        if sh.get("title"):
            rows.append((sh["title"], F("bold", 60), (250, 246, 238), 318, 0))
        if sh.get("sub"):
            rows.append((sh["sub"], F("semi", 48), (246, 230, 194), 404, 0))
        for k, ln in enumerate((sh.get("note") or "").split("\n")):
            if ln:
                rows.append((ln, F("semi", 31), (226, 220, 210), 476 + k * 46, 0))
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(shadow)
    for s, f, col, y, sp_ in rows:
        w = sum(f.getlength(c) + sp_ for c in s) - sp_
        x = (W - w) / 2
        for c in s:
            sd.text((x, y), c, font=f, fill=(0, 0, 0, 255), stroke_width=3, stroke_fill=(0, 0, 0, 255)); d.text((x, y), c, font=f, fill=col + (255,))
            x += f.getlength(c) + sp_
    shadow = shadow.filter(ImageFilter.GaussianBlur(9))
    shadow.alpha_composite(lay)
    return shadow


class Shot:
    def __init__(self, sh, sp, root):
        self.sh, self.sp = sh, sp
        im = Image.open(root / sh["src"])
        if sh.get("stage"):
            im = stage(im, **sh.get("stage_opt", {}))
        elif sh.get("inset"):
            im = inset(im, **sh.get("inset_opt", {}))
        im = im.convert("RGB")
        if sh.get("warm", True):
            im = Image.blend(ImageEnhance.Contrast(im).enhance(1.06), Image.new("RGB", im.size, (255, 196, 140)), 0.05)
        if sh.get("dim"):
            im = ImageEnhance.Brightness(im).enhance(sh["dim"])
        self.im = im
        self.dur = float(sh.get("dur", sp.get("shot", 7.5)))
        self.text = text_layer(sp, sh)
        self.voice = str((root / sh["voice"]).resolve()) if sh.get("voice") else None
        if self.voice:
            self.dur = max(self.dur, sp.get("voice_at", 1.0) + probe(self.voice)["duration"] + 1.4)

    def rect(self, k):
        a, b = self.sh.get("from", [0.5, 0.5, 1.0]), self.sh.get("to", self.sh.get("from", [0.5, 0.5, 0.88]))
        e = smooth(k) * 0.5 + k * 0.5                         # 느리고 일정하게 — 확대는 5% 안쪽, 주로 옆으로 흐르기
        cx, cy, hh = (a[i] + (b[i] - a[i]) * e for i in range(3))
        iw, ih = self.im.size
        ph = ih * hh; pw = ph * W / H
        if pw > iw:
            pw = iw; ph = pw * H / W
        x0 = clamp(cx * iw - pw / 2, 0, iw - pw); y0 = clamp(cy * ih - ph / 2, 0, ih - ph)
        return (x0, y0, x0 + pw, y0 + ph)

    def frame(self, t, vig, grain):
        k = t / self.dur
        x0, y0, x1, y1 = self.rect(k)
        fr = self.im.resize((W, H), Image.BICUBIC, box=(x0, y0, x1, y1), reducing_gap=2.0)
        if (x1 - x0) < W * 0.95:                                # 확대된 장면은 살짝 선명하게
            fr = fr.filter(ImageFilter.UnsharpMask(2, 60, 2))
        if self.sh.get("focus_pull") and t < 1.4:              # 초점이 천천히 맞는다
            r = 9 * (1 - smooth(t / 1.4))
            if r > 0.3:
                fr = fr.filter(ImageFilter.GaussianBlur(r))
        if self.sh.get("sweep", True):                         # 금속 위로 빛이 한 번 스친다
            p = (t - 1.0) / 3.6
            if 0 < p < 1:
                band = Image.new("L", (W // 4, H // 4), 0)
                cx = -W // 4 * 0.4 + p * W // 4 * 1.8
                ImageDraw.Draw(band).polygon([(cx, 0), (cx + 40, 0), (cx - 60, H // 4), (cx - 100, H // 4)], fill=255)
                band = band.filter(ImageFilter.GaussianBlur(14)).resize((W, H), Image.BICUBIC)
                light = Image.new("RGB", (W, H), WARM)
                fr = Image.composite(ImageChops.screen(fr, light), fr, band.point(lambda v: int(v * 0.13)))
        fr = fr.convert("RGBA")
        fr.alpha_composite(vig)
        if not self.sh.get("end"):
            fr.alpha_composite(SCRIM)
        a = clamp((t - 0.5) / 0.7) * (1 - clamp((t - (self.dur - 0.9)) / 0.6))
        if self.sh.get("end"):
            a = clamp((t - 0.6) / 1.0)
        if a > 0:
            tl = self.text.copy(); tl.putalpha(tl.getchannel("A").point(lambda v: int(v * a)))
            fr.alpha_composite(tl)
        fr = fr.convert("RGB")
        return ImageChops.add(fr, grain.point(lambda v: v // 20), 1, -6)   # 아주 옅은 필름 입자


def main(spec_path):
    sp = load(spec_path)
    root = Path(spec_path).resolve().parent
    P = lambda p: str((root / p).resolve()) if not Path(p).is_absolute() else p  # noqa: E731
    fps = sp.get("fps", 24); xf = sp.get("xf", 0.7)
    shots = [Shot(sh, sp, root) for sh in sp["shots"]]
    starts, t0 = [], 0.0
    for s in shots:
        starts.append(t0); t0 += s.dur - xf
    total = t0 + xf
    out = Path(P(sp["out"])); out.parent.mkdir(parents=True, exist_ok=True)
    vig, gr = vignette(), grains()
    if sp.get("_preview"):
        tw, th = W // 4, H // 4
        sheet = Image.new("RGB", (6 * tw, ((len(shots) + 5) // 6) * th))
        for i, s in enumerate(shots):
            sheet.paste(s.frame(s.dur * 0.55, vig, gr[0]).resize((tw, th)), ((i % 6) * tw, (i // 6) * th))
        sheet.save(out.with_name(out.stem + "_미리보기.jpg"), quality=88)
        print("PREVIEW", f"{total:.1f}s"); return
    shots[0].frame(shots[0].dur * 0.6, vig, gr[0]).save(out.with_name(out.stem + "_표지.jpg"), quality=92)
    silent = out.with_name(out.stem + "_무음.mp4")
    pr = subprocess.Popen(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
                           "-s", f"{W}x{H}", "-r", str(fps), "-i", "-", "-c:v", "libx264", "-crf", "18", "-preset", "medium",
                           "-pix_fmt", "yuv420p", str(silent)], stdin=subprocess.PIPE)
    n = int(round(total * fps))
    for fi in range(n):
        t = fi / fps
        act = [i for i in range(len(shots)) if starts[i] <= t < starts[i] + shots[i].dur]
        i = act[-1]
        fr = shots[i].frame(t - starts[i], vig, gr[fi % len(gr)])
        if len(act) > 1:                                       # 겹치는 구간: 부드럽게 이어 붙이기
            j = act[0]
            prev = shots[j].frame(t - starts[j], vig, gr[fi % len(gr)])
            fr = Image.blend(prev, fr, smooth((t - starts[i]) / xf))
        if t < 0.6:
            fr = Image.blend(Image.new("RGB", (W, H), BLACK), fr, t / 0.6)
        if t > total - 1.2:
            fr = Image.blend(fr, Image.new("RGB", (W, H), BLACK), (t - (total - 1.2)) / 1.2)
        pr.stdin.write(fr.tobytes())
    pr.stdin.close(); pr.wait()
    at = sp.get("voice_at", 1.0)
    vs = [(starts[i] + at, s.voice) for i, s in enumerate(shots) if s.voice]
    ins, fil, labs = ["-i", str(silent)], "", []
    for j, (tt, v) in enumerate(vs):
        ins += ["-i", v]
        fil += f"[{j + 1}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={int(tt * 1000)}|{int(tt * 1000)},apad[v{j}];"
        labs.append(f"[v{j}]")
    if vs:
        fil += "".join(labs) + f"amix=inputs={len(vs)}:normalize=0,atrim=0:{total:.2f},asplit=2[vo][sc];"
    bi = len(vs) + 1
    ins += ["-ss", f'{float(sp.get("bgm_start", 0)):.2f}', "-i", P(sp["bgm"])]
    fil += (f"[{bi}:a]aresample=48000,aformat=channel_layouts=stereo,volume={sp.get('bgm_volume', 0.55)},atrim=0:{total:.2f},"
            f"afade=t=in:d=1.0,afade=t=out:st={total - 3.0:.2f}:d=3.0[bg0];"
            + ("[bg0][sc]sidechaincompress=threshold=0.04:ratio=5:attack=30:release=600[bg];"
               "[vo][bg]amix=inputs=2:normalize=0,alimiter=limit=0.95[a]" if vs else "[bg0]alimiter=limit=0.95[a]"))
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *ins, "-filter_complex", fil, "-map", "0:v", "-map", "[a]",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", f"{total:.2f}", "-movflags", "+faststart", str(out)], check=True)
    silent.unlink()
    print("DONE", out, f"{total:.1f}s", flush=True)


if __name__ == "__main__":
    main(sys.argv[1])
