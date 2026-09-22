# -*- coding: utf-8 -*-
"""
일반건강검진 수검률·판정 지표 생성 — data/raw_checkup/*.json → data/checkup.json

원천: 국민건강보험공단 건강검진통계(KOSIS orgId 350)
  DT_35007_N001_1  대상·수검인원            → CHK_RATE   일반건강검진 수검률 = 수검인원 ÷ 대상인원
  DT_35007_N098    종합판정 현황            → CHK_NORMA  정상A 비율 = 정상A ÷ 수검인원(판정 합계)
                                            → CHK_DIS    유질환자 비율 = 유질환자 ÷ 수검인원
  DT_35007_N103    질환의심 세부현황        → CHK_HTN_S  고혈압 의심 비율(1차) · CHK_DM_S 당뇨병 의심 비율(1차)
  DT_35007_N105    유질환자 세부현황        → CHK_HTN_D  고혈압 유질환자 비율 · CHK_DM_D 당뇨병 유질환자 비율

정의 연속성
  - 수검률·정상A·유질환자 3종은 김동현 교수 DB(2010~2017, K_CHK_RATE·K_CHK_NORMA·K_CHK_DIS)와 정의가 같아
    2018~2024를 같은 시계열로 이어 붙인다(별도 id로 만들고 data.js 에서 연결).
  - 고혈압·당뇨 「판정」(K_CHK_HTN·K_CHK_DM)은 2차 검진 판정이 분자였는데 2018년 검진제도 개편으로 2차 검진이
    폐지되어 원천이 끊겼다. 2018년 이후는 1차 판정의 「의심」과 「유질환자」를 각각 별도 지표로 둔다(정의 변경 명시).

지역 정리(암검진 build_cancer.py 와 동일)
  - 일반구 행은 인원을 더해 시 단위로 합산, 같은 해에 시 행이 있으면 시 행만 사용
  - 세종은 시도 행을 세종시에 넣음, 여주군·당진군 → 여주시·당진시
사용법: python scripts/build_checkup.py
"""
import json, re, sys, datetime
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw_checkup"
DS = json.loads((ROOT / "data" / "dataset.json").read_text(encoding="utf-8"))
ALIAS = {"여주군": "여주시", "당진군": "당진시"}
SEX_ALL = "001"

short2sido = {r["s"]: r["c"] for r in DS["regions"] if r["l"] == "sido"}
sgg = [r for r in DS["regions"] if r["l"] == "sgg"]
by_sido = defaultdict(dict)
for r in sgg:
    by_sido[r["p"]][r["n"]] = r["c"]
SEJONG = next((r["c"] for r in sgg if r["n"] == "세종시"), None)
SIDOS = set(short2sido)
CODES = [r["c"] for r in DS["regions"]]
IDX = {c: i for i, c in enumerate(CODES)}


def target_of(sido_short, nm):
    n = ALIAS.get(nm.replace(" ", ""), nm.replace(" ", ""))
    tbl = by_sido.get(short2sido[sido_short], {})
    if n in tbl:
        return tbl[n], True
    m = re.match(r"^(.+?시)(.+구)$", n)
    if m and m.group(1) in tbl:
        return tbl[m.group(1)], False
    return None, None


def aggregate(rows, keyfn):
    """행 → {(지역코드, key): 합계}. keyfn(row) 이 None 이면 건너뜀. 시 행이 있으면 구 행은 버린다."""
    def one(skip_gu_for):
        acc = defaultdict(float); cityset = set(); cur = None
        for r in rows:
            if r.get("C2") != SEX_ALL: continue
            nm = r.get("C1_NM", "")
            if nm == "계": continue
            if nm in SIDOS:
                cur = nm
                k = keyfn(r)
                if k is not None:
                    acc[(short2sido[nm], k)] += float(r["DT"] or 0)          # 시도 행 → 시도 값(시도 순위·비교용)
                    if nm == "세종" and SEJONG:
                        acc[(SEJONG, k)] += float(r["DT"] or 0); cityset.add(SEJONG)
                continue
            if cur is None: continue
            code, is_city = target_of(cur, nm)
            if code is None:
                UNMATCHED.add(f"{cur} {nm}"); continue
            if code in skip_gu_for and not is_city: continue
            k = keyfn(r)
            if k is None: continue
            acc[(code, k)] += float(r["DT"] or 0)
            if is_city: cityset.add(code)
        return acc, cityset
    acc, cityset = one(set())
    if cityset:
        acc, _ = one(cityset)
    return acc

