# -*- coding: utf-8 -*-
"""지표를 WHO/IHP+ 결과사슬(투입·과정 / 산출 / 성과 / 임팩트) + 맥락으로 분류.
근거: WHO/IHP+ Common M&E Framework(2011) 4개 지표 도메인, Kellogg 로직모델(2004) 주어 판별,
      Donabedian SPO(1966). 분류 기준은 docs/지역보건사업_평가이론_v1.md 참조."""
import json, collections, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
D = json.load(open(ROOT / "data/dataset.json", encoding="utf-8"))
K = json.load(open(ROOT / "data/kdh_dataset.json", encoding="utf-8"))

TIERS = ["투입·과정", "산출", "성과", "임팩트", "맥락"]

# 이름 단위 예외 지정(도메인 규칙보다 우선)
EXC = {
    # 산출(WHO Outputs = 서비스 가용성·접근성·질)
    "연간 미충족의료율": "산출", "연간 보건기관 이용률": "산출",
    # 임팩트(건강 수준·유병)
    "주관적 건강인지율": "임팩트", "우울증상 유병률": "임팩트", "비만율(자가보고)": "임팩트",
    "저작불편호소율(65세 이상)": "임팩트",
    "고혈압 진단 경험률(30세 이상)": "임팩트", "당뇨병 진단 경험률(30세 이상)": "임팩트",
    "검진 판정 정상A 비율": "임팩트", "검진 판정 유질환자 비율": "임팩트",
    "검진 고혈압 판정 비율": "임팩트", "검진 당뇨병 판정 비율": "임팩트",
    # 투입(재정 여력)
    "재정자립도": "투입·과정", "재정자주도": "투입·과정",
    # 맥락(의료이용 총량·비용)
    "1인당 의료기관 진료비": "맥락",
}
ENV_INPUT = {"상수도보급률", "하수도보급률", "도로포장률", "인구 천명당 공원 수",
             "인구 천명당 도시공원 조성면적", "인구 천명당 체육시설 수", "산림면적비율"}
ENV_CTX = {"미세먼지(PM10) 연평균 농도", "초미세먼지(PM2.5) 연평균 농도", "연평균 기온",
           "연 강수량", "노후주택비율", "빈집비율"}

def tier(name, dom):
    if name in EXC: return EXC[name]
    if dom == "보건의료자원": return "투입·과정"
    if dom == "인구·사회·경제": return "맥락"
    if dom == "지역박탈": return "맥락"
    if dom == "건강수명": return "임팩트"
    if dom == "사망률(표준화)": return "임팩트"
    if dom == "감염병 발생률": return "임팩트"
    if dom == "의료이용·검진":
        return "임팩트" if "진료실인원" in name else "성과"      # 수검률=성과(보장률), 진료실인원=질병부담 대리
    if dom == "환경·안전":
        if name in ENV_INPUT: return "투입·과정"
        if name in ENV_CTX: return "맥락"
        if "사망자" in name or "사고 건수" in name: return "임팩트"
        return "성과"                                            # 착용률·준수율·안전등급·교통지수
    return "성과"                                                # 지역사회건강조사 행태·보장률

rows = [(i["name"], i["domain"], "조사") for i in D["indicators"]] + \
       [(i["name"], i["domain"], "결과·환경DB") for i in K["indicators"]]
out = [{"name": n, "domain": d, "src": s, "tier": tier(n, d)} for n, d, s in rows]
cnt = collections.Counter(x["tier"] for x in out)
print(f"총 {len(out)}개")
for t in TIERS:
    print(f"  {t:8s} {cnt[t]:3d}")
print()
for t in TIERS:
    xs = [x for x in out if x["tier"] == t]
    doms = collections.Counter(x["domain"] for x in xs)
    print(f"[{t}] {len(xs)}개 — " + ", ".join(f"{k} {v}" for k, v in doms.most_common()))
json.dump({"basis": "WHO/IHP+ Common M&E Framework(2011) 4개 지표 도메인 + 맥락(CIPP Context)",
           "tiers": TIERS, "items": out}, open(ROOT / "data/eval_tiers.json", "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print("\n→ data/eval_tiers.json")
