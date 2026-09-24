#!/usr/bin/env python3
"""교육통계서비스(KESS, kess.kedi.re.kr) 학교/학과별 데이터셋 → ipsi/data/*.json

수집 원자료(엑셀, 매년 4월 1일 기준 교육기본통계):
  A. 유초중등 학교별 학년별 학생수 학급수 입학 졸업 교원 직원 면적   → schools-hs.json, schools-stats.json
  B. 고등교육 학교별 학과수 입학정원 지원 입학 학생 졸업 교직원        → univ-stats.json
  C. 고등교육 학교별X학과별 입학정원 지원 입학 학생 졸업 교원          → univ-dept.json

실행: python3 scripts/build_kess.py            (dataset 페이지에서 최신 연도 파일 자동 탐색)
      KESS_YEAR=2026 python3 scripts/build_kess.py
원본 엑셀은 scripts/kess_cache/ 에 캐시(커밋 제외).
"""
import json, os, re, sys, time, urllib.request
from collections import defaultdict
from datetime import datetime, timezone, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "scripts", "kess_cache"); os.makedirs(CACHE, exist_ok=True)
DATA = os.path.join(ROOT, "ipsi", "data")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
YEAR = os.environ.get("KESS_YEAR", "")
FALLBACK = {  # 2026.9 기준 dataset 페이지의 항목 (자동 탐색 실패 시)
    "A": ("2026835615251.xlsx", "2026년 유초중등 학교별 학년별 학생수 학급수 입학 졸업 교원 직원 면적_260903H.xlsx"),
    "B": ("202672602239494.xlsx", "2026년 고등 학교별 학과수 입학정원 지원 입학 학생 외국학생 졸업 교직원_260826H.xlsx"),
    "C": ("202672602351545.xlsx", "2026년 고등 학교별X학과별 입학정원 지원 입학 학생 외국학생 졸업 교원_260826H.xlsx"),
    "P": ("2026162291710.xlsx", "2025년 유초중등 학교별 학년별 학생수 학급수 입학 졸업 교원 직원 면적_260206W.xlsx"),
}
PAT = {"A": r"유초중등 학교별 학년별 학생수", "B": r"고등 학교별 학과수 입학정원", "C": r"고등 학교별X학과별 입학정원"}

def http(url, referer=None, binary=False, timeout=600):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9", **({"Referer": referer} if referer else {})})
    for i in range(4):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                b = r.read()
            return b if binary else b.decode("utf-8", "ignore")
        except Exception as e:
            if i == 3: raise
            print(f"  재시도 {i+1}: {e}", file=sys.stderr); time.sleep(3 * (i + 1))

def discover():
    """dataset 페이지의 downLoad('ID','파일','표시명','그룹') 항목에서 최신(또는 KESS_YEAR) 파일을 찾는다."""
    try:
        html = http("https://kess.kedi.re.kr/contents/dataset")
    except Exception as e:
        print(f"dataset 페이지 조회 실패({e}) → 내장 목록 사용", file=sys.stderr); return FALLBACK
    ent = re.findall(r"downLoad\('(\d+)','([^']+)','([^']+)','(\d+)'\)", html)
    out = {}
    for k, pat in PAT.items():
        cands = [(e[2], e[1]) for e in ent if re.search(pat, e[2]) and "하반기" not in e[2]]
        if YEAR: cands = [c for c in cands if c[0].startswith(YEAR)]
        cands.sort(key=lambda c: re.match(r"(\d{4})", c[0]).group(1) if re.match(r"(\d{4})", c[0]) else "0", reverse=True)
        out[k] = (cands[0][1], cands[0][0]) if cands else FALLBACK[k]
        if k == "A":  # 직전 연도(졸업 후 진학·취업 상황은 1년 뒤 파일에 실림)
            out["P"] = (cands[1][1], cands[1][0]) if len(cands) > 1 else FALLBACK["P"]
    return out

def download(key, fileNm, shown):
    path = os.path.join(CACHE, f"{key}_{fileNm}")
    if os.path.exists(path) and os.path.getsize(path) > 100000:
        return path
    print(f"  다운로드 {shown}")
    url = f"https://kess.kedi.re.kr/contents/dataSet/downLoad.do?fileNm={fileNm}&userfileNm={urllib.request.quote(shown)}"
    b = http(url, referer="https://kess.kedi.re.kr/contents/dataset", binary=True)
    if not b.startswith(b"PK"): raise RuntimeError("엑셀(zip)이 아닌 응답")
    open(path, "wb").write(b); return path

def sheet_rows(path, idx=0):
    import openpyxl
    wb = openpyxl.load_workbook(path, read_only=True)
    ws = wb.worksheets[idx]
    return ws.iter_rows(values_only=True)

