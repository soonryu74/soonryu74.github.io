#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
국정감사 자료 DB — 위원 발언 전체 색인 (답변이 안 붙은 '지나간 발언' 포함)

Q&A 추출기(build_kdca_qa 등)는 기관 키워드가 있거나 그 기관 답변이 바로 붙은
발언만 남긴다. 그래서 장관에게 물었거나 청 이름 없이 말한 발언(예: SFTS 같은
질환명만 나온 발언)은 검색에서 사라졌다. 여기서는 보건복지위 국감 회의록의
위원·위원장 발언을 전부 색인해 통합 검색이 "지나간 발언"도 찾게 한다.

출력: data/gukgam/remarks-{연도}.json (연도별 분할) + remarks-index.json (연도·건수·처리 목록)
증분: 처리한 회의록(conf_id)은 index에 기록해 다음 실행에서 건너뛴다.
실행: python3 scripts/gukgam/build_remarks.py  (의존성: pypdf, 키 불필요)
"""
import os, io, re, json, time, datetime, collections, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "data", "gukgam")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_kdca_qa as K          # pdf_text · SPEAKER · parse_mark · clean 재사용

ERAS = ("제21대", "제22대")
MAXLEN = 600                       # 검색용 발췌 길이 — 전문은 원문 링크로
INDEX = os.path.join(DATA, "remarks-index.json")


def extract(text, date):
    marks = [(m.start(), m.end()) + K.parse_mark(m) for m in K.SPEAKER.finditer(text)]
    out = []
    for i, (pos, endpos, name, role) in enumerate(marks):
        if role not in ("위원", "위원장"):
            continue
        end = marks[i + 1][0] if i + 1 < len(marks) else len(text)
        t = K.clean(text[endpos:end], limit=MAXLEN)
        if len(t) < 30 or t.count("…") > 3:
            continue
        nxt = marks[i + 1] if i + 1 < len(marks) else None
        answered_by = None
        if nxt and nxt[3] not in ("위원", "위원장"):
            answered_by = (nxt[2] + " " + nxt[3]).strip()
        out.append({"date": date, "member": name, "role": role, "text": t,
                    "answered_by": answered_by})
    return out


def main():
    minutes = [x for x in K.load("minutes.json")["items"]
               if "보건복지" in x["committee"] and x["era"] in ERAS and x.get("url")]
    idx = {"processed": [], "years": {}}
    if os.path.exists(INDEX):
        try:
            idx = json.load(open(INDEX, encoding="utf-8"))
        except Exception:
            pass
    processed = set(idx.get("processed", []))
    by_year = {}

    def load_year(y):
        p = os.path.join(DATA, "remarks-%s.json" % y)
        if y not in by_year:
            by_year[y] = json.load(open(p, encoding="utf-8"))["items"] if os.path.exists(p) else []
        return by_year[y]

    new = 0
    for mt in sorted(minutes, key=lambda x: x["date"]):
        if mt["conf_id"] in processed:
            continue
        try:
            got = extract(K.pdf_text(mt["url"]), mt["date"])
        except Exception as e:
            print(f"{mt['date']} 실패: {e}")
            continue
        for g in got:
            g["minutes_url"] = mt["url"]
        load_year(mt["date"][:4]).extend(got)
        processed.add(mt["conf_id"]); new += 1
        print(f"{mt['date']}: 발언 {len(got)}건")
        time.sleep(1)

    years = {}
    for y in sorted(set(list(by_year) + list(idx.get("years", {}).keys()))):
        items = load_year(y)
        items.sort(key=lambda x: (x["date"], x["member"]))
        with io.open(os.path.join(DATA, "remarks-%s.json" % y), "w", encoding="utf-8") as f:
            json.dump({"updated": datetime.date.today().isoformat(), "year": int(y), "items": items},
                      f, ensure_ascii=False, indent=0)
        years[y] = len(items)
    with io.open(INDEX, "w", encoding="utf-8") as f:
        json.dump({"updated": datetime.date.today().isoformat(),
                   "note": "보건복지위 국감 회의록(제21~22대) 위원·위원장 발언 전체 색인. 답변이 붙지 않은 발언도 포함. 발췌 %d자." % MAXLEN,
                   "processed": sorted(processed), "years": years}, f, ensure_ascii=False, indent=1)
    print("완료: 회의록 %d건 신규 · 연도별 발언 %s" % (new, years))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
