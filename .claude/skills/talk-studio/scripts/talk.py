"""talk-studio — 말하는 얼굴 영상(16:9)에 ① 옆 정보 카드 ② 슬라이드+원형 얼굴 ③ 전체 모아보기 ④ 키워드 강조 자막을 얹고, 썸네일 틀까지 만든다.
사용:
  python talk.py build timeline.json     → 영상
  python talk.py thumb thumb.json        → 썸네일(1280×720)
타임라인·썸네일 JSON 형식은 SKILL.md 참고. 문자열의 *별표* 안은 강조색."""
from __future__ import annotations

import json
import math
import os
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

REPO = Path(__file__).resolve().parents[4]
FD1 = REPO / "yt-studio/pipeline/fonts"                      # Black · SemiBold
FD2 = REPO / ".claude/skills/motion-studio/assets/fonts"     # Bold · Regular
FONT = {"black": FD1 / "Pretendard-Black.otf", "semi": FD1 / "Pretendard-SemiBold.otf",
        "bold": FD2 / "Pretendard-Bold.otf", "reg": FD2 / "Pretendard-Regular.otf"}
W, H, FPS = 1920, 1080, 30
NAVY, PANEL = (11, 18, 36), (20, 30, 56)
GOLD, TEAL, CORAL, DIM, WHITE = (242, 193, 78), (64, 214, 190), (240, 98, 120), (168, 180, 204), (255, 255, 255)
PIP, RING, PIP_M = 300, 316, 50          # 원형 얼굴 지름 · 금테 지름 · 여백


def F(kind: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT[kind]), size)


def ff(args: list[str]) -> None:
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args], check=True)


def duration(p: str | Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                       capture_output=True, text=True)
    return float(r.stdout.strip())


# ───────── 글자 ─────────
def rich_len(text: str, font) -> float:
    return sum(font.getlength(p) for p in text.split("*"))


def draw_rich(d: ImageDraw.ImageDraw, xy, text: str, font, color=WHITE, accent=GOLD, shadow=True, stroke=0) -> float:
    x, y = xy
    for i, part in enumerate(text.split("*")):
        if not part:
            continue
        if shadow:
            d.text((x + 3, y + 4), part, font=font, fill=(0, 0, 0, 120))
        d.text((x, y), part, font=font, fill=accent if i % 2 else color, stroke_width=stroke, stroke_fill=NAVY)
        x += font.getlength(part)
    return x


def tracked(d, xy, text: str, font, fill, track: int = 4) -> float:
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += font.getlength(ch) + track
    return x


def glow_box(img: Image.Image, box, color, radius=22, width=3, blur=10) -> None:
    """빛나는 테두리 사각형"""
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(lay).rounded_rectangle(box, radius, outline=color + (255,), width=width + 4)
    img.alpha_composite(lay.filter(ImageFilter.GaussianBlur(blur)))
    ImageDraw.Draw(img).rounded_rectangle(box, radius, outline=color + (255,), width=width)


def navy_bg(size=(W, H), grid=60) -> Image.Image:
    w, h = size
    img = Image.new("RGBA", size, NAVY + (255,))
    glow = Image.radial_gradient("L").resize((int(w * 1.4), int(h * 1.6))).point(lambda v: max(0, 70 - v // 3))
    lay = Image.new("RGBA", glow.size, (40, 70, 130, 255)); lay.putalpha(glow)
    img.alpha_composite(lay, (int(-w * 0.2), int(-h * 0.45)))
    lines = Image.new("RGBA", size, (0, 0, 0, 0))   # 선은 따로 그려 반투명으로 합성 (RGBA 직접 그리기는 섞이지 않음)
    d = ImageDraw.Draw(lines)
    for x in range(0, w, grid):
        d.line([(x, 0), (x, h)], fill=(255, 255, 255, 14))
    for y in range(0, h, grid):
        d.line([(0, y), (w, y)], fill=(255, 255, 255, 14))
    img.alpha_composite(lines)
    return img


def header(d, kicker: str, title: str, x=120, y=110, tsize=84) -> int:
    d.line([(x, y + 16), (x + 56, y + 16)], fill=GOLD + (200,), width=3)
    tracked(d, (x + 74, y), kicker.upper(), F("semi", 28), GOLD + (230,), 5)
    draw_rich(d, (x, y + 62), title, F("black", tsize))
    return y + 62 + tsize + 40


# ───────── 그림 재료 ─────────
def render_card(spec: dict, out: Path) -> Path:
    """얼굴 위 오른쪽 위 정보 카드 (반투명 유리)"""
    kf, tf, itf = F("semi", 22), F("bold", 44), F("semi", 30)
    items = spec.get("items", [])
    width = int(max([tracked(ImageDraw.Draw(Image.new("RGBA", (1, 1))), (0, 0), spec.get("kicker", "").upper(), kf, 0, 4),
                     rich_len(spec["title"], tf)] + [itf.getlength(t) + 44 for t in items]) + 72)
    width = max(width, 520)
    height = 36 + 30 + 18 + 56 + (18 if items else 0) + 48 * len(items) + 30
    img = Image.new("RGBA", (width + 40, height + 40), (0, 0, 0, 0))
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((20, 26, width + 20, height + 26), 26, fill=(0, 0, 0, 120))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(12)))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((20, 20, width + 20, height + 20), 26, fill=(12, 18, 32, 214), outline=(255, 255, 255, 46), width=2)
    x, y = 20 + 36, 20 + 32
    tracked(d, (x, y), spec.get("kicker", "").upper(), kf, GOLD + (220,), 4)
    y += 30 + 14
    draw_rich(d, (x, y), spec["title"], tf, shadow=False)
    y += 56 + 18
    for t in items:
        d.ellipse((x, y + 15, x + 12, y + 27), fill=GOLD)
        draw_rich(d, (x + 28, y), t, itf, color=(232, 238, 248), shadow=False)
        y += 48
    img.save(out)
    return out


