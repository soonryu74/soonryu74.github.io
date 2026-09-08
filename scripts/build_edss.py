#!/usr/bin/env python3
"""에듀데이터서비스(EDSS, edmgr.kr) 개방데이터 → ipsi/data/edss-achievement.json

학교정보공시 「교과별학업성취도_학년별」(고등학교, 개방ID 익명화 자료)을 받아
시도교육청 × 고교구분(일반고/자율고/특목고/특성화고) × 학년 × 교과(편제명) 단위로
성취도 A~E 학생수를 집계한다. 학교 식별 정보는 사용하지 않는다(재식별 금지).

실행: python3 scripts/build_edss.py   (개방데이터 목록 API에서 최신 연도 자동 선택)
      EDSS_YEAR=2025 python3 scripts/build_edss.py
"""
import csv, io, json, os, re, sys, time, urllib.parse, urllib.request, zipfile
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from http.cookiejar import CookieJar

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "ipsi", "data", "edss-achievement.json")
BASE = "https://www.edmgr.kr"
PAGE = BASE + "/edss/es/opd/odd/od/es_opd_oddod01_001?cmmRootMenuId=MENU0008&cmmUpMenuId=MENU0008&cmmMenuId=MENU0072"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
YEAR = os.environ.get("EDSS_YEAR", "")
TARGET = ("학교정보공시", "교과별학업성취도_학년별")

opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CookieJar()))

def req(url, data=None, json_body=None, timeout=600):
    h = {"User-Agent": UA, "Referer": PAGE, "Accept-Language": "ko-KR,ko;q=0.9"}
    body = None
    if json_body is not None:
        body = json.dumps(json_body).encode(); h["Content-Type"] = "application/json; charset=UTF-8"; h["X-Requested-With"] = "XMLHttpRequest"
    elif data is not None:
        body = urllib.parse.urlencode(data).encode(); h["Content-Type"] = "application/x-www-form-urlencoded"
    for i in range(4):
        try:
            with opener.open(urllib.request.Request(url, data=body, headers=h), timeout=timeout) as r:
                return r.read(), r.headers
        except Exception as e:
            if i == 3: raise
            print(f"  재시도 {i+1}: {e}", file=sys.stderr); time.sleep(3 * (i + 1))

def main():
    t0 = time.time()
    req(PAGE)  # 세션 쿠키
    lst = json.loads(req(BASE + "/edss/es/opd/odd/od/es_opd_oddod01_007", json_body={
        "searchDomnNm": "", "searchPvsnArtclNm": "", "searchPvsnYr": "", "currentArtcClssCd": "",
        "currentPvsnArtclCd": "", "searchEduDataSeNm": "", "searchAllTabYn": "Y"})[0])["aplList"]
    cand = [r for r in lst if r["eduDataSeNm"] == TARGET[0] and r["domnNm"] == TARGET[1]]
    if not cand: raise SystemExit("대상 데이터셋을 찾지 못함")
    dom = cand[-1]; print(f"{dom['domnNm']} (domnCd {dom['domnCd']}, {dom['pvsnYrNm']})")
    yrs = json.loads(req(BASE + "/edss/es/opd/odd/od/es_opd_oddod01_004", json_body={"domnCd": dom["domnCd"]})[0])
    yrs = yrs if isinstance(yrs, list) else yrs.get("list", [])
    yrs = [y for y in yrs if y["atflYr"] != "ALL"]
    pick = next((y for y in yrs if y["atflYr"] == YEAR), None) if YEAR else max(yrs, key=lambda y: y["atflYr"])
    print(f"  연도 {pick['atflYr']} (atchFileSn {pick['atchFileSn']}) 다운로드")
    blob, hdr = req(BASE + "/edss/es/opd/odd/od/es_opd_oddod01_005", data={
        "currentArtcClssCd": "ALL", "currentPvsnArtclCd": "", "searchEduDataSeNm": "",
        "atchFileSn": pick["atchFileSn"], "domnCd": dom["domnCd"], "atflYr": pick["atflYr"], "ldomnNm": dom["ldomnNm"]})
    if blob[:2] == b"PK":
        z = zipfile.ZipFile(io.BytesIO(blob)); raw = z.read([n for n in z.namelist() if n.lower().endswith(".csv")][0])
    else:
        raw = blob
    text = raw.decode("utf-8-sig") if raw[:3] == b"\xef\xbb\xbf" else raw.decode("cp949", "ignore")
    rows = csv.DictReader(io.StringIO(text))
    G = "ABCDE"
    def n(x):
        try: return int(float(x))
        except Exception: return 0
    agg = defaultdict(lambda: [0] * 5); schools = defaultdict(set)
    for r in rows:
        if r.get("학교급명") != "고등학교": continue
        typ = r.get("고등학교구분명", "")
        if typ not in ("일반고", "자율고", "특목고", "특성화고"): continue
        key = (r["시도교육청명"].replace("교육청", "").replace("특별자치도", "").replace("특별자치시", "").replace("광역시", "").replace("특별시", ""),
               typ, r["공시학년명"], r["편제명"].replace("?", "·"))
        cnt = [n(r.get(f"성취도평가{g}등급학생수_집계안함")) for g in G]
        if sum(cnt) == 0: continue
        a = agg[key]
        for i in range(5): a[i] += cnt[i]
        schools[key].add(r["개방ID"])
    out = []
    for (sido, typ, grade, subj), v in agg.items():
        out.append([sido, typ, grade, subj, *v, len(schools[(sido, typ, grade, subj)])])
    out.sort()
    kst = datetime.now(timezone(timedelta(hours=9))).strftime("%Y-%m-%d %H:%M")
    json.dump({"updated": kst, "year": pick["atflYr"], "source": f"에듀데이터서비스(EDSS) 개방데이터 · 학교정보공시 {dom['domnNm']} ({pick['atflYr']})",
               "note": "학교 단위 익명자료(개방ID)를 시도×고교구분×학년×교과로 합산. 학생수는 과목 이수 인원 합계(중복 포함).",
               "cols": ["sido", "type", "grade", "subject", "A", "B", "C", "D", "E", "schools"], "rows": out},
              open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"완료 {time.time()-t0:.0f}초: {len(out)}행 → {OUT}")

if __name__ == "__main__":
    main()