def find_header(rows, key):
    """첫 열이 key('조사기준일'/'연도')인 행을 헤더로 삼는다. (헤더, 이후 행 이터레이터) 반환"""
    for row in rows:
        if row and str(row[0]).strip() == key:
            return [str(c).replace("\n", " ").strip() if c is not None else "" for c in row]
    raise RuntimeError("헤더 행을 찾지 못함")

def n(v):
    try:
        f = float(str(v).replace(",", "").strip()); return int(f) if f.is_integer() else round(f, 1)
    except Exception: return 0

def s(v): return "" if v is None else str(v).strip()

def build_schools(path):
    rows = sheet_rows(path); H = find_header(rows, "조사기준일"); ix = {h: i for i, h in enumerate(H)}
    g = lambda r, k: r[ix[k]] if k in ix else None
    hs, stats, kinds = [], defaultdict(lambda: defaultdict(int)), defaultdict(int)
    base = None
    for r in rows:
        if not r or not r[0]: continue
        base = base or s(r[0])
        lvl = s(g(r, "학교급")); status = s(g(r, "상태"))
        kinds[lvl] += 1
        if lvl == "고등학교":
            sido = s(g(r, "시도")); typ = s(g(r, "고등학교 유형")) or "기타"
            stats[sido][typ] += 1; stats[sido]["계"] += 1; stats["전국"][typ] += 1; stats["전국"]["계"] += 1
            adv, grad = n(g(r, "진학자_계")), n(g(r, "졸업자_계"))
            hs.append({
                "code": s(g(r, "학교코드 (KEDI)")), "name": s(g(r, "학교명")), "eng": s(g(r, "학교명(영문명)")),
                "sido": sido, "gu": s(g(r, "행정구")), "office": s(g(r, "교육 (지원)청")),
                "type": typ, "subtype": s(g(r, "학교세부유형")), "special": s(g(r, "학교운영상특례")),
                "branch": s(g(r, "본분교")), "found": s(g(r, "설립")), "daynight": s(g(r, "주야")), "coedu": s(g(r, "남녀공학 구분")),
                "status": status, "scale": s(g(r, "지역규모")), "opened": s(g(r, "개교일")),
                "addr": s(g(r, "주소")), "tel": re.sub(r"\s+", "", s(g(r, "전화번호"))), "web": s(g(r, "홈페이지")),
                "classes": n(g(r, "편성학급수_계")), "students": n(g(r, "학생수_총계_계")),
                "boys": n(g(r, "학생수_총계_남")), "girls": n(g(r, "학생수_총계_여")),
                "g1": n(g(r, "1학년_학생수_계")), "g2": n(g(r, "2학년_학생수_계")), "g3": n(g(r, "3학년_학생수_계")),
                "per_class": n(g(r, "학급당  학생수")), "teachers": n(g(r, "교원수_총계_계")), "regular": n(g(r, "교원수_정규_계")),
                "temp": n(g(r, "교원수_기간제교원_계")), "stu_per_t": n(g(r, "교원1인당 학생수")),
                "entrants": n(g(r, "입학자_계")), "grads": grad, "adv": adv, "adv_rate": n(g(r, "진학률 _전체(%)")),
                "univ4": n(g(r, "국내_대학_계")), "college": n(g(r, "국내_전문대학_계")), "abroad": n(g(r, "국외_대학_계")) + n(g(r, "국외_전문대학_계")),
                "employed": n(g(r, "취업자_계")), "etc": n(g(r, "기타_계")),
                "rooms": n(g(r, "일반 교실")), "land": n(g(r, "교지면적")),
            })
    hs.sort(key=lambda x: (x["sido"], x["gu"], x["name"]))
    return base, hs, stats, kinds

def build_outcomes(path):
    """직전 연도 파일의 고교 '졸업 후 상황'(졸업자·진학자·진학률·4년제·전문대·국외·취업) → {학교코드: {...}}"""
    rows = sheet_rows(path); H = find_header(rows, "조사기준일"); ix = {h: i for i, h in enumerate(H)}
    g = lambda r, k: r[ix[k]] if k in ix else None
    out, base = {}, None
    for r in rows:
        if not r or not r[0]: continue
        base = base or s(r[0])
        if s(g(r, "학교급")) != "고등학교": continue
        out[s(g(r, "학교코드 (KEDI)"))] = {
            "year": base[:4], "grads": n(g(r, "졸업자_계")), "adv": n(g(r, "진학자_계")), "adv_rate": n(g(r, "진학률 _전체(%)")),
            "univ4": n(g(r, "국내_대학_계")), "college": n(g(r, "국내_전문대학_계")),
            "abroad": n(g(r, "국외_대학_계")) + n(g(r, "국외_전문대학_계")), "employed": n(g(r, "취업자_계")), "etc": n(g(r, "기타_계")),
        }
    return base, out

