# -*- coding: utf-8 -*-
"""
미국 CPSTF(Community Preventive Services Task Force) 권고 전수 수집·파싱.

원자료: The Community Guide, "CPSTF All Active Findings" PDF
산출  : data/cpstf_findings.json  (권고 224건 + 주제별 집계 + 우리 지표 매핑)
사용법: python scripts/fetch_cpstf.py
"""
import json, re, sys
from pathlib import Path
from collections import Counter, defaultdict
import requests, pymupdf

ROOT = Path(__file__).resolve().parent.parent
PDF_URL = "https://www.thecommunityguide.org/media/pdf/cpstf-finding-lists/CPSTF-All-Findings-508.pdf"
CACHE = ROOT / "data" / "raw" / "cpstf_all.pdf"

TOPICS = ["Adolescent Health", "Asthma", "Cancer", "Diabetes", "Excessive Alcohol Use",
          "Health Communication and Health Information Technology", "Heart Disease and Stroke Prevention",
          "HIV/AIDS, STIs and Teen Pregnancy", "Mental Health", "Motor Vehicle Injury", "Nutrition",
          "Obesity", "Oral Health", "Physical Activity", "Pregnancy Health", "Preparedness and Response",
          "Social Determinants of Health", "Substance Use", "Tobacco Use", "Vaccination",
          "Violence Prevention", "Worksite Health"]
FIN = {"Recommended (strong)", "Recommended (sufficient)", "Insufficient Evidence", "Recommended Against"}
MON = "January|February|March|April|May|June|July|August|September|October|November|December"

TOPIC_KO = {
 "Adolescent Health": "청소년 건강", "Asthma": "천식", "Cancer": "암", "Diabetes": "당뇨병",
 "Excessive Alcohol Use": "과도한 음주",
 "Health Communication and Health Information Technology": "건강 커뮤니케이션·정보기술",
 "Heart Disease and Stroke Prevention": "심장병·뇌졸중 예방",
 "HIV/AIDS, STIs and Teen Pregnancy": "HIV·성매개감염·청소년임신", "Mental Health": "정신건강",
 "Motor Vehicle Injury": "교통사고 손상", "Nutrition": "영양", "Obesity": "비만", "Oral Health": "구강건강",
 "Physical Activity": "신체활동", "Pregnancy Health": "임신 건강", "Preparedness and Response": "보건위기 대비·대응",
 "Social Determinants of Health": "건강의 사회적 결정요인", "Substance Use": "약물 사용", "Tobacco Use": "담배",
 "Vaccination": "예방접종", "Violence Prevention": "폭력 예방", "Worksite Health": "직장 건강",
}
FIND_KO = {"Recommended (strong)": "강력 권고", "Recommended (sufficient)": "권고",
           "Insufficient Evidence": "근거 불충분", "Recommended Against": "반대 권고"}

# CPSTF 주제 → 대시보드 지표 id
MAP = {
 "Tobacco Use": ["DT_H_SM", "DT_H_SM_MALE", "DT_TOBACCO_PRODUCT", "DT_SM_TRY_V2",
                 "DT_117075_SM_IND_WORK_V2", "K_MORT_LUNG", "K_USE_LUNG", "K_MORT_COPD"],
 "Physical Activity": ["DT_H_EX_WALK", "DT_H_EX_PHY", "DT_117075_H_HEALTHY", "K_ENV_SPORT",
                       "K_ENV_PARKN", "K_ENV_PARKA"],
 "Nutrition": ["DT_117075_DIE_BF02", "DT_11775_NUT_LABEL_UTIL"],
 "Obesity": ["DT_H_OBE_OBE", "DT_H_OBE_CONTROL"],
 "Excessive Alcohol Use": ["DT_H_DR_MONTH", "DT_117075_H_DR_HIGH_WH", "DT_H_DR_HIGH",
                           "DT_117075_H_DR_DRIV", "K_MORT_LIVD", "K_USE_LIV"],
 "Diabetes": ["DT_DIA_DOCTOR", "DT_DIA_TREAT", "DT_DIA_EYE", "DT_DIA_KIDNEY",
              "DT_117075_DIA_AWAR", "K_MORT_DM", "K_USE_DM", "K_CHK_DM"],
 "Heart Disease and Stroke Prevention": ["DT_HYPER_DOCTOR", "DT_HYPER_DOCTOR_DRUG", "DT_117075_HYPER_AWAR",
                                         "DT_117075_STR_EARLY_SYM", "DT_117075_MYO_EARLY_SYM", "K_MORT_IHD",
                                         "K_MORT_CVA", "K_MORT_HTN", "K_MORT_HEART", "K_USE_HTN", "K_CHK_HTN"],
 "Cancer": ["K_MORT_CA", "K_MORT_STO", "K_MORT_LIV", "K_MORT_LUNG", "K_MORT_COL",
            "K_USE_STO", "K_USE_LUNG", "K_USE_COL", "K_USE_BRE"],
 "Vaccination": ["DT_INFLUENZA", "K_INF_VAR", "K_INF_MUMPS", "K_INF_HAV", "K_INF_PER"],
 "Mental Health": ["DT_H_MENTAL_STRESS", "DT_H_MENTAL_DEPRESS", "DT_117075_H_MENTAL_DEPRESS_SYM",
                   "K_MORT_SUI", "K_USE_MENT", "K_SAF_G_SUI"],
 "Motor Vehicle Injury": ["DT_H_BELT", "DT_117075_H_BELT_BACK", "DT_117075_H_DR_DRIV", "K_SAF_BELT",
                          "K_SAF_STOP", "K_SAF_SIG", "K_SAF_TA", "K_SAF_TADEATH", "K_SAF_PED",
                          "K_SAF_ELD", "K_SAF_TCI", "K_SAF_TSI", "K_MORT_TRA", "K_SAF_G_TRAF"],
 "Oral Health": ["DT_H_OR_BRUSH", "DT_H_OR_INCONV", "K_USE_PERIO"],
 "Violence Prevention": ["K_MORT_HOM", "K_SAF_G_CRIME"],
 "Social Determinants of Health": ["K_POP_ONE", "K_POP_BLS", "K_ENV_OLD", "K_ENV_EMPTY", "K_ECO_EMP",
                                   "K_ECO_YEMP", "K_ECO_UNEMP", "K_EDU_RATIO", "K_RES_SOC", "K_RES_CULT"],
 "Worksite Health": ["DT_117075_SM_IND_WORK_V2"],
 "Asthma": ["K_MORT_COPD"],
 "HIV/AIDS, STIs and Teen Pregnancy": ["K_INF_SYP", "K_POP_CBR"],
 "Substance Use": ["DT_117075_H_DR_DRIV"],
 "Adolescent Health": [],
 "Pregnancy Health": ["K_MORT_INF"],
 "Preparedness and Response": ["K_SAF_G_INF"],
 "Health Communication and Health Information Technology": [],
}


