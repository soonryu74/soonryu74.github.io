# -*- coding: utf-8 -*-
"""
사망원인통계(KOSIS DT_1B34E13) → data/mort_kosis.json

김동현 교수 DB(v1.7)를 거쳐 받은 사망률 21종(연령표준화)은 2024년까지다. 국가데이터처가 새해분을 공표하면
kosis_fetch_mort.py 로 받은 원자료를 이 스크립트가 대시보드 지역 순서에 맞춰 정리하고, data.js 가 같은 지표에 이어 붙인다.
  · 검증: DB와 겹치는 해는 두 값을 대조한다. DB 쪽 오류 유형(0·반올림)을 뺀 차이가 1%를 넘으면 멈춘다.
  · 이어 붙이는 해: DB에 값이 없는 해(새 공표분 + DB가 일찍 끊긴 지표의 빈 해).
  · DB에 있는 해도 받아 왔다면 원천 값으로 바로잡는다 — DB 2023년의 「0」(82개 지역 전 항목)·정수 반올림, DB가 비운 칸.
  · 영아사망률(출생아 기준)은 이 표에 없다.
사용법: python scripts/kosis_fetch_mort.py 2018 2025 && python scripts/build_mort.py
"""
import json, re, glob, collections, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw_mort"
DS = json.loads((ROOT / "data" / "dataset.json").read_text(encoding="utf-8"))
KDH = json.loads((ROOT / "data" / "kdh_dataset.json").read_text(encoding="utf-8"))
REG = DS["regions"]; IDX = {r["c"]: i for i, r in enumerate(REG)}

# 대시보드 지표 id → 사망원인(50항목) 이름 정규식 (공백·괄호 속 코드 제거 후 비교)
CAUSE = {
    "K_MORT_ALL": r"^(계|사망원인계|전체)$", "K_MORT_CA": r"^악성신생물(\(암\))?$", "K_MORT_STO": r"^위의?악성신생물$",
    "K_MORT_LIV": r"^간및간내담관의?악성신생물$", "K_MORT_LUNG": r"^기관,?기관지및폐의?악성신생물$",
    "K_MORT_COL": r"^결장,?직장및항문의?악성신생물$", "K_MORT_HEART": r"^심장질환$", "K_MORT_IHD": r"^허혈성심장질환$",
    "K_MORT_CVA": r"^뇌혈관질환$", "K_MORT_PNEU": r"^폐렴$", "K_MORT_DM": r"^당뇨병$", "K_MORT_ALZ": r"^알츠하이머병$",
    "K_MORT_HTN": r"^고혈압성질환$", "K_MORT_LIVD": r"^간질환$", "K_MORT_COPD": r"^만성하기도질환$",
    "K_MORT_SUI": r"^고의적자해(\(자살\))?$", "K_MORT_TRA": r"^운수사고$", "K_MORT_FALL": r"^(추락|낙상|낙상\(추락\))$",
    "K_MORT_SEP": r"^패혈증$", "K_MORT_TB": r"^호흡기결핵$", "K_MORT_HOM": r"^가해(\(타살\))?$",
}
def cname(s):
    s = re.sub(r"\([A-Z][0-9A-Z.\-–, ]*\)", "", s)           # (C16) 같은 분류 코드 제거
    return re.sub(r"[\s·]", "", s).replace("（", "(").replace("）", ")")

# 통계청 시도 코드(앞 2자리) → 대시보드 시도 약칭
STAT_SIDO = {"11": "서울", "21": "부산", "22": "대구", "23": "인천", "24": "광주", "25": "대전", "26": "울산", "29": "세종", "31": "경기",
             "32": "강원", "33": "충북", "34": "충남", "35": "전북", "36": "전남", "37": "경북", "38": "경남", "39": "제주"}
SIDO_CODE = {r["s"]: r["c"] for r in REG if r["l"] == "sido"}
def norm(s): return re.sub(r"\(.*?\)", "", s).strip()
BY = collections.defaultdict(list)
for r in REG:
    if r["l"] in ("sgg", "sub"): BY[(r["s"], norm(r["n"]))].append(r["c"])   # sub = 일반구(수원 장안구 등)
