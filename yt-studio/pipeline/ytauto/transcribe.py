"""받아쓰기: 음성·영상 → [(시작초, 끝초, 문장)].

- faster-whisper (내 컴퓨터, 무료) 가 기본. 처음 한 번 모델을 내려받는다.
- 원고(script)가 있으면 원고 문장을 받아쓰기 시간에 맞춰 붙인다 → 오탈자 없는 자막.
- 받아쓰기 엔진이 없으면 원고를 음성 길이에 글자 수 비율로 나눈다.
"""
from __future__ import annotations

import bisect
import json
import re
from pathlib import Path

from . import media, tts

HINT = "사랑글로벌아카데미, 일터선교, 일터아카데미, 극동방송, 온전론, 비즈니스 선교, BAM, 제자훈련, 하나님, 예수님, 선교지"


def split_script(text: str) -> list[str]:
    return tts.split_sentences(re.sub(r"[ \t]+", " ", text))


def _whisper(path: str, tcfg: dict, prompt: str) -> list[tuple[float, float, str, list]]:
    from faster_whisper import WhisperModel  # pip install faster-whisper

    model = WhisperModel(tcfg.get("model", "small"), device="auto", compute_type="int8")
    segs, _ = model.transcribe(path, language=tcfg.get("language", "ko"), vad_filter=True,
                               word_timestamps=True, initial_prompt=prompt[:800])
    out = []
    for s in segs:
        words = [(w.start, w.end, w.word) for w in (s.words or [])]
        out.append((s.start, s.end, s.text.strip(), words))
    return out


def _align(script_sents: list[str], segs: list, total: float) -> list[tuple[float, float, str]]:
    """원고 글자 위치 → 받아쓰기 글자 시간표로 옮긴다 (글자 수 비율 정렬)."""
    marks: list[tuple[int, float]] = [(0, segs[0][0] if segs else 0.0)]
    n = 0
    for s0, s1, text, words in segs:
        units = words or [(s0, s1, text)]
        for a, b, w in units:
            k = len(re.sub(r"\s", "", w))
            if k:
                marks.append((n, a))
                n += k
                marks.append((n, b))
    if n == 0:
        return proportional(script_sents, total)
    xs = [m[0] for m in marks]

    def time_at(frac: float) -> float:
        c = frac * n
        i = min(max(bisect.bisect_left(xs, c), 1), len(xs) - 1)
        (x0, t0), (x1, t1) = marks[i - 1], marks[i]
        return t0 if x1 == x0 else t0 + (t1 - t0) * (c - x0) / (x1 - x0)

    lens = [len(re.sub(r"\s", "", s)) for s in script_sents]
    tot = sum(lens) or 1
    out, acc = [], 0
    for s, k in zip(script_sents, lens):
        a = time_at(acc / tot)
        acc += k
        b = time_at(acc / tot)
        out.append((round(a, 3), round(max(b, a + 0.3), 3), s))
    return out


def proportional(sents: list[str], total: float, lead: float = 0.15) -> list[tuple[float, float, str]]:
    return [tuple(c) for c in tts._proportional(sents, total, lead)]


def transcribe(path: str | Path, tcfg: dict, script: str = "", cache: Path | None = None
               ) -> list[tuple[float, float, str]]:
    path = str(path)
    if cache and cache.exists():
        return [tuple(c) for c in json.loads(cache.read_text(encoding="utf-8"))]
    total = media.duration(path)
    sents = split_script(script) if script.strip() else []
    engine = tcfg.get("engine", "faster-whisper")
    segs = []
    if engine != "none":
        try:
            print(f"  받아쓰기 중… (모델 {tcfg.get('model', 'small')}, 처음엔 모델을 내려받아요)")
            segs = _whisper(path, tcfg, HINT + (" " + script[:600] if script else ""))
        except ImportError:
            print("  ! faster-whisper 가 없어요: pip install faster-whisper  (원고가 있으면 원고로 대신합니다)")
        except Exception as e:
            print(f"  ! 받아쓰기 실패: {e}")
    if sents and segs:
        cues = _align(sents, segs, total)
    elif segs:
        cues = [(round(a, 3), round(b, 3), t) for a, b, t, _ in segs if t]
    elif sents:
        cues = proportional(sents, total)
    else:
        raise SystemExit("받아쓰기를 못 했고 원고도 없어요. --script 로 원고 파일을 주거나 faster-whisper 를 설치해 주세요.")
    if cache:
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(json.dumps(cues, ensure_ascii=False, indent=1), encoding="utf-8")
    return cues


def read_srt(path: Path) -> list[tuple[float, float, str]]:
    def t(s: str) -> float:
        h, m, rest = s.strip().replace(",", ".").split(":")
        return int(h) * 3600 + int(m) * 60 + float(rest)
    out = []
    for block in re.split(r"\n\s*\n", path.read_text(encoding="utf-8-sig").strip()):
        lines = [l for l in block.splitlines() if l.strip()]
        if len(lines) >= 2 and "-->" in lines[1]:
            a, b = lines[1].split("-->")
            out.append((t(a), t(b), " ".join(lines[2:]).strip()))
        elif len(lines) >= 1 and "-->" in lines[0]:
            a, b = lines[0].split("-->")
            out.append((t(a), t(b), " ".join(lines[1:]).strip()))
    return out
