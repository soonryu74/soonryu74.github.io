"""video-factory 공통 — 글꼴 · 색 · ffmpeg · 자막(ASS) · 레이어 PSD. 다른 스크립트가 import 한다."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
FONTS = HERE.parent / "assets" / "fonts"
FONT = {"black": FONTS / "Pretendard-Black.otf", "semi": FONTS / "Pretendard-SemiBold.otf",
        "bold": FONTS / "Pretendard-Bold.otf", "reg": FONTS / "Pretendard-Regular.otf"}
NAVY, PANEL = (11, 18, 36), (20, 30, 56)
GOLD, TEAL, CORAL, DIM, WHITE = (242, 193, 78), (64, 214, 190), (240, 98, 120), (168, 180, 204), (255, 255, 255)
FPS = 30


def F(kind: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT[kind]), size)


def ff(args: list[str]) -> None:
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args], check=True)


def probe(p: str | Path) -> dict:
    """길이 · 화면 크기(회전 반영) · 소리 유무"""
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                        "format=duration:stream=codec_type,width,height:stream_side_data=rotation",
                        "-of", "json", str(p)], capture_output=True, text=True)
    j = json.loads(r.stdout or "{}")
    info = {"duration": float(j.get("format", {}).get("duration", 0) or 0), "audio": False, "w": 0, "h": 0}
    for s in j.get("streams", []):
        if s.get("codec_type") == "audio":
            info["audio"] = True
        if s.get("codec_type") == "video" and not info["w"]:
            w, h = s.get("width", 0), s.get("height", 0)
            rot = 0
            for sd in s.get("side_data_list", []) or []:
                rot = int(sd.get("rotation", 0) or 0)
            if abs(rot) % 180 == 90:
                w, h = h, w
            info["w"], info["h"] = w, h
    return info


def load(p: str | Path):
    return json.load(open(p, encoding="utf-8"))


def save(obj, p: str | Path) -> Path:
    Path(p).write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")
    return Path(p)


# ───────── 글자 ─────────
def rich_len(text: str, font) -> float:
    return sum(font.getlength(p) for p in text.split("*"))


def draw_rich(d: ImageDraw.ImageDraw, xy, text: str, font, color=WHITE, accent=GOLD, shadow=True, stroke=0) -> float:
    """*별표* 안은 강조색"""
    x, y = xy
    for i, part in enumerate(text.split("*")):
        if not part:
            continue
        if shadow:
            d.text((x + 3, y + 5), part, font=font, fill=(0, 0, 0, 140))
        d.text((x, y), part, font=font, fill=accent if i % 2 else color, stroke_width=stroke, stroke_fill=NAVY)
        x += font.getlength(part)
    return x


def wrap(text: str, font, maxw: float) -> list[str]:
    """띄어쓰기 단위 줄바꿈(*강조* 표시는 길이 계산에서 뺀다)"""
    out, cur = [], ""
    for w in text.split(" "):
        t = (cur + " " + w).strip()
        if cur and rich_len(t, font) > maxw:
            out.append(cur); cur = w
        else:
            cur = t
    if cur:
        out.append(cur)
    return out


def navy_bg(size, grid=60, glow=True) -> Image.Image:
    w, h = size
    img = Image.new("RGBA", size, NAVY + (255,))
    if glow:
        g = Image.radial_gradient("L").resize((int(w * 1.4), int(h * 1.6))).point(lambda v: max(0, 70 - v // 3))
        lay = Image.new("RGBA", g.size, (40, 70, 130, 255)); lay.putalpha(g)
        img.alpha_composite(lay, (int(-w * 0.2), int(-h * 0.45)))
    if grid:
        lines = Image.new("RGBA", size, (0, 0, 0, 0)); d = ImageDraw.Draw(lines)
        for x in range(0, w, grid):
            d.line([(x, 0), (x, h)], fill=(255, 255, 255, 14))
        for y in range(0, h, grid):
            d.line([(0, y), (w, y)], fill=(255, 255, 255, 14))
        img.alpha_composite(lines)
    return img


def fit_cover(im: Image.Image, size) -> Image.Image:
    """비율 유지하며 꽉 채우고 가운데 자르기"""
    w, h = size
    s = max(w / im.width, h / im.height)
    im = im.resize((int(im.width * s + 0.5), int(im.height * s + 0.5)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


# ───────── 자막(ASS) ─────────
def ass_color(rgb) -> str:
    r, g, b = rgb
    return f"&H00{b:02X}{g:02X}{r:02X}&"


def write_ass(cues: list, out: Path, size=(1080, 1920), font_size=None, margin_v=None, accent=GOLD, box=True) -> Path:
    """cues: [[시작, 끝, "글자 *강조*\\n둘째 줄"], …] → ASS. box=True 면 반투명 상자, False 면 굵은 외곽선."""
    W, H = size
    vertical = H > W
    fs = font_size or (58 if vertical else 54)
    mv = margin_v if margin_v is not None else (380 if vertical else 64)   # 쇼츠는 아래 UI 를 피해 위로
    def ts(t):
        t = max(0.0, t)
        return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"
    style = (f"Style: Default,Pretendard SemiBold,{fs},&H00FFFFFF,&H000000FF,&H5A0E1424,&H00000000,0,0,0,0,100,100,0,0,3,16,0,2,70,70,{mv},1" if box
             else f"Style: Default,Pretendard SemiBold,{fs},&H00FFFFFF,&H000000FF,&H00141C2E,&H96000000,0,0,0,0,100,100,0,0,1,4,2,2,60,60,{mv},1")
    ac = ass_color(accent)
    with open(out, "w", encoding="utf-8") as f:
        f.write(f"[Script Info]\nScriptType: v4.00+\nPlayResX: {W}\nPlayResY: {H}\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n")
        f.write("[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n")
        f.write(style + "\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")
        for s, e, t in cues:
            parts = t.replace("\n", "\\N").split("*")
            txt = "".join((f"{{\\c{ac}}}{p}{{\\c&H00FFFFFF&}}" if i % 2 else p) for i, p in enumerate(parts))
            f.write(f"Dialogue: 0,{ts(s)},{ts(e)},Default,,0,0,0,,{txt}\n")
    return out


def burn_subs(src: Path, ass: Path, out: Path, crf=18) -> Path:
    ff(["-i", str(src), "-vf", f"subtitles={ass}:fontsdir={FONTS}", "-c:v", "libx264", "-crf", str(crf), "-preset", "fast",
        "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", str(out)])
    return out


# ───────── 레이어 PSD ─────────
def save_psd(layers: list[tuple[str, Image.Image]], size, out: Path) -> Path | None:
    """요소별 레이어 PSD(PhotoCraft · 포토샵에서 손보기). psd-tools 없으면 건너뜀."""
    try:
        from psd_tools import PSDImage
        from psd_tools.api.layers import PixelLayer
    except ImportError:
        print("  (psd-tools 없음 → PSD 생략: pip install psd-tools)", flush=True)
        return None
    psd = PSDImage.new("RGB", size)
    for i, (name, im) in enumerate(layers):
        bb = im.getbbox()
        if not bb:
            continue
        lay = PixelLayer.frompil(im.crop(bb), psd, f"layer{i}", top=bb[1], left=bb[0])
        lay.name = name
        lay._record.name = f"layer{i:02d}"
        psd.append(lay)
    psd.save(str(out))
    return out


def small_copy(src: Path, out: Path, limit_mb=29) -> Path:
    """채팅 전송용 저화질 사본(30MB 아래)"""
    d = probe(src)["duration"] or 1
    kbps = int(limit_mb * 8 * 1024 / d * 0.92) - 128
    ff(["-i", str(src), "-c:v", "libx264", "-preset", "medium", "-b:v", f"{max(kbps, 300)}k", "-maxrate", f"{max(kbps, 300)}k",
        "-bufsize", f"{2 * max(kbps, 300)}k", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(out)])
    return out