# 김동현 DB가 쓴 자리에 맞춘다: 대구 군위군(2023 편입)은 경북 군위 코드(01405)에, 세종은 시도 코드(0071)에만 값이 있다.
# 창원은 DB 값과 대조해 확인한 짝: 통합창원시→창원시, 마산회원구→「마산」, 진해구→「진해」, 성산구→「창원」(2024년 값 일치).
FIX = {("제주", "제주시"): "01600A", ("제주", "서귀포시"): "01600", ("세종", "세종시"): "-", ("대구", "군위군"): "01405",
       ("경남", "통합창원시"): "01506", ("경남", "마산회원구"): "0150601", ("경남", "진해구"): "0150602", ("경남", "성산구"): "0150603"}
def to_code(code, nm):
    """통계청 지역 코드·이름 → 대시보드 지역 코드. 시도는 2자리, 시군구는 5자리."""
    s = STAT_SIDO.get(str(code)[:2])
    if not s: return "-"          # 전국 등
    if len(str(code)) == 2: return SIDO_CODE.get(s)
    n = norm(nm)
    if (s, n) in FIX: return FIX[(s, n)]
    c = BY.get((s, n)) or BY.get((s, n.replace("시", "")))
    if not c:   # 시도를 옮긴 곳(예: 군위군 경북→대구 2023) — 이름이 전국에 하나뿐이면 그곳
        c = [v[0] for (ss, nn), v in BY.items() if nn == n]
        c = c if len(c) == 1 else None
    return c[0] if c else None

def num(v):
    try: return float(str(v).replace(",", ""))
    except Exception: return None

# ── 원자료 읽기 ──
vals = collections.defaultdict(dict)       # (id, key, year) -> {code: value}
unmapped, causes_seen = collections.Counter(), set()
owner = {}                                  # (year, 대시보드 코드) -> 통계청 코드 (두 코드가 한 자리를 덮어쓰지 않는지)
for f in sorted(RAW.glob("DT_1B34E13_[0-9]*.json")):
    rows = json.loads(f.read_text(encoding="utf-8"))
    # 「-」는 사망 0명이다(DB도 0으로 담았다). 다만 폐지된 옛 단위(청원군 등)도 전부 「-」라,
    # 그해 사망원인 「계」에 숫자가 있는 살아 있는 단위에서만 0으로 읽는다.
    live = {r["C2"] for r in rows if r.get("C1") == "0" and num(r.get("DT")) is not None}
    for r in rows:
        cls = {r.get(f"C{k}_OBJ_NM", ""): (r.get(f"C{k}"), r.get(f"C{k}_NM", "")) for k in range(1, 5) if r.get(f"C{k}")}
        reg = next((v for k, v in cls.items() if "시군구" in k or "행정구역" in k), None)
        cau = next((v for k, v in cls.items() if "사망원인" in k), None)
        if not reg or not cau: continue
        causes_seen.add(cau[1])
        iid = next((i for i, pat in CAUSE.items() if re.match(pat, cname(cau[1]))), None)
        if not iid: continue
        code = to_code(reg[0], reg[1])
        if code == "-": continue
        if not code:
            unmapped[(reg[0], reg[1])] += 1; continue
        key = "std" if "표준화" in r.get("ITM_NM", "") else "crude"
        v = num(r.get("DT"))
        if v is None and str(r.get("DT")).strip() == "-" and reg[0] in live: v = 0.0
        if v is None: continue
        y = int(r["PRD_DE"][:4])
        if owner.setdefault((y, code), reg[0]) != reg[0]:
            raise SystemExit(f"{y} {code}: 통계청 코드 {owner[(y, code)]}·{reg[0]} 가 한 자리에 겹친다")
        vals[(iid, key, y)][code] = v

found = sorted({i for (i, k, y) in vals})
years = sorted({y for (i, k, y) in vals})
print("연도", years, "| 지표", len(found), "/", len(CAUSE), "| 빠진 지표", sorted(set(CAUSE) - set(found)))
print("미매핑 지역", len(unmapped), list(unmapped)[:12])
if set(CAUSE) - set(found):
    print("  (참고) 원자료 사망원인 이름:", sorted(causes_seen)[:60])

