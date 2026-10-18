"""7기 스케치형 롱 나레이션 — 구글 AI 스튜디오 Gemini TTS. GEMINI_API_KEY 가 있는 환경에서.
사용: cd yt-studio/pipeline && python jobs/7기홍보/gen_narration.py [takes=2]
결과: jobs/7기홍보/voice_sketch/N00_t1.wav … (24kHz mono). 줄마다 takes 개씩 → 받아쓰기로 고른다.
환경변수: TTS_MODEL (기본 gemini-3.8-flash-tts · 한도 초과 시 gemini-3.8-flash-lite-tts)"""
import base64, io, json, os, sys, time, wave
from pathlib import Path

import requests

HERE = Path(__file__).resolve().parent
KEY = os.environ.get("GEMINI_API_KEY")
if not KEY:
    raise SystemExit("GEMINI_API_KEY 없음")
J = json.load(open(HERE / "narration_sketch.json", encoding="utf-8"))
VOICE = J["voice"]
STYLE = "[warm, calm] "   # J["style"] 문장형 지시문은 3.8 TTS 가 소리 내어 읽는다 → 대괄호 태그만 (docs/gemini_models_2026-10.md)
MODEL = os.environ.get("TTS_MODEL", "gemini-3.8-flash-tts")
FALLBACK = os.environ.get("TTS_FALLBACK", "gemini-3.8-flash-lite-tts")   # 모델 없음·미지원(404/400)이면 한 번 전환
URL = "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent"   # 키는 주소에 넣지 않는다(오류 메시지에 찍히지 않게)
HDR = {"x-goog-api-key": KEY, "Content-Type": "application/json"}
TAKES = int(sys.argv[1]) if len(sys.argv) > 1 else 2
D = HERE / "voice_sketch"; D.mkdir(exist_ok=True)


def _tts(text: str, out: Path) -> float:
    body = {"contents": [{"parts": [{"text": STYLE + text}]}],
            "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}}}}
    global MODEL
    for i in range(4):
        r = requests.post(URL.format(MODEL), json=body, headers=HDR, timeout=120)
        if r.status_code == 200:
            break
        if MODEL != FALLBACK and (r.status_code == 404 or r.status_code == 400 and "model" in r.text.lower()):
            print("  모델 전환", MODEL, "→", FALLBACK, r.status_code, flush=True); MODEL = FALLBACK
            continue
        print("  재시도", r.status_code, r.text[:200], flush=True); time.sleep(5 * (i + 1))
    if r.status_code != 200:                         # raise_for_status 는 주소를 찍는다
        raise SystemExit(f"TTS 실패 {r.status_code} ({MODEL}): {r.text[:300]}")
    part = r.json()["candidates"][0]["content"]["parts"][0]["inlineData"]
    pcm = base64.b64decode(part["data"]); mime = part.get("mimeType", "audio/L16;rate=24000")
    rate = int(mime.split("rate=")[1].split(";")[0]) if "rate=" in mime else 24000
    if pcm[:4] == b"RIFF":   # 3.8 계열은 PCM 이 아니라 WAV(audio/wav)로 준다
        with wave.open(io.BytesIO(pcm)) as w: rate, pcm = w.getframerate(), w.readframes(w.getnframes())
    with wave.open(str(out), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm)
    return len(pcm) / 2 / rate


def tts(text: str, out: Path, tries: int = 3) -> float:
    """지시문까지 읽어 너무 길면 다시"""
    best = None
    for _ in range(tries):
        d = _tts(text, out)
        if d <= 0.9 + 0.22 * len(text):
            return d
        if best is None or d < best[0]:
            best = (d, out.read_bytes())
        print("  너무 김 → 다시", round(d, 1), text[:20], flush=True); time.sleep(2)
    out.write_bytes(best[1])   # 끝까지 길면 가장 짧은 테이크
    return best[0]


for i, (t, txt) in enumerate(J["lines"]):
    for k in range(1, TAKES + 1):
        out = D / f"N{i:02d}_t{k}.wav"
        if out.exists():
            continue
        d = tts(txt, out); print(f"N{i:02d}_t{k} {d:4.1f}s  {txt[:28]}", flush=True); time.sleep(1)
