"""한 줄의 선 (코스 C01) — 크림 종이 위 파란 펜 한 줄이 끊기지 않고 이어지며 정거장마다 그림을 그리고 손글씨를 쓴다.
카메라는 펜 끝을 따라 내려간다(9:16). 아이디어 한 줄이 영상 한 편이 되는 길, 단계 설명에 맞다.
사용: python oneline.py spec.json
spec.json:
{
 "out": "한줄의선.mp4", "dur": 26,
 "title": ["영상 한 편이", "쇼츠 10개가 되는 길"],
 "stations": [ {"icon": "phone", "text": "찍기만 하세요"}, … ],   // icon: phone · wave · star · bubble · phones · bulb · check · heart
 "sign": "오토샘", "sign_sub": "영상 자동화 공장",
 "bgm": "음악.mp3", "bgm_volume": 0.25,
 "ink": [31, 79, 184], "paper": [244, 238, 223]
}"""
from __future__ import annotations

import math
import random
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from common import FONTS, FPS, ff, load

W, H = 1080, 1920
PEN = ImageFont.truetype(str(FONTS / "NanumPenScript-Regular.ttf"), 172)
PEN_S = ImageFont.truetype(str(FONTS / "NanumPenScript-Regular.ttf"), 112)
GAP = 1180         # 정거장 사이 세로 간격
SCALE = 1.5        # 아이콘 크기 배율
TOP = 760          # 첫 정거장 y


# ───────── 아이콘(한 붓 선, 중심 기준 ±150 상자) ─────────
def circle(cx, cy, r, a0=0.0, turns=1.0, n=48):
    return [(cx + r * math.cos(a0 + 2 * math.pi * turns * i / n), cy + r * math.sin(a0 + 2 * math.pi * turns * i / n)) for i in range(n + 1)]


def rrect(x0, y0, x1, y1, r, n=8):
    """둥근 사각형 — 위쪽 가운데에서 시작해 시계 방향으로 한 바퀴"""
    pts = [((x0 + x1) / 2, y0)]
    for cx, cy, a in ((x1 - r, y0 + r, -90), (x1 - r, y1 - r, 0), (x0 + r, y1 - r, 90), (x0 + r, y0 + r, 180)):
        for i in range(n + 1):
            t = math.radians(a + 90 * i / n); pts.append((cx + r * math.cos(t), cy + r * math.sin(t)))
    pts.append(pts[0])
    return pts


def icon(name: str, cx: float, cy: float) -> list[tuple[float, float]]:
    return [(cx + (x - cx) * SCALE, cy + (y - cy) * SCALE) for x, y in _icon(name, cx, cy)]


def _icon(name: str, cx: float, cy: float) -> list[tuple[float, float]]:
    if name == "phone":
        return rrect(cx - 85, cy - 150, cx + 85, cy + 150, 26) + rrect(cx - 62, cy - 118, cx + 62, cy + 92, 8, n=3)
    if name == "wave":
        pts = [(cx - 160, cy - 60)]
        for i in range(17):
            amp = [10, 40, 80, 30, 95, 55, 20, 70, 100, 45, 85, 25, 60, 90, 35, 15, 0][i]
            pts.append((cx - 150 + i * 19, cy - 60 + (amp if i % 2 else -amp)))
        pts += [(cx + 160, cy - 60), (cx + 160, cy + 50), (cx - 150, cy + 50), (cx - 150, cy + 95), (cx + 120, cy + 95), (cx + 120, cy + 140), (cx - 150, cy + 140)]
        return pts
    if name == "star":
        pts = []
        for i in range(11):
            r = 150 if i % 2 == 0 else 62; a = -math.pi / 2 + i * math.pi / 5
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
        return pts
    if name == "bubble":   # 위 가운데 → 오른쪽 → 아래(꼬리) → 왼쪽 → 위 → 안쪽 두 줄
        b = rrect(cx - 160, cy - 110, cx + 160, cy + 70, 40)
        k = next(i for i, q in enumerate(b) if q[1] >= cy + 69 and q[0] < cx)   # 아래 변 왼쪽 시작점
        body = b[:k] + [(cx - 30, cy + 70), (cx - 80, cy + 140), (cx - 90, cy + 70)] + b[k:]
        return body + [(cx - 110, cy - 30), (cx + 110, cy - 30)]
    if name == "phones":
        pts = []
        for row in range(2):   # 첫 줄은 왼→오, 둘째 줄은 오→왼(뱀 모양) — 사선이 가로지르지 않게
            cols = range(5) if row == 0 else range(4, -1, -1)
            for col in cols:
                x0 = cx - 175 + col * 72; y0 = cy - 140 + row * 160
                pts += rrect(x0, y0, x0 + 52, y0 + 110, 10, n=3)
        return pts
    if name == "bulb":
        return circle(cx, cy - 30, 100, math.pi * 0.75, 0.75) + [(cx + 40, cy + 70), (cx + 40, cy + 120), (cx - 40, cy + 120), (cx - 40, cy + 70), (cx - 40, cy + 145), (cx + 40, cy + 145)]
    if name == "check":
        return circle(cx, cy, 140, -math.pi / 2) + [(cx - 70, cy), (cx - 15, cy + 60), (cx + 85, cy - 65)]
    if name == "heart":
        pts = []
        for i in range(61):
            t = math.pi * 2 * i / 60
            pts.append((cx + 9 * 16 * math.sin(t) ** 3, cy - 9 * (13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)) - 20))
        return pts
    return circle(cx, cy, 120)


