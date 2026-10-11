"""WHO STEPS 「data book」 형식 보고서(텍스트)에서 표 하나를 읽는다 — 공개 보고서의 집계 수치만.
사용: python3 extract_databook.py <report.txt> "<표 제목 줄>" [몇 번째로 나온 제목, 기본 1]
표 행 형식: 연령군 | n | % | 하한-상한 | (공백) | n | % | 하한-상한 | (공백) | n | % | 하한-상한  → 남·여·전체."""
import re, sys, json

AGE = re.compile(r"^(18-29|30-44|45-69|18-69|18-44|30-49|50-69)$")
NUM = re.compile(r"^-?\d+(\.\d+)?$")
CI = re.compile(r"^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$")

def cells(lines):
    """줄 목록 → 의미 있는 칸(공백 줄 제거, 줄바꿈으로 쪼개진 「12.3-|17.6」 이음)"""
    out = []
    for raw in lines:
        s = raw.strip()
        if not s:
            continue
        if out and out[-1].endswith("-") and NUM.match(s):
            out[-1] += s
        else:
            out.append(s)
    return out

def table(text_lines, title, nth=1, span=90):
    idx = [i for i, l in enumerate(text_lines) if l.strip().startswith(title)]
    if len(idx) < nth:
        raise SystemExit(f"제목 없음: {title} ({len(idx)}개)")
    c = cells(text_lines[idx[nth - 1] + 1: idx[nth - 1] + span])
    rows, i = {}, 0
    while i < len(c):
        if AGE.match(c[i]):
            vals, j = [], i + 1
            while j < len(c) and len(vals) < 9 and not AGE.match(c[j]):
                if NUM.match(c[j]) or CI.match(c[j]):
                    vals.append(c[j])
                j += 1
            if len(vals) >= 3:
                grp = {}
                for k, sex in enumerate(["men", "women", "both"]):
                    t = vals[k * 3: k * 3 + 3]
                    if len(t) == 3 and CI.match(t[2]):
                        lo, hi = CI.match(t[2]).groups()
                        grp[sex] = {"n": int(float(t[0])), "pct": float(t[1]), "lo": float(lo), "hi": float(hi)}
                rows.setdefault(c[i], grp)
            i = j
        else:
            i += 1
    return rows

if __name__ == "__main__":
    lines = open(sys.argv[1], encoding="utf-8").read().splitlines()
    print(json.dumps(table(lines, sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 1), ensure_ascii=False, indent=1))
