"""talk-studio 샘플 — 실제 촬영 영상 없이 틀만 보여 주는 시범본.
가짜 작업실 + 그림 인물(실존 인물 아님) 위에 엣지 TTS 나레이션 · 카드 · 슬라이드 · 모아보기 · 키워드 자막 · 썸네일.
사용: python sample.py OUTDIR"""
from __future__ import annotations

import asyncio
import json
import math
import os
import random
import subprocess
import sys
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
import talk  # noqa: E402
from talk import F, W, H, FPS, ff  # noqa: E402

OUT = Path(sys.argv[1]).resolve(); OUT.mkdir(parents=True, exist_ok=True)
VOICE = "ko-KR-SunHiNeural"
# (말, 자막[*강조*], 장면)
LINES = [
    ("매주 월요일, 엑셀 정리에 두 시간씩 쓰고 계시죠?", "매주 월요일, 엑셀 정리에\n*두 시간*씩 쓰고 계시죠?",
     {"mode": "face", "card": {"kicker": "every monday", "title": "월요일 아침 *두 시간*", "items": ["부서별 시트 합치기", "합계·평균 다시 계산", "보고서 양식에 옮기기"]}}),
    ("오늘은 이 일을 AI 비서에게 넘기는 방법을 보여드릴게요.", "오늘은 이 일을\n*AI 비서*에게 넘기는 방법", None),
    ("방법은 딱 세 단계예요. 반복을 찾고, 말로 시키고, 확인만 하면 됩니다.", "방법은 딱 *세 단계*예요\n반복 찾기 · 말로 시키기 · 확인",
     {"mode": "slide", "slide": {"kicker": "3 steps", "title": "AI 비서에게 넘기는 *3단계*", "cards": ["① 반복\n*찾기*", "② 말로\n*시키기*", "③ 확인만\n*하기*"], "gold": 2,
                                 "note": "엑셀 · 구글시트 · PPT 어디서나 같은 순서예요"}}),
    ("어렵지 않아요. 코드를 몰라도, 평소 말투로 부탁하면 됩니다.", "코드를 몰라도\n*평소 말투*로 부탁하면 됩니다",
     {"mode": "slide", "slide": {"kicker": "no code", "title": "코드 대신 *평소 말투*로",
                                 "quote": "지난주 시트 세 개를 *하나로* 합치고,\n부서별 *합계 표*를 만들어 줘", "note": "이렇게 한 문장이면 충분해요"}}),
    ("처음엔 틀릴 수도 있어요. 그럴 땐 어디가 틀렸는지만 말해 주세요.", "처음엔 틀릴 수도 있어요\n*틀린 곳*만 말해 주세요",
     {"mode": "face", "card": {"kicker": "try → check → fix", "title": "틀려도 *괜찮아요*", "items": ["한 번 시켜 본다", "결과를 눈으로 본다", "틀린 곳만 *다시 말한다*"]}}),
    ("이렇게 한 번만 익혀 두면, 매주 두 시간이 오 분으로 줄어듭니다.", "한 번만 익혀 두면\n두 시간이 *5분*으로",
     {"mode": "grid", "kicker": "all in one", "title": "오늘 다룬 것 *한눈에*", "highlight": [2, 6, 8]}),
    ("여러분도 할 수 있어요. 다음 영상에서 실제 화면으로 같이 해 봐요.", "여러분도 *할 수 있어요*\n다음 영상에서 같이 해 봐요", {"mode": "face"}),
]
GAP, HEAD, TAIL = 0.35, 0.5, 1.2


async def _tts(txt: str, mp3: Path) -> None:
    import edge_tts
    await edge_tts.Communicate(txt, voice=VOICE, rate="-4%", pitch="-2Hz", proxy=os.environ.get("HTTPS_PROXY")).save(str(mp3))


