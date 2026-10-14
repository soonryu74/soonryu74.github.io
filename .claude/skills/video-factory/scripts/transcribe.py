"""받아쓰기 — faster-whisper. 영상·음성 → 문장(+단어) 시각 JSON.
사용: python transcribe.py IN.(mp4|mov|wav|m4a) OUT.json [--model small|medium] [--words] [--prompt "용어 힌트"]
  · 파일 경로를 whisper 에 바로 주면 PyAV 버전 충돌이 나서, ffmpeg 로 16kHz 모노를 뽑아 numpy 배열로 넘긴다.
  · --prompt 는 고유명사 힌트. 너무 길면 같은 문장을 되풀이하는 환각이 생기니 한 줄로.
결과: [{"s":시작,"e":끝,"t":"문장","w":[[s,e,"단어"],…]}, …]  (w 는 --words 일 때만)"""
from __future__ import annotations

import argparse
import subprocess

import numpy as np

from common import save


def pcm16k(src: str) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", src, "-vn", "-ac", "1", "-ar", "16000",
                          "-f", "s16le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("out")
    ap.add_argument("--model", default="small"); ap.add_argument("--words", action="store_true")
    ap.add_argument("--prompt", default=None); ap.add_argument("--lang", default="ko")
    a = ap.parse_args()
    from faster_whisper import WhisperModel
    m = WhisperModel(a.model, device="cpu", compute_type="int8")
    segs, _ = m.transcribe(pcm16k(a.src), language=a.lang, beam_size=5, word_timestamps=a.words,
                           vad_filter=True, vad_parameters={"min_silence_duration_ms": 400},
                           condition_on_previous_text=False, initial_prompt=a.prompt)
    res = []
    for s in segs:
        r = {"s": round(s.start, 2), "e": round(s.end, 2), "t": s.text.strip()}
        if a.words:
            r["w"] = [[round(w.start, 2), round(w.end, 2), w.word.strip()] for w in s.words]
        res.append(r)
        print(f"{s.start:7.1f} {s.end:7.1f} {r['t']}", flush=True)
    save(res, a.out)
    print("DONE", a.out, len(res), flush=True)


if __name__ == "__main__":
    main()
