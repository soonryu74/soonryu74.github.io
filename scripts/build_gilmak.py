#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
오늘 서울 길막(집회·통제·사고) 데이터 수집 → data/gilmak/today.json

원천: seoul-block-data(https://github.com/qhshdlwl/seoul-block-data) 의 events.json
  - 집회: 서울경찰청 '오늘의 집회' 게시글(일시·장소·신고 인원·관할서)을 하루 2회 파싱한 것
  - 통제·공사·사고: 서울시 TOPIS 돌발정보
  - 좌표는 추정치. 실제 통제는 현장 상황에 따라 다름.

이 스크립트는 원천 JSON을 받아 화면에 필요한 필드만 남기고, 오늘부터 며칠치만 잘라 저장합니다.
원천을 못 받으면 기존 파일을 그대로 두어(이전 데이터 + 기준 시각 표시) 페이지가 죽지 않게 합니다.

실행: python3 scripts/build_gilmak.py   (키 불필요)
"""
import os, json, socket, time, datetime
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "gilmak", "today.json")
SRC = "https://raw.githubusercontent.com/qhshdlwl/seoul-block-data/main/events.json"
KEEP_DAYS = 4          # 오늘 포함 며칠치 보관
KST = datetime.timezone(datetime.timedelta(hours=9))


def force_ipv4():
    if getattr(socket, "_v4", False):
        return
    orig = socket.getaddrinfo
    socket.getaddrinfo = lambda h, *a, **k: [r for r in orig(h, *a, **k) if r[0] == socket.AF_INET] or orig(h, *a, **k)
    socket._v4 = True


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (soonryu74.github.io gilmak)"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:
            print(f"수집 실패({attempt + 1}/4): {e}")
            time.sleep(3 * (attempt + 1))
    return None


def pt(at):
    if not isinstance(at, dict):
        return None
    try:
        lat, lng = float(at["lat"]), float(at["lng"])
    except Exception:
        return None
    return {"lat": round(lat, 5), "lng": round(lng, 5), "approx": bool(at.get("approx", True))}


def rally(r):
    return {
        "id": r.get("id"), "kind": "rally",
        "start": r.get("start") or "", "end": r.get("end") or "", "overnight": bool(r.get("overnight")),
        "place": r.get("placeRaw") or " ".join(r.get("route") or []),
        "route": r.get("route") or [], "roads": r.get("roads") or "",
        "people": int(r.get("people") or 0), "stations": r.get("stations") or [],
        "districts": r.get("districts") or [], "march": bool(r.get("march")), "big": bool(r.get("big")),
        "at": pt(r.get("at")),
        "pts": [pt(p) for p in (r.get("pts") or []) if pt(p)],
    }


def control(c):
    return {
        "id": c.get("id") or c.get("accId"), "kind": c.get("kind") or "work", "sub": c.get("sub") or "",
        "start": c.get("start") or "", "end": c.get("end") or "", "endDate": c.get("endDate") or "",
        "title": c.get("title") or "", "detail": c.get("detail") or "", "road": c.get("road") or "",
        "districts": c.get("districts") or [], "longTerm": bool(c.get("longTerm")), "minor": bool(c.get("minor")),
        "at": pt(c.get("at")),
    }


def crowd(c):
    return {
        "id": c.get("id"), "kind": "crowd",
        "start": c.get("start") or "", "end": c.get("end") or "",
        "title": c.get("title") or "", "place": c.get("place") or c.get("detail") or "",
        "districts": c.get("districts") or [], "url": c.get("url") or "", "at": pt(c.get("at")),
    }


def main():
    force_ipv4()
    src = fetch(SRC)
    if not src or not isinstance(src.get("days"), dict):
        print("원천 데이터를 받지 못해 기존 파일을 유지합니다.")
        return
    today = datetime.datetime.now(KST).date()
    keep = {(today + datetime.timedelta(days=i)).isoformat() for i in range(KEEP_DAYS)}
    days = {}
    for d, v in sorted(src["days"].items()):
        if d not in keep or not isinstance(v, dict):
            continue
        days[d] = {
            "posted": bool(v.get("posted")),
            "sourceUrl": v.get("sourceUrl") or "https://www.smpa.go.kr/user/nd54882.do",
            "rallies": [rally(r) for r in v.get("rallies") or []],
            "controls": [control(c) for c in v.get("controls") or []],
            "incidents": [control(c) for c in v.get("incidents") or []],
            "crowds": [crowd(c) for c in v.get("crowds") or []],
        }
    # 오늘 날짜가 원천에 없어도 키는 만들어 화면이 '게시 없음'을 안내하게 한다
    for d in sorted(keep):
        days.setdefault(d, {"posted": False, "sourceUrl": "https://www.smpa.go.kr/user/nd54882.do",
                            "rallies": [], "controls": [], "incidents": [], "crowds": []})
    out = {
        "fetchedAt": datetime.datetime.now(KST).strftime("%Y-%m-%dT%H:%M:%S+09:00"),
        "sourceGeneratedAt": src.get("generatedAt") or "",
        "source": {"name": "seoul-block-data", "url": "https://github.com/qhshdlwl/seoul-block-data",
                   "upstream": ["서울경찰청 오늘의 집회", "서울시 TOPIS 돌발정보"]},
        "days": {d: days[d] for d in sorted(days)},
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    n = {d: (len(v["rallies"]), len(v["controls"]), len(v["incidents"]), len(v["crowds"])) for d, v in out["days"].items()}
    print("저장:", OUT, "날짜별(집회,통제,사고,행사):", n)


if __name__ == "__main__":
    main()
