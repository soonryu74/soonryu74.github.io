#!/usr/bin/env python3
"""에듀데이터서비스(EDSS, edmgr.kr) 개방데이터 → ipsi/data/edss-*.json

두 가지를 받아 집계한다. 원자료의 학교 식별자(개방ID)는 집계에만 쓰고 저장하지 않는다.

  1) 학교정보공시 「교과별학업성취도_학년별」(고교)
     → edss-achievement.json : 시도 × 고교구분 × 학년 × 교과별 성취도 A~E 학생수
  2) 대학정보공시 「신입생의출신고등학교유형별현황」(4년제)
     → edss-admission.json   : 전형유형 × 출신 고교유형 / 출신 지역 입학생 수

실행: python3 scripts/build_edss.py   (개방데이터 목록 API에서 최신 연도 자동 선택)
      EDSS_YEAR=2025 python3 scripts/build_edss.py
"""
import csv, io, json, os, re, sys, time, urllib.parse, urllib.request, zipfile
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from http.cookiejar import CookieJar

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "ipsi", "data")
BASE = "https://www.edmgr.kr"
PAGE = BASE + "/edss/es/opd/odd/od/es_opd_oddod01_001?cmmRootMenuId=MENU0008&cmmUpMenuId=MENU0008&cmmMenuId=MENU0072"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
YEAR = os.environ.get("EDSS_YEAR", "")
ACHV = ("학교정보공시", "교과별학업성취도_학년별")
ADMS = ("대학정보공시", "신입생의출신고등학교유형별현황")

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

def pick_dataset(lst, target, year):
    """개방데이터 목록에서 (분야, 데이터셋명)에 맞는 항목과 내려받을 연도 파일을 고른다."""
    cand = [r for r in lst if r["eduDataSeNm"] == target[0] and r["domnNm"] == target[1]]
    if not cand: raise SystemExit(f"대상 데이터셋을 찾지 못함: {target}")
    dom = cand[-1]
    yrs = json.loads(req(BASE + "/edss/es/opd/odd/od/es_opd_oddod01_004", json_body={"domnCd": dom["domnCd"]})[0])
    yrs = yrs if isinstance(yrs, list) else yrs.get("list", [])
    yrs = [y for y in yrs if y["atflYr"] != "ALL"]
    pick = next((y for y in yrs if y["atflYr"] == year), None) if year else None
    pick = pick or max(yrs, key=lambda y: y["atflYr"])
    print(f"{dom['domnNm']} (domnCd {dom['domnCd']}) — {pick['atflYr']}년 파일 내려받는 중")
    blob, _ = req(BASE + "/edss/es/opd/odd/od/es_opd_oddod01_005", data={
        "currentArtcClssCd": "ALL", "currentPvsnArtclCd": "", "searchEduDataSeNm": "",
        "atchFileSn": pick["atchFileSn"], "domnCd": dom["domnCd"], "atflYr": pick["atflYr"], "ldomnNm": dom["ldomnNm"]})
    if blob[:2] == b"PK":
        z = zipfile.ZipFile(io.BytesIO(blob)); raw = z.read([n for n in z.namelist() if n.lower().endswith(".csv")][0])
    else:
        raw = blob
    text = raw.decode("utf-8-sig") if raw[:3] == b"\xef\xbb\xbf" else raw.decode("cp949", "ignore")
    return dom, pick["atflYr"], csv.DictReader(io.StringIO(text))


def num(x):
    try: return int(float(x))
    except Exception: return 0