def render_slide(spec: dict, out: Path) -> Path:
    """남색 슬라이드 1920×1080 — 오른쪽 위 원형 얼굴 자리는 비워 둔다"""
    if spec.get("png"):
        Image.open(spec["png"]).convert("RGB").resize((W, H)).save(out)
        return out
    img = navy_bg()
    d = ImageDraw.Draw(img)
    y = header(d, spec.get("kicker", ""), spec["title"])
    cards = spec.get("cards", [])
    if cards:
        n, gap, x0 = len(cards), 36, 120
        cw = (W - 2 * x0 - gap * (n - 1)) // n
        top, ch = max(y + 40, 470), 330
        for i, c in enumerate(cards):
            bx = x0 + i * (cw + gap)
            d.rounded_rectangle((bx, top, bx + cw, top + ch), 26, fill=PANEL + (255,))
            glow_box(img, (bx, top, bx + cw, top + ch), TEAL if i != spec.get("gold", -1) else GOLD)
            d = ImageDraw.Draw(img)
            lines = c.split("\n")
            fsz = 52
            tf = F("bold", fsz)
            ty = top + ch // 2 - len(lines) * (fsz + 14) // 2
            for ln in lines:
                draw_rich(d, (bx + (cw - rich_len(ln, tf)) / 2, ty), ln, tf, shadow=False)
                ty += fsz + 14
    if spec.get("quote"):
        top = max(y + 50, 470)
        box = (120, top, W - 120, top + 300)
        d.rounded_rectangle(box, 30, fill=PANEL + (255,))
        glow_box(img, box, GOLD)
        d = ImageDraw.Draw(img)
        d.text((160, top + 10), "“", font=F("black", 140), fill=GOLD + (255,))
        qf = F("bold", 54)
        ty = top + 80
        for ln in spec["quote"].split("\n"):
            draw_rich(d, (280, ty), ln, qf, shadow=False)
            ty += 76
    if spec.get("note"):  # 카드/인용 아래 — 자막 자리(아래 200px)는 비운다
        nf = F("semi", 34)
        ny = (max(y + 40, 470) + 330 + 44) if cards else (max(y + 50, 470) + 300 + 44) if spec.get("quote") else H - 300
        d.text(((W - nf.getlength(spec["note"])) / 2, min(ny, H - 260)), spec["note"], font=nf, fill=DIM + (255,))
    img.convert("RGB").save(out)
    return out


