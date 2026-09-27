"""긴 강의·특강 영상 → 핵심 쇼츠 여러 편.

1) 받아쓰기  2) AI 가 30~60초 구간과 '맨 앞에 보여 줄 한 문장(훅)'을 고름
3) 훅을 먼저 보여 주고 본 구간을 이어 붙임  4) 세로 화면 + 자막 + 제목 + 마무리 안내
결과 폴더의 clips.json 을 고치고 다시 실행하면 그대로 다시 만든다.
"""
from __future__ import annotations

import json
from pathlib import Path

from . import faces, layout, llm, media, series, shorts, transcribe
from .prompts import extract_json

SYSTEM = ("당신은 기독교 강의 영상을 유튜브 쇼츠로 만드는 편집자입니다. 과장하지 않고, 강사의 말을 왜곡하지 않으며, "
          "혼자 들어도 뜻이 통하는 구간을 고릅니다.")


def _fmt_t(t: float) -> str:
    m, s = divmod(int(t), 60)
    return f"{m:02d}:{s:02d}"


def _ask(cues, lo: int, hi: int, want: int, cfg: dict) -> list[dict]:
    lines = "\n".join(f"[{i}] ({_fmt_t(cues[i][0])}) {cues[i][2]}" for i in range(lo, hi))
    user = (f"아래는 강의 받아쓰기입니다. 쇼츠로 만들 구간을 {want}개 고르세요.\n"
            "조건: 연속된 문장, 길이 30~60초, 혼자 봐도 이해되는 하나의 주장이나 이야기.\n"
            "hook 은 그 구간 안에서 가장 강한 한 문장 번호(맨 앞에 먼저 보여 줄 문장).\n"
            "title 은 쇼츠 위에 띄울 제목 2줄(\\n 으로 구분, 한 줄 12자 안팎), 핵심 단어 하나를 *별표*로 감쌉니다. 강사의 말을 살립니다.\n"
            "score 는 1~10 (공감·깨달음·인용 가치).\n"
            'JSON 만 출력: {"clips":[{"start":번호,"end":번호,"hook":번호,"title":"...","score":8}]}\n\n' + lines)
    res = extract_json(llm.chat([{"role": "system", "content": SYSTEM}, {"role": "user", "content": user}],
                                cfg["llm"]))
    return res.get("clips", [])


