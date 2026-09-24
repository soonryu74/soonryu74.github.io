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
try: CHECKUP = load("checkup.json")
except Exception: CHECKUP = {"indicators": [], "values": {}}
HLE = load("hle.json")
DEP = load("deprivation.json")
try: RISK = load("risk.json")
except Exception: RISK = {}
try: COVID = load("covid_sgg.json")
except Exception: COVID = {}

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
CHECKUP_IDS = [i["id"] for i in CHECKUP["indicators"]]
CHK_YEARS = [y for i in CHECKUP["indicators"] for y in i["years"]]

# 원 출처별로 나누기 위한 영역 → 지표 id 묶음
KDH_BY_DOMAIN = {}
for i in KDH["indicators"]:
    KDH_BY_DOMAIN.setdefault(i["domain"], []).append(i["id"])


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
    def reg_mark(src):
        rs = src.get("regions") or {}
        return "O" if c in rs else ("P" if parent in rs else "X")
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
        "mort": mark(KDH_BY_DOMAIN.get("사망률(표준화)", []), KDH["values"]),
        "inf": mark(KDH_BY_DOMAIN.get("감염병 발생률", []), KDH["values"]),
        "nhis": "O" if mark(CHECKUP_IDS, CHECKUP["values"]) == "O" else mark(KDH_BY_DOMAIN.get("의료이용·검진", []) + KDH_BY_DOMAIN.get("보건의료자원", []), KDH["values"]),
        "pop": mark(KDH_BY_DOMAIN.get("인구·사회·경제", []), KDH["values"]),
        "env": mark(KDH_BY_DOMAIN.get("환경·안전", []), KDH["values"]),
        "hle": reg_mark(HLE), "dep": reg_mark(DEP), "risk": reg_mark(RISK), "covid": reg_mark(COVID),
        "fac": ui.get("fac") or {},
    })

# 자료원은 **원 출처 기관** 기준으로 나눈다.
# 김동현 교수 구축 DB(v1.7)는 원천이 아니라 여러 국가통계를 모아 둔 2차 가공본이므로
# `via`(경유)로만 적고, 기관·통계명은 data/kdh/catalog.csv 의 「자료생산기관·통계명」을 근거로 한다.
#   근거: 카탈로그에서 건강결과>사망률 452행이 전부 「통계청 / 사망원인통계」,
#         감염병 204행이 「질병관리청 / 법정감염병발생보고」.
VIA_KDH = "질병관리청 자료실의 지역사회 건강결과·건강결정요인 DB(김동현 교수 구축 v1.7)를 통해 수집"

