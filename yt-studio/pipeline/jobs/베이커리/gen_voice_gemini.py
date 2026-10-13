"""사랑의 베이커리 영상 나레이션 — 구글 AI 스튜디오 Gemini TTS. GEMINI_API_KEY 가 있는 환경에서.
사용: cd yt-studio/pipeline && python jobs/베이커리/gen_voice_gemini.py [음성이름]   (기본 Kore)
결과: jobs/베이커리/voice/A00.wav … B16.wav (24kHz mono) + voice/샘플_<음성>.wav"""
import io, os, sys, json, base64, wave, time
from pathlib import Path
import requests
HERE = Path(__file__).resolve().parent
KEY = os.environ.get("GEMINI_API_KEY")
if not KEY: raise SystemExit("GEMINI_API_KEY 없음")
VOICE = sys.argv[1] if len(sys.argv) > 1 else "Kore"
STYLE = os.environ.get("TTS_STYLE", "[bright, friendly] ")   # 3.8 TTS 는 문장형 지시문을 소리 내어 읽는다 → 대괄호 태그만 (docs/gemini_models_2026-10.md)
SUFFIX = os.environ.get("TTS_SUFFIX", "")   # 후보 꼬리표(_v2 등)
MODEL = os.environ.get("TTS_MODEL", "gemini-3.8-flash-tts")   # 일일 한도 초과 시 gemini-3.8-flash-lite-tts
FALLBACK = os.environ.get("TTS_FALLBACK", "gemini-3.8-flash-lite-tts")   # 모델 없음·미지원(404/400)이면 한 번 전환
URL = "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key=" + KEY
def tts(text, out, tries=3):
    """길이가 글자 수에 비해 너무 길면(지시문까지 읽음) 다시 만든다"""
    best = None
    for k in range(tries):
        _tts(text, out)
        with wave.open(str(out)) as w: d = w.getnframes() / w.getframerate()
        if d <= 0.9 + 0.22 * len(text): return d
        if best is None or d < best[0]: best = (d, out.read_bytes())
        print("  너무 김 → 다시", round(d, 1), text[:20]); time.sleep(2)
    out.write_bytes(best[1])   # 끝까지 길면 가장 짧은 테이크
    return best[0]


def _tts(text, out):
    body = {"contents": [{"parts": [{"text": STYLE + text}]}],
            "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}}}}
    global MODEL
    for i in range(4):
        r = requests.post(URL.format(MODEL), json=body, timeout=120)
        if r.status_code == 200: break
        if MODEL != FALLBACK and (r.status_code == 404 or r.status_code == 400 and "model" in r.text.lower()):
            print("  모델 전환", MODEL, "→", FALLBACK, r.status_code); MODEL = FALLBACK; continue
        print("  재시도", r.status_code, r.text[:200]); time.sleep(5 * (i + 1))
    r.raise_for_status()
    part = r.json()["candidates"][0]["content"]["parts"][0]["inlineData"]
    pcm = base64.b64decode(part["data"]); mime = part.get("mimeType", "audio/L16;rate=24000")
    rate = int(mime.split("rate=")[1].split(";")[0]) if "rate=" in mime else 24000
    if pcm[:4] == b"RIFF":   # 3.8 계열은 PCM 이 아니라 WAV(audio/wav)로 준다
        with wave.open(io.BytesIO(pcm)) as w: rate, pcm = w.getframerate(), w.readframes(w.getnframes())
    with wave.open(str(out), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm)
L = json.load(open(HERE / "lines.json", encoding="utf-8"))
D = HERE / "voice"; D.mkdir(exist_ok=True)
for tag in ("A", "B"):
    for i, (t, txt) in enumerate(L[tag]):
        out = D / f"{tag}{i:02d}{SUFFIX}.wav"
        if out.exists(): continue
        d = tts(txt, out); print(tag, i, round(d, 1), txt[:30], flush=True); time.sleep(1)
