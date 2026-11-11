#!/usr/bin/env python3
"""샷리스트+자막으로 타이밍 확인용 애니매틱(무음, 글자 카드)을 만든다. 생성 AI 미사용, 비용 0.
실행: python3 tools/animatic_v7.py <작업폴더> <출력.mp4>"""
import csv, os, re, subprocess, sys, textwrap
from PIL import Image, ImageDraw, ImageFont
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
work, out = sys.argv[1], sys.argv[2]
STILLS = sys.argv[3] if len(sys.argv) > 3 else None  # 선택: <shot_id>.jpg 스틸 폴더
W, H = 1280, 720
FP = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
F = lambda n: ImageFont.truetype(FP, n)
BG = {"S0": (20, 20, 40), "S1": (58, 64, 70), "S2": (70, 70, 62), "S3": (52, 60, 68), "S4": (56, 44, 34), "S5": (60, 62, 64),
      "S6": (14, 10, 8), "S7": (10, 10, 12), "S8": (14, 10, 8), "S9": (10, 10, 12), "S10": (86, 58, 26), "S11": (56, 44, 34), "S12": (0, 0, 0)}
rows = list(csv.DictReader(open(f"{D}/02_shotlist_v7.csv", encoding="utf-8-sig")))
def sec(t): h, m, s = t.replace(",", ".").split(":"); return int(h) * 3600 + int(m) * 60 + float(s)
cues = []
for b in open(f"{D}/05_subtitles_ko_en_v7.srt", encoding="utf-8").read().strip().split("\n\n"):
    L = b.split("\n"); a, z = L[1].split(" --> "); cues.append((sec(a), sec(z), L[2], "\n".join(L[3:])))

def card(r, cue):
    black = r["shot_type"] == "black"
    im = Image.new("RGB", (W, H), (0, 0, 0) if black else BG[r["scene_id"]]); d = ImageDraw.Draw(im)
    st = float(r["start_sec"]); du = float(r["duration_sec"])
    still = STILLS and os.path.join(STILLS, r["shot_id"] + ".jpg")
    if still and os.path.exists(still) and not black:
        im = Image.open(still).convert("RGB").resize((W, H)); d = ImageDraw.Draw(im, "RGBA")
        d.rectangle([0, 0, W, 54], fill=(0, 0, 0, 150))
        d.text((20, 12), f"{r['shot_id']} · {du:.0f}s · {r['action']}", font=F(24), fill=(255, 255, 255))
        if cue: d.rectangle([0, H - 170, W, H], fill=(0, 0, 0, 150))
    elif not black:
        accent = (240, 200, 40) if "GLOVE" in r["continuity_id"] else (230, 140, 60)
        d.rectangle([60, 60, 68, 130], fill=accent)
        d.text((84, 56), f"{r['shot_id']}  ·  {r['shot_type']}  ·  {du:.0f}s", font=F(34), fill=(235, 235, 235))
        d.text((84, 100), f"{int(st//60)}:{int(st%60):02d}  |  {r['characters']}  |  {r['ai_tool']}", font=F(22), fill=(170, 170, 170))
        y = 210
        for line in textwrap.wrap(r["action"], 24):
            d.text((84, y), line, font=F(46), fill=(255, 255, 255)); y += 62
        d.text((84, y + 20), "카메라: " + r["camera"], font=F(24), fill=(180, 180, 180))
        d.text((84, y + 54), "소리: " + r["audio"], font=F(24), fill=(180, 180, 180))
    else:
        d.text((60, 40), f"{r['shot_id']} 암전 · 소리: {r['audio']}", font=F(18), fill=(60, 60, 60))
    if cue:
        y = H - 150
        d.text((W / 2, y), cue[2], font=F(30), fill=(255, 220, 150), anchor="ma"); y += 42
        for line in cue[3].split("\n"):
            d.text((W / 2, y), line, font=F(32), fill=(255, 255, 255), anchor="ma", stroke_width=2, stroke_fill=(0, 0, 0)); y += 40
    return im

segs = []
for r in rows:
    a = float(r["start_sec"]); z = a + float(r["duration_sec"])
    pts = sorted({a, z, *[t for c in cues for t in c[:2] if a < t < z]})
    for p, q in zip(pts, pts[1:]):
        cue = next((c for c in cues if c[0] <= p and q <= c[1]), None)
        segs.append((r, cue, q - p))
lst = open(f"{work}/list.txt", "w")
for i, (r, cue, du) in enumerate(segs):
    fn = f"{work}/f{i:04d}.png"; card(r, cue).save(fn)
    lst.write(f"file '{fn}'\nduration {du:.3f}\n")
lst.write(f"file '{fn}'\n"); lst.close()
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", f"{work}/list.txt",
                "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-shortest", "-vf", "fps=24,format=yuv420p",
                "-c:v", "libx264", "-crf", "23", "-c:a", "aac", "-b:a", "64k", out], check=True)
print(len(segs), "segments ->", out)
