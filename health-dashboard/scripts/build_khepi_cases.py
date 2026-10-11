"""한국건강증진개발원(KHEPI) 「지역사회 통합건강증진사업 우수사례집」 → data/khepi_cases.json
입력(scratchpad/khepi): khepi_tong.json(사례집 목록 10권, 자료실 board_idx) · toc_years.json(2016·2018·2019·2023 사례 목차) · cases_2024.json(2023년 사례 40건, 주영역·부영역·대상·전략)
원문: https://www.khepi.or.kr/kps/publish/view?menuId=MENU00890&page_no=B2017003&board_idx=<idx> (첨부 PDF는 그 페이지의 「내려받기」 — 직접 링크는 폼 전송이라 불가)
영역 매핑: 사업명·주영역 문구로 대시보드 영역(흡연·음주·신체활동·식생활·비만·정신건강·구강건강·만성질환·예방·안전·의료이용)과 연결. 사례집 자체의 영역 분류가 없는 해(2016·2018·2019)는 사업명 키워드로만 추정.
"""
import json, re, sys, datetime
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
SP = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/claude-0/-home-user-soonryu74-github-io/e16f7b4f-1860-59c2-9e17-e9d4583aa91f/scratchpad/khepi")
books = json.load(open("/tmp/claude-0/khepi_tong.json", encoding="utf-8"))
toc = json.load(open(SP / "toc_years.json", encoding="utf-8"))
c2024 = json.load(open(SP / "cases_2024.json", encoding="utf-8"))
VIEW = "https://www.khepi.or.kr/kps/publish/view?menuId=MENU00890&page_no=B2017003&board_idx="
KW = [  # (대시보드 영역, 키워드)
    ("흡연", ["금연", "흡연", "담배", "노담"]), ("음주", ["절주", "음주", "술"]), ("신체활동", ["걷기", "걷", "신체활동", "운동", "달리기", "둘레길", "근육", "근감소"]),
    ("식생활·비만", ["비만", "영양", "식생활", "아침", "허리둘레", "체중"]), ("정신건강", ["치매", "우울", "정신", "인지", "자살", "스트레스"]), ("구강건강", ["구강", "치아", "잇몸"]),
    ("만성질환", ["심뇌혈관", "고혈압", "당뇨", "만성질환", "혈관", "혈압"]), ("예방·안전", ["낙상", "안전", "감염", "예방접종", "재활", "손상"]), ("의료이용", ["방문건강", "돌봄", "커뮤니티 케어", "통합건강관리", "건강관리사업", "의원"]),
]
def areas(*texts):
    t = " ".join(x for x in texts if x)
    found = [a for a, kws in KW if any(k in t for k in kws)]
    return found[:3]
cases = []
for c in c2024:
    meta = c.get("meta") or []
    main = meta[2] if len(meta) > 2 else ""; sub = meta[3] if len(meta) > 3 else ""
    cases.append({"y": 2023, "b": "11070", "sido": c["sido"], "sgg": c["sgg"], "name": c["name"], "p": c["page"],
                  "tgt": meta[0] if meta else "", "strat": meta[1] if len(meta) > 1 else "", "main": main, "sub": sub, "areas": areas(c["name"], main, sub)})
for y, v in toc.items():
    for c in v["cases"]:
        cases.append({"y": int(y), "b": v["idx"], "sido": c["sido"], "sgg": c["sgg"], "name": c["name"], "p": c["page"], "areas": areas(c["name"])})
cases.sort(key=lambda x: (-x["y"], x["sido"], x["sgg"]))
blist = [{"idx": b["idx"], "date": b["date"], "title": b["title"], "file": (b["files"] or [""])[0], "url": VIEW + b["idx"]} for b in books]
data = {"generated": datetime.date.today().isoformat(), "org": "한국건강증진개발원(KHEPI) 지역정책팀", "list_url": "https://www.khepi.or.kr/kps/publish/list?menuId=MENU00890&page_no=B2017003&srch_type=TITLE&srch_text=%EC%9A%B0%EC%88%98%EC%82%AC%EB%A1%80",
        "view": VIEW, "books": blist, "n": len(cases), "cases": cases,
        "note": "사례 목차는 PDF 목차에서 추출(2016·2018·2019·2023년 사례는 사업명·지자체·쪽만, 2023년 사례집(2024년 발간)은 대상·전략·주영역·부영역까지). 영역 연결은 사업명·주영역 키워드로 추정했으므로 원문으로 확인할 것."}
out = ROOT / "data" / "khepi_cases.json"
json.dump(data, open(out, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
from collections import Counter
print(out, f"{out.stat().st_size/1e3:.0f}KB", "cases", len(cases), Counter(c["y"] for c in cases), "no-area", sum(1 for c in cases if not c["areas"]))
