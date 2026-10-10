"""스케치형 롱(1080, 음악만) 위에 나레이션 얹기 — narration_sketch.json 시각대로, 말할 때 음악은 덕킹.
사용: cd yt-studio/pipeline && python jobs/7기홍보/mix_sketch.py [chosen.json]
  chosen.json: {"N00": "jobs/7기홍보/voice_sketch/N00_t1.wav", …}  (없으면 줄마다 _t1)
결과: jobs/7기홍보/output/스케치형_long_나레이션.mp4 (1080p, 원본 영상 재인코딩 없이 복사)"""
from __future__ import annotations

import json
import subprocess
import sys
import wave
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "assets" / "src" / "스케치형_long_1080.mp4"
J = json.load(open(HERE / "narration_sketch.json", encoding="utf-8"))
OUT = HERE / "output" / "스케치형_long_나레이션.mp4"
WORK = HERE / "voice_sketch" / "_cut"; WORK.mkdir(parents=True, exist_ok=True)
GAP, DUCK_DB = 0.25, -11
TEMPO = float(__import__("os").environ.get("NARR_TEMPO", "1.06"))   # 나레이션 미세 빠르기
END_PAD = float(__import__("os").environ.get("END_PAD", "3.0"))      # 끝 화면 여유(초)


def wlen(p: Path) -> float:
    with wave.open(str(p)) as w:
        return w.getnframes() / w.getframerate()


def trim(src: Path, dst: Path) -> float:
    """앞뒤 무음 정리 + 44.1k 스테레오 (빠르기 보정 없음 — 자연 속도)"""
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(src), "-af",
                    "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
                    f"atempo={TEMPO},aresample=44100,aformat=channel_layouts=stereo", str(dst)], check=True)
    return wlen(dst)


def main() -> Path:
    chosen = json.load(open(sys.argv[1], encoding="utf-8")) if len(sys.argv) > 1 else {}
    voices, prev_end = [], 0.0
    for i, (t, txt) in enumerate(J["lines"]):
        key = f"N{i:02d}"
        src = Path(chosen.get(key, HERE / "voice_sketch" / f"{key}_t1.wav"))
        if not src.exists():
            print(f"  (음성 없음) {key} {txt}"); continue
        cut = WORK / f"{key}.wav"; d = trim(src, cut)
        st = max(t, prev_end + GAP); prev_end = st + d
        print(f"{key} {t:5.1f}→{st:5.1f}s +{d:3.1f}  {txt[:30]}", flush=True)
        voices.append((st, cut, d))
    # 덕킹 구간(말하는 동안 음악 -11dB, 앞뒤 0.3초 램프)
    expr = "+".join(f"between(t,{st - 0.3:.2f},{st + d + 0.3:.2f})" for st, cut, d in voices) or "0"
    args = ["-i", str(SRC)]
    for st, cut, d in voices:
        args += ["-i", str(cut)]
    fil = f"[0:a]volume='if(gt({expr},0),{10 ** (DUCK_DB / 20):.3f},1)':eval=frame[bg];"
    for k, (st, cut, d) in enumerate(voices, 1):
        fil += f"[{k}:a]adelay={int(st * 1000)}|{int(st * 1000)},volume=1.0[v{k}];"
    fil += "[bg]" + "".join(f"[v{k}]" for k in range(1, len(voices) + 1)) + f"amix=inputs={len(voices) + 1}:normalize=0:dropout_transition=0[aout]"
    OUT.parent.mkdir(exist_ok=True)
    # 끝 화면을 END_PAD 초 붙잡아 마지막 대사가 끝나게(영상은 마지막 프레임 유지 · 음악은 그대로 끝나고 무음)
    fil = fil.replace("[0:a]volume=", "[0:a]apad,volume=")
    fil += f";[0:v]tpad=stop_mode=clone:stop_duration={END_PAD:.2f}[vout]"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args, "-filter_complex", fil, "-map", "[vout]", "-map", "[aout]",
                    "-c:v", "libx264", "-crf", "18", "-preset", "fast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(OUT)], check=True)
    print("DONE", OUT, flush=True)
    return OUT


if __name__ == "__main__":
    main()
