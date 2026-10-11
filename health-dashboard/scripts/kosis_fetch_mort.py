# -*- coding: utf-8 -*-
"""
시군구 사망원인별 연령표준화 사망률 수집 — KOSIS 국가데이터처(옛 통계청, orgId 101)

  DT_1B34E13  시군구/사망원인(50항목)/성/ 사망자수, 사망률, 연령표준화 사망률(1998~)

김동현 교수 DB(v1.7)는 2024년까지라, 사망원인통계가 새로 공표되면(매년 9월 하순) 이 스크립트로
KOSIS에서 직접 받아 이어 붙인다(scripts/build_mort.py). 대조를 위해 DB와 겹치는 해(2024)도 함께 받는다.

산출: data/raw_mort/DT_1B34E13_meta.json, DT_1B34E13_<연도>.json (원본 그대로, .gitignore)
사용법: python scripts/kosis_fetch_mort.py [연도시작] [연도끝]
주의: KOSIS는 한 호출이 성공하면 몇 분간 다음 연결을 끊는다 → 성공 후 고정 대기(KOSIS_PACE, 기본 240초).
      한 호출 4만 셀 제한 → 성별은 「계」, 항목은 「사망률」·「연령표준화 사망률」, 사망원인은 대시보드가 쓰는 21개만
      (21 × 시군구 385 × 2항목 = 16,170셀/해 → 두 해를 한 번에 받는다).
"""
import os, sys, json, time
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "raw_mort"; OUT.mkdir(parents=True, exist_ok=True)
for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1); os.environ.setdefault(k.strip(), v.strip().strip('"'))
KEY = os.environ["KOSIS_API_KEY"]
TBL = "DT_1B34E13"
S = requests.Session()
PACE = float(os.environ.get("KOSIS_PACE", "240"))
RETRY_WAIT = float(os.environ.get("KOSIS_RETRY", "90"))


def call(url, params, tries=25):
    last = None
    for i in range(tries):
        try:
            r = S.get(url, params=params, timeout=240)
            j = r.json()
            print(f"    응답 {time.strftime('%H:%M:%S')} — {PACE:.0f}초 대기", flush=True); time.sleep(PACE)
            return j
        except Exception as e:
            last = e
            print(f"    재시도 {i} {time.strftime('%H:%M:%S')} {type(e).__name__}: {str(e)[:90]} — {RETRY_WAIT:.0f}초 대기", flush=True)
            time.sleep(RETRY_WAIT)
    raise RuntimeError(f"소진: {last}")


def meta():
    f = OUT / f"{TBL}_meta.json"
    if f.exists() and f.stat().st_size > 1000:
        return json.loads(f.read_text(encoding="utf-8"))
    j = call("https://kosis.kr/openapi/statisticsData.do",
             {"method": "getMeta", "apiKey": KEY, "format": "json", "jsonVD": "Y", "orgId": "101", "tblId": TBL, "type": "ITM"})
    if not isinstance(j, list):
        raise SystemExit(f"메타 실패: {str(j)[:200]}")
    f.write_text(json.dumps(j, ensure_ascii=False), encoding="utf-8")
    return j


# 대시보드 사망률 지표가 쓰는 사망원인(50항목) 코드 — 메타의 이름과 대조해 확인한다(build_mort.py CAUSE 와 같은 21개)
CAUSES = {"0": "계", "20": "악성신생물", "22": "위의 악성", "24": "간 및 간내", "26": "기관 기관지", "23": "결장 직장",
          "92": "심장 질환", "93": "허혈성 심장", "95": "뇌혈관 질환", "A1": "폐렴", "41": "당뇨병", "61": "알츠하이머",
          "91": "고혈압성", "B1": "간 질환", "A2": "만성 하기도", "J6": "고의적 자해", "J1": "운수사고", "J2": "낙상",
          "12": "패혈증", "11": "호흡기 결핵", "J7": "가해"}


def codes(m):
    """분류 차원 순서와 「계」·「연령표준화 사망률」 코드를 메타에서 찾는다."""
    objs = sorted({(x["OBJ_ID"], int(x.get("OBJ_ID_SN") or 0), x.get("OBJ_NM", "")) for x in m if x.get("OBJ_ID") != "ITEM"}, key=lambda t: t[1])
    items = [x for x in m if x.get("OBJ_ID") == "ITEM"]
    # 조사망률(사망률)과 연령표준화 사망률 두 항목 — 대시보드의 조율/표준화율 전환에 둘 다 쓴다
    std = next(x["ITM_ID"] for x in items if "표준화" in x["ITM_NM"])
    crude = next((x["ITM_ID"] for x in items if x["ITM_NM"].strip().startswith("사망률")), None)
    std = std + (f"+{crude}" if crude else "")
    fix = {}
    for oid, sn, onm in objs:
        vals = [x for x in m if x["OBJ_ID"] == oid]
        if "사망원인" in onm:
            names = {x["ITM_ID"]: x["ITM_NM"] for x in vals}
            bad = [c for c, nm in CAUSES.items() if not names.get(c, "").startswith(nm)]
            if bad: raise SystemExit(f"사망원인 코드가 메타와 다르다: {[(c, names.get(c)) for c in bad]}")
            fix[oid] = "+".join(CAUSES)
        elif "성" in onm:
            fix[oid] = next(x["ITM_ID"] for x in vals if x["ITM_NM"].strip() in ("계", "전체", "총계"))
    return objs, std, fix


def fetch(y0, y1, objs, std, fix):
    """y0~y1 을 한 번에 받아 해마다 나눠 저장한다."""
    todo = [y for y in range(y0, y1 + 1) if not ((f := OUT / f"{TBL}_{y}.json").exists() and f.stat().st_size > 1000)]
    if not todo:
        print(f"  {y0}~{y1}: 이미 있음", flush=True); return True
    p = {"method": "getList", "apiKey": KEY, "format": "json", "jsonVD": "Y", "orgId": "101", "tblId": TBL,
         "itmId": std, "prdSe": "Y", "startPrdDe": str(min(todo)), "endPrdDe": str(max(todo))}
    for oid, sn, _ in objs:
        p[f"objL{sn}"] = fix.get(oid, "ALL")
    j = call("https://kosis.kr/openapi/Param/statisticsParameterData.do", p)
    if not (isinstance(j, list) and j):
        print(f"  {min(todo)}~{max(todo)}: 자료 없음 — {str(j)[:160]}", flush=True); return False
    for y in todo:
        rows = [r for r in j if str(r.get("PRD_DE", ""))[:4] == str(y)]
        if rows:
            (OUT / f"{TBL}_{y}.json").write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")
        print(f"  {y}: {len(rows):,}행 저장", flush=True)
    return True


if __name__ == "__main__":
    y0 = int(sys.argv[1]) if len(sys.argv) > 1 else 2024
    y1 = int(sys.argv[2]) if len(sys.argv) > 2 else 2025
    m = meta()
    objs, std, fix = codes(m)
    print("분류:", [(o, s, n) for o, s, n in objs], "표준화 항목:", std, "고정:", fix, flush=True)
    # 한 호출에 두 해씩(4만 셀 제한), 새 연도부터
    for hi in range(y1, y0 - 1, -2):
        fetch(max(y0, hi - 1), hi, objs, std, fix)
    print("done", flush=True)
