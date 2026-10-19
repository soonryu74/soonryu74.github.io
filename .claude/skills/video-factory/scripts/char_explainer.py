"""캐릭터 해설 쇼츠(9:16) — 코드로 그린 «냥이 선생»이 칠판 앞에서 말한다.
조남경 «바이브 모션 4편 — 냥이 선생이 라면 역사를 설명합니다»(2026-10)의 형식을 우리 엔진으로.
사용: python char_explainer.py spec.json
spec.json:
{
 "out": "엑셀역사_냥이선생.mp4", "title": "냥이 선생의 30초 상식", "sub": "엑셀이 걸어온 길",
 "accent": "#F5C542", "bgm": "음악.mp3", "bgm_volume": 0.35,
 "scenes": [
  {"board": {"big": "1985", "cap": "엑셀 탄생 · 맥킨토시용", "icon": "grid"}, "say": "천구백팔십오년, …", "voice": "voice/W01.wav"},
  …
 ]
}
board.icon: grid(표) · gear(매크로) · search(찾기) · chat(AI 대화) · window(윈도우) · hello(인사) · star(구독)
voice 가 있으면 장면 길이 = 목소리 길이 + 0.5초, 입은 목소리 크기(RMS)에 맞춰 벌어진다. 없으면 "dur" 초 · 가짜 입 모양.
화면 아래 22% 는 쇼츠 버튼 자리라 비운다."""
from __future__ import annotations

import json
import math
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 1080, 1920, 30
FONTS = Path(__file__).resolve().parent.parent / "assets" / "fonts"
F = lambda k, s: ImageFont.truetype(str(FONTS / f"Pretendard-{k}.otf"), s)  # noqa: E731
PEN = lambda s: ImageFont.truetype(str(FONTS / "NanumPenScript-Regular.ttf"), s)  # noqa: E731
INK = (34, 28, 26)
CREAM = (250, 240, 214)
BG = (246, 196, 64)
FUR, FUR_D, PINK = (240, 168, 86), (204, 122, 52), (244, 150, 150)
NAVY, RED, WHITE = (32, 46, 84), (214, 52, 46), (255, 255, 255)


def rgb(h):
    h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def clamp(v, a=0.0, b=1.0):
    return max(a, min(b, v))


def ease(t):
    t = clamp(t); return 1 - (1 - t) ** 3


def back(t):
    t = clamp(t); c = 1.7; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2


def probe(p):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                                capture_output=True, text=True).stdout)


def envelope(p):
    """목소리 크기(0~1)를 프레임마다"""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True).stdout
    a = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    hop = 16000 // FPS
    e = np.array([np.sqrt((a[i:i + hop] ** 2).mean() + 1e-12) for i in range(0, len(a), hop)])
    e = np.clip((20 * np.log10(e + 1e-9) + 42) / 26, 0, 1)            # -42dB → 0, -16dB → 1
    return np.convolve(e, [0.25, 0.5, 0.25], mode="same")


