"""7기 스케치형 롱 나레이션 — 구글 AI 스튜디오 Gemini TTS. GEMINI_API_KEY 가 있는 환경에서.
사용: cd yt-studio/pipeline && python jobs/7기홍보/gen_narration.py [takes=2]
결과: jobs/7기홍보/voice_sketch/N00_t1.wav … (24kHz mono). 줄마다 takes 개씩 → 받아쓰기로 고른다.
환경변수: TTS_MODEL (기본 gemini-2.5-flash-preview-tts · 한도 초과 시 gemini-2.5-pro-preview-tts)"""
import base64, json, os, sys, time, wave
from pathlib import Path

import requests

HERE = Path(__file__).resolve().parent
KEY = os.environ.get("GEMINI_API_KEY")
if not KEY:
    raise SystemExit("GEMINI_API_KEY 없음")
J = json.load(open(HERE / "narration_sketch.json", encoding="utf-8"))
VOICE, STYLE = J["voice"], J["style"]
MODEL = os.environ.get("TTS_MODEL", "gemini-2.5-flash-preview-tts")
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={KEY}"
TAKES = int(sys.argv[1]) if len(sys.argv) > 1 else 2
D = HERE / "voice_sketch"; D.mkdir(exist_ok=True)


def _tts(text: str, out: Path) -> float:
    body = {"contents": [{"parts": [{"text": STYLE + text}]}],
            "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}}}}
    for i in range(4):
        r = requests.post(URL, json=body, timeout=120)
        if r.status_code == 200:
            break
        print("  재시도", r.status_code, r.text[:200], flush=True); time.sleep(5 * (i + 1))
    r.raise_for_status()
    part = r.json()["candidates"][0]["content"]["parts"][0]["inlineData"]
    pcm = base64.b64decode(part["data"]); mime = part.get("mimeType", "audio/L16;rate=24000")
    rate = int(mime.split("rate=")[1].split(";")[0]) if "rate=" in mime else 24000
    with wave.open(str(out), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm)
    return len(pcm) / 2 / rate


def tts(text: str, out: Path, tries: int = 3) -> float:
    """지시문까지 읽어 너무 길면 다시"""
    d = 0.0
    for _ in range(tries):
        d = _tts(text, out)
        if d <= 0.9 + 0.22 * len(text):
            return d
        print("  너무 김 → 다시", round(d, 1), text[:20], flush=True); time.sleep(2)
    return d


for i, (t, txt) in enumerate(J["lines"]):
    for k in range(1, TAKES + 1):
        out = D / f"N{i:02d}_t{k}.wav"
        if out.exists():
            continue
        d = tts(txt, out); print(f"N{i:02d}_t{k} {d:4.1f}s  {txt[:28]}", flush=True); time.sleep(1)
