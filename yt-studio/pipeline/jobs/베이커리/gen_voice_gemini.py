"""사랑의 베이커리 영상 나레이션 — 구글 AI 스튜디오 Gemini TTS. GEMINI_API_KEY 가 있는 환경에서.
사용: cd yt-studio/pipeline && python jobs/베이커리/gen_voice_gemini.py [음성이름]   (기본 Kore)
결과: jobs/베이커리/voice/A00.wav … B16.wav (24kHz mono) + voice/샘플_<음성>.wav"""
import os, sys, json, base64, wave, time
from pathlib import Path
import requests
HERE = Path(__file__).resolve().parent
KEY = os.environ.get("GEMINI_API_KEY")
if not KEY: raise SystemExit("GEMINI_API_KEY 없음")
VOICE = sys.argv[1] if len(sys.argv) > 1 else "Kore"
STYLE = os.environ.get("TTS_STYLE", "밝고 친근한 홍보 영상 내레이터처럼, 미소 띤 또렷한 목소리로, 자연스러운 한국어 억양으로 읽어 주세요: ")
SUFFIX = os.environ.get("TTS_SUFFIX", "")   # 후보 꼬리표(_v2 등)
URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key={KEY}"
def tts(text, out, tries=3):
    """길이가 글자 수에 비해 너무 길면(지시문까지 읽음) 다시 만든다"""
    for k in range(tries):
        _tts(text, out)
        with wave.open(str(out)) as w: d = w.getnframes() / w.getframerate()
        if d <= 0.9 + 0.22 * len(text): return d
        print("  너무 김 → 다시", round(d, 1), text[:20]); time.sleep(2)
    return d


def _tts(text, out):
    body = {"contents": [{"parts": [{"text": STYLE + text}]}],
            "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}}}}
    for i in range(4):
        r = requests.post(URL, json=body, timeout=120)
        if r.status_code == 200: break
        print("  재시도", r.status_code, r.text[:200]); time.sleep(5 * (i + 1))
    r.raise_for_status()
    part = r.json()["candidates"][0]["content"]["parts"][0]["inlineData"]
    pcm = base64.b64decode(part["data"]); mime = part.get("mimeType", "audio/L16;rate=24000")
    rate = int(mime.split("rate=")[1].split(";")[0]) if "rate=" in mime else 24000
    with wave.open(str(out), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm)
L = json.load(open(HERE / "lines.json", encoding="utf-8"))
D = HERE / "voice"; D.mkdir(exist_ok=True)
for tag in ("A", "B"):
    for i, (t, txt) in enumerate(L[tag]):
        out = D / f"{tag}{i:02d}{SUFFIX}.wav"
        if out.exists(): continue
        d = tts(txt, out); print(tag, i, round(d, 1), txt[:30], flush=True); time.sleep(1)
