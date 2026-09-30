"""7기 모집 스케치형 쇼츠(9:16) — 음악 + 몽타주, 내레이션 없음 (sketch.py 의 세로판, 약 50초).
  검색창 타이핑 → 몽타주(우상단 로고, 짧은 자막) → 2×2 분할 → 정보 카드 → 키비주얼 엔딩.
사용: cd yt-studio/pipeline && python jobs/7기홍보/sketch_shorts.py [bgm.mp3]   → output/스케치형_shorts.mp4"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from sketch import GOLD, M, A, _pick  # noqa: E402
from ytauto import faces, layout, media, series, shorts  # noqa: E402
from ytauto.config import load_config  # noqa: E402
from ytauto.fonts import font_set  # noqa: E402
from ytauto.render import fit_cover  # noqa: E402

ROOT = Path("projects/saga/recruit/7기홍보영상")
W = ROOT / "sketch_shorts_work"
FPS, XF = 30, 0.5
WD, HT = 1080, 1920
SAFE_TOP = 230  # 쇼츠 위 UI 아래


def _f(path: str, pt: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, pt)


def _vert(name: str) -> str:
    """세로용 s_xxx 가 있으면 그것, 없으면 가로 그림(가운데를 잘라 쓴다)."""
    for cand in (f"s{name[1:]}", name):
        try:
            return _pick(cand)
        except FileNotFoundError:
            continue
    raise FileNotFoundError(name)


def intro_search(out: Path, fonts: dict, dur: float = 2.8) -> Path:
    fdir = W / "intro"
    fdir.mkdir(parents=True, exist_ok=True)
    first, second = "일터선교", "일터선교아카데미 2027"
    n = int(dur * FPS)
    f = _f(fonts["bold"], 54)
    for i in range(n):
        t = i / FPS
        img = Image.new("RGB", (WD, HT), (6, 8, 14))
        d = ImageDraw.Draw(img)
        if t < 1.1:
            k = min(len(first), int(t / 1.1 * (len(first) + 1))); text, glow = first[:k], False
        elif t < 1.35:
            text, glow = first, False
        else:
            k = min(len(second), len(first) + int((t - 1.35) / 0.9 * (len(second) - len(first) + 1))); text, glow = second[:k], True
        tw = f.getlength(text or " ")
        pad, h = 50, 104
        bw = min(WD - 100, max(460, int(tw + pad * 2 + (120 if glow else 0))))
        x0, y0 = (WD - bw) // 2, (HT - h) // 2
        if glow:
            g = Image.new("RGBA", (WD, HT), (0, 0, 0, 0)); gd = ImageDraw.Draw(g)
            for j, col in enumerate([(240, 80, 80), (242, 193, 78), (80, 200, 120), (60, 140, 255)]):
                gd.rounded_rectangle((x0 - 6 + j, y0 - 6 + j, x0 + bw + 6 - j, y0 + h + 6 - j), h // 2 + 6, outline=col + (200,), width=3)
            img.paste(g.filter(ImageFilter.GaussianBlur(4)), (0, 0), g.filter(ImageFilter.GaussianBlur(4)))
        d.rounded_rectangle((x0, y0, x0 + bw, y0 + h), h // 2, fill=(40, 40, 46), outline=(90, 90, 98), width=2)
        d.text((x0 + pad, y0 + h / 2), text, font=f, fill=(245, 245, 245), anchor="lm")
        if int(t * 2.5) % 2 == 0:
            cx = x0 + pad + tw + 6
            d.rectangle((cx, y0 + 26, cx + 4, y0 + h - 26), fill=(245, 245, 245))
        if glow:
            mx, my = x0 + bw - pad - 6, y0 + h // 2
            d.ellipse((mx - 18, my - 18, mx + 10, my + 10), outline=(245, 245, 245), width=5)
            d.line((mx + 7, my + 7, mx + 22, my + 22), fill=(245, 245, 245), width=6)
        img.save(fdir / f"f{i:04d}.png")
    media.run(["-framerate", str(FPS), "-i", str(fdir / "f%04d.png"), "-f", "lavfi", "-t", f"{dur:.2f}", "-i",
               "anullsrc=r=48000:cl=stereo", "-shortest", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", str(out)])
    return out


def collage(out: Path, names: list[str]) -> Path:
    gap = 12
    cw, ch = (WD - gap) // 2, (HT - gap) // 2
    base = Image.new("RGB", (WD, HT), (10, 20, 45))
    for i, n in enumerate(names[:4]):
        base.paste(fit_cover(Image.open(_pick(n)).convert("RGB"), (cw, ch)), ((i % 2) * (cw + gap), (i // 2) * (ch + gap)))
    out.parent.mkdir(parents=True, exist_ok=True)
    base.save(out, quality=94)
    return out


def watermark(out: Path, fonts: dict) -> Path:
    img = Image.new("RGBA", (WD, HT), (0, 0, 0, 0))
    logo = Image.open(A / "saga_logo_w.png").convert("RGBA")
    lw = 210
    logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
    logo.putalpha(logo.split()[3].point(lambda v: int(v * 0.85)))
    x, y = WD - lw - 36, SAFE_TOP
    sh = Image.new("RGBA", (WD, HT), (0, 0, 0, 0))
    sh.paste((0, 0, 0, 140), (x, y), logo.split()[3])
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(6)), (2, 3))
    img.alpha_composite(logo, (x, y))
    d = ImageDraw.Draw(img)
    f = _f(fonts["bold"], 22)
    label = "2027 일터선교 & 글로벌네트워크아카데미"
    d.text((WD - 36 + 1, y + logo.height + 10 + 1), label, font=f, fill=(0, 0, 0, 150), anchor="ra")
    d.text((WD - 36, y + logo.height + 10), label, font=f, fill=GOLD + (235,), anchor="ra")
    img.save(out)
    return out


def end_card(out: Path, fonts: dict, bg_frame: Path) -> Path:
    base = fit_cover(Image.open(bg_frame).convert("RGB"), (WD, HT)).filter(ImageFilter.GaussianBlur(1.5))
    g = Image.linear_gradient("L").resize((WD, HT)).point(lambda v: int(max(0, 255 - v * 1.25)))
    base = Image.composite(Image.new("RGB", (WD, HT), (10, 22, 50)), base, g).convert("RGBA")
    logo = Image.open(A / "saga_logo_w.png").convert("RGBA")
    lw = 300
    logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
    base.alpha_composite(logo, ((WD - lw) // 2, 400))
    d = ImageDraw.Draw(base)
    cx = WD / 2
    d.text((cx, 500), "SCHOOL OF MARKETPLACE MISSION & GLOBAL NETWORK", font=_f(fonts["bold"], 24), fill=(200, 210, 230), anchor="ma")
    tf = _f(fonts["title"], 150)
    d.text((cx + 4, 560 + 6), "2027", font=tf, fill=(0, 0, 0, 120), anchor="ma")
    d.text((cx, 560), "2027", font=tf, fill=GOLD, anchor="ma")
    t2 = _f(fonts["title"], 66)
    for k, ln in enumerate(["일터선교 &", "글로벌네트워크아카데미"]):
        y = 730 + k * 84
        d.text((cx + 3, y + 5), ln, font=t2, fill=(0, 0, 0, 130), anchor="ma")
        d.text((cx, y), ln, font=t2, fill=(255, 255, 255), anchor="ma")
    d.text((cx, 920), "100만 일터 선교사 양성을 꿈꾸는", font=_f(fonts["hand"], 50), fill=GOLD, anchor="ma")
    d.text((cx, 980), "사랑글로벌아카데미 SaGA", font=_f(fonts["hand"], 50), fill=GOLD, anchor="ma")
    sf = _f(fonts["bold"], 34)
    lines = [("원서 접수  10.1 ~ 11.30  (전형료 면제)", (255, 255, 255)), ("2차 12.1 ~ 12.31  ·  면접 1.9  ·  개강 2.16", (255, 255, 255)),
             ("매주 화 저녁 7~10시  |  토 오전 9~12시", (255, 255, 255)), ("saga121.com  ·  카카오톡 ‘사랑글로벌아카데미’", GOLD), ("02-3495-8300", GOLD)]
    y = 1110
    for ln, col in lines:
        d.text((cx + 2, y + 2), ln, font=sf, fill=(0, 0, 0, 140), anchor="ma")
        d.text((cx, y), ln, font=sf, fill=col, anchor="ma")
        y += 56
    base.convert("RGB").save(out, quality=94)
    return out


def scenes(fonts: dict, theme: dict) -> list[dict]:
    C = lambda name, text, sub="", dur=4.0: {"kind": "card", "src": str(layout.card(W / f"card_{name}", "shorts", fonts, text, theme, sub)), "dur": dur}
    return [
        {"kind": "clip", "src": _pick("v_seoul_dawn_crop"), "dur": 5.0, "cap": "월요일 아침, 서울"},
        {"kind": "still", "src": _vert("i_commute"), "dur": 4.0, "cap": "주일의 믿음은,\n월요일에도 살아 있습니까?"},
        {"kind": "still", "src": _vert("i_desk_bible"), "dur": 4.0, "cap": "일은 저주가 아니라,\n창조 때부터 있던 축복입니다"},
        {"kind": "clip", "src": _pick("v_hands_work"), "dur": 5.0, "cap": "당신의 책상은\n이미 선교지입니다"},
        C("title", "2027\n일터선교 &\n글로벌네트워크아카데미", "사랑글로벌아카데미 SaGA", 3.5),
        {"kind": "still", "src": str(collage(W / "collage1.jpg", ["i_shop", "i_clinic", "i_whiteboard", "i_globe"])), "dur": 4.0,
         "cap": "기업가 · 직장인 · 공무원\n자영업자 · 크리스천 청년"},
        {"kind": "clip", "src": _pick("v_seminar"), "dur": 5.0, "cap": "1년 3학기\n직장을 그만두지 않고 배웁니다"},
        {"kind": "still", "src": _vert("i_globe"), "dur": 4.0, "cap": "온전론 → 일터신학 → 영역별 선교전략"},
        C("when", "매주 화 저녁 7~10시\n토 오전 9~12시", "강남캠퍼스 & 전국 5개 권역  ·  230명"),
        C("fee", "등록금  학기당 *125만원*", "거점캠퍼스 · 목회자 · 선교사 · 30대 청년 75만원"),
        C("apply", "원서 접수\n*10.1 ~ 11.30*", "전형료 면제  ·  면접 2027.1.9  ·  개강 2.16"),
    ]


def build(bgm: str) -> Path:
    cfg = load_config(None)
    fonts = font_set(cfg)
    theme = series.get("recruit")["theme"]
    W.mkdir(parents=True, exist_ok=True)
    parts, caps, t = [], [], 0.0
    intro = intro_search(W / "intro.mp4", fonts)
    intro_d = media.duration(str(intro))
    parts.append(shorts.piece(W / "p00.mp4", "shorts", str(intro), intro_d + XF, zoom=False))
    t += intro_d
    sc = scenes(fonts, theme)
    bgf = W / "end_bg.jpg"
    media.run(["-ss", "6", "-i", _pick("v_seoul_dawn"), "-frames:v", "1", "-q:v", "2", str(bgf)])
    sc.append({"kind": "card", "src": str(end_card(W / "end_card.jpg", fonts, bgf)), "dur": 6.0})
    body_start = t
    for i, s in enumerate(sc, 1):
        last = i == len(sc)
        d = s["dur"] + (0 if last else XF)
        parts.append(shorts.piece(W / f"p{i:02d}.mp4", "shorts", s["src"], d, fit="cover", zoom=(s["kind"] == "still")))
        if s.get("cap"):
            caps.append((t + 0.4, t + s["dur"] - 0.3, s["cap"]))
        t += s["dur"]
    body_end = t - 6.0
    base = shorts.join_xfade(parts, W / "base.mp4", XF)
    ov = [(watermark(W / "wm.png", fonts), body_start, body_end)]
    ov += faces.safe_captions(str(base), caps, "shorts", fonts, "outline", W / "captions")
    out = ROOT / "output" / "스케치형_shorts.mp4"
    shorts.finish(base, out, ov, bgm=bgm, bgm_volume=0.9, duck=False, fade=0.35, rise=12)
    print("total", round(media.duration(str(out)), 1), flush=True)
    return out


if __name__ == "__main__":
    bgm = sys.argv[1] if len(sys.argv) > 1 else str(A / "suno_hopeful_ascension.mp3")
    print("DONE", build(bgm), flush=True)
