# -*- coding: utf-8 -*-
"""
지침 문서(페이지 텍스트) -> 판정 규칙 초안 추출

1) find_candidate_pages : 지원대상·소득기준·지원금액·서식 등이 나오는 쪽을 점수화해 상위 쪽 선별
2) llm_draft            : 선별된 쪽을 LLM에 넘겨 rules.json 스키마의 JSON 초안 생성 (쪽수 인용 강제)
3) heuristic_draft      : LLM 미연결 시 정규식 기반 초안 (confidence=low)
4) normalize_program    : 누락 필드 보정, 쪽수 정수화, 인용 형식 통일
"""
import json
import re
from collections import Counter
from typing import Callable

CANDIDATE_KEYWORDS = {
    "지원대상": 3, "지원 대상": 3, "선정기준": 3, "선정 기준": 3, "지원요건": 3, "자격": 1,
    "소득기준": 4, "소득 기준": 4, "기준 중위소득": 4, "기준중위소득": 4, "중위소득": 2,
    "지원금액": 3, "지원 금액": 3, "지원내용": 3, "지원 내용": 3, "지원범위": 2, "지원 기준": 2,
    "지원제외": 3, "제외": 1, "중복": 1,
    "서식": 1, "신청서": 2, "별지": 1, "구비서류": 2,
    "위기": 1, "요건": 1,
}
CRISIS_VOCAB = [
    "질병", "부상", "실직", "폐업", "휴업", "사망", "가출", "학대", "가정폭력", "화재", "재해", "주거", "임차", "임대",
    "결핵", "장애", "한부모", "아동", "노인", "청년", "임산부", "출산", "다문화", "외국인", "난민", "노숙", "독거",
    "저소득", "수급", "차상위", "실업", "소득 상실", "소득상실", "체납", "단전", "의료비", "입원", "수술", "만성질환",
    "전세사기", "재난", "구직", "취업", "교육", "학비", "돌봄", "요양", "치매",
]
_INCOME_RE = re.compile(r"기준\s*중위\s*소득(?:의)?\s*(?:100분의\s*)?(\d{2,3})\s*(?:%|퍼센트)?\s*(이하|미만|초과|이상)?")
_FORM_RE = re.compile(r"[\[\(<〈［](?:서식|별지)\s*(?:제)?\s*\d+\s*호(?:의\s*\d+)?(?:서식)?[\]\)>〉］]\s*(?:[가-힣A-Za-z0-9·]+(?:\s|$)){0,3}")
_AMOUNT_RE = re.compile(r"(\d{1,3}(?:,\d{3})+|\d+)\s*(만\s*원|원)")

SCHEMA_HINT = {
    "programs": [{
        "program": "제도명(지원 종류 단위로 나눌 것)",
        "legal_basis": "근거 법령·조항",
        "trigger_keywords": ["상담 내용에서 이 제도를 떠올려야 하는 핵심 단어 5~12개"],
        "income": {"pct": 75, "op": "<=", "label": "기준 중위소득 75% 이하", "table": {"1": 1923179, "2": 3149469}, "pdf_page": 17},
        "amount": {"label": "지원금액 설명", "table": {"1": 783000}, "flat": None, "pdf_page": 61},
        "exclusions": [{"keywords": ["실업급여"], "note": "제외 사유 설명", "pdf_page": 42}],
        "verify_always": [{"item": "담당자가 반드시 확인할 사항", "pdf_page": 41}],
        "benefits": [{"item": "지원 항목", "detail": "내용·한도", "pdf_page": 61}],
        "forms": [{"name": "[서식 n호] 서식명", "pdf_page": 146}],
        "retrieval_query": "원문 검색용 핵심어 8~12개",
    }]
}

EXTRACT_SYSTEM = (
    "당신은 대한민국 중앙부처·지자체 사업지침에서 '지원 판정 규칙'을 추출하는 분석가입니다. "
    "반드시 제공된 쪽 텍스트에 적힌 내용만 사용하고, 각 항목에 그 내용이 나온 pdf_page(정수)를 붙이십시오. "
    "본문에 없는 수치·조문을 추측하지 마십시오. 소득 기준이 없으면 income을 null로, 금액이 없으면 amount를 null로 두십시오. "
    "출력은 JSON 하나만, 설명 문장 없이 반환하십시오."
)


