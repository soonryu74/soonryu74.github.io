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
STYLE = "따뜻하고 차분한 전문 성우가 베이커리 홍보 영상 내레이션을 읽듯, 또박또박 자연스러운 한국어 억양으로, 조금 느리게: "
URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key={KEY}"
def tts(text, out):
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
        out = D / f"{tag}{i:02d}.wav"
        if out.exists(): continue
        tts(txt, out); print(tag, i, txt[:30], flush=True); time.sleep(1)
