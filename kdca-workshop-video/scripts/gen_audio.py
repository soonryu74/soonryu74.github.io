"""내레이션(TTS)·배경음악 생성. 사용: python3 scripts/gen_audio.py [tts|music] """
import base64, json, subprocess, sys, urllib.request, os
BASE = "https://generativelanguage.googleapis.com/v1beta/models/"
KEY = os.environ.get("GEMINI_API_KEY", "dummy")
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "audio")

def call(model, body):
    req = urllib.request.Request(BASE + model + ":generateContent", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", "x-goog-api-key": KEY})
    try:
        return json.load(urllib.request.urlopen(req, timeout=600))
    except urllib.error.HTTPError as e:
        print("HTTP", e.code, e.read().decode()[:800]); raise

def save_part(resp, name):
    for p in resp["candidates"][0]["content"]["parts"]:
        if "inlineData" in p:
            mime = p["inlineData"]["mimeType"]; raw = base64.b64decode(p["inlineData"]["data"])
            print(name, mime, len(raw))
            dst = os.path.join(OUT, name + ".mp3")
            if "L16" in mime or "pcm" in mime:
                subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", "-", "-b:a", "160k", dst], input=raw, check=True)
            else:
                subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", "-", "-b:a", "192k", dst], input=raw, check=True)
            return
        elif "text" in p: print(name, "text:", p["text"][:200])

NARR = {c["id"]: c["ko"].replace("|", " ") for c in json.load(open(os.path.join(os.path.dirname(__file__), "..", "src", "narration.json")))}
VOICE = os.environ.get("VOICE", "Charon")
MUSIC = {
 "m1_news": "Instrumental only, no vocals. Fast-tempo broadcast news opening theme, 128 bpm, urgent staccato strings, bold brass stabs, timpani hits, ticking percussion, confident and trustworthy, ends on a strong final hit.",
 "m2_beat": "Instrumental only, no vocals. Driving modern corporate documentary underscore, 110 bpm, steady electronic beat, pulsing synth bass, bright piano motif, light strings, dynamic and optimistic sense of progress through time, consistent energy, loopable.",
 "m3_climax": "Instrumental only, no vocals. Emotional cinematic climax, 80 bpm, warm solo piano opening that builds into soaring full orchestra strings and gentle choir pads, feeling of pride, devotion and gratitude, hopeful resolution with a soft ending.",
}
mode = sys.argv[1]; only = sys.argv[2:] 
if mode == "tts":
    import time
    for k, t in NARR.items():
        if only and k not in only: continue
        for attempt in range(8):
            try:
                r = call("gemini-3.8-flash-tts", {"contents": [{"parts": [{"text": t}]}],
                    "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}}}})
                save_part(r, k); break
            except Exception as e:
                time.sleep(20 + attempt * 10)
    # 길이(프레임) 기록
    dur = {}
    for k in NARR:
        f = os.path.join(OUT, k + ".mp3")
        if os.path.exists(f):
            d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True).stdout)
            dur[k] = round(d * 30)
    json.dump(dur, open(os.path.join(os.path.dirname(__file__), "..", "src", "durations.json"), "w"), indent=1)
else:
    model = os.environ.get("MUSIC_MODEL", "lyria-3.5")
    for k, t in MUSIC.items():
        if only and k not in only: continue
        r = call(model, {"contents": [{"parts": [{"text": t}]}], "generationConfig": {"responseModalities": ["AUDIO"]}})
        save_part(r, k)