def score_page(text: str) -> int:
    s = 0
    for k, w in CANDIDATE_KEYWORDS.items():
        s += w * min(text.count(k), 3)
    if _INCOME_RE.search(text):
        s += 6
    if "%" in text and "소득" in text:
        s += 2
    return s


def find_candidate_pages(pages: list[dict], top_n: int = 8, max_chars: int = 1800) -> list[dict]:
    scored = sorted(pages, key=lambda p: score_page(p["text"]), reverse=True)
    picked = [p for p in scored[:top_n] if score_page(p["text"]) > 0]
    picked.sort(key=lambda p: p["pdf_page"])
    return [{"pdf_page": p["pdf_page"], "print_page": p.get("print_page", p["pdf_page"]), "text": p["text"][:max_chars]} for p in picked]


def _to_int(v, default=None):
    try:
        return int(str(v).replace(",", "").strip())
    except Exception:
        return default


def _cite(pg, offset: int) -> dict:
    pg = _to_int(pg, 1) or 1
    return {"pdf_page": pg, "print_page": pg - offset}


def normalize_program(raw: dict, doc_id: str, doc_title: str, ministry: str, idx: int, offset: int = 0) -> dict:
    name = (raw.get("program") or f"제도 {idx + 1}").strip()
    kws = [k.strip() for k in (raw.get("trigger_keywords") or []) if str(k).strip()]
    inc = raw.get("income") or None
    income = None
    if inc and _to_int(inc.get("pct")) is not None:
        table = {str(_to_int(k)): _to_int(v) for k, v in (inc.get("table") or {}).items() if _to_int(k) and _to_int(v)}
        income = {"pct": _to_int(inc["pct"]), "op": "<" if str(inc.get("op", "<=")).strip() == "<" else "<=",
                  "label": inc.get("label") or f"기준 중위소득 {_to_int(inc['pct'])}% {'미만' if inc.get('op') == '<' else '이하'}",
                  "table": table, "cite": _cite(inc.get("pdf_page"), offset)}
    am = raw.get("amount") or None
    amount = None
    if am:
        table = {str(_to_int(k)): _to_int(v) for k, v in (am.get("table") or {}).items() if _to_int(k) and _to_int(v)}
        flat = _to_int(am.get("flat"))
        if table:
            amount = {"label": am.get("label") or "지원금액", "table": table, "cite": _cite(am.get("pdf_page"), offset)}
        elif flat:
            amount = {"label": am.get("label") or "지원금액", "flat": flat, "cite": _cite(am.get("pdf_page"), offset)}

    def _list(key, fields):
        out = []
        for e in raw.get(key) or []:
            if not isinstance(e, dict):
                continue
            item = {f: e.get(f) for f in fields}
            if key == "exclusions":
                item["keywords"] = [k.strip() for k in (e.get("keywords") or []) if str(k).strip()]
                if not item["keywords"]:
                    continue
            item["cite"] = _cite(e.get("pdf_page"), offset)
            out.append(item)
        return out

    return {
        "id": f"{doc_id}-{idx + 1:02d}",
        "ministry": ministry,
        "program": name,
        "doc_id": doc_id,
        "doc_title": doc_title,
        "legal_basis": raw.get("legal_basis") or doc_title,
        "trigger_groups": [kws] if kws else [["지원"]],
        "income": income,
        "amount": amount,
        "exclusions": _list("exclusions", ["note"]),
        "verify_if": [],
        "verify_always": _list("verify_always", ["item"]),
        "cross_rules": [],
        "benefits": _list("benefits", ["item", "detail"]),
        "forms": _list("forms", ["name"]),
        "retrieval_query": raw.get("retrieval_query") or " ".join(kws[:10]) or name,
        "confidence": raw.get("confidence", "llm"),
    }