UNMATCHED = set()


def load(tbl):
    out = {}
    for f in sorted(RAW.glob(f"{tbl}_*.json")):
        out[int(f.stem.split("_")[-1])] = json.loads(f.read_text(encoding="utf-8"))
    return out


def grid_ratio(num, den, years):
    """num/den: {year: {code: value}} → ×10 정수 격자"""
    g = []
    for y in years:
        row = [None] * len(CODES)
        for code, d in den.get(y, {}).items():
            n = num.get(y, {}).get(code)
            if d and n is not None and code in IDX:
                row[IDX[code]] = round(n / d * 1000)
        g.append(row)
    return g


def main():
    inds, values, src_years = [], {}, {}

    # ── 수검률 ──
    raw = load("DT_35007_N001_1")
    if not raw:
        sys.exit("data/raw_checkup 에 DT_35007_N001_1 자료가 없습니다 — scripts/kosis_fetch_checkup.py 먼저 실행")
    tgt, got = {}, {}
    for y, rows in raw.items():
        a = aggregate(rows, lambda r: r["ITM_NM"] if r["ITM_NM"] in ("대상인원", "수검인원") else None)
        tgt[y] = {c: v for (c, k), v in a.items() if k == "대상인원"}
        got[y] = {c: v for (c, k), v in a.items() if k == "수검인원"}
    years = sorted(raw)
    values["CHK_RATE"] = {"crude": grid_ratio(got, tgt, years), "std": grid_ratio(got, tgt, years)}
    inds.append({"id": "CHK_RATE", "name": "일반건강검진 수검률", "domain": "의료이용·검진", "bad": False, "unit": "%", "years": years,
                 "outcome": False, "tier": "성과", "cont": "K_CHK_RATE",
                 "src": "국민건강보험공단 건강검진통계 — 시군구별 성별 일반건강검진 대상 및 수검인원 현황(KOSIS DT_35007_N001_1). 수검인원÷대상인원. 일반구는 시 단위로 합산"})
    src_years["DT_35007_N001_1"] = years
    print(f"  수검률: {years[0]}~{years[-1]} · 셀 {sum(1 for r in values['CHK_RATE']['crude'] for v in r if v is not None)}")

    # ── 판정(정상A·유질환자) / 세부(고혈압·당뇨) — 원자료 항목명 확인 후 JUDGE 설정 ──
    for tbl, spec in JUDGE.items():
        raw = load(tbl)
        if not raw:
            print(f"  {tbl}: 원자료 없음 — 건너뜀"); continue
        num, den = defaultdict(dict), defaultdict(dict)
        for y, rows in raw.items():
            a = aggregate(rows, spec["key"])
            for (c, k), v in a.items():
                if k == "__den__": den[y][c] = v
                else: num[k][y] = num[k].get(y, {}); num[k][y][c] = v
        ys = sorted(raw)
        # 분모가 표 안에 없으면 수검인원(N001_1)을 쓴다
        if not den:
            den = {y: got.get(y, {}) for y in ys}
        for k, meta in spec["out"].items():
            g = grid_ratio(num.get(k, {}), den, ys)
            values[meta["id"]] = {"crude": g, "std": g}
            inds.append({**meta, "domain": "의료이용·검진", "unit": "%", "years": ys, "outcome": False, "tier": meta.get("tier", "성과"),
                         "note": meta.get("note") or (NOTE_1ST if meta["id"] in ("CHK_HTN_S", "CHK_DM_S", "CHK_HTN_D", "CHK_DM_D") else None),
                         "src": f"국민건강보험공단 건강검진통계 — {spec['title']}(KOSIS {tbl}). {meta['formula']}. 일반구는 시 단위로 합산"})
            print(f"  {meta['name']}: {ys[0]}~{ys[-1]} · 셀 {sum(1 for r in g for v in r if v is not None)}")
        src_years[tbl] = ys

    out = {"generated": datetime.date.today().isoformat(),
           "source": "KOSIS 국민건강보험공단 건강검진통계 (DT_35007_N001_1·N098·N103·N105)",
           "source_years": src_years, "domains": ["의료이용·검진"], "indicators": inds, "values": values,
           "note": "2018년 검진제도 개편으로 2차 검진이 폐지되어 「검진 고혈압/당뇨병 판정 비율」(2차 판정)은 2017년에서 끝난다. 2018년 이후 고혈압·당뇨는 1차 판정의 의심·유질환자 비율을 별도 지표로 둔다."}
    p = ROOT / "data" / "checkup.json"
    p.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    print(f"→ {p} ({p.stat().st_size/1e6:.2f} MB)")
    if UNMATCHED:
        print("지역 미매칭:", sorted(UNMATCHED)[:20])