SRC = [
    {"key": "chs", "name": "지역사회건강조사", "org": "질병관리청", "ids": CHS_IDS, "unit": "보건소",
     "years": [DS["years"][0], DS["years"][-1]], "cycle": "연 1회", "next": "2026년 12월",
     "tbl": "KOSIS 177", "url": "https://chs.kdca.go.kr/", "updated": "2025-12-22"},

    {"key": "mort", "name": "사망원인통계", "org": "국가데이터처(옛 통계청)",
     "ids": KDH_BY_DOMAIN.get("사망률(표준화)", []), "unit": "시군구",
     "years": [2008, 2024], "cycle": "연 1회(9월 하순)", "next": "2026년 9월 하순 — 2025년분 미공표",
     "tbl": "KOSIS 101 DT_1B34E13", "via": VIA_KDH,
     "url": "https://mods.go.kr/menu.es?mid=a10301060200", "updated": "2025-09-23",
     "note": "표준화사망률 22종의 원천. 2024년분은 2025-09-25 공표됐고 KOSIS는 이틀 전 갱신됐다."},

    {"key": "inf", "name": "법정감염병 발생보고", "org": "질병관리청",
     "ids": KDH_BY_DOMAIN.get("감염병 발생률", []), "unit": "시군구",
     "years": [2008, 2024], "cycle": "연 1회", "next": "미정", "tbl": "법정감염병발생보고·결핵환자신고현황",
     "via": VIA_KDH, "url": "https://dportal.kdca.go.kr/", "updated": "2026-09-08"},

    {"key": "cancer", "name": "국가암검진 수검률", "org": "국민건강보험공단", "ids": CANCER_IDS, "unit": "시군구",
     "years": [CANCER["years"][0], CANCER["years"][-1]], "cycle": "연 1회(연말~연초)",
     "next": "2026년 12월~2027년 1월", "tbl": "KOSIS 350 DT_35007_N009",
     "url": "https://kosis.kr/statHtml/statHtml.do?orgId=350&tblId=DT_35007_N009", "updated": "2026-01-06"},

    {"key": "nhis", "name": "건강보험·의료이용·검진 통계", "org": "국민건강보험공단",
     "ids": KDH_BY_DOMAIN.get("의료이용·검진", []) + KDH_BY_DOMAIN.get("보건의료자원", []) + CHECKUP_IDS, "unit": "시군구",
     "years": [2008, max([2024] + CHK_YEARS)], "cycle": "연 1회", "next": "2026년 12월~2027년 1월",
     "tbl": "건강보험통계·건강검진통계(KOSIS 350 DT_35007_N001_1·N098·N103·N105)·지역별의료이용통계", "via": VIA_KDH + " (일반건강검진 2018년~은 KOSIS 직접)",
     "url": "https://kosis.kr/statHtml/statHtml.do?orgId=350&tblId=DT_35007_N001_1", "updated": "2026-01-06",
     "note": (f"일반건강검진 수검률·판정 정상A·유질환자 비율은 2017년까지 김동현 교수 DB, {min(CHK_YEARS)}~{max(CHK_YEARS)}년은 KOSIS 공단 건강검진통계에서 직접 산출해 한 시계열로 이었다. "
              "고혈압·당뇨병 「판정 비율」(2차 판정)은 2018년 2차 검진 폐지로 2017년에서 끝나고, 2018년부터는 1차 판정 「의심」·「유질환자」 비율 4종을 별도 지표로 둔다.") if CHK_YEARS else
             "일반건강검진 수검률·판정결과 5종은 우리 데이터가 2017년에 멈춰 있고 원천은 2024년까지 있다."},

    {"key": "pop", "name": "인구·사회·경제 통계", "org": "국가데이터처 · 행정안전부 등",
     "ids": KDH_BY_DOMAIN.get("인구·사회·경제", []), "unit": "시군구",
     "years": [2008, 2024], "cycle": "연 1회", "next": "연 1회 수시",
     "tbl": "인구총조사·경제활동인구조사·주민등록인구현황·지방자치단체 통합재정 개요 등",
     "via": VIA_KDH, "url": "https://kosis.kr/", "updated": "2026-09-08"},

    {"key": "env", "name": "환경·안전 통계", "org": "환경부 · 국토교통부 · 도로교통공단 등",
     "ids": KDH_BY_DOMAIN.get("환경·안전", []), "unit": "시군구",
     "years": [2008, 2024], "cycle": "연 1회", "next": "연 1회 수시",
     "tbl": "상·하수도통계·도로현황·교통문화지수·경찰접수교통사고현황 등",
     "via": VIA_KDH, "url": "https://kosis.kr/", "updated": "2026-09-08"},

    {"key": "hle", "name": "건강수명(근사 산출)", "org": "자체 산출", "ids": None, "unit": "시군구",
     "years": [2008, 2024], "cycle": "사망원인통계 공표 후", "next": "2026년 9월 하순 공표 직후",
     "tbl": "scripts/build_hle.py · docs/건강수명_산출법_v1.md", "url": "", "updated": "2026-09-08",
     "approx": True,
     "formula": "HLE_x = Σ_{i≥x} L_i (1 − π_i) / l_x   ·   π_i(지역) = r·π_i / (1 − π_i + r·π_i),  r = [u/(1−u)] / [u₀/(1−u₀)]",
     "formula_note": "검산: 기대수명 × (1 − 평균 불건강률) ≈ 건강수명. 지역별 실제 숫자는 프로파일의 「기대수명·건강수명」 카드 안 「산출 예시」에서 펼쳐 볼 수 있다.",
     "note": "Sullivan 방식. 전국은 통계청 주관적 건강평가 기대여명(DT_1B46)에 앵커링해 공식값과 소수 첫째 자리까지 일치하고, 시군구는 사망원인통계·연앙인구 3년 합산 생명표에 지역 오즈비를 적용한 근사값이다.",
     "limits": ["공식 통계가 아니다 — 반드시 「주관적 건강 기반·근사」를 붙여 쓴다",
                "청구자료(HP2030) 정의의 건강수명과는 순위 상관 0.18로 다른 개념이다(기대수명과는 0.69)",
                "비례 오즈 가정은 미검증. 원시자료 확보 시 연령별 실측으로 교체 예정",
                "표본오차가 건강수명 ±0.5~1세로 옮겨진다 — 1~2위 차이는 읽지 말 것"]},

    {"key": "dep", "name": "지역박탈지수(근사)", "org": "자체 산출", "ids": None, "unit": "시군구",
     "years": [2015, 2020], "cycle": "5년(인구주택총조사)", "next": "2025년 총조사 집계표 공표 후",
     "tbl": "scripts/build_deprivation.py · docs/지역박탈지수_산출_v2.md", "url": "", "updated": "2026-09-08",
     "approx": True,
     "formula": "z_j = (지역 값 − 전국 시군구 평균) / 표준편차   ·   박탈지수 = Σ_j z_j  (7개 변수, 가중치 없음)",
     "formula_note": "지역별 변수 7개의 값·평균·표준편차·z는 지표 분석 화면의 「건강형평성」 카드 안 「산출 예시」에서 펼쳐 볼 수 있다.",
     "note": "김동진 외(2013, 한국보건사회연구원 연구보고서 2013-10) 방식을 공표된 총조사 집계표로 재현. 7개 변수의 전국 시군구 z점수를 단순합한다(Townsend 이래의 관행).",
     "limits": ["공식 통계가 아니다 — 원시자료 기반 공식값과 다르다(세종 공식 −9.3 vs 근사 −8.2)",
                "국내 선행연구 6편 중 5편이 쓴 남성 실업률이 집계표에 없어 빠졌다",
                "하위 사회계급은 가구주 직업이 아니라 취업자 전체 직업 분포로 근사했다",
                "연도별로 각각 표준화하므로 2015·2020 값의 절대 비교는 불가(순위·분위로만)"]},

    {"key": "risk", "name": "감염병 고위험군", "org": "자체 집계(복수 출처)", "ids": None, "unit": "시군구",
     "years": [2024, 2024], "cycle": "비정기", "next": "미정",
     "tbl": "scripts/build_risk.py", "url": "", "updated": "2026-09-08"},
    {"key": "covid", "name": "코로나19 확진·사망(전수감시 기간)", "org": "질병관리청", "ids": None, "unit": "시군구",
     "years": [2020, 2023], "cycle": "종료(1회성)", "next": "없음 — 2023-08-31 전수감시 종료, 이후 표본감시",
     "tbl": "공공데이터포털 15124288 「코로나19 시군구별 월별 확진자 및 사망 발생 현황」", "updated": "2025-05-20",
     "url": "https://www.data.go.kr/data/15124288/fileData.do",
     "formula": "확진율 = 누적 확진 ÷ 2024 연앙인구 × 100 · 10만 명당 사망 = 누적 사망 ÷ 인구 × 100,000 · 치명률 = 사망 ÷ 확진 × 100",
     "formula_note": "지역 프로파일 「감염병 대응 고위험군」 카드 하단 「코로나19 실적 참고」에서 지역별 값을 볼 수 있습니다.",
     "note": "거주지가 아니라 신고 보건소 관할 기준입니다. 사망은 사망 장소(병원) 관할로 집계되어 상급종합병원 소재지가 높게 나오고, 확진은 직장·검사소 위치를 따릅니다. 시군구 순위를 매기지 않고 시도·중앙값 비교만 권장합니다. 연령별 시군구 자료는 공표되지 않았습니다."},
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
       "counts": counts,
       "sources": [{**x, "n": (len(x["ids"]) if x["ids"] is not None else {"hle": 3, "dep": 1, "risk": 30, "covid": 3}[x["key"]]),
                    "ids": None} for x in SRC],
       "units": rows,
       "legend": {"O": "이 보건소 단위로 값이 있음", "P": "소속 시군구 값으로 대체", "X": "없음"}}
p = D / "coverage.json"
p.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")

from collections import Counter
print(f"기준 보건소 {len(rows)}개 → {p} ({p.stat().st_size/1024:.0f}KB)")
for k in [x["key"] for x in SRC]:
    c = Counter(r[k] for r in rows)
    print(f"  {k:7s} 있음 {c['O']:3d} · 시군구 대체 {c['P']:3d} · 없음 {c['X']:3d}")
print("  단위 구성:", Counter(r["l"] for r in rows))
