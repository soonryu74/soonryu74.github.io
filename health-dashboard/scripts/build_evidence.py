"""근거 지침 통합표 생성 → data/evidence.json

입력
  data/nice_guidance.json      선정 NICE 지침 20건(지표 매핑·발표/갱신일·권고문 분류 건수)
  data/nice_recs_samples.json  지침별 권고문 표본(등급별 ≤2, 원문 영어, 권고문 연도표기)
  data/cpstf_findings.json     미국 CPSTF 224건(주제별 지표 매핑·판정일)
출력
  data/evidence.json           지표별 {nice:[…], cpstf:{…}} + 공백 요약

판정 규칙(사용자 확정): offer/should→권고, consider→고려, do not→반대, 연구 권고→근거 불충분.
"""
import json, re, statistics as st
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
D = ROOT / "data"
NOW = date.today().year

TITLE_KO = {
 "NG209": "담배: 흡연 시작 예방, 금연 촉진, 담배 의존 치료",
 "NG135": "중등·고등교육 현장의 음주 개입",
 "NG90":  "신체활동과 물리적 환경",
 "NG246": "과체중·비만 관리",
 "NG247": "모자 영양: 임신·출산 후·영유아기 영양과 체중 관리",
 "NG212": "직장에서의 정신적 웰빙",
 "NG223": "초·중등학교의 사회·정서·정신 웰빙",
 "NG32":  "노인의 자립과 정신적 웰빙",
 "NG105": "지역사회·구금시설의 자살 예방",
 "NG222": "성인 우울증: 치료와 관리",
 "NG30":  "구강보건 증진: 일반 치과 진료",
 "NG48":  "요양시설 성인의 구강건강",
 "NG136": "성인 고혈압: 진단과 관리",
 "NG28":  "성인 2형 당뇨병: 관리",
 "NG238": "심혈관질환: 위험 평가와 감소(지질 조절 포함)",
 "NG103": "인플루엔자 예방접종: 접종률 높이기",
 "NG218": "일반 인구의 예방접종 수용도 높이기",
 "NG44":  "지역사회 참여: 건강·웰빙 증진과 건강불평등 감소",
 "NG183": "행동변화: 디지털·모바일 건강 개입",
 "NG102": "지역 약국: 건강과 웰빙 증진",
}
MON = {m: i + 1 for i, m in enumerate(["January","February","March","April","May","June","July","August","September","October","November","December"])}

def main():
    nice = json.loads((D / "nice_guidance.json").read_text(encoding="utf-8"))
    samples = json.loads((D / "nice_recs_samples.json").read_text(encoding="utf-8"))
    cp = json.loads((D / "cpstf_findings.json").read_text(encoding="utf-8"))
    ds = json.loads((D / "dataset.json").read_text(encoding="utf-8"))
    ind_ids = [i["id"] for i in ds["indicators"]]

    guides = {}
    for it in nice["items"]:
        c = it["code"]
        guides[c] = {**it, "title_ko": TITLE_KO.get(c, it["title"]), "samples": samples.get(c, [])}

    # CPSTF 주제별 요약(판정 연도 분포)
    years = {}
    for x in cp["items"]:
        m = re.match(r"([A-Za-z]+)\s+(\d{4})", x.get("date") or "")
        if m: years.setdefault(x["topic"], []).append(int(m.group(2)))
    topics = {}
    for t in cp["topics"]:
        ys = years.get(t["topic"], [])
        topics[t["topic"]] = {**t, "median_year": int(st.median(ys)) if ys else None,
                              "latest_year": max(ys) if ys else None,
                              "recent10": sum(1 for y in ys if y >= NOW - 10)}

    by_ind = {}
    for iid in ind_ids:
        ng = [{"code": c, "level": g["level"]} for c, g in guides.items() if iid in g["indicators"]]
        ng.sort(key=lambda x: (x["level"] != "direct", x["code"]))
        cps = [t for t in topics.values() if iid in t["indicators"]]
        cps.sort(key=lambda t: -t["strong"])
        by_ind[iid] = {"nice": ng, "cpstf": [{k: t[k] for k in ("topic","topic_ko","n","strong","sufficient","insufficient","against","median_year","latest_year","recent10")} for t in cps]}

    has_nice = {i for i, v in by_ind.items() if v["nice"]}
    has_cp = {i for i, v in by_ind.items() if v["cpstf"]}
    gaps = {"none": [i for i in ind_ids if i not in has_nice and i not in has_cp],
            "cpstf_only": [i for i in ind_ids if i in has_cp and i not in has_nice],
            "nice_only": [i for i in ind_ids if i in has_nice and i not in has_cp]}

    out = {"generated": date.today().isoformat(), "now_year": NOW,
           "rule": nice.get("grade_rule"), "rule_note": nice.get("recs_note"),
           "nice_source": nice["source"], "cpstf_source": cp["source"], "cpstf_retrieved": cp.get("retrieved"),
           "guides": guides, "by_ind": by_ind, "gaps": gaps,
           "counts": {"nice_linked": len(has_nice), "cpstf_linked": len(has_cp), "union": len(has_nice | has_cp), "total": len(ind_ids)}}
    (D / "evidence.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"NICE {len(guides)}건 · 지표 연결 NICE {len(has_nice)} / CPSTF {len(has_cp)} / 합집합 {len(has_nice|has_cp)} / {len(ind_ids)}")
    print("공백:", {k: len(v) for k, v in gaps.items()})

if __name__ == "__main__":
    main()