def build_achievement(dom, year, rows, kst):
    """고교 성취도 A~E → 시도 × 고교구분 × 학년 × 교과"""
    G = "ABCDE"
    agg = defaultdict(lambda: [0] * 5); schools = defaultdict(set)
    for r in rows:
        if r.get("학교급명") != "고등학교": continue
        typ = r.get("고등학교구분명", "")
        if typ not in ("일반고", "자율고", "특목고", "특성화고"): continue
        sido = re.sub(r"(교육청|특별자치도|특별자치시|광역시|특별시)", "", r["시도교육청명"])
        key = (sido, typ, r["공시학년명"], r["편제명"].replace("?", "·"))
        cnt = [num(r.get(f"성취도평가{g}등급학생수_집계안함")) for g in G]
        if sum(cnt) == 0: continue
        a = agg[key]
        for i in range(5): a[i] += cnt[i]
        schools[key].add(r["개방ID"])
    out = sorted([k[0], k[1], k[2], k[3], *v, len(schools[k])] for k, v in agg.items())
    json.dump({"updated": kst, "year": year,
               "source": f"에듀데이터서비스(EDSS) 개방데이터 · 학교정보공시 {dom['domnNm']} ({year})",
               "note": "학교 단위 익명자료(개방ID)를 시도×고교구분×학년×교과로 합산. 학생수는 과목 이수 인원 합계(중복 포함).",
               "cols": ["sido", "type", "grade", "subject", "A", "B", "C", "D", "E", "schools"], "rows": out},
              open(os.path.join(DATA, "edss-achievement.json"), "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))
    return len(out)


HS_TYPES = [("일반고", "일반고학생수"), ("자율고", "자율고학생수"), ("공립 자율고", "공립자율고학생수"),
            ("과학고", "과학고학생수"), ("영재학교", "영재학교학생수"), ("외고·국제고", "외고국제고학생수"),
            ("예술·체육고", "예술체육고학생수"), ("마이스터고", "산업수요맞춤형고등학교학생수"),
            ("특성화고", "전문계고학생수"), ("검정고시", "검정고시학생수"),
            ("대안학교", "대안학교학생수"), ("기타", "기타학생수")]
REGIONS = [("특별시", "특별시지역학교출신입학생수"), ("광역시·특별자치시", "광역시특별자치시지역학교출신입학생수"),
           ("중소도시", "중소도시지역학교출신입학생수"), ("읍·면", "읍면지역학교출신입학생수"),
           ("특수지역", "특수지역학교출신입학생수"), ("기타", "기타지역학교출신입학생수")]


def build_admission(dom, year, rows, kst):
    """4년제 신입생 출신고교 → 전형유형 × (고교유형 / 출신지역)"""
    hs = defaultdict(lambda: [0] * len(HS_TYPES))
    rg = defaultdict(lambda: [0] * len(REGIONS))
    total = defaultdict(int); univ = defaultdict(set)
    for r in rows:
        if r.get("학교구분명") != "대학": continue   # 전문대 제외
        k = r["전형유형명"]
        for i, (_, c) in enumerate(HS_TYPES): hs[k][i] += num(r.get(c))
        for i, (_, c) in enumerate(REGIONS): rg[k][i] += num(r.get(c))
        total[k] += num(r.get("신입생출신고등학교유형별_총입학생수"))
        univ[k].add(r["개방ID"])
    out = [{"type": k, "total": total[k], "univs": len(univ[k]), "hs": hs[k], "region": rg[k]}
           for k in sorted(total, key=lambda x: -total[x])]
    json.dump({"updated": kst, "year": year,
               "source": f"에듀데이터서비스(EDSS) 개방데이터 · 대학정보공시 {dom['domnNm']} ({year})",
               "note": "4년제 대학(전문대 제외) 신입생의 출신 고교 유형·지역. 대학 단위는 개방ID로 익명화되어 있어 전형유형별 전국 합계만 산출.",
               "hs_labels": [l for l, _ in HS_TYPES], "region_labels": [l for l, _ in REGIONS], "rows": out},
              open(os.path.join(DATA, "edss-admission.json"), "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))
    return len(out), sum(total.values())


def main():
    t0 = time.time()
    req(PAGE)  # 세션 쿠키
    lst = json.loads(req(BASE + "/edss/es/opd/odd/od/es_opd_oddod01_007", json_body={
        "searchDomnNm": "", "searchPvsnArtclNm": "", "searchPvsnYr": "", "currentArtcClssCd": "",
        "currentPvsnArtclCd": "", "searchEduDataSeNm": "", "searchAllTabYn": "Y"})[0])["aplList"]
    kst = datetime.now(timezone(timedelta(hours=9))).strftime("%Y-%m-%d %H:%M")
    n1 = build_achievement(*pick_dataset(lst, ACHV, YEAR), kst)
    n2, ent = build_admission(*pick_dataset(lst, ADMS, YEAR), kst)
    print(f"완료 {time.time()-t0:.0f}초: 성취도 {n1}행 / 전형 {n2}유형·입학생 {ent:,}명 → {DATA}")


if __name__ == "__main__":
    main()
