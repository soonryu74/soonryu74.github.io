# -*- coding: utf-8 -*-
"""
일반건강검진 수검·판정 원자료 수집 — KOSIS 국민건강보험공단 건강검진통계(orgId 350)

  DT_35007_N001_1  시군구별 성별 일반건강검진 대상 및 수검인원 현황       → 수검률
  DT_35007_N098    시군구별 성별 일반건강검진 판정 현황                   → 정상A·정상B·질환의심·유질환자
  DT_35007_N103    시군구별 성별 일반건강검진 판정결과 질환의심 세부현황   → 고혈압 의심·당뇨병 의심
  DT_35007_N105    시군구별 성별 일반건강검진 판정결과 유질환자 세부현황   → 고혈압·당뇨병 유질환자
  DT_35007_N108    시군구별 성별 일반건강검진 2차 판정현황(고혈압·당뇨)    → 2017년까지만(2018년 2차 검진 폐지)

산출: data/raw_checkup/<표ID>_<연도>.json (원본 그대로 보관, .gitignore)
사용법: python scripts/kosis_fetch_checkup.py [연도시작] [연도끝] [표ID …]
주의: KOSIS는 연속 호출 시 수 분간 차단한다 → 호출 간격 6초 + 지수 백오프.
      항목은 ALL 로 받아 원자료의 항목명(ITM_NM)을 그대로 보존한다.
"""
import os, sys, json, time
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "raw_checkup"; OUT.mkdir(parents=True, exist_ok=True)
for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1); os.environ.setdefault(k.strip(), v.strip())
KEY = os.environ["KOSIS_API_KEY"]
ORG = "350"
TABLES = ["DT_35007_N001_1", "DT_35007_N098", "DT_35007_N103", "DT_35007_N105"]
S = requests.Session()
# KOSIS는 호출 하나가 성공하면 몇 분간(관측상 1~7분) 다음 연결을 끊는다. 지수 백오프(30·60·120·240·420초)로는
# 파일 하나에 15분이 걸렸으므로, 성공 뒤 고정 대기(PACE) 후 시도하고 실패하면 짧은 간격으로 다시 두드린다.
PACE = float(os.environ.get("KOSIS_PACE", "240"))
RETRY_WAIT = float(os.environ.get("KOSIS_RETRY", "90"))

def call(params, tries=20):
    """err 21(잘못된 요청 변수)은 재시도해도 소용없으므로 즉시 반환해 호출부가 변수를 바꾸게 한다."""
    last = None
    for i in range(tries):
        try:
            r = S.get("https://kosis.kr/openapi/Param/statisticsParameterData.do", params=params, timeout=240)
            j = r.json()
            print(f"    응답 {time.strftime('%H:%M:%S')} — {PACE:.0f}초 대기", flush=True); time.sleep(PACE)
            return j
        except Exception as e:
            last = e
            print(f"    재시도 {i} {time.strftime('%H:%M:%S')} {type(e).__name__}: {str(e)[:100]} — {RETRY_WAIT:.0f}초 대기", flush=True)
            time.sleep(RETRY_WAIT)
    raise RuntimeError(f"소진: {last}")

def fetch(tbl, y):
    f = OUT / f"{tbl}_{y}.json"
    if f.exists() and f.stat().st_size > 1000:
        print(f"  {tbl} {y}: 이미 있음 ({f.stat().st_size:,}B)", flush=True); return True
    base = {"method": "getList", "apiKey": KEY, "format": "json", "jsonVD": "Y", "orgId": ORG, "tblId": tbl,
            "itmId": "ALL", "prdSe": "Y", "startPrdDe": str(y), "endPrdDe": str(y)}
    # 표마다 분류(objL) 단계 수가 달라 2·3·4단계를 차례로 시도한다(맞지 않으면 err 21)
    for n in LEVELS.get(tbl, [2, 3, 4]):
        params = {**base, **{f"objL{k}": "ALL" for k in range(1, n + 1)}}
        j = call(params)
        if isinstance(j, list) and j:
            LEVELS[tbl] = [n]
            f.write_text(json.dumps(j, ensure_ascii=False), encoding="utf-8")
            print(f"  {tbl} {y}: {len(j):,}행 저장 (objL {n}단계)", flush=True); return True
        if isinstance(j, dict) and (str(j.get("err")) == "21" or (str(j.get("err")) == "20" and "objL" in str(j.get("errMsg")))):
            # 21 = 단계가 남음(너무 많음), 20+objL = 단계가 모자람 → 둘 다 다음 단계 시도
            print(f"  {tbl} {y}: objL {n}단계 불일치(err {j.get('err')}) → 다음 단계", flush=True); continue
        print(f"  {tbl} {y}: 자료 없음 — {str(j)[:100]}", flush=True); return False
    print(f"  {tbl} {y}: 모든 단계 거부", flush=True); return False

# 표별 objL 단계(2024년 실측). 모르는 표는 2→3→4 순서로 탐색한다(탐색 호출도 차단을 부르므로 아는 표는 고정).
LEVELS = {"DT_35007_N001_1": [2], "DT_35007_N098": [3], "DT_35007_N103": [3], "DT_35007_N105": [3]}

if __name__ == "__main__":
    y0 = int(sys.argv[1]) if len(sys.argv) > 1 else 2018
    y1 = int(sys.argv[2]) if len(sys.argv) > 2 else 2024
    tbls = sys.argv[3:] or TABLES
    got = {}
    for tbl in tbls:
        for y in range(y0, y1 + 1):
            try:
                if fetch(tbl, y): got.setdefault(tbl, []).append(y)
            except Exception as e:
                print(f"  {tbl} {y}: 실패 {e}", flush=True)
    print("수집 완료:", got, flush=True)
