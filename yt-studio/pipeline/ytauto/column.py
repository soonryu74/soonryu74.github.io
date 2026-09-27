"""극동방송 1분 칼럼: 녹음 파일 → 세로 쇼츠.

화면: 위 제목(인용형) · 가운데 칼럼니스트 이름표와 음성 파형 · 문장 자막 · 마지막 모집 안내.
배경: 장면 사진 폴더 > AI 이미지 > 칼럼니스트 사진을 흐리게 깐 화면 순으로 고른다.
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

from . import layout, llm, media, series, shorts, transcribe, visuals
from .assemble import write_srt
from .prompts import extract_json

IMG_EXT = {".jpg", ".jpeg", ".png", ".webp"}


def _scenes(cues, total: float, target: float = 9.0) -> list[dict]:
    scenes, cur = [], []
    for c in cues:
        cur.append(c)
        if c[1] - cur[0][0] >= target:
            scenes.append(cur)
            cur = []
    if cur:
        if scenes and cur[-1][1] - cur[0][0] < 4:
            scenes[-1] += cur
        else:
            scenes.append(cur)
    out = []
    for i, sc in enumerate(scenes):
        start = 0.0 if i == 0 else sc[0][0]
        out.append({"start": start, "text": " ".join(t for _, _, t in sc)})
    for i, s in enumerate(out):
        s["end"] = out[i + 1]["start"] if i + 1 < len(out) else total
    return out


def _prompts(scenes: list[dict], cfg: dict) -> None:
    """AI 이미지용 영어 장면 설명을 LLM 에게 받는다 (실패하면 비워 둔다)."""
    lines = "\n".join(f"{i + 1}. {s['text']}" for i, s in enumerate(scenes))
    msg = [{"role": "system", "content": "You write short English image prompts for a Korean Christian radio column video. "
            "Photographic, warm, workplace and everyday life scenes, no text, no faces of real people, "
            "no depictions of Jesus or biblical figures."},
           {"role": "user", "content": f"For each numbered paragraph write one prompt. Return JSON {{\"prompts\": [..]}} only.\n{lines}"}]
    try:
        ps = extract_json(llm.chat(msg, cfg["llm"])).get("prompts", [])
        for s, p in zip(scenes, ps):
            s["visual"] = p
    except Exception as e:
        print(f"  ! 장면 설명을 못 받아 기본 배경을 씁니다 ({type(e).__name__})")


def make(audio: str, work: Path, cfg: dict, fonts: dict, title: str, name: str = "", role: str = "",
         photo: str = "", script: str = "", images: str = "", series_key: str = "column",
         fmt: str = "shorts") -> Path:
    S = series.get(series_key)
    B = series.brand(cfg)
    work.mkdir(parents=True, exist_ok=True)
    voice = work / ("voice" + Path(audio).suffix.lower())
    if not voice.exists():
        shutil.copy(audio, voice)
    total = media.duration(str(voice))
    srt = work / "자막.srt"
    if srt.exists():
        print("  자막.srt 를 사용합니다 (고친 내용 반영)")
        cues = transcribe.read_srt(srt)
    else:
        cues = transcribe.transcribe(voice, cfg.get("transcribe", {}), script, work / "transcript.json")
        write_srt(cues, srt)
        print(f"  자막 초안 저장: {srt}  (틀린 글자를 고치고 같은 명령을 다시 실행하면 반영돼요)")
    scenes = _scenes(cues, total)
    pics = sorted(p for p in Path(images).iterdir() if p.suffix.lower() in IMG_EXT) if images else []
    provider = cfg["visual"].get("provider", "card")
    if not pics and provider not in ("card", "folder"):
        _prompts(scenes, cfg)
    parts = []
    for i, sc in enumerate(scenes, 1):
        if pics:
            bg = pics[(i - 1) % len(pics)]
        elif sc.get("visual"):
            bg = visuals.make_visual({"visual": sc["visual"]}, i, len(scenes), work, fmt, cfg, fonts)
            if "_card" in bg.name:
                bg = layout.card(work / "bg" / f"s{i:02d}", fmt, fonts, "", S["theme"], background=photo)
        else:
            bg = layout.card(work / "bg" / f"s{i:02d}", fmt, fonts, "", S["theme"], background=photo)
        parts.append(shorts.piece(work / "parts" / f"p{i:02d}.mp4", fmt, str(bg), sc["end"] - sc["start"],
                                  zoom=True))
    main_end = total
    end_card = layout.outro(work / "bg" / "outro", fmt, fonts, B, S["theme"])
    parts.append(shorts.piece(work / "parts" / "outro.mp4", fmt, str(end_card), 3.5, zoom=False))
    base = shorts.join(parts, work / "parts" / "base.mp4")
    W, H = layout.size_of(fmt)
    ov = [(layout.header(work / "ov" / "header.png", fmt, fonts, S["label"], title, S["theme"]), 0, main_end)]
    if name:
        ov.append((layout.person_tag(work / "ov" / "tag.png", fmt, fonts, name, role, photo,
                                     (0.06, 0.40) if fmt == "shorts" else (0.04, 0.55)), 0, main_end))
    for j, (a, b, t) in enumerate(shorts.chunk(cues, fmt)):
        ov.append((layout.caption(work / "ov" / f"c{j:03d}.png", t, fmt, fonts,
                                  cfg["video"].get("subtitle_style", "boxed")), a, min(b, main_end)))
    wave = ({"x": 90, "y": int(H * 0.49), "w": W - 180, "h": 110, "start": 0, "end": main_end,
             "color": "0x" + S["accent"].lstrip("#")} if fmt == "shorts" else None)
    out = work / f"{Path(work).name}.mp4"
    shorts.finish(base, out, ov, audio=str(voice), wave=wave,
                  bgm=cfg["video"].get("bgm_path", ""), bgm_volume=cfg["video"].get("bgm_volume", 0.08))
    (work / "업로드정보.txt").write_text(
        f"[제목]\n{title.replace('*', '').replace(chr(10), ' ')} | {S['name']}\n\n"
        f"[설명]\n{' '.join(t for _, _, t in cues)[:300]}…\n\n{name} {role}\n\n"
        + "\n".join(B["cta"]) + "\n\n#일터선교 #SaGA #사랑글로벌아카데미\n", encoding="utf-8")
    (work / "scenes.json").write_text(json.dumps(scenes, ensure_ascii=False, indent=1), encoding="utf-8")
    return out
