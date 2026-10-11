# -*- coding: utf-8 -*-
"""완성 영상 검증: 각 절의 장절안내 화면 + 첫 줄 화면을 캡처해 한 장의 시트로 만든다
사용법: python3 verify.py series/A5-8 series/A5-8/영상.mp4"""
import json, os, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont

def grab(mp4, t, w=560):
    out = os.path.join(tempfile.gettempdir(), f"_v_{int(t*100)}.jpg")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", mp4,
                    "-frames:v", "1", "-vf", f"scale={w}:-1", out], check=True)
    return out

def main(d, mp4):
    spec = json.load(open(f"{d}/cuespec.json"))
    shots = []
    for n in sorted(spec["refs"], key=int):
        s, e = spec["refs"][n]
        shots.append((f"{n}절 장절안내", s + (e - s) * 0.75))
        blk = spec["blocks"][n][0]
        shots.append((f"{n}절 1번째 줄", blk[0] + (blk[1] - blk[0]) * 0.7))
    cols, rows = 2, (len(shots) + 1) // 2
    imgs = [Image.open(grab(mp4, t)) for _, t in shots]
    W, H = imgs[0].size
    pad, label = 12, 30
    sheet = Image.new("RGB", (cols * (W + pad) + pad, rows * (H + label + pad) + pad), (245, 245, 245))
    dr = ImageDraw.Draw(sheet)
    f = ImageFont.truetype("/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc", 20, index=0)
    for i, (im, (name, t)) in enumerate(zip(imgs, shots)):
        x = pad + (i % cols) * (W + pad)
        y = pad + (i // cols) * (H + label + pad)
        dr.text((x + 4, y + 4), f"{name}  ({t:.1f}s)", font=f, fill=(30, 30, 30))
        sheet.paste(im, (x, y + label))
    out = f"{d}/verify.jpg"
    sheet.save(out, quality=88)
    print(out)

if __name__ == "__main__":
    main(sys.argv[1].rstrip("/"), sys.argv[2])