# 표별 항목 매핑 — 2024년 원자료 구조 확인 후 채운다
NOTE_2018 = ("자료 연결 — 2017년까지는 질병관리청 자료실(김동현 교수 DB) 경유, 2018년부터는 KOSIS 공단 건강검진통계에서 직접 산출(산식 동일). "
             "단, 2018년 검진제도 개편으로 판정 기준·절차가 바뀌었다.")
NOTE_1ST = ("정의 변경 — 2018년 검진제도 개편으로 2차 검진이 폐지되어 「검진 고혈압/당뇨병 판정 비율」(2차 판정 확진)은 2017년에서 끝난다. "
            "이 지표는 2018년부터의 1차 판정 결과이며 2017년 이전 값과 이어 붙여 비교할 수 없다.")
DZ = {"고혈압": "고혈압", "당뇨병": "당뇨병", "당뇨": "당뇨병"}     # N103은 「당뇨병」, N105는 「당뇨」로 적혀 있다
JUDGE = {
 # 세부현황 표에는 분모(판정 인원)가 없어 N001_1 수검인원을 분모로 쓴다(N098 「계」와 247개 지역 전부 일치 확인).
 # C3_NM 「실인원」이 두 번 나오지만(일반 의심·고당 의심) 우리는 질환명만 쓴다.
 "DT_35007_N103": {
  "title": "시군구별 성별 일반건강검진 판정결과 질환의심 세부현황",
  "key": lambda r: DZ.get(r.get("C3_NM")),
  "out": {
   "고혈압": {"id": "CHK_HTN_S", "name": "검진 고혈압 의심 비율(1차 판정)", "bad": True, "formula": "1차 판정 고혈압 질환의심 ÷ 수검인원"},
   "당뇨병": {"id": "CHK_DM_S",  "name": "검진 당뇨병 의심 비율(1차 판정)", "bad": True, "formula": "1차 판정 당뇨병 질환의심 ÷ 수검인원"},
  },
 },
 "DT_35007_N105": {
  "title": "시군구별 성별 일반건강검진 판정결과 유질환자 세부현황",
  "key": lambda r: DZ.get(r.get("C3_NM")),
  "out": {
   "고혈압": {"id": "CHK_HTN_D", "name": "검진 고혈압 유질환자 비율", "bad": True, "formula": "판정 고혈압 유질환자 ÷ 수검인원"},
   "당뇨병": {"id": "CHK_DM_D",  "name": "검진 당뇨병 유질환자 비율", "bad": True, "formula": "판정 당뇨병 유질환자 ÷ 수검인원"},
  },
 },
 "DT_35007_N098": {
  "title": "시군구별 성별 일반건강검진 판정현황",
  # 판정 「계」 = 정상A + 정상B(경계) + 질환의심 실인원 + 유질환자 (2024 서울로 확인) → 분모
  "key": lambda r: {"계": "__den__", "정상A": "정상A", "유질환자": "유질환자"}.get(r.get("C3_NM")),
  "out": {
   "정상A":   {"id": "CHK_NORMA", "name": "검진 판정 정상A 비율", "bad": False, "cont": "K_CHK_NORMA", "formula": "정상A ÷ 판정 인원(계)",
               "note": NOTE_2018 + " 특히 정상A는 판정 기준이 바뀌어 2017→2018년 사이 계단식으로 오른다(시군구 중앙값 6.8→11.6%). 2017년 이전과의 증감 비교는 피할 것."},
   "유질환자": {"id": "CHK_DIS",   "name": "검진 판정 유질환자 비율", "bad": True,  "cont": "K_CHK_DIS",   "formula": "유질환자 ÷ 판정 인원(계)",
               "note": NOTE_2018 + " 유질환자 비율은 2017년 23.7% → 2018년 25.4%(시군구 중앙값)로 이어지지만 판정 기준 변경 영향이 섞여 있을 수 있다."},
  },
 },
}

if __name__ == "__main__":
    main()
