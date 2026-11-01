"""구조화 시험: 복지서비스 상세(지원대상·선정기준·신청방법 문장) → 조건 JSON 초안 (LLM, 원문 인용 포함).

입력: bokji-biseo/data/central_detail.json (fetch_bokjiro.py --detail N 결과)
출력: bokji-biseo/data/structuring_trial.json, bokji-biseo/docs/STRUCTURING_TRIAL.md
LLM: Gemini API (환경변수 GEMINI_API_KEY, 없으면 프록시가 주입하는 환경에서 더미값 사용). 모델은 --model 로 교체.
실행:  맥  python3 bokji-biseo/scripts/structure_trial.py --limit 40
       윈도우  py bokji-biseo\\scripts\\structure_trial.py --limit 40
"""
import argparse, json, os, re, time, urllib.request
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IN = os.path.join(ROOT, "data", "central_detail.json")
OUT_JSON = os.path.join(ROOT, "data", "structuring_trial.json")
OUT_MD = os.path.join(ROOT, "docs", "STRUCTURING_TRIAL.md")

SCHEMA = {
  "type": "object",
  "properties": {
    "age_min": {"type": "integer", "nullable": True},
    "age_max": {"type": "integer", "nullable": True},
    "residence": {"type": "string", "description": "거주지 조건. 전국이면 '전국'"},
    "household_types": {"type": "array", "items": {"type": "string"}, "description": "가구유형 조건(맞벌이, 한부모, 다자녀, 장애인, 다문화 등)"},
    "income_rule": {"type": "string", "description": "소득 기준. 기준 중위소득 %, 또는 '없음', '불명확'"},
    "business_required": {"type": "string", "enum": ["필요", "불필요", "불명확"], "description": "사업자(자영업·소상공인) 요건"},
    "application_period": {"type": "string", "description": "접수기간. 상시/연중/특정기간/불명확"},
    "documents": {"type": "array", "items": {"type": "string"}},
    "ambiguous": {"type": "boolean", "description": "대상 조건이 문장만으로 판정 불가능하면 true"},
    "ambiguous_reason": {"type": "string"},
    "quotes": {"type": "array", "items": {"type": "string"}, "description": "조건의 근거가 된 원문 문장 그대로 1~4개"}
  },
  "required": ["residence", "household_types", "income_rule", "business_required", "application_period", "documents", "ambiguous", "ambiguous_reason", "quotes"]
}

PROMPT = """아래는 한국 복지서비스 안내 원문입니다. 원문에 적힌 내용만 근거로 지원 조건을 구조화하세요.
원문에 없는 조건은 지어내지 말고 null 또는 '불명확'으로 두세요. quotes에는 근거 문장을 원문 그대로 옮기세요.

[서비스명] {servNm}
[지원대상] {tgtrDtlCn}
[선정기준] {slctCritCn}
[신청방법] {applmetList}
[구비서류] {basfrmList}"""


def clean(s):
    s = (s or "").replace("\r", "\n")
    s = re.sub(r"&#9\d{3};", "", s)
    return re.sub(r"\n{2,}", "\n", s).strip()