def render_ring(out: Path) -> Path:
    img = Image.new("RGBA", (RING + 40, RING + 40), (0, 0, 0, 0))
    sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse((20, 26, RING + 20, RING + 26), outline=(0, 0, 0, 150), width=14)
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(8)))
    ImageDraw.Draw(img).ellipse((20, 20, RING + 20, RING + 20), outline=GOLD + (255,), width=(RING - PIP) // 2 + 2)
    img.save(out)
    return out


def render_mask(out: Path) -> Path:
    m = Image.new("L", (PIP * 4, PIP * 4), 0)
    ImageDraw.Draw(m).ellipse((0, 0, PIP * 4 - 1, PIP * 4 - 1), fill=255)
    m.resize((PIP, PIP), Image.LANCZOS).save(out)
    return out


def render_grid(spec: dict, tiles: list[Path], out0: Path, out1: Path) -> None:
    """전체 모아보기 — 이 영상 장면을 바둑판으로. out0 = 강조 없음, out1 = 강조 테두리"""
    img = navy_bg()
    d = ImageDraw.Draw(img)
    header(d, spec.get("kicker", "ALL IN ONE"), spec.get("title", "오늘 다룬 것 *한눈에*"), y=80, tsize=64)
    cols = 5
    rows = 3 if len(tiles) >= 15 else 2
    x0, gap = 100, 24
    tw = (W - 2 * x0 - gap * (cols - 1)) // cols
    th = tw * 9 // 16
    y0 = 300 if rows == 3 else 380
    boxes = []
    for k in range(cols * rows):
        r, c = divmod(k, cols)
        bx, by = x0 + c * (tw + gap), y0 + r * (th + gap)
        t = Image.open(tiles[k % len(tiles)]).convert("RGB").resize((tw, th), Image.LANCZOS)
        mask = Image.new("L", (tw, th), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, tw - 1, th - 1), 14, fill=255)
        img.paste(t, (bx, by), mask)
        ImageDraw.Draw(img).rounded_rectangle((bx, by, bx + tw, by + th), 14, outline=(255, 255, 255, 40), width=2)
        boxes.append((bx, by, bx + tw, by + th))
    img.convert("RGB").save(out0)
    for k in spec.get("highlight", [1, 7, 12]):
        if k < len(boxes):
            glow_box(img, boxes[k], TEAL, radius=16, width=4)
    img.convert("RGB").save(out1)


# ───────── 자막 ─────────
def ass_color(rgb) -> str:
    r, g, b = rgb
    return f"&H00{b:02X}{g:02X}{r:02X}&"


def write_ass(subs: list, out: Path, accent=GOLD, size=54, margin_v=64) -> Path:
    def ts(t):
        return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"
    ac = ass_color(accent)
    with open(out, "w", encoding="utf-8") as f:
        f.write(f"[Script Info]\nScriptType: v4.00+\nPlayResX: {W}\nPlayResY: {H}\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n")
        f.write("[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n")
        # BorderStyle 3 = 글자 뒤 상자(OutlineColour 가 상자 색)
        f.write(f"Style: Default,Pretendard SemiBold,{size},&H00FFFFFF,&H000000FF,&H5A0E1424,&H00000000,0,0,0,0,100,100,0,0,3,16,0,2,80,80,{margin_v},1\n\n")
        f.write("[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")
        for s, e, t in subs:
            parts = t.replace("\n", "\\N").split("*")
            txt = "".join((f"{{\\c{ac}}}{p}{{\\c&H00FFFFFF&}}" if i % 2 else p) for i, p in enumerate(parts))
            f.write(f"Dialogue: 0,{ts(s)},{ts(e)},Default,,0,0,0,,{txt}\n")
    return out


# ───────── 영상 조립 ─────────
ENC = ["-c:v", "libx264", "-crf", "18", "-preset", "fast", "-pix_fmt", "yuv420p", "-r", str(FPS), "-an"]


def pip_chain(base_idx: int, mask_idx: int, ring_idx: int, src: str, box) -> str:
    fx, fy, fw, fh = box
    return (f"[{base_idx}:v]crop={fw}:{fh}:{fx}:{fy},scale={PIP}:{PIP},fps={FPS},format=rgba[p];"
            f"[{mask_idx}:v]format=gray,scale={PIP}:{PIP}[m];[p][m]alphamerge,fade=t=in:st=0:d=0.3:alpha=1[pm];"
            f"[{src}][pm]overlay=x=W-{PIP_M + RING - (RING - PIP) // 2}:y={PIP_M + (RING - PIP) // 2}:shortest=1[t1];"
            f"[t1][{ring_idx}:v]overlay=x=W-{PIP_M + RING + 20}:y={PIP_M - 20}:shortest=1[v]")


def zoom_bg(idx: int, d: float, label: str) -> str:
    return (f"[{idx}:v]scale=w='trunc({W}*(1.045-0.045*t/{d:.2f})/2)*2':h=-2:eval=frame,crop={W}:{H},setsar=1,fps={FPS},"
            f"fade=t=in:st=0:d=0.25[{label}]")