def fetch_pdf() -> bytes:
    if CACHE.exists():
        return CACHE.read_bytes()
    r = requests.get(PDF_URL, timeout=180)
    r.raise_for_status()
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_bytes(r.content)
    return r.content


def parse(pdf_bytes: bytes):
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    text = "\n".join(p.get_text() for p in doc)
    lines = []
    for raw in (l.strip() for l in text.split("\n")):
        if not raw:
            continue
        if re.fullmatch(MON, raw):                       # "November" 단독 → 다음 줄의 연도와 결합
            lines.append(["MON", raw]); continue
        if re.fullmatch(r"\d{4}\*?", raw) and lines and lines[-1][0] == "MON":
            lines.append(["DATE", f"{lines.pop()[1]} {raw}"]); continue
        if re.fullmatch(r"\d+", raw):                    # 페이지 번호
            continue
        if re.fullmatch(rf"({MON})\s+\d{{4}}\*?", raw):
            lines.append(["DATE", raw]); continue
        lines.append(["T", raw])

    cur, items, buf = None, [], []
    for kind, l in lines:
        if kind == "DATE":
            if items and items[-1]["date"] is None:
                items[-1]["date"] = l
            continue
        # 주제 헤더는 항목 버퍼가 빈 상태에서만 인정한다.
        # ("… for Patients with Type 2 / Diabetes" 처럼 줄바꿈된 제목의 끝 단어를 헤더로 오인하지 않기 위함)
        if l in TOPICS and (cur is None or not buf):
            cur, buf = l, []
            continue
        if l in FIN:
            items.append({"topic": cur, "name": " ".join(buf).strip(), "finding": l, "date": None})
            buf = []
            continue
        buf.append(l)
    return items


def main():
    items = parse(fetch_pdf())
    bad = [x for x in items if not (x["topic"] and x["name"] and x["date"])]
    if bad:
        print(f"파싱 실패 {len(bad)}건", bad[:3], file=sys.stderr); sys.exit(1)

    by_topic = defaultdict(list)
    for x in items:
        by_topic[x["topic"]].append(x)
    topics = []
    for t, lst in sorted(by_topic.items(), key=lambda kv: -len(kv[1])):
        c = Counter(y["finding"] for y in lst)
        topics.append({"topic": t, "topic_ko": TOPIC_KO.get(t, t), "n": len(lst),
                       "strong": c["Recommended (strong)"], "sufficient": c["Recommended (sufficient)"],
                       "insufficient": c["Insufficient Evidence"], "against": c["Recommended Against"],
                       "indicators": MAP.get(t, [])})

    out = {
        "source": "Community Preventive Services Task Force, All Active Findings (2024-11)",
        "source_url": PDF_URL,
        "site": "https://www.thecommunityguide.org/",
        "retrieved": "2026-09-18",
        "grades": [
            {"en": "Recommended (strong)", "ko": "강력 권고", "desc": "효과 근거가 강함 — 우선 도입 대상"},
            {"en": "Recommended (sufficient)", "ko": "권고", "desc": "효과 근거가 충분함 — 도입 가능"},
            {"en": "Insufficient Evidence", "ko": "근거 불충분",
             "desc": "효과 여부를 판단할 근거가 부족 — 효과가 없다는 뜻이 아님. 연구·평가 우선순위"},
            {"en": "Recommended Against", "ko": "반대 권고", "desc": "이익보다 해가 크다는 근거가 충분 — 시행하지 말 것"},
        ],
        "total": len(items),
        "summary": dict(Counter(x["finding"] for x in items)),
        "topics": topics,
        "items": [{"topic": x["topic"], "topic_ko": TOPIC_KO.get(x["topic"], x["topic"]), "name": x["name"],
                   "finding": x["finding"], "finding_ko": FIND_KO[x["finding"]], "date": x["date"]} for x in items],
    }
    p = ROOT / "data" / "cpstf_findings.json"
    p.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print("wrote", p, out["total"], out["summary"])

    ids = set()
    for f in ("dataset.json", "kdh_dataset.json"):
        ids |= {i["id"] for i in json.loads((ROOT / "data" / f).read_text(encoding="utf-8"))["indicators"]}
    mapped = {i for v in MAP.values() for i in v}
    missing = mapped - ids
    if missing:
        print("경고: 존재하지 않는 지표 id", sorted(missing), file=sys.stderr)
    print(f"지표 {len(ids)}개 중 CPSTF 주제 연결 {len(mapped & ids)}개 ({len(mapped & ids) / len(ids) * 100:.0f}%)")


if __name__ == "__main__":
    main()