# ── 배경: 만화풍 노란 집중선 ──
def background(acc):
    im = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(im)
    cx, cy = W / 2, 760
    for i in range(48):
        a0 = i / 48 * 2 * math.pi; a1 = a0 + math.pi / 48 * 0.55
        d.polygon([(cx, cy), (cx + 2400 * math.cos(a0), cy + 2400 * math.sin(a0)), (cx + 2400 * math.cos(a1), cy + 2400 * math.sin(a1))],
                  fill=(250, 210, 90))
    for y in range(0, H, 22):                                   # 망점
        for x in range((y // 22) % 2 * 11, W, 22):
            if (x - cx) ** 2 + (y - cy) ** 2 > 640 ** 2:
                d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=(236, 168, 52))
    return im


# ── 냥이 선생 (2배로 그려 줄인다) ──
def draw_cat(mouth: float, blink: float, arm: float, tail: float) -> Image.Image:
    S = 2; w, h = 620 * S, 700 * S
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    o = 7 * S
    P = lambda *xy: [v * S for v in xy]  # noqa: E731
    # 꼬리
    tx = 470 + 40 * tail
    d.line(P(400, 610, 470, 560, tx, 470, tx + 20, 400), fill=INK, width=44 * S, joint="curve")
    d.line(P(400, 610, 470, 560, tx, 470, tx + 20, 400), fill=FUR, width=30 * S, joint="curve")
    # 몸(조끼)
    d.rounded_rectangle(P(150, 430, 450, 720), 90 * S, fill=NAVY, outline=INK, width=o)
    d.polygon(P(250, 432, 350, 432, 300, 560), fill=WHITE, outline=INK, width=o // 2)
    for by in (585, 640):
        d.ellipse(P(288, by, 312, by + 24), fill=(240, 196, 60), outline=INK, width=3 * S)
    # 나비넥타이
    d.polygon(P(300, 455, 245, 425, 245, 485), fill=RED, outline=INK, width=4 * S)
    d.polygon(P(300, 455, 355, 425, 355, 485), fill=RED, outline=INK, width=4 * S)
    d.ellipse(P(286, 441, 314, 469), fill=RED, outline=INK, width=4 * S)
    # 귀
    for sx in (1, -1):
        bx = 300 + sx * 150
        d.polygon(P(bx - 70 * sx, 150, bx + 30 * sx, 20, bx + 60 * sx, 170), fill=FUR, outline=INK, width=o)
        d.polygon(P(bx - 35 * sx, 140, bx + 25 * sx, 60, bx + 38 * sx, 150), fill=PINK)
    # 머리
    d.ellipse(P(80, 70, 520, 470), fill=FUR, outline=INK, width=o)
    for k, (x0, x1) in enumerate(((250, 270), (290, 310), (330, 350))):
        d.polygon(P(x0, 82, x1, 82, (x0 + x1) / 2 + 2, 150 - 15 * (k == 1)), fill=FUR_D)
    for sx in (1, -1):
        d.line(P(300 + sx * 205, 250, 300 + sx * 160, 262), fill=FUR_D, width=12 * S)
        d.line(P(300 + sx * 210, 300, 300 + sx * 165, 302), fill=FUR_D, width=12 * S)
    # 주둥이
    d.ellipse(P(200, 290, 400, 440), fill=(255, 244, 228))
    # 눈 + 안경
    for sx in (1, -1):
        ex = 300 + sx * 95
        if blink > 0.5:
            d.arc(P(ex - 38, 220, ex + 38, 270), 200, 340, fill=INK, width=8 * S)
        else:
            d.ellipse(P(ex - 40, 195, ex + 40, 285), fill=WHITE, outline=INK, width=5 * S)
            d.ellipse(P(ex - 22, 215, ex + 22, 268), fill=INK)
            d.ellipse(P(ex - 12, 222, ex + 2, 238), fill=WHITE)
        d.ellipse(P(ex - 66, 172, ex + 66, 304), outline=INK, width=9 * S)
    d.line(P(258, 232, 342, 232), fill=INK, width=9 * S)
    # 코 · 볼
    d.polygon(P(282, 312, 318, 312, 300, 334), fill=PINK, outline=INK, width=3 * S)
    for sx in (1, -1):
        d.ellipse(P(300 + sx * 150 - 30, 330, 300 + sx * 150 + 30, 362), fill=(250, 170, 150))
    # 입: 0 = «w», 1 = 크게 벌림
    if mouth < 0.12:
        d.arc(P(262, 322, 302, 362), 10, 170, fill=INK, width=6 * S)
        d.arc(P(298, 322, 338, 362), 10, 170, fill=INK, width=6 * S)
    else:
        mh = 20 + 70 * mouth; mw = 50 + 26 * mouth
        d.ellipse(P(300 - mw, 342, 300 + mw, 342 + mh), fill=(120, 30, 40), outline=INK, width=5 * S)
        d.ellipse(P(300 - mw * 0.6, 342 + mh * 0.45, 300 + mw * 0.6, 342 + mh * 0.98), fill=(240, 110, 120))
    # 수염
    for sx in (1, -1):
        for k in (-1, 0, 1):
            d.line(P(300 + sx * 90, 340 + k * 12, 300 + sx * 200, 325 + k * 26), fill=INK, width=3 * S)
    # 팔 + 지시봉 (어깨에서 위로 흔든다)
    ang = math.radians(-60 - 25 * arm)
    sx0, sy0 = 430, 500
    hx, hy = sx0 + 120 * math.cos(ang) * 0.6 + 40, sy0 + 120 * math.sin(ang)
    d.line(P(sx0, sy0, hx, hy), fill=INK, width=60 * S)
    d.line(P(sx0, sy0, hx, hy), fill=NAVY, width=46 * S)
    px, py = hx + 230 * math.cos(ang - 0.2), hy + 230 * math.sin(ang - 0.2)
    d.line(P(hx, hy, px, py), fill=(120, 72, 36), width=12 * S)
    d.ellipse(P(px - 10, py - 10, px + 10, py + 10), fill=WHITE, outline=INK, width=3 * S)
    d.ellipse(P(hx - 34, hy - 34, hx + 34, hy + 34), fill=FUR, outline=INK, width=o)
    return im.resize((w // S, h // S), Image.LANCZOS)


# ── 칠판 아이콘 ──
def icon(d, kind, cx, cy, s, acc, k):
    a = int(255 * k)
    if kind == "grid":
        x0, y0 = cx - s, cy - s * 0.75
        d.rounded_rectangle((x0, y0, cx + s, cy + s * 0.75), 14, fill=(255, 255, 255, a), outline=INK + (a,), width=6)
        d.rectangle((x0, y0, cx + s, y0 + s * 0.3), fill=(46, 140, 80, a))
        for i in range(1, 4):
            d.line((x0 + i * s / 2, y0, x0 + i * s / 2, cy + s * 0.75), fill=INK + (a,), width=3)
        for j in range(1, 5):
            d.line((x0, y0 + j * s * 0.3, cx + s, y0 + j * s * 0.3), fill=INK + (a,), width=3)
    elif kind == "window":
        for i, c in enumerate(((242, 80, 34), (127, 186, 0), (0, 164, 239), (255, 185, 0))):
            x = cx - s * 0.75 + (i % 2) * s * 0.78; y = cy - s * 0.75 + (i // 2) * s * 0.78
            d.rectangle((x, y, x + s * 0.72, y + s * 0.72), fill=c + (a,))
    elif kind == "gear":
        for i in range(8):
            t = i / 8 * 2 * math.pi
            d.rounded_rectangle((cx + s * 0.78 * math.cos(t) - 22, cy + s * 0.78 * math.sin(t) - 22,
                                 cx + s * 0.78 * math.cos(t) + 22, cy + s * 0.78 * math.sin(t) + 22), 6, fill=INK + (a,))
        d.ellipse((cx - s * 0.75, cy - s * 0.75, cx + s * 0.75, cy + s * 0.75), fill=INK + (a,))
        d.ellipse((cx - s * 0.3, cy - s * 0.3, cx + s * 0.3, cy + s * 0.3), fill=acc + (a,))
    elif kind == "search":
        d.ellipse((cx - s * 0.75, cy - s * 0.75, cx + s * 0.35, cy + s * 0.35), outline=INK + (a,), width=22)
        d.line((cx + s * 0.25, cy + s * 0.25, cx + s * 0.85, cy + s * 0.85), fill=INK + (a,), width=34)
    elif kind == "chat":
        d.rounded_rectangle((cx - s, cy - s * 0.7, cx + s, cy + s * 0.5), 40, fill=acc + (a,), outline=INK + (a,), width=6)
        d.polygon([(cx - s * 0.5, cy + s * 0.45), (cx - s * 0.75, cy + s * 0.95), (cx - s * 0.1, cy + s * 0.45)], fill=acc + (a,))
        f = F("Black", int(s * 0.6)); tw = f.getlength("AI")
        d.text((cx - tw / 2, cy - s * 0.55), "AI", font=f, fill=INK + (a,))
    elif kind == "star":
        pts = [(cx + s * (1 if i % 2 == 0 else 0.45) * math.cos(-math.pi / 2 + i * math.pi / 5),
                cy + s * (1 if i % 2 == 0 else 0.45) * math.sin(-math.pi / 2 + i * math.pi / 5)) for i in range(10)]
        d.polygon(pts, fill=acc + (a,), outline=INK + (a,))
    elif kind == "hello":
        f = PEN(int(s * 1.5)); tw = f.getlength("Hi!")
        d.text((cx - tw / 2, cy - s * 0.9), "Hi!", font=f, fill=INK + (a,))


def board(img, sc, t, acc):
    d = ImageDraw.Draw(img, "RGBA")
    k = ease(t / 0.35)
    x0, y0, x1, y1 = 70, 300, 1010, 900
    d.rounded_rectangle((x0 + 12, y0 + 16, x1 + 12, y1 + 16), 36, fill=(0, 0, 0, 70))
    d.rounded_rectangle((x0, y0, x1, y1), 36, fill=CREAM, outline=INK, width=8)
    for gx in range(x0 + 40, x1, 46):
        d.line((gx, y0 + 20, gx, y1 - 20), fill=(232, 220, 190), width=2)
    for gy in range(y0 + 40, y1, 46):
        d.line((x0 + 20, gy, x1 - 20, gy), fill=(232, 220, 190), width=2)
    b = sc.get("board", {})
    kb = back((t - 0.15) / 0.45)
    if b.get("big"):
        f = F("Black", 190); tw = f.getlength(b["big"])
        lay = Image.new("RGBA", (int(tw) + 40, 240), (0, 0, 0, 0)); ld = ImageDraw.Draw(lay)
        ld.text((20, 0), b["big"], font=f, fill=INK)
        s_ = max(0.01, 0.6 + 0.4 * kb); lay = lay.resize((max(1, int(lay.width * s_)), max(1, int(lay.height * s_))), Image.LANCZOS)
        lay.putalpha(lay.getchannel("A").point(lambda v: int(v * clamp(kb))))
        img.alpha_composite(lay, (int(x0 + 70), int(y0 + 60 + (240 - lay.height) / 2)))
    if b.get("icon"):
        icon(d, b["icon"], x1 - 200, y0 + 190, 120, acc, clamp(kb))
    if b.get("cap"):
        kc = ease((t - 0.45) / 0.35)
        f = F("Black", 64)
        lines = b["cap"].split("\n")
        for i, ln in enumerate(lines):
            yy = y0 + 360 + i * 90 + int((1 - kc) * 20)
            tw = f.getlength(ln)
            d.rounded_rectangle((x0 + 60, yy - 6, x0 + 100 + tw, yy + 82), 16, fill=acc + (int(255 * kc),))
            d.text((x0 + 80, yy), ln, font=f, fill=INK + (int(255 * kc),))


def bubble(img, text, t):
    d = ImageDraw.Draw(img, "RGBA")
    k = ease(t / 0.25)
    if k <= 0:
        return
    f = F("Bold", 50)
    words, lines, cur = text.split(" "), [], ""
    for w in words:
        tt = (cur + " " + w).strip()
        if cur and f.getlength(tt) > 470:
            lines.append(cur); cur = w
        else:
            cur = tt
    lines.append(cur)
    lines = lines[:5]
    x0, y0 = 500, 960; x1 = 1030; y1 = y0 + 60 + len(lines) * 68
    a = int(255 * k)
    d.rounded_rectangle((x0, y0, x1, y1), 34, fill=(255, 255, 255, a), outline=INK + (a,), width=6)
    d.polygon([(x0 + 4, y0 + 70), (x0 - 54, y0 + 120), (x0 + 4, y0 + 120)], fill=(255, 255, 255, a), outline=INK + (a,))
    d.line((x0 + 4, y0 + 74, x0 + 4, y0 + 116), fill=(255, 255, 255, a), width=8)
    for i, ln in enumerate(lines):
        d.text((x0 + 34, y0 + 30 + i * 68), ln, font=f, fill=INK + (a,))


def main(spec_path):
    sp = json.load(open(spec_path, encoding="utf-8")); root = Path(spec_path).resolve().parent
    acc = rgb(sp.get("accent", "#F5C542"))
    bg = background(acc)
    dt = ImageDraw.Draw(bg)
    dt.rounded_rectangle((60, 120, 60 + F("Black", 44).getlength(sp.get("title", "")) + 60, 190), 35, fill=INK)
    dt.text((90, 128), sp.get("title", ""), font=F("Black", 44), fill=acc)
    dt.text((64, 205), sp.get("sub", ""), font=F("Black", 62), fill=INK)
    scenes = []
    for sc in sp["scenes"]:
        if sc.get("voice"):
            vp = root / sc["voice"]; dur = probe(vp) + 0.55; env = envelope(vp)
        else:
            dur = float(sc.get("dur", 4)); n = int(dur * FPS)
            env = np.clip(0.55 + 0.45 * np.sin(np.arange(n) * 1.9) * (np.arange(n) < n - 12), 0, 1)
        scenes.append((sc, dur, env))
    total = sum(s[1] for s in scenes)
    out = root / sp["out"]; silent = out.with_name(out.stem + "_무음.mp4")
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
                            "-i", "-", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", str(silent)],
                           stdin=subprocess.PIPE)
    lead = 0.15
    gt = 0.0
    for si, (sc, dur, env) in enumerate(scenes):
        for fi in range(int(dur * FPS)):
            t = fi / FPS; g = gt + t
            img = bg.convert("RGBA")
            board(img, sc, t, acc)
            ei = int((t - lead) * FPS)
            m = float(env[ei]) if 0 <= ei < len(env) else 0.0
            blink = 1.0 if (g % 3.1) < 0.12 else 0.0
            arm = math.sin(g * 2.2) * 0.5 + 0.5 * m
            cat = draw_cat(m, blink, arm, math.sin(g * 1.6))
            bob = int(6 * math.sin(g * 3.0) - 10 * m)
            img.alpha_composite(cat, (-40, 860 + bob))
            bubble(img, sc.get("say", ""), t)
            enc.stdin.write(img.convert("RGB").tobytes())
            if si == 0 and fi == int(min(dur - 0.1, 1.6) * FPS):
                img.convert("RGB").save(out.with_name(out.stem + "_표지.jpg"), quality=92)
        gt += dur
    enc.stdin.close(); enc.wait()
    inputs, filt, tags = ["-i", str(silent)], [], []
    off = 0.0
    for k, (sc, dur, _) in enumerate(scenes):
        if sc.get("voice"):
            inputs += ["-i", str(root / sc["voice"])]
            ms = int((off + lead) * 1000)
            filt.append(f"[{len(inputs) // 2 - 1}:a]adelay={ms}|{ms},apad=whole_dur={total}[v{k}]"); tags.append(f"[v{k}]")
        off += dur
    if sp.get("bgm"):
        inputs += ["-i", str(root / sp["bgm"])]
        bi = len(inputs) // 2 - 1
        filt.append(f"[{bi}:a]atrim=0:{total},volume={sp.get('bgm_volume', 0.35)},afade=t=out:st={total - 1}:d=1,apad=whole_dur={total}[bg]")
        if tags:
            filt.append(f"{''.join(tags)}amix=inputs={len(tags)}:normalize=0[vo]")
            filt.append("[bg][vo]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=300[bgd]")
            filt.append("[bgd][vo]amix=inputs=2:normalize=0[a]")
        else:
            filt.append("[bg]anull[a]")
    elif tags:
        filt.append(f"{''.join(tags)}amix=inputs={len(tags)}:normalize=0[a]")
    if filt:
        subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(filt), "-map", "0:v", "-map", "[a]",
                        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", f"{total:.2f}", str(out)], check=True)
        silent.unlink()
    else:
        silent.rename(out)
    print("DONE", out, round(total, 1))


if __name__ == "__main__":
    main(sys.argv[1])
