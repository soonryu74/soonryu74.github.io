#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
소상공인시장진흥공단 상가(상권)정보 수집 → data/sangga-stores.js
- 구리시(41310)·남양주시(41360)의 상가업소를 받아 '영업지역 반경(bbox)'만 남깁니다.
- 브라우저는 이 파일만 읽어 반경 내 업종분포·유해업소·경쟁도를 계산합니다(라이브 호출 없음).
실행: DATA_GO_KR_KEY=<서비스키(인코딩형)> python3 scripts/build_sangga.py
"""
import os, json, socket, datetime, time
import urllib.request, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInAdmi"

# 수집 대상 시군구 (구리·남양주 전체 → 아래 bbox로 영업지역만 필터)
SIGNGU = [("41310", "구리시"), ("41360", "남양주시")]

# 영업지역 경계(갈매·별내·구리 인접). 이 사각형 안 상가만 저장 → 파일 경량화.
LAT_MIN, LAT_MAX = 37.585, 37.690
LON_MIN, LON_MAX = 127.090, 127.205

def force_ipv4():
    if getattr(socket, "_v4", False): return
    orig = socket.getaddrinfo
    socket.getaddrinfo = lambda h,*a,**k: [r for r in orig(h,*a,**k) if r[0]==socket.AF_INET] or orig(h,*a,**k)
    socket._v4 = True

def fetch_json(url):
    last = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "galmae-budongsan/1.0"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:
            last = e
            if attempt < 2: time.sleep(2*(attempt+1))
    raise last

def extract_items(data):
    """sdsc2 응답에서 상가 목록을 유연하게 추출."""
    body = (data or {}).get("body") or (data or {}).get("response", {}).get("body") or {}
    items = body.get("items")
    if items is None: return [], body
    if isinstance(items, dict):  # {"item":[...]} 형태 방어
        items = items.get("item", [])
    if isinstance(items, dict):
        items = [items]
    return (items or []), body

def num(v):
    try: return float(v)
    except Exception: return None

def collect_signgu(key, code, name):
    got, page, total = [], 1, None
    while True:
        q = urllib.parse.urlencode({
            "serviceKey": key, "divId": "signguCd", "key": code,
            "type": "json", "numOfRows": "1000", "pageNo": str(page),
        }, safe="%")
        try:
            data = fetch_json(f"{BASE}?{q}")
        except Exception as e:
            print(f"[{name}] {page}p 수집 실패: {e}"); break
        items, body = extract_items(data)
        if page == 1:
            total = body.get("totalCount")
            hdr = (data or {}).get("header") or (data or {}).get("response", {}).get("header") or {}
            print(f"[{name}] totalCount={total} resultCode={hdr.get('resultCode')} {hdr.get('resultMsg','')}")
            if items:
                print(f"[{name}] sample keys: {sorted(list(items[0].keys()))[:20]}")
        if not items:
            break
        got.extend(items)
        try: tc = int(total)
        except Exception: tc = None
        if tc is not None and len(got) >= tc: break
        if len(items) < 1000: break
        page += 1
        if page > 200: print(f"[{name}] 페이지 상한 도달"); break
    return got

def main():
    force_ipv4()
    key = os.environ.get("DATA_GO_KR_KEY")
    if not key:
        print("::warning::DATA_GO_KR_KEY 없음 — 건너뜀"); return 0

    kept, seen = [], set()
    lcls_count = {}
    for code, name in SIGNGU:
        rows = collect_signgu(key, code, name)
        inbox = 0
        for it in rows:
            la = num(it.get("lat")); lo = num(it.get("lon"))
            if la is None or lo is None: continue
            if not (LAT_MIN <= la <= LAT_MAX and LON_MIN <= lo <= LON_MAX): continue
            bid = it.get("bizesId")
            if bid and bid in seen: continue
            if bid: seen.add(bid)
            l = (it.get("indsLclsNm") or "").strip()
            m = (it.get("indsMclsNm") or "").strip()
            s = (it.get("indsSclsNm") or "").strip()
            rec = {
                "n": (it.get("bizesNm") or "").strip(),
                "l": l, "m": m, "s": s,
                "la": round(la, 6), "lo": round(lo, 6),
                "r": (it.get("rdnmAdr") or it.get("lnoAdr") or "").strip(),
            }
            kept.append(rec)
            lcls_count[l] = lcls_count.get(l, 0) + 1
            inbox += 1
        print(f"[{name}] 영업지역 내 {inbox}건")

    kept.sort(key=lambda r: (r["l"], r["m"], r["n"]))
    out = {
        "updated": datetime.date.today().isoformat(),
        "count": len(kept),
        "bbox": {"latMin": LAT_MIN, "latMax": LAT_MAX, "lonMin": LON_MIN, "lonMax": LON_MAX},
        "byLcls": dict(sorted(lcls_count.items(), key=lambda x: -x[1])),
        "stores": kept,
    }
    path = os.path.join(ROOT, "data/sangga-stores.js")
    with open(path, "w", encoding="utf-8") as f:
        f.write("/* 소상공인시장진흥공단 상가(상권)정보 — 갈매·별내·구리 인접 영업지역 */\n")
        f.write("window.SANGGA = " + json.dumps(out, ensure_ascii=False) + ";\n")
    print(f"완료: 상가 {len(kept)}건 저장 → data/sangga-stores.js")
    print("대분류 분포:", out["byLcls"])
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
