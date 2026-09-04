#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
국정감사 자료 DB — 질의의 '소관 기관' 판정 (복지부·질병청·식약처 공용)

국감장에서 질의를 누구에게 하는지는 호칭이 결정한다.
  "장관님·차관님" → 보건복지부 · "청장님" → 질병관리청 · "처장님" → 식품의약품안전처
기관명을 한 번 언급했다고 그 기관 소관이 아니다. 실제로
  "…지금 식약처에서는 사이버조사단을 운영하고… 장관님은 어떻게 생각하세요?"  (복지부 질의)
  "…질병관리청과 식약처를 중심으로… 청장님, 어떤 입장이신가요?"              (질병청 질의)
같은 발언이 기관명만 보고 식약처 Q&A에 섞여 들어갔다.

판정 우선순위
  1) 바로 뒤에 그 기관장이 답했다            → 확실 (answer)
  2) 질의문이 그 기관장을 호칭으로 불렀다     → 확실 (title)   ※ 여러 기관을 함께 부르면 모두 해당
  3) 다른 기관 호칭만 있다                   → 그 기관 소관이 아니므로 제외
  4) 호칭도 답변도 없이 기관명만 나온다       → 간접 언급 (mention)
"""
import re

# PDF 추출 과정에서 낱말 사이에 공백이 끼는 일이 잦아 글자마다 공백을 허용한다("청 장님")
TITLE_PATTERNS = {
    "mohw": r"장\s*관\s*님|차\s*관\s*님",
    "kdca": r"청\s*장\s*님",
    "mfds": r"처\s*장\s*님",
}
# '차장님'은 질병청·식약처 모두 있어 가릴 수 없다 → 판정에 쓰지 않는다.

_COMPILED = {k: re.compile(v) for k, v in TITLE_PATTERNS.items()}


def titles_in(q):
    """질의문이 호칭으로 부른 기관들 (여러 기관을 함께 부르면 모두)."""
    return {ag for ag, pat in _COMPILED.items() if pat.search(q or "")}


def decide(q, mine, answerer_is_mine, has_keyword):
    """(채택 여부, 근거). 근거: answer | title | mention | None"""
    if answerer_is_mine:
        return True, "answer"
    t = titles_in(q)
    if mine in t:
        return True, "title"
    if t:
        return False, None          # 다른 기관에게 한 질문
    if has_keyword:
        return True, "mention"
    return False, None