def gemini_tts(txt: str, wav: Path) -> None:
    """GEMINI_API_KEY 가 있으면 Gemini TTS(Kore). 3.8 계열은 WAV 통째, 예전 모델은 PCM 으로 준다 — 둘 다 처리"""
    import base64, io, time
    import requests
    key = os.environ["GEMINI_API_KEY"]
    style = "따뜻하고 차분한 선생님 말투로, 또렷하고 자연스러운 한국어 억양으로 읽어 주세요: "
    body = {"contents": [{"parts": [{"text": style + txt}]}],
            "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": "Kore"}}}}}
    for model in (os.environ.get("TTS_MODEL", "gemini-3.8-flash-tts"), "gemini-3.8-flash-lite-tts"):
        for _ in range(3):
            r = requests.post(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                              json=body, headers={"x-goog-api-key": key}, timeout=120)
            if r.status_code != 200:
                print("  재시도", model, r.status_code, r.text[:160], flush=True); time.sleep(4); continue
            data = base64.b64decode(r.json()["candidates"][0]["content"]["parts"][0]["inlineData"]["data"])
            rate = 24000
            if data[:4] == b"RIFF":
                with wave.open(io.BytesIO(data)) as w:
                    rate, data = w.getframerate(), w.readframes(w.getnframes())
            d = len(data) / 2 / rate
            if d > 1.0 + 0.24 * len(txt):  # 지시문까지 읽으면 다시
                print("  너무 김 → 다시", round(d, 1), flush=True); continue
            with wave.open(str(wav), "wb") as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(data)
            return
    raise RuntimeError("Gemini TTS 실패: " + txt[:20])


def narration() -> tuple[Path, list[tuple[float, float]]]:
    vd = OUT / "voice"; vd.mkdir(exist_ok=True)
    spans, t, wavs = [], HEAD, []
    for i, (txt, _, _) in enumerate(LINES):
        wav = vd / f"L{i:02d}.wav"
        if not wav.exists():
            mp3 = vd / f"L{i:02d}.mp3"
            if os.environ.get("GEMINI_API_KEY"):
                gemini_tts(txt, vd / f"L{i:02d}_raw.wav"); mp3 = vd / f"L{i:02d}_raw.wav"
            else:
                asyncio.run(_tts(txt, mp3))
            ff(["-i", str(mp3), "-af", "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse",
                "-ar", "48000", "-ac", "1", str(wav)])
        with wave.open(str(wav)) as w:
            d = w.getnframes() / w.getframerate()
        spans.append((t, t + d)); wavs.append((t, wav)); t += d + GAP
    total = spans[-1][1] + TAIL
    ins, fil = [], ""
    for k, (st, wav) in enumerate(wavs):
        ins += ["-i", str(wav)]
        fil += f"[{k}:a]adelay={int(st * 1000)}|{int(st * 1000)}[a{k}];"
    fil += "".join(f"[a{k}]" for k in range(len(wavs))) + f"amix=inputs={len(wavs)}:normalize=0,apad,atrim=0:{total:.2f}[o]"
    nar = OUT / "narration.wav"
    ff([*ins, "-filter_complex", fil, "-map", "[o]", "-ar", "48000", str(nar)])
    return nar, spans


