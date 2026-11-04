"""1분 칼럼 9:16 쇼츠판 만들기. 사용: cd yt-studio/pipeline && python jobs/1분칼럼/run_short.py 1102 [편키 …]
결과: projects/saga/column/1분칼럼/{편키}/{편키}_쇼츠.mp4 · _표지_세로.jpg · _썸네일_가로.jpg"""
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
for ep in EPS:
    if ep["key"] not in sys.argv[1:]:
        continue
    W = R / ep["key"]; W.mkdir(parents=True, exist_ok=True)
    bgd = HERE / f"{ep['key']}_bg_v"   # 받아 둔 세로 그림(v00.png …)이 있으면 먼저 복사
    if bgd.is_dir():
        (W / "bg").mkdir(exist_ok=True)
        for f in bgd.iterdir():
            if f.suffix.lower() in (".jpg", ".png") and not (W / "bg" / f.name).exists():
                shutil.copy(f, W / "bg" / f.name)
    srt = HERE / f"{ep['key']}_자막.srt"
    if srt.exists() and not (W / "자막.srt").exists():
        shutil.copy(srt, W / "자막.srt")
    r = radiocol.make_short(ep, W, cfg, F)
    print("DONE", ep["key"], r["short"], flush=True)