# ── 김동현 DB 와 겹치는 해 대조 ──
KIND = {i["id"]: i for i in KDH["indicators"]}
# DB 값은 10배 정수로 저장돼 있다(data.js val() 이 /10). DB 사망률은 연령표준화율 하나라 crude 칸도 같은 값이다.
diffs = []
for (iid, key, y), m in vals.items():
    ind = KIND.get(iid)
    if key != "std" or not ind or y not in ind["years"]: continue
    row = KDH["values"][iid]["std"][ind["years"].index(y)]
    for code, v in m.items():
        kv = row[IDX[code]]
        if kv is not None: diffs.append((abs(kv / 10 - v), iid, y, code, kv / 10, v))
# 차이 분류 — DB 쪽 오류로 확인된 두 유형은 따로 센다(원천은 KOSIS이므로 KOSIS 값으로 바로잡는다)
#   zero : DB가 0인데 원천은 값이 있다(2023년 82개 군 지역 사망률 전 항목이 0 — DB v1.7 결함)
#   round: DB가 정수로 반올림돼 있다(결핵 2018·2019 등, 차이 0.5 미만)
kind = collections.Counter()
for d in diffs:
    kv, v = d[4], d[5]
    kind["same" if d[0] < 0.051 else "zero" if kv == 0 and v > 0 else "round" if d[0] < 0.5 and kv == round(kv) else "other"] += 1
if not diffs:
    raise SystemExit("DB와 겹치는 해가 없어 대조할 수 없다 — 겹치는 해(예: 2024)도 받아 오라.")
diffs.sort(reverse=True)
print(f"DB 대조 {len(diffs)}칸: 같음 {kind['same']} · DB 0 오류 {kind['zero']} · DB 정수 반올림 {kind['round']} · 그 밖의 차이 {kind['other']}")
zero_by = collections.Counter((d[2], d[1]) for d in diffs if d[4] == 0 and d[5] > 0 and d[0] >= 0.051)
if zero_by: print("   DB 0 오류(연도·지표별):", dict(sorted(zero_by.items())))
for d in [d for d in diffs if not (d[0] < 0.051 or (d[4] == 0 and d[5] > 0) or (d[0] < 0.5 and d[4] == round(d[4])))][:8]: print("   그 밖:", d)
if kind["other"] / len(diffs) > 0.01:
    raise SystemExit("DB와 겹치는 해의 값이 1% 넘게 다르다 — 정의(표준인구·분류)를 확인하기 전에는 이어 붙이지 않는다.")

# ── 산출: 지표별로 DB에 값이 없는 해만 ──
out = {"generated": datetime.date.today().isoformat(),
       "source": "국가데이터처 사망원인통계 — KOSIS DT_1B34E13 「시군구/사망원인(50항목)/성/ 사망자수, 사망률, 연령표준화 사망률」 (성별 계)",
       "note": "김동현 교수 DB(v1.7)에 없는 해와, 원천 값으로 바로잡은 해(DB 2023년 0 오류·정수 반올림·빈 칸)를 담는다. 값은 연령표준화 사망률(2005년 추계인구 표준) ×10 정수, crude 칸도 같은 값(DB와 같은 방식). data.js 가 같은 지표 id 에 이어 붙인다.",
       "indicators": {}}
for iid in found:
    ind = KIND.get(iid)
    rec = {"years": [], "crude": [], "std": []}
    for y in years:
        m = vals.get((iid, "std", y), {})
        row = [None if (v := m.get(r["c"])) is None else int(round(v * 10)) for r in REG]
        if ind and y in ind["years"]:
            # DB에 있는 해: 원천(KOSIS) 값이 있는 칸은 원천 값으로(같은 칸은 그대로, DB 0·반올림 오류는 바로잡힘),
            # 원천에 없는 칸은 DB 값을 둔다. 바뀌는 칸이 없으면 싣지 않는다.
            old = KDH["values"][iid]["std"][ind["years"].index(y)]
            row = [n if n is not None else o for o, n in zip(old, row)]
            if row == old: continue
        if all(v is None for v in row): continue
        rec["years"].append(y); rec["std"].append(row); rec["crude"].append(row)
    if rec["years"]:
        have = set(ind["years"]) if ind else set()
        rec["added"] = [y for y in rec["years"] if y not in have or all(v is None for v in KDH["values"][iid]["std"][ind["years"].index(y)])]
        rec["fixed"] = [y for y in rec["years"] if y not in rec["added"]]
        out["indicators"][iid] = rec
print("이어 붙일 지표·연도:", {k: v["years"] for k, v in out["indicators"].items()})
(ROOT / "data" / "mort_kosis.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print("저장 data/mort_kosis.json")
