"""응원 릴레이 쇼츠: 여러 사람이 한 명씩 같은 구호를 외치는 영상 → 외칠 때마다 큰 글자가 '팡'.

예) 남군산교회 "일이 선교다! Business is Mission!"
"""
from __future__ import annotations

from pathlib import Path

from . import layout, media, series, shorts


def make(videos: list[str], work: Path, cfg: dict, fonts: dict, label: str, title: str, shout: str,
         sub: str = "", series_key: str = "intro", fit: str = "auto", crop_x: float = 0.5,
         outro_text: str = "", between: str = "한 번 *더*!", tag: str = "", tag_role: str = "",
         fmt: str = "shorts", at: list[list[float]] | None = None) -> Path:
    S = series.get(series_key)
    B = series.brand(cfg)
    work.mkdir(parents=True, exist_ok=True)
    frames = layout.pop(work / "pop", fmt, fonts, shout, sub, S["theme"])
    parts, pops, t0 = [], [], 0.0
    for i, v in enumerate(videos):
        if i > 0 and between:
            card = layout.card(work / f"between{i}", fmt, fonts, between, S["theme"])
            parts.append(shorts.piece(work / f"between{i}.mp4", fmt, str(card), 1.0, zoom=False))
            t0 += 1.0
        dur = media.duration(v)
        mode = fit
        if mode == "auto":
            vw, vh = media.video_size(v)
            mode = "cover" if vh > vw else "crop"  # 가로 영상은 가운데 인물 쪽을 세로로 잘라 크게
        parts.append(shorts.piece(work / f"clip{i}.mp4", fmt, v, dur, fit=mode, crop_x=crop_x))
        onsets = [(a, a + 2) for a in at[i]] if at and i < len(at) and at[i] else media.speech_onsets(v)
        for j, (a, _) in enumerate(onsets):
            nxt = onsets[j + 1][0] if j + 1 < len(onsets) else dur
            end = min(nxt - 0.08, a + 2.4, dur)
            steps = [0.05, 0.05, 0.06]
            t = t0 + max(0, a - 0.05)
            for k, fr in enumerate(frames[:-1]):
                pops.append((fr, t, t + steps[k]))
                t += steps[k]
            pops.append((frames[-1], t, t0 + end))
        t0 += dur
    main_end = t0
    end_card = layout.outro(work / "outro", fmt, fonts, B, S["theme"], outro_text)
    parts.append(shorts.piece(work / "outro.mp4", fmt, str(end_card), 3.5, zoom=False))
    base = shorts.join(parts, work / "base.mp4")
    ov = [(layout.header(work / "header.png", fmt, fonts, label, title, S["theme"]), 0, main_end)]
    if tag:
        ov.append((layout.person_tag(work / "tag.png", fmt, fonts, tag, tag_role,
                                     xy=(0.62, 0.095) if fmt == "shorts" else (0.70, 0.05)), 0, main_end))
    ov += pops
    out = work.parent / f"{work.name}.mp4"
    shorts.finish(base, out, ov, bgm=cfg["video"].get("bgm_path", ""), bgm_volume=0.06)
    return out
