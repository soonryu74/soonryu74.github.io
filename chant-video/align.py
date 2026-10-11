# -*- coding: utf-8 -*-
"""가사 ↔ 단어 타임스탬프 강제 정렬 → cuespec.json
사용법: python3 align.py series/B9-12
필요 파일: lyrics.json, structure.json, words.json

structure.json 예시:
{
  "duration": 217.08,        # 음원 길이
  "outro": 206.66,           # 마지막 가사가 끝나는 시각 (이후 목차 화면)
  "intro": 8.40,             # (선택) 0초~이 시각까지 제목 화면
  "lag": 0.35,               # 화면 전환 지연(초)
  "interludes": [[46.0, 50.5, 2]],   # (선택) 간주 [시작, 끝, 다음 절]
  "order": [
    {"ref": 9, "spoken": "요한복음 1장 12절"},  {"verse": 9, "repeat": 3},
    ...
  ]
}
- 장절 낭독 횟수는 자동 판정(최대 3회 시도, 안 불린 것은 제거)
- ASR 이 낭독을 통째로 놓친 절은 직전 발화가 끝난 뒤의 공백을 안내 화면으로 복원
- 반복 가사에서도 순서가 꼬이지 않도록 단조 DP 정렬을 쓴다
"""
import json, re, sys
import numpy as np

HANGUL = re.compile(r'[가-힣0-9]')

def syllables(text):
    return [c for c in text if HANGUL.match(c)]

def load_words(path):
    """단어 타임스탬프 → 음절열 + 음절별 시각(단어 안에서 균등 분배)"""
    syl, tm = [], []
    for w in json.load(open(path)):
        cs = syllables(w["w"])
        if not cs:
            continue
        dur = max(w["e"] - w["s"], 0.01)
        for i, c in enumerate(cs):
            syl.append(c)
            tm.append(w["s"] + dur * i / len(cs))
    return syl, tm

def build_expected(lyrics, structure):
    """기대 음절열 + 항목 목록 (kind, verse, line_idx, rep, 시작 음절 index)"""
    V = {v["n"]: v for v in lyrics["verses"]}
    syl, items = [], []
    for step in structure["order"]:
        if "ref" in step:
            n = step["ref"]
            txt = step.get("spoken", V[n]["ref"])
            for r in range(step.get("times", 3)):   # 넉넉히 잡고, 안 불린 낭독은 뒤에서 제거
                items.append(("ref", n, -1, r, len(syl)))
                syl += syllables(txt)
        else:
            n, rep = step["verse"], step["repeat"]
            for r in range(rep):
                for li, line in enumerate(V[n]["lines"]):
                    items.append(("line", n, li, r, len(syl)))
                    syl += syllables(line.replace("|", " "))
    return syl, items

def align(exp_syl, asr_syl):
    """단조 증가를 강제하는 DP 정렬 (Needleman-Wunsch).
    반환: 기대 음절 index → ASR 음절 index (매칭 없으면 None)"""
    n, m = len(exp_syl), len(asr_syl)
    MATCH, MISS, GAP = 2, -1, -1
    A = np.array([ord(c) for c in exp_syl], dtype=np.int32)
    B = np.array([ord(c) for c in asr_syl], dtype=np.int32)
    prev = np.arange(m + 1, dtype=np.int32) * GAP
    bt = np.zeros((n + 1, m + 1), dtype=np.int8)   # 0=대각, 1=위, 2=왼쪽
    bt[0, 1:] = 2
    bt[1:, 0] = 1
    for i in range(1, n + 1):
        cur = np.empty(m + 1, dtype=np.int32)
        cur[0] = i * GAP
        sc = np.where(B == A[i - 1], MATCH, MISS)
        row = bt[i]
        for j in range(1, m + 1):
            d = prev[j - 1] + sc[j - 1]
            u = prev[j] + GAP
            l = cur[j - 1] + GAP
            if d >= u and d >= l:
                cur[j] = d; row[j] = 0
            elif u >= l:
                cur[j] = u; row[j] = 1
            else:
                cur[j] = l; row[j] = 2
        prev = cur
    mp = [None] * n
    i, j = n, m
    while i > 0 and j > 0:
        d = bt[i, j]
        if d == 0:
            if exp_syl[i - 1] == asr_syl[j - 1]:
                mp[i - 1] = j - 1
            i -= 1; j -= 1
        elif d == 1:
            i -= 1
        else:
            j -= 1
    return mp

