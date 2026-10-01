"""7기 모집 스케치형 영상 — 내레이션 없이 음악 + 몽타주 (행사 스케치 영상 참고, 2026-09-30).
  검색창 타이핑 인트로 → 장면 몽타주(우상단 로고 워터마크, 짧은 자막) → 분할 화면 → 정보 카드 → 키비주얼 엔딩.
사용: cd yt-studio/pipeline && python jobs/7기홍보/sketch.py [bgm.wav|mp3]
  배경음악을 주지 않으면 assets/bgm_temp.wav(임시 합성곡)를 쓴다. 수노 곡이 오면 그 파일을 넘겨 다시 만든다."""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from eps import FACULTY  # noqa: E402
from ytauto import faces, layout, media, series, shorts  # noqa: E402
from ytauto.config import load_config  # noqa: E402
from ytauto.fonts import font_set  # noqa: E402
from ytauto.render import fit_cover  # noqa: E402

ROOT = Path("projects/saga/recruit/7기홍보영상")
M, A, W = ROOT / "media", ROOT / "assets", ROOT / "sketch_work"
FPS, XF = 30, 0.5
WIDTH, HEIGHT = 1920, 1080
GOLD, INK = (242, 193, 78), (14, 18, 30)


def _f(path: str, pt: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, pt)


def _pick(name: str) -> str:
    """media/i_xxx 는 png 또는 jpg 로 있을 수 있다."""
    for ext in (".png", ".jpg", ".mp4"):
        p = M / f"{name}{ext}"
        if p.exists():
            return str(p)
    raise FileNotFoundError(name)


