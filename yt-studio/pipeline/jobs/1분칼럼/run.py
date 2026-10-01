"""1분 칼럼 5편(16:9) 다시 만들기. GEMINI_API_KEY 가 있으면 구글 그림, 없으면 무료 그림.
사용: cd yt-studio/pipeline && python jobs/1분칼럼/run.py [편키 …]   (예: 0824 0921, 비우면 5편 전부)"""
import shutil, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from ytauto import radiocol
from ytauto.fonts import font_set
from ytauto.config import load_config
sys.path.insert(0, str(Path(__file__).resolve().parent))
from eps import EPS, HERE
cfg = load_config(None); F = font_set(cfg)
R = Path("projects/saga/column/1분칼럼")
only = sys.argv[1:]
for ep in EPS:
    if only and ep["key"] not in only:
        continue
    W = R / ep["key"]; W.mkdir(parents=True, exist_ok=True)
    srt = HERE / f"{ep['key']}_자막.srt"
    if srt.exists() and not (W / "자막.srt").exists():
        shutil.copy(srt, W / "자막.srt")
    r = radiocol.make_wide(ep, W, cfg, F)
    print("DONE", ep["key"], r["video"], flush=True)
