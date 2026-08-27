#!/usr/bin/env python3
"""manuscript.md (Google Docs markdown export) → book.json 구조화."""
import json, re

SRC = "manuscript.md"
OUT = "book.json"

text = open(SRC, encoding="utf-8").read()

# 백슬래시 이스케이프 해제
text = re.sub(r"\\([~!.()\[\]*#+\-])", r"\1", text)

lines = text.split("\n")

def clean_heading(s):
    s = s.strip()
    s = re.sub(r"^#+\s*", "", s)
    s = s.replace("**", "").strip()
    return s

# 본문은 첫 '# ' 헤딩부터
first_h1 = next(i for i, l in enumerate(lines) if l.startswith("# "))
body = lines[first_h1:]

book = {
    "title": "역학조사관",
    "subtitle": "제1권 전설의 훈련단 · 제2권 일천일야",
    "edition": "감량 개고 확정본",
    "author": "soonryu",
    "language": "ko",
    "volumes": [],
}

cur_vol = cur_part = cur_ch = None
para_buf = []

def flush_para():
    global para_buf
    if not para_buf:
        return
    raw = " ".join(para_buf).strip() if False else "\n".join(para_buf).strip()
    para_buf = []
    if not raw or cur_ch is None:
        return
    # 단락 내 하드 브레이크(행말 2칸)는 줄 단위 유지
    seg_lines = [s.rstrip() for s in raw.split("\n")]
    joined = "\n".join(s for s in seg_lines if s.strip())
    if not joined:
        return
    # 이탤릭 단독 단락 → dateline (장 도입부 배경 표기)
    m = re.fullmatch(r"\*([^*].*?)\*", joined.strip(), re.S)
    if m and len(cur_ch["blocks"]) == 0:
        cur_ch["blocks"].append({"type": "dateline", "text": m.group(1).strip()})
        return
    cur_ch["blocks"].append({"type": "p", "text": joined})

for line in body:
    if line.startswith("### "):
        flush_para()
        cur_ch = {"title": clean_heading(line), "blocks": []}
        cur_part["chapters"].append(cur_ch)
    elif line.startswith("## "):
        flush_para()
        cur_part = {"title": clean_heading(line), "chapters": []}
        cur_vol["parts"].append(cur_part)
        cur_ch = None
    elif line.startswith("# "):
        flush_para()
        cur_vol = {"title": clean_heading(line), "parts": []}
        book["volumes"].append(cur_vol)
        cur_part = cur_ch = None
    elif line.strip() == "":
        flush_para()
    else:
        # 행말 하드브레이크 표시 제거하고 라인 보존
        para_buf.append(line.rstrip())
flush_para()

# 통계
nch = sum(len(p["chapters"]) for v in book["volumes"] for p in v["parts"])
nblocks = sum(len(c["blocks"]) for v in book["volumes"] for p in v["parts"] for c in p["chapters"])
chars = sum(len(b["text"]) for v in book["volumes"] for p in v["parts"] for c in p["chapters"] for b in c["blocks"])
json.dump(book, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"volumes={len(book['volumes'])} parts={sum(len(v['parts']) for v in book['volumes'])} chapters={nch} blocks={nblocks} chars={chars}")
for v in book["volumes"]:
    print("VOL:", v["title"])
    for p in v["parts"]:
        print("  PART:", p["title"], f"({len(p['chapters'])}장)")