def build_univ(path):
    rows = sheet_rows(path); H = find_header(rows, "연도"); ix = {h: i for i, h in enumerate(H)}
    g = lambda r, k: r[ix[k]] if k in ix else None
    out = []
    for r in rows:
        if not r or not r[0]: continue
        if s(g(r, "대학원구분")): continue  # 대학원 행 제외
        quota, recruit, appl, ent = n(g(r, "입학정원_전체")), n(g(r, "모집인원_계")), n(g(r, "지원자_전체_계")), n(g(r, "입학자_전체_계"))
        out.append({
            "code": s(g(r, "학교코드")), "name": s(g(r, "학교명")), "kind": s(g(r, "학제")), "status": s(g(r, "학교상태")),
            "branch": s(g(r, "본분교")), "sido": s(g(r, "시도")), "sigungu": s(g(r, "시군구")), "found": s(g(r, "설립")),
            "addr": s(g(r, "주소")), "web": s(g(r, "홈페이지")), "depts": n(g(r, "학과수_전체")),
            "quota": quota, "quota_in": n(g(r, "정원내 입학정원_학부")), "recruit": recruit, "recruit_in": n(g(r, "정원내_모집인원")),
            "applicants": appl, "entrants": ent, "entrants_in": n(g(r, "정원내_입학자_전체_계")),
            "ratio": round(appl / recruit, 1) if recruit else None,
            "enrolled": n(g(r, "재적생_전체_계")), "attending": n(g(r, "재학생_전체_계")), "foreign": n(g(r, "외국 학생_총계_계")),
            "grads": n(g(r, "졸업자_전체_계")), "faculty": n(g(r, "전임교원_계")), "staff": n(g(r, "직원_계")),
        })
    out.sort(key=lambda x: (x["kind"], -(x["applicants"] or 0)))
    return out

def build_dept(path):
    rows = sheet_rows(path); H = find_header(rows, "연도"); ix = {h: i for i, h in enumerate(H)}
    g = lambda r, k: r[ix[k]] if k in ix else None
    out = []
    for r in rows:
        if not r or not r[0]: continue
        if s(g(r, "학위과정")) != "대학과정": continue
        if s(g(r, "학교상태")) == "폐교": continue
        quota, recruit, appl, ent = n(g(r, "입학정원_학부_계")), n(g(r, "모집인원_학부_계")), n(g(r, "지원자_전체_계")), n(g(r, "입학자_전체_계"))
        if not (quota or recruit or appl or ent or n(g(r, "재적생_전체_계"))): continue
        out.append([s(g(r, "학교코드")), s(g(r, "학교명")), s(g(r, "학제")), s(g(r, "시도")), s(g(r, "설립")),
                    s(g(r, "대계열")), s(g(r, "중계열")), s(g(r, "소계열")), s(g(r, "학과명")),
                    quota, recruit, appl, ent, n(g(r, "정원내_입학자_학부_계")), n(g(r, "재적생_전체_계")), n(g(r, "졸업자_전체")), n(g(r, "전임교원_계"))])
    return out

def main():
    t0 = time.time(); files = discover()
    for k, (fn, shown) in files.items(): print(f"{k}: {shown}")
    pA, pB, pC, pP = (download(k, *files[k]) for k in "ABCP")
    kst = datetime.now(timezone(timedelta(hours=9))).strftime("%Y-%m-%d %H:%M")
    base, hs, stats, kinds = build_schools(pA)
    pbase, outcomes = build_outcomes(pP)
    for h in hs:
        o = outcomes.get(h["code"])
        h["prev"] = o if o else None
    json.dump({"updated": kst, "base_date": base, "source": "KEDI 교육통계서비스(KESS) 교육기본통계 · " + files["A"][1], "prev_source": files["P"][1], "prev_base_date": pbase, "count": len(hs), "rows": hs},
              open(os.path.join(DATA, "schools-hs.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    json.dump({"updated": kst, "base_date": base, "kinds": kinds, "hs_by_sido": stats},
              open(os.path.join(DATA, "schools-stats.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    uni = build_univ(pB)
    json.dump({"updated": kst, "source": "KESS 고등교육통계 · " + files["B"][1], "count": len(uni), "rows": uni},
              open(os.path.join(DATA, "univ-stats.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    dept = build_dept(pC)
    json.dump({"updated": kst, "source": "KESS 고등교육통계 · " + files["C"][1],
               "cols": ["code", "univ", "kind", "sido", "found", "major", "mid", "minor", "dept", "quota", "recruit", "applicants", "entrants", "entrants_in", "enrolled", "grads", "faculty"],
               "count": len(dept), "rows": dept},
              open(os.path.join(DATA, "univ-dept.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"완료 {time.time()-t0:.0f}초: 고교 {len(hs)} / 학교급 {dict(kinds)} / 대학 {len(uni)} / 학과 {len(dept)}")

if __name__ == "__main__":
    main()