def select(cues, count: int, cfg: dict) -> list[dict]:
    picks: list[dict] = []
    try:
        win = 160
        for lo in range(0, len(cues), win):
            hi = min(len(cues), lo + win)
            want = max(1, round(count * (hi - lo) / len(cues))) if len(cues) > win else count
            for c in _ask(cues, lo, hi, want, cfg):
                s, e = int(c["start"]), int(c["end"])
                if 0 <= s <= e < len(cues):
                    h = int(c.get("hook", -1))
                    picks.append({"start": s, "end": e, "hook": h if s <= h <= e else -1,
                                  "title": c.get("title", ""), "score": c.get("score", 5)})
        picks.sort(key=lambda c: -float(c.get("score", 5)))
    except Exception as e:
        print(f"  ! AI 구간 선택 실패 → 고르게 나눠 뽑습니다 ({type(e).__name__}: {e})")
        picks = []
    if not picks:  # AI 없이: 영상 전체에서 고르게 50초 안팎 구간
        step = max(1, len(cues) // max(1, count))
        for k in range(count):
            s = k * step
            e = s
            while e + 1 < len(cues) and cues[e + 1][1] - cues[s][0] <= 55:
                e += 1
            if s < len(cues):
                t = cues[s][2]
                picks.append({"start": s, "end": e, "hook": -1, "title": t[:14] + ("…" if len(t) > 14 else ""),
                              "score": 0})
    # 60초 넘으면 줄이기
    for p in picks:
        while p["end"] > p["start"] and cues[p["end"]][1] - cues[p["start"]][0] > 62:
            p["end"] -= 1
        if p["hook"] > p["end"]:
            p["hook"] = -1
    return picks[:count]


def render_clip(video: str, cues, clip: dict, idx: int, work: Path, cfg: dict, fonts: dict,
                series_key: str, name: str, role: str, fit: str, crop_x: float, fmt: str = "shorts") -> Path:
    S = series.get(series_key)
    B = series.brand(cfg)
    d = work / f"clip{idx:02d}"
    d.mkdir(parents=True, exist_ok=True)
    s, e, h = clip["start"], clip["end"], clip.get("hook", -1)
    ranges = []
    if h >= 0 and h != s:
        ranges.append((max(0, cues[h][0] - 0.1), cues[h][1] + 0.25))
    ranges.append((max(0, cues[s][0] - 0.15), cues[e][1] + 0.4))
    parts, captions, t0 = [], [], 0.0
    for k, (a, b) in enumerate(ranges):
        parts.append(shorts.piece(d / f"p{k}.mp4", fmt, video, b - a, start=a, fit=fit, crop_x=crop_x))
        for ca, cb, text in cues:
            if cb > a and ca < b:
                captions.append((t0 + max(0, ca - a), t0 + min(b, cb) - a, text))
        t0 += b - a
    main_end = t0
    end_card = layout.outro(d / "outro", fmt, fonts, B, S["theme"],
                            headline=clip.get("outro", "전체 강의는\n*설명란 링크*에서"))
    parts.append(shorts.piece(d / "p_outro.mp4", fmt, str(end_card), 3.0, zoom=False))
    base = shorts.join(parts, d / "base.mp4")
    ov = faces.keep_clear(str(base), layout.header(d / "header.png", fmt, fonts,
                                                   S["label"] + (f" · {name}" if name else ""),
                                                   clip.get("title", ""), S["theme"]), 0, main_end)
    if name:
        ov += faces.keep_clear(str(base), layout.person_tag(d / "tag.png", fmt, fonts, name, role,
                                                            xy=(0.06, 0.44) if fmt == "shorts" else (0.04, 0.6)),
                               0, min(5, main_end))
    chunks = [(a, min(b, main_end), t) for a, b, t in shorts.chunk(captions, fmt)]
    ov += faces.safe_captions(str(base), chunks, fmt, fonts, cfg["video"].get("subtitle_style", "boxed"), d)
    out = work / f"{series_key}_{idx:02d}.mp4"
    shorts.finish(base, out, ov)
    return out


def make(video: str, work: Path, cfg: dict, fonts: dict, series_key: str = "lecture", count: int = 3,
         name: str = "", role: str = "", fit: str = "blur", crop_x: float = 0.5, script: str = "",
         source_url: str = "", fmt: str = "shorts") -> list[Path]:
    work.mkdir(parents=True, exist_ok=True)
    cues = transcribe.transcribe(video, cfg.get("transcribe", {}), script, work / "transcript.json")
    plan_file = work / "clips.json"
    if plan_file.exists():
        clips = json.loads(plan_file.read_text(encoding="utf-8"))
        print(f"  clips.json 사용 ({len(clips)}개) — 고친 구간·제목 반영")
    else:
        clips = select(cues, count, cfg)
        for c in clips:
            c["from"] = _fmt_t(cues[c["start"]][0])
            c["to"] = _fmt_t(cues[c["end"]][1])
            c["hook_text"] = cues[c["hook"]][2] if c.get("hook", -1) >= 0 else ""
        plan_file.write_text(json.dumps(clips, ensure_ascii=False, indent=1), encoding="utf-8")
    outs = []
    S = series.get(series_key)
    info = []
    for i, c in enumerate(clips, 1):
        print(f"  ▶ 쇼츠 {i}/{len(clips)}: {c.get('from', '')}~{c.get('to', '')} {c.get('title', '').replace(chr(10), ' ')}")
        out = render_clip(video, cues, c, i, work, cfg, fonts, series_key, name, role, fit, crop_x, fmt)
        outs.append(out)
        title = c.get("title", "").replace("*", "").replace("\n", " ")
        info.append(f"[{out.name}]\n제목: {title} | {name + ' | ' if name else ''}{S['name']}\n"
                    f"원본 구간: {c.get('from', '')}~{c.get('to', '')}\n"
                    + (f"전체 강의: {source_url}\n" if source_url else "") + "\n")
    (work / "업로드정보.txt").write_text("".join(info), encoding="utf-8")
    print("  총 길이 확인: " + ", ".join(f"{o.name} {media.duration(str(o)):.0f}초" for o in outs))
    return outs
