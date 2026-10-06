"""장면 그림을 구글(Gemini)로 만들어 jobs/1분칼럼/{편키}_bg/ 에 저장 — GEMINI_API_KEY 가 있는 환경에서 실행.
사용: cd yt-studio/pipeline && python jobs/1분칼럼/gen_bg.py 1005
결과: jobs/1분칼럼/1005_bg/h00.png … h10.png (장면 순서). run.py 는 이 폴더가 있으면 projects/.../bg/ 로 복사해 쓴다."""
import os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parent))
if not os.environ.get("GEMINI_API_KEY"):
    raise SystemExit("GEMINI_API_KEY 없음 — 구글 키가 있는 환경에서 실행하세요 (무료 서비스로 대체하지 않음)")
from ytauto import radiocol
from ytauto.config import load_config
from eps import EPS, HERE
cfg = load_config(None)
for ep in EPS:
    if ep["key"] not in sys.argv[1:]:
        continue
    D = HERE / f"{ep['key']}_bg"; D.mkdir(exist_ok=True)
    for i, sc in enumerate(ep["scenes"]):
        out = D / f"h{i:02d}.jpg"
        r = radiocol.photo(sc["prompt"], out, (1920, 1080), cfg)
        print(i, r, flush=True)
