#!/usr/bin/env python3
"""학교알리미(schoolinfo.go.kr) OpenAPI → ipsi/data/schoolinfo.json

전국 중·고등학교의 학년별 학생수·학급수, 전출입·학업중단, 입학생 수, 성별 학생수, 기본정보(유형·설립·남녀·좌표)를
시도 단위(sggCode = 시도코드+'000')로 호출해 한 파일로 합친다. 학교별 "5등급제 1등급 인원(학년 학생수 × 10%)" 계산의 근거 자료.

- SCHOOLINFO_API_KEY 환경변수 필수(학교알리미 > 알리미 소식 > OpenAPI에서 네이버/카카오 로그인 후 발급).
- 공시연도는 올해부터 거슬러 올라가며 처음 성공한 연도를 쓴다(항목마다 공시 시기가 달라 연도가 다를 수 있음).
- 라이선스: 공공누리(출처표시). 출처: 교육부·한국교육학술정보원 학교알리미 https://www.schoolinfo.go.kr/
- 교과별 학업성취(평균·표준편차)·교육과정 편성표·졸업생 진로 현황은 OpenAPI 미제공 항목이라 여기서 다루지 않는다.
"""
import json, os, sys, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone, timedelta

BASE = "https://www.schoolinfo.go.kr/openApi.do"
KEY = os.environ.get("SCHOOLINFO_API_KEY", "").strip()
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "ipsi", "data", "schoolinfo.json")

SIDO = {"11": "서울", "12": "전남광주", "26": "부산", "27": "대구", "28": "인천", "30": "대전", "31": "울산", "36": "세종",
        "41": "경기", "43": "충북", "44": "충남", "47": "경북", "48": "경남", "50": "제주", "51": "강원", "52": "전북"}
SGG = {"36": "36110"}  # 세종은 시군구가 하나라 '36000'이 없다
KINDS = {"04": "고", "03": "중"}
ITEMS = {"0": "학교기본정보", "09": "학년별·학급별 학생수", "10": "전·출입 및 학업중단 학생 수", "51": "입학생 현황", "63": "성별 학생수"}
YEARS = [datetime.now().year, datetime.now().year - 1, datetime.now().year - 2]


def call(item, kind, sido, year, retry=3):
    q = {"apiKey": KEY, "apiType": item, "pbanYr": year, "schulKndCode": kind, "sidoCode": sido, "sggCode": SGG.get(sido, sido + "000")}
    url = BASE + "?" + urllib.parse.urlencode(q)
    for i in range(retry):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                d = json.loads(r.read().decode("utf-8"))
            if d.get("resultCode") == "success":
                return d.get("list") or []
            msg = d.get("resultMsg", "")
            if "공시되지 않은" in msg or "존재하지" in msg:
                return None  # 그 연도에 없음 → 이전 연도 시도
            raise RuntimeError(msg)
        except Exception as e:
            if i == retry - 1:
                print(f"  ! apiType={item} kind={kind} sido={sido} yr={year}: {e}", file=sys.stderr)
                return []
            time.sleep(2 * (i + 1))


def fetch(item, kind, sido):
    for y in YEARS:
        rows = call(item, kind, sido, y)
        if rows is None:
            continue
        return y, rows
    return None, []


def num(v):
    if v is None or v == "":
        return None
    try:
        return int(v)
    except (TypeError, ValueError):
        try:
            return float(str(v).strip())
        except ValueError:
            return None


