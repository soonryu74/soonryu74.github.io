# -*- coding: utf-8 -*-
"""
코로나19 시군구별 누적 확진·사망(2020-01-20 ~ 2023-08-31, 전수감시 기간) → data/covid_sgg.json

원자료: 공공데이터포털 15124288 「질병관리청_코로나19 시군구별 월별 확진자 및 사망 발생 현황_20230831」(xlsx)
  시트 「확진자」·「사망자」: 시도명 · 시군구 · 연도별 전체 + 월별. 일반구(고양시 덕양구 등)는 시 단위로 합산.
  '-' 는 0. 「합계」 행은 시도 값. 「검역」은 제외.

산출(지역별)
  cases      누적 확진자         deaths  누적 사망자
  case_rate  인구 100명당 확진(%)  = cases / pop × 100
  death_rate 인구 10만 명당 사망     = deaths / pop × 100,000
  cfr        치명률(%)             = deaths / cases × 100
  by_year    연도별 확진·사망
인구는 data/risk.json 의 2024년 연앙인구(고위험군 카드와 같은 분모)를 쓴다 — 유행기(2020~2023)와 연도가 다르므로 근사.

사용법: python scripts/build_covid.py <xlsx 경로>
"""
import json, re, sys, datetime
from pathlib import Path
from collections import defaultdict
import openpyxl

ROOT = Path(__file__).resolve().parent.parent
DS = json.loads((ROOT / "data" / "dataset.json").read_text(encoding="utf-8"))
RISK = json.loads((ROOT / "data" / "risk.json").read_text(encoding="utf-8"))
ALIAS = {"여주군": "여주시", "당진군": "당진시", "세종": "세종시", "군위군": "군위군"}

short2sido = {r["s"]: r["c"] for r in DS["regions"] if r["l"] == "sido"}
by_sido = defaultdict(dict)
for r in DS["regions"]:
    if r["l"] == "sgg":
        by_sido[r["p"]][r["n"]] = r["c"]
NAME = {r["c"]: r["n"] for r in DS["regions"]}
SEJONG = next(r["c"] for r in DS["regions"] if r["l"] == "sgg" and r["n"] == "세종시")


def target(sido_short, nm):
    n = ALIAS.get(nm.replace(" ", ""), nm.replace(" ", ""))
    sc = short2sido[sido_short]
    tbl = by_sido.get(sc, {})
    if sido_short == "세종":
        return SEJONG
    if n in tbl:
        return tbl[n]
    m = re.match(r"^(.+?시)(.+구)$", n)
    if m and m.group(1) in tbl:
        return tbl[m.group(1)]
    # 군위군: 2023년 대구 편입 — 원자료는 경북 소속
    for scode, t in by_sido.items():
        if n in t and n == "군위군":
            return t[n]
    return None


def read(ws):
    rows = list(ws.iter_rows(values_only=True))
    hdr_i = next(i for i, r in enumerate(rows) if r[0] == "시도명")
    years_row = rows[hdr_i] if any(isinstance(v, str) and v.endswith("년") for v in rows[hdr_i][2:]) else rows[hdr_i - 1]
    sub = rows[hdr_i + 1]
    # 연도별 「전체」 열 위치
    ycol = {}
    cur = None
    for j in range(2, len(sub)):
        y = years_row[j]
        if isinstance(y, str) and y.endswith("년"):
            cur = int(y[:-1])
        if sub[j] == "전체" and cur:
            ycol[cur] = j
    out = {}
    for r in rows[hdr_i + 2:]:
        if not r[0] or not r[1] or r[0] == "검역":
            continue
        vals = {y: (0 if r[j] in ("-", None) else float(r[j])) for y, j in ycol.items()}
        out[(r[0], r[1].strip())] = vals
    return out


def main():
    src = Path(sys.argv[1])
    wb = openpyxl.load_workbook(src, read_only=True, data_only=True)
    cases = read(wb["확진자"]); deaths = read(wb["사망자"])
    years = sorted(next(iter(cases.values())))
    agg = defaultdict(lambda: {"c": defaultdict(float), "d": defaultdict(float), "src_rows": 0})
    unmatched = []
    for (sd, nm), cv in cases.items():
        dv = deaths.get((sd, nm), {})
        if nm == "합계":
            code = short2sido[sd]
        else:
            code = target(sd, nm)
        if code is None:
            unmatched.append(f"{sd} {nm}"); continue
        a = agg[code]; a["src_rows"] += 1
        for y in years:
            a["c"][y] += cv.get(y, 0); a["d"][y] += dv.get(y, 0)
    regions = {}
    for code, a in agg.items():
        pop = (RISK["regions"].get(code) or {}).get("pop")
        c = sum(a["c"].values()); d = sum(a["d"].values())
        regions[code] = {"cases": int(c), "deaths": int(d), "pop": pop,
                         "case_rate": round(c / pop * 100, 1) if pop else None,
                         "death_rate": round(d / pop * 1e5, 1) if pop else None,
                         "cfr": round(d / c * 100, 3) if c else None,
                         "by_year": {str(y): [int(a["c"][y]), int(a["d"][y])] for y in years}}
    nat_c = sum(v["cases"] for k, v in regions.items() if len(k) == 3)
    nat_d = sum(v["deaths"] for k, v in regions.items() if len(k) == 3)
    out = {"generated": datetime.date.today().isoformat(),
           "source": "질병관리청 「코로나19 시군구별 월별 확진자 및 사망 발생 현황」(공공데이터포털 15124288), 2020-01-20~2023-08-31 전수감시 기간",
           "period": "2020-01-20~2023-08-31", "years": years, "pop_year": RISK["pop_year"],
           "national": {"cases": nat_c, "deaths": nat_d, "cfr": round(nat_d / nat_c * 100, 3)},
           "regions": regions}
    p = ROOT / "data" / "covid_sgg.json"
    p.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    sgg = [k for k in regions if len(k) != 3]
    print(f"→ {p} 시도 {sum(1 for k in regions if len(k)==3)} · 시군구 {len(sgg)} (인구 있음 {sum(1 for k in sgg if regions[k]['pop'])})")
    print(f"전국(시도 합) 확진 {nat_c:,} · 사망 {nat_d:,} · 치명률 {nat_d/nat_c*100:.3f}%")
    if unmatched:
        print("미매칭:", unmatched)


if __name__ == "__main__":
    main()
