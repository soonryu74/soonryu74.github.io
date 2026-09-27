"""응원 릴레이 쇼츠: 여러 사람이 한 명씩 같은 구호를 외치는 영상 → 외칠 때마다 큰 글자가 '팡'.

예) 남군산교회 "일이 선교다! Business is Mission!"
"""
from __future__ import annotations

from pathlib import Path

from . import faces, layout, media, series, shorts


def make(videos: list[str], work: Path, cfg: dict, fonts: dict, label: str, title: str, shout: str,
         sub: str = "", series_key: str = "intro", fit: str = "auto", crop_x: float = 0.5,
         outro_text: str = "", between: str = "한 번 *더*!", tag: str = "", tag_role: str = "",
         fmt: str = "shorts", at: list[list[float]] | None = None) -> Path:
    S = series.get(series_key)
    B = series.brand(cfg)
    work.mkdir(parents=True, exist_ok=True)
    W, H = layout.size_of(fmt)
    parts, events, t0 = [], [], 0.0
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
            events.append((t0 + max(0, a - 0.05), t0 + min(nxt - 0.08, a + 1.8, dur)))
        t0 += dur
    main_end = t0
    end_card = layout.outro(work / "outro", fmt, fonts, B, S["theme"], outro_text)
    parts.append(shorts.piece(work / "outro.mp4", fmt, str(end_card), 3.5, zoom=False))
    base = shorts.join(parts, work / "base.mp4")
    # 외침마다: 그 순간 얼굴 위치를 찾아 글자가 얼굴을 가리지 않는 곳에 놓는다
    head_bottom = int(H * (0.19 if not title else 0.30)) if fmt == "shorts" else int(H * 0.2)
    hi = int(H * 0.745) if fmt == "shorts" else int(H * 0.92)
    _, block = layout.pop_block(fmt, fonts, shout, sub)
    default_top = int(H * 0.60) - block // 2
    pops = []
    moved = 0
    for k, (a, b) in enumerate(events):
        tl = faces.timeline(str(base), a + 0.05, max(a + 0.05, b - 0.02), step=0.12)
        from PIL import Image

        def plan(boxes_):
            tp, sc = faces.place(boxes_, H, block, default_top, head_bottom, hi)
            frs = layout.pop(work / "pop" / f"e{k:02d}", fmt, fonts, shout, sub, S["theme"], tp, sc)
            tb = Image.open(frs[-1]).getbbox() or (0, tp, W, tp + block)
            end = b
            for t, bs in tl:  # 얼굴이 글자 쪽으로 들어오면 글자를 먼저 내린다
                if t > a + 0.4 and any(faces.hits(bx, tb) for bx in bs):
                    end = max(a + 0.4, t - 0.15)
                    break
            return tp, sc, frs, end

        core = [bx for t, bs in tl if t <= a + 1.0 for bx in bs]  # 외치는 동안의 얼굴로 먼저 자리를 정하고
        top, scale, frames, end = plan(core)
        if end - a < 1.2:  # 너무 빨리 내려가면, 외침 전체 동안 얼굴을 피하는 자리(조금 작은 글자)로
            top, scale, frames, end = plan([bx for _, bs in tl for bx in bs])
        b = end
        moved += top != default_top or scale != 1.0
        t, durs = a, [0.05, 0.05, 0.06]
        for fr, d in zip(frames[:-1], durs):
            pops.append((fr, t, t + d))
            t += d
        pops.append((frames[-1], t, b))
        events[k] = (a, b)
    if moved:
        print(f"  얼굴을 피해 글자 위치를 옮긴 장면: {moved}/{len(events)}")
    import json
    (work / "events.json").write_text(json.dumps(events), encoding="utf-8")
    from PIL import Image as _I
    ov = []
    head = layout.header(work / "header.png", fmt, fonts, label, title, S["theme"])
    hb = _I.open(head).getbbox()
    top_items = [(head, (0, 0, W, hb[3]) if hb else (0, 0, W, 1))]
    if tag:
        tagp = layout.person_tag(work / "tag.png", fmt, fonts, tag, tag_role,
                                 xy=(0.62, 0.095) if fmt == "shorts" else (0.70, 0.05))
        top_items.append((tagp, _I.open(tagp).getbbox() or (0, 0, 1, 1)))
    for png, box in top_items:  # 위쪽 꼬리표·이름표도 얼굴이 다가오면 잠깐 비켜 준다
        text_box = _I.open(png).getbbox()
        # 어두운 띠는 괜찮고 글자만 확인: 꼬리표는 위 20% 안의 글자 부분
        spans = faces.clear_spans(str(base), (text_box[0], max(text_box[1], int(H * 0.09)), text_box[2],
                                  min(text_box[3], int(H * 0.2))) if text_box else box, 0, main_end)
        ov += [(png, a, b) for a, b in spans]
    ov += pops
    out = work.parent / f"{work.name}.mp4"
    shorts.finish(base, out, ov, bgm=cfg["video"].get("bgm_path", ""), bgm_volume=0.06)
    return out
