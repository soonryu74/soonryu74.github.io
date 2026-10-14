"""자막 — ① 초안 만들기(받아쓰기 단어 → 자막 줄) ② 굽기(*강조* 단어만 금색, 반투명 상자).
사용:
  python subs.py draft words.json subs.json [--chars 16]   # transcribe.py --words 결과(완성 영상 기준) → 자막 초안
  python subs.py burn IN.mp4 subs.json OUT.mp4 [--outline] # 굽기 (화면 비율 자동: 세로면 쇼츠 위치)
subs.json: [[시작, 끝, "첫 줄\\n둘째 줄 *강조*"], …]
초안은 받아쓰기 그대로라 틀린 글자가 있다 → 사람이(또는 Claude 가) 고치고 *강조* 를 넣은 뒤 굽는다."""
from __future__ import annotations

import argparse
from pathlib import Path

from common import burn_subs, load, probe, save, write_ass

PAUSE = 0.35     # 이만큼 쉬면 자막을 끊는다
MIN_D, GAP, MAX_D = 0.9, 0.05, 3.8


def two_lines(words: list[str], chars: int) -> str:
    """한 줄이면 그대로, 길면 두 줄 길이가 가장 비슷해지는 곳에서 나눈다"""
    text = " ".join(words)
    if len(text) <= chars or len(words) < 2:
        return text
    best = min(range(1, len(words)), key=lambda k: max(len(" ".join(words[:k])), len(" ".join(words[k:]))))
    return " ".join(words[:best]) + "\n" + " ".join(words[best:])


def draft(words_json: str, out: str, chars: int = 16) -> Path:
    segs = load(words_json)
    words = [w for s in segs for w in (s.get("w") or [[s["s"], s["e"], s["t"]]])]
    cues, cur = [], []
    def flush():
        if cur:
            cues.append([cur[0][0], cur[-1][1], two_lines([w[2] for w in cur], chars)])
    for w in words:
        if cur:
            text_len = len(" ".join(x[2] for x in cur + [w]))
            if w[0] - cur[-1][1] > PAUSE or text_len > chars * 2 or w[1] - cur[0][0] > MAX_D:
                flush(); cur = []
        cur.append(w)
        if w[2].endswith((".", "?", "!", "…")) and len(" ".join(x[2] for x in cur)) >= 6:
            flush(); cur = []
    flush()
    for k, c in enumerate(cues):  # 너무 짧으면 다음 자막 전까지 늘림
        nxt = cues[k + 1][0] - GAP if k + 1 < len(cues) else c[1] + 0.6
        if c[1] - c[0] < MIN_D:
            c[1] = min(nxt, c[0] + MIN_D)
        c[0], c[1] = round(c[0], 2), round(c[1], 2)
    save(cues, out)
    print("DONE", out, len(cues), "줄", flush=True)
    return Path(out)


def burn(src: str, subs_json: str, out: str, outline: bool = False) -> Path:
    info = probe(src)
    ass = Path(out).with_suffix(".ass")
    write_ass(load(subs_json), ass, size=(info["w"], info["h"]), box=not outline)
    burn_subs(Path(src), ass, Path(out))
    print("DONE", out, flush=True)
    return Path(out)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("draft"); d.add_argument("words"); d.add_argument("out"); d.add_argument("--chars", type=int, default=16)
    b = sub.add_parser("burn"); b.add_argument("src"); b.add_argument("subs"); b.add_argument("out"); b.add_argument("--outline", action="store_true")
    a = ap.parse_args()
    draft(a.words, a.out, a.chars) if a.cmd == "draft" else burn(a.src, a.subs, a.out, a.outline)