def call_gemini(model, text):
    key = os.environ.get("GEMINI_API_KEY", "dummy")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    body = {"contents": [{"parts": [{"text": text}]}],
            "generationConfig": {"responseMimeType": "application/json", "responseSchema": SCHEMA, "temperature": 0}}
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": key})
    last = None
    for a in range(4):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                d = json.load(r)
            return json.loads(d["candidates"][0]["content"]["parts"][0]["text"])
        except Exception as e:  # noqa
            last = e; time.sleep(2 * (a + 1))
    raise SystemExit(f"LLM 호출 실패: {last}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=40)
    ap.add_argument("--model", default="gemini-3.5-flash")
    a = ap.parse_args()
    items = json.load(open(IN, encoding="utf-8"))["items"][: a.limit]
    results = []
    for i, it in enumerate(items, 1):
        text = PROMPT.format(servNm=it.get("servNm", ""), tgtrDtlCn=clean(it.get("tgtrDtlCn")), slctCritCn=clean(it.get("slctCritCn")),
                             applmetList=clean(it.get("applmetList")), basfrmList=clean(it.get("basfrmList")))
        t0 = time.time()
        res = call_gemini(a.model, text)
        res["_servId"] = it.get("servId"); res["_servNm"] = it.get("servNm"); res["_jur"] = it.get("jurMnofNm")
        res["_sec"] = round(time.time() - t0, 1); res["_src_len"] = len(text)
        # 인용 검증: quotes가 원문에 실제로 있는지
        src = clean(it.get("tgtrDtlCn")) + clean(it.get("slctCritCn")) + clean(it.get("applmetList")) + clean(it.get("basfrmList"))
        norm = lambda s: re.sub(r"\s+", "", s)
        res["_quotes_verified"] = sum(1 for q in res.get("quotes", []) if norm(q) and norm(q) in norm(src))
        results.append(res)
        print(f"{i:2d}/{len(items)} {it.get('servNm')} ({res['_sec']}s) ambiguous={res.get('ambiguous')}")

    meta = {"date": date.today().isoformat(), "model": a.model, "n": len(results), "source": "한국사회보장정보원 중앙부처복지서비스 API 상세 (data.go.kr 15090532)"}
    json.dump({"meta": meta, "results": results}, open(OUT_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    n = len(results)
    amb = sum(1 for r in results if r.get("ambiguous"))
    inc = sum(1 for r in results if r.get("income_rule") not in (None, "", "없음", "불명확"))
    age = sum(1 for r in results if r.get("age_min") is not None or r.get("age_max") is not None)
    hh = sum(1 for r in results if r.get("household_types"))
    docs = sum(1 for r in results if r.get("documents"))
    per = sum(1 for r in results if r.get("application_period") not in (None, "", "불명확"))
    qv = sum(r["_quotes_verified"] for r in results); qt = sum(len(r.get("quotes", [])) for r in results)
    secs = sum(r["_sec"] for r in results) / max(n, 1)
    L = [f"# 구조화 시험 결과 ({meta['date']})", "",
         f"- 입력: {meta['source']} 상세 {n}건 (목록 461건 중 앞 {n}건, 부처 무작위 아님)",
         f"- 모델: {a.model}, temperature 0, JSON 스키마 강제. 건당 평균 {secs:.1f}초",
         "- 이 수치는 '추출 완료율'이며 정확도는 사람 검수(아래 표의 근거 문장 대조)로 확정해야 한다.", "",
         "| 항목 | 건수 | 비율 |", "|---|---|---|",
         f"| 연령 조건 추출 | {age} | {age/n:.0%} |", f"| 가구유형 조건 추출 | {hh} | {hh/n:.0%} |",
         f"| 소득 기준(중위소득 % 등) 추출 | {inc} | {inc/n:.0%} |", f"| 접수기간 식별 | {per} | {per/n:.0%} |",
         f"| 구비서류 추출 | {docs} | {docs/n:.0%} |", f"| 원문만으로 판정 불가(모호) 표시 | {amb} | {amb/n:.0%} |",
         f"| 근거 인용 문장이 원문에 실제 존재 | {qv}/{qt} | {qv/max(qt,1):.0%} |", "",
         "## 건별 결과 (근거 문장은 1개만 표시)", "",
         "| 서비스 | 소관 | 연령 | 가구유형 | 소득 기준 | 접수기간 | 모호 | 근거(발췌) |", "|---|---|---|---|---|---|---|---|"]
    for r in results:
        agec = f"{r.get('age_min') if r.get('age_min') is not None else ''}~{r.get('age_max') if r.get('age_max') is not None else ''}".strip("~") or "-"
        q = (r.get("quotes") or [""])[0].replace("|", "/").replace("\n", " ")
        L.append(f"| {r['_servNm']} | {r['_jur']} | {agec} | {', '.join(r.get('household_types') or []) or '-'} | {r.get('income_rule') or '-'} | {r.get('application_period') or '-'} | {'O' if r.get('ambiguous') else ''} | {q[:60]} |")
    L += ["", "## 모호 판정 사유 (데이터 품질 피드백 후보)", ""]
    for r in results:
        if r.get("ambiguous"):
            L.append(f"- {r['_servNm']}: {r.get('ambiguous_reason','')}")
    open(OUT_MD, "w", encoding="utf-8").write("\n".join(L) + "\n")
    print("저장:", OUT_JSON, OUT_MD)


if __name__ == "__main__":
    main()