def curve(p0, p1, bend: float):
    """두 점 사이 S자 연결선"""
    (x0, y0), (x1, y1) = p0, p1
    dy = y1 - y0   # 위아래로 내려가는 S자(가로로 길게 긋는 사선 대신)
    c1 = (x0 + bend * 0.25, y0 + dy * 0.55); c2 = (x1 - bend * 0.25, y1 - dy * 0.55)
    out = []
    for i in range(1, 41):
        t = i / 40; u = 1 - t
        out.append((u ** 3 * x0 + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t ** 3 * x1,
                    u ** 3 * y0 + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t ** 3 * y1))
    return out


def text_img(s: str, font, ink) -> Image.Image:
    w = int(font.getlength(s)) + 30; h = font.size + 40
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); ImageDraw.Draw(im).text((10, 6), s, font=font, fill=tuple(ink) + (255,))
    return im


def paper(h: int, color) -> Image.Image:
    rnd = random.Random(3)
    base = Image.new("RGB", (W, h), tuple(color))
    noise = Image.effect_noise((W // 2, h // 2), 18).resize((W, h)).filter(ImageFilter.GaussianBlur(1.2))
    base = Image.blend(base, Image.merge("RGB", (noise, noise, noise)).point(lambda v: min(255, v + 150)), 0.06)
    d = ImageDraw.Draw(base)
    for _ in range(60):  # 종이 섬유
        x, y = rnd.randint(0, W), rnd.randint(0, h); l = rnd.randint(8, 30)
        d.line([(x, y), (x + l, y + rnd.randint(-3, 3))], fill=(225, 216, 196), width=1)
    return base


def main(spec_path: str) -> Path:
    sp = load(spec_path)
    root = Path(spec_path).resolve().parent
    P = lambda p: str((root / p).resolve()) if not Path(p).is_absolute() else p  # noqa: E731
    out = Path(P(sp["out"])); ink = tuple(sp.get("ink", [31, 79, 184]))
    stations = sp["stations"]
    # ── 길 만들기: 제목 밑줄 → 정거장들(좌우 번갈아) → 서명
    ops = []      # ("line", pts) / ("text", img, (x, y))
    tl = [text_img(s, PEN, ink) for s in sp.get("title", [])]
    y = 260
    for im in tl:
        ops.append(("text", im, ((W - im.width) // 2, int(y)))); y += im.height - 10
    pen = (W * 0.18, y + 30)
    ops.append(("line", [pen, (W * 0.82, y + 22)])); pen = (W * 0.82, y + 22)
    cy = max(TOP, y + 150 * SCALE + 200)
    for i, st in enumerate(stations):
        cx = W * (0.36 if i % 2 == 0 else 0.64)
        ico = icon(st["icon"], cx, cy)
        ops.append(("line", curve(pen, ico[0], 200 if i % 2 else -200)))
        ops.append(("line", ico)); pen = ico[-1]
        t_im = text_img(st["text"], PEN_S, ink)
        tx = max(30, min(W - t_im.width - 30, int(W / 2 - t_im.width / 2)))
        ty = int(cy + 150 * SCALE + 40)
        tx, ty = int(tx), int(ty)
        ops.append(("text", t_im, (tx, ty)))
        pen = (tx + t_im.width - 10, ty + t_im.height * 0.75)   # 글씨 끝에서 다음 선 출발
        cy += GAP
    sign = text_img(sp.get("sign", ""), ImageFont.truetype(str(FONTS / "NanumPenScript-Regular.ttf"), 150), ink) if sp.get("sign") else None
    end_y = int(cy - GAP + 150 * SCALE + 380)
    if sign:
        sx = (W - sign.width) // 2
        ops.append(("line", curve(pen, (sx - 20, end_y + sign.height * 0.7), -200)))
        ops.append(("text", sign, (sx, end_y)))
        loop = [(sx - 20, end_y + sign.height * 0.78)] + [(sx + sign.width * t, end_y + sign.height * 0.86 + 18 * math.sin(t * math.pi * 2)) for t in [i / 30 for i in range(31)]]
        ops.append(("line", loop))
        if sp.get("sign_sub"):
            sub = text_img(sp["sign_sub"], PEN_S, ink); ops.append(("text", sub, ((W - sub.width) // 2, end_y + sign.height + 30)))
    canvas_h = int(end_y + H * 0.58)   # 끝에 서명이 화면 가운데쯤 오게
    # ── 시간 배분: 선은 길이에 비례, 글자는 폭에 비례, 끝에 1.6초 머묾
    total = float(sp.get("dur", 26)); hold = 1.6
    def seg_len(pts):
        return sum(math.dist(a, b) for a, b in zip(pts, pts[1:]))
    weights = [seg_len(o[1]) / 900 if o[0] == "line" else o[1].width / 520 + 0.25 for o in ops]
    scale = (total - hold - 0.4) / sum(weights)
    starts, t = [], 0.4
    for wgt in weights:
        starts.append(t); t += wgt * scale
    ends = starts[1:] + [t]
    # ── 그리기
    pap = paper(canvas_h, sp.get("paper", [244, 238, 223]))
    inkL = Image.new("RGBA", (W, canvas_h), (0, 0, 0, 0)); d = ImageDraw.Draw(inkL)
    rnd = random.Random(7)
    done = [0.0] * len(ops)    # 각 op 의 진행(0~1) 이미 그린 만큼
    cam_y = 0.0; tip = pen
    proc = subprocess.Popen(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                             "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p",
                             str(out.with_name(out.stem + "_silent.mp4"))], stdin=subprocess.PIPE)
    n = int(total * FPS)
    for fi in range(n):
        tt = fi / FPS
        for k, o in enumerate(ops):
            p = max(0.0, min(1.0, (tt - starts[k]) / max(1e-6, ends[k] - starts[k])))
            if p <= done[k]:
                continue
            if o[0] == "line":
                pts = o[1]; L = seg_len(pts); a, b = done[k] * L, p * L; acc = 0.0
                for q0, q1 in zip(pts, pts[1:]):
                    sl = math.dist(q0, q1)
                    if acc + sl >= a and acc <= b and sl > 0:
                        u0 = max(0.0, (a - acc) / sl); u1 = min(1.0, (b - acc) / sl)
                        s0 = (q0[0] + (q1[0] - q0[0]) * u0, q0[1] + (q1[1] - q0[1]) * u0)
                        s1 = (q0[0] + (q1[0] - q0[0]) * u1, q0[1] + (q1[1] - q0[1]) * u1)
                        wdt = 7 + int(2 * math.sin(acc / 60)) + rnd.choice((0, 0, 1))
                        d.line([s0, s1], fill=ink + (255,), width=wdt); d.ellipse((s1[0] - wdt / 2, s1[1] - wdt / 2, s1[0] + wdt / 2, s1[1] + wdt / 2), fill=ink + (255,))
                        tip = s1
                    acc += sl
            else:
                im, (x, y) = o[1], o[2]
                c0, c1 = int(im.width * done[k]), int(im.width * p)
                if c1 > c0:
                    inkL.alpha_composite(im.crop((c0, 0, c1, im.height)), (x + c0, y))
                    tip = (x + c1, y + im.height * 0.6)
            done[k] = p
        target = min(max(0.0, tip[1] - H * 0.6), canvas_h - H)
        cam_y += (target - cam_y) * 0.08
        cy0 = int(cam_y)
        frame = pap.crop((0, cy0, W, cy0 + H)).convert("RGBA")
        frame.alpha_composite(inkL.crop((0, cy0, W, cy0 + H)))
        fd = ImageDraw.Draw(frame)   # 펜 끝
        px, py = tip[0], tip[1] - cy0
        if tt < total - hold:
            fd.ellipse((px - 11, py - 11, px + 11, py + 11), fill=ink + (255,))
        proc.stdin.write(frame.convert("RGB").tobytes())
        if fi % (FPS * 5) == 0:
            print(f"  {tt:5.1f}/{total:.0f}s", flush=True)
    proc.stdin.close(); proc.wait()
    silent = out.with_name(out.stem + "_silent.mp4")
    if sp.get("bgm"):
        vol = sp.get("bgm_volume", 0.25)
        ff(["-i", str(silent), "-stream_loop", "-1", "-i", P(sp["bgm"]), "-filter_complex",
            f"[1:a]volume={vol},afade=t=in:d=0.6,afade=t=out:st={total - 1.8:.2f}:d=1.8,atrim=0:{total:.2f}[a]",
            "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)])
        silent.unlink()
    else:
        silent.rename(out)
    print("DONE", out, f"{total:.1f}s", flush=True)
    return out


if __name__ == "__main__":
    main(sys.argv[1])
