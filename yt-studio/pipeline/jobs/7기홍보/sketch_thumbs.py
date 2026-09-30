"""스케치형 영상 썸네일 — 사진 위주(별 배경 타이포형과 구분).
  S1 16:9 recruit 판형(왼쪽 남색 판 + 오른쪽 장면)  S2 16:9 사진 전면 + 아래 남색 그라데이션  S3 9:16 쇼츠 표지 후보 프레임.
사용: cd yt-studio/pipeline && python jobs/7기홍보/sketch_thumbs.py"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from ytauto import media, series  # noqa: E402
from ytauto.config import load_config  # noqa: E402
from ytauto.fonts import font_set  # noqa: E402
from ytauto.recruit import recruit_thumbnail  # noqa: E402
from ytauto.render import fit_cover  # noqa: E402

ROOT = Path("projects/saga/recruit/7기홍보영상")
M, A, O = ROOT / "media", ROOT / "assets", ROOT / "output"
GOLD = (242, 193, 78)


def F(p, pt):
    return ImageFont.truetype(p, pt)


def frame(src: Path, at: float, out: Path) -> Path:
    media.run(["-ss", f"{at:.2f}", "-i", str(src), "-frames:v", "1", "-q:v", "2", str(out)])
    return out


def photo_wide(out: Path, bg: Path, fonts: dict, big: list[str], kicker: str, tag: str) -> Path:
    W, H = 1920, 1080
    base = fit_cover(Image.open(bg).convert("RGB"), (W, H))
    base = ImageEnhance.Brightness(base).enhance(0.8).convert("RGBA")
    g = Image.linear_gradient("L").resize((W, H)).point(lambda v: int(max(0, min(255, (v - 90) * 1.6))))
    navy = Image.new("RGBA", (W, H), (10, 22, 50, 255)); navy.putalpha(g)
    base.alpha_composite(navy)
    d = ImageDraw.Draw(base)
    logo = Image.open(A / "saga_logo_w.png").convert("RGBA")
    lw = 280
    logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
    base.alpha_composite(logo, (W - 96 - lw, 72))
    x = 96
    kf = F(fonts["bold"], 38)
    d.text((x + 2, 470 + 2), kicker, font=kf, fill=(0, 0, 0, 140))
    d.text((x, 470), kicker, font=kf, fill=GOLD)
    tf = F(fonts["title"], 128)
    y = 530
    for ln in big:
        parts = ln.split("*")
        cx = x
        for i, p in enumerate(parts):
            if not p:
                continue
            col = GOLD if i % 2 else (255, 255, 255)
            d.text((cx + 5, y + 6), p, font=tf, fill=(0, 0, 0, 160))
            d.text((cx, y), p, font=tf, fill=col, stroke_width=3, stroke_fill=(10, 14, 28))
            cx += tf.getlength(p)
        y += 142
    pf = F(fonts["bold"], 36)
    tw = pf.getlength(tag) + 48
    d.rounded_rectangle((x, y + 24, x + tw, y + 24 + 62), 31, fill=GOLD)
    d.text((x + 24, y + 24 + 12), tag, font=pf, fill=(14, 18, 30))
    out.parent.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(out, quality=94)
    return out


def photo_tall(out: Path, bg: Path, fonts: dict, big: list[str], kicker: str, tag: str) -> Path:
    """9:16 쇼츠 표지 — 사진 위 아래쪽 남색 그라데이션 + 큰 글자 (쇼츠 UI 를 피해 세로 260~1560 안에)."""
    W, H = 1080, 1920
    base = fit_cover(Image.open(bg).convert("RGB"), (W, H))
    base = ImageEnhance.Brightness(base).enhance(0.85).convert("RGBA")
    g = Image.linear_gradient("L").resize((W, H)).point(lambda v: int(max(0, min(255, (v - 110) * 1.9))))
    navy = Image.new("RGBA", (W, H), (10, 22, 50, 255)); navy.putalpha(g)
    base.alpha_composite(navy)
    d = ImageDraw.Draw(base)
    logo = Image.open(A / "saga_logo_w.png").convert("RGBA")
    lw = 240
    logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
    base.alpha_composite(logo, ((W - lw) // 2, 290))
    x = 72
    kf = F(fonts["bold"], 36)
    y = 1560 - 126 * len(big) - 200  # 아래 태그까지 쇼츠 안전 구간 안에
    d.text((x + 2, y + 2), kicker, font=kf, fill=(0, 0, 0, 140))
    d.text((x, y), kicker, font=kf, fill=GOLD)
    tf = F(fonts["title"], 112)
    y += 60
    for ln in big:
        cx = x
        for i, part in enumerate(ln.split("*")):
            if not part:
                continue
            d.text((cx + 5, y + 6), part, font=tf, fill=(0, 0, 0, 160))
            d.text((cx, y), part, font=tf, fill=GOLD if i % 2 else (255, 255, 255), stroke_width=3, stroke_fill=(10, 14, 28))
            cx += tf.getlength(part)
        y += 126
    pf = F(fonts["bold"], 36)
    tw = pf.getlength(tag) + 48
    d.rounded_rectangle((x, y + 20, x + tw, y + 20 + 62), 31, fill=GOLD)
    d.text((x + 24, y + 20 + 12), tag, font=pf, fill=(14, 18, 30))
    out.parent.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(out, quality=94)
    return out


def main() -> list[Path]:
    cfg = load_config(None)
    fonts = font_set(cfg)
    theme = series.get("recruit")["theme"]
    res = []
    hands = frame(M / "v_hands_work.mp4", 3.0, O / "thumb_src_hands.jpg")
    res.append(recruit_thumbnail(O / "스케치_썸네일_S1.jpg", "일터를\n새롭게 *보다.*", fonts, hands, tag="SaGA 7기 모집",
                                 sub="일터선교 & 글로벌네트워크아카데미  ·  2027", footer="원서 접수 10.1 ~ 11.30 (전형료 면제)  ·  saga121.com",
                                 theme=theme))
    dawn = frame(M / "v_seoul_dawn_crop.mp4", 6.0, O / "thumb_src_dawn_crop.jpg")  # 원본은 건물에 깨진 글자가 있어 자른 클립을 쓴다
    res.append(photo_wide(O / "스케치_썸네일_S2.jpg", dawn, fonts, ["직장을 그만두지 않고", "선교사가 되는 *1년*"],
                          "2027  일터선교 & 글로벌네트워크아카데미", "사가 SaGA 7기 모집  ·  10.1 ~ 11.30 전형료 면제"))
    # 쇼츠 표지(9:16): 출근길 그림 + 질문 — 영상 맨 앞 0.6초에 붙여 두면 유튜브 앱에서 이 장면을 표지로 고를 수 있다
    res.append(photo_tall(O / "스케치_썸네일_S3_쇼츠표지.jpg", M / "s_commute.png", fonts,
                          ["직장을", "그만두지 않고", "선교사가 되는", "*1년*"], "2027  일터선교 & 글로벌네트워크아카데미", "사가 SaGA 7기 모집  ·  10.1 ~ 11.30"))
    return res


if __name__ == "__main__":
    for p in main():
        print("THUMB", p, flush=True)
