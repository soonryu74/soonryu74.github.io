# -*- coding: utf-8 -*-
"""
국가암검진 수검률 수집 — KOSIS DT_35007_N009
  「시군구별 성별 암검진 대상 및 수검인원 현황」 (국민건강보험공단 건강검진통계, orgId 350)

배경: 미국 CPSTF 최대 근거 블록이 암(49건·강력 권고 24건)이고 그 대부분이 검진 수검률을
      올리는 중재인데, 우리 대시보드에는 암 사망률·진료실인원만 있고 수검률이 없었다.
      (docs/미국_CPSTF_검토_v1.md 6.1)

원자료 구조: 항목 001 대상인원 / 002 수검인원 · 시군구 275(계·시도·일반구 단위)
             성별 3 · 암검진별 7(계·위·대장·간·유방·자궁경부·폐)
산출: data/raw_cancer/DT_35007_N009_<연도>.json  (원본 그대로 보관)
사용법: python scripts/kosis_fetch_cancer.py [연도시작] [연도끝]
주의: KOSIS는 연속 호출 시 수 분간 차단한다 → 호출 간격 6초 + 지수 백오프.
"""
import os, sys, json, time
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "raw_cancer"; OUT.mkdir(parents=True, exist_ok=True)
for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1); os.environ.setdefault(k.strip(), v.strip())
KEY = os.environ["KOSIS_API_KEY"]
ORG, TBL = "350", "DT_35007_N009"
S = requests.Session()
PACE = 6.0

def call(params, tries=9):
    last = None
    for i in range(tries):
        try:
            r = S.get("https://kosis.kr/openapi/Param/statisticsParameterData.do", params=params, timeout=240)
            j = r.json(); time.sleep(PACE); return j
        except Exception as e:
            last = e
            w = min(420, 30 * (2 ** i))
            print(f"    재시도 {i} {type(e).__name__} — {w}초 대기", flush=True)
            time.sleep(w)
    raise RuntimeError(f"소진: {last}")

def fetch_year(y):
    f = OUT / f"{TBL}_{y}.json"
    if f.exists() and f.stat().st_size > 1000:
        print(f"  {y}: 이미 있음 ({f.stat().st_size:,}B)", flush=True); return json.loads(f.read_text(encoding="utf-8"))
    j = call({"method": "getList", "apiKey": KEY, "format": "json", "jsonVD": "Y", "orgId": ORG, "tblId": TBL,
              "itmId": "001+002+", "objL1": "ALL", "objL2": "ALL", "objL3": "ALL",
              "prdSe": "Y", "startPrdDe": str(y), "endPrdDe": str(y)})
    if isinstance(j, list) and j:
        f.write_text(json.dumps(j, ensure_ascii=False), encoding="utf-8")
        print(f"  {y}: {len(j):,}행 저장", flush=True); return j
    print(f"  {y}: 자료 없음 — {j}", flush=True); return None

if __name__ == "__main__":
    y0 = int(sys.argv[1]) if len(sys.argv) > 1 else 2015
    y1 = int(sys.argv[2]) if len(sys.argv) > 2 else 2024
    got = []
    for y in range(y0, y1 + 1):
        try:
            if fetch_year(y): got.append(y)
        except Exception as e:
            print(f"  {y}: 실패 {e}", flush=True)
    print("수집 완료 연도:", got, flush=True)