def build(tl_path: str) -> Path:
    tl = json.load(open(tl_path, encoding="utf-8"))
    root = Path(tl_path).resolve().parent
    P = lambda p: str((root / p).resolve()) if p and not os.path.isabs(p) else p  # noqa: E731
    out = Path(P(tl["out"]))
    work = out.parent / (out.stem + "_work"); work.mkdir(parents=True, exist_ok=True)
    base, box = P(tl["base"]), tl["face_box"]
    ring, mask = render_ring(work / "ring.png"), render_mask(work / "mask.png")
    loop = lambda p, d: ["-loop", "1", "-framerate", str(FPS), "-t", f"{d:.2f}", "-i", str(p)]  # noqa: E731
    parts = []
    for i, sg in enumerate(tl["segments"]):
        s, e = sg["t"]; d = e - s
        seg = work / f"seg{i:02d}.mp4"
        src = ["-ss", f"{s:.2f}", "-t", f"{d:.2f}", "-i", base]
        mode = sg.get("mode", "face")
        if mode == "face":
            fil = f"[0:v]scale={W}:{H},setsar=1,fps={FPS}[b]"
            ins = src
            if sg.get("card"):
                cp = render_card(sg["card"], work / f"card{i:02d}.png")
                a, b = [x - s for x in sg["card"].get("at", [s + 0.4, e - 0.3])]
                ins = src + loop(cp, d)
                fil += (f";[1:v]format=rgba,fade=t=in:st={a:.2f}:d=0.35:alpha=1,fade=t=out:st={max(a, b - 0.3):.2f}:d=0.3:alpha=1[c];"
                        f"[b][c]overlay=x='W-w-40+40*max(0,1-(t-{a:.2f})/0.35)':y=40:enable='between(t,{a:.2f},{b:.2f})'[v]")
            else:
                fil = fil.replace("[b]", "[v]")
            ff([*ins, "-filter_complex", fil, "-map", "[v]", "-t", f"{d:.2f}", *ENC, str(seg)])
        elif mode == "slide":
            sp = render_slide(sg["slide"], work / f"slide{i:02d}.png")
            fil = zoom_bg(0, d, "bg") + ";" + pip_chain(1, 2, 3, "bg", box)
            ff([*loop(sp, d), *src, *loop(mask, d), *loop(ring, d), "-filter_complex", fil, "-map", "[v]", "-t", f"{d:.2f}", *ENC, str(seg)])
        elif mode == "grid":
            tiles = []
            for j, prev in enumerate(parts):
                pd = duration(prev)
                for k, frac in enumerate((0.3, 0.6, 0.9)):
                    tp = work / f"tile{j:02d}_{k}.jpg"
                    ff(["-ss", f"{pd * frac:.2f}", "-i", str(prev), "-frames:v", "1", "-q:v", "3", str(tp)])
                    tiles.append(tp)
            g0, g1 = work / f"grid{i:02d}_a.png", work / f"grid{i:02d}_b.png"
            render_grid(sg, tiles or [ring], g0, g1)
            fil = (f"[1:v]format=rgba,fade=t=in:st={d * 0.35:.2f}:d=0.5:alpha=1[hl];[0:v][hl]overlay[g];"
                   + zoom_bg(0, d, "bg").replace("[0:v]", "[g]") + ";" + pip_chain(2, 3, 4, "bg", box))
            ff([*loop(g0, d), *loop(g1, d), *src, *loop(mask, d), *loop(ring, d), "-filter_complex", fil, "-map", "[v]", "-t", f"{d:.2f}", *ENC, str(seg)])
        parts.append(seg)
        print(f"seg{i:02d} {mode:5s} {s:6.2f}-{e:6.2f}", flush=True)
    lst = work / "list.txt"
    lst.write_text("".join(f"file '{p}'\n" for p in parts))
    joined = work / "joined.mp4"
    ff(["-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(joined)])
    total = tl["segments"][-1]["t"][1] - tl["segments"][0]["t"][0]
    t0 = tl["segments"][0]["t"][0]
    ass = write_ass([[a - t0, b - t0, t] for a, b, t in tl.get("subs", [])], work / "subs.ass", accent=tuple(tl.get("accent", GOLD)))
    audio = P(tl.get("audio")) or base
    ains = ["-ss", f"{t0:.2f}", "-i", audio]
    afil = "[1:a]aresample=48000[a0]"
    if tl.get("bgm"):
        ains += ["-stream_loop", "-1", "-i", P(tl["bgm"])]
        afil = f"[1:a]aresample=48000[n];[2:a]volume={tl.get('bgm_volume', 0.12)},aresample=48000[m];[n][m]amix=inputs=2:normalize=0:duration=first[a0]"
    vf = f"[0:v]subtitles={ass}:fontsdir={FD1}[vo]"
    ff(["-i", str(joined), *ains, "-filter_complex", vf + ";" + afil, "-map", "[vo]", "-map", "[a0]",
        "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
        "-t", f"{total:.2f}", "-movflags", "+faststart", str(out)])
    print("DONE", out, f"{total:.1f}s", flush=True)
    return out


# ───────── 썸네일 ─────────
def thumb(spec_path: str) -> Path:
    sp = json.load(open(spec_path, encoding="utf-8"))
    root = Path(spec_path).resolve().parent
    P = lambda p: str((root / p).resolve()) if not os.path.isabs(p) else p  # noqa: E731
    TW, TH = 1280, 720
    img = navy_bg((TW, TH), grid=40)
    accent = tuple(sp.get("accent", GOLD))
    if sp.get("face"):  # 오른쪽 얼굴 — 왼쪽 가장자리를 남색으로 녹인다
        fimg = Image.open(P(sp["face"])).convert("RGB")
        fx, fy, fw, fh = sp.get("face_crop", [0, 0, fimg.width, fimg.height])
        fimg = fimg.crop((fx, fy, fx + fw, fy + fh))
        fh2 = TH; fw2 = int(fimg.width * fh2 / fimg.height)
        fimg = fimg.resize((fw2, fh2), Image.LANCZOS).convert("RGBA")
        g = Image.linear_gradient("L").rotate(90).resize((fw2, fh2)).point(lambda v: min(255, int((255 - v) * 2.4)))
        fimg.putalpha(g)
        img.alpha_composite(fimg, (TW - fw2, 0))
    d = ImageDraw.Draw(img)
    pf = F("bold", 24)  # 채널 알약
    pill = sp.get("pill", "노모어매뉴얼")
    pw = pf.getlength(pill) + 66
    d.rounded_rectangle((44, 30, 44 + pw, 78), 24, fill=(12, 18, 32, 230), outline=accent + (255,), width=2)
    d.ellipse((64, 48, 76, 60), fill=accent)
    d.text((88, 38), pill, font=pf, fill=WHITE)
    tf = F("black", sp.get("title_size", 104))
    y = 104
    for ln in sp["title"]:
        x = 44
        for i, part in enumerate(ln.split("*")):
            if not part:
                continue
            if i % 2:  # 강조 단어 = 색 상자 + 남색 글자
                w = tf.getlength(part)
                d.rectangle((x - 6, y + 14, x + w + 14, y + tf.size + 26), fill=accent)
                d.text((x + 4, y), part, font=tf, fill=NAVY)
                x += w + 24
            else:
                d.text((x + 4, y + 6), part, font=tf, fill=(0, 0, 0, 150))
                d.text((x, y), part, font=tf, fill=WHITE, stroke_width=3, stroke_fill=NAVY)
                x += tf.getlength(part)
        y += tf.size + 30
    if sp.get("shot"):  # 데모 화면 캡처 — 비스듬히
        sw = sp.get("shot_w", 660)
        s = Image.open(P(sp["shot"])).convert("RGB")
        s = s.resize((sw, int(s.height * sw / s.width)), Image.LANCZOS)
        card = Image.new("RGBA", (s.width + 16, s.height + 16), TEAL + (255,))
        m = Image.new("L", card.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, card.width - 1, card.height - 1), 20, fill=255)
        card.paste(s, (8, 8)); card.putalpha(m)
        card = card.rotate(sp.get("shot_rot", 2), expand=True, resample=Image.BICUBIC)
        sx, sy = sp.get("shot_xy", [30, TH - card.height - 10])
        sh = Image.new("RGBA", img.size, (0, 0, 0, 0)); sh.alpha_composite(Image.new("RGBA", card.size, (0, 0, 0, 160)), (sx + 10, sy + 16))
        sh.putalpha(sh.getchannel("A")); img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(14)))
        img.alpha_composite(card, (sx, sy))
    for st in sp.get("stickers", []):  # 스티커
        sf = F("black", st.get("size", 38))
        tw = sf.getlength(st["text"])
        lab = Image.new("RGBA", (int(tw) + 60, sf.size + 40), (0, 0, 0, 0))
        ImageDraw.Draw(lab).rounded_rectangle((0, 0, lab.width - 1, lab.height - 1), 14, fill=tuple(st.get("color", CORAL)) + (255,), outline=WHITE + (255,), width=3)
        ImageDraw.Draw(lab).text((30, 14), st["text"], font=sf, fill=WHITE)
        lab = lab.rotate(st.get("rot", -3), expand=True, resample=Image.BICUBIC)
        img.alpha_composite(lab, tuple(st["xy"]))
    out = Path(P(sp["out"]))
    img.convert("RGB").save(out, quality=93)
    print("DONE", out, flush=True)
    return out


if __name__ == "__main__":
    cmd, arg = sys.argv[1], sys.argv[2]
    {"build": build, "thumb": thumb}[cmd](arg)
