# -*- coding: utf-8 -*-
"""
국가암검진 수검률 지표 생성 — data/raw_cancer/*.json → data/cancer_screening.json

수검률 = 수검인원 / 대상인원 × 100  (국민건강보험공단 건강검진통계 정의)
지표 7종: 암검진 전체 · 위암 · 대장암 · 간암 · 유방암 · 자궁경부암 · 폐암

지역 정리
 - 원자료는 일반구 단위(수원시장안구 등)이므로 **인원을 더해 시 단위로 합산**한다.
   (비율이 아니라 사람 수를 더하므로 가중평균이 자동으로 된다)
 - 같은 해에 시 단위 행과 그 시의 구 행이 함께 있으면 **시 단위 행만 쓴다**
   (부천시는 2016년 행정구 폐지로 두 형태가 공존 → 이중계상 방지)
 - 세종은 원자료에 시도 행만 있으므로 그 값을 세종시(시군구)에 넣는다
 - 여주군·당진군은 승격 전 이름 → 여주시·당진시로 맞춘다

사용법: python scripts/build_cancer.py
"""
import json, re, sys
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw_cancer"
DS = json.loads((ROOT / "data" / "dataset.json").read_text(encoding="utf-8"))

CANCERS = [("001_1", "CANC_ALL", "암검진 수검률(전체)"), ("002", "CANC_STO", "위암 검진 수검률"),
           ("003", "CANC_COL", "대장암 검진 수검률"), ("004", "CANC_LIV", "간암 검진 수검률"),
           ("005", "CANC_BRE", "유방암 검진 수검률"), ("006", "CANC_CVX", "자궁경부암 검진 수검률"),
           ("007", "CANC_LUN", "폐암 검진 수검률")]
ALIAS = {"여주군": "여주시", "당진군": "당진시"}
SEX_ALL = "001"

short2sido = {r["s"]: r["c"] for r in DS["regions"] if r["l"] == "sido"}
sgg = [r for r in DS["regions"] if r["l"] == "sgg"]
by_sido = defaultdict(dict)
for r in sgg:
    by_sido[r["p"]][r["n"]] = r["c"]
SEJONG = next((r["c"] for r in sgg if r["n"] == "세종시"), None)
SIDOS = set(short2sido)


def target_of(sido_short, nm):
    """KOSIS 지역명 → (우리 지역코드, 시 단위 행인지 여부). 매칭 실패는 None."""
    n = ALIAS.get(nm.replace(" ", ""), nm.replace(" ", ""))
    sc = short2sido[sido_short]
    tbl = by_sido.get(sc, {})
    if n in tbl:
        return tbl[n], True                       # 시/군/구 단위 행 그대로
    m = re.match(r"^(.+?시)(.+구)$", n)            # 수원시장안구 → 수원시
    if m and m.group(1) in tbl:
        return tbl[m.group(1)], False             # 일반구 행 → 상위 시로 합산
    return None, None


def main():
    files = sorted(RAW.glob("DT_35007_N009_*.json"))
    if not files:
        sys.exit("data/raw_cancer 가 비어 있습니다 — scripts/kosis_fetch_cancer.py 먼저 실행")
    years, grids, unmatched = [], {}, set()
    codes = [r["c"] for r in DS["regions"]]
    idx = {c: i for i, c in enumerate(codes)}

    per_year = {}
    for f in files:
        y = int(f.stem.split("_")[-1])
        rows = json.loads(f.read_text(encoding="utf-8"))
        # (지역코드, 암종) → {"tgt": 대상, "got": 수검, "city": 시단위행 여부}
        acc = defaultdict(lambda: {"tgt": 0.0, "got": 0.0, "city": False})
        cur = None
        # 원자료 행 순서가 뒤섞일 수 있으므로 지역명 계층은 메타 순서가 아니라 이름으로 판별한다
        for r in rows:
            if r.get("C2") != SEX_ALL:
                continue
            nm, c3 = r.get("C1_NM", ""), r.get("C3")
            if nm == "계":
                continue
            if nm in SIDOS:
                cur = nm
                if nm == "세종" and SEJONG:                    # 세종은 하위 행이 없다
                    k = (SEJONG, c3); a = acc[k]; a["city"] = True
                    a["tgt" if r["ITM_ID"] == "001" else "got"] += float(r["DT"] or 0)
                continue
            if cur is None:
                continue
            code, is_city = target_of(cur, nm)
            if code is None:
                unmatched.add(f"{cur} {nm}"); continue
            k = (code, c3); a = acc[k]
            a["city"] = a["city"] or is_city
            a["tgt" if r["ITM_ID"] == "001" else "got"] += float(r["DT"] or 0)
        # 시 단위 행이 있는 지역은 구 행을 합산하지 않도록 다시 계산
        cityset = {k[0] for k, v in acc.items() if v["city"]}
        if cityset:
            acc2 = defaultdict(lambda: {"tgt": 0.0, "got": 0.0, "city": False})
            cur = None
            for r in rows:
                if r.get("C2") != SEX_ALL: continue
                nm, c3 = r.get("C1_NM", ""), r.get("C3")
                if nm == "계": continue
                if nm in SIDOS:
                    cur = nm
                    if nm == "세종" and SEJONG:
                        k = (SEJONG, c3); acc2[k]["tgt" if r["ITM_ID"] == "001" else "got"] += float(r["DT"] or 0)
                    continue
                if cur is None: continue
                code, is_city = target_of(cur, nm)
                if code is None: continue
                if code in cityset and not is_city:
                    continue                                   # 시 단위 행이 있으니 구 행은 버린다
                acc2[(code, c3)]["tgt" if r["ITM_ID"] == "001" else "got"] += float(r["DT"] or 0)
            acc = acc2
        per_year[y] = acc
        print(f"  {y}: 지역 {len({k[0] for k in acc})}개")

    years = sorted(per_year)
    inds, values = [], {}
    for c3, iid, name in CANCERS:
        grid = []
        for y in years:
            row = [None] * len(codes)
            for (code, cc), v in per_year[y].items():
                if cc != c3 or code not in idx or v["tgt"] <= 0:
                    continue
                row[idx[code]] = round(v["got"] / v["tgt"] * 1000)   # ×10 정수(=%×10)
            grid.append(row)
        filled = sum(1 for r in grid for v in r if v is not None)
        # 계층: 주민의 검진 수검 행동이 바뀐 결과이므로 WHO 결과사슬의 「성과」
        # (docs/지역보건사업_평가이론_v1.md). 순위는 위험보정 후 권장.
        inds.append({"id": iid, "name": name, "domain": "암검진", "bad": False, "unit": "%",
                     "years": years, "outcome": False, "tier": "성과",
                     "src": "국민건강보험공단 건강검진통계 — 시군구별 성별 암검진 대상 및 수검인원 현황(KOSIS DT_35007_N009). 수검인원÷대상인원. 일반구는 시 단위로 합산"})
        values[iid] = {"crude": grid, "std": grid}
        print(f"  {name}: 셀 {filled}")
    out = {"generated": __import__("datetime").date.today().isoformat(),
           "source": "KOSIS DT_35007_N009 (국민건강보험공단 건강검진통계)",
           "years": years, "domains": ["암검진"], "indicators": inds, "values": values}
    p = ROOT / "data" / "cancer_screening.json"
    p.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    print(f"→ {p} ({p.stat().st_size/1e6:.2f} MB)")
    if unmatched:
        print("매칭 실패 지역명:", sorted(unmatched))


if __name__ == "__main__":
    main()
