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


# 판정에서 "늘 듣는다"고 보는 기초 과목(태그 없음). "대수, 미적분Ⅰ, 확률과 통계, 미적분Ⅱ, 기하 중 4과목"처럼
# 개수 조건에 이런 과목이 섞여 있으면 그 수만큼 요구 개수를 줄여 태그 과목만으로 조건을 만든다.
BASE_SUBJ = ["대수", "미적분Ⅰ", "미적분1", "미적분 i", "영어Ⅰ", "영어Ⅱ", "영어 독해와 작문", "영어독해와 작문", "문학",
             "화법과 언어", "독서와 작문", "한국사", "통합사회", "통합과학", "공통"]


def is_base(chunk):
    low = chunk.lower()
    return any(b.lower() in low for b in BASE_SUBJ)


def parse_clauses(text, conditional_only=False):
    """이수 조건 문장을 (must, any) 로 푼다.
    must = 모두 이수해야 하는 태그 과목, any = [{"of": [...], "n": k}] (of 중 k과목 이상).
    - "[A, B, C 중 2과목]", "A/B/C 중 1과목 이상", "A, B 중 1과목", "A 또는 B", "[A 또는 B]" 를 개수 조건으로 본다.
    - conditional_only=True 면 개수·포함 조건이 있는 절만 읽는다(비고란용). 평범한 나열은 무시.
    - 태그 과목이 아닌 것(대수·영어Ⅰ 같은 기초 과목, '과학' 같은 교과군)은 조건에서 뺀다."""
    must, anys = [], []

    def add_any(subs, n):
        subs = list(dict.fromkeys(subs))
        if not subs: return
        n = max(1, min(n, len(subs)))
        if n >= len(subs): must.extend(subs)
        else: anys.append({"of": subs, "n": n})

    def cnt(m): return int(m.group(1))

    t = text
    for m in re.finditer(r"\[([^\]]+)\]", t):
        inner = m.group(1); subs = find_subjects(inner)
        mm = re.search(r"중\s*(\d+)\s*과목", inner)
        items = [c.strip() for c in re.split(r"[,/]", re.sub(r"중\s*\d+\s*과목.*", "", inner)) if c.strip()]
        base = sum(1 for it in items if not find_subjects(it) and is_base(it))
        if mm: add_any(subs, cnt(mm) - base)
        elif "또는" in inner or "/" in inner: add_any(subs, 1)
        elif not conditional_only: must.extend(subs)
    t = re.sub(r"\[[^\]]+\]", " ", t)
    for clause in re.split(r"(?:^|\s)-(?=[가-힣])|;", t):
        clause = re.sub(r"^\s*[가-힣·/()\s]+:\s*", "", clause.strip())  # "-수학: " 같은 라벨 제거
        if not clause: continue
        chunks = [c.strip() for c in clause.split(",") if c.strip()]
        run = []  # 개수 조건 앞에 나열된 단일 과목들

        def flush():
            if not conditional_only:
                for it in run: must.extend(find_subjects(it))
            run.clear()

        for c in chunks:
            mm = re.search(r"중\s*(\d+)\s*과목", c)
            if mm:
                items = run + [re.sub(r"중\s*\d+\s*과목.*", "", c)]
                subs = [x for it in items for x in find_subjects(it)]
                base = sum(1 for it in items if not find_subjects(it) and is_base(it))
                add_any(subs, cnt(mm) - base); run.clear()
            elif "또는" in c or "/" in c:
                flush(); subs = find_subjects(c)
                if len(subs) > 1: add_any(subs, 1)
                elif not conditional_only: must.extend(subs)
            elif "포함" in c:
                flush(); must.extend(find_subjects(c))
            else:
                subs = find_subjects(c)
                if len(subs) == 1 or (not subs and is_base(c)): run.append(c)
                else: flush(); (not conditional_only) and must.extend(subs)
        flush()
    must = [x for x in dict.fromkeys(must)]
    anys = [g for g in anys if not set(g["of"]) <= set(must)]
    return must, anys


def need_groups(core, rec, note=""):
    """모집단위의 이수 조건. kind: subj(과목 지정 → 판정), list(반영과목 목록 → 판정 안 함),
    group(교과군·계열 문구만 → 판정 안 함), free(아무 지정 없음). 권장(rec)은 판정에 쓰지 않고 표시만."""
    if core.startswith("-"):  # "-일반선택: … -진로선택: …" 반영과목 목록
        return {"kind": "list", "must": [], "any": [], "rec": tag_subjects(rec)}
    must, anys = parse_clauses(core)
    m2, a2 = parse_clauses(note, conditional_only=True)
    must = [x for x in dict.fromkeys(must + m2)]
    anys = [g for g in anys + a2 if not set(g["of"]) <= set(must)]
    kind = "subj" if (must or anys) else ("group" if (core or note) else "free")
    return {"kind": kind, "must": must, "any": anys, "rec": [x for x in tag_subjects(rec) if x not in must]}


def main():
    import openpyxl
    t0 = time.time()
    if os.environ.get("GWONJANG_REPARSE"):  # 원자료 재수집 없이 기존 JSON의 core/rec/note 로 need 만 다시 계산
        old = json.load(open(OUT, encoding="utf-8"))
        for r in old["rows"]:
            r["tags"] = tag_subjects(r["core"], r["rec"]); r["need"] = need_groups(r["core"], r["rec"], r["note"])
        old["updated"] = datetime.now(timezone(timedelta(hours=9))).strftime("%Y-%m-%d %H:%M")
        old["subjects"] = [n for n, _ in SUBJECTS]
        json.dump(old, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        print(f"재계산 완료: {old['count']}건 → {OUT}"); return
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
                    "tags": tag_subjects(core, rec), "need": need_groups(core, rec, note)})
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
