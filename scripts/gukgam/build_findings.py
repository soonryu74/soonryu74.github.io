#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
국정감사 자료 DB — 결과보고서 지적사항 추출기 (Phase 3)
- 보건복지위원회 국정감사 결과보고서 PDF에서 '시정 및 처리요구사항' 섹션을 파싱해
  기관·부서별 지적/요구 항목을 구조화합니다. (2024년 보고서 기준 1,500여 건)
- 답변 대비 워크북(gukgam-prep.html)의 '작년 지적사항 전수 목록' 데이터가 됩니다.

실행: python3 scripts/gukgam/build_findings.py            # 기본: 최신 연도
      GUKGAM_YEAR=2023 python3 scripts/gukgam/build_findings.py
의존성: pypdf (pip install pypdf) — 연 1회 수동/디스패치 실행 용도
출력: data/gukgam/findings-{연도}.json
"""
import os, re, io, json, datetime
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "data", "gukgam")
COMMITTEE = os.environ.get("GUKGAM_COMMITTEE", "보건복지위원회")


def find_report():
    with open(os.path.join(DATA, "reports.json"), encoding="utf-8") as f:
        rows = json.load(f)["items"]
    cand = [r for r in rows if r["committee"] == COMMITTEE and r["doc_type"] == "result_report" and r.get("pdf")]
    want = os.environ.get("GUKGAM_YEAR")
    if want:
        cand = [r for r in cand if str(r["year"]) == want]
    cand.sort(key=lambda r: -(r["year"] or 0))
    if not cand:
        raise SystemExit(f"{COMMITTEE} 결과보고서를 reports.json에서 찾지 못함")
    return cand[0]


def pdf_text(url):
    from pypdf import PdfReader
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (gukgam-db collector)"})
    with urllib.request.urlopen(req, timeout=120) as r:
        buf = io.BytesIO(r.read())
    reader = PdfReader(buf)
    return "\n".join((p.extract_text() or "") for p in reader.pages)


def parse(text):
    # 목차가 아닌 본문 섹션(마지막 출현) 기준
    starts = [m.start() for m in re.finditer(r"시정 및 처리요구사항", text)]
    if not starts:
        raise SystemExit("'시정 및 처리요구사항' 섹션을 찾지 못함")
    sec = text[starts[-1]:]
    sec = re.sub(r"-\s*\d+\s*-", " ", sec)  # 페이지 번호 제거

    items, group, agency, dept, topic = [], "", "", "", ""
    buf = None

    def flush():
        nonlocal buf
        if buf is not None:
            t = re.sub(r"\s+", " ", buf).strip()
            if len(t) > 8:
                items.append({"group": group, "agency": agency, "dept": dept, "topic": topic, "text": t})
        buf = None

    for raw in sec.split("\n"):
        line = raw.strip()
        if not line:
            continue
        m = re.match(r"^[가-하]\.\s*(.{2,30}?)\s*소관", line)
        if m:
            flush(); group = m.group(1).strip(); agency = dept = topic = ""
            continue
        m = re.match(r"^\d+\)\s*(.{2,40})$", line)
        if m:
            flush(); agency = m.group(1).strip(); dept = topic = ""
            continue
        m = re.match(r"^\(\d+\)\s*(.{2,60})$", line)
        if m:
            flush(); dept = m.group(1).strip(); topic = ""
            continue
        m = re.match(r"^《\s*(.+?)\s*》", line)
        if m:
            flush(); topic = m.group(1).strip()
            continue
        if line.startswith("○"):
            flush(); buf = line.lstrip("○").strip()
            continue
        if buf is not None:  # 줄바꿈으로 잘린 항목 이어붙이기
            buf += " " + line
    flush()
    return items


def main():
    rpt = find_report()
    print(f"대상: {rpt['year']}년 {rpt['committee']} 결과보고서")
    items = parse(pdf_text(rpt["pdf"]))
    out = {
        "updated": datetime.date.today().isoformat(),
        "year": rpt["year"],
        "committee": rpt["committee"],
        "source_pdf": rpt["pdf"],
        "items": items,
    }
    path = os.path.join(DATA, f"findings-{rpt['year']}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    agencies = sorted({i["agency"] for i in items if i["agency"]})
    print(f"완료: {len(items)}건 추출, 기관 {len(agencies)}곳 → {os.path.basename(path)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
