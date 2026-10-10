"""타이포형 쇼츠 마무리 — 출근길 사진 표지(0.5초)를 맨 앞에 붙이고, 결과를 jobs/7기홍보/output/ 에 보관(깃허브에 남게).
사용: cd yt-studio/pipeline && python jobs/7기홍보/finish_typo.py [표지사진 경로] [bgm.mp3]
  표지사진 기본값: jobs/7기홍보/assets/media/s_commute.(png|jpg)  (Gemini, eps.py MEDIA['i_commute'] 프롬프트)
결과: output/타이포형_shorts_표지포함.mp4 · output/타이포_표지_S3.jpg → jobs/7기홍보/output/ 로 복사"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from sketch_thumbs import photo_tall  # noqa: E402
from ytauto import media, shorts  # noqa: E402
from ytauto.config import load_config  # noqa: E402
from ytauto.fonts import font_set  # noqa: E402

ROOT = Path("projects/saga/recruit/7기홍보영상")
JOB = Path(__file__).resolve().parent
O = ROOT / "output"
COVER_SEC, FPS = 0.5, 30


def find_cover() -> Path:
    if len(sys.argv) > 1:
        return Path(sys.argv[1])
    for ext in (".png", ".jpg"):
        p = JOB / "assets" / "media" / f"s_commute{ext}"
        if p.exists():
            return p
    raise FileNotFoundError("표지 사진이 없어요: jobs/7기홍보/assets/media/s_commute.png")


def main() -> Path:
    fonts = font_set(load_config(None))
    src = O / "타이포형_shorts.mp4"
    if not src.exists():
        raise FileNotFoundError(f"먼저 typo_shorts.py 로 {src} 를 만들어요")
    cover = photo_tall(O / "타이포_표지_S3.jpg", find_cover(), fonts,
                       ["직장을", "그만두지 않고", "선교사가 되는 *1년*"], "2027  일터선교 & 글로벌네트워크아카데미", "사가 SaGA 7기 모집  ·  10.1 ~ 11.30")
    out = O / "타이포형_shorts_표지포함.mp4"
    # 표지 정지화면 0.5초 + 무음 본편(base.mp4) → 그 위에 배경음악은 0초부터, 내레이션은 0.5초 밀어서 얹는다 (썸네일 뜨자마자 음악)
    work = ROOT / "typo_shorts_work"
    base, narration = work / "base.mp4", work / "narration.wav"
    if not (base.exists() and narration.exists()):
        raise FileNotFoundError("typo_shorts_work/base.mp4 · narration.wav 가 필요해요 — typo_shorts.py 를 먼저 돌려요")
    base2 = work / "base_cover.mp4"
    media.run(["-loop", "1", "-framerate", str(FPS), "-t", f"{COVER_SEC:.2f}", "-i", str(cover), "-i", str(base),
               "-filter_complex", f"[0:v]scale=1080:1920,setsar=1,format=yuv420p,fps={FPS}[c];[1:v]fps={FPS},setsar=1,format=yuv420p[v];[c][v]concat=n=2:v=1:a=0[vout]",
               "-map", "[vout]", "-c:v", "libx264", "-crf", "17", "-preset", "medium", "-pix_fmt", "yuv420p", str(base2)])
    bgm = sys.argv[2] if len(sys.argv) > 2 else str(JOB / "assets" / "suno_quietly_joyful_journey.mp3")
    shorts.finish(base2, out, [], audio=str(narration), audio_offset=COVER_SEC, bgm=bgm, bgm_volume=0.75, duck=True)
    keep = JOB / "output"; keep.mkdir(exist_ok=True)
    for p in (out, cover, src):
        shutil.copy2(p, keep / p.name)
    print("DONE", out, "→", keep, flush=True)
    return out


if __name__ == "__main__":
    main()
