"""대본 기획 프롬프트. 웹 스튜디오(yt-studio/index.html)와 같은 규칙을 쓴다."""
from __future__ import annotations

import json
import re

BANNED_TITLE_WORDS = ["기본기", "총정리", "사용법", "기초", "완벽 정리", "완벽정리"]
RECOMMENDED_TITLE_WORDS = ["숨겨진", "자동화", "꿀조합", "이거면 끝", "몰랐죠", "무료"]

DEFAULT_PERSONA = (
    "당신은 AI 교육 유튜브 채널의 대본 작가입니다. 말투는 따뜻한 선생님처럼 차분하고 정직합니다. "
    "시청자는 50대 이상 AI 입문자와 30~40대 직장인입니다. "
    "전문용어는 쉬운 비유로 풀고, 영어 용어는 한글 발음을 함께 적습니다(예: 프롬프트(prompt)). "
    "과장·낚시·공포 마케팅은 쓰지 않습니다. 실제로 따라 할 수 있는 구체적인 순서를 보여 줍니다. "
    "'어렵지 않아요', '여러분도 할 수 있어요' 같은 격려를 자연스럽게 섞습니다."
)

SCHEMA_HINT = {
    "title": "대표 제목 (40자 이내)",
    "title_candidates": ["제목 후보 5개"],
    "hook": "첫 5초에 할 한 문장",
    "description": "유튜브 설명란 (3~6줄, 과장 없이)",
    "tags": ["태그 8~12개"],
    "thumbnail_text": "썸네일 큰 글씨 (2~3줄, 줄바꿈은 \\n, 한 줄 8자 안팎, 마지막 줄이 핵심)",
    "thumbnail_label": "썸네일 위 작은 꼬리표 (예: 엑셀 자동화 | 무료)",
    "thumbnail_sub": "썸네일 아래 보조 문구 한 줄 (15자 이내)",
    "thumbnail_visual": "썸네일 오른쪽에 보일 메인 대상 묘사 (영어, 결과 화면·핵심 물건, 글자 없이)",
    "scenes": [
        {
            "narration": "이 장면에서 읽을 대본 (2~4문장, 구어체)",
            "visual": "이 장면 배경 이미지 프롬프트 (영어, 글자 없이)",
            "keyword": "화면에 크게 띄울 핵심어 (한국어 8자 이내)",
        }
    ],
}


def target_length(fmt: str, minutes: float) -> tuple[int, int]:
    """(장면 수, 전체 대본 글자 수) 목표. 한국어 TTS 는 1분에 약 330자."""
    if fmt == "shorts":
        return 6, 300
    minutes = max(1.0, float(minutes))
    chars = int(minutes * 330)
    scenes = max(5, min(30, round(chars / 150)))
    return scenes, chars