def studio(total: float) -> tuple[Path, list[int]]:
    """가짜 작업실 + 그림 인물 (실존 인물 아님)"""
    random.seed(7)
    bg = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(bg)
    for y in range(H):  # 따뜻한 벽
        k = y / H
        d.line([(0, y), (W, y)], fill=(int(214 - 60 * k), int(190 - 58 * k), int(156 - 50 * k)))
    d.rectangle((1380, 0, W, 900), fill=(14, 20, 38))  # 밤 창
    for _ in range(140):
        x, y, r = random.randint(1390, W - 10), random.randint(260, 880), random.randint(2, 6)
        c = random.choice([(255, 214, 140), (255, 240, 200), (150, 190, 255)])
        d.ellipse((x - r, y - r, x + r, y + r), fill=c)
    d.rectangle((1372, 0, 1392, 900), fill=(60, 52, 44)); d.rectangle((1640, 0, 1652, 900), fill=(60, 52, 44))
    d.rectangle((0, 900, W, H), fill=(88, 70, 54))  # 책상
    bg = bg.filter(ImageFilter.GaussianBlur(3))
    lab = ImageDraw.Draw(bg); lf = F("semi", 26)
    lab.rounded_rectangle((40, 980, 40 + lf.getlength("샘플 인물 · 실제 촬영 영상이 들어갈 자리") + 40, 1030), 12, fill=(0, 0, 0))
    lab.text((60, 988), "샘플 인물 · 실제 촬영 영상이 들어갈 자리", font=lf, fill=(255, 255, 255))
    bgp = OUT / "studio_bg.png"; bg.save(bgp)
    fig = Image.new("RGBA", (900, 900), (0, 0, 0, 0))  # 그림 인물: 어깨 + 머리 + 마이크
    fd = ImageDraw.Draw(fig)
    fd.ellipse((140, 520, 760, 1160), fill=(34, 40, 56, 255))
    fd.rounded_rectangle((385, 380, 515, 560), 40, fill=(196, 170, 150, 255))
    fd.ellipse((300, 120, 600, 450), fill=(206, 180, 160, 255))
    fd.chord((290, 100, 610, 380), 180, 360, fill=(40, 34, 32, 255))
    fd.ellipse((380, 270, 404, 294), fill=(50, 40, 36, 255)); fd.ellipse((496, 270, 520, 294), fill=(50, 40, 36, 255))
    fd.arc((400, 320, 500, 390), 20, 160, fill=(120, 70, 60, 255), width=6)
    fd.line([(150, 900), (230, 560), (330, 520)], fill=(26, 26, 30, 255), width=14)
    fd.rounded_rectangle((300, 470, 380, 640), 30, fill=(22, 22, 26, 255))
    figp = OUT / "studio_fig.png"; fig.save(figp)
    base = OUT / "studio_base.mp4"
    fx, fy = 560, 180  # 인물 위치
    ff(["-loop", "1", "-framerate", str(FPS), "-t", f"{total:.2f}", "-i", str(bgp), "-loop", "1", "-framerate", str(FPS), "-t", f"{total:.2f}", "-i", str(figp),
        "-filter_complex", f"[0:v][1:v]overlay=x={fx}+6*sin(2*PI*t/5):y={fy}+5*sin(2*PI*t/2.6),format=yuv420p[v]", "-map", "[v]",
        "-c:v", "libx264", "-crf", "18", "-preset", "fast", "-r", str(FPS), str(base)])
    return base, [fx + 250, fy + 90, 400, 400]


def main() -> None:
    nar, spans = narration()
    if "--voice-only" in sys.argv:
        print("VOICE DONE", OUT / "voice"); return
    total = spans[-1][1] + TAIL
    base, box = studio(total)
    segs, subs = [], []
    for i, ((_, sub, scene), (a, b)) in enumerate(zip(LINES, spans)):
        st = 0.0 if i == 0 else a - GAP / 2
        en = total if i == len(LINES) - 1 else spans[i + 1][0] - GAP / 2
        subs.append([a, b + 0.15, sub])
        if scene is None:  # 앞 장면을 이어 간다
            segs[-1]["t"][1] = en
            if segs[-1].get("card"):
                segs[-1]["card"]["at"][1] = en - 0.3
            continue
        sg = {"t": [round(st, 2), round(en, 2)], **{k: v for k, v in scene.items()}}
        if sg.get("card"):
            sg["card"] = dict(sg["card"], at=[st + 0.4, en - 0.3])
        segs.append(sg)
    tl = {"base": str(base), "audio": str(nar), "face_box": box, "out": str(OUT / "talk_sample.mp4"), "segments": segs, "subs": subs}
    (OUT / "timeline.json").write_text(json.dumps(tl, ensure_ascii=False, indent=1), encoding="utf-8")
    talk.build(str(OUT / "timeline.json"))
    ff(["-ss", "1.0", "-i", str(base), "-frames:v", "1", str(OUT / "face_frame.png")])
    th = {"face": str(OUT / "face_frame.png"), "face_crop": [640, 120, 720, 960], "title": ["엑셀 월요일", "2시간, *5분*으로"], "title_size": 100,
          "shot": str(OUT / "talk_sample_work" / "slide01.png"), "shot_w": 600, "shot_rot": 2, "shot_xy": [30, 392],
          "stickers": [{"text": "코드 몰라도 OK", "xy": [470, 400], "rot": -4}, {"text": "말로 시키면 끝", "xy": [430, 616], "rot": 3, "size": 32}],
          "pill": "노모어매뉴얼", "out": str(OUT / "talk_sample_썸네일.jpg")}
    (OUT / "thumb.json").write_text(json.dumps(th, ensure_ascii=False, indent=1), encoding="utf-8")
    talk.thumb(str(OUT / "thumb.json"))


if __name__ == "__main__":
    main()
