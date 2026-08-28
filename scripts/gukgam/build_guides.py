#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
국정감사 자료 DB — 의원별 답변 가이드북 데이터 생성
- 위원 프로필(사진·약력)과 회의록 발언 데이터(복지부 5,100건 + 질병청 1,100건)를 결합해
  위원별 브리핑 자료를 만듭니다. 모든 분석은 회의록·공개 프로필에 근거하며 출처를 답니다.
- 구성: 핵심 요약 / 발언 통계 / 관심 분야 / 대표 질의 인용(최근순) / 질의 스타일 지표 /
  주제별 대응 포인트(사전 매핑) / 참고 링크

실행: python3 scripts/gukgam/build_guides.py  (키 불필요)
출력: data/gukgam/guides.json
"""
import os, json, glob, datetime, collections, re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "data", "gukgam")
OUT = os.path.join(DATA, "guides.json")

# 주제별 대응 포인트: 기관장 답변 준비 관점의 일반 지침 (사실 주장 아님)
TOPIC_GUIDE = {
    "건강보험·수가": "보장률·재정수지 최신 수치와 수가 협상 경과를 숫자로 준비. 비급여·실손 연계 질의로 확장될 수 있음.",
    "의사인력·의대정원": "전공의 복귀율·필수과 지원율 최신 통계 필수. 감정적 공방 소재이므로 사실관계 중심으로 짧게.",
    "필수·지역의료": "분만·소아과 취약지 현황과 시범사업 성과를 지역 단위 수치로. 위원 지역구 관련 수치는 반드시 사전 확인.",
    "공공의료": "지방의료원 경영 현황과 지원 계획. 코로나 시기 손실보상 이행 여부 재질의 가능성.",
    "간호·간병": "간호법 시행 준비 상황과 간호간병통합서비스 확대 실적.",
    "연금": "재정추계 핵심 수치와 개혁안 진행 상황. '언제까지'를 물으면 시점을 특정해 답할 준비.",
    "저출산·보육": "출생아 수·예산 집행률과 신규 사업 성과. '실효성' 프레임 질의에 성과지표로 대응.",
    "아동·청소년": "아동학대 대응 인력·자립준비청년 지원 실적. 개별 사건 질의 대비 사실관계 타임라인 준비.",
    "노인·돌봄": "장기요양 수급자 추이와 요양기관 관리 실태. 부정수급 적발 실적 준비.",
    "장애인": "활동지원·이동권·고용률 수치. 당사자성 있는 위원에게는 구체적 이행 시점 약속이 재질의로 돌아옴을 유의.",
    "빈곤·기초생활": "수급 사각지대 발굴 실적과 부양의무자 기준 관련 입장 정리.",
    "정신건강·자살": "자살률 추이와 예방 예산·인프라. 개별 사건 언급 시 애도 표명 후 대책 중심으로.",
    "의약품·제약": "품절약·마약류 관리 현황. 특정 품목 수치 질의가 많으므로 품목별 자료 준비.",
    "바이오·R&D": "R&D 예산 증감과 성과. 삭감 논쟁 재점화 가능성.",
    "비대면·의료IT": "비대면진료 시범사업 실적과 법제화 입장.",
    "의료사고·분쟁": "의료분쟁 조정 실적과 필수의료 사법리스크 완화 방안.",
    "연말정산·재정": "소관 예산 집행률·불용액 상위 사업 명세 필수. 결산 지적사항 이행 현황 즉답 가능해야 함.",
    "예산·재정": "소관 예산 집행률·불용액 상위 사업 명세 필수. 결산 지적사항 이행 현황 즉답 가능해야 함.",
    "감염병 대응": "감염병 발생 추이·대응 태세 수치(병상·비축·인력). 위기 시나리오별 대응 계획 요약 준비.",
    "백신·예방접종": "접종률·수급·폐기 현황. 폐기량 질의는 매년 반복되므로 개선 추세 강조.",
    "피해보상": "이상반응 보상 처리 건수·소요 기간. 개별 사례 질의 대비 절차 설명 준비.",
    "조직·인력": "결원률·이직 사유·충원 계획. 지방 조직 처우 문제 단골 소재.",
    "정보시스템": "시스템 장애·구축 지연 이력과 개선 조치.",
    "미래 팬데믹 대비": "신종감염병 대비 훈련·비축·연구 현황.",
    "검역·해외유입": "검역 인력·시스템 현황.",
    "지역·지자체 협력": "보건소·지자체 협력 체계와 권역 대응센터 운영 현황.",
    "만성·희귀질환": "희귀질환 지원 확대 실적과 급여화 진행 상황.",
}


def load(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as f:
        return json.load(f)


def main():
    members = load("members.json")["items"]
    topics_map = load("member-topics.json").get("members", {})
    qa = [dict(i, src="질병청") for i in load("kdca-qa.json")["items"]]
    for p in sorted(glob.glob(os.path.join(DATA, "mohw-qa-2*.json"))):
        with open(p, encoding="utf-8") as f:
            qa += [dict(i, src="복지부") for i in json.load(f)["items"]]

    by_member = collections.defaultdict(list)
    for i in qa:
        by_member[i["member"]].append(i)

    # 발언량 순위 (현직 위원 기준)
    ranks = sorted(members, key=lambda m: -len(by_member.get(m["name"], [])))
    rank_of = {m["name"]: r + 1 for r, m in enumerate(ranks)}

    guides = []
    for m in members:
        name = m["name"]
        items = by_member.get(name, [])
        items.sort(key=lambda x: x["date"], reverse=True)
        tcount = collections.Counter(t for i in items for t in (i.get("topics") or []))
        top_topics = tcount.most_common(5)
        with_a = sum(1 for i in items if i.get("a"))
        years = sorted({i["year"] for i in items})
        # 대표 질의: 최근 국감 위주로, 답변 있는 긴 질의 3건
        recent = [i for i in items if i.get("a") and len(i["q"]) > 120][:40]
        recent.sort(key=lambda x: (x["date"], len(x["q"])), reverse=True)
        quotes = [{"date": i["date"], "src": i["src"], "q": i["q"], "a": i["a"],
                   "topics": i.get("topics") or [], "minutes_url": i.get("minutes_url", "")}
                  for i in recent[:3]]
        # 핵심 요약(사실 조합)
        mt = topics_map.get(name) or {}
        summary = []
        if items:
            summary.append(f"최근 국감({years[0]}~{years[-1]}년)에서 복지부·질병청 관련 질의 {len(items)}건 (현 위원 중 발언량 {rank_of.get(name)}위).")
            if top_topics:
                summary.append("주요 관심 분야는 " + ", ".join(f"{t}({c}건)" for t, c in top_topics[:3]) + ".")
            if with_a and len(items):
                summary.append(f"질의 중 {round(with_a/len(items)*100)}%가 장관·청장 답변으로 이어진 실질 질의형.")
        else:
            summary.append("최근 국감(제21~22대) 회의록에서 복지부·질병청 관련 발언이 확인되지 않음 (신규 위원 또는 사보임 가능성). 약력·언론 보도로 관심사를 사전 파악할 것.")
        # 대응 포인트
        prep = [{"topic": t, "guide": TOPIC_GUIDE.get(t, "관련 최신 통계와 작년 지적사항 이행 현황 준비.")}
                for t, _ in top_topics[:4]]
        guides.append({
            "name": name, "hanja": m.get("hanja", ""), "party": m.get("party", ""),
            "duty": m.get("duty", ""), "rlct": m.get("rlct", ""), "elecd": m.get("elecd", ""),
            "photo": m.get("photo", ""), "homepage": m.get("homepage", ""),
            "brf": m.get("brf", ""),
            "stats": {"n": len(items), "with_answer": with_a, "years": years,
                      "rank": rank_of.get(name), "days": mt.get("days", 0)},
            "top_topics": [{"t": t, "c": c} for t, c in top_topics],
            "summary": " ".join(summary),
            "quotes": quotes,
            "prep": prep,
        })
    guides.sort(key=lambda g: -g["stats"]["n"])
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"updated": datetime.date.today().isoformat(),
                   "note": "국감 회의록(제21~22대)과 국회 공개 프로필에 근거한 자동 분석입니다. 대표 질의는 회의록 원문 인용이며, 대응 포인트는 주제별 일반 지침입니다.",
                   "items": guides}, f, ensure_ascii=False, indent=1)
    print(f"완료: 위원 {len(guides)}명 가이드 생성 (발언 1위 {guides[0]['name']} {guides[0]['stats']['n']}건)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
