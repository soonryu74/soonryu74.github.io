"""주차판 w1·w2·w3 재료 v2: 방송 원본 녹음을 그대로 음성으로 쓰고(앞 1.5초 무음), 자막 시간을 원본 기준으로 다시 잡는다."""
import json, shutil, subprocess, sys
from pathlib import Path
sys.path.insert(0, ".")
from ytauto.transcribe import read_srt
from ytauto.assemble import write_srt
from ytauto.media import ffmpeg_exe, duration
J = Path("jobs/1분칼럼"); P = Path("projects/saga/column/1분칼럼"); ORIG = Path(sys.argv[1])
PAD = 1.5
START = {"w1": "[사가일터선교 1분 칼럼] 예수님의 일 철학 세 가지", "w2": "[사가일터선교 1분 칼럼] 예수님의 일터 철학",
         "w3": "[사가일터선교 1분 칼럼] 예수님의 일 철학 세 가지"}
# 원본 기준 초: (FEBC 1분 칼럼) (사랑글로벌…) (말씀에는…) 본문시작 끝 [추가문장]
T = {"w1": ("0824", (3.2, 6.6), (6.7, 9.3), (9.6, 12.1), 12.30, 84.83, None),
     "w2": ("0907", (3.3, 6.6), (6.6, 9.4), (9.6, 12.0), 12.10, 72.28, None),
     "w3": ("0914", (3.7, 6.8), (6.9, 9.4), (9.6, 12.3), 16.70, 85.61, (12.6, 16.6, "일은 하나님을 온전히 닮아 가는 거룩한 도구가 될 수 있습니다."))}
INTRO = ["FEBC 1분 칼럼!", "사랑글로벌아카데미와 함께합니다.", "말씀에는 오정현 총장입니다."]
for key, (src, a, b, c, body0, end, extra) in T.items():
    out = J / f"{key}_voice.m4a"
    subprocess.run([ffmpeg_exe(), "-y", "-loglevel", "error", "-i", str(ORIG / f"{src}.wav"), "-t", f"{end + PAD:.2f}",
                    "-af", f"adelay={int(PAD*1000)}|{int(PAD*1000)},aresample=48000,aformat=channel_layouts=stereo,afade=t=out:st={end+PAD-1.0:.2f}:d=1.0",
                    "-c:a", "aac", "-b:a", "192k", str(out)], check=True)
    cues = [(0.0, a[0] + PAD, START[key])] + [(s + PAD, e + PAD, t) for (s, e), t in zip((a, b, c), INTRO)]
    if extra:
        cues.append((extra[0] + PAD, extra[1] + PAD, extra[2]))
    off = body0 + PAD
    cues += [(s + off, e + off, t) for s, e, t in read_srt(J / f"{src}_자막.srt")]
    write_srt(cues, J / f"{key}_자막.srt")
    print(key, "voice", round(duration(str(out)), 2), "cues", len(cues))
# 배경 그림: 프롬프트가 같은 그림 재사용 (앞머리 h00 은 이미 만든 마이크 그림)
sys.path.insert(0, str(J)); from eps import EPS
have = {}
for d in P.iterdir():
    sj = d / "scenes_w.json"
    if sj.exists():
        for s in json.loads(sj.read_text(encoding="utf-8")):
            if s.get("bg_h") and Path(s["bg_h"]).exists():
                have.setdefault(s["prompt"], s["bg_h"])
for key in T:
    ep = next(e for e in EPS if e["key"] == key); bgd = J / f"{key}_bg"
    mic = (bgd / "h00.png").read_bytes()
    shutil.rmtree(bgd); bgd.mkdir(); (bgd / "h00.png").write_bytes(mic)
    for i, sc in enumerate(ep["scenes"]):
        if i and have.get(sc["prompt"]):
            shutil.copy(have[sc["prompt"]], bgd / f"h{i:02d}{Path(have[sc['prompt']]).suffix}")
    lines = [l for s in ep["scenes"] for l in s["lines"]]; cues = read_srt(J / f"{key}_자막.srt")
    print(key, "bg", len(list(bgd.iterdir())), "/", len(ep["scenes"]), "lines", len(lines), "cues", len(cues),
          "mismatch", [x for x, y in zip(lines, [c[2] for c in cues]) if x != y][:1])
