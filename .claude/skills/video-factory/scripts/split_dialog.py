"""대화 통녹음(C0_t1.wav …)을 문장별 N00.wav … 로 자른다 — faster-whisper 단어 시각 + 원고 글자 맞추기.
사용: python split_dialog.py dialog.json VOICE_DIR [OUT_DIR=VOICE_DIR]
문장마다 두 테이크 중 원고와 더 비슷한 쪽을 고르고, 문장 사이 가장 조용한 곳에서 자른 뒤 앞뒤 무음을 다듬는다.
결과 보고: OUT_DIR/split_report.json (문장별 테이크 · 유사도 · 길이)"""
import json
import re
import subprocess
import sys
import wave
from difflib import SequenceMatcher
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel

SR = 24000
J = json.load(open(sys.argv[1], encoding="utf-8"))
VD = Path(sys.argv[2]); OUT = Path(sys.argv[3]) if len(sys.argv) > 3 else VD; OUT.mkdir(parents=True, exist_ok=True)
LINES = [t for _, t in J["lines"]]; CH = J.get("chunk", 9)
M = WhisperModel("small", device="cpu", compute_type="int8")
norm = lambda s: re.sub(r"[^0-9A-Za-z가-힣]", "", s)  # noqa: E731


def load(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768


def rms(a, t0, t1, hop=0.02):
    i0, i1 = int(t0 * SR), int(t1 * SR); n = int(hop * SR)
    seg = a[i0:i1]
    if len(seg) < n:
        return [(t0, 0.0)]
    return [(t0 + k * hop, float(np.sqrt(np.mean(seg[k * n:(k + 1) * n] ** 2)) + 1e-9)) for k in range(len(seg) // n)]


def quiet(a, t0, t1):
    if t1 - t0 < 0.06:
        t0, t1 = t0 - 0.25, t1 + 0.25
    fr = rms(a, max(0, t0), min(len(a) / SR, t1))
    return min(fr, key=lambda x: x[1])[0] + 0.01


def trim(seg):
    fr = [np.sqrt(np.mean(seg[i:i + 480] ** 2)) for i in range(0, len(seg) - 480, 480)]
    if not fr:
        return seg
    th = max(fr) * 0.03
    on = [i for i, v in enumerate(fr) if v > th]
    a, b = on[0], on[-1] + 1
    return seg[max(0, a * 480 - int(0.04 * SR)): min(len(seg), b * 480 + int(0.12 * SR))]


def analyse(path, lines):
    a = load(path)
    segs, _ = M.transcribe(a.astype(np.float32) if SR == 16000 else
                           np.interp(np.arange(0, len(a), SR / 16000), np.arange(len(a)), a).astype(np.float32),
                           language="ko", word_timestamps=True, beam_size=5, vad_filter=False)
    words = [w for s in segs for w in s.words]
    hyp, owner = "", []
    for wi, w in enumerate(words):
        t = norm(w.word); hyp += t; owner += [wi] * len(t)
    ref, rl = "", []
    for li, t in enumerate(lines):
        t = norm(t); ref += t; rl += [li] * len(t)
    mp = {}
    for b in SequenceMatcher(None, ref, hyp, autojunk=False).get_matching_blocks():
        for k in range(b.size):
            mp[b.a + k] = b.b + k
    info = []
    for li in range(len(lines)):
        idx = [i for i in range(len(ref)) if rl[i] == li]
        hit = [mp[i] for i in idx if i in mp]
        if len(hit) < 2:
            info.append(None); continue
        w0, w1 = words[owner[min(hit)]], words[owner[max(hit)]]
        info.append({"sim": len(hit) / len(idx), "s": w0.start, "e": w1.end})
    # 자를 곳: 앞 문장 끝 ~ 뒤 문장 시작 사이 가장 조용한 곳
    out = []
    for li, x in enumerate(info):
        if x is None:
            out.append(None); continue
        prv = next((info[j] for j in range(li - 1, -1, -1) if info[j]), None)
        nxt = next((info[j] for j in range(li + 1, len(info)) if info[j]), None)
        c0 = quiet(a, prv["e"], x["s"]) if prv else max(0, x["s"] - 0.2)
        c1 = quiet(a, x["e"], nxt["s"]) if nxt else min(len(a) / SR, x["e"] + 0.5)
        seg = trim(a[int(c0 * SR):int(c1 * SR)])
        out.append({"sim": round(x["sim"], 3), "audio": seg, "len": round(len(seg) / SR, 2),
                    "heard": "".join(w.word for w in words if c0 <= w.start < c1).strip()})
    return out


rep = []
for c0 in range(0, len(LINES), CH):
    ci = c0 // CH; lines = LINES[c0:c0 + CH]
    takes = {}
    for p in sorted(VD.glob(f"C{ci}_t*.wav")):
        takes[p.stem] = analyse(p, lines); print(p.name, [x and x["sim"] for x in takes[p.stem]], flush=True)
    for k, t in enumerate(lines):
        cand = [(name, r[k]) for name, r in takes.items() if r[k]]
        # 글자 일치도 우선, 비슷하면(0.03 이내) 너무 길지 않은 쪽
        cand.sort(key=lambda x: (-round(x[1]["sim"] / 0.03), x[1]["len"]))
        n = c0 + k
        if not cand:
            rep.append({"n": n, "text": t, "take": None}); print("  !! 못 찾음", n, t); continue
        name, r = cand[0]
        pcm = (np.clip(r["audio"], -1, 1) * 32767).astype(np.int16)
        with wave.open(str(OUT / f"N{n:02d}.wav"), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
        rep.append({"n": n, "text": t, "take": name, "sim": r["sim"], "len": r["len"], "heard": r["heard"]})
        print(f"N{n:02d} {name} sim={r['sim']} {r['len']}s | {t} | {r['heard']}", flush=True)
json.dump(rep, open(OUT / "split_report.json", "w"), ensure_ascii=False, indent=1)
print("DONE", len([r for r in rep if r.get("take")]), "/", len(LINES))
