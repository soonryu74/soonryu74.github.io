"""7기 모집 홍보 영상 만들기.  cd yt-studio/pipeline && python jobs/7기홍보/run.py [media|make|all] [대본이름 …]
  media : AI 장면 재료 만들기 (Gemini 그림, Veo 8초 클립 — 이미 있으면 건너뜀)
  make  : 대본 → 영상 (풀버전은 16:9, 쇼츠는 9:16)
결과: projects/saga/recruit/7기홍보영상/output/*.mp4"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from eps import MEDIA, RECIPES
from ytauto import compose, radiocol, visuals
from ytauto.config import load_config
from ytauto.fonts import font_set

ROOT = Path("projects/saga/recruit/7기홍보영상")
MEDIA_DIR, RECIPE_DIR = ROOT / "media", ROOT / "recipes"


def build_media(cfg: dict, only: set[str]) -> None:
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    vis = cfg.get("visual", {})
    for name, (kind, prompt) in MEDIA.items():
        if only and name not in only:
            continue
        if kind == "veo":
            out = MEDIA_DIR / f"{name}.mp4"
            if not out.exists():
                print("VEO", name, flush=True)
                visuals._veo(prompt, out, "long", vis)
        else:
            for tag, size in (("i", (1920, 1080)), ("s", (1080, 1920))):  # 가로용 i_*, 쇼츠용 s_*
                out = MEDIA_DIR / f"{tag}{name[1:]}.jpg"
                if not (out.exists() or out.with_suffix(".png").exists()):
                    print("IMG", out.name, flush=True)
                    radiocol.photo(prompt, out, size, cfg)


def write_recipes() -> None:
    RECIPE_DIR.mkdir(parents=True, exist_ok=True)
    for name, r in RECIPES.items():
        rr = json.loads(json.dumps(r, ensure_ascii=False))
        for b in rr["beats"]:  # 그림은 png 로 저장될 수 있으니 있는 쪽으로
            src = b.get("src", "")
            if src.endswith(".jpg") and not (ROOT / src).exists() and (ROOT / src).with_suffix(".png").exists():
                b["src"] = src[:-4] + ".png"
        (RECIPE_DIR / f"{name}.json").write_text(json.dumps(rr, ensure_ascii=False, indent=1), encoding="utf-8")


def make(cfg: dict, fonts: dict, only: set[str]) -> None:
    write_recipes()
    for name in RECIPES:
        if only and name not in only:
            continue
        fmt = "long" if name == "풀버전" else "shorts"
        out = compose.render(RECIPE_DIR / f"{name}.json", cfg, fonts, fmt)
        print("DONE", name, out, flush=True)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "all"
    only = set(sys.argv[2:])
    cfg = load_config(None)
    if cmd in ("media", "all"):
        build_media(cfg, only)
    if cmd in ("make", "all"):
        make(cfg, font_set(cfg), only)
