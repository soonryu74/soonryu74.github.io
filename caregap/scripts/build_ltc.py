"""장기요양기관 평가결과(국민건강보험공단, 공공데이터포털 15104801) → CareGap 시·도별 JSON.

원자료: 저장소의 dolbom/data/eval/chunk_*.json (모심 프로젝트에서 공공데이터포털 파일을 정리한 것).
출력:  caregap/data/ltc/<시도>.json, caregap/data/regions.json
가공: 필드 선택(기관명·급여종류·시도·시군구·평가등급·평가연도)만 하고 값은 바꾸지 않는다.
실행: python3 caregap/scripts/build_ltc.py   (Windows: py caregap\\scripts\\build_ltc.py)
"""
import glob
import json
import os
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "dolbom", "data", "eval", "chunk_*.json")
OUT = os.path.join(ROOT, "caregap", "data")

SOURCE = {
    "name": "국민건강보험공단_장기요양기관 평가결과",
    "provider": "국민건강보험공단",
    "url": "https://www.data.go.kr/data/15104801/fileData.do",
    "license": "공공데이터포털 이용허락범위(출처표시) — 페이지에서 확인",
    "note": "원자료에 주소·전화번호는 포함되어 있지 않습니다. 평가등급은 평가연도 기준이며 현재와 다를 수 있습니다.",
}

def main():
    rows = []
    for f in sorted(glob.glob(SRC)):
        with open(f, encoding="utf-8") as fp:
            rows += json.load(fp)
    by_sido = {}
    for r in rows:
        if not r.get("name") or not r.get("region"):
            continue
        # 세종특별자치시는 시·군·구가 없는 단층제라 원자료 시군구가 비어 있다.
        sigungu = r.get("sigungu") or ("세종시 전체" if r["region"].startswith("세종") else "")
        if not sigungu:
            continue
        by_sido.setdefault(r["region"], []).append({
            "n": r["name"], "t": r["type"], "g": sigungu,
            "gr": r.get("grade"), "y": r.get("eval_year"),
        })
    os.makedirs(os.path.join(OUT, "ltc"), exist_ok=True)
    regions = {}
    for i, (sido, items) in enumerate(sorted(by_sido.items())):
        items.sort(key=lambda x: (x["g"], x["t"], x["n"]))
        fname = f"sido-{i:02d}.json"
        with open(os.path.join(OUT, "ltc", fname), "w", encoding="utf-8") as fp:
            json.dump({"source": SOURCE, "sido": sido, "items": items}, fp, ensure_ascii=False, separators=(",", ":"))
        regions[sido] = {"file": fname, "sigungu": sorted({x["g"] for x in items})}
    years = sorted({r.get("eval_year") for r in rows if r.get("eval_year")})
    meta = {"source": SOURCE, "builtAt": date.today().isoformat(), "count": len(rows),
            "evalYears": [years[0], years[-1]] if years else None, "regions": regions}
    with open(os.path.join(OUT, "regions.json"), "w", encoding="utf-8") as fp:
        json.dump(meta, fp, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(rows)}건 → {len(regions)}개 시·도")

if __name__ == "__main__":
    main()
