"""틀리게 읽힌 줄만 여러 번(테이크) 다시 만든다. 사용: python jobs/베이커리/gen_takes.py A05 A08 ...  → voice/A05_t1.wav … _t3.wav
«사랑의 베이커리»가 든 줄은 표기 변형(사랑에 · 띄어쓰기 없음)도 추가로 만든다."""
import os, sys, json, time, importlib.util
from pathlib import Path
HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("gv", HERE / "gen_voice_gemini.py")
src = (HERE / "gen_voice_gemini.py").read_text(encoding="utf-8").split("L = json.load")[0]   # tts 정의까지만
ns = {"__file__": str(HERE / "gen_voice_gemini.py")}; exec(src, ns)
tts = ns["tts"]
L = json.load(open(HERE / "lines.json", encoding="utf-8"))
D = HERE / "voice"; D.mkdir(exist_ok=True)
for key in sys.argv[1:]:
    tag, i = key[0], int(key[1:]); txt = L[tag][i][1].lstrip("#")
    variants = [txt, txt, txt]
    if "사랑의 베이커리" in txt: variants += [txt.replace("사랑의 베이커리", "사랑에 베이커리"), txt.replace("사랑의 베이커리", "사랑의베이커리")]
    for n, v in enumerate(variants, 1):
        out = D / f"{key}_t{n}.wav"
        if out.exists(): continue
        d = tts(v, out); print(key, n, round(d, 1), v, flush=True); time.sleep(1)