# ── 1. 검색창 타이핑 인트로 ────────────────────────────────
def intro_search(out: Path, fonts: dict, dur: float = 3.4) -> Path:
    frames_dir = W / "intro"
    frames_dir.mkdir(parents=True, exist_ok=True)
    first, second = "일터선교", "일터선교아카데미 2027"
    n = int(dur * FPS)
    f = _f(fonts["bold"], 64)
    for i in range(n):
        t = i / FPS
        img = Image.new("RGB", (WIDTH, HEIGHT), (6, 8, 14))
        d = ImageDraw.Draw(img)
        if t < 1.4:  # 1단계: 짧은 검색어를 친다
            k = min(len(first), int(t / 1.4 * (len(first) + 1)))
            text, glow = first[:k], False
        elif t < 1.7:  # 잠깐 멈춤
            text, glow = first, False
        else:  # 2단계: 상자가 넓어지며 전체 이름을 친다
            k = min(len(second), len(first) + int((t - 1.7) / 1.1 * (len(second) - len(first) + 1)))
            text, glow = second[:k], True
        tw = f.getlength(text or " ")
        pad, h = 70, 120
        bw = max(520, int(tw + pad * 2 + (140 if glow else 0)))
        x0, y0 = (WIDTH - bw) // 2, (HEIGHT - h) // 2
        if glow:  # 무지개빛 테두리 (참고 영상의 검색창처럼)
            g = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
            gd = ImageDraw.Draw(g)
            for j, col in enumerate([(240, 80, 80), (242, 193, 78), (80, 200, 120), (60, 140, 255)]):
                gd.rounded_rectangle((x0 - 6 + j, y0 - 6 + j, x0 + bw + 6 - j, y0 + h + 6 - j), h // 2 + 6,
                                     outline=col + (200,), width=3)
            g = g.filter(ImageFilter.GaussianBlur(4))
            img.paste(g, (0, 0), g)
        d.rounded_rectangle((x0, y0, x0 + bw, y0 + h), h // 2, fill=(40, 40, 46), outline=(90, 90, 98), width=2)
        d.text((x0 + pad, y0 + h / 2), text, font=f, fill=(245, 245, 245), anchor="lm")
        if int(t * 2.5) % 2 == 0:  # 커서 깜빡임
            cx = x0 + pad + tw + 6
            d.rectangle((cx, y0 + 30, cx + 4, y0 + h - 30), fill=(245, 245, 245))
        if glow:  # 돋보기
            mx, my = x0 + bw - pad - 10, y0 + h // 2
            d.ellipse((mx - 20, my - 20, mx + 12, my + 12), outline=(245, 245, 245), width=6)
            d.line((mx + 8, my + 8, mx + 26, my + 26), fill=(245, 245, 245), width=7)
        img.save(frames_dir / f"f{i:04d}.png")
    media.run(["-framerate", str(FPS), "-i", str(frames_dir / "f%04d.png"),
               "-f", "lavfi", "-t", f"{dur:.2f}", "-i", "anullsrc=r=48000:cl=stereo",
               "-shortest", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", str(out)])
    return out


# ── 2. 분할 화면(2×2) ────────────────────────────────────
def collage(out: Path, names: list[str]) -> Path:
    gap = 14
    cw, ch = (WIDTH - gap) // 2, (HEIGHT - gap) // 2
    base = Image.new("RGB", (WIDTH, HEIGHT), (10, 20, 45))
    for i, n in enumerate(names[:4]):
        im = fit_cover(Image.open(_pick(n)).convert("RGB"), (cw, ch))
        base.paste(im, ((i % 2) * (cw + gap), (i // 2) * (ch + gap)))
    out.parent.mkdir(parents=True, exist_ok=True)
    base.save(out, quality=94)
    return out


# ── 3. 우상단 워터마크 ────────────────────────────────────
def watermark(out: Path, fonts: dict) -> Path:
    img = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    logo = Image.open(A / "saga_logo_w.png").convert("RGBA")
    lw = 300
    logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
    a = logo.split()[3].point(lambda v: int(v * 0.85))
    logo.putalpha(a)
    x, y = WIDTH - lw - 48, 40
    sh = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    sh.paste((0, 0, 0, 140), (x, y), logo.split()[3])
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(6)), (2, 3))
    img.alpha_composite(logo, (x, y))
    d = ImageDraw.Draw(img)
    f = _f(fonts["bold"], 26)
    label = "2027  일터선교 & 글로벌네트워크아카데미"
    d.text((WIDTH - 48 + 1, y + logo.height + 12 + 1), label, font=f, fill=(0, 0, 0, 150), anchor="ra")
    d.text((WIDTH - 48, y + logo.height + 12), label, font=f, fill=GOLD + (235,), anchor="ra")
    img.save(out)
    return out


# ── 4. 키비주얼 엔딩 ─────────────────────────────────────
def end_card(out: Path, fonts: dict, bg_frame: Path) -> Path:
    base = fit_cover(Image.open(bg_frame).convert("RGB"), (WIDTH, HEIGHT)).filter(ImageFilter.GaussianBlur(1.5))
    # 위쪽을 짙은 남색으로 덮어 글자 자리를 만든다 (아래 도시 야경만 남김)
    g = Image.linear_gradient("L").resize((WIDTH, HEIGHT)).point(lambda v: int(max(0, 255 - v * 1.35)))
    navy = Image.new("RGB", (WIDTH, HEIGHT), (10, 22, 50))
    base = Image.composite(navy, base, g).convert("RGBA")
    d = ImageDraw.Draw(base)
    logo = Image.open(A / "saga_logo_w.png").convert("RGBA")
    lw = 360
    logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
    base.alpha_composite(logo, ((WIDTH - lw) // 2, 120))
    d = ImageDraw.Draw(base)
    d.text((WIDTH / 2, 235), "SCHOOL OF MARKETPLACE MISSION & GLOBAL NETWORK", font=_f(fonts["bold"], 30),
           fill=(200, 210, 230), anchor="ma")
    tf = _f(fonts["title"], 120)
    d.text((WIDTH / 2 + 4, 300 + 6), "2027", font=tf, fill=(0, 0, 0, 120), anchor="ma")
    d.text((WIDTH / 2, 300), "2027", font=tf, fill=GOLD, anchor="ma")
    t2 = _f(fonts["title"], 84)
    d.text((WIDTH / 2 + 3, 430 + 5), "일터선교 & 글로벌네트워크아카데미", font=t2, fill=(0, 0, 0, 130), anchor="ma")
    d.text((WIDTH / 2, 430), "일터선교 & 글로벌네트워크아카데미", font=t2, fill=(255, 255, 255), anchor="ma")
    d.text((WIDTH / 2, 545), "100만 일터 선교사 양성을 꿈꾸는, 사랑글로벌아카데미 SaGA", font=_f(fonts["hand"], 54),
           fill=GOLD, anchor="ma")
    sf = _f(fonts["bold"], 40)
    lines = ["원서 접수  1차 2026.10.1 ~ 11.30 (전형료 면제)  ·  2차 12.1 ~ 12.31",
             "면접 2027.1.9(토)  ·  개강 2027.2.16  ·  매주 화 저녁 7~10시 | 토 오전 9~12시",
             "saga121.com  ·  카카오톡 ‘사랑글로벌아카데미’  ·  02-3495-8300"]
    y = 660
    for i, ln in enumerate(lines):
        d.text((WIDTH / 2 + 2, y + 2), ln, font=sf, fill=(0, 0, 0, 140), anchor="ma")
        d.text((WIDTH / 2, y), ln, font=sf, fill=(255, 255, 255) if i < 2 else GOLD, anchor="ma")
        y += 62
    base.convert("RGB").save(out, quality=94)
    return out


# ── 5. 장면표 ────────────────────────────────────────────
def scenes(fonts: dict, theme: dict) -> list[dict]:
    C = lambda name, text, sub="": {"kind": "card", "src": str(layout.card(W / f"card_{name}", "long", fonts, text, theme, sub)), "dur": 5.0}
    return [
        {"kind": "clip", "src": _pick("v_seoul_dawn_crop"), "dur": 7.0, "cap": "월요일 아침, 서울"},
        {"kind": "still", "src": _pick("i_commute"), "dur": 5.0, "cap": "주일의 믿음은, 월요일에도 살아 있습니까?"},
        {"kind": "still", "src": _pick("i_desk_bible"), "dur": 5.0, "cap": "일은 저주가 아니라, 창조 때부터 있던 축복입니다"},
        {"kind": "clip", "src": _pick("v_hands_work"), "dur": 7.0, "cap": "당신의 책상은 이미 선교지입니다"},
        {"kind": "card", "src": str(layout.card(W / "card_title", "long", fonts, "2027\n일터선교 & 글로벌네트워크아카데미", theme,
                                                 "SCHOOL OF MARKETPLACE MISSION & GLOBAL NETWORK  ·  사랑글로벌아카데미 SaGA")), "dur": 4.5},
        {"kind": "still", "src": str(collage(W / "collage1.jpg", ["i_shop", "i_clinic", "i_whiteboard", "i_globe"])), "dur": 5.0,
         "cap": "기업가 · 직장인 · 공무원 · 자영업자 · 청년"},
        {"kind": "clip", "src": _pick("v_seminar"), "dur": 7.0, "cap": "1학기  온전론 · 기독교 세계관 · 성경적 일터신학"},
        {"kind": "still", "src": _pick("i_globe"), "dur": 5.0, "cap": "2학기  교회사 · 글로벌 네트워크 · 일터선교와 전문성"},
        {"kind": "still", "src": _pick("i_whiteboard"), "dur": 5.0, "cap": "3학기  Business is Mission · Christian-MBA · 영역별 선교전략"},
        C("faculty", "함께하는 교수진", FACULTY),
        {"kind": "clip", "src": _pick("v_walk_sunrise"), "dur": 7.0, "cap": "먼저 걸은 동문들과, 바울의 길을 따라 걷는 비전트립"},
        C("when", "매주 화 저녁 7~10시  |  토 오전 9~12시", "강남캠퍼스 & 전국 5개 권역 거점캠퍼스  ·  1년 3학기  ·  230명"),
        C("fee", "등록금  학기당 *125만원*", "거점캠퍼스 · 목회자 · 선교사 · 30대 청년 75만원  ·  각 교회 50% 장학 권장"),
        C("apply", "원서 접수  *10.1 ~ 11.30*", "전형료 면제  ·  2차 12.1 ~ 12.31  ·  면접 2027.1.9  ·  개강 2027.2.16"),
    ]


def build(bgm: str) -> Path:
    cfg = load_config(None)
    fonts = font_set(cfg)
    theme = series.get("recruit")["theme"]
    layout.CAPTION_SCALE = 2.0  # 자막 글씨 2배
    W.mkdir(parents=True, exist_ok=True)
    parts, caps, t = [], [], 0.0
    intro = intro_search(W / "intro.mp4", fonts)
    intro_d = media.duration(str(intro))
    parts.append(shorts.piece(W / "p00.mp4", "long", str(intro), intro_d + XF, zoom=False))
    t += intro_d
    sc = scenes(fonts, theme)
    # 엔딩 키비주얼 (새벽 도시 클립의 한 장면 위에)
    bgf = W / "end_bg.jpg"
    media.run(["-ss", "6", "-i", _pick("v_seoul_dawn"), "-frames:v", "1", "-q:v", "2", str(bgf)])
    sc.append({"kind": "card", "src": str(end_card(W / "end_card.jpg", fonts, bgf)), "dur": 8.0})
    body_start = t
    for i, s in enumerate(sc, 1):
        last = i == len(sc)
        d = s["dur"] + (0 if last else XF)
        parts.append(shorts.piece(W / f"p{i:02d}.mp4", "long", s["src"], d, zoom=(s["kind"] == "still")))
        if s.get("cap"):
            caps.append((t + 0.5, t + s["dur"] - 0.3, s["cap"]))
        t += s["dur"]
    body_end = t - 8.0
    base = shorts.join_xfade(parts, W / "base.mp4", XF)
    ov = [(watermark(W / "wm.png", fonts), body_start, body_end)]
    ov += faces.safe_captions(str(base), caps, "long", fonts, "outline", W / "captions")
    out = ROOT / "output" / "스케치형_long.mp4"
    shorts.finish(base, out, ov, bgm=bgm, bgm_volume=0.9, duck=False, fade=0.35, rise=12)
    return out


if __name__ == "__main__":
    bgm = sys.argv[1] if len(sys.argv) > 1 else str(A / "bgm_temp.wav")
    print("DONE", build(bgm), flush=True)
