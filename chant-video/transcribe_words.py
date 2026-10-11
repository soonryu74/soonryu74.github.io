"""음원 → 단어 단위 타임스탬프 (words.json)
사용법: python3 transcribe_words.py series/C1-4
<dir>/source.mp3 를 16kHz 로 변환한 뒤 large-v3 로 전사한다."""
import json, os, subprocess, sys
from faster_whisper import WhisperModel
d = sys.argv[1].rstrip("/")
wav = f"{d}/audio16k.wav"
if not os.path.exists(wav):
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", f"{d}/source.mp3", "-ar", "16000", "-ac", "1", wav], check=True)
m = WhisperModel("large-v3", device="cpu", compute_type="int8", cpu_threads=os.cpu_count() or 4)
segs, _ = m.transcribe(wav, language="ko", beam_size=5, vad_filter=False,
                       condition_on_previous_text=False, word_timestamps=True)
words = []
for s in segs:
    print(f"{s.start:7.2f} {s.end:7.2f}  {s.text.strip()}", flush=True)
    for w in (s.words or []):
        words.append({"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2)})
json.dump(words, open(f"{d}/words.json", "w"), ensure_ascii=False)
print("WORDS", len(words))
