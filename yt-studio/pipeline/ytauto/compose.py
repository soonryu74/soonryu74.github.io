"""장면 대본(recipe JSON) → 영상.  추천 영상 0~7번, 소개 영상, FAQ 같은 '조립형' 영상에 쓴다.

recipe 예:
{
  "series": "referral", "title": "회사도\\n*사역*입니다", "label": "대표님께 드리는 60초",
  "beats": [
    {"type": "card",  "text": "회사를 운영하시는\\n*대표님*께", "dur": 2.5},
    {"type": "image", "src": "media/office.jpg", "say": "이익과 신앙이 따로 논다고 느끼신 적 있으신가요?"},
    {"type": "clip",  "src": "media/interview.mp4", "start": "0:12", "end": "0:31",
                      "name": "홍길동 대표", "role": "5기 동문", "captions": "auto"},
    {"type": "outro"}
  ]
}
파일이 아직 없으면 '장면 준비 중' 화면으로 대신 만들어, 촬영 전에도 전체 흐름(애니메틱)을 볼 수 있다.
"""
from __future__ import annotations

import json
from pathlib import Path

from . import faces, layout, series, shorts, transcribe, tts
from .media import duration


def _missing(p: str, root: Path) -> Path | None:
    if not p:
        return None
    q = Path(p).expanduser()
    q = q if q.is_absolute() else root / q
    return q if q.exists() else None


def render(recipe_path: Path, cfg: dict, fonts: dict, fmt: str = "shorts", out_dir: Path | None = None) -> Path:
    R = json.loads(recipe_path.read_text(encoding="utf-8"))
    root = recipe_path.parent.parent if recipe_path.parent.name == "recipes" else recipe_path.parent
    S = series.get(R.get("series", "referral"))
    B = series.brand(cfg)
    stem = recipe_path.stem
    work = (out_dir or root / "output") / f"{stem}_{fmt}"
    work.mkdir(parents=True, exist_ok=True)
    tcfg = dict(cfg["tts"])
    if R.get("voice"):
        tcfg["voice"] = R["voice"]
    parts, ov, chunks, t0 = [], [], [], 0.0
    header = layout.header(work / "ov_header.png", fmt, fonts, R.get("label", S["label"]), R.get("title", ""),
                           S["theme"])
    for i, bt in enumerate(R.get("beats", []), 1):
        kind = bt.get("type", "card")
        voice, cues = None, []
        if bt.get("say"):
            voice = work / f"say{i:02d}.mp3"
            cues = tts.synthesize(bt["say"], voice, tcfg)
        vlen = duration(str(voice)) + 0.45 if voice else 0.0
        if kind == "outro":
            png = layout.outro(work / f"b{i:02d}", fmt, fonts, B, S["theme"], bt.get("text", ""))
            dur = max(float(bt.get("dur", 4)), vlen)
            parts.append(shorts.piece(work / f"b{i:02d}.mp4", fmt, str(png), dur,
                                      audio=str(voice) if voice else None, zoom=False))
            show_header = False
        elif kind == "clip":
            src = _missing(bt.get("src", ""), root)
            if src:
                a, b = shorts.parse_time(bt.get("start", 0)), shorts.parse_time(bt.get("end", 0))
                if b <= a:
                    b = duration(str(src))
                dur = b - a
                p = shorts.piece(work / f"b{i:02d}.mp4", fmt, str(src), dur, start=a,
                                 fit=bt.get("fit", "auto"), crop_x=float(bt.get("crop_x", 0.5)))
                cap = bt.get("captions", "auto")
                if cap == "auto":
                    cues = transcribe.transcribe(p, cfg.get("transcribe", {}), bt.get("script", ""),
                                                 work / f"b{i:02d}_transcript.json")
                elif cap:
                    cues = transcribe.proportional(transcribe.split_script(cap), dur)
                parts.append(p)
            else:  # 촬영 전: 자리 표시 화면
                dur = float(bt.get("dur", 8))
                hint = bt.get("hint", "동문 인터뷰")
                png = layout.card(work / f"b{i:02d}", fmt, fonts, f"[촬영 예정]\n{hint}", S["theme"],
                                  sub=f"파일: {bt.get('src', '')}")
                parts.append(shorts.piece(work / f"b{i:02d}.mp4", fmt, str(png), dur, zoom=False))
            if bt.get("name"):
                ov.append((layout.person_tag(work / f"tag{i:02d}.png", fmt, fonts, bt["name"], bt.get("role", ""),
                                             xy=(0.06, 0.44) if fmt == "shorts" else (0.04, 0.6)),
                           t0, t0 + min(dur, 5)))  # 얼굴 확인은 아래에서
            show_header = True
        elif kind == "image":
            src = _missing(bt.get("src", ""), root)
            dur = max(float(bt.get("dur", 0) or 0), vlen, 2.0)
            png = src or layout.card(work / f"b{i:02d}", fmt, fonts, f"[사진 준비 중]\n{bt.get('hint', '')}",
                                     S["theme"], sub=f"파일: {bt.get('src', '')}")
            parts.append(shorts.piece(work / f"b{i:02d}.mp4", fmt, str(png), dur,
                                      audio=str(voice) if voice else None, zoom=True))
            show_header = True
        else:  # card
            bg = _missing(bt.get("background", ""), root)
            png = layout.card(work / f"b{i:02d}", fmt, fonts, bt.get("text", ""), S["theme"],
                              sub=bt.get("sub", ""), background=str(bg) if bg else "")
            dur = max(float(bt.get("dur", 2.5)), vlen)
            parts.append(shorts.piece(work / f"b{i:02d}.mp4", fmt, str(png), dur,
                                      audio=str(voice) if voice else None, zoom=False))
            show_header = False
        if show_header and R.get("title"):
            ov.append((header, t0, t0 + dur))
        for a, b, text in shorts.chunk(cues, fmt):
            chunks.append((t0 + a, t0 + min(b, dur), text))
        t0 += dur
    base = shorts.join(parts, work / "base.mp4")
    ov = [item for png, a, b in ov for item in faces.keep_clear(str(base), png, a, b)]
    ov += faces.safe_captions(str(base), chunks, fmt, fonts, cfg["video"].get("subtitle_style", "boxed"),
                              work / "captions")
    out = (out_dir or root / "output") / f"{stem}_{fmt}.mp4"
    shorts.finish(base, out, ov, bgm=R.get("bgm") or cfg["video"].get("bgm_path", ""),
                  bgm_volume=float(R.get("bgm_volume", 0.08)))
    return out
