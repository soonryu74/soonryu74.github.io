"""질병관리청 지역사회건강조사 홈페이지(chs.kdca.go.kr) 발간물 목록 → data/chs_publications.json
입력: scratchpad/chs/boards5.json(게시판 4종: 한눈에 보기·지역사회 건강과 질병·보도자료·홍보자료, crawl5.mjs)
      scratchpad/chs/healthStats.json(보건소별 지역사회 건강통계집, 연도×시도, crawl6.mjs)
다운로드 주소: https://chs.kdca.go.kr/abs/fileCmmn/fileDown.do?SEQ=<fileId> (GET 가능, content-disposition attachment 확인 2026-10-02)
옛 통계집 일부는 ois.kdca.go.kr 링크(매개변수가 비어 있어 열리지 않음) → 게시판 페이지 링크로 대체.
"""
import json, sys, re, datetime
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
SP = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/claude-0/-home-user-soonryu74-github-io/e16f7b4f-1860-59c2-9e17-e9d4583aa91f/scratchpad/chs")
boards = json.load(open(SP / "boards5.json", encoding="utf-8"))
META = {
    "stats": ("지역건강통계 한눈에 보기", "/chs/stats/statsMain.do", "조사연도 다음해 1분기 발간 · 2008~2019년은 합본"),
    "hd": ("지역사회 건강과 질병(월간)", "/chs/hd/hdMain.do", "월간 소식지"),
    "news": ("보도자료", "/chs/nes/nesDataMain.do", "조사 결과 발표·실시 안내"),
    "pr": ("홍보자료", "/chs/pr/prDataMain.do", "카드뉴스·리플릿·영상"),
}
out_boards = []
for key, (name, page, note) in META.items():
    b = boards.get(key)
    if not b: continue
    items = []
    for r in b["rows"]:
        td = r["td"]
        if key == "pr":  # 번호·구분·제목·게시일
            no, kind, title, date = (td + ["", "", "", ""])[:4]
            title = f"[{kind}] {title}" if kind else title
        else:
            no, title, date = (td + ["", "", ""])[:3]
        if not title or not re.fullmatch(r"\d+", no or ""): continue
        yr = re.search(r"(20\d\d)", title) or re.search(r"(20\d\d)", date or "")
        items.append({"no": int(no), "t": title, "d": date, "y": int(yr.group(1)) if yr else None, "ids": r["fileIds"]})
    items.sort(key=lambda x: -x["no"])
    out_boards.append({"key": key, "name": name, "page": page, "note": note, "n": len(items), "items": items})
# 보건소별 통계집
hs = json.load(open(SP / "healthStats.json", encoding="utf-8")) if (SP / "healthStats.json").exists() else {}
rep, seen = [], set()
for k, v in hs.items():
    for r in v["rows"]:
        if not r["id"] and not r["ois"]: continue
        key = (v["year"], r["name"], r["id"] or r["ois"])
        if key in seen: continue
        seen.add(key)
        rep.append({"y": v["year"], "s": v["sido"], "n": r["name"], "id": r["id"], "ois": bool(r["ois"]) if not r["id"] else False})
rep.sort(key=lambda x: (-x["y"], x["s"], x["n"]))
years = sorted({x["y"] for x in rep}, reverse=True)
sidos = sorted({x["s"] for x in rep})
data = {
    "generated": datetime.date.today().isoformat(),
    "site": "https://chs.kdca.go.kr",
    "dl": "https://chs.kdca.go.kr/abs/fileCmmn/fileDown.do?SEQ=",
    "boards": out_boards,
    "reports": {"name": "지역사회 건강통계(보건소별 통계집)", "page": "/chs/recsRoom/healthStatsMain.do", "note": "조사연도 다음해 1분기 발간 · 보건소마다 한 권",
                "years": years, "sidos": sidos, "n": len(rep), "items": rep},
}
out = ROOT / "data" / "chs_publications.json"
json.dump(data, open(out, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(f"{out} {out.stat().st_size/1e3:.0f}KB · 게시판 {[(b['key'], b['n']) for b in out_boards]} · 통계집 {len(rep)}건 {years[-1] if years else ''}~{years[0] if years else ''} {len(sidos)}개 시도")