def build_plan_prompt(topic: str, fmt: str = "long", minutes: float = 5,
                      audience: str = "", persona: str = "", extra: str = "") -> list[dict]:
    scenes, chars = target_length(fmt, minutes)
    kind = "세로 쇼츠(60초 이내)" if fmt == "shorts" else f"가로 영상(약 {minutes:g}분)"
    rules = [
        f"영상 형식: {kind}. 장면 {scenes}개 안팎, 대본 전체 약 {chars}자.",
        "첫 장면은 시청자가 '이런 것도 되는 줄 몰랐다' 하고 느낄 결과를 먼저 보여 주는 훅으로 시작합니다.",
        "중간 장면은 실제 따라 하는 순서(1단계, 2단계…)를 구체적으로 설명합니다.",
        "마지막 장면은 요약과 부드러운 구독 권유 한 문장으로 끝냅니다. 과장된 약속은 하지 않습니다.",
        f"제목에 다음 단어는 절대 쓰지 않습니다: {', '.join(BANNED_TITLE_WORDS)}.",
        f"제목에는 가능하면 다음 중 하나를 자연스럽게 씁니다: {', '.join(RECOMMENDED_TITLE_WORDS)}.",
        "사실이 확실하지 않은 수치·가격·날짜는 지어내지 말고 '화면에서 확인해 보세요'처럼 표현합니다.",
        "visual 은 영어로, 화면 안에 글자가 들어가지 않는 장면 묘사로 씁니다.",
        "썸네일은 메인 대상(결과 화면·핵심 물건)이 크게 보이고 글자는 한쪽에만 들어갑니다. "
        "thumbnail_text 는 영상 내용을 정직하게 요약한 짧은 말로, 궁금증을 주되 거짓 약속은 하지 않습니다.",
        "반드시 아래 JSON 형식 하나만 출력합니다. 설명 문장·마크다운 코드블록 없이 JSON 만.",
    ]
    if audience:
        rules.insert(0, f"이번 영상의 주 시청자: {audience}")
    if extra:
        rules.append(f"추가 요청: {extra}")
    user = (
        f"주제: {topic}\n\n규칙:\n"
        + "\n".join(f"- {r}" for r in rules)
        + "\n\nJSON 형식:\n"
        + json.dumps(SCHEMA_HINT, ensure_ascii=False, indent=2)
    )
    return [
        {"role": "system", "content": persona or DEFAULT_PERSONA},
        {"role": "user", "content": user},
    ]


def extract_json(text: str) -> dict:
    """모델 답변에서 JSON 객체만 골라낸다 (코드블록·앞뒤 설명 허용)."""
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.S)  # 추론 모델의 생각 부분 제거
    m = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, flags=re.S)
    if m:
        text = m.group(1)
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("답변에서 JSON 을 찾지 못했어요. 모델을 바꾸거나 다시 시도해 보세요.")
    raw = text[start:end + 1]
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raw = re.sub(r",\s*([}\]])", r"\1", raw)  # 끝에 붙은 쉼표 정리
        return json.loads(raw)


def check_title(title: str) -> list[str]:
    return [w for w in BANNED_TITLE_WORDS if w in (title or "")]


def normalize_plan(plan: dict, topic: str, fmt: str) -> dict:
    """모델마다 조금씩 다른 출력을 한 가지 모양으로 맞춘다."""
    scenes = []
    for s in plan.get("scenes") or []:
        if isinstance(s, str):
            s = {"narration": s}
        narration = (s.get("narration") or s.get("script") or s.get("text") or "").strip()
        if not narration:
            continue
        scenes.append({
            "narration": narration,
            "visual": (s.get("visual") or s.get("image_prompt") or s.get("prompt") or "").strip(),
            "keyword": (s.get("keyword") or "").strip(),
            **({"media": s["media"]} if s.get("media") else {}),
        })
    if not scenes:
        raise ValueError("대본에 장면(scenes)이 하나도 없어요.")
    cands = [c for c in plan.get("title_candidates") or [] if isinstance(c, str)]
    title = (plan.get("title") or (cands[0] if cands else topic)).strip()
    if check_title(title):  # 금지어가 든 대표 제목은 깨끗한 후보로 바꾼다
        clean = [c for c in cands if not check_title(c)]
        if clean:
            title = clean[0]
    tags = plan.get("tags") or []
    if isinstance(tags, str):
        tags = [t.strip() for t in re.split(r"[,#]", tags) if t.strip()]
    return {
        "topic": topic,
        "format": fmt,
        "title": title,
        "title_candidates": cands,
        "hook": (plan.get("hook") or "").strip(),
        "description": (plan.get("description") or "").strip(),
        "tags": tags[:15],
        "thumbnail_text": (plan.get("thumbnail_text") or title).strip(),
        "thumbnail_label": (plan.get("thumbnail_label") or "").strip(),
        "thumbnail_sub": (plan.get("thumbnail_sub") or "").strip(),
        "thumbnail_visual": (plan.get("thumbnail_visual") or "").strip(),
        "scenes": scenes,
    }
