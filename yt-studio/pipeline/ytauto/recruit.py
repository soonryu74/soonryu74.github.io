"""7기 모집 홍보 영상(브랜드 필름) 가로 썸네일 — 왼쪽 글자 판 + 오른쪽 장면.

사랑의교회 설교 썸네일처럼 "왼쪽 단색 판에 제목, 오른쪽에 장면" 틀. 극동방송 칼럼(흰 테두리 + 가운데 제목)과 구분된다.
  big     제목 2줄 (\\n 줄바꿈, *별표* 단어는 금색)
  tag     왼쪽 위 작은 알약 글자      예: SaGA 7기 모집
  sub     제목 아래 보조 한 줄         예: 일터선교 & 글로벌 네트워크 아카데미
  footer  왼쪽 아래 작은 글자          예: 사랑글로벌아카데미 SaGA · saga121.com
영상 장면에는 자막이 구워져 있으므로 위·아래를 조금 잘라 낸 뒤(trim) 오른쪽에 채운다.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from .thumbs import _draw_rich, _fit_rich, _font, _rgb, _rich_lines

W, H = 1280, 720


def _panel(theme: dict) -> Image.Image:
    """왼쪽 위 짙은 색 → 오른쪽 아래 조금 밝은 색 (부드러운 대각선)."""
    from .thumbs import _diag_gradient
    return _diag_gradient((W, H), theme.get("c1", "#0E1E3F"), theme.get("c2", "#23407A")).convert("RGBA")


def _scene(bg: Path, box: tuple[int, int], trim_top: float = 0.09, trim_bottom: float = 0.15) -> Image.Image:
    """장면을 위·아래 조금 잘라(구운 자막·표시 제거) 상자에 꽉 채운다."""
    img = Image.open(bg).convert("RGB")
    w, h = img.size
    img = img.crop((0, int(h * trim_top), w, int(h * (1 - trim_bottom))))
    w, h = img.size
    bw, bh = box
    s = max(bw / w, bh / h)
    img = img.resize((int(w * s) + 1, int(h * s) + 1), Image.LANCZOS)
    x0 = (img.width - bw) // 2
    return img.crop((x0, 0, x0 + bw, bh))


def recruit_thumbnail(out: Path, big: str, fonts: dict, bg: Path | None, tag: str = "SaGA 7기 모집",
                      sub: str = "일터선교 & 글로벌 네트워크 아카데미",
                      footer: str = "사랑글로벌아카데미 SaGA  ·  saga121.com",
                      theme: dict | None = None, panel: float = 0.46) -> Path:
    theme = theme or {}
    gold = _rgb(theme.get("accent", "#F2C14E"))
    base = _panel(theme)
    # 오른쪽 장면: 판 끝에서 부드럽게 시작
    px = int(W * panel)
    if bg and Path(bg).exists():
        fade = 150  # 판과 장면이 겹치며 섞이는 너비
        sc = _scene(bg, (W - px + fade, H)).convert("RGBA")
        mask = Image.linear_gradient("L").rotate(-90, expand=True).resize((sc.width, H))
        lim = int(255 * fade / sc.width)
        mask = mask.point(lambda v: 255 if v >= lim else int(255 * (v / lim) ** 1.4))
        sc.putalpha(mask)
        base.alpha_composite(sc, (px - fade, 0))
        # 장면 아래쪽을 조금 어둡게 (판 색이 섞인 어둠) — 글자와 분리
        g = Image.linear_gradient("L").resize((W, H)).point(lambda v: 0 if v < 150 else int((v - 150) * 1.2))
        dk = Image.new("RGBA", (W, H), _rgb(theme.get("c1", "#0E1E3F")) + (255,))
        dk.putalpha(g)
        base.alpha_composite(dk)
    d = ImageDraw.Draw(base)
    # 왼쪽 세로 금색 선
    d.rectangle((44, 84, 50, H - 84), fill=gold + (255,))
    x = 76
    # 알약 꼬리표
    y = 92
    if tag:
        tf = _font(fonts["bold"], 34)
        tw = tf.getlength(tag) + 44
        d.rounded_rectangle((x, y, x + tw, y + 56), 28, fill=gold + (255,))
        d.text((x + 22, y + 9), tag, font=tf, fill=(14, 18, 30))
        y += 56 + 34
    # 제목 2줄
    rows = _rich_lines(big, 2)
    maxw = px - 40 - x  # 글자는 판 안에서 끝난다 (사진을 가리지 않게)
    pt = _fit_rich(rows, fonts["title"], maxw, 112 if len(rows) > 1 else 136, 60)
    tf = _font(fonts["title"], pt)
    for r in rows:
        _draw_rich(base, x, y, r, tf, (255, 255, 255), gold, max(3, pt // 30), "left")
        y += int(pt * 1.12)
    # 보조 한 줄
    if sub:
        y += 14
        sf = _font(fonts["bold"], 34)
        d = ImageDraw.Draw(base)
        d.text((x + 2, y + 2), sub, font=sf, fill=(0, 0, 0, 120))
        d.text((x, y), sub, font=sf, fill=(232, 236, 245))
    # 아래 작은 글자
    if footer:
        ff = _font(fonts["bold"], 26)
        d.text((x, H - 84 - 30), footer, font=ff, fill=gold + (230,))
    out.parent.mkdir(parents=True, exist_ok=True)
    base.convert("RGB").save(out, quality=93)
    return out
