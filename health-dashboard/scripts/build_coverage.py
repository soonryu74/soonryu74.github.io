# -*- coding: utf-8 -*-
"""
보건소 258개소 기준표 + 자료원별 보유 여부 → data/coverage.json

기준(소유자 지시 2026-09-19): 보건소 수는 **지역사회건강조사 258개 조사 단위**로 통일한다.
  근거 = 질병관리청 「2025 지역건강통계 한눈에 보기」 3.부록(통계표) 시군구별 표.
  다른 숫자와의 관계는 data/coverage.json 의 counts 에 함께 담아 화면에서 비교할 수 있게 한다.
    · 258 지역사회건강조사 조사 단위(본 기준)
    · 263 공공데이터포털 지역보건의료기관 현황의 보건소 247 + 보건의료원 16 (2025-12-31)
    · 255 질병관리청 보건소정보 페이지 공식 목록
    · 229 행정안전부 기초자치단체(지역보건의료계획 수립 주체)

자료원별 보유 여부는 "그 단위 코드로 값이 실제로 있는가"로 판정한다.
보건소 세부 단위(예: 수원시 장안구보건소)는 시군구 단위 자료(사망률·암검진 등)가
개별로 존재하지 않으므로, 소속 시군구 값으로 대체 가능한지를 따로 표시한다(△).

사용법: python scripts/build_coverage.py
"""
import json
from pathlib import Path
from datetime import date

ROOT = Path(__file__).resolve().parent.parent
D = ROOT / "data"
load = lambda n: json.loads((D / n).read_text(encoding="utf-8"))

CHS25 = load("chs2025_units.json")
DS = load("dataset.json")
UNITS = load("units.json")
KDH = load("kdh_dataset.json")
CANCER = load("cancer_screening.json")
HLE = load("hle.json")
DEP = load("deprivation.json")
try: RISK = load("risk.json")
except Exception: RISK = {}

codes = [r["c"] for r in DS["regions"]]
idx = {c: i for i, c in enumerate(codes)}
RBY = {r["c"]: r for r in DS["regions"]}
UBY = {u["c"]: u for u in UNITS["units"]}


def has_any(values, ind_ids, code):
    """그 지역 코드에 값이 하나라도 있으면 True (최신 연도부터 훑는다)"""
    i = idx.get(code)
    if i is None: return False
    for iid in ind_ids:
        g = values.get(iid, {}).get("crude")
        if not g: continue
        for row in reversed(g):
            if i < len(row) and row[i] is not None: return True
    return False


CHS_IDS = [i["id"] for i in DS["indicators"]]
KDH_IDS = [i["id"] for i in KDH["indicators"]]
CANCER_IDS = [i["id"] for i in CANCER["indicators"]]

# 대체 조회용 상위 코드 보정.
#  · 제주는 제주시·서귀포시가 보건소 3곳씩으로 쪼개져 있는데 중간 코드(01602·01604)가
#    지역 목록에 없어 상위 조회가 끊긴다 → 실제 시 코드로 연결한다.
#  · 군위군은 2023년 경북 → 대구 편입이라 기존 자료가 경북 코드(01405)에 들어 있다.
PARENT_FIX = {
    "01601": "01600", "0160000": "01600", "0160201": "01600", "0160202": "01600",   # 서귀포시
    "01603": "01600A", "0160400": "01600A", "0160401": "01600A", "0160402": "01600A",  # 제주시
    "00309": "01405",                                                                # 대구 군위군 ← 경북 군위군
    "00711": "0071",                                                                 # 세종시(단층제) ← 세종특별자치시 시도 행
}

rows = []
for u in CHS25["units"]:
    c, nm, s = u["c"], u["n"], u["s"]
    reg = RBY.get(c)
    lvl = reg["l"] if reg else "?"
    pr = RBY.get(reg.get("p")) if reg else None
    parent = pr["c"] if (pr and lvl == "sub") else c    # 세부 단위는 소속 시군구로 대체 조회
    parent = PARENT_FIX.get(c, parent)
    ui = UBY.get(c, {})
    def mark(ids, values, src_code=None):
        """○=이 단위 코드로 값 있음 · △=소속 시군구 값으로 대체 · ×=없음"""
        if has_any(values, ids, c): return "O"
        if parent != c and has_any(values, ids, parent): return "P"
        return "X"
    rows.append({
        "c": c, "n": nm, "s": s, "l": lvl,
        "hc": ui.get("chs") or (nm + "보건소"),
        "n2025": u.get("n2025"),
        "parent": parent if parent != c else None,
        "chs": mark(CHS_IDS, DS["values"]),
        "cancer": mark(CANCER_IDS, CANCER["values"]),
        "kdh": mark(KDH_IDS, KDH["values"]),
        "hle": "O" if c in (HLE.get("regions") or {}) else ("P" if parent in (HLE.get("regions") or {}) else "X"),
        "dep": "O" if c in (DEP.get("regions") or {}) else ("P" if parent in (DEP.get("regions") or {}) else "X"),
        "risk": "O" if c in (RISK.get("regions") or {}) else ("P" if parent in (RISK.get("regions") or {}) else "X"),
        "fac": ui.get("fac") or {},
    })

