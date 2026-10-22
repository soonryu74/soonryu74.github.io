"""두 사람 대화 나레이션을 Gemini TTS 다중 화자로 한 번에 녹음 — GEMINI_API_KEY(또는 Network secret)가 있는 환경에서 돌린다.
사용: python tts_dialog.py dialog.json OUT_DIR [takes=2]
dialog.json: {"speakers": {"Joon": {"voice": "Puck", "tag": "[upbeat]"}, "Hana": {...}},
              "lines": [["Joon", "문장"], ["Hana", "문장"], …], "chunk": 9}
결과: OUT_DIR/C0_t1.wav … (덩어리별 통째 녹음, mono). 문장별로 자르는 건 split_dialog.py 가 한다.
다중 화자가 안 되는 모델이면(400) 문장마다 한 명씩 받아 OUT_DIR/N00.wav … 로 바로 쓴다."""
import base64
import io
import json
import os
import sys
import time
import wave
from pathlib import Path

import requests

KEY = os.environ.get("GEMINI_API_KEY", "")
J = json.load(open(sys.argv[1], encoding="utf-8"))
OUT = Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
TAKES = int(sys.argv[3]) if len(sys.argv) > 3 else 2
MODEL = os.environ.get("TTS_MODEL", "gemini-3.8-flash-tts")
FALLBACK = os.environ.get("TTS_FALLBACK", "gemini-3.8-flash-lite-tts")
URL = "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent"
HDR = {"Content-Type": "application/json", **({"x-goog-api-key": KEY} if KEY else {})}
SP = J["speakers"]; LINES = J["lines"]; CH = J.get("chunk", 9)


def call(text, speech):
    global MODEL
    body = {"contents": [{"parts": [{"text": text}]}],
            "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": speech}}
    for i in range(5):
        r = requests.post(URL.format(MODEL), json=body, headers=HDR, timeout=300)
        if r.status_code == 200:
            break
        if MODEL != FALLBACK and r.status_code == 404:
            print("  모델 전환", MODEL, "→", FALLBACK, flush=True); MODEL = FALLBACK; continue
        if r.status_code == 400:
            return r
        print("  재시도", r.status_code, r.text[:200], flush=True); time.sleep(20 * (i + 1))
    if r.status_code != 200:
        sys.exit(f"TTS 실패 {r.status_code} ({MODEL}): {r.text[:300]}")
    return r


def save(r, out):
    part = r.json()["candidates"][0]["content"]["parts"][0]["inlineData"]
    pcm = base64.b64decode(part["data"]); mime = part.get("mimeType", "audio/L16;rate=24000")
    rate = int(mime.split("rate=")[1].split(";")[0]) if "rate=" in mime else 24000
    if pcm[:4] == b"RIFF":
        with wave.open(io.BytesIO(pcm)) as w:
            rate, pcm = w.getframerate(), w.readframes(w.getnframes())
    with wave.open(str(out), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm)
    return len(pcm) / 2 / rate


multi = {"multiSpeakerVoiceConfig": {"speakerVoiceConfigs": [
    {"speaker": n, "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": v["voice"]}}} for n, v in SP.items()]}}
names = list(SP)
for c0 in range(0, len(LINES), CH):
    ci = c0 // CH
    text = f"TTS the following conversation between {names[0]} and {names[1]}:\n" + "\n".join(
        f"{s}: {SP[s]['tag']} {t}" for s, t in LINES[c0:c0 + CH])
    for k in range(1, TAKES + 1):
        out = OUT / f"C{ci}_t{k}.wav"
        if out.exists():
            continue
        r = call(text, multi)
        if r.status_code == 400:                              # 다중 화자 미지원 → 문장별 단일 화자
            print("  다중 화자 400:", r.text[:200], "→ 문장별로", flush=True)
            for i, (s, t) in enumerate(LINES):
                o = OUT / f"N{i:02d}.wav"
                if not o.exists():
                    rr = call(f"{SP[s]['tag']} {t}", {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": SP[s]["voice"]}}})
                    print(o.name, round(save(rr, o), 1), flush=True); time.sleep(1)
            print("DONE single", MODEL); sys.exit(0)
        print(out.name, round(save(r, out), 1), "s", flush=True); time.sleep(2)
print("DONE", MODEL)
