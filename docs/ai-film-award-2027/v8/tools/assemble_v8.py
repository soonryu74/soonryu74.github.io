#!/usr/bin/env python3
"""생성한 컷(<shot_id>.mp4)을 샷리스트 순서대로 잘라 붙이고 영어 자막을 입힌다. 생성 AI 미사용.
실행: python3 tools/assemble_v8.py <컷폴더> <출력.mp4> [--intro 인트로.mp4]
없는 컷은 회색 안내 카드로 대체되므로 진행 중에도 전체 흐름을 볼 수 있다. S0(인트로)와 S13(크레딧)은 붙이지 않는다(--intro를 주면 앞에 붙인다)."""
import csv, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."); clips, out = sys.argv[1], sys.argv[2]
intro = sys.argv[sys.argv.index("--intro")+1] if "--intro" in sys.argv else None
W = os.path.join(clips, "_work"); os.makedirs(W, exist_ok=True)
FONT = next(p for p in ("/usr/share/fonts/truetype/nanum/NanumMyeongjoBold.ttf", "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc") if os.path.exists(p))
def run(*a): subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *a], check=True)
ENC = ["-c:v", "libx264", "-crf", "16", "-preset", "medium", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2"]
rows = [r for r in csv.DictReader(open(f"{D}/02_shotlist_v8.csv", encoding="utf-8-sig")) if r["scene_id"] not in ("S0", "S13")]
t0 = float(rows[0]["start_sec"]); parts = []; missing = []
for r in rows:
    d = float(r["duration_sec"]); src = os.path.join(clips, r["shot_id"] + ".mp4"); o = f"{W}/{r['shot_id']}.mp4"
    if r["ai_tool"] != "Seedance" or not os.path.exists(src):
        black = r["ai_tool"] != "Seedance"
        im = Image.new("RGB", (1920, 1080), (0, 0, 0) if black else (40, 40, 44))
        if not black:
            missing.append(r["shot_id"]); dr = ImageDraw.Draw(im)
            dr.text((960, 480), r["shot_id"] + "  (미생성)", font=ImageFont.truetype(FONT, 60), fill=(200, 200, 200), anchor="mm")
            dr.text((960, 580), r["action"][:44], font=ImageFont.truetype(FONT, 34), fill=(150, 150, 150), anchor="mm")
        im.save(f"{W}/p.png")
        run("-loop", "1", "-t", str(d), "-i", f"{W}/p.png", "-f", "lavfi", "-t", str(d), "-i", "anullsrc=r=48000:cl=stereo", "-vf", "fps=30,format=yuv420p", *ENC, o)
    else:
        has_a = b"audio" in subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type", "-of", "csv=p=0", src])
        vf = "scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,crop=1920:1080,fps=30,format=yuv420p"
        a = ["-t", str(d), "-i", src] + ([] if has_a else ["-f", "lavfi", "-t", str(d), "-i", "anullsrc=r=48000:cl=stereo"])
        run(*a, "-vf", vf, "-af", f"afade=t=in:d=0.05,afade=t=out:st={max(0,d-0.1)}:d=0.1", "-shortest", *ENC, o)
    parts.append(o)
open(f"{W}/l.txt", "w").write("".join(f"file '{p}'\n" for p in parts)); run("-f", "concat", "-safe", "0", "-i", f"{W}/l.txt", "-c", "copy", f"{W}/cut.mp4")
# 자막: 샷리스트는 인트로 포함 시각이므로 본편 기준으로 당긴다
def sec(x): h, m, s = x.replace(",", ".").split(":"); return int(h)*3600 + int(m)*60 + float(s)
vf = []
for i, b in enumerate(open(f"{D}/05b_subtitles_en_burnin_v8.srt", encoding="utf-8").read().strip().split("\n\n")):
    L = b.split("\n"); a, z = (sec(x) - t0 for x in L[1].split(" --> ")); txt = L[2:]
    for j, line in enumerate(txt):
        p = f"{W}/s{i}_{j}.txt"; open(p, "w", encoding="utf-8").write(line)
        vf.append(f"drawtext=fontfile={FONT}:textfile={p}:fontsize=44:fontcolor=white:borderw=3:bordercolor=black@0.85:x=(w-text_w)/2:y=h-{70+56*(len(txt)-1-j)}-40:enable='between(t,{a:.3f},{z:.3f})'")
run("-i", f"{W}/cut.mp4", "-vf", ",".join(vf), *ENC, "-movflags", "+faststart", f"{W}/film.mp4")
if intro:
    run("-i", intro, "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p", *ENC, f"{W}/intro.mp4")
    open(f"{W}/f.txt", "w").write(f"file '{W}/intro.mp4'\nfile '{W}/film.mp4'\n"); run("-f", "concat", "-safe", "0", "-i", f"{W}/f.txt", "-c", "copy", out)
else: os.replace(f"{W}/film.mp4", out)
dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]))
print(f"출력 {out} · {dur:.1f}초 · 미생성 {len(missing)}/{sum(r['ai_tool']=='Seedance' for r in rows)}컷")
print("주의: 타이틀·문서 글자는 임시로 자막 형태. 크레딧은 포함되지 않음.")
