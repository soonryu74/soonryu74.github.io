"""NotebookLM(Gemini Notebook) 으로 만든 9:16 영상 다듬기 — 7기 홍보용.
  ① 끝의 Gemini Notebook 로고 꼬리 자르기  ② 1080×1920 으로 키우기  ③ SaGA 엔딩 카드(정식 명칭·일정·문의) 붙이기
  ④ 표지 0.6초 앞에 붙이기  ⑤ 배경음악이 있으면 말소리 아래로 깔기(덕킹)
  ⑥ 끝 장면의 잘못된 과정명(마켓플레이스 트랜스포메이션)을 종이 카드로 덮고 정식 명칭으로, 음성도 TTS 로 바꿈(--keep-voice 면 자막만)
사용: cd yt-studio/pipeline && python jobs/7기홍보/notebooklm.py 원본.mp4 [bgm.mp3] [--end 71.0] [--keep-voice]
결과: output/노트북LM_shorts.mp4, output/노트북LM_표지.jpg"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from sketch_shorts import end_card  # noqa: E402  (세로 엔딩 카드)
from sketch_thumbs import photo_tall  # noqa: E402
from PIL import Image, ImageDraw, ImageFilter, ImageFont  # noqa: E402
from ytauto import media, shorts, tts  # noqa: E402
from ytauto.config import load_config  # noqa: E402
from ytauto.fonts import font_set  # noqa: E402

ROOT = Path("projects/saga/recruit/7기홍보영상")
M, A, O, W = ROOT / "media", ROOT / "assets", ROOT / "output", ROOT / "notebooklm_work"
XF = 0.5


POSTER_AT, SAY_AT = 65.0, 64.8  # 램프 포스터가 뜨는 시각, 마지막 문장이 시작되는 시각
FIX_SAY = "일터의 진짜 의미를 찾아주는, 일터선교 글로벌네트워크아카데미 7기. 지금 바로 합류하세요."


def poster_overlay(out: Path, fonts: dict) -> Path:
    """램프 포스터의 글자(마켓플레이스 트랜스포메이션 7기)와 그 아래 자막을 종이 카드로 덮고 정식 명칭을 쓴다."""
    W, H = 1080, 1920
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    box = (70, 770, W - 70, 1470)
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((box[0] + 6, box[1] + 10, box[2] + 6, box[3] + 10), 34, fill=(60, 40, 20, 110))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(10)))
    d.rounded_rectangle(box, 34, fill=(236, 220, 188, 255), outline=(205, 182, 140, 255), width=3)
    navy = (38, 52, 88)
    f = ImageFont.truetype(fonts["bold"], 92)
    y = 820
    for ln in ["일터선교 &", "글로벌네트워크", "아카데미 7기"]:
        d.text((W / 2 + 3, y + 4), ln, font=f, fill=(120, 95, 60, 120), anchor="ma")
        d.text((W / 2, y), ln, font=f, fill=navy + (255,), anchor="ma")
        y += 118
    sf = ImageFont.truetype(fonts["subtitle"], 34)
    d.text((W / 2, 1200), "SCHOOL OF MARKETPLACE MISSION & GLOBAL NETWORK  ·  사랑글로벌아카데미 SaGA", font=ImageFont.truetype(fonts["subtitle"], 24),
           fill=(110, 90, 60, 255), anchor="ma")
    # 원본 자막 상자와 같은 모양의 흰 상자
    cap = "일터의 진짜 의미를 찾아주는 곳  ·  지금 바로 합류하세요"
    cf = ImageFont.truetype(fonts["bold"], 38)
    tw = cf.getlength(cap)
    d.rounded_rectangle((W / 2 - tw / 2 - 28, 1330, W / 2 + tw / 2 + 28, 1420), 10, fill=(255, 255, 255, 255))
    d.text((W / 2, 1375), cap, font=cf, fill=(30, 34, 48, 255), anchor="mm")
    im.save(out)
    return out


def build(src: Path, bgm: str = "", end: float = 71.0, end_dur: float = 6.0, keep_voice: bool = False) -> Path:
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
    if keep_voice:
        media.run(["-i", str(src), "-t", f"{end:.3f}", "-vn", "-ac", "2", "-ar", "48000", str(narr)])
    else:  # ⑥ 마지막 문장을 정식 명칭으로 다시 읽는다
        tcfg = dict(cfg["tts"]); tcfg.update(voice="ko-KR-SunHiNeural", pitch="-8Hz", rate="+4%")
        fix = W / "fix.mp3"
        tts.synthesize(FIX_SAY, fix, tcfg)
        media.run(["-i", str(src), "-i", str(fix), "-filter_complex",
                   f"[0:a]atrim=0:{SAY_AT:.3f},asetpts=N/SR/TB,aresample=48000,aformat=channel_layouts=stereo[a0];"
                   f"[1:a]aresample=48000,aformat=channel_layouts=stereo[a1];[a0][a1]concat=n=2:v=0:a=1,apad[a]",
                   "-map", "[a]", "-t", f"{end + XF + end_dur:.3f}", str(narr)])
    ov = [(poster_overlay(W / "poster_fix.png", fonts), POSTER_AT, end + XF)]
    # ⑤ 음악 (있으면) — 말소리 아래로 덕킹
    mixed = W / "mixed.mp4"
    shorts.finish(base, mixed, ov, audio=str(narr), bgm=bgm, bgm_volume=0.6, duck=True)
    # ④ 표지
    # 쇼츠5(출근길)와 겹치지 않게 퇴근길 가방 장면
    cover = photo_tall(O / "노트북LM_표지.jpg", M / "s_bag_evening.png", fonts, ["주일엔 충만한데", "*월요일*엔 왜", "무너질까요?"],
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
    print("DONE", build(src, bgm, end, keep_voice="--keep-voice" in sys.argv), flush=True)