def main(d):
    lyrics = json.load(open(f"{d}/lyrics.json"))
    st = json.load(open(f"{d}/structure.json"))
    asr_syl, asr_tm = load_words(f"{d}/words.json")
    exp_syl, items = build_expected(lyrics, st)
    m = align(exp_syl, asr_syl)
    end_of_last = st.get("outro") or st["duration"]

    def span(i):
        return items[i][4], (items[i + 1][4] if i + 1 < len(items) else len(exp_syl))

    # 항목별 첫 매칭 음절 시각 / 마지막 매칭 음절 시각
    starts, lasts = [None] * len(items), [None] * len(items)
    for i in range(len(items)):
        s0, s1 = span(i)
        hit = [k for k in range(s0, s1) if m[k] is not None]
        if hit:
            starts[i] = asr_tm[m[hit[0]]]
            lasts[i] = asr_tm[m[hit[-1]]] + 0.25

    # 실제로 불리지 않은 장절 낭독 제거
    keep = [i for i, it in enumerate(items) if not (it[0] == "ref" and starts[i] is None)]
    n_dropped = len(items) - len(keep)
    items = [items[i] for i in keep]
    starts = [starts[i] for i in keep]
    lasts = [lasts[i] for i in keep]

    # 매칭 실패 항목은 앞뒤 성공 지점 사이를 음절 비율로 보간
    known = [i for i, s in enumerate(starts) if s is not None]
    if not known:
        raise SystemExit("정렬 실패: 가사와 음원이 일치하지 않습니다")
    n_interp = 0
    for i in range(len(items)):
        if starts[i] is not None:
            continue
        n_interp += 1
        prev = max([k for k in known if k < i], default=None)
        nxt = min([k for k in known if k > i], default=None)
        if prev is None:  starts[i] = starts[nxt]
        elif nxt is None: starts[i] = starts[prev]
        else:
            a, b = items[prev][4], items[nxt][4]
            f = (items[i][4] - a) / max(b - a, 1)
            starts[i] = starts[prev] + (starts[nxt] - starts[prev]) * f

    # 전환 지연 — 그 줄의 마지막 단어까지 화면이 남도록
    LAG = st.get("lag", 0.35)
    for i in range(1, len(items)):
        starts[i] = min(starts[i] + LAG, end_of_last)
    for i in range(1, len(items)):
        starts[i] = max(starts[i], starts[i - 1] + 0.3)

    # ASR 이 낭독을 통째로 놓친 절 → 직전 발화가 끝난 뒤의 공백을 안내 화면으로 복원
    have_ref = {it[1] for it in items if it[0] == "ref"}
    recovered = []
    for i, (kind, n, li, rep, _) in enumerate(items):
        if kind != "line" or li != 0 or rep != 0 or n in have_ref or i == 0:
            continue
        gap_from = lasts[i - 1] or starts[i - 1]
        if starts[i] - gap_from >= 2.0:
            recovered.append((n, round(gap_from, 2), round(starts[i], 2)))
            have_ref.add(n)

    # cuespec 조립
    refs, blocks = {}, {}
    for i, (kind, n, li, rep, _) in enumerate(items):
        end = starts[i + 1] if i + 1 < len(items) else end_of_last
        key = str(n)
        if kind == "ref":
            if key in refs: refs[key][1] = round(end, 2)
            else:           refs[key] = [round(starts[i], 2), round(end, 2)]
        else:
            blocks.setdefault(key, [])
            if li == 0:
                blocks[key].append([round(starts[i], 2)])
            blocks[key][-1].append(round(end, 2))
    for n, a, b in recovered:
        refs[str(n)] = [a, b]
    last_end = max(b[-1] for bl in blocks.values() for b in bl)

    spec = {"duration": st["duration"], "intro": st.get("intro"),
            "refs": refs, "blocks": blocks,
            "interludes": st.get("interludes", []),
            "outro": round(last_end, 2) if last_end < st["duration"] - 0.5 else None}
    json.dump(spec, open(f"{d}/cuespec.json", "w"), ensure_ascii=False, indent=1)

    V = {v["n"]: v for v in lyrics["verses"]}
    for i, (kind, n, li, rep, _) in enumerate(items):
        end = starts[i + 1] if i + 1 < len(items) else end_of_last
        label = f"{n}절 낭독" if kind == "ref" else f"{n}절 {rep+1}회 {li+1}줄  {V[n]['lines'][li]}"
        print(f"{starts[i]:7.2f} → {end:7.2f}  {label}")
    matched = sum(1 for x in m if x is not None)
    print(f"\n[정렬] 음절 매칭 {matched}/{len(exp_syl)} ({matched*100//max(len(exp_syl),1)}%)"
          f" · 보간 {n_interp}줄 · 낭독 제거 {n_dropped}회 · 공백복원 {len(recovered)}곳 · 전환지연 {LAG}초")
    for n, a, b in recovered:
        print(f"       └ {n}절 안내화면 복원: {a:.2f} → {b:.2f}")

if __name__ == "__main__":
    main(sys.argv[1].rstrip("/"))