def main():
    if not KEY:
        print("SCHOOLINFO_API_KEY 없음 — 건너뜀"); return 0
    jobs = [(it, k, s) for it in ITEMS for k in KINDS for s in SIDO]
    print(f"학교알리미 OpenAPI 호출 {len(jobs)}건 (항목 {len(ITEMS)} × 학교급 {len(KINDS)} × 시도 {len(SIDO)})")
    got = {}  # (item, kind, sido) -> (year, rows)
    with ThreadPoolExecutor(max_workers=4) as ex:
        futs = {ex.submit(fetch, *j): j for j in jobs}
        for f in as_completed(futs):
            j = futs[f]; y, rows = f.result(); got[j] = (y, rows)
            print(f"  {ITEMS[j[0]]:<18} {KINDS[j[1]]} {SIDO[j[2]]:<5} {y or '-'} {len(rows)}건")

    schools = {}
    years = {}
    for (it, k, s), (y, rows) in got.items():
        if y:
            years.setdefault(it, set()).add(y)
        for r in rows:
            code = r.get("SCHUL_CODE")
            if not code:
                continue
            o = schools.setdefault(code, {"code": code, "name": r.get("SCHUL_NM"), "kind": KINDS[k], "sido": SIDO[s],
                                          "region": r.get("ADRCD_NM"), "type": r.get("HS_KND_SC_NM") or "", "fond": r.get("FOND_SC_CODE")})
            if r.get("PBAN_EXCP_YN") == "Y":
                o["excluded"] = True
            if it == "0":
                o.update({"addr": r.get("SCHUL_RDNMA") or r.get("ADRES_BRKDN"), "coedu": r.get("COEDU_SC_CODE"),
                          "lat": num(r.get("LTTUD")), "lng": num(r.get("LGTUD")), "hp": r.get("HMPG_ADRES"),
                          "closed": r.get("ABSCH_YN") == "Y" or r.get("CLOSE_YN") == "Y"})
            elif it == "09":
                o.update({"g": [num(r.get("COL_S1")), num(r.get("COL_S2")), num(r.get("COL_S3"))],
                          "c": [num(r.get("COL_C1")), num(r.get("COL_C2")), num(r.get("COL_C3"))],
                          "students": num(r.get("COL_S_SUM")), "classes": num(r.get("COL_C_SUM")),
                          "per_class": num(r.get("COL_SUM")), "teachers": num(r.get("TEACH_CNT")), "per_teacher": num(r.get("TEACH_CAL"))})
            elif it == "10":
                p = "4" if k == "04" else "3"
                o.update({"move_out": [num(r.get(f"COL_{p}12")), num(r.get(f"COL_{p}22")), num(r.get(f"COL_{p}32"))],
                          "move_in": [num(r.get(f"COL_{p}11")), num(r.get(f"COL_{p}21")), num(r.get(f"COL_{p}31"))]})
            elif it == "51":
                o.update({"entrants": num(r.get("ALL_SUM")), "entrants_m": num(r.get("MAN_SUM")), "entrants_f": num(r.get("WOMAN_SUM"))})
            elif it == "63":
                o.update({"boys": num(r.get("COL_MSUM")), "girls": num(r.get("COL_WSUM"))})

    rows = [o for o in schools.values() if not o.get("closed")]
    rows.sort(key=lambda o: (o["kind"], o["sido"], o["name"]))
    kst = datetime.now(timezone(timedelta(hours=9))).strftime("%Y-%m-%d")
    out = {"updated": kst, "years": {ITEMS[k]: sorted(v) for k, v in years.items()},
           "source": "교육부·한국교육학술정보원 학교알리미 OpenAPI (https://www.schoolinfo.go.kr/), 공공누리 출처표시",
           "note": "g/c = 1·2·3학년 학생수/학급수, move_out = 학년별 전출(학업중단 포함) 학생수, entrants = 당해 입학생 합계. 1등급 인원 추정 = 학년 학생수 × 10% (5등급제, 과목별 수강자 수와 다를 수 있음).",
           "count": {"고": sum(1 for o in rows if o["kind"] == "고"), "중": sum(1 for o in rows if o["kind"] == "중")},
           "rows": rows}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"→ {OUT}: 고 {out['count']['고']} / 중 {out['count']['중']} ({os.path.getsize(OUT)//1024} KB), 연도 {out['years']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
