#!/usr/bin/env python3
"""나이스 교육정보 개방포털(open.neis.go.kr) 학교기본정보 → ipsi/data/schools-hs.json, ipsi/data/schools-min.json

- NEIS_API_KEY 환경변수가 있으면 1,000건/페이지, 없으면 5건/페이지(무인증 샘플 모드)로 전 페이지를 순회한다.
- 고등학교는 전 필드, 초·중·특수·각종학교는 축약 필드로 저장.
- 결과 JSON은 정적 페이지(ipsi/hakgyo.html)가 바로 읽는다.
"""
import json, os, sys, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone, timedelta

BASE = "https://open.neis.go.kr/hub/schoolInfo"
KEY = os.environ.get("NEIS_API_KEY", "").strip()
PSIZE = 1000 if KEY else 5
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_HS = os.path.join(ROOT, "ipsi", "data", "schools-hs.json")
OUT_MIN = os.path.join(ROOT, "ipsi", "data", "schools-min.json")
KINDS = ["고등학교", "중학교", "초등학교", "특수학교", "각종학교(고)", "각종학교(중)", "각종학교(초)"]

def fetch(kind, page, retry=4):
    q = {"Type": "json", "pIndex": page, "pSize": PSIZE, "SCHUL_KND_SC_NM": kind}
    if KEY: q["KEY"] = KEY
    url = BASE + "?" + urllib.parse.urlencode(q)
    for i in range(retry):
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                d = json.loads(r.read().decode("utf-8"))
            if "schoolInfo" in d:
                head = d["schoolInfo"][0]["head"]
                return int(head[0]["list_total_count"]), d["schoolInfo"][1]["row"]
            code = d.get("RESULT", {}).get("CODE", "")
            if code == "INFO-200":
                return 0, []
            raise RuntimeError(code)
        except Exception as e:
            if i == retry - 1:
                print(f"  ! {kind} p{page} 실패: {e}", file=sys.stderr)
                return None, []
            time.sleep(1.5 * (i + 1))

def fetch_kind(kind):
    total, rows = fetch(kind, 1)
    if not total:
        print(f"  {kind}: 0건"); return []
    pages = (total + PSIZE - 1) // PSIZE
    print(f"  {kind}: {total}건 / {pages}페이지 ({PSIZE}건씩)")
    out = list(rows); failed = []
    with ThreadPoolExecutor(max_workers=8 if not KEY else 2) as ex:
        futs = {ex.submit(fetch, kind, p): p for p in range(2, pages + 1)}
        for f in as_completed(futs):
            t, r = f.result()
            if t is None: failed.append(futs[f])
            out.extend(r)
    for p in failed:  # 순차 재시도
        t, r = fetch(p and kind, p)
        out.extend(r)
    # 중복 제거
    seen, uniq = set(), []
    for r in out:
        k = r["SD_SCHUL_CODE"]
        if k not in seen:
            seen.add(k); uniq.append(r)
    if len(uniq) != total:
        print(f"  ! {kind}: 수집 {len(uniq)} ≠ 총 {total}", file=sys.stderr)
    return uniq

def sigungu(addr):
    """도로명주소에서 시·군·구 추출 (예: '경기도 수원시 영통구 ...' → '수원시')"""
    parts = (addr or "").split()
    if len(parts) < 2: return ""
    p = parts[1]
    # 세종특별자치시는 시군구 없음
    if parts[0].startswith("세종"): return "세종시"
    return p

def slim_hs(r):
    return {
        "code": r["SD_SCHUL_CODE"], "name": r["SCHUL_NM"], "eng": r.get("ENG_SCHUL_NM",""),
        "sido": r["LCTN_SC_NM"], "office": r["ATPT_OFCDC_SC_NM"], "office_code": r["ATPT_OFCDC_SC_CODE"],
        "sigungu": sigungu(r.get("ORG_RDNMA")),
        "found": r.get("FOND_SC_NM",""),            # 국립/공립/사립
        "hs_type": r.get("HS_SC_NM","") or "",     # 일반고/특성화고/특수목적고/자율고
        "track": r.get("HS_GNRL_BUSNS_SC_NM",""),  # 일반계/전문계
        "special": r.get("SPECLY_PURPS_HS_ORD_NM","") or "",  # 과학계열/외국어계열/…
        "coedu": r.get("COEDU_SC_NM",""), "daynight": r.get("DGHT_SC_NM",""),
        "addr": (r.get("ORG_RDNMA","") + " " + (r.get("ORG_RDNDA","") or "")).strip(),
        "zip": (r.get("ORG_RDNZC","") or "").strip(), "tel": r.get("ORG_TELNO",""),
        "web": r.get("HMPG_ADRES","") or "", "founded": r.get("FOAS_MEMRD",""),
        "anniv": r.get("FOND_YMD",""), "industry": r.get("INDST_SPECL_CCCCL_EXST_YN",""),
    }

def slim_min(r):
    return {"code": r["SD_SCHUL_CODE"], "name": r["SCHUL_NM"], "kind": r["SCHUL_KND_SC_NM"],
            "sido": r["LCTN_SC_NM"], "sigungu": sigungu(r.get("ORG_RDNMA")), "found": r.get("FOND_SC_NM",""),
            "coedu": r.get("COEDU_SC_NM",""), "addr": r.get("ORG_RDNMA","")}

def main():
    print(f"NEIS 학교기본정보 수집 시작 (인증키 {'있음' if KEY else '없음 → 5건/페이지 모드'})")
    t0 = time.time(); allrows = {}
    for k in KINDS:
        allrows[k] = fetch_kind(k)
    hs = [slim_hs(r) for r in allrows["고등학교"]] + [dict(slim_hs(r), hs_type="각종학교(고)") for r in allrows["각종학교(고)"]]
    hs.sort(key=lambda x: (x["sido"], x["sigungu"], x["name"]))
    kst = datetime.now(timezone(timedelta(hours=9))).strftime("%Y-%m-%d %H:%M")
    stats = {}
    for k, rows in allrows.items(): stats[k] = len(rows)
    json.dump({"updated": kst, "source": "나이스 교육정보 개방포털 학교기본정보(schoolInfo)", "count": len(hs), "rows": hs},
              open(OUT_HS, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    mins = [slim_min(r) for k in KINDS for r in allrows[k]]
    json.dump({"updated": kst, "stats": stats, "count": len(mins), "rows": mins},
              open(OUT_MIN, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"완료: 고교 {len(hs)}개 / 전체 {len(mins)}개, {time.time()-t0:.0f}초 → {OUT_HS}, {OUT_MIN}")

if __name__ == "__main__":
    main()
