"""문장마다 Gemini TTS 녹음 — GEMINI_API_KEY 가 있는 환경(자식 세션)에서 돌린다.
사용: python tts_lines.py narration.json OUT_DIR [takes=2]
narration.json: {"voice": "Kore", "tag": "[warm, calm]", "lines": ["문장1", "문장2", …]}
결과: OUT_DIR/N00_t1.wav … (mono). 문장형 지시문은 모델이 소리 내 읽으므로 대괄호 태그만 붙인다.
너무 길게 나온 테이크(지시문까지 읽은 것)는 다시 받고, 끝까지 길면 가장 짧은 것을 남긴다.
환경변수: TTS_MODEL (기본 gemini-3.8-flash-tts) · TTS_FALLBACK (gemini-3.8-flash-lite-tts)"""
import base64
import io
import json
import os
import sys
import time
import wave
from pathlib import Path

import requests

KEY = os.environ.get("GEMINI_API_KEY") or sys.exit("GEMINI_API_KEY 없음")
J = json.load(open(sys.argv[1], encoding="utf-8"))
OUT = Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
TAKES = int(sys.argv[3]) if len(sys.argv) > 3 else 2
TAG = J.get("tag", "[warm, calm]") + " "
MODEL = os.environ.get("TTS_MODEL", "gemini-3.8-flash-tts")
FALLBACK = os.environ.get("TTS_FALLBACK", "gemini-3.8-flash-lite-tts")
URL = "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key=" + KEY


def _tts(text: str, out: Path) -> float:
    global MODEL
    body = {"contents": [{"parts": [{"text": TAG + text}]}],
            "generationConfig": {"responseModalities": ["AUDIO"],
                                 "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": J.get("voice", "Kore")}}}}}
    for i in range(4):
        r = requests.post(URL.format(MODEL), json=body, timeout=120)
        if r.status_code == 200:
            break
        if MODEL != FALLBACK and (r.status_code == 404 or r.status_code == 400 and "model" in r.text.lower()):
            print("  모델 전환", MODEL, "→", FALLBACK, r.status_code, flush=True); MODEL = FALLBACK
            continue
        print("  재시도", r.status_code, r.text[:200], flush=True); time.sleep(5 * (i + 1))
    r.raise_for_status()
    part = r.json()["candidates"][0]["content"]["parts"][0]["inlineData"]
    pcm = base64.b64decode(part["data"]); mime = part.get("mimeType", "audio/L16;rate=24000")
    rate = int(mime.split("rate=")[1].split(";")[0]) if "rate=" in mime else 24000
    if pcm[:4] == b"RIFF":
        with wave.open(io.BytesIO(pcm)) as w:
            rate, pcm = w.getframerate(), w.readframes(w.getnframes())
    with wave.open(str(out), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm)
    return len(pcm) / 2 / rate


def tts(text: str, out: Path, tries: int = 3) -> float:
    best = None
    for _ in range(tries):
        d = _tts(text, out)
        if d <= 0.9 + 0.22 * len(text):
            return d
        if best is None or d < best[0]:
            best = (d, out.read_bytes())
        print("  너무 김 → 다시", round(d, 1), text[:20], flush=True); time.sleep(2)
    out.write_bytes(best[1])
    return best[0]


for i, txt in enumerate(J["lines"]):
    for k in range(1, TAKES + 1):
        out = OUT / f"N{i:02d}_t{k}.wav"
        if out.exists():
            continue
        d = tts(txt, out); print(f"N{i:02d}_t{k} {d:4.1f}s  {txt[:30]}", flush=True); time.sleep(1)
print("DONE", MODEL)