def heuristic_draft(doc_id: str, doc_title: str, ministry: str, pages: list[dict], offset: int = 0) -> list[dict]:
    full = "\n".join(p["text"] for p in pages)
    # 소득 기준: 가장 많이 등장한 (pct, op)
    inc_hits = Counter()
    inc_page = {}
    for p in pages:
        for m in _INCOME_RE.finditer(p["text"]):
            key = (int(m.group(1)), m.group(2) or "이하")
            inc_hits[key] += 1
            inc_page.setdefault(key, p["pdf_page"])
    income = None
    if inc_hits:
        (pct, op), _ = inc_hits.most_common(1)[0]
        income = {"pct": pct, "op": "<" if op == "미만" else "<=", "label": f"기준 중위소득 {pct}% {op}", "pdf_page": inc_page[(pct, op)]}
    # 키워드: 어휘집 중 등장 빈도 상위
    kw_counts = [(k, full.count(k)) for k in CRISIS_VOCAB]
    kws = [k for k, c in sorted(kw_counts, key=lambda x: -x[1]) if c >= 2][:10]
    # 서식
    forms, seen = [], set()
    for p in pages:
        for m in _FORM_RE.finditer("\n" + p["text"]):
            nm = re.sub(r"\s+", " ", m.group(0)).strip()
            nm = re.sub(r"(로|을|를|의|에|은|는|가|이)$", "", nm).strip()[:60]
            if nm not in seen and len(nm) > 5:
                seen.add(nm)
                forms.append({"name": nm, "pdf_page": p["pdf_page"]})
            if len(forms) >= 6:
                break
    # 지원 내용 후보: '지원' 포함 + 금액 포함 줄
    benefits = []
    for p in pages:
        for line in p["text"].splitlines():
            if "지원" in line and _AMOUNT_RE.search(line) and 12 < len(line) < 120:
                benefits.append({"item": "지원 내용(초안)", "detail": line.strip(), "pdf_page": p["pdf_page"]})
            if len(benefits) >= 5:
                break
        if len(benefits) >= 5:
            break
    raw = {
        "program": f"{doc_title} 지원",
        "legal_basis": doc_title,
        "trigger_keywords": kws,
        "income": income,
        "amount": None,
        "exclusions": [],
        "verify_always": [{"item": "LLM 미연결 상태의 정규식 초안입니다. 지원대상·소득기준·금액을 원문과 대조해 수정하십시오.", "pdf_page": pages[0]["pdf_page"] if pages else 1}],
        "benefits": benefits,
        "forms": forms,
        "retrieval_query": " ".join(kws[:8]) or doc_title,
        "confidence": "low",
    }
    return [normalize_program(raw, doc_id, doc_title, ministry, 0, offset)]


def _parse_json(text: str) -> dict:
    text = text.strip()
    m = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.S)
    if m:
        text = m.group(1)
    start, end = text.find("{"), text.rfind("}")
    if start >= 0 and end > start:
        text = text[start : end + 1]
    return json.loads(text)


def llm_draft(chat: Callable[[str, str], str], doc_id: str, doc_title: str, ministry: str, candidates: list[dict], offset: int = 0) -> tuple[list[dict], str | None]:
    """chat(system, user) -> text. 실패 시 (빈 리스트, 오류메시지)"""
    pages_txt = "\n\n".join(f"<pdf_page {c['pdf_page']}>\n{c['text']}" for c in candidates)
    user = (
        f"[문서] {doc_title} / 소관: {ministry}\n"
        f"[출력 스키마 예시]\n{json.dumps(SCHEMA_HINT, ensure_ascii=False)}\n\n"
        "위 스키마로, 이 문서가 정하는 지원 제도(종류별)를 programs 배열에 담아 JSON으로 추출하십시오. "
        "income.table과 amount.table은 가구원 수(1~7)별 월 금액(원, 정수)이 본문에 표로 있을 때만 채우고, 없으면 생략하십시오.\n\n"
        f"[문서 쪽 텍스트]\n{pages_txt}"
    )
    try:
        text = chat(EXTRACT_SYSTEM, user)
        data = _parse_json(text)
        progs = data.get("programs") if isinstance(data, dict) else data
        if not isinstance(progs, list) or not progs:
            return [], "LLM 응답에 programs 배열이 없습니다"
        out = [normalize_program(p, doc_id, doc_title, ministry, i, offset) for i, p in enumerate(progs) if isinstance(p, dict)]
        return out, None
    except Exception as e:  # noqa: BLE001
        return [], f"{type(e).__name__}: {e}"
