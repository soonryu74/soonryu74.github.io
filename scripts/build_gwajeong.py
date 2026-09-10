#!/usr/bin/env python3
"""대입정보포털 어디가(adiga.kr) 대입전략자료실 → ipsi/data/gwonjang.json

「2028학년도 권역별 대학별 권장과목(반영과목)」 엑셀을 받아 모집단위별 핵심·권장과목으로 변환한다.
고교학점제에서 고1이 2·3학년 과목을 고를 때 쓰는 원자료다.

실행: python3 scripts/build_gwajeong.py
      ADIGA_BBS_ID=26634 python3 scripts/build_gwajeong.py   (게시글이 바뀌면 지정)
원본 엑셀은 scripts/adiga_cache/ 에 캐시(커밋 제외).
"""
import html as htmlmod
import json, os, re, sys, time, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone
from http.cookiejar import CookieJar

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "scripts", "adiga_cache"); os.makedirs(CACHE, exist_ok=True)
OUT = os.path.join(ROOT, "ipsi", "data", "gwonjang.json")
BASE = "https://www.adiga.kr"
BBS = os.environ.get("ADIGA_BBS_ID", "26634")
PAGE = f"{BASE}/uct/ces/archiveView.do?prtlBbsId={BBS}&menuId=PCUCTCES1001"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"

opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CookieJar()))


def req(url, timeout=300):
    r = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": PAGE, "Accept-Language": "ko-KR,ko;q=0.9"})
    for i in range(4):
        try:
            with opener.open(r, timeout=timeout) as resp:
                return resp.read(), resp.headers
        except Exception as e:
            if i == 3: raise
            print(f"  재시도 {i+1}: {e}", file=sys.stderr); time.sleep(3 * (i + 1))


def fetch_workbook():
    """게시글에서 첨부파일 식별자를 찾아 엑셀을 내려받는다."""
    html = htmlmod.unescape(req(PAGE)[0].decode("utf-8", "ignore"))  # onclick 안의 따옴표가 &quot; 로 들어온다
    title = re.search(r'titleWordInfo">\s*<span>([^<]+)</span>', html)
    title = title.group(1).strip() if title else "권장과목 자료집"
    m = re.search(r'fnFileDownOne\(\s*"(\d+)"\s*,\s*(\d+)\s*\)', html)
    if not m: raise SystemExit("첨부파일 링크를 찾지 못함 — 게시글 번호(ADIGA_BBS_ID)를 확인하세요")
    file_id, file_sn = m.group(1), m.group(2)
    path = os.path.join(CACHE, f"{file_id}_{file_sn}.xlsx")
    if os.path.exists(path) and os.path.getsize(path) > 100000:
        return title, path
    print(f"  {title} 내려받는 중")
    blob, hdr = req(f"{BASE}/cmm/com/file/fileDown.do?fileId={file_id}&fileSn={file_sn}")
    if blob[:2] != b"PK": raise SystemExit("엑셀(zip)이 아닌 응답 — 로그인이 필요해졌을 수 있습니다")
    open(path, "wb").write(blob)
    return title, path


def clean(v):
    return re.sub(r"\s+", " ", str(v)).strip() if v is not None else ""


# 필터로 쓸 과목 태그. 대학마다 표기가 다르고, 2022 개정 교육과정에서 과학 진로선택 과목명이
# 바뀌었으므로(물리학 → 역학과 에너지·전자기와 양자 등) 옛 이름과 새 이름을 함께 본다.
# 대수·미적분Ⅰ처럼 사실상 모두가 듣는 일반선택은 변별력이 없어 태그로 두지 않는다.
SUBJECTS = [
    ("미적분Ⅱ", ["미적분Ⅱ", "미적분ii", "미적분 ii", "미적분2"]),
    ("기하", ["기하"]),
    ("확률과 통계", ["확률과 통계", "확률과통계"]),
    ("물리학", ["물리", "역학과 에너지", "전자기와 양자"]),
    ("화학", ["화학", "물질과 에너지", "화학 반응의 세계", "화학반응의 세계"]),
    ("생명과학", ["생명과학", "생명 과학", "세포와 물질대사", "생물의 유전"]),
    ("지구과학", ["지구과학", "지구 과학", "지구시스템과학", "행성우주과학"]),
    ("제2외국어/한문", ["제2외국어", "한문"]),
]


def find_subjects(text):
    low = text.lower()
    return [name for name, keys in SUBJECTS if any(k.lower() in low for k in keys)]


def tag_subjects(*texts):
    seen, out = set(), []
    for name in (n for t in texts for n in find_subjects(t)):
        if name not in seen: seen.add(name); out.append(name)
    return out


def need_groups(*texts):
    """이수 조건을 [[대안1, 대안2], [단일과목], ...] 꼴로 만든다.
    한 조각 안에 '또는'과 과목이 둘 이상이면 서로 대신할 수 있는 것으로 본다
    (예: '화학 또는 생명과학', '기하 또는 미적분Ⅱ'). 그 밖에는 모두 이수 대상으로 둔다."""
    groups, seen = [], set()
    for text in texts:
        for chunk in re.split(r"[,·/]|및", text):
            subs = find_subjects(chunk)
            if not subs: continue
            if "또는" in chunk and len(subs) > 1:
                key = tuple(sorted(subs))
                if key not in seen: seen.add(key); groups.append(subs)
            else:
                for x in subs:
                    if (x,) not in seen: seen.add((x,)); groups.append([x])
    return groups


def main():
    import openpyxl
    t0 = time.time()
    title, path = fetch_workbook()
    ws = openpyxl.load_workbook(path, read_only=True, data_only=True)["Sheet1"]
    rows = [r for i, r in enumerate(ws.iter_rows(values_only=True)) if i >= 4]
    out, univs = [], set()
    for r in rows:
        univ = clean(r[2])
        if not univ: continue
        college, dept = clean(r[3]), clean(r[4])
        core, rec, note = clean(r[5]), clean(r[6]), clean(r[7])
        if note == "-": note = ""
        if core == "-": core = ""
        if rec == "-": rec = ""
        univs.add(univ)
        out.append({"zone": clean(r[0]), "sido": clean(r[1]), "univ": univ,
                    "unit": dept or college, "college": college if dept else "",
                    "core": core, "rec": rec, "note": note,
                    "tags": tag_subjects(core, rec), "need": need_groups(core, rec)})
    out.sort(key=lambda x: (x["zone"], x["univ"], x["unit"]))
    kst = datetime.now(timezone(timedelta(hours=9))).strftime("%Y-%m-%d %H:%M")
    json.dump({"updated": kst, "title": title,
               "source": f"대입정보포털 어디가 대입전략자료실 · {title}",
               "url": PAGE, "univs": len(univs), "count": len(out),
               "subjects": [n for n, _ in SUBJECTS], "rows": out},
              open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"완료 {time.time()-t0:.0f}초: {len(univs)}개 대학 · 모집단위 {len(out)}건 → {OUT}")


if __name__ == "__main__":
    main()