SRC = [
    {"key": "chs", "name": "지역사회건강조사", "org": "질병관리청", "n": len(CHS_IDS), "unit": "보건소",
     "years": [DS["years"][0], DS["years"][-1]], "cycle": "연 1회(12월 공표)", "tbl": "KOSIS 177 DT_*",
     "url": "https://chs.kdca.go.kr/", "updated": "2025-12-22"},
    {"key": "cancer", "name": "국가암검진 수검률", "org": "국민건강보험공단", "n": len(CANCER_IDS), "unit": "시군구",
     "years": [CANCER["years"][0], CANCER["years"][-1]], "cycle": "연 1회(연말~연초)", "tbl": "KOSIS 350 DT_35007_N009",
     "url": "https://kosis.kr/statHtml/statHtml.do?orgId=350&tblId=DT_35007_N009", "updated": "2026-01-06"},
    {"key": "kdh", "name": "사망·감염병·의료이용·환경 등 보조 지표", "org": "질병관리청 자료실(김동현 교수 구축 DB v1.7)",
     "n": len(KDH_IDS), "unit": "시군구", "years": [2008, 2024], "cycle": "비정기", "tbl": "-",
     "url": "https://chs.kdca.go.kr/", "updated": "2026-09-08"},
    {"key": "hle", "name": "건강수명(근사 산출)", "org": "자체 산출(사망원인통계·연앙인구·생명표 기반)", "n": 3, "unit": "시군구",
     "years": [2008, 2024], "cycle": "사망원인통계 공표 후", "tbl": "scripts/build_hle.py",
     "url": "", "updated": "2026-09-08"},
    {"key": "dep", "name": "지역박탈지수(근사)", "org": "자체 산출(인구주택총조사 집계표)", "n": 1, "unit": "시군구",
     "years": [2015, 2020], "cycle": "5년(총조사)", "tbl": "scripts/build_deprivation.py",
     "url": "", "updated": "2026-09-08"},
    {"key": "risk", "name": "감염병 고위험군", "org": "자체 집계(복수 출처)", "n": 30, "unit": "시군구",
     "years": [2024, 2024], "cycle": "비정기", "tbl": "scripts/build_risk.py", "url": "", "updated": "2026-09-08"},
]

counts = [
    {"n": 258, "label": "지역사회건강조사 조사 단위", "note": "본 대시보드 기준. 질병관리청 「2025 지역건강통계 한눈에 보기」 부록 시군구별 표",
     "std": True},
    {"n": 263, "label": "지역보건의료기관 현황의 보건소", "note": "보건소 247 + 보건의료원 16 (공공데이터포털, 2025-12-31 기준)"},
    {"n": UNITS.get("official_count", 255), "label": "질병관리청 보건소정보 공식 목록", "note": UNITS.get("official_source", "")},
    {"n": 229, "label": "행정안전부 기초자치단체", "note": "지역보건의료계획 수립 주체(시·군·구). 시·도 17개 계획은 별도"},
    {"n": len([r for r in DS["regions"] if r["l"] == "sgg"]), "label": "우리 데이터셋 시군구 레코드", "note": "중복·폐지 레코드 포함"},
]

out = {"generated": date.today().isoformat(),
       "standard": 258,
       "standard_source": CHS25.get("source", ""),
       "counts": counts, "sources": SRC, "units": rows,
       "legend": {"O": "이 보건소 단위로 값이 있음", "P": "소속 시군구 값으로 대체", "X": "없음"}}
p = D / "coverage.json"
p.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")

from collections import Counter
print(f"기준 보건소 {len(rows)}개 → {p} ({p.stat().st_size/1024:.0f}KB)")
for k in ("chs", "cancer", "kdh", "hle", "dep", "risk"):
    c = Counter(r[k] for r in rows)
    print(f"  {k:7s} 있음 {c['O']:3d} · 시군구 대체 {c['P']:3d} · 없음 {c['X']:3d}")
print("  단위 구성:", Counter(r["l"] for r in rows))
