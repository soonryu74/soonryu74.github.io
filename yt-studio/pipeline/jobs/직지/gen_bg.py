"""「직지 상권을 찾습니다」 실사용 AI 그림 — 구글(Gemini)로 만들어 jobs/직지/bg/ 에 저장. GEMINI_API_KEY 가 있는 환경에서.
사용: cd yt-studio/pipeline && python jobs/직지/gen_bg.py [키 …]    (비우면 14장 전부)"""
import json, os, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1]))
if not os.environ.get("GEMINI_API_KEY"):
    raise SystemExit("GEMINI_API_KEY 없음 — 무료 서비스로 대체하지 않음")
from ytauto import visuals
from ytauto.config import load_config
cfg = load_config(None)
P = json.load(open(HERE / "prompts.json", encoding="utf-8"))
D = HERE / "bg"; D.mkdir(exist_ok=True)
for k, prompt in P.items():
    if sys.argv[1:] and k not in sys.argv[1:]: continue
    out = D / f"{k}.png"
    if out.exists() and out.stat().st_size > 5000: print(k, "있음"); continue
    r = visuals._gemini_image(prompt, out, "long", cfg.get("visual", {}))
    print(k, r, flush=True)
