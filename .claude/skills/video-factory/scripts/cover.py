"""표지·썸네일 — 사진 + 남색 그라데이션 + 큰 글씨(*한 단어* 색 상자) + 머리말 + 알약 태그. JPG 와 레이어 PSD 를 함께.
사용: python cover.py cover.json
cover.json:
{
 "out": "표지.jpg", "aspect": "9:16",                 // 9:16 = 1080×1920 쇼츠 표지 / 16:9 = 1280×720 유튜브 썸네일
 "photo": "프레임.png", "crop": [x,y,w,h],            // 선택. 사진에서 쓸 영역(없으면 가운데 맞춤)
 "photo_side": "right",                                // 16:9 에서 사진을 오른쪽에 두고 왼쪽으로 녹임(기본). "full" = 전체 배경
 "kicker": "청지기 관점에서 본 자산관리",
 "lines": ["투자는", "기법보다", "*심법*입니다"],
 "box": false,                                         // true 면 *강조*를 색 상자 + 남색 글자로, false 면 강조색 글자로
 "tag": "SCIC 강의 하이라이트 · 3분",
 "pill": "노모어매뉴얼",                               // 선택. 왼쪽 위 채널 알약
 "logo": "로고.png",                                    // 선택
 "accent": [242,193,78], "title_size": 120
}
쇼츠 표지는 유튜브 UI 를 피해 글자를 세로 260~1560 안에 둔다. 낚시·과장 금지 — 강조는 사실인 숫자·결과에만."""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

from common import GOLD, NAVY, WHITE, F, fit_cover, load, navy_bg, rich_len, save_psd


def main(spec_path: str) -> Path:
    sp = load(spec_path)
    root = Path(spec_path).resolve().parent
    P = lambda p: str((root / p).resolve()) if not Path(p).is_absolute() else p  # noqa: E731
    vert = sp.get("aspect", "9:16") == "9:16"
    W, H = (1080, 1920) if vert else (1280, 720)
    acc = tuple(sp.get("accent", GOLD))
    new = lambda: Image.new("RGBA", (W, H), (0, 0, 0, 0))  # noqa: E731
    layers = [("배경", navy_bg((W, H), grid=60 if vert else 40))]
    if sp.get("photo"):
        ph = Image.open(P(sp["photo"])).convert("RGB")
        if sp.get("crop"):
            x, y, w, h = sp["crop"]; ph = ph.crop((x, y, x + w, y + h))
        side = sp.get("photo_side", "full" if vert else "right")
        if side == "full":
            ph = ImageEnhance.Brightness(fit_cover(ph, (W, H))).enhance(0.9).convert("RGBA")
            L = new(); L.alpha_composite(ph)
            g = Image.linear_gradient("L").resize((W, H)).point(lambda v: int(max(0, min(255, (v - 100) * 2.0))))
            shade = Image.new("RGBA", (W, H), (10, 22, 50, 255)); shade.putalpha(g); L.alpha_composite(shade)
        else:
            hh = H; ww = int(ph.width * hh / ph.height)
            ph = ph.resize((ww, hh), Image.LANCZOS).convert("RGBA")
            g = Image.linear_gradient("L").rotate(90).resize((ww, hh)).point(lambda v: min(255, int(v * 2.6)))
            ph.putalpha(g); L = new(); L.alpha_composite(ph, (W - ww, 0))
        layers.append(("사진", L))
    if sp.get("pill"):
        L = new(); d = ImageDraw.Draw(L); pf = F("bold", 30 if vert else 24)
        pw = pf.getlength(sp["pill"]) + 66; y0 = 200 if vert else 30
        d.rounded_rectangle((44, y0, 44 + pw, y0 + pf.size + 24), 24, fill=(12, 18, 32, 230), outline=acc + (255,), width=2)
        d.ellipse((64, y0 + pf.size // 2 + 6, 76, y0 + pf.size // 2 + 18), fill=acc)
        d.text((88, y0 + 8), sp["pill"], font=pf, fill=WHITE)
        layers.append((f"채널 알약: {sp['pill']}", L))
    if sp.get("logo"):
        lg = Image.open(P(sp["logo"])).convert("RGBA"); lw = 240 if vert else 150
        lg = lg.resize((lw, int(lg.height * lw / lg.width)), Image.LANCZOS)
        L = new(); L.alpha_composite(lg, ((W - lw) // 2, 290) if vert else (W - lw - 40, 30)); layers.append(("로고", L))
    lines = sp["lines"]
    size = sp.get("title_size", 120 if vert else 100)
    maxw = (W - 144) if vert else int(W * 0.58)
    while size > 50 and max(rich_len(l, F("black", size)) for l in lines) > maxw:
        size -= 4
    tf = F("black", size); lh = size + (16 if vert else 26)
    kick_h = 64 if sp.get("kicker") else 0
    tag_h = 92 if sp.get("tag") else 0
    block = kick_h + lh * len(lines) + tag_h
    y = (1560 - block - 20) if vert else max(104, (H - block) // 2 + (20 if sp.get("pill") else 0))
    x0 = 72 if vert else 44
    if sp.get("kicker"):
        L = new(); d = ImageDraw.Draw(L); kf = F("semi", 40 if vert else 30)
        d.text((x0 + 2, y + 2), sp["kicker"], font=kf, fill=(0, 0, 0, 140)); d.text((x0, y), sp["kicker"], font=kf, fill=acc)
        layers.append((f"머리말: {sp['kicker']}", L)); y += kick_h
    for ln in lines:
        T = new(); d = ImageDraw.Draw(T); x = x0
        for i, part in enumerate(ln.split("*")):
            if not part:
                continue
            if i % 2 and sp.get("box"):
                w = tf.getlength(part)
                B = new(); ImageDraw.Draw(B).rectangle((x - 6, y + 12, x + w + 14, y + size + 24), fill=acc)
                layers.append((f"강조 상자: {part}", B))
                d.text((x + 4, y), part, font=tf, fill=NAVY); x += w + 24
            else:
                d.text((x + 5, y + 6), part, font=tf, fill=(0, 0, 0, 160))
                d.text((x, y), part, font=tf, fill=acc if i % 2 else WHITE, stroke_width=3, stroke_fill=(10, 14, 28))
                x += tf.getlength(part)
        layers.append((f"제목: {ln.replace('*', '')}", T)); y += lh
    if sp.get("tag"):
        L = new(); d = ImageDraw.Draw(L); pf = F("semi", 38 if vert else 28)
        tw = pf.getlength(sp["tag"]) + 48
        d.rounded_rectangle((x0, y + 20, x0 + tw, y + 20 + pf.size + 24), 31, fill=(255, 255, 255, 230))
        d.text((x0 + 24, y + 30), sp["tag"], font=pf, fill=NAVY)
        layers.append((f"태그: {sp['tag']}", L))
    img = new()
    for _, L in layers:
        img.alpha_composite(L)
    out = Path(P(sp["out"]))
    img.convert("RGB").save(out, quality=93)
    if sp.get("psd", True):
        save_psd(layers, (W, H), out.with_name(out.stem + "_레이어.psd"))
    print("DONE", out, flush=True)
    return out


if __name__ == "__main__":
    main(sys.argv[1])
