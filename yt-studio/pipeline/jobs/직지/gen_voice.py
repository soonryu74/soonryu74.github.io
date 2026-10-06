"""「직지 상권을 찾습니다」 나레이션 13줄 — 일레븐랩스(ElevenLabs) 성우로. ELEVENLABS_API_KEY 가 있는 환경에서.
사용: cd yt-studio/pipeline && python jobs/직지/gen_voice.py [VOICE_ID]
결과: jobs/직지/voice/01.wav … 13.wav (44.1kHz mono · 앞뒤 빈 소리 정리)
키는 환경변수로만 읽는다 — 파일에 쓰지 않는다."""
import os, re, sys, subprocess, json
from pathlib import Path
import requests
HERE = Path(__file__).resolve().parent
KEY = os.environ.get("ELEVENLABS_API_KEY")
if not KEY: raise SystemExit("ELEVENLABS_API_KEY 없음 — 클라우드 환경변수에 넣고 그 환경에서 실행")
VOICE = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("ELEVENLABS_VOICE_ID", "")
H = {"xi-api-key": KEY}
if not VOICE:   # 목소리를 안 정했으면 한국어로 쓸 만한 목소리 목록을 보여 주고 끝
    r = requests.get("https://api.elevenlabs.io/v1/voices", headers=H, timeout=60); r.raise_for_status()
    for v in r.json()["voices"]:
        l = v.get("labels", {}); print(v["voice_id"], v["name"], l.get("gender"), l.get("age"), l.get("accent"), l.get("description"))
    raise SystemExit("VOICE_ID 를 인자로 주세요")
lines = [l.strip() for l in (HERE / "자막.srt").read_text(encoding="utf-8").split("\n") if l.strip() and not re.match(r"^\d+$", l) and "-->" not in l]
assert len(lines) == 13, len(lines)
D = HERE / "voice"; D.mkdir(exist_ok=True)
for i, t in enumerate(lines, 1):
    mp3 = D / f"{i:02d}.mp3"
    r = requests.post(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}", headers={**H, "Content-Type": "application/json"},
                      json={"text": t, "model_id": "eleven_multilingual_v2", "voice_settings": {"stability": 0.55, "similarity_boost": 0.8, "style": 0.25, "speed": 0.92}}, timeout=120)
    r.raise_for_status(); mp3.write_bytes(r.content)
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(mp3), "-af",
                    "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,apad=pad_dur=0.15",
                    "-ar", "44100", "-ac", "1", str(D / f"{i:02d}.wav")], check=True)
    print(i, t[:28], flush=True)
