"""NotebookLM(Gemini Notebook) 으로 만든 9:16 영상 다듬기 — 7기 홍보용.
  ① 끝의 Gemini Notebook 로고 꼬리 자르기  ② 1080×1920 으로 키우기  ③ SaGA 엔딩 카드(정식 명칭·일정·문의) 붙이기
  ④ 표지 0.6초 앞에 붙이기  ⑤ 배경음악이 있으면 말소리 아래로 깔기(덕킹)
사용: cd yt-studio/pipeline && python jobs/7기홍보/notebooklm.py 원본.mp4 [bgm.mp3] [--end 71.0]
결과: output/노트북LM_shorts.mp4, output/노트북LM_표지.jpg"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from sketch_shorts import end_card  # noqa: E402  (세로 엔딩 카드)
from sketch_thumbs import photo_tall  # noqa: E402
from ytauto import media, shorts  # noqa: E402
from ytauto.config import load_config  # noqa: E402
from ytauto.fonts import font_set  # noqa: E402

ROOT = Path("projects/saga/recruit/7기홍보영상")
M, A, O, W = ROOT / "media", ROOT / "assets", ROOT / "output", ROOT / "notebooklm_work"
XF = 0.5


def build(src: Path, bgm: str = "", end: float = 71.0, end_dur: float = 6.0) -> Path:
    cfg = load_config(None)
    fonts = font_set(cfg)
    W.mkdir(parents=True, exist_ok=True)
    # ① + ② 본편: 로고 꼬리 전까지, 세로 1080×1920 으로 키움 (말소리 유지)
    body = shorts.piece(W / "p00.mp4", "shorts", str(src), end + XF, fit="cover", zoom=False)
    # ③ 엔딩 카드 (새벽 도시 위 남색)
    bgf = W / "end_bg.jpg"
    media.run(["-ss", "6", "-i", str(M / "v_seoul_dawn.mp4"), "-frames:v", "1", "-q:v", "2", str(bgf)])
    card = end_card(W / "end_card.jpg", fonts, bgf)
    tail = shorts.piece(W / "p01.mp4", "shorts", str(card), end_dur, zoom=False)
    base = shorts.join_xfade([body, tail], W / "base.mp4", XF)  # 이어 붙이면 소리가 비므로 말소리는 따로 얹는다
    narr = W / "narration.wav"
    media.run(["-i", str(src), "-t", f"{end:.3f}", "-vn", "-ac", "2", "-ar", "48000", str(narr)])
    # ⑤ 음악 (있으면) — 말소리 아래로 덕킹
    mixed = W / "mixed.mp4"
    shorts.finish(base, mixed, [], audio=str(narr), bgm=bgm, bgm_volume=0.6, duck=True)
    # ④ 표지
    cover = photo_tall(O / "노트북LM_표지.jpg", M / "s_commute.png", fonts, ["주일엔 충만한데", "*월요일*엔 왜", "무너질까요?"],
                       "2027  일터선교 & 글로벌네트워크아카데미", "사가 SaGA 7기 모집  ·  10.1 ~ 11.30")
    out = O / "노트북LM_shorts.mp4"
    shorts.with_cover(mixed, cover, out)
    return out


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    end = 71.0
    if "--end" in sys.argv:
        end = float(sys.argv[sys.argv.index("--end") + 1]); args = [a for a in args if a != str(end)]
    src = Path(args[0])
    bgm = args[1] if len(args) > 1 else ""
    print("DONE", build(src, bgm, end), flush=True)
