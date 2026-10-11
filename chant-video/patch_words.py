"""특정 구간만 다시 전사해 words.json 에 채워 넣는다 (large-v3 가 통째로 건너뛴 반복 구간용)
사용법: python3 patch_words.py series/A1-4 113 170"""
import json, os, sys
from faster_whisper import WhisperModel
d, a, b = sys.argv[1].rstrip("/"), float(sys.argv[2]), float(sys.argv[3])
m = WhisperModel("large-v3", device="cpu", compute_type="int8", cpu_threads=os.cpu_count() or 4)
segs, _ = m.transcribe(f"{d}/audio16k.wav", language="ko", beam_size=5, vad_filter=False,
                       condition_on_previous_text=False, word_timestamps=True,
                       clip_timestamps=[a, b])
add = []
for s in segs:
    print(f"{s.start:7.2f} {s.end:7.2f}  {s.text.strip()}", flush=True)
    for w in (s.words or []):
        add.append({"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2)})
ws = [w for w in json.load(open(f"{d}/words.json")) if not (a <= w["s"] < b)] + add
ws.sort(key=lambda x: x["s"])
json.dump(ws, open(f"{d}/words.json", "w"), ensure_ascii=False)
print("PATCHED", len(add), "words")
