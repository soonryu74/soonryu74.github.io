"""공공데이터포털에서 받은 기관 CSV → caregap/data/<key>.json (화면의 '우리 동네 기관'에 연결)

지원 데이터(인증키 불필요한 파일 데이터):
  dementia       국립중앙의료원_치매안심센터 정보 (data.go.kr 15138421)
  health_center  전국보건기관표준데이터 (data.go.kr 15107750)

사용법 — 브라우저로 CSV를 내려받은 뒤:
  Mac:     python3 caregap/scripts/import_institutions_csv.py dementia ~/Downloads/치매안심센터.csv
  Windows: py caregap\\scripts\\import_institutions_csv.py dementia %USERPROFILE%\\Downloads\\치매안심센터.csv

열 이름은 후보 목록으로 찾고, 필수 열(기관명·시도·시군구)을 못 찾으면 파일을 만들지 않고 멈춘다.
값은 바꾸지 않는다. 출처·수집일을 함께 기록한다.
"""
import csv
import io
import json
import os
import sys
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "caregap", "data")

SPECS = {
    "dementia": {
        "source": {"name": "국립중앙의료원_치매안심센터 정보", "provider": "국립중앙의료원",
                   "url": "https://www.data.go.kr/data/15138421/fileData.do"},
        "kind": "치매안심센터",
        "cols": {"name": ["안심센터명", "치매안심센터명", "센터명", "기관명"],
                 "sido": ["시도", "시도명", "시도명칭"], "sigungu": ["시군구", "시군구명", "시군구명칭"],
                 "address": ["도로명주소", "소재지도로명주소", "주소"], "phone": ["전화번호", "대표전화번호", "운영기관전화번호"]},
    },
    "health_center": {
        "source": {"name": "전국보건기관표준데이터", "provider": "보건복지부·지방자치단체",
                   "url": "https://www.data.go.kr/data/15107750/standard.do"},
        "kind": "보건기관",
        "cols": {"name": ["보건기관명", "기관명"], "sido": ["시도명", "시도"], "sigungu": ["시군구명", "시군구"],
                 "address": ["소재지도로명주소", "도로명주소", "주소"], "phone": ["보건기관전화번호", "전화번호"],
                 "type": ["보건기관유형", "보건기관구분", "기관유형"]},
    },
}


def read_csv(path):
    raw = open(path, "rb").read()
    for enc in ("utf-8-sig", "cp949", "euc-kr"):
        try:
            return list(csv.DictReader(io.StringIO(raw.decode(enc))))
        except UnicodeDecodeError:
            continue
    sys.exit("인코딩을 읽지 못했습니다(UTF-8/CP949 아님).")


def pick(headers, cands):
    norm = {h.replace(" ", ""): h for h in headers if h}
    for c in cands:
        if c in norm:
            return norm[c]
    return None


def main():
    if len(sys.argv) != 3 or sys.argv[1] not in SPECS:
        sys.exit(__doc__)
    key, path = sys.argv[1], sys.argv[2]
    spec = SPECS[key]
    rows = read_csv(path)
    if not rows:
        sys.exit("빈 파일입니다.")
    cols = {k: pick(rows[0].keys(), v) for k, v in spec["cols"].items()}
    missing = [k for k in ("name", "sido", "sigungu") if not cols[k]]
    if missing:
        sys.exit(f"필수 열을 찾지 못했습니다: {missing}\n파일의 열: {list(rows[0].keys())}")
    asof = date.today().isoformat()
    items = []
    for r in rows:
        name = (r.get(cols["name"]) or "").strip()
        if not name:
            continue
        kind = (r.get(cols["type"]) or "").strip() if cols.get("type") else ""
        items.append({
            "name": name, "kind": kind or spec["kind"],
            "sido": (r.get(cols["sido"]) or "").strip(), "sigungu": (r.get(cols["sigungu"]) or "").strip(),
            "address": (r.get(cols["address"]) or "").strip() or None if cols.get("address") else None,
            "phone": (r.get(cols["phone"]) or "").strip() or None if cols.get("phone") else None,
            "basis": f"원자료 {os.path.basename(path)}",
        })
    out = {"source": {**spec["source"], "license": "공공데이터포털 이용허락범위 — 페이지에서 확인"},
           "fetchedAt": asof, "items": items}
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, f"{key}.json"), "w", encoding="utf-8") as fp:
        json.dump(out, fp, ensure_ascii=False, separators=(",", ":"))
    print(f"{key}: {len(items)}건 → caregap/data/{key}.json")


if __name__ == "__main__":
    main()
