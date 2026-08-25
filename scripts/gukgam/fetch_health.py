#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
국정감사 자료 DB — 보건복지 트랙 기관 크롤러 (Phase 2, 키 불필요)
- 각 기관이 스스로 공개하는 국정감사 자료(업무보고·서면답변 등)의 게시물 링크를 수집합니다.
- 기관별 게시판 구조가 제각각이라 '어댑터' 방식: AGENCIES 설정에 검증된 게시판만 활성화.
  새 기관을 붙일 때는 목록 URL과 행 추출 패턴만 추가하면 됩니다.
- 원문 파일은 저장하지 않고 게시물 링크만 수집(누적 merge, url 기준 중복 제거).

실행: python3 scripts/gukgam/fetch_health.py
출력: data/gukgam/health-agency-docs.json
"""
import os, re, json, time, datetime
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "data", "gukgam", "health-agency-docs.json")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) gukgam-db collector"}

# 어댑터 설정: 검증된 게시판만 활성화 (2026-08 실측)
# row_pattern: (링크, 제목) 2개 그룹을 뽑는 정규식. 제목에 국정감사 키워드가 있는 행만 채택.
AGENCIES = [
    {
        "agency_id": "mohw",
        "source": "복지부 사전정보공표",
        "base": "https://www.mohw.go.kr",
        # '국정감사 업무보고 자료' 카테고리(list_no=355595) 하위 게시물 목록
        "list_url": "https://www.mohw.go.kr/board.es?mid=a10107010100&bid=0037&act=list&list_no=355595&list_depth=1",
        "row_pattern": r'<a[^>]+href="([^"]*act=view[^"]*)"[^>]*>\s*([^<]{4,90})',
    },
    # TODO(질병청 kdca): 사전정보공표 내 국정감사 게시판 URL 확인 후 추가 (menu.es 구조가 자주 개편됨)
    # TODO(심평원 hira): 서면질의 답변서 게시판(bbsDummy pgmid) 확인 후 추가
    # TODO(건보공단 nhis): 국회제출자료 게시판 확인 후 추가
]

KEYWORDS = ("국정감사", "국감")


def doc_type(title):
    t = title or ""
    if "서면" in t and "답변" in t:
        return "written_answer"
    if "업무보고" in t or "업무현황" in t:
        return "briefing"
    if "결과보고서" in t:
        return "result_report"
    if "요구자료" in t:
        return "request_list"
    return "reference"


def year_of(title):
    m = re.search(r"(20\d{2})", title or "")
    return int(m.group(1)) if m else None


def crawl(cfg):
    req = urllib.request.Request(cfg["list_url"], headers=UA)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                html = r.read().decode("utf-8", errors="ignore")
            break
        except Exception as e:
            if attempt < 2:
                time.sleep(3 * (attempt + 1))
            else:
                print(f"[{cfg['agency_id']}] 목록 수집 실패: {e}")
                return []
    out = []
    for href, title in re.findall(cfg["row_pattern"], html):
        title = title.strip()
        if not any(k in title for k in KEYWORDS):
            continue
        url = href.replace("&amp;", "&")
        if url.startswith("/"):
            url = cfg["base"] + url
        out.append({
            "year": year_of(title),
            "agency_id": cfg["agency_id"],
            "doc_type": doc_type(title),
            "title": title,
            "source": cfg["source"],
            "url": url,
        })
    print(f"[{cfg['agency_id']}] {len(out)}건 수집")
    return out


def main():
    items, seen = [], set()
    if os.path.exists(OUT):
        try:
            with open(OUT, encoding="utf-8") as f:
                items = json.load(f).get("items", [])
            seen = {i.get("url") for i in items}
        except Exception:
            items, seen = [], set()
    before = len(items)
    for cfg in AGENCIES:
        for row in crawl(cfg):
            if row["url"] in seen:
                continue
            seen.add(row["url"])
            items.append(row)
        time.sleep(1)
    items.sort(key=lambda x: (-(x["year"] or 0), x["agency_id"]))
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"updated": datetime.date.today().isoformat(), "items": items}, f, ensure_ascii=False, indent=1)
    print(f"완료: 신규 {len(items) - before}건, 누적 {len(items)}건")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
